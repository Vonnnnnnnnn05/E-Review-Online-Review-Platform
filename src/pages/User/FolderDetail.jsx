/**
 * Folder Detail Page (User)
 * 
 * Shows reviewers inside a specific folder.
 * Allows creating reviewers and uploading documents for AI generation.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, storage, functions } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import { FiPlus, FiUpload, FiArrowLeft, FiBook } from "react-icons/fi";
import ReviewerCard from "../../components/ReviewerCard";
import LoadingSpinner from "../../components/LoadingSpinner";

const FolderDetail = () => {
  const { folderId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [folder, setFolder] = useState(null);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newReviewer, setNewReviewer] = useState({ title: "", type: "identification" });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const folderDoc = await getDoc(doc(db, "folders", folderId));
      if (!folderDoc.exists()) {
        toast.error("Folder not found.");
        navigate("/dashboard/folders");
        return;
      }
      setFolder({ id: folderDoc.id, ...folderDoc.data() });

      const reviewersQuery = query(
        collection(db, "reviewers"),
        where("folderId", "==", folderId)
      );
      const reviewersSnap = await getDocs(reviewersQuery);
      setReviewers(
        reviewersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    } catch (error) {
      console.error("Error fetching folder:", error);
      toast.error("Failed to load folder.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [folderId, currentUser]);

  const handleCreateReviewer = async (e) => {
    e.preventDefault();
    if (!newReviewer.title.trim()) return;

    try {
      await addDoc(collection(db, "reviewers"), {
        folderId,
        userId: currentUser.uid,
        title: newReviewer.title.trim(),
        type: newReviewer.type,
        createdAt: serverTimestamp(),
      });
      toast.success("Reviewer created!");
      setShowCreateModal(false);
      setNewReviewer({ title: "", type: "identification" });
      fetchData();
    } catch (error) {
      console.error("Error creating reviewer:", error);
      toast.error("Failed to create reviewer.");
    }
  };

  const handleDeleteReviewer = async (reviewerId) => {
    if (!window.confirm("Delete this reviewer and all its questions?")) return;

    try {
      const questionsQuery = query(
        collection(db, "questions"),
        where("reviewerId", "==", reviewerId)
      );
      const questionsSnap = await getDocs(questionsQuery);
      for (const questionDoc of questionsSnap.docs) {
        await deleteDoc(doc(db, "questions", questionDoc.id));
      }

      await deleteDoc(doc(db, "reviewers", reviewerId));
      toast.success("Reviewer deleted!");
      setReviewers(reviewers.filter((r) => r.id !== reviewerId));
    } catch (error) {
      console.error("Error deleting reviewer:", error);
      toast.error("Failed to delete reviewer.");
    }
  };

  const handleUploadAndGenerate = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please select a file.");
      return;
    }

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!validTypes.includes(uploadFile.type)) {
      toast.error("Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(
        storage,
        `uploads/${currentUser.uid}/${Date.now()}_${uploadFile.name}`
      );
      await uploadBytes(storageRef, uploadFile);
      const downloadURL = await getDownloadURL(storageRef);

      toast.success("File uploaded! Generating questions with AI...");
      setUploading(false);
      setGenerating(true);

      const generateReviewer = httpsCallable(functions, "generateReviewer");
      const result = await generateReviewer({
        fileUrl: downloadURL,
        fileName: uploadFile.name,
        folderId,
        userId: currentUser.uid,
      });

      if (result.data.success) {
        toast.success("Questions generated successfully!");
        setShowUploadModal(false);
        setUploadFile(null);
        fetchData();
      } else {
        toast.error(result.data.error || "Generation failed.");
      }
    } catch (error) {
      console.error("Upload/generation error:", error);
      toast.error("Failed to generate questions. Please try again.");
    } finally {
      setUploading(false);
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen={false} message="Loading folder..." />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition mb-4"
          onClick={() => navigate("/dashboard/folders")}
        >
          <FiArrowLeft /> Back to Folders
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black">{folder?.folderName || "Folder"}</h1>
            <p className="text-gray-500 text-sm mt-1">Manage reviewers in this folder</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus /> Create Reviewer
            </button>
            <button
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              onClick={() => setShowUploadModal(true)}
            >
              <FiUpload /> Upload & Generate
            </button>
          </div>
        </div>
      </div>

      {/* Reviewers Grid */}
      {reviewers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <FiBook className="text-4xl text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900">No reviewers yet</h3>
          <p className="text-sm text-gray-500 mt-1">Create a reviewer manually or upload a document to auto-generate.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviewers.map((reviewer) => (
            <ReviewerCard
              key={reviewer.id}
              reviewer={reviewer}
              onClick={(id) => navigate(`/dashboard/reviewers/${id}`)}
              onDelete={handleDeleteReviewer}
            />
          ))}
        </div>
      )}

      {/* Create Reviewer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-black mb-4">Create Reviewer</h2>
            <form onSubmit={handleCreateReviewer}>
              <div className="mb-4">
                <label htmlFor="reviewer-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  id="reviewer-title"
                  type="text"
                  placeholder="e.g., Chapter 1 Review"
                  value={newReviewer.title}
                  onChange={(e) => setNewReviewer({ ...newReviewer, title: e.target.value })}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="reviewer-type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  id="reviewer-type"
                  value={newReviewer.type}
                  onChange={(e) => setNewReviewer({ ...newReviewer, type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition bg-white"
                >
                  <option value="identification">Identification</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="definition">Definition of Terms</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload & Generate Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-black mb-2">Upload Document & Generate Questions</h2>
            <p className="text-gray-500 text-xs mb-4">
              Upload a PDF, DOCX, or TXT file. AI will automatically generate
              15 Identification, 15 Multiple Choice, and 15 Definition of Terms questions.
            </p>
            <form onSubmit={handleUploadAndGenerate}>
              <div className="mb-4">
                <label htmlFor="upload-file" className="block text-sm font-medium text-gray-700 mb-1">Select Document</label>
                <input
                  id="upload-file"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  required
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                />
              </div>
              {(uploading || generating) && (
                <div className="text-center py-4">
                  <LoadingSpinner
                    fullScreen={false}
                    message={
                      uploading
                        ? "Uploading document..."
                        : "Generating questions with AI... This may take a minute."
                    }
                  />
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading || generating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                  disabled={uploading || generating}
                >
                  {uploading
                    ? "Uploading..."
                    : generating
                    ? "Generating..."
                    : "Upload & Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderDetail;
