/**
 * Firebase Cloud Functions — E-Learn AI Reviewer Generator
 *
 * This module contains the Cloud Functions for:
 * 1. generateReviewer — Processes uploaded documents and generates questions via OpenAI
 * 2. createUser — Admin-only function to create users without signing out
 * 3. deleteUser — Admin-only function to delete users from Firebase Auth
 *
 * Environment variables required:
 * - OPENAI_API_KEY: Your OpenAI API key (set via Firebase Functions config)
 *
 * Deploy with: firebase deploy --only functions
 * Set config: firebase functions:config:set openai.key="YOUR_API_KEY"
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { OpenAI } = require("openai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fetch = require("node-fetch");

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Get OpenAI client instance
 * API key is stored in Firebase Functions config for security
 */
const getOpenAIClient = () => {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    (functions.config().openai && functions.config().openai.key);

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Set it via: firebase functions:config:set openai.key='YOUR_KEY'"
    );
  }

  return new OpenAI({ apiKey });
};

/**
 * Extract text from uploaded document based on file type
 *
 * @param {Buffer} fileBuffer - Raw file bytes
 * @param {string} fileName - Original filename (used to detect type)
 * @returns {string} Extracted text content
 */
const extractText = async (fileBuffer, fileName) => {
  const ext = fileName.split(".").pop().toLowerCase();

  switch (ext) {
    case "pdf": {
      const pdfData = await pdfParse(fileBuffer);
      return pdfData.text;
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    }
    case "txt": {
      return fileBuffer.toString("utf-8");
    }
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
};

/**
 * The AI prompt used for generating questions from document content
 */
const buildPrompt = (documentText) => {
  return `You are an academic reviewer generator system.

Based strictly on the uploaded document content, generate:

1. Identification Type:
- 15 identification questions.
- Each question must ask for specific names, terms, concepts, or dates.
- Provide the correct answer only.

2. Multiple Choice:
- 15 multiple choice questions.
- Each question must have 4 options (A, B, C, D).
- Mark the correct answer clearly.
- Distractors must be realistic and related to the topic.

3. Definition of Terms:
- Extract 15 important terms from the text.
- Provide concise academic definitions.

Rules:
- Do NOT invent information not present in the document.
- Avoid repetition.
- Make questions suitable for college-level students.
- Format output in clean JSON format like this:

{
  "identification": [
    { "question": "...", "answer": "..." }
  ],
  "multiple_choice": [
    {
      "question": "...",
      "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A"
    }
  ],
  "definitions": [
    { "term": "...", "definition": "..." }
  ]
}

Here is the document content:
${documentText}`;
};

/**
 * CLOUD FUNCTION: generateReviewer
 *
 * Called from the frontend when a user uploads a document.
 * 1. Downloads the file from Firebase Storage
 * 2. Extracts text based on file type
 * 3. Sends text to OpenAI for question generation
 * 4. Saves generated questions to Firestore
 *
 * @param {Object} data - { fileUrl, fileName, folderId, userId }
 * @returns {Object} - { success: boolean, error?: string }
 */
exports.generateReviewer = functions
  .runWith({ timeoutSeconds: 300, memory: "1GB" })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in to generate reviewers."
      );
    }

    const { fileUrl, fileName, folderId, userId } = data;

    // Validate required fields
    if (!fileUrl || !fileName || !folderId || !userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: fileUrl, fileName, folderId, userId"
      );
    }

    // Verify user matches auth
    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "User ID mismatch."
      );
    }

    try {
      // 1. Download file from Storage URL
      console.log(`Downloading file: ${fileName}`);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      const fileBuffer = Buffer.from(await response.arrayBuffer());

      // 2. Extract text
      console.log("Extracting text from document...");
      const extractedText = await extractText(fileBuffer, fileName);

      if (!extractedText || extractedText.trim().length < 50) {
        return {
          success: false,
          error: "Document has insufficient text content for question generation.",
        };
      }

      // Truncate very long documents to stay within token limits
      const maxChars = 15000;
      const trimmedText =
        extractedText.length > maxChars
          ? extractedText.substring(0, maxChars) + "\n[Document truncated...]"
          : extractedText;

      // 3. Call OpenAI API
      console.log("Calling OpenAI API...");
      const openai = getOpenAIClient();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an academic reviewer generator. Always respond with valid JSON only, no markdown formatting.",
          },
          {
            role: "user",
            content: buildPrompt(trimmedText),
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      // 4. Parse the AI response
      const aiResponse = completion.choices[0].message.content;
      console.log("AI response received, parsing...");

      let generatedData;
      try {
        generatedData = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        return { success: false, error: "AI generated invalid response format." };
      }

      // 5. Save to Firestore
      console.log("Saving generated questions to Firestore...");
      const batch = db.batch();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      // Create Identification Reviewer
      if (generatedData.identification && generatedData.identification.length > 0) {
        const identRef = db.collection("reviewers").doc();
        batch.set(identRef, {
          folderId,
          userId,
          title: `${fileName} - Identification`,
          type: "identification",
          createdAt: timestamp,
        });

        for (const item of generatedData.identification) {
          const qRef = db.collection("questions").doc();
          batch.set(qRef, {
            reviewerId: identRef.id,
            userId,
            question: item.question,
            answer: item.answer,
            choices: null,
            createdAt: timestamp,
          });
        }
      }

      // Create Multiple Choice Reviewer
      if (generatedData.multiple_choice && generatedData.multiple_choice.length > 0) {
        const mcRef = db.collection("reviewers").doc();
        batch.set(mcRef, {
          folderId,
          userId,
          title: `${fileName} - Multiple Choice`,
          type: "multiple_choice",
          createdAt: timestamp,
        });

        for (const item of generatedData.multiple_choice) {
          const qRef = db.collection("questions").doc();
          batch.set(qRef, {
            reviewerId: mcRef.id,
            userId,
            question: item.question,
            answer: item.answer,
            choices: item.choices || [],
            createdAt: timestamp,
          });
        }
      }

      // Create Definition of Terms Reviewer
      if (generatedData.definitions && generatedData.definitions.length > 0) {
        const defRef = db.collection("reviewers").doc();
        batch.set(defRef, {
          folderId,
          userId,
          title: `${fileName} - Definitions`,
          type: "definition",
          createdAt: timestamp,
        });

        for (const item of generatedData.definitions) {
          const qRef = db.collection("questions").doc();
          batch.set(qRef, {
            reviewerId: defRef.id,
            userId,
            question: item.term,
            answer: item.definition,
            choices: null,
            createdAt: timestamp,
          });
        }
      }

      // Commit all writes
      await batch.commit();
      console.log("Questions saved successfully!");

      return { success: true };
    } catch (error) {
      console.error("generateReviewer error:", error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred.",
      };
    }
  });

