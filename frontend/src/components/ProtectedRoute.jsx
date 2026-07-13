import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ProtectedRoute({ allow, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-center text-sm text-gray-500">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-brand-charcoal">Not authorized</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your account does not have access to this page.
        </p>
      </div>
    );
  }

  return children;
}
