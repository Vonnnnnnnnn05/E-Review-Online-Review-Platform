/**
 * Manage Users Page (Admin)
 * 
 * Full CRUD for user accounts:
 * - Create user (via Firebase Auth + Firestore)
 * - View all users
 * - Delete users
 * - Disable/Enable users
 */
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { toast } from "react-toastify";
import { FiPlus, FiTrash2, FiUserX, FiUserCheck } from "react-icons/fi";
import LoadingSpinner from "../../components/LoadingSpinner";

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "user" });
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newUser.email,
        role: newUser.role,
        disabled: false,
        createdAt: serverTimestamp(),
      });
      toast.success("User created successfully!");
      setShowModal(false);
      setNewUser({ email: "", password: "", role: "user" });
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      switch (error.code) {
        case "auth/email-already-in-use":
          toast.error("Email is already registered.");
          break;
        case "auth/weak-password":
          toast.error("Password must be at least 6 characters.");
          break;
        default:
          toast.error("Failed to create user.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("User deleted from Firestore.");
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user.");
    }
  };

  const handleToggleDisable = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, "users", userId), { disabled: !currentStatus });
      toast.success(`User ${currentStatus ? "enabled" : "disabled"} successfully.`);
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, disabled: !currentStatus } : u
        )
      );
    } catch (error) {
      console.error("Error toggling user:", error);
      toast.error("Failed to update user status.");
    }
  };

  if (loading) return <LoadingSpinner fullScreen={false} message="Loading users..." />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Manage Users</h1>
          <p className="text-gray-500 text-sm mt-1">Create, view, and manage user accounts</p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          onClick={() => setShowModal(true)}
        >
          <FiPlus /> Create User
        </button>
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <h3 className="font-semibold text-gray-900">No users found</h3>
          <p className="text-sm text-gray-500 mt-1">Create a new user to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Created</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-900">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.disabled
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.disabled ? "Disabled" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.createdAt?.toDate
                      ? user.createdAt.toDate().toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                          user.disabled
                            ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => handleToggleDisable(user.id, user.disabled)}
                        title={user.disabled ? "Enable user" : "Disable user"}
                      >
                        {user.disabled ? <FiUserCheck /> : <FiUserX />}
                        {user.disabled ? "Enable" : "Disable"}
                      </button>
                      <button
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete user"
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-black mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="new-email"
                  type="email"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Minimum 6 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="new-role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="new-role"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
