// src/modules/billing/PricingPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBilling } from "./useBilling";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function PlanCard({ title, price, subtitle, features, active, onPrimary, primaryText, loading, disabled }) {
  return (
    <div
      className={cn(
        "rounded-3xl border bg-slate-950/55 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]",
        active ? "border-fuchsia-400/35 shadow-[0_0_0_4px_rgba(217,70,239,0.10)]" : "border-slate-800/80",
        disabled ? "opacity-60" : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-100">{title}</div>
          <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
        </div>
        {active ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100">
            Đang dùng
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-semibold text-slate-100">{price}</div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-fuchsia-400/80" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <button
          type="button"
          onClick={onPrimary}
          disabled={disabled || active || loading}
          className={cn(
            "w-full rounded-2xl py-3 text-sm font-semibold",
            active
              ? "border border-slate-800 bg-slate-950/60 text-slate-300"
              : "bg-indigo-600 text-white hover:bg-indigo-500",
            "disabled:opacity-60"
          )}
        >
          {loading ? "Đang xử lý..." : primaryText}
        </button>
      </div>
    </div>
  );
}

export default function PricingPage({ activeShop }) {
  const navigate = useNavigate();
  const { plan, isPro, loading, refreshing, error, refresh, createCheckout } = useBilling();

  const [months, setMonths] = useState(1);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const planLabel = useMemo(() => (plan || "FREE").toString().toUpperCase(), [plan]);
  const shopName = activeShop?.name || activeShop?.id || "Chưa chọn";
  const canPay = Boolean(activeShop?.id);

  const handleUpgrade = useCallback(() => {
    if (!activeShop?.id) {
      navigate("/shops");
      return;
    }
    createCheckout({ shopId: activeShop.id, months, plan: "PRO", provider: "vnpay" });
  }, [activeShop, months, createCheckout, navigate]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/50 p-4">
        <div className="pointer-events-none absolute -inset-20 bg-gradient-to-r from-indigo-600/25 via-fuchsia-600/15 to-cyan-600/20 blur-2xl" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-100">Bảng giá</div>
            <div className="mt-1 text-xs text-slate-300/80">
              Gói hiện tại: <span className="text-slate-100 font-semibold">{planLabel}</span>
              <span className="mx-2 text-slate-600">•</span>
              Thanh toán qua VNPAY. Sau khi thanh toán, hệ thống sẽ cập nhật gói.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60"
            >
              {refreshing ? "Đang cập nhật..." : "Làm mới"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/shops")}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
            >
              🛍️ Về Shops
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/70 bg-slate-950/45 p-4">
        <div className="text-sm font-semibold text-slate-100">Thanh toán</div>
        <div className="mt-2 text-sm text-slate-300">
          Shop hiện tại: <span className="font-semibold">{shopName}</span>
        </div>
        {!canPay ? (
          <div className="mt-2 text-sm text-amber-300">Cần chọn shop trước khi nâng cấp. Vào trang Shops để chọn shop.</div>
        ) : null}

        <div className="mt-3 flex items-center gap-3">
          <label className="text-sm text-slate-300">Số tháng</label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none"
          >
            {[1, 3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          title="FREE"
          price="0đ"
          subtitle="Dùng thử cơ bản"
          features={["Planner cơ bản", "Giới hạn theo hệ thống", "Phù hợp test nhanh"]}
          active={!isPro}
          primaryText="Đang dùng"
          onPrimary={() => {}}
          loading={false}
          disabled={false}
        />

        <PlanCard
          title="PRO"
          price="29.000đ / tháng"
          subtitle="Mở khoá tạo shop + tăng giới hạn"
          features={["Mở khoá tạo shop", "Tăng giới hạn sử dụng", "Ưu tiên xử lý & ổn định"]}
          active={isPro}
          primaryText={isPro ? "Đang dùng" : "Nâng cấp PRO"}
          onPrimary={handleUpgrade}
          loading={loading}
          disabled={!canPay}
        />
      </div>
    </div>
  );
}
