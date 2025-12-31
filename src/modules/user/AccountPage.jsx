// src/modules/user/AccountPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/**
 * AccountPage (Planner-style)
 * - Đồng bộ phong cách UI với Planner/Dashboard mới (gradient, card bo tròn, pill).
 * - Giữ nguyên logic đọc user/plan từ AuthContext.
 * - Payment history vẫn là DEMO (sau này nối cổng thanh toán thì thay data).
 */

function Pill({ children, tone = "default" }) {
  const cls =
    tone === "default"
      ? "border-slate-700/70 bg-slate-950/60 text-slate-200"
      : tone;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/55 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]">
      <div className="relative border-b border-slate-800/60 px-4 py-3 rounded-t-3xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-600/15 via-fuchsia-600/10 to-cyan-600/15 rounded-t-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">{title}</div>
            {subtitle ? <div className="mt-0.5 text-xs text-slate-300/70">{subtitle}</div> : null}
          </div>
          {right}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function statusBadgeClass(status) {
  if (!status) return "bg-slate-800/50 text-slate-200 border-slate-700/80";
  const s = String(status).toLowerCase();
  if (s.includes("thành công") || s.includes("success")) {
    return "bg-emerald-500/10 text-emerald-300 border-emerald-400/40";
  }
  if (s.includes("chờ") || s.includes("pending")) {
    return "bg-amber-500/10 text-amber-300 border-amber-400/40";
  }
  return "bg-rose-500/10 text-rose-300 border-rose-400/40";
}

function planIdFromName(planName) {
  const n = (planName || "").toLowerCase();
  if (n.includes("free")) return "free";
  if (n.includes("pro")) return "pro";
  if (n.includes("pre") || n.includes("premium")) return "pre";
  return "free";
}

