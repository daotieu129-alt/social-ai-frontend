import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";

export default function PublicRoute({ children, redirectTo = "/shops" }) {
  const { isAuthed, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm">Đang tải...</div>
      </div>
    );
  }

  if (isAuthed) return <Navigate to={redirectTo} replace />;
  return children;
}
