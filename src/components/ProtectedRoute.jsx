/**
 * ProtectedRoute Component
 * 
 * Guards routes based on authentication and role.
 * Redirects unauthenticated users to login.
 * Redirects users without proper role to their dashboard.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, userRole, loading } = useAuth();

  // Show spinner while checking auth state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Not logged in → redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Role mismatch → redirect to appropriate dashboard
  if (requiredRole && userRole !== requiredRole) {
    if (userRole === "admin") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
