// src/modules/inbox/InboxPage.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function Aura({ className }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]", className)}>
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-500/18 blur-3xl" />
      <div className="absolute top-8 right-8 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl" />
      <div className="absolute -bottom-36 -right-36 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(closest-side,rgba(255,255,255,0.05),transparent)] opacity-45" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
    </div>
  );
}

function GlassCard({ children, className }) {
  return (
    <div
      className={cn(
        "relative rounded-[28px] border border-slate-800/70",
        "bg-gradient-to-b from-slate-950/85 to-slate-950/45",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_30px_90px_rgba(0,0,0,0.48)]",
        className
      )}
    >
      <Aura />
      <div className="relative rounded-[28px] p-[1px] bg-gradient-to-r from-violet-500/16 via-cyan-500/10 to-emerald-500/12">
        <div className="rounded-[27px] bg-slate-950/35">{children}</div>
      </div>
    </div>
  );
}

function Badge({ tone = "neutral", children, className }) {
  const t = {
    neutral: "border-slate-800 bg-slate-950/35 text-slate-200",
    info: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    ok: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
    warn: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    hot: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        t[tone] || t.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", className, onClick, disabled, children, title, type = "button" }) {
  const t = {
    neutral: "border-slate-800 bg-slate-950/35 text-slate-200 hover:bg-slate-900/45 hover:border-slate-700/80",
    indigo:
      "border-violet-400/22 bg-gradient-to-r from-violet-500/24 via-cyan-500/12 to-emerald-500/10 text-white hover:brightness-110",
    ghost: "border-transparent bg-transparent text-slate-300 hover:bg-slate-900/45 hover:text-slate-100",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border px-3 py-2 text-xs font-semibold transition",
        t[tone] || t.neutral,
        disabled && "cursor-not-allowed opacity-60 hover:brightness-100",
        className
      )}
    >
      {children}
    </button>
  );
}

function Step({ idx, title, desc, tone = "neutral" }) {
  const dot =
    tone === "ok"
      ? "bg-emerald-400/80"
      : tone === "warn"
      ? "bg-amber-400/80"
      : tone === "hot"
      ? "bg-fuchsia-400/80"
      : "bg-slate-400/60";

  return (
    <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/30 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40">
          <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-100">
              {idx}. {title}
            </div>
          </div>
          <div className="mt-1 text-xs leading-relaxed text-slate-400">{desc}</div>
        </div>
      </div>
    </div>
  );
}

export default function InboxPage({ activeShop }) {
  const navigate = useNavigate();
  const shopId = activeShop?.id ?? null;

  const shopLabel = useMemo(() => {
    if (!activeShop) return "Chưa chọn shop";
    return activeShop?.name || activeShop?.id || "Shop";
  }, [activeShop]);

  if (!shopId) {
    return (
      <GlassCard className="p-0">
        <div className="px-6 py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-100">Inbox</div>
              <div className="mt-1 text-xs text-slate-400">Cần chọn shop trước khi xem inbox.</div>
            </div>
            <Badge tone="warn">Action required</Badge>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Btn tone="indigo" onClick={() => navigate("/shops")}>
              Đi tới Shops
            </Btn>
            <Btn tone="neutral" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Btn>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[30px] border border-slate-800/70 bg-slate-950/35 p-5">
        <Aura className="rounded-[30px]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold text-slate-100">Inbox</div>
              <Badge tone="hot">Coming Soon</Badge>
              <Badge tone="neutral">Shop: {shopLabel}</Badge>
            </div>
            <div className="mt-2 max-w-[72ch] text-sm leading-relaxed text-slate-400">
              Tính năng Inbox đang được hoàn thiện để đáp ứng yêu cầu quyền Meta (pages_messaging) và quy trình xét duyệt.
              Hiện trang này là chế độ xem trước (preview).
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Btn tone="indigo" onClick={() => navigate("/social")} title="Kết nối Facebook Pages / token">
              Mở Channels
            </Btn>
            <Btn tone="neutral" onClick={() => navigate("/posts")} title="Theo dõi Auto Post">
              Mở Posts
            </Btn>
            <Btn tone="ghost" onClick={() => navigate("/planner")} title="Lập kế hoạch nội dung">
              Planner
            </Btn>
          </div>
        </div>
      </div>

      {/* Beautiful Coming Soon card */}
      <GlassCard className="p-0">
        <div className="px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-slate-100">Inbox Preview</div>
              <div className="mt-1 text-xs text-slate-400">Roadmap triển khai (UI + Backend + Meta approval).</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Design-ready</Badge>
              <Badge tone="warn">Waiting approvals</Badge>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Step
              idx={1}
              tone="ok"
              title="Kết nối Pages + Token health"
              desc="Dựa trên Channels: hiển thị trạng thái token, reconnect, và kiểm tra scheduler."
            />
            <Step
              idx={2}
              tone="warn"
              title="Xin quyền pages_messaging"
              desc="Chuẩn bị mô tả use-case, screen recording và quy trình review/verification."
            />
            <Step
              idx={3}
              tone="hot"
              title="Inbox UI + Auto Reply"
              desc="Danh sách hội thoại, khung chat, phân loại, gợi ý trả lời, rule-based auto reply."
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-[24px] border border-slate-800/70 bg-slate-950/25 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">Những gì đã có</div>
                <Badge tone="ok">OK</Badge>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>• Auto Post (scheduled_posts) end-to-end</li>
                <li>• Token status/health trong Channels</li>
                <li>• Dashboard / Planner UI theo style dashboard</li>
              </ul>
            </div>

            <div className="rounded-[24px] border border-slate-800/70 bg-slate-950/25 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">Gợi ý thao tác hiện tại</div>
                <Badge tone="info">Next</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn tone="indigo" onClick={() => navigate("/social")}>
                  Kiểm tra Pages/Token
                </Btn>
                <Btn tone="neutral" onClick={() => navigate("/posts")}>
                  Lên lịch bài đăng
                </Btn>
                <Btn tone="neutral" onClick={() => navigate("/dashboard")}>
                  Xem Dashboard
                </Btn>
              </div>
              <div className="mt-3 text-xs text-slate-500">Không đủ dữ liệu để xác minh timeline release.</div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
