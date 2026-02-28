/**
 * Sidebar Component
 * 
 * Navigation sidebar with role-based menu items.
 * Mobile-responsive: hamburger menu with overlay on small screens.
 */
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  FiHome,
  FiFolder,
  FiUsers,
  FiLogOut,
  FiBook,
  FiMenu,
  FiX,
} from "react-icons/fi";
import { useState, useEffect } from "react";

const Sidebar = () => {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const adminLinks = [
    { to: "/admin", icon: <FiHome />, label: "Dashboard" },
    { to: "/admin/users", icon: <FiUsers />, label: "Manage Users" },
  ];

  const userLinks = [
    { to: "/dashboard", icon: <FiHome />, label: "Dashboard" },
    { to: "/dashboard/folders", icon: <FiFolder />, label: "My Folders" },
    { to: "/dashboard/reviewers", icon: <FiBook />, label: "All Reviewers" },
  ];

  const links = userRole === "admin" ? adminLinks : userLinks;

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-40 md:hidden">
        <button
          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <FiMenu className="text-xl" />
        </button>
        <h2 className="ml-3 text-lg font-bold text-black">E-Review</h2>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col transition-transform duration-200 
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-black">E-Review</h2>
          <button
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold">
            {currentUser?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.email}</p>
            <p className="text-xs text-gray-400 capitalize">{userRole}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/admin" || link.to === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-black text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
              title={link.label}
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5">
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition w-full"
            onClick={handleLogout}
          >
            <FiLogOut className="text-lg" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
