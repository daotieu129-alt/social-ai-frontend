// src/modules/planner/PlannerPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import { useLocation, useNavigate } from "react-router-dom";

/* =========================================================
  Utils (no external deps)
========================================================= */
function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}
function safeArray(x) {
  return Array.isArray(x) ? x : [];
}
function toISO(d) {
  try {
    return new Date(d).toISOString();
  } catch {
    return null;
  }
}
function toLocalDatetimeValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayKey(d) {
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
function formatDayLabel(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
function formatTimeHM(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatHumanDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDayLabel(d)} ${formatTimeHM(iso)}`;
}
function humanizeAgo(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 30) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "idea") return "Idea";
  if (s === "draft") return "Draft";
  if (s === "scheduled") return "Scheduled";
  if (s === "posted") return "Posted";
  return "Draft";
}
function normalizePlatform(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "facebook";
  if (["facebook", "fb"].includes(s)) return "facebook";
  if (["instagram", "ig"].includes(s)) return "instagram";
  if (["tiktok", "tt"].includes(s)) return "tiktok";
  if (["youtube", "yt"].includes(s)) return "youtube";
  if (["zalo"].includes(s)) return "zalo";
  if (["threads"].includes(s)) return "threads";
  if (["x", "twitter"].includes(s)) return "x";
  return s;
}
function extractPlannerItems(resData) {
  const d = resData;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.items)) return d.data.items;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.data?.data?.items)) return d.data.data.items;
  if (Array.isArray(d?.data?.planner)) return d.data.planner;
  if (Array.isArray(d?.data?.rows)) return d.data.rows;
  return [];
}
function extractOneItem(resData) {
  const d = resData;
  if (d?.updated) return d.updated;
  if (d?.data?.updated) return d.data.updated;
  if (d?.data?.item) return d.data.item;
  if (d?.item) return d.item;
  if (d?.data && typeof d.data === "object" && !Array.isArray(d.data)) return d.data;
  if (d && typeof d === "object" && !Array.isArray(d)) return d;
  return null;
}

/* =========================================================
  Premium Dashboard-like UI primitives
========================================================= */
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

function Divider() {
  return <div className="h-px w-full bg-slate-800/70" />;
}

function Badge({ tone = "neutral", children, className }) {
  const t = {
    neutral: "border-slate-800 bg-slate-950/35 text-slate-200",
    ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    warn: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    bad: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    info: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    indigo: "border-violet-400/25 bg-violet-500/10 text-violet-100",
    violet: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100",
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

function Chip({ children, className, title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full border border-slate-800 bg-slate-950/25 px-2.5 py-1 text-[11px] font-medium text-slate-300",
        className
      )}
    >
      {children}
    </span>
  );
}

function SoftButton({ tone = "neutral", disabled, onClick, children, title, className }) {
  const tones = {
    neutral: "border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-900/45 hover:border-slate-700/80",
    indigo: "border-violet-400/22 bg-violet-500/10 text-violet-100 hover:bg-violet-500/14",
    cyan: "border-cyan-400/22 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/14",
    emerald: "border-emerald-400/22 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/14",
    rose: "border-rose-400/22 bg-rose-500/10 text-rose-100 hover:bg-rose-500/14",
    premium:
      "border-violet-400/22 bg-gradient-to-r from-violet-500/30 via-cyan-500/16 to-emerald-500/12 text-white hover:brightness-110 shadow-[0_0_0_1px_rgba(167,139,250,0.12)_inset,0_14px_40px_rgba(0,0,0,0.45)]",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-3 py-2 text-xs font-semibold transition",
        tones[tone] || tones.neutral,
        disabled && "cursor-not-allowed opacity-55 hover:bg-slate-950/30",
        className
      )}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, className, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none",
        "focus:border-violet-400/25 focus:ring-2 focus:ring-violet-500/10",
        className
      )}
    />
  );
}

function Textarea({ value, onChange, placeholder, className, rows = 6 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "w-full resize-none rounded-[22px] border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none",
        "focus:border-violet-400/25 focus:ring-2 focus:ring-violet-500/10",
        className
      )}
    />
  );
}

function Select({ value, onChange, options, className }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={cn(
        "w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none",
        "focus:border-violet-400/25 focus:ring-2 focus:ring-violet-500/10",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Drawer({ open, onClose, title, children, widthClass = "max-w-[820px]" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-full border-l border-slate-800/70 bg-gradient-to-b from-slate-950/92 to-slate-950/72 backdrop-blur",
          widthClass
        )}
      >
        <div className="relative">
          <Aura className="rounded-none" />
          <div className="relative flex items-center justify-between border-b border-slate-800/60 p-4">
            <div className="text-sm font-semibold text-slate-100">{title}</div>
            <SoftButton tone="neutral" onClick={onClose}>
              ✕
            </SoftButton>
          </div>
          <div className="relative p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast?.type) return null;
  const tone = toast.type === "ok" ? "ok" : toast.type === "warn" ? "warn" : toast.type === "bad" ? "bad" : "info";
  return (
    <div className="fixed right-5 top-5 z-50">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <Badge tone={tone}>{toast.type.toUpperCase()}</Badge>
          <div className="min-w-[260px]">
            <div className="text-sm font-semibold text-slate-100">{toast.title || "Thông báo"}</div>
            <div className="mt-1 text-xs text-slate-300/90">{toast.message}</div>
          </div>
          <SoftButton tone="neutral" onClick={onClose}>
            ✕
          </SoftButton>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
  Planner Visual Meta
========================================================= */
const STATUS_META = {
  Idea: { label: "Idea", tone: "info", dot: "🟦" },
  Draft: { label: "Draft", tone: "neutral", dot: "⬜" },
  Scheduled: { label: "Scheduled", tone: "indigo", dot: "🟪" },
  Posted: { label: "Posted", tone: "ok", dot: "🟩" },
};

const PLATFORM_META = {
  facebook: { label: "Facebook", chip: "border-sky-500/30 bg-sky-500/15 text-sky-200", icon: "📘" },
  instagram: { label: "Instagram", chip: "border-pink-500/30 bg-pink-500/15 text-pink-200", icon: "📸" },
  tiktok: { label: "TikTok", chip: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200", icon: "🎵" },
  youtube: { label: "YouTube", chip: "border-red-500/30 bg-red-500/15 text-red-200", icon: "▶️" },
  zalo: { label: "Zalo", chip: "border-sky-400/30 bg-sky-400/15 text-sky-200", icon: "💬" },
  threads: { label: "Threads", chip: "border-slate-400/30 bg-slate-400/10 text-slate-100", icon: "🧵" },
  x: { label: "X", chip: "border-slate-400/30 bg-slate-400/10 text-slate-100", icon: "𝕏" },
  unknown: { label: "Platform", chip: "border-slate-800/80 bg-slate-950/40 text-slate-200", icon: "🔗" },
};

function PlatformPill({ platform }) {
  const key = normalizePlatform(platform);
  const p = PLATFORM_META[key] || PLATFORM_META.unknown;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold", p.chip)}>
      <span>{p.icon}</span>
      <span>{p.label}</span>
    </span>
  );
}
function StatusPill({ status }) {
  const s = normalizeStatus(status);
  const meta = STATUS_META[s] || STATUS_META.Draft;
  return <Badge tone={meta.tone}>{meta.dot} {meta.label}</Badge>;
}

function SectionShell({ title, subtitle, right, children }) {
  return (
    <GlassCard className="p-0">
      <div className="px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-100">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-slate-400">{subtitle}</div> : null}
          </div>
          {right ? <div className="flex items-center gap-2">{right}</div> : null}
        </div>
      </div>
      <Divider />
      <div className="px-5 py-5">{children}</div>
    </GlassCard>
  );
}

function HeatDot({ level, title }) {
  const bg =
    level <= 0
      ? "bg-slate-800/60"
      : level === 1
      ? "bg-violet-500/16 border border-violet-400/18"
      : level === 2
      ? "bg-violet-500/22 border border-violet-400/22"
      : level === 3
      ? "bg-cyan-500/22 border border-cyan-400/22"
      : "bg-emerald-500/18 border border-emerald-400/20";
  return <div title={title} className={cn("h-6 w-6 rounded-xl", bg)} />;
}

function PlannerItemCard({ item, onOpen, onQuickStatus, onDelete, busy, selected, onToggleSelect }) {
  const platform = normalizePlatform(item?.platform);
  const sKey = normalizeStatus(item?.status);
  const hasSchedule = !!item?.scheduled_at;
  const timeLabel = hasSchedule ? formatTimeHM(item.scheduled_at) : "—";
  const updatedAgo = humanizeAgo(item?.updated_at || item?.created_at);
  const channelId = item?.channel_id ?? null;

  const isBad = sKey !== "Posted" && !hasSchedule; // visual hint only

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[26px] border p-4 transition",
        "bg-slate-950/22 border-slate-800 hover:bg-slate-950/30 hover:border-slate-700/80",
        selected && "border-violet-400/30 shadow-[0_0_0_1px_rgba(167,139,250,0.12)_inset,0_16px_60px_rgba(0,0,0,0.55)]",
        isBad && "bg-rose-500/04 border-rose-500/18"
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute -left-28 top-0 h-full w-56 rotate-12 bg-gradient-to-r from-transparent via-white/6 to-transparent" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PlatformPill platform={platform} />
              <StatusPill status={sKey} />
              {channelId ? <Chip>Channel #{channelId}</Chip> : <Badge tone="warn">No channel</Badge>}
              {hasSchedule ? <Chip>⏰ {timeLabel}</Chip> : <Badge tone="warn">No schedule</Badge>}
              {busy ? <Badge tone="info">Saving…</Badge> : null}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleSelect}
                className={cn(
                  "h-5 w-5 rounded-lg border transition",
                  selected ? "border-violet-400/40 bg-violet-500/20" : "border-slate-700/80 bg-slate-950/35 hover:bg-slate-900/50"
                )}
                title="Select"
              />
              <div className="text-sm font-semibold text-slate-100 truncate">{item?.title || "Untitled"}</div>
            </div>

            <div className="mt-1 text-xs text-slate-400 line-clamp-2">{item?.idea || "—"}</div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>Updated: {updatedAgo}</span>
              <span className="opacity-60">•</span>
              <span>ID: {item?.id ?? "—"}</span>
              {hasSchedule ? (
                <>
                  <span className="opacity-60">•</span>
                  <span>{formatHumanDateTime(item.scheduled_at)}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SoftButton tone="neutral" disabled={busy} onClick={onOpen} title="Edit" className="rounded-full px-3">
              ✎
            </SoftButton>

            <div className="hidden md:flex items-center gap-1 rounded-full border border-slate-800/70 bg-slate-950/25 p-1">
              {["Idea", "Draft", "Scheduled", "Posted"].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => onQuickStatus(s)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-semibold rounded-full transition border",
                    normalizeStatus(item?.status) === s
                      ? "border-violet-400/25 bg-violet-500/12 text-violet-100"
                      : "border-transparent bg-transparent text-slate-200 hover:bg-slate-900/50 hover:border-slate-800/80",
                    busy && "cursor-not-allowed opacity-60"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <SoftButton tone="rose" disabled={busy} onClick={onDelete} title="Delete" className="rounded-full px-3">
              🗑
            </SoftButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
  Main Component
========================================================= */
export default function PlannerPage({ activeShop }) {
  const shopId = activeShop?.id ?? null;
  const shopLabel = useMemo(() => activeShop?.name || activeShop?.id || "Chưa chọn shop", [activeShop]);

  const location = useLocation();
  const navigate = useNavigate();

  // toast
  const [toast, setToast] = useState({ type: "", title: "", message: "" });
  const toastTimer = useRef(null);
  const pushToast = useCallback((type, message, title = "") => {
    setToast({ type, title, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ type: "", title: "", message: "" }), 2600);
  }, []);
  const clearToast = useCallback(() => {
    setToast({ type: "", title: "", message: "" });
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  // data
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  // filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | Idea | Draft | Scheduled | Posted
  const [platformFilter, setPlatformFilter] = useState("all");
  const [rangeMode, setRangeMode] = useState("7d"); // 7d | 14d | 30d
  const [selectedDayKey, setSelectedDayKey] = useState(""); // YYYY-MM-DD
  const [viewMode, setViewMode] = useState("list"); // list | week
  const [tab, setTab] = useState("day"); // day | inbox

  // selection (bulk)
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // drawer: edit
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [savingId, setSavingId] = useState(null);

  // drawer: create
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    idea: "",
    platform: "facebook",
    scheduled_at: "",
    status: "Draft",
    channel_id: "",
  });

  const rangeDays = useMemo(() => (rangeMode === "14d" ? 14 : rangeMode === "30d" ? 30 : 7), [rangeMode]);

  const dayList = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: rangeDays }, (_, i) => startOfDay(addDays(today, i)));
  }, [rangeDays]);

  // default selected day
  useEffect(() => {
    if (!selectedDayKey) setSelectedDayKey(dayKey(startOfDay(new Date())));
  }, [selectedDayKey]);

  // handle ?open=YYYY-MM-DD
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const open = params.get("open");
    if (open && /^\d{4}-\d{2}-\d{2}$/.test(open)) {
      setSelectedDayKey(open);
      params.delete("open");
      const next = params.toString();
      navigate({ pathname: location.pathname, search: next ? `?${next}` : "" }, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  const loadPlanner = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/planner", { params: { shop_id: shopId } });
      const list = extractPlannerItems(res?.data);
      const normalized = safeArray(list).map((x) => ({
        ...x,
        status: normalizeStatus(x?.status),
        platform: normalizePlatform(x?.platform),
      }));
      setItems(normalized);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (GET /planner thất bại).";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    loadPlanner();
  }, [shopId, loadPlanner]);

  // options
  const platformOptions = useMemo(
    () => [
      { value: "facebook", label: "Facebook" },
      { value: "instagram", label: "Instagram" },
      { value: "tiktok", label: "TikTok" },
      { value: "youtube", label: "YouTube" },
      { value: "zalo", label: "Zalo" },
      { value: "threads", label: "Threads" },
      { value: "x", label: "X" },
    ],
    []
  );
  const statusOptions = useMemo(
    () => [
      { value: "Idea", label: "Idea" },
      { value: "Draft", label: "Draft" },
      { value: "Scheduled", label: "Scheduled" },
      { value: "Posted", label: "Posted" },
    ],
    []
  );

  // normalized filters
  const q = useMemo(() => (query || "").trim().toLowerCase(), [query]);
  const withinRangeKeys = useMemo(() => new Set(dayList.map((d) => dayKey(d))), [dayList]);

  const baseFiltered = useMemo(() => {
    return safeArray(items)
      .filter((x) => {
        if (statusFilter !== "all" && normalizeStatus(x?.status) !== statusFilter) return false;
        if (platformFilter !== "all" && normalizePlatform(x?.platform) !== platformFilter) return false;
        if (!q) return true;
        const title = String(x?.title || "").toLowerCase();
        const idea = String(x?.idea || "").toLowerCase();
        const pid = String(x?.id || "").toLowerCase();
        return title.includes(q) || idea.includes(q) || pid.includes(q);
      })
      .map((x) => ({ ...x, status: normalizeStatus(x?.status), platform: normalizePlatform(x?.platform) }));
  }, [items, statusFilter, platformFilter, q]);

  // Inbox: items without scheduled_at
  const inboxItems = useMemo(() => {
    return baseFiltered
      .filter((x) => !x?.scheduled_at)
      .sort((a, b) => {
        const ta = new Date(a?.updated_at || a?.created_at || 0).getTime();
        const tb = new Date(b?.updated_at || b?.created_at || 0).getTime();
        return tb - ta;
      });
  }, [baseFiltered]);

  // Timeline items: scheduled_at in range
  const timelineItems = useMemo(() => {
    return baseFiltered
      .filter((x) => {
        const k = x?.scheduled_at ? dayKey(startOfDay(new Date(x.scheduled_at))) : "";
        return k && withinRangeKeys.has(k);
      })
      .sort((a, b) => {
        const ta = a?.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
        const tb = b?.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
        return ta - tb;
      });
  }, [baseFiltered, withinRangeKeys]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const d of dayList) map.set(dayKey(d), []);
    for (const it of timelineItems) {
      const k = it?.scheduled_at ? dayKey(startOfDay(new Date(it.scheduled_at))) : "";
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    return map;
  }, [timelineItems, dayList]);

  const selectedDayItems = useMemo(() => grouped.get(selectedDayKey) || [], [grouped, selectedDayKey]);

  // KPI
  const kpi = useMemo(() => {
    const todayK = dayKey(startOfDay(new Date()));
    const todayAll = (grouped.get(todayK) || []).length;
    const scheduledInRange = timelineItems.filter((x) => normalizeStatus(x?.status) === "Scheduled").length;
    const postedInRange = timelineItems.filter((x) => normalizeStatus(x?.status) === "Posted").length;
    const backlog = inboxItems.length;
    return { todayAll, scheduledInRange, postedInRange, backlog, total: baseFiltered.length };
  }, [grouped, timelineItems, inboxItems, baseFiltered]);

  // heatmap
  const heat = useMemo(() => {
    const out = [];
    for (const d of dayList) {
      const k = dayKey(d);
      const count = (grouped.get(k) || []).length;
      let level = 0;
      if (count === 0) level = 0;
      else if (count <= 1) level = 1;
      else if (count <= 3) level = 2;
      else if (count <= 6) level = 3;
      else level = 4;
      out.push({ k, count, level });
    }
    return out;
  }, [dayList, grouped]);

  // selection helpers
  const isSelected = useCallback((id) => selectedIds.has(String(id)), [selectedIds]);
  const toggleSelect = useCallback((id) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const selectAllVisible = useCallback((visibleItems) => {
    setSelectedIds(() => new Set(visibleItems.map((x) => String(x.id))));
  }, []);

  const selectedItems = useMemo(() => {
    const map = new Map(baseFiltered.map((x) => [String(x.id), x]));
    const arr = [];
    for (const id of selectedIds) {
      const it = map.get(String(id));
      if (it) arr.push(it);
    }
    return arr;
  }, [selectedIds, baseFiltered]);

  /* =========================================================
    CRUD
  ========================================================= */
  const openEdit = useCallback((item) => {
    setEditItem({
      ...item,
      status: normalizeStatus(item?.status),
      platform: normalizePlatform(item?.platform),
      scheduled_at: item?.scheduled_at || "",
      channel_id: item?.channel_id || "",
      title: item?.title || "",
      idea: item?.idea || "",
    });
    setEditOpen(true);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!shopId || !editItem?.id) return;
    const id = editItem.id;
    setSavingId(String(id));
    try {
      const payload = {
        title: editItem.title,
        idea: editItem.idea,
        platform: normalizePlatform(editItem.platform),
        status: normalizeStatus(editItem.status),
        scheduled_at: editItem.scheduled_at ? (toISO(editItem.scheduled_at) || editItem.scheduled_at) : null,
        channel_id: editItem.channel_id ? Number(editItem.channel_id) : null,
        shop_id: shopId,
      };
      const res = await api.patch(`/planner/${id}`, payload);
      const updated = extractOneItem(res?.data);

      setItems((prev) =>
        safeArray(prev).map((x) => {
          if (String(x?.id) !== String(id)) return x;
          const next = updated && typeof updated === "object" ? { ...x, ...updated } : { ...x, ...payload };
          return { ...next, status: normalizeStatus(next?.status), platform: normalizePlatform(next?.platform) };
        })
      );

      setEditOpen(false);
      pushToast("ok", "Đã cập nhật kế hoạch");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (PATCH /planner/:id thất bại).";
      pushToast("bad", msg);
    } finally {
      setSavingId(null);
    }
  }, [shopId, editItem, pushToast]);

  const quickStatus = useCallback(
    async (item, nextStatus) => {
      if (!shopId || !item?.id) return;
      const id = item.id;
      setSavingId(String(id));
      try {
        const payload = { status: normalizeStatus(nextStatus), shop_id: shopId };
        const res = await api.patch(`/planner/${id}`, payload);
        const updated = extractOneItem(res?.data);

        setItems((prev) =>
          safeArray(prev).map((x) => {
            if (String(x?.id) !== String(id)) return x;
            const next = updated && typeof updated === "object" ? { ...x, ...updated } : { ...x, ...payload };
            return { ...next, status: normalizeStatus(next?.status), platform: normalizePlatform(next?.platform) };
          })
        );
        pushToast("ok", "Đã cập nhật trạng thái");
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (PATCH status thất bại).";
        pushToast("bad", msg);
      } finally {
        setSavingId(null);
      }
    },
    [shopId, pushToast]
  );

  const deleteItem = useCallback(
    async (item) => {
      if (!shopId || !item?.id) return;
      const id = item.id;
      const ok = window.confirm(`Xoá item #${id}?`);
      if (!ok) return;

      setSavingId(String(id));
      try {
        await api.delete(`/planner/${id}`, { params: { shop_id: shopId } });
        setItems((prev) => safeArray(prev).filter((x) => String(x?.id) !== String(id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(id));
          return next;
        });
        pushToast("ok", "Đã xoá kế hoạch");
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (DELETE thất bại).";
        pushToast("bad", msg);
      } finally {
        setSavingId(null);
      }
    },
    [shopId, pushToast]
  );

  const openCreate = useCallback(() => {
    const t = new Date();
    t.setMinutes(t.getMinutes() + 10);
    setCreateForm({
      title: "",
      idea: "",
      platform: "facebook",
      scheduled_at: toLocalDatetimeValue(t.toISOString()),
      status: "Draft",
      channel_id: "",
    });
    setCreateOpen(true);
  }, []);

  const createItem = useCallback(async () => {
    if (!shopId) return;
    if (!createForm.title.trim()) return pushToast("warn", "Thiếu title");
    if (!createForm.platform) return pushToast("warn", "Thiếu platform");
    if (!createForm.scheduled_at) return pushToast("warn", "Thiếu scheduled_at");

    setCreating(true);
    try {
      const payload = {
        shop_id: shopId,
        channel_id: createForm.channel_id ? Number(createForm.channel_id) : null,
        title: createForm.title.trim(),
        idea: createForm.idea || "",
        platform: normalizePlatform(createForm.platform),
        status: normalizeStatus(createForm.status),
        scheduled_at: toISO(createForm.scheduled_at) || createForm.scheduled_at,
      };

      const res = await api.post("/planner", payload);
      const created = extractOneItem(res?.data);
      const row = created && typeof created === "object" ? created : { ...payload, id: res?.data?.id || `tmp_${Date.now()}` };
      const normalized = { ...row, status: normalizeStatus(row?.status), platform: normalizePlatform(row?.platform) };

      setItems((prev) => [...safeArray(prev), normalized]);
      setCreateOpen(false);
      pushToast("ok", "Đã tạo kế hoạch");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (POST /planner thất bại).";
      pushToast("bad", msg);
    } finally {
      setCreating(false);
    }
  }, [shopId, createForm, pushToast]);

  // seed demo
  const [seeding, setSeeding] = useState(false);
  const seedDemo = useCallback(async () => {
    if (!shopId) return;
    setSeeding(true);
    try {
      const base = startOfDay(new Date());
      const mk = (title, status, minutes) => ({
        shop_id: shopId,
        title,
        idea: "Mẫu demo để bạn thấy flow Planner (có thể xoá).",
        platform: "facebook",
        status,
        scheduled_at: new Date(base.getTime() + minutes * 60 * 1000).toISOString(),
      });
      const rows = [mk("Demo — Idea", "Idea", 10), mk("Demo — Draft", "Draft", 30), mk("Demo — Scheduled", "Scheduled", 60)];
      for (const r of rows) await api.post("/planner", r);
      await loadPlanner();
      pushToast("ok", "Đã tạo mẫu demo");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (seed demo thất bại).";
      pushToast("bad", msg);
    } finally {
      setSeeding(false);
    }
  }, [shopId, loadPlanner, pushToast]);

  /* =========================================================
    Bulk actions
  ========================================================= */
  const [bulkBusy, setBulkBusy] = useState(false);

  const bulkPatch = useCallback(
    async (ids, patch) => {
      if (!shopId) return;
      if (!ids.length) return;
      setBulkBusy(true);
      try {
        for (const id of ids) {
          await api.patch(`/planner/${id}`, { ...patch, shop_id: shopId });
        }
        await loadPlanner();
        pushToast("ok", "Đã áp dụng bulk action");
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (bulk patch thất bại).";
        pushToast("bad", msg);
      } finally {
        setBulkBusy(false);
      }
    },
    [shopId, loadPlanner, pushToast]
  );

  const bulkIdeaToDraft = useCallback(async () => {
    const ids = selectedItems.filter((x) => normalizeStatus(x.status) === "Idea").map((x) => x.id);
    await bulkPatch(ids, { status: "Draft" });
  }, [selectedItems, bulkPatch]);

  const bulkSetTime = useCallback(
    async (hhmm) => {
      const ids = selectedItems.filter((x) => !!x.scheduled_at).map((x) => x.id);
      if (!ids.length) return;
      const [hh, mm] = String(hhmm || "20:00").split(":").map((n) => Number(n));
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;

      setBulkBusy(true);
      try {
        for (const it of selectedItems) {
          if (!it?.scheduled_at) continue;
          const d = new Date(it.scheduled_at);
          if (Number.isNaN(d.getTime())) continue;
          d.setHours(hh, mm, 0, 0);
          await api.patch(`/planner/${it.id}`, { scheduled_at: d.toISOString(), shop_id: shopId });
        }
        await loadPlanner();
        pushToast("ok", `Đã set giờ ${hhmm} cho selected`);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (bulk set time thất bại).";
        pushToast("bad", msg);
      } finally {
        setBulkBusy(false);
      }
    },
    [selectedItems, shopId, loadPlanner, pushToast]
  );

  const bulkCopy = useCallback(() => {
    const lines = selectedItems.map((x) => {
      const p = normalizePlatform(x.platform);
      const s = normalizeStatus(x.status);
      const t = x.scheduled_at ? formatHumanDateTime(x.scheduled_at) : "No schedule";
      return `• [${p}] [${s}] ${t}\n${x.title || "Untitled"}\n${x.idea || ""}\n`;
    });
    const text = lines.join("\n");
    navigator.clipboard?.writeText(text);
    pushToast("ok", "Đã copy selected");
  }, [selectedItems, pushToast]);

  /* =========================================================
    Derived view
  ========================================================= */
  const visibleRightItems = useMemo(() => {
    if (tab === "inbox") return inboxItems;
    return selectedDayItems;
  }, [tab, inboxItems, selectedDayItems]);

  const weekColumns = useMemo(() => {
    const days = dayList.slice(0, 7);
    return days.map((d) => {
      const k = dayKey(d);
      return { d, k, items: grouped.get(k) || [] };
    });
  }, [dayList, grouped]);

  /* =========================================================
    Render
  ========================================================= */
  return (
    <div className="space-y-4">
      <Toast toast={toast} onClose={clearToast} />

      {/* Sticky Header (Dashboard-like) */}
      <div className="sticky top-0 z-40 -mx-2 px-2 pt-2">
        <GlassCard className="p-0">
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="indigo">🗓 Planner</Badge>
                <Badge tone="neutral">🏪 {shopLabel}</Badge>
                <Badge tone="info">Range {rangeDays}d</Badge>
                <Chip>Selected {selectedDayKey}</Chip>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SoftButton tone="premium" disabled={!shopId} onClick={openCreate} className="rounded-full px-5">
                  ＋ Thêm thủ công
                </SoftButton>
                <SoftButton tone="neutral" disabled={!shopId || loading} onClick={loadPlanner} className="rounded-full px-4">
                  ⟳ Reload
                </SoftButton>

                <div className="inline-flex items-center gap-1 rounded-full border border-slate-800/70 bg-slate-950/25 p-1">
                  {[{ v: "7d", t: "7d" }, { v: "14d", t: "14d" }, { v: "30d", t: "30d" }].map((x) => (
                    <button
                      key={x.v}
                      type="button"
                      onClick={() => setRangeMode(x.v)}
                      className={cn(
                        "px-3 py-1.5 text-[11px] font-semibold rounded-full transition border",
                        rangeMode === x.v
                          ? "border-violet-400/25 bg-violet-500/12 text-violet-100"
                          : "border-transparent bg-transparent text-slate-200 hover:bg-slate-900/50 hover:border-slate-800/80"
                      )}
                    >
                      {x.t}
                    </button>
                  ))}
                </div>

                <div className="inline-flex items-center gap-1 rounded-full border border-slate-800/70 bg-slate-950/25 p-1">
                  {[{ v: "list", t: "List" }, { v: "week", t: "Week" }].map((x) => (
                    <button
                      key={x.v}
                      type="button"
                      onClick={() => setViewMode(x.v)}
                      className={cn(
                        "px-3 py-1.5 text-[11px] font-semibold rounded-full transition border",
                        viewMode === x.v
                          ? "border-cyan-400/22 bg-cyan-500/12 text-cyan-100"
                          : "border-transparent bg-transparent text-slate-200 hover:bg-slate-900/50 hover:border-slate-800/80"
                      )}
                    >
                      {x.t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI row */}
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-3">
                <div className="text-[11px] text-slate-400">Hôm nay</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-lg font-semibold text-slate-100">{kpi.todayAll}</div>
                  <Badge tone="neutral">items</Badge>
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-3">
                <div className="text-[11px] text-slate-400">Trong range</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-lg font-semibold text-slate-100">{kpi.scheduledInRange}</div>
                  <Badge tone="indigo">Scheduled</Badge>
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-3">
                <div className="text-[11px] text-slate-400">Đã đăng</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-lg font-semibold text-slate-100">{kpi.postedInRange}</div>
                  <Badge tone="ok">Posted</Badge>
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-3">
                <div className="text-[11px] text-slate-400">Backlog</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-lg font-semibold text-slate-100">{kpi.backlog}</div>
                  <Badge tone="warn">Inbox</Badge>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="w-[280px]">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title / idea / id…" />
              </div>

              <div className="w-[160px]">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[{ value: "all", label: "All status" }, ...statusOptions]}
                />
              </div>

              <div className="w-[180px]">
                <Select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  options={[{ value: "all", label: "All platforms" }, ...platformOptions]}
                />
              </div>

              <div className="flex-1" />

              <SoftButton
                tone="neutral"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setPlatformFilter("all");
                  setSelectedDayKey(dayKey(startOfDay(new Date())));
                  setTab("day");
                  clearSelection();
                }}
                className="rounded-full px-4"
              >
                Reset
              </SoftButton>
            </div>

            {/* Tabs */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-800/70 bg-slate-950/25 p-1">
                {[{ v: "day", t: `Day (${selectedDayItems.length})` }, { v: "inbox", t: `Inbox (${inboxItems.length})` }].map((x) => (
                  <button
                    key={x.v}
                    type="button"
                    onClick={() => {
                      setTab(x.v);
                      clearSelection();
                    }}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-semibold rounded-full transition border",
                      tab === x.v
                        ? "border-fuchsia-400/22 bg-fuchsia-500/12 text-fuchsia-100"
                        : "border-transparent bg-transparent text-slate-200 hover:bg-slate-900/50 hover:border-slate-800/80"
                    )}
                  >
                    {x.t}
                  </button>
                ))}
              </div>

              <Badge tone={error ? "bad" : loading ? "info" : "ok"}>{error ? "Error" : loading ? "Loading" : "Ready"}</Badge>
              {bulkBusy ? <Badge tone="info">Bulk…</Badge> : null}
              {selectedIds.size ? <Badge tone="info">Selected: {selectedIds.size}</Badge> : null}

              <div className="flex-1" />

              <SoftButton tone="neutral" disabled={!shopId || loading} onClick={loadPlanner} className="rounded-full px-4">
                ⟳ Reload
              </SoftButton>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 ? (
        <GlassCard className="p-0">
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Bulk actions</Badge>
              <SoftButton tone="indigo" disabled={bulkBusy} onClick={bulkIdeaToDraft} title="Idea → Draft" className="rounded-full px-4">
                Idea → Draft
              </SoftButton>
              <SoftButton tone="cyan" disabled={bulkBusy} onClick={() => bulkSetTime("20:00")} title="Set time 20:00" className="rounded-full px-4">
                Set 20:00
              </SoftButton>
              <SoftButton tone="neutral" disabled={bulkBusy} onClick={bulkCopy} title="Copy selected" className="rounded-full px-4">
                Copy
              </SoftButton>

              <div className="flex-1" />

              <SoftButton tone="neutral" disabled={bulkBusy} onClick={() => selectAllVisible(visibleRightItems)} className="rounded-full px-4">
                Select visible
              </SoftButton>
              <SoftButton tone="neutral" disabled={bulkBusy} onClick={clearSelection} className="rounded-full px-4">
                Clear
              </SoftButton>
            </div>
          </div>
        </GlassCard>
      ) : null}

      {/* Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Timeline / Heatmap */}
        <div className="lg:col-span-4 space-y-4">
          <SectionShell
            title="Timeline"
            subtitle="Heatmap + danh sách ngày (range)."
            right={<Badge tone="neutral">{rangeDays} days</Badge>}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">Heatmap</div>
              <Chip>density</Chip>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {heat.map((h) => (
                <button
                  key={h.k}
                  type="button"
                  onClick={() => {
                    setSelectedDayKey(h.k);
                    setTab("day");
                    clearSelection();
                  }}
                  className={cn("rounded-xl p-0.5", h.k === selectedDayKey ? "ring-2 ring-violet-400/25" : "")}
                >
                  <HeatDot level={h.level} title={`${h.k}: ${h.count} items`} />
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {dayList.map((d) => {
                const k = dayKey(d);
                const list = grouped.get(k) || [];
                const total = list.length;
                const scheduled = list.filter((x) => normalizeStatus(x.status) === "Scheduled").length;

                const today = startOfDay(new Date());
                const isToday = isSameDay(d, today);
                const isTomorrow = isSameDay(d, addDays(today, 1));
                const tag = isToday ? "Today" : isTomorrow ? "Tomorrow" : "Day";

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setSelectedDayKey(k);
                      setTab("day");
                      clearSelection();
                    }}
                    className={cn(
                      "w-full text-left rounded-[22px] border px-3 py-3 transition",
                      k === selectedDayKey
                        ? "border-violet-400/25 bg-violet-500/10"
                        : "border-slate-800/70 bg-slate-950/20 hover:bg-slate-950/30 hover:border-slate-700/80"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge tone={k === selectedDayKey ? "indigo" : "neutral"}>{tag}</Badge>
                          <div className="text-sm font-semibold text-slate-100 truncate">{formatDayLabel(d)}</div>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          All: {total} • Scheduled: {scheduled}
                        </div>
                      </div>
                      <Badge tone="neutral">{total}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionShell>

          <SectionShell
            title="Overview"
            subtitle="Nhìn nhanh trong range + backlog."
            right={<Chip>Filtered: {baseFiltered.length}</Chip>}
          >
            <div className="grid grid-cols-2 gap-2">
              {["Idea", "Draft", "Scheduled", "Posted"].map((s) => (
                <div key={s} className="rounded-[22px] border border-slate-800/70 bg-slate-950/20 p-3">
                  <div className="text-[11px] text-slate-400">{s}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">
                    {baseFiltered.filter((x) => normalizeStatus(x.status) === s).length}
                  </div>
                </div>
              ))}
              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/20 p-3 col-span-2">
                <div className="text-[11px] text-slate-400">Backlog (no scheduled_at)</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{inboxItems.length}</div>
              </div>
            </div>
          </SectionShell>
        </div>

        {/* Right: Day list / Inbox + Week view */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === "week" && tab === "day" ? (
            <SectionShell
              title="Week view"
              subtitle="Kanban theo ngày (7 cột)."
              right={<SoftButton tone="neutral" disabled={!shopId || loading} onClick={loadPlanner} className="rounded-full px-4">⟳ Reload</SoftButton>}
            >
              <div className="overflow-x-auto">
                <div className="min-w-[980px] grid grid-cols-7 gap-3">
                  {weekColumns.map((col) => {
                    const isActive = col.k === selectedDayKey;
                    return (
                      <div
                        key={col.k}
                        className={cn(
                          "rounded-[24px] border p-3",
                          "bg-slate-950/18",
                          isActive ? "border-violet-400/25" : "border-slate-800/70"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDayKey(col.k);
                            clearSelection();
                          }}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-semibold text-slate-100">{formatDayLabel(col.d)}</div>
                              <div className="mt-1 text-[11px] text-slate-400">{col.items.length} items</div>
                            </div>
                            <Badge tone={isActive ? "indigo" : "neutral"}>{col.items.length}</Badge>
                          </div>
                        </button>

                        <div className="mt-3 space-y-2">
                          {col.items.length === 0 ? (
                            <div className="rounded-[18px] border border-slate-800/70 bg-slate-950/20 p-3 text-xs text-slate-500">
                              Empty
                            </div>
                          ) : (
                            col.items.slice(0, 6).map((it) => (
                              <button
                                key={it.id}
                                type="button"
                                onClick={() => openEdit(it)}
                                className="w-full rounded-[18px] border border-slate-800/70 bg-slate-950/22 p-3 text-left hover:bg-slate-950/30 transition"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-100 truncate">{it.title || "Untitled"}</div>
                                    <div className="mt-1 flex items-center gap-2">
                                      <StatusPill status={it.status} />
                                      <Chip>⏰ {formatTimeHM(it.scheduled_at)}</Chip>
                                    </div>
                                  </div>
                                  <div className="text-[11px] text-slate-500">{normalizePlatform(it.platform)}</div>
                                </div>
                              </button>
                            ))
                          )}
                          {col.items.length > 6 ? <div className="text-[11px] text-slate-500">+{col.items.length - 6} more…</div> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionShell>
          ) : null}

          <SectionShell
            title={tab === "inbox" ? "Inbox (Backlog)" : "Danh sách theo ngày"}
            subtitle={tab === "inbox" ? "Item chưa có scheduled_at." : `${selectedDayKey} · ${selectedDayItems.length} items`}
            right={
              <>
                {loading ? <Badge tone="info">Loading…</Badge> : null}
                {error ? <Badge tone="bad">Error</Badge> : <Badge tone="ok">Ready</Badge>}
                <SoftButton tone="neutral" disabled={!shopId || loading} onClick={loadPlanner} className="rounded-full px-4">
                  ⟳ Reload
                </SoftButton>
              </>
            }
          >
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-500/22 bg-rose-500/08 p-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            {!shopId ? (
              <div className="text-sm text-slate-500">Không đủ dữ liệu để xác minh (chưa chọn shop).</div>
            ) : (tab === "inbox" ? inboxItems.length === 0 : selectedDayItems.length === 0) ? (
              <div className="rounded-[26px] border border-slate-800/70 bg-slate-950/20 p-6">
                <div className="text-sm font-semibold text-slate-100">Chưa có nội dung</div>
                <div className="mt-1 text-xs text-slate-400">
                  {tab === "inbox" ? "Inbox trống (tất cả item đã có lịch)." : "Thêm thủ công hoặc gửi nội dung từ AI Studio sang Planner."}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <SoftButton tone="premium" onClick={openCreate} disabled={!shopId} className="rounded-full px-5">
                    ＋ Thêm thủ công
                  </SoftButton>
                  <SoftButton tone="indigo" onClick={() => navigate("/ai")} disabled={!shopId} className="rounded-full px-5">
                    ⚡ Mở AI Studio
                  </SoftButton>
                  <SoftButton tone="cyan" onClick={seedDemo} disabled={!shopId || seeding} className="rounded-full px-5">
                    {seeding ? "Seeding…" : "✨ Import mẫu"}
                  </SoftButton>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">Quick</Badge>
                  <SoftButton tone="neutral" onClick={() => selectAllVisible(visibleRightItems)} className="rounded-full px-4">
                    Select visible
                  </SoftButton>
                  <SoftButton tone="neutral" onClick={clearSelection} className="rounded-full px-4">
                    Clear
                  </SoftButton>
                  <div className="flex-1" />
                  <SoftButton tone="neutral" onClick={() => setViewMode((v) => (v === "list" ? "week" : "list"))} className="rounded-full px-4">
                    Toggle view
                  </SoftButton>
                </div>

                <div className="space-y-3">
                  {(tab === "inbox" ? inboxItems : selectedDayItems).map((it) => {
                    const busy = savingId && String(savingId) === String(it?.id);
                    const sel = isSelected(it?.id);
                    return (
                      <PlannerItemCard
                        key={it?.id || Math.random()}
                        item={it}
                        busy={!!busy}
                        selected={sel}
                        onToggleSelect={() => toggleSelect(it?.id)}
                        onOpen={() => openEdit(it)}
                        onQuickStatus={(s) => quickStatus(it, s)}
                        onDelete={() => deleteItem(it)}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </SectionShell>

          <SectionShell
            title="Luồng đúng"
            subtitle="AI Studio → Planner → Publish."
            right={<Badge tone="indigo">Control Center</Badge>}
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/20 p-4">
                <div className="text-xs font-semibold text-slate-100">1) AI Studio</div>
                <div className="mt-1 text-[11px] text-slate-400">Tạo content nhanh, nhiều biến thể.</div>
              </div>
              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/20 p-4">
                <div className="text-xs font-semibold text-slate-100">2) Planner</div>
                <div className="mt-1 text-[11px] text-slate-400">Chỉnh sửa, gán kênh, đặt lịch.</div>
              </div>
              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/20 p-4">
                <div className="text-xs font-semibold text-slate-100">3) Publish</div>
                <div className="mt-1 text-[11px] text-slate-400">Scheduler/Channels thực thi theo lịch.</div>
              </div>
            </div>
          </SectionShell>
        </div>
      </div>

      {/* Create Drawer */}
      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo kế hoạch (manual)">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-slate-400">Platform</div>
              <Select value={createForm.platform} onChange={(e) => setCreateForm((p) => ({ ...p, platform: e.target.value }))} options={platformOptions} />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-400">Status</div>
              <Select value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))} options={statusOptions} />
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-400">Title</div>
            <Input value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} placeholder="VD: Livestream serum vitamin C" />
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-400">Idea / Nội dung</div>
            <Textarea value={createForm.idea} onChange={(e) => setCreateForm((p) => ({ ...p, idea: e.target.value }))} placeholder="Gợi ý nội dung, bullet, CTA, ưu đãi…" rows={7} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-slate-400">Scheduled at</div>
              <Input type="datetime-local" value={createForm.scheduled_at} onChange={(e) => setCreateForm((p) => ({ ...p, scheduled_at: e.target.value }))} />
              <div className="mt-1 text-[11px] text-slate-500">Bắt buộc để vào Timeline.</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-400">Channel ID (optional)</div>
              <Input value={createForm.channel_id} onChange={(e) => setCreateForm((p) => ({ ...p, channel_id: e.target.value }))} placeholder="VD: 8" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <SoftButton tone="neutral" onClick={() => setCreateOpen(false)} disabled={creating} className="rounded-full px-5">
              Cancel
            </SoftButton>
            <SoftButton tone="premium" onClick={createItem} disabled={creating || !shopId} className="rounded-full px-6">
              {creating ? "Saving…" : "Create"}
            </SoftButton>
          </div>
        </div>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title={editItem?.id ? `Chỉnh sửa #${editItem.id}` : "Chỉnh sửa"}>
        {!editItem ? (
          <div className="text-sm text-slate-500">Không đủ dữ liệu để xác minh.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <PlatformPill platform={editItem.platform} />
              <StatusPill status={editItem.status} />
              <Chip>shop_id: {shopId ?? "—"}</Chip>
              {savingId && String(savingId) === String(editItem.id) ? <Badge tone="info">Saving…</Badge> : null}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-slate-400">Platform</div>
                <Select value={editItem.platform} onChange={(e) => setEditItem((p) => ({ ...p, platform: e.target.value }))} options={platformOptions} />
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-400">Status</div>
                <Select value={editItem.status} onChange={(e) => setEditItem((p) => ({ ...p, status: e.target.value }))} options={statusOptions} />
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-400">Title</div>
              <Input value={editItem.title} onChange={(e) => setEditItem((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-400">Idea / Nội dung</div>
              <Textarea value={editItem.idea} onChange={(e) => setEditItem((p) => ({ ...p, idea: e.target.value }))} rows={10} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-slate-400">Scheduled at</div>
                <Input
                  type="datetime-local"
                  value={toLocalDatetimeValue(editItem.scheduled_at)}
                  onChange={(e) => setEditItem((p) => ({ ...p, scheduled_at: e.target.value }))}
                />
                <div className="mt-1 text-[11px] text-slate-500">Xoá giá trị để chuyển item sang Inbox.</div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-400">Channel ID (optional)</div>
                <Input value={editItem.channel_id || ""} onChange={(e) => setEditItem((p) => ({ ...p, channel_id: e.target.value }))} placeholder="VD: 8" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <SoftButton
                tone="rose"
                disabled={savingId && String(savingId) === String(editItem.id)}
                onClick={() => deleteItem(editItem)}
                className="rounded-full px-5"
              >
                🗑 Delete
              </SoftButton>

              <div className="flex items-center gap-2">
                <SoftButton
                  tone="neutral"
                  onClick={() => setEditOpen(false)}
                  disabled={savingId && String(savingId) === String(editItem.id)}
                  className="rounded-full px-5"
                >
                  Close
                </SoftButton>
                <SoftButton
                  tone="premium"
                  onClick={saveEdit}
                  disabled={savingId && String(savingId) === String(editItem.id)}
                  className="rounded-full px-6"
                >
                  Save
                </SoftButton>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
