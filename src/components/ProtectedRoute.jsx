import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";

export default function ProtectedRoute({ children, redirectTo = "/login" }) {
  const { isAuthed, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm">Đang tải...</div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  return children;
}
