/**
 * ReviewerCard Component
 * 
 * Displays a reviewer with type badge and actions.
 */
import { FiBook, FiTrash2, FiEye } from "react-icons/fi";

const ReviewerCard = ({ reviewer, onClick, onDelete }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-400 transition">
      <div className="flex items-center justify-between">
        <FiBook className="text-lg text-gray-700" />
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          {reviewer.type?.replace("_", " ")}
        </span>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">{reviewer.title}</h3>
        <span className="text-xs text-gray-400">
          {reviewer.createdAt?.toDate
            ? reviewer.createdAt.toDate().toLocaleDateString()
            : ""}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1">
        <button
          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition"
          onClick={() => onClick(reviewer.id)}
        >
          <FiEye /> View
        </button>
        <button
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(reviewer.id);
          }}
        >
          <FiTrash2 /> Delete
        </button>
      </div>
    </div>
  );
};

export default ReviewerCard;
