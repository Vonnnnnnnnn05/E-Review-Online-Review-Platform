/**
 * Folders Page (User)
 * 
 * CRUD operations for folders: create, rename, delete, view.
 * Includes search functionality.
 */
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiPlus, FiSearch, FiFolder } from "react-icons/fi";
import FolderCard from "../../components/FolderCard";
import LoadingSpinner from "../../components/LoadingSpinner";

const Folders = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolder, setRenameFolder] = useState(null);
  const [renameName, setRenameName] = useState("");

  const fetchFolders = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, "folders"),
        where("userId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const foldersList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      foldersList.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setFolders(foldersList);
    } catch (error) {
      console.error("Error fetching folders:", error);
      toast.error("Failed to load folders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [currentUser]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await addDoc(collection(db, "folders"), {
        userId: currentUser.uid,
        folderName: newFolderName.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success("Folder created!");
      setNewFolderName("");
      setShowCreateModal(false);
      fetchFolders();
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder.");
    }
  };

  const handleRenameFolder = async (e) => {
    e.preventDefault();
    if (!renameName.trim() || !renameFolder) return;

    try {
      await updateDoc(doc(db, "folders", renameFolder.id), {
        folderName: renameName.trim(),
      });
      toast.success("Folder renamed!");
      setShowRenameModal(false);
      setRenameFolder(null);
      setRenameName("");
      fetchFolders();
    } catch (error) {
      console.error("Error renaming folder:", error);
      toast.error("Failed to rename folder.");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Delete this folder and all its contents?")) return;

    try {
      const reviewersQuery = query(
        collection(db, "reviewers"),
        where("folderId", "==", folderId)
      );
      const reviewersSnap = await getDocs(reviewersQuery);

      for (const reviewerDoc of reviewersSnap.docs) {
        const questionsQuery = query(
          collection(db, "questions"),
          where("reviewerId", "==", reviewerDoc.id)
        );
        const questionsSnap = await getDocs(questionsQuery);
        for (const questionDoc of questionsSnap.docs) {
          await deleteDoc(doc(db, "questions", questionDoc.id));
        }
        await deleteDoc(doc(db, "reviewers", reviewerDoc.id));
      }

      await deleteDoc(doc(db, "folders", folderId));
      toast.success("Folder deleted!");
      setFolders(folders.filter((f) => f.id !== folderId));
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Failed to delete folder.");
    }
  };

  const openRenameModal = (folder) => {
    setRenameFolder(folder);
    setRenameName(folder.folderName);
    setShowRenameModal(true);
  };

  const filteredFolders = folders.filter((f) =>
    f.folderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingSpinner fullScreen={false} message="Loading folders..." />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black">My Folders</h1>
            <p className="text-gray-500 text-sm mt-1">Organize your reviewers into folders</p>
          </div>
          <button
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            onClick={() => setShowCreateModal(true)}
          >
            <FiPlus /> New Folder
          </button>
        </div>
      </div>

      {/* Search */}
      {folders.length > 0 && (
        <div className="relative mb-6">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition"
          />
        </div>
      )}

      {/* Folder Grid */}
      {filteredFolders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <FiFolder className="text-4xl text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900">
            {searchQuery ? "No folders match your search" : "No folders yet"}
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            {searchQuery
              ? "Try a different search term."
              : "Create your first folder to start organizing."}
          </p>
          {!searchQuery && (
            <button
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus /> Create Folder
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onClick={(id) => navigate(`/dashboard/folders/${id}`)}
              onRename={openRenameModal}
              onDelete={handleDeleteFolder}
            />
          ))}
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-black mb-4">Create New Folder</h2>
            <form onSubmit={handleCreateFolder}>
              <div className="mb-4">
                <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  id="folder-name"
                  type="text"
                  placeholder="e.g., Biology 101"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition"
                />
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

      {/* Rename Folder Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowRenameModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-black mb-4">Rename Folder</h2>
            <form onSubmit={handleRenameFolder}>
              <div className="mb-4">
                <label htmlFor="rename-name" className="block text-sm font-medium text-gray-700 mb-1">
                  New Name
                </label>
                <input
                  id="rename-name"
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  onClick={() => setShowRenameModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Folders;
