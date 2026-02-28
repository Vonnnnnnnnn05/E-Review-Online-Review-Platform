/**
 * User Dashboard Page
 * 
 * Overview of user's folders and reviewers with quick stats.
 */
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiFolder, FiBook, FiFileText, FiPlus } from "react-icons/fi";
import LoadingSpinner from "../../components/LoadingSpinner";

const UserDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ folders: 0, reviewers: 0, questions: 0 });
  const [recentFolders, setRecentFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        const foldersQuery = query(
          collection(db, "folders"),
          where("userId", "==", currentUser.uid)
        );
        const foldersSnap = await getDocs(foldersQuery);
        const foldersData = foldersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const reviewersQuery = query(
          collection(db, "reviewers"),
          where("userId", "==", currentUser.uid)
        );
        const reviewersSnap = await getDocs(reviewersQuery);

        const questionsQuery = query(
          collection(db, "questions"),
          where("userId", "==", currentUser.uid)
        );
        const questionsSnap = await getDocs(questionsQuery);

        setStats({
          folders: foldersSnap.size,
          reviewers: reviewersSnap.size,
          questions: questionsSnap.size,
        });

        setRecentFolders(foldersData.slice(0, 4));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  if (loading) return <LoadingSpinner fullScreen={false} message="Loading dashboard..." />;

  const statItems = [
    { label: "My Folders", value: stats.folders, icon: <FiFolder /> },
    { label: "My Reviewers", value: stats.reviewers, icon: <FiBook /> },
    { label: "Total Questions", value: stats.questions, icon: <FiFileText /> },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here's your learning overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center text-center"
          >
            <div className="text-2xl text-black mb-2">{item.icon}</div>
            <div className="text-2xl font-bold text-black">{item.value}</div>
            <div className="text-xs text-gray-500 mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-black mb-3">Quick Actions</h2>
        <div className="flex gap-3 flex-wrap">
          <button
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            onClick={() => navigate("/dashboard/folders")}
          >
            <FiPlus /> New Folder
          </button>
          <button
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            onClick={() => navigate("/dashboard/reviewers")}
          >
            <FiBook /> View All Reviewers
          </button>
        </div>
      </div>

      {/* Recent Folders */}
      <div>
        <h2 className="text-base font-semibold text-black mb-3">Recent Folders</h2>
        {recentFolders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <FiFolder className="text-4xl text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900">No folders yet</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Create your first folder to start organizing reviewers.</p>
            <button
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
              onClick={() => navigate("/dashboard/folders")}
            >
              <FiPlus /> Create Folder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentFolders.map((folder) => (
              <div
                key={folder.id}
                className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-gray-400 transition flex flex-col items-center text-center"
                onClick={() => navigate(`/dashboard/folders/${folder.id}`)}
              >
                <FiFolder className="text-2xl text-black mb-2" />
                <div className="font-semibold text-gray-900 text-sm">{folder.folderName}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {folder.createdAt?.toDate
                    ? folder.createdAt.toDate().toLocaleDateString()
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
