/**
 * FolderCard Component
 * 
 * Displays a single folder with actions (rename, delete).
 */
import { FiFolder, FiEdit2, FiTrash2 } from "react-icons/fi";

const FolderCard = ({ folder, onClick, onRename, onDelete }) => {
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-400 transition flex items-center gap-3 group"
      onClick={() => onClick(folder.id)}
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
        <FiFolder className="text-lg" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate text-sm">{folder.folderName}</h3>
        <span className="text-xs text-gray-400">
          {folder.createdAt?.toDate
            ? folder.createdAt.toDate().toLocaleDateString()
            : ""}
        </span>
      </div>
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition"
          onClick={() => onRename(folder)}
          title="Rename"
        >
          <FiEdit2 className="text-sm" />
        </button>
        <button
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
          onClick={() => onDelete(folder.id)}
          title="Delete"
        >
          <FiTrash2 className="text-sm" />
        </button>
      </div>
    </div>
  );
};

export default FolderCard;
