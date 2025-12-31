// src/modules/auth/AuthContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const AuthContext = createContext(null);

function pickData(res) {
  // BE có thể trả: { success, message, data: {...} } hoặc { ... }
  return res?.data?.data ?? res?.data ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    setPlan(null);
    setLimits(null);
  }, []);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return null;
    }

    try {
      const res = await api.get("/auth/me");
      const data = pickData(res);
      const me = data?.user ?? data;

      if (!me) throw new Error("Invalid /auth/me response");

      setUser(me);
      // nếu BE có trả plan/limits ở /auth/me thì lấy luôn (không có thì giữ nguyên)
      if (data?.plan !== undefined) setPlan(data.plan);
      if (data?.limits !== undefined) setLimits(data.limits);

      return me;
    } catch (e) {
      // 401 => token sai/hết hạn => clear
      if (e?.response?.status === 401) logout();
      setLoading(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const data = pickData(res);

    const token = data?.token;
    const me = data?.user;

    if (!token || !me) {
      throw new Error("Invalid login response (missing token/user)");
    }

    localStorage.setItem("token", token);
    setUser(me);

    // nếu BE trả kèm plan/limits trong login response
    if (data?.plan !== undefined) setPlan(data.plan);
    if (data?.limits !== undefined) setLimits(data.limits);

    return me;
  }, []);

  const register = useCallback(async (payload) => {
    // tuỳ BE: /auth/register
    const res = await api.post("/auth/register", payload);
    return pickData(res);
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const value = useMemo(
    () => ({
      user,
      plan,
      limits,
      loading,
      login,
      register,
      logout,
      fetchMe,
      setPlan,
      setLimits,
      setUser,
    }),
    [user, plan, limits, loading, login, register, logout, fetchMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
