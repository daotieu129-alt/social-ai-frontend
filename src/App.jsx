// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./modules/auth/AuthContext";

import LoginPage from "./modules/auth/LoginPage";
import RegisterPage from "./modules/auth/RegisterPage";

import AppLayout from "./layout/AppLayout";

import ShopsPage from "./modules/shop/ShopsPage";
import DashboardPage from "./modules/dashboard/DashboardPage";
import AiStudioPage from "./modules/ai/AiStudioPage";
import AccountPage from "./modules/user/AccountPage";
import CustomersPage from "./modules/customers/CustomersPage";
import PlannerPage from "./modules/planner/PlannerPage";
import PostsPage from "./modules/posts/PostsPage";
import InboxPage from "./modules/inbox/InboxPage";
import SocialHubPage from "./modules/social/SocialHubPage"; // <-- sửa ở đây
const MediaStudioPage = React.lazy(() => import("./modules/media/MediaStudioPage"));

function readSelectedShop() {
  try {
    const raw = localStorage.getItem("selected_shop");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const [activeShop, setActiveShop] = useState(readSelectedShop());

  // Sync selected_shop across browser tabs/windows
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "selected_shop") {
        setActiveShop(readSelectedShop());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist activeShop (same tab)
  useEffect(() => {
    try {
      if (activeShop) localStorage.setItem("selected_shop", JSON.stringify(activeShop));
      else localStorage.removeItem("selected_shop");
    } catch {
      // ignore
    }
  }, [activeShop]);

  const onSelectShop = (shop) => setActiveShop(shop || null);

  return (
    <Routes>
      {/* ===== PUBLIC ===== */}
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />

      {/* ===== PRIVATE ROOT ===== */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout>
              <Navigate to="/dashboard" replace />
            </AppLayout>
          </RequireAuth>
        }
      />

      {/* ===== PRIVATE PAGES ===== */}
      <Route
        path="/shops"
        element={
          <RequireAuth>
            <AppLayout>
              <ShopsPage activeShop={activeShop} onSelectShop={onSelectShop} />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppLayout>
              <DashboardPage activeShop={activeShop} />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/ai"
        element={
          <RequireAuth>
            <AppLayout>
              <AiStudioPage activeShop={activeShop} />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/planner"
        element={
          <RequireAuth>
            <AppLayout>
              <PlannerPage activeShop={activeShop} />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/posts"
        element={
          <RequireAuth>
            <AppLayout>
              <PostsPage activeShop={activeShop} />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/inbox"
        element={
          <RequireAuth>
            <AppLayout>
              <InboxPage activeShop={activeShop} />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/customers"
        element={
          <RequireAuth>
            <AppLayout>
              <CustomersPage activeShop={activeShop} />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/account"
        element={
          <RequireAuth>
            <AppLayout>
              <AccountPage />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/channels"
        element={
          <RequireAuth>
            <AppLayout>
              <SocialHubPage activeShop={activeShop} />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/media"
        element={
          <RequireAuth>
            <AppLayout>
              <React.Suspense fallback={null}>
                <MediaStudioPage activeShop={activeShop} />
              </React.Suspense>
            </AppLayout>
          </RequireAuth>
        }
      />

      {/* ===== FALLBACK ===== */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
