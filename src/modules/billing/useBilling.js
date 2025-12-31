// src/modules/billing/useBilling.js
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../auth/AuthContext";

export function useBilling() {
  const { plan, limits, setPlan, setLimits } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const isPro = useMemo(() => {
    const p = (plan || "").toString().toUpperCase();
    return p === "PRO" || p === "AGENCY";
  }, [plan]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await api.get("/billing/me");
      const data = res?.data?.data || res?.data;

      const nextPlan = data?.plan ?? null;
      const nextLimits = data?.limits ?? null;

      if (typeof setPlan === "function") setPlan(nextPlan);
      if (typeof setLimits === "function") setLimits(nextLimits);

      return { plan: nextPlan, limits: nextLimits };
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Không thể tải thông tin gói.";
      setError(msg);
      return null;
    } finally {
      setRefreshing(false);
    }
  }, [setPlan, setLimits]);

  const createCheckout = useCallback(
    async ({ shopId, plan: nextPlan = "PRO", provider = "vnpay", months = 1 } = {}) => {
      setLoading(true);
      setError("");
      try {
        const sid = shopId ? String(shopId) : "";
        if (!sid) throw new Error("Thiếu shop_id");

        const m = Number(months);
        if (!Number.isFinite(m) || m < 1) throw new Error("months không hợp lệ");

        const payload = {
          plan: nextPlan,
          shop_id: sid,
          provider,
          months: m,
        };

        const res = await api.post("/billing/create-session", payload);
        const url = res?.data?.data?.checkout_url || res?.data?.checkout_url;

        if (!url) throw new Error("Không nhận được checkout_url");
        window.location.href = url;
        return true;
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Không thể tạo phiên thanh toán.";
        setError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Optional: nếu BE return về FE kèm ?status=success|paid
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = (params.get("status") || "").toLowerCase();
    if (status === "success" || status === "paid") {
      refresh();
      params.delete("status");
      const next = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (next ? `?${next}` : ""));
    }
  }, [refresh]);

  return {
    plan,
    limits,
    isPro,
    loading,
    refreshing,
    error,
    refresh,
    createCheckout,
  };
}
