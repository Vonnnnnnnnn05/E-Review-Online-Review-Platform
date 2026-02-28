/**
 * DashboardLayout Component
 * 
 * Main layout wrapper with sidebar and content area.
 * Used by both Admin and User dashboards.
 */
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 mt-14 md:mt-0 md:ml-64 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
