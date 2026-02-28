/**
 * Reviewer Detail Page (User)
 * 
 * Shows all questions for a specific reviewer.
 * Allows adding, editing, and deleting questions.
 * Provides option to start Quiz mode.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import { FiArrowLeft, FiPlay, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import LoadingSpinner from "../../components/LoadingSpinner";

const ReviewerDetail = () => {
  const { reviewerId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [reviewer, setReviewer] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    choices: ["", "", "", ""],
  });

  const fetchData = async () => {
    try {
      const reviewerDoc = await getDoc(doc(db, "reviewers", reviewerId));
      if (!reviewerDoc.exists()) {
        toast.error("Reviewer not found.");
        navigate(-1);
        return;
      }
      const reviewerData = { id: reviewerDoc.id, ...reviewerDoc.data() };
      setReviewer(reviewerData);

      const questionsQuery = query(
        collection(db, "questions"),
        where("reviewerId", "==", reviewerId)
      );
      const questionsSnap = await getDocs(questionsQuery);
      setQuestions(
        questionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    } catch (error) {
      console.error("Error fetching reviewer:", error);
      toast.error("Failed to load reviewer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [reviewerId, navigate]);

  const resetForm = () => {
    setFormData({ question: "", answer: "", choices: ["", "", "", ""] });
    setEditingQuestion(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setFormData({
      question: q.question || "",
      answer: q.answer || "",
      choices: q.choices ? [...q.choices] : ["", "", "", ""],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleChoiceChange = (index, value) => {
    const updated = [...formData.choices];
    updated[index] = value;
    setFormData({ ...formData, choices: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Question and answer are required.");
      return;
    }

    if (reviewer?.type === "multiple_choice") {
      const filledChoices = formData.choices.filter((c) => c.trim());
      if (filledChoices.length < 2) {
        toast.error("Please provide at least 2 choices.");
        return;
      }
    }

    try {
      const questionData = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        reviewerId,
        userId: currentUser.uid,
      };

      if (reviewer?.type === "multiple_choice") {
        questionData.choices = formData.choices.filter((c) => c.trim());
      }

      if (editingQuestion) {
        await updateDoc(doc(db, "questions", editingQuestion.id), questionData);
        toast.success("Question updated!");
      } else {
        questionData.createdAt = serverTimestamp();
        await addDoc(collection(db, "questions"), questionData);
        toast.success("Question added!");
      }

      closeModal();
      fetchData();
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("Failed to save question.");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteDoc(doc(db, "questions", questionId));
      toast.success("Question deleted!");
      setQuestions(questions.filter((q) => q.id !== questionId));
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question.");
    }
  };

  const getQuestionLabel = () => {
    if (reviewer?.type === "definition") return "Term";
    return "Question";
  };

  const getAnswerLabel = () => {
    if (reviewer?.type === "definition") return "Definition";
    return "Answer";
  };

  if (loading) return <LoadingSpinner fullScreen={false} message="Loading reviewer..." />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition mb-4"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft /> Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black">{reviewer?.title || "Reviewer"}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Type: <span className="font-medium text-gray-700 capitalize">
                {reviewer?.type?.replace("_", " ")}
              </span>
              {" "}&middot; {questions.length} questions
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
              onClick={openAddModal}
            >
              <FiPlus /> Add Question
            </button>
            {questions.length > 0 && (
              <button
                className="inline-flex items-center gap-2 border border-gray-900 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
                onClick={() => navigate(`/dashboard/quiz/${reviewerId}`)}
              >
                <FiPlay /> Start Quiz
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">No questions yet. Click "Add Question" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div key={q.id || index} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                {(reviewer?.type === "identification" || reviewer?.type === "multiple_choice") && (
                  <>
                    <p className="text-sm font-medium text-gray-900">{q.question}</p>
                    {reviewer?.type === "multiple_choice" && q.choices && (
                      <ul className="mt-2 space-y-1">
                        {q.choices.map((choice, i) => (
                          <li
                            key={i}
                            className={`text-xs px-3 py-1.5 rounded-lg ${
                              choice === q.answer
                                ? "bg-gray-900 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {choice}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Answer:</span> {q.answer}
                    </p>
                  </>
                )}

                {reviewer?.type === "definition" && (
                  <>
                    <p className="text-sm font-semibold text-gray-900">{q.question}</p>
                    <p className="text-xs text-gray-500 mt-1">{q.answer}</p>
                  </>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                <button
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition"
                  title="Edit"
                  onClick={() => openEditModal(q)}
                >
                  <FiEdit2 className="text-sm" />
                </button>
                <button
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                  onClick={() => handleDeleteQuestion(q.id)}
                >
                  <FiTrash2 className="text-sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Question Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-black mb-4">
              {editingQuestion ? "Edit Question" : "Add Question"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{getQuestionLabel()}</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder={reviewer?.type === "definition" ? "Enter the term..." : "Enter your question..."}
                  rows={3}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition resize-y"
                />
              </div>

              {reviewer?.type === "multiple_choice" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Choices (at least 2)</label>
                  <div className="space-y-2">
                    {formData.choices.map((choice, i) => (
                      <input
                        key={i}
                        type="text"
                        value={choice}
                        onChange={(e) => handleChoiceChange(i, e.target.value)}
                        placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{getAnswerLabel()}</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder={
                    reviewer?.type === "multiple_choice"
                      ? "Enter the correct choice (must match one of the choices above)"
                      : reviewer?.type === "definition"
                      ? "Enter the definition..."
                      : "Enter the answer..."
                  }
                  rows={2}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition resize-y"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                  {editingQuestion ? "Update" : "Add Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerDetail;
