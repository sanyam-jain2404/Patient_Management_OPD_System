
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  // Step 1: Authentication check
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Step 2: Authorization check
  if (
    allowedRoles &&
    !allowedRoles.includes(user.role?.toLowerCase())
  ) {
    
    if (user.role?.toLowerCase() === "patient") {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
