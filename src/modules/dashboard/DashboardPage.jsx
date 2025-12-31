// src/modules/dashboard/DashboardPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../auth/AuthContext";

/* ----------------------------- utils ----------------------------- */
function pickData(res) {
  return res?.data?.data ?? res?.data ?? null;
}
function safeStr(v, fallback = "—") {
  if (v === null || v === undefined) return fallback;
  const s = String(v);
  return s.length ? s : fallback;
}
function fmtInt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return new Intl.NumberFormat("vi-VN").format(x);
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
function toMs(iso) {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}
function getWeekRange(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}
function withinRange(iso, start, end) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t < end.getTime();
}
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}
function fromNow(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = t - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const prefix = diff >= 0 ? "in " : "";
  const suffix = diff < 0 ? " ago" : "";
  if (mins < 60) return `${prefix}${mins}m${suffix}`;
  if (hrs < 36) return `${prefix}${hrs}h${suffix}`;
  return `${prefix}${days}d${suffix}`;
}

/* ----------------------------- UI atoms ----------------------------- */
function Shell({ children }) {
  return (
    <div className="min-h-[calc(100vh-5rem)]">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6">{children}</div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={classNames(
        "rounded-3xl border border-slate-800/70 bg-slate-950/55 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

function Badge({ tone = "neutral", children, className = "" }) {
  const toneCls =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "warn"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "bad"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : "border-slate-700/60 bg-slate-900/40 text-slate-200";

  return (
    <span className={classNames("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs leading-none", toneCls, className)}>
      {children}
    </span>
  );
}

function Btn({ tone = "default", onClick, children, className = "", disabled = false }) {
  const cls =
    tone === "primary"
      ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_12px_30px_-18px_rgba(99,102,241,0.9)]"
      : tone === "ghost"
      ? "bg-slate-900/30 hover:bg-slate-900/50 text-slate-200 border border-slate-800/70"
      : tone === "danger"
      ? "bg-rose-600/80 hover:bg-rose-600 text-white"
      : "bg-slate-900/40 hover:bg-slate-900/60 text-slate-200 border border-slate-800/70";

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={classNames("px-4 py-2 rounded-2xl text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed", cls, className)}
    >
      {children}
    </button>
  );
}

function Icon({ name, className = "" }) {
  const cls = classNames("h-5 w-5", className);

  if (name === "spark") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M12 2l1.2 4.3L18 8l-4.8 1.7L12 14l-1.2-4.3L6 8l4.8-1.7L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M19 13l.7 2.4L22 16l-2.3.6L19 19l-.7-2.4L16 16l2.3-.6L19 13z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "refresh") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M20 12a8 8 0 10-2.3 5.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 12v-6m0 6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "external") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M14 5h5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 14L19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M19 14v5H5V5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "post") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M7 7h10M7 12h10M7 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 3h12a2 2 0 012 2v14l-3-2H6a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M7 3v3M17 3v3M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "link") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M10 14a5 5 0 010-7l1.5-1.5a5 5 0 017 7L17 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M14 10a5 5 0 010 7L12.5 18.5a5 5 0 01-7-7L7 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M16 11a4 4 0 10-8 0 4 4 0 008 0z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 21a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "bot") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M12 3v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 9h10a3 3 0 013 3v5a4 4 0 01-4 4H8a4 4 0 01-4-4v-5a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.5 14h.01M14.5 14h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "arrow") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M5 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return <span className={classNames("inline-block", className)} />;
}

