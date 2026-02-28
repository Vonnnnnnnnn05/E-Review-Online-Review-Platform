/**
 * All Reviewers Page (User)
 * 
 * Shows all reviewers across all folders for the current user.
 */
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiBook } from "react-icons/fi";
import ReviewerCard from "../../components/ReviewerCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import { deleteDoc, doc } from "firebase/firestore";

const AllReviewers = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchReviewers = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, "reviewers"),
          where("userId", "==", currentUser.uid)
        );
        const snapshot = await getDocs(q);
        setReviewers(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch (error) {
        console.error("Error fetching reviewers:", error);
        toast.error("Failed to load reviewers.");
      } finally {
        setLoading(false);
      }
    };

    fetchReviewers();
  }, [currentUser]);

  const handleDelete = async (reviewerId) => {
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

  const filteredReviewers =
    filter === "all"
      ? reviewers
      : reviewers.filter((r) => r.type === filter);

  if (loading) return <LoadingSpinner fullScreen={false} message="Loading reviewers..." />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">All Reviewers</h1>
        <p className="text-gray-500 text-sm mt-1">Browse all your reviewers across every folder</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: "all", label: "All" },
          { value: "identification", label: "Identification" },
          { value: "multiple_choice", label: "Multiple Choice" },
          { value: "definition", label: "Definitions" },
        ].map((tab) => (
          <button
            key={tab.value}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === tab.value
                ? "bg-black text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredReviewers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <FiBook className="text-4xl text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900">No reviewers found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {filter === "all"
              ? "Create reviewers from your folders."
              : `No ${filter.replace("_", " ")} reviewers found.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReviewers.map((reviewer) => (
            <ReviewerCard
              key={reviewer.id}
              reviewer={reviewer}
              onClick={(id) => navigate(`/dashboard/reviewers/${id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AllReviewers;
