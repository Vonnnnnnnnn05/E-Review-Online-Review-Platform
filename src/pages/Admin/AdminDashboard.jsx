/**
 * Admin Dashboard Page
 * 
 * Overview with stats about users, folders, and reviewers.
 */
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { FiUsers, FiFolder, FiBook, FiFileText } from "react-icons/fi";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    folders: 0,
    reviewers: 0,
    questions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersSnap, foldersSnap, reviewersSnap, questionsSnap] =
          await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "folders")),
            getDocs(collection(db, "reviewers")),
            getDocs(collection(db, "questions")),
          ]);

        setStats({
          users: usersSnap.size,
          folders: foldersSnap.size,
          reviewers: reviewersSnap.size,
          questions: questionsSnap.size,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statItems = [
    { label: "Total Users", value: stats.users, icon: <FiUsers /> },
    { label: "Total Folders", value: stats.folders, icon: <FiFolder /> },
    { label: "Total Reviewers", value: stats.reviewers, icon: <FiBook /> },
    { label: "Total Questions", value: stats.questions, icon: <FiFileText /> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of the E-Review system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center text-center"
          >
            <div className="text-2xl text-black mb-2">{item.icon}</div>
            <div className="text-2xl font-bold text-black">
              {loading ? "..." : item.value}
            </div>
            <div className="text-xs text-gray-500 mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-black mb-2">Welcome, Admin</h2>
        <p className="text-sm text-gray-500">
          Use the sidebar to manage users. You have full access to create, disable,
          and delete user accounts.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