function StatCard({ label, value, hint, iconName, tone = "neutral" }) {
  const ring = tone === "primary" ? "from-indigo-500/30 via-fuchsia-500/10 to-cyan-500/10" : "from-slate-800/40 via-slate-800/10 to-slate-800/10";
  return (
    <div className="relative">
      <div className={classNames("absolute -inset-[1px] rounded-3xl bg-gradient-to-r blur-[10px] opacity-70", ring)} />
      <Card className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
            {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
          </div>
          <div className="shrink-0 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-2 text-slate-200/80">
            <Icon name={iconName} className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProgressBar({ value, max, labelLeft, labelRight, tone = "neutral" }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const bar = tone === "good" ? "bg-emerald-500/80" : tone === "warn" ? "bg-amber-500/80" : "bg-indigo-500/80";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{labelLeft}</span>
        <span className="truncate">{labelRight}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-slate-800/70 bg-slate-900/60">
        <div className={classNames("h-full rounded-full", bar)} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

function MiniBars({ points, height = 46 }) {
  const safe = Array.isArray(points) ? points : [];
  const values = safe.map((p) => Number(p?.value ?? 0)).filter((v) => Number.isFinite(v));
  const max = values.length ? Math.max(...values, 1) : 1;

  const w = 220;
  const h = height;
  const pad = 6;
  const barW = safe.length ? Math.max(4, Math.floor((w - pad * 2) / safe.length) - 2) : 4;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block">
      <rect x="0" y="0" width={w} height={h} rx="10" fill="rgba(2,6,23,0.25)" stroke="rgba(51,65,85,0.5)" />
      {safe.map((p, i) => {
        const v = Number(p?.value ?? 0);
        const vv = Number.isFinite(v) ? v : 0;
        const bh = Math.max(1, Math.round(((h - pad * 2) * vv) / max));
        const x = pad + i * (barW + 2);
        const y = h - pad - bh;
        return <rect key={p?.key || i} x={x} y={y} width={barW} height={bh} rx="3" fill="rgba(99,102,241,0.85)" />;
      })}
    </svg>
  );
}

/* ----------------------------- page ----------------------------- */
export default function DashboardPage({ activeShop }) {
  const navigate = useNavigate();
  const { plan, limits } = useAuth() || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);

  const [aiUsage, setAiUsage] = useState([]); // [{date,total_requests}]
  const [contentStats, setContentStats] = useState([]); // [{date,posts}]

  const [shopPrefs, setShopPrefs] = useState(null);

  const [refreshTick, setRefreshTick] = useState(0);
  const [showAllHealth, setShowAllHealth] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!activeShop?.id) return;
      setLoading(true);
      setError("");

      try {
        const [ovRes, accRes, postsRes, aiRes, contentRes, prefsRes] = await Promise.all([
          api.get("/dashboard/overview", { params: { shop_id: activeShop.id } }),
          api.get("/scheduler/accounts", { params: { shop_id: activeShop.id } }),
          api.get("/scheduler/scheduled-posts", { params: { shop_id: activeShop.id } }),
          api.get("/dashboard/ai-usage", { params: { days: 30 } }),
          api.get("/dashboard/content-stats", { params: { shop_id: activeShop.id, days: 30 } }),
          api.get(`/shops/${activeShop.id}/preferences`),
        ]);

        setOverview(pickData(ovRes));
        setAccounts(pickData(accRes) || []);
        setPosts(pickData(postsRes) || []);

        const aiData = pickData(aiRes) || [];
        setAiUsage(Array.isArray(aiData) ? aiData : []);

        const csData = pickData(contentRes) || [];
        setContentStats(Array.isArray(csData) ? csData : []);

        const prefsData = prefsRes?.data?.data ?? prefsRes?.data ?? null;
        setShopPrefs(prefsData || null);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Không tải được dữ liệu dashboard");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [activeShop?.id, refreshTick]);

  const totals = useMemo(() => {
    const t = overview?.totals || overview?.data?.totals || null;
    if (t) return t;
    return overview?.totals ?? null;
  }, [overview]);

  const accountsSummary = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts : [];
    const facebook = list.filter((a) => (a?.provider || "").toLowerCase() === "facebook");
    const noToken = facebook.filter((a) => !a?.access_token).length;
    const withToken = facebook.length - noToken;
    const expCount = facebook.filter((a) => {
      if (!a?.token_expires_at) return false;
      const t = new Date(a.token_expires_at).getTime();
      if (Number.isNaN(t)) return false;
      return t < Date.now();
    }).length;

    return { total: list.length, facebookTotal: facebook.length, withToken, noToken, expCount };
  }, [accounts]);

  const postBuckets = useMemo(() => {
    const list = Array.isArray(posts) ? posts : [];
    const norm = list.map((p) => ({
      ...p,
      _scheduled: toMs(p?.scheduled_time),
      _updated: toMs(p?.updated_at) || toMs(p?.created_at),
      _created: toMs(p?.created_at),
      _status: (p?.status || "").toLowerCase(),
    }));

    const scheduled = norm.filter((p) => p._status === "scheduled");
    const processing = norm.filter((p) => p._status === "processing");
    const posted = norm.filter((p) => p._status === "posted");
    const failed = norm.filter((p) => ["failed", "cancelled", "canceled", "error"].includes(p._status));

    const next = [...scheduled, ...processing].filter((p) => p._scheduled > 0).sort((a, b) => a._scheduled - b._scheduled)[0];
    const last = [...posted].sort((a, b) => (b._updated || 0) - (a._updated || 0))[0];
    const worst = [...failed].sort((a, b) => (b._updated || 0) - (a._updated || 0))[0];

    return { all: norm, scheduled, processing, posted, failed, next, last, worst };
  }, [posts]);

  const targetPerWeek = useMemo(() => {
    const x = Number(shopPrefs?.target_posts_per_week);
    if (Number.isFinite(x) && x >= 1 && x <= 100) return x;
    return 5; // fallback UI target
  }, [shopPrefs?.target_posts_per_week]);

  const weekProgress = useMemo(() => {
    const { start, end } = getWeekRange(new Date());
    const list = postBuckets.all;
    const inWeek = list.filter((p) => withinRange(p?.scheduled_time, start, end));

    const planned = inWeek.filter((p) => ["scheduled", "processing", "posted"].includes(p._status)).length;
    const posted = inWeek.filter((p) => p._status === "posted").length;
    const failed = inWeek.filter((p) => ["failed", "cancelled", "canceled", "error"].includes(p._status)).length;

    return { start, end, planned, posted, failed, totalInWeek: inWeek.length };
  }, [postBuckets.all]);

  const proGate = useMemo(() => {
    const list = postBuckets.all;
    const proErrors = list
      .filter((p) => {
        const msg = (p?.error_message || p?.last_error || "").toLowerCase();
        return msg.includes("pro") && (msg.includes("required") || msg.includes("plan"));
      })
      .slice(0, 5);

    return { count: proErrors.length, samples: proErrors };
  }, [postBuckets.all]);

  const healthChecks = useMemo(() => {
    const checks = [];

    if (accountsSummary.facebookTotal > 0) {
      if (accountsSummary.noToken > 0) {
        checks.push({
          id: "fb_token_missing",
          tone: "warn",
          title: "Facebook Page thiếu token",
          detail: `${accountsSummary.noToken}/${accountsSummary.facebookTotal} Page chưa có access_token.`,
          action: { label: "Mở Channels", to: "/social" },
        });
      }
      if (accountsSummary.expCount > 0) {
        checks.push({
          id: "fb_token_expired",
          tone: "warn",
          title: "Facebook token có thể đã hết hạn",
          detail: `${accountsSummary.expCount} token_expires_at < hiện tại.`,
          action: { label: "Reconnect Facebook", to: "/social" },
        });
      }
    } else {
      checks.push({
        id: "no_channels",
        tone: "warn",
        title: "Chưa kết nối kênh",
        detail: "Cần kết nối Facebook Page để đăng bài.",
        action: { label: "Kết nối kênh", to: "/social" },
      });
    }

    if (proGate.count > 0) {
      checks.push({
        id: "pro_gate",
        tone: "bad",
        title: "Bị chặn bởi gói PRO",
        detail: `Có ${proGate.count} scheduled_posts có lỗi liên quan PRO plan.`,
        action: { label: "Xem Bảng giá", to: "/pricing" },
      });
    }

    const stuck = postBuckets.processing.filter((p) => p._updated && Date.now() - p._updated > 30 * 60 * 1000).length;
    if (stuck > 0) {
      checks.push({
        id: "processing_stuck",
        tone: "warn",
        title: "Có post bị kẹt Processing",
        detail: `${stuck} post processing > 30 phút (theo updated_at).`,
        action: { label: "Mở Posts", to: "/posts?tab=processing" },
      });
    }

    if (checks.length === 0) {
      checks.push({
        id: "ok",
        tone: "good",
        title: "Hệ thống ổn",
        detail: "Không phát hiện vấn đề rõ ràng từ dữ liệu hiện có.",
        action: { label: "Reload", to: null },
      });
    }

    const priority = (t) => (t === "bad" ? 0 : t === "warn" ? 1 : t === "good" ? 2 : 3);
    return checks.sort((a, b) => priority(a.tone) - priority(b.tone));
  }, [accountsSummary, proGate.count, postBuckets.processing]);

  const activityFeed = useMemo(() => {
    const list = postBuckets.all.slice().sort((a, b) => (b._updated || 0) - (a._updated || 0));

    return list.slice(0, 10).map((p) => {
      const status = p._status || "unknown";
      const when = p.updated_at || p.created_at || p.scheduled_time;
      const title = safeStr(p?.account_name || p?.provider || "Post");
      const content = safeStr(p?.content, "");
      const short1 = content.length > 56 ? `${content.slice(0, 56)}…` : content;

      let tone = "neutral";
      let label = "Update";
      if (status === "posted") {
        tone = "good";
        label = "Posted";
      } else if (status === "scheduled") {
        tone = "neutral";
        label = "Scheduled";
      } else if (status === "processing") {
        tone = "warn";
        label = "Processing";
      } else if (["failed", "cancelled", "canceled", "error"].includes(status)) {
        tone = "bad";
        label = "Failed";
      }

      const err = safeStr(p?.error_message || p?.last_error, "");
      return {
        id: p?.id || `${title}-${when}`,
        tone,
        label,
        when: fmtDateTime(when),
        whenRel: fromNow(when),
        title,
        detail: short1 || (err ? err : ""),
        err: err || "",
      };
    });
  }, [postBuckets.all]);

  const postingTimeline = useMemo(() => {
    const next = postBuckets.next;
    const last = postBuckets.last;
    const worst = postBuckets.worst;

    return {
      next: next
        ? { when: fmtDateTime(next.scheduled_time), whenRel: fromNow(next.scheduled_time), title: safeStr(next.account_name || "Facebook"), content: safeStr(next.content, "") }
        : null,
      last: last
        ? { when: fmtDateTime(last.updated_at || last.scheduled_time), whenRel: fromNow(last.updated_at || last.scheduled_time), title: safeStr(last.account_name || "Facebook"), content: safeStr(last.content, ""), link: safeStr(last.permalink_url, "") }
        : null,
      failed: worst
        ? { when: fmtDateTime(worst.updated_at || worst.scheduled_time), whenRel: fromNow(worst.updated_at || worst.scheduled_time), title: safeStr(worst.account_name || "Facebook"), content: safeStr(worst.content, ""), error: safeStr(worst.error_message || worst.last_error, "Có lỗi nhưng không có message") }
        : null,
    };
  }, [postBuckets.next, postBuckets.last, postBuckets.worst]);

  const nextBestAction = useMemo(() => {
    if (accountsSummary.facebookTotal === 0) {
      return {
        title: "Kết nối kênh để bắt đầu",
        desc: "Kết nối Facebook Page để có thể lên lịch đăng bài.",
        cta: { label: "Kết nối Channels", to: "/social" },
        secondary: [{ label: "Bảng giá", to: "/pricing" }],
      };
    }

    if (proGate.count > 0) {
      return {
        title: "Gỡ chặn PRO để chạy tự động",
        desc: "Có scheduled_posts bị chặn do gói PRO.",
        cta: { label: "Mở Bảng giá", to: "/pricing" },
        secondary: [{ label: "Posts lỗi", to: "/posts?tab=failed" }],
      };
    }

    if (weekProgress.planned < Math.max(1, Math.min(targetPerWeek, 5))) {
      return {
        title: "Bổ sung kế hoạch tuần này",
        desc: `Tuần này đang có ${weekProgress.planned} bài planned. Target/wk: ${targetPerWeek}.`,
        cta: { label: "Tạo 7 ngày", to: "/planner" },
        secondary: [{ label: "Posts", to: "/posts?tab=scheduled" }],
      };
    }

    if (postBuckets.failed.length > 0) {
      return {
        title: "Xử lý post lỗi để tăng tỷ lệ đăng",
        desc: `Có ${postBuckets.failed.length} post failed/cancelled.`,
        cta: { label: "Mở Posts lỗi", to: "/posts?tab=failed" },
        secondary: [{ label: "Channels", to: "/social" }],
      };
    }

    return {
      title: "Theo dõi và vận hành",
      desc: "Kiểm tra lịch đăng, trạng thái token và hoạt động gần nhất.",
      cta: { label: "Mở Posts", to: "/posts?tab=scheduled" },
      secondary: [{ label: "AI Studio", to: "/ai-studio" }],
    };
  }, [accountsSummary.facebookTotal, proGate.count, weekProgress.planned, targetPerWeek, postBuckets.failed.length]);

  if (!activeShop) {
    return (
      <Shell>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Card className="w-full max-w-md p-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800/70 bg-slate-950/50 text-slate-200">
              <Icon name="spark" className="h-6 w-6" />
            </div>
            <div className="text-lg font-semibold text-slate-100">Chưa chọn shop</div>
            <div className="mt-2 text-sm text-slate-400">
              Dashboard hiển thị theo shop. Vào trang <span className="font-semibold text-slate-200">Shop</span> để chọn shop.
            </div>
            <div className="mt-4">
              <Btn tone="primary" onClick={() => navigate("/shops")}>
                Mở Shop
              </Btn>
            </div>
          </Card>
        </div>
      </Shell>
    );
  }

  const subtitle = useMemo(() => {
    const ch = totals?.channels ?? totals?.connected_channels ?? accountsSummary.total;
    const postsCount = totals?.posts ?? 0;
    const customers = totals?.customers ?? 0;
    const scheduled = totals?.scheduled_posts ?? postBuckets.scheduled.length;
    return `Channels: ${fmtInt(ch)} • Posts: ${fmtInt(postsCount)} • Scheduled: ${fmtInt(scheduled)} • Customers: ${fmtInt(customers)}`;
  }, [totals, accountsSummary.total, postBuckets.scheduled.length]);

  const planBadgeTone = plan === "PRO" ? "good" : "neutral";
  const aiBadgeTone =
    limits?.ai_requests_today_limit !== undefined && totals?.ai_requests_today !== undefined
      ? Number(totals.ai_requests_today) >= Number(limits.ai_requests_today_limit)
        ? "warn"
        : "neutral"
      : "neutral";

  const weekTone = weekProgress.planned >= targetPerWeek ? "good" : weekProgress.planned === 0 ? "warn" : "neutral";

  const healthTop = showAllHealth ? healthChecks : healthChecks.slice(0, 3);
  const hasAttention = healthChecks.some((c) => c.tone === "bad" || c.tone === "warn");

  const aiPoints = useMemo(() => {
    const arr = Array.isArray(aiUsage) ? aiUsage : [];
    return arr.slice(-14).map((x) => ({ key: x?.date, value: Number(x?.total_requests ?? 0) }));
  }, [aiUsage]);

  const contentPoints = useMemo(() => {
    const arr = Array.isArray(contentStats) ? contentStats : [];
    return arr.slice(-14).map((x) => ({ key: x?.date, value: Number(x?.posts ?? 0) }));
  }, [contentStats]);

  return (
    <Shell>
      {/* HERO */}
      <div className="relative overflow-hidden rounded-[32px] border border-slate-800/70 bg-slate-950/55 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_10%,rgba(99,102,241,0.35),transparent_55%),radial-gradient(50%_70%_at_80%_20%,rgba(34,211,238,0.25),transparent_60%),radial-gradient(40%_60%_at_60%_90%,rgba(217,70,239,0.18),transparent_60%)]" />
        <div className="relative p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-300/70">
                <Icon name="spark" className="h-4 w-4" />
                Dashboard
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="text-2xl font-semibold text-slate-100">{activeShop.name}</div>
                <Badge tone={planBadgeTone}>Plan: {safeStr(plan, "—")}</Badge>
                <Badge tone="neutral">Target/wk: {fmtInt(targetPerWeek)}</Badge>
                {limits?.ai_requests_today_limit !== undefined && totals?.ai_requests_today !== undefined ? (
                  <Badge tone={aiBadgeTone}>
                    AI hôm nay: {fmtInt(totals.ai_requests_today)}/{fmtInt(limits.ai_requests_today_limit)}
                  </Badge>
                ) : null}
                {loading ? <Badge tone="neutral">Loading…</Badge> : null}
              </div>

              <div className="mt-2 text-sm text-slate-300/80">{subtitle}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Btn tone="ghost" onClick={() => setRefreshTick((x) => x + 1)} disabled={loading} className="inline-flex items-center gap-2">
                <Icon name="refresh" className="h-4 w-4" />
                Refresh
              </Btn>
              <Btn tone="ghost" onClick={() => navigate("/pricing")}>
                Bảng giá
              </Btn>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Next best action</div>
                <div className="mt-1 text-base font-semibold text-slate-100">{nextBestAction.title}</div>
                <div className="mt-1 text-sm text-slate-300/80">{nextBestAction.desc}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Btn tone="primary" onClick={() => navigate(nextBestAction.cta.to)} className="min-w-[150px]">
                  {nextBestAction.cta.label}
                </Btn>
                {nextBestAction.secondary?.map((b) => (
                  <Btn key={b.to} tone="ghost" onClick={() => navigate(b.to)}>
                    {b.label}
                  </Btn>
                ))}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4">
              <div className="rounded-3xl border border-rose-500/25 bg-rose-500/5 p-4 text-sm text-rose-200">{error}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* STATS */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Posts" value={fmtInt(totals?.posts ?? 0)} hint="Tổng bài" iconName="post" tone="primary" />
        <StatCard label="Scheduled" value={fmtInt(totals?.scheduled_posts ?? 0)} hint="Đã lên lịch" iconName="calendar" tone="primary" />
        <StatCard label="Channels" value={fmtInt(totals?.channels ?? 0)} hint="Theo shop" iconName="link" tone="primary" />
        <StatCard label="Planner" value={fmtInt(totals?.planner_items ?? 0)} hint="Nội dung" iconName="calendar" />
        <StatCard label="Customers" value={fmtInt(totals?.customers ?? 0)} hint="CRM" iconName="users" />
        <StatCard label="AI today" value={fmtInt(totals?.ai_requests_today ?? 0)} hint="Yêu cầu" iconName="bot" />
      </div>

      {/* Insights (ai-usage + content-stats) */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">AI usage (14 ngày)</div>
              <div className="mt-1 text-xs text-slate-400">Nguồn: /dashboard/ai-usage</div>
            </div>
            <Badge tone="neutral">{fmtInt(aiPoints.reduce((s, p) => s + (Number(p.value) || 0), 0))} req</Badge>
          </div>
          <div className="mt-3">
            {aiPoints.length ? <MiniBars points={aiPoints} /> : <div className="text-sm text-slate-400">Chưa có dữ liệu.</div>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">Posts created (14 ngày)</div>
              <div className="mt-1 text-xs text-slate-400">Nguồn: /dashboard/content-stats</div>
            </div>
            <Badge tone="neutral">{fmtInt(contentPoints.reduce((s, p) => s + (Number(p.value) || 0), 0))} posts</Badge>
          </div>
          <div className="mt-3">
            {contentPoints.length ? <MiniBars points={contentPoints} /> : <div className="text-sm text-slate-400">Chưa có dữ liệu.</div>}
          </div>
        </Card>
      </div>

      {/* MAIN GRID */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Timeline (2 cols) */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">Posting flow</div>
              <div className="mt-1 text-xs text-slate-400">Next → Last → Failed (từ scheduled_posts)</div>
            </div>
            <div className="flex items-center gap-2">
              <Btn tone="ghost" onClick={() => navigate("/posts?tab=scheduled")}>
                Mở Posts
              </Btn>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Next */}
            <div className="relative">
              <div className="absolute -right-6 top-1/2 hidden -translate-y-1/2 md:block">
                <Icon name="arrow" className="h-5 w-5 text-slate-700/70" />
              </div>
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">Next</div>
                  <Badge tone={postingTimeline.next ? "neutral" : "warn"}>{postingTimeline.next ? "Scheduled" : "—"}</Badge>
                </div>
                {postingTimeline.next ? (
                  <>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-slate-100">{postingTimeline.next.title}</div>
                      <div className="shrink-0 text-[11px] text-slate-400">{postingTimeline.next.whenRel}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{postingTimeline.next.when}</div>
                    <div className="mt-2 line-clamp-2 text-xs text-slate-300/80">{postingTimeline.next.content || "—"}</div>
                  </>
                ) : (
                  <div className="mt-3 text-sm text-slate-400">Chưa có bài sắp tới.</div>
                )}
              </div>
            </div>

            {/* Last */}
            <div className="relative">
              <div className="absolute -right-6 top-1/2 hidden -translate-y-1/2 md:block">
                <Icon name="arrow" className="h-5 w-5 text-slate-700/70" />
              </div>
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">Last</div>
                  <Badge tone={postingTimeline.last ? "good" : "neutral"}>{postingTimeline.last ? "Posted" : "—"}</Badge>
                </div>
                {postingTimeline.last ? (
                  <>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-slate-100">{postingTimeline.last.title}</div>
                      <div className="shrink-0 text-[11px] text-slate-400">{postingTimeline.last.whenRel}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{postingTimeline.last.when}</div>
                    <div className="mt-2 line-clamp-2 text-xs text-slate-300/80">{postingTimeline.last.content || "—"}</div>
                    {postingTimeline.last.link && postingTimeline.last.link !== "—" ? (
                      <div className="mt-2">
                        <a href={postingTimeline.last.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-cyan-300 hover:text-cyan-200">
                          <Icon name="external" className="h-4 w-4" />
                          permalink
                        </a>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-3 text-sm text-slate-400">Chưa có bài đã đăng.</div>
                )}
              </div>
            </div>

            {/* Failed */}
            <div className="rounded-3xl border border-rose-500/25 bg-rose-500/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-300/80">Failed</div>
                <Badge tone={postingTimeline.failed ? "bad" : "neutral"}>{postingTimeline.failed ? "Issue" : "—"}</Badge>
              </div>
              {postingTimeline.failed ? (
                <>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-slate-100">{postingTimeline.failed.title}</div>
                    <div className="shrink-0 text-[11px] text-slate-400">{postingTimeline.failed.whenRel}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{postingTimeline.failed.when}</div>
                  <div className="mt-2 line-clamp-1 text-xs text-slate-300/80">{postingTimeline.failed.content || "—"}</div>
                  <div className="mt-2 line-clamp-3 text-xs text-rose-200">{postingTimeline.failed.error}</div>
                </>
              ) : (
                <div className="mt-3 text-sm text-slate-400">Không có lỗi gần đây.</div>
              )}
            </div>
          </div>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          {/* Weekly */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">Weekly progress</div>
                <div className="mt-1 text-xs text-slate-400">Theo target_posts_per_week (shop preferences)</div>
              </div>
              <Badge tone={weekTone}>{fmtInt(weekProgress.planned)} planned</Badge>
            </div>

            <div className="mt-4">
              <ProgressBar
                value={Math.min(weekProgress.planned, targetPerWeek)}
                max={targetPerWeek}
                tone={weekTone}
                labelLeft={`${fmtInt(weekProgress.posted)} posted • ${fmtInt(weekProgress.failed)} failed`}
                labelRight={`${fmtDateTime(weekProgress.start.toISOString())} → ${fmtDateTime(new Date(weekProgress.end.getTime() - 1).toISOString())}`}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Btn tone="ghost" onClick={() => navigate("/planner")}>
                Mở Planner
              </Btn>
              <Btn tone="ghost" onClick={() => navigate("/posts?tab=scheduled")}>
                Mở Posts
              </Btn>
              <Btn tone="ghost" onClick={() => navigate("/ai-studio")}>
                AI Studio
              </Btn>
            </div>
          </Card>

          {/* Health */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">Health</div>
                <div className="mt-1 text-xs text-slate-400">Token / PRO / Processing</div>
              </div>
              <Badge tone={hasAttention ? "warn" : "good"}>{hasAttention ? "Attention" : "OK"}</Badge>
            </div>

            <div className="mt-4 space-y-2">
              {healthTop.map((c) => (
                <div
                  key={c.id}
                  className={classNames(
                    "rounded-2xl border p-3",
                    c.tone === "good"
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : c.tone === "bad"
                      ? "border-rose-500/20 bg-rose-500/5"
                      : c.tone === "warn"
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-slate-800/70 bg-slate-950/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-100">{c.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-300/80">{c.detail}</div>
                    </div>
                    {c.action?.to ? (
                      <Btn tone="ghost" onClick={() => navigate(c.action.to)} className="px-3 py-1.5 text-xs">
                        {c.action.label}
                      </Btn>
                    ) : (
                      <Btn tone="ghost" onClick={() => setRefreshTick((x) => x + 1)} className="px-3 py-1.5 text-xs">
                        Reload
                      </Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {healthChecks.length > 3 ? (
              <div className="mt-3">
                <button onClick={() => setShowAllHealth((v) => !v)} className="text-xs text-slate-300/70 hover:text-slate-200 underline">
                  {showAllHealth ? "Thu gọn" : `Xem thêm (${healthChecks.length - 3})`}
                </button>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      {/* Activity */}
      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-100">Activity</div>
            <div className="mt-1 text-xs text-slate-400">Gần nhất theo scheduled_posts.updated_at</div>
          </div>
          <Btn tone="ghost" onClick={() => navigate("/posts?tab=scheduled")}>
            Xem tất cả
          </Btn>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/20">
          {activityFeed.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">Chưa có activity.</div>
          ) : (
            activityFeed.map((row, idx) => (
              <div key={row.id} className={classNames("p-4", idx ? "border-t border-slate-800/70" : "")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={row.tone}>{row.label}</Badge>
                      <div className="truncate text-sm font-medium text-slate-100">{row.title}</div>
                      <div className="shrink-0 text-xs text-slate-400">{row.when}</div>
                      {row.whenRel ? <div className="shrink-0 text-[11px] text-slate-500">({row.whenRel})</div> : null}
                    </div>
                    {row.detail ? <div className="mt-1 line-clamp-1 text-xs text-slate-300/80">{row.detail}</div> : null}
                    {row.tone === "bad" && row.err ? <div className="mt-1 line-clamp-2 text-xs text-rose-200">{row.err}</div> : null}
                  </div>
                  <div className="shrink-0">
                    <Btn tone="ghost" onClick={() => navigate("/posts")} className="px-3 py-1.5 text-xs">
                      Posts
                    </Btn>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Footer quick links */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn tone="ghost" onClick={() => navigate("/social")}>
          Channels
        </Btn>
        <Btn tone="ghost" onClick={() => navigate("/posts?tab=scheduled")}>
          Posts
        </Btn>
        <Btn tone="ghost" onClick={() => navigate("/planner")}>
          Planner
        </Btn>
        <Btn tone="ghost" onClick={() => navigate("/customers")}>
          Customers
        </Btn>
        <Btn tone="ghost" onClick={() => navigate("/ai-studio")}>
          AI Studio
        </Btn>
      </div>
    </Shell>
  );
}