/**
 * CLOUD FUNCTION: createUser
 *
 * Admin-only function to create a new user without signing out the current admin.
 * Uses Firebase Admin SDK to create the Auth user and Firestore document.
 *
 * @param {Object} data - { email, password, role }
 * @returns {Object} - { success: boolean, uid?: string, error?: string }
 */
exports.createUser = functions.https.onCall(async (data, context) => {
  // Only allow admins
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  // Verify caller is admin
  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can create users."
    );
  }

  const { email, password, role } = data;

  if (!email || !password) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email and password are required."
    );
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      disabled: false,
    });

    // Create Firestore document
    await db.collection("users").doc(userRecord.uid).set({
      email,
      role: role || "user",
      disabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error("createUser error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * CLOUD FUNCTION: deleteUser
 *
 * Admin-only function to fully delete a user from Firebase Auth.
 *
 * @param {Object} data - { userId }
 * @returns {Object} - { success: boolean }
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  // Verify caller is admin
  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can delete users."
    );
  }

  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError("invalid-argument", "userId is required.");
  }

  try {
    // Delete from Auth
    await admin.auth().deleteUser(userId);

    // Delete Firestore document
    await db.collection("users").doc(userId).delete();

    return { success: true };
  } catch (error) {
    console.error("deleteUser error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * CLOUD FUNCTION: toggleUserDisabled
 *
 * Admin-only function to enable/disable a user in Firebase Auth.
 *
 * @param {Object} data - { userId, disabled }
 * @returns {Object} - { success: boolean }
 */
exports.toggleUserDisabled = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can manage users."
    );
  }

  const { userId, disabled } = data;

  try {
    // Update Auth
    await admin.auth().updateUser(userId, { disabled });

    // Update Firestore
    await db.collection("users").doc(userId).update({ disabled });

    return { success: true };
  } catch (error) {
    console.error("toggleUserDisabled error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