function PlanCard({ plan, isCurrent, onUpgrade }) {
  const theme =
    plan.id === "free"
      ? {
          ring: isCurrent ? "border-emerald-300/70" : "border-emerald-700/60 hover:border-emerald-400/70",
          glow: "from-emerald-600/25 via-emerald-900/10 to-transparent",
          pill: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
        }
      : plan.id === "pro"
      ? {
          ring: isCurrent ? "border-indigo-300/70" : "border-indigo-700/60 hover:border-indigo-400/70",
          glow: "from-indigo-600/25 via-fuchsia-600/10 to-transparent",
          pill: "border-indigo-500/30 bg-indigo-500/15 text-indigo-200",
        }
      : {
          ring: isCurrent ? "border-purple-300/70" : "border-purple-700/60 hover:border-purple-400/70",
          glow: "from-purple-600/25 via-fuchsia-600/10 to-transparent",
          pill: "border-purple-500/30 bg-purple-500/15 text-purple-200",
        };

  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl border bg-slate-950/55 p-4 transition shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]",
        theme.ring,
      ].join(" ")}
    >
      <div className={`pointer-events-none absolute -inset-24 bg-gradient-to-r ${theme.glow} blur-2xl`} />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-lg">{plan.emoji}</div>
            <div className="text-sm font-semibold text-slate-100">{plan.name}</div>
            {isCurrent ? <Pill tone={theme.pill}>Gói hiện tại</Pill> : null}
          </div>
          <div className="mt-1 text-xs text-slate-300/80">{plan.short}</div>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold text-slate-100">{plan.price}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">{plan.highlight}</div>
        </div>
      </div>

      <ul className="relative mt-3 space-y-2 text-sm text-slate-200">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5">✅</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-4">
        <button
          type="button"
          onClick={onUpgrade}
          className={[
            "w-full rounded-2xl py-3 text-sm font-semibold",
            isCurrent
              ? "border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
              : "bg-indigo-600 text-white hover:bg-indigo-500",
          ].join(" ")}
        >
          {isCurrent ? "Bạn đang dùng gói này" : "Nâng cấp / Xem chi tiết"}
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { user, plan } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");

  const initial = useMemo(() => {
    const name = user?.name?.trim();
    const email = user?.email?.trim();
    if (name) return name[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return "?";
  }, [user]);

  const statusText = user?.status || plan?.status || "Đang hoạt động";
  const currentPlan = plan?.name || "Free";
  const currentPlanId = planIdFromName(currentPlan);

  const planCards = useMemo(
    () => [
      {
        id: "free",
        name: "Free",
        short: "Dùng thử & cá nhân nhỏ",
        price: "0đ / tháng",
        highlight: "Phù hợp để trải nghiệm nhanh.",
        features: [
          "AI giới hạn theo ngày",
          "Quản lý 1 shop cơ bản",
          "Planner & AI Studio dùng được ngay",
          "Không cần thanh toán",
        ],
        emoji: "🌱",
      },
      {
        id: "pro",
        name: "Pro",
        short: "Bán hàng nghiêm túc",
        price: "299k / tháng",
        highlight: "Tạo nội dung đều mỗi ngày.",
        features: [
          "Nhiều lượt AI/ngày hơn Free",
          "Quản lý nhiều shop/thương hiệu",
          "Planner nâng cao (quy trình rõ ràng)",
          "Hỗ trợ ưu tiên",
        ],
        emoji: "🚀",
      },
      {
        id: "pre",
        name: "Pre",
        short: "Nâng cao / thử sớm",
        price: "Liên hệ",
        highlight: "Hạn mức lớn, ưu tiên tính năng mới.",
        features: [
          "Hạn mức AI rộng rãi hơn Pro",
          "Chạy nhiều chiến dịch song song",
          "Tối ưu cho team/agency",
          "Hỗ trợ setup nâng cao",
        ],
        emoji: "⭐",
      },
    ],
    []
  );

  // Demo UI lịch sử thanh toán (sau này nối cổng thanh toán thì thay data)
  const paymentHistory = useMemo(
    () => [
      {
        id: 1,
        date: "12/07/2025",
        description: "Kích hoạt tài khoản SocialAI",
        amount: "0đ",
        status: "Thành công",
      },
    ],
    []
  );

  const copyUpgradeMessage = async () => {
    const msg =
      "Mình muốn nâng cấp gói SocialAI Studio (Pro/Pre). Cho mình giá và hướng dẫn thanh toán.";
    try {
      await navigator.clipboard.writeText(msg);
      setNotice("Đã copy tin nhắn nâng cấp ✅ Bạn dán gửi cho admin/CSKH nhé.");
      setTimeout(() => setNotice(""), 2200);
    } catch {
      setNotice("Copy thất bại — bạn có thể tự copy nội dung trong trang Pricing.");
      setTimeout(() => setNotice(""), 2200);
    }
    navigate("/pricing");
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/50 p-4">
        <div className="pointer-events-none absolute -inset-20 bg-gradient-to-r from-indigo-600/25 via-fuchsia-600/15 to-cyan-600/20 blur-2xl" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-300/80">Tài khoản</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">Quản lý gói & thanh toán</div>
            <div className="mt-1 text-xs text-slate-300/80">
              Nơi bạn xem thông tin đăng nhập, gói hiện tại, và lịch sử giao dịch.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="border-indigo-500/30 bg-indigo-500/15 text-indigo-200">
              Gói: <span className="ml-1 font-semibold">{currentPlan}</span>
            </Pill>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              💳 Mở Bảng giá
            </button>
          </div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/25 p-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr,1.8fr]">
        {/* Thông tin đăng nhập */}
        <SectionCard
          title="Thông tin đăng nhập"
          subtitle="Thông tin cơ bản của bạn. (Sau này có thể thêm đổi mật khẩu, đổi tên…)"
          right={<Pill>Hồ sơ</Pill>}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-500/15 border border-indigo-400/60 text-xl font-semibold text-indigo-100">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100 truncate">
                {user?.name || user?.email || "Người dùng"}
              </div>
              {user?.email ? <div className="text-xs text-slate-400 truncate">{user.email}</div> : null}
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-slate-300">
            <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-2">
              <span className="text-slate-400">Trạng thái</span>
              <span className="font-medium text-emerald-300">{statusText}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-2">
              <span className="text-slate-400">Ngày tạo</span>
              <span>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-2">
              <span className="text-slate-400">User ID</span>
              <span className="font-mono text-[11px]">{user?.id || "—"}</span>
            </div>
          </div>
        </SectionCard>

        {/* Gói + lịch sử */}
        <div className="space-y-4">
          <SectionCard
            title="Gói sử dụng hiện tại"
            subtitle="Hệ thống sẽ cá nhân hoá hạn mức AI theo gói."
            right={<Pill tone="border-slate-800 bg-slate-950/60 text-slate-300">Billing</Pill>}
          >
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-400">Gói đang dùng</div>
                  <div className="text-sm font-semibold text-slate-100">{currentPlan}</div>
                </div>
                <button
                  type="button"
                  onClick={copyUpgradeMessage}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
                >
                  Nâng cấp gói
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {plan?.description ||
                  "Bạn có thể nâng cấp gói để có nhiều lượt AI/ngày và quản lý nhiều shop hơn."}
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-400">Gợi ý</div>
                <div className="text-sm font-semibold text-slate-100">Dùng AI đều mỗi ngày</div>
                <div className="mt-1 text-xs text-slate-400">Tạo 7–30 ngày trong Planner để ra kết quả.</div>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-400">Tip</div>
                <div className="text-sm font-semibold text-slate-100">Lưu vào Planner</div>
                <div className="mt-1 text-xs text-slate-400">AI Studio → “Lưu vào Planner” để quản lý bài.</div>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-400">Mục tiêu</div>
                <div className="text-sm font-semibold text-slate-100">Đăng đều 3–5 bài/tuần</div>
                <div className="mt-1 text-xs text-slate-400">Ổn định trước, rồi mới tăng tốc.</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Lịch sử thanh toán"
            subtitle="Demo UI — khi nối MoMo/Stripe thì thay dữ liệu thật."
            right={<Pill>History</Pill>}
          >
            {paymentHistory.length === 0 ? (
              <div className="text-sm text-slate-400">
                Chưa có giao dịch nào. Khi bạn thanh toán/nâng cấp, lịch sử sẽ hiển thị ở đây.
              </div>
            ) : (
              <div className="space-y-2">
                {paymentHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-100 truncate">{item.description}</div>
                      <div className="text-[11px] text-slate-400">{item.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-100">{item.amount}</div>
                      <div
                        className={[
                          "mt-1 inline-flex items-center rounded-full border px-2 py-[2px] text-[10px]",
                          statusBadgeClass(item.status),
                        ].join(" ")}
                      >
                        {item.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Plan cards */}
      <SectionCard
        title="Gói & quyền lợi"
        subtitle="Bạn nhìn 1 lần là hiểu: mỗi gói được gì, nâng cấp lúc nào."
        right={<Pill tone="border-indigo-500/30 bg-indigo-500/15 text-indigo-200">So sánh gói</Pill>}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {planCards.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              isCurrent={currentPlanId === p.id}
              onUpgrade={() => navigate("/pricing")}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
