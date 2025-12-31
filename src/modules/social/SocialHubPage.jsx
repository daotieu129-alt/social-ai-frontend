// src/modules/social/SocialHubPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { FacebookAPI } from "../../api/facebook.api";
import { SchedulerAPI } from "../../api/scheduler.api";

/* =========================================================
   Small utilities
========================================================= */

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function hasPageToken(a) {
  return !!a?.access_token;
}

function fmtCount(n) {
  return typeof n === "number" ? n.toLocaleString("en-US") : "—";
}

function shortId(id) {
  const s = String(id || "");
  if (!s) return "—";
  if (s.length <= 10) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

/* =========================================================
   Premium Dashboard-like UI primitives (same vibe as Planner premium)
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
    amber: "border-amber-400/22 bg-amber-500/10 text-amber-100 hover:bg-amber-500/14",
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

function PrimaryButton({ disabled, onClick, children, title, className }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-2xl px-3 py-2 text-xs font-semibold transition border",
        "border-violet-400/22 bg-gradient-to-r from-violet-500/28 via-cyan-500/16 to-emerald-500/12",
        "text-white hover:brightness-110",
        "shadow-[0_0_0_1px_rgba(167,139,250,0.12)_inset,0_18px_40px_rgba(0,0,0,0.35)]",
        disabled && "cursor-not-allowed opacity-60 hover:brightness-100",
        className
      )}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, className }) {
  return (
    <input
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

function Toast({ toast, onClose }) {
  if (!toast?.type) return null;
  const tone = toast.type === "ok" ? "ok" : toast.type === "warn" ? "warn" : toast.type === "bad" ? "bad" : "info";
  return (
    <div className="fixed right-5 top-5 z-50">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <Badge tone={tone}>{toast.type === "ok" ? "OK" : toast.type === "warn" ? "WARN" : toast.type === "bad" ? "ERR" : "INFO"}</Badge>
          <div className="min-w-[240px]">
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

/* =========================================================
   Channels Directory (optional)
========================================================= */

const PLATFORM = {
  facebook: { label: "Facebook", chip: "border-sky-500/30 bg-sky-500/15 text-sky-200", icon: "📘" },
  instagram: { label: "Instagram", chip: "border-pink-500/30 bg-pink-500/15 text-pink-200", icon: "📸" },
  tiktok: { label: "TikTok", chip: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200", icon: "🎵" },
  youtube: { label: "YouTube", chip: "border-red-500/30 bg-red-500/15 text-red-200", icon: "▶️" },
  zalo: { label: "Zalo", chip: "border-sky-400/30 bg-sky-400/15 text-sky-200", icon: "💬" },
  threads: { label: "Threads", chip: "border-slate-400/30 bg-slate-400/10 text-slate-100", icon: "🧵" },
  x: { label: "X", chip: "border-slate-400/30 bg-slate-400/10 text-slate-100", icon: "𝕏" },
  unknown: { label: "Channel", chip: "border-slate-800/80 bg-slate-950/40 text-slate-200", icon: "🔗" },
};

function detectPlatform(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("facebook.com")) return "facebook";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("zalo")) return "zalo";
  if (u.includes("threads.net")) return "threads";
  if (u.includes("twitter.com") || u.includes("x.com")) return "x";
  return "unknown";
}

function PlatformPill({ keyName }) {
  const p = PLATFORM[keyName] || PLATFORM.unknown;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold", p.chip)}>
      <span>{p.icon}</span>
      <span>{p.label}</span>
    </span>
  );
}

function ChannelsDirectory({ shopId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channels, setChannels] = useState([]);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/channels", { params: { shop_id: shopId } });
      const data = res?.data?.data?.channels || res?.data?.data || res?.data || [];
      setChannels(safeArray(data));
    } catch {
      setError("Không đủ dữ liệu để xác minh (GET /channels thất bại).");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return channels
      .map((c) => {
        const key = c?.platform || detectPlatform(c?.url);
        const connected = !!(c?.access_token || c?.token || c?.connected || c?.isConnected);
        return { ...c, _key: key, _connected: connected };
      })
      .filter((c) => {
        if (!q) return true;
        const name = (c?.name || "").toLowerCase();
        const url = (c?.url || "").toLowerCase();
        const pl = (PLATFORM[c?._key]?.label || "").toLowerCase();
        return name.includes(q) || url.includes(q) || pl.includes(q);
      });
  }, [channels, query]);

  const copy = async (text) => {
    try {
      await navigator.clipboard?.writeText?.(text);
    } catch {
      // ignore
    }
  };

  return (
    <GlassCard className="p-0">
      <div className="px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-100">Directory</div>
            <div className="mt-1 text-xs text-slate-400">Kho kênh theo shop (phụ).</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{loading ? "Loading…" : `${items.length} items`}</Badge>
            <SoftButton tone="neutral" disabled={!shopId || loading} onClick={load} className="rounded-full px-4">
              ⟳ Reload
            </SoftButton>
          </div>
        </div>
      </div>
      <Divider />

      <div className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[320px]">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search url / platform / name…" />
          </div>

          <div className="flex-1" />

          <SoftButton
            tone="neutral"
            onClick={() => {
              setQuery("");
            }}
            className="rounded-full px-4"
          >
            Reset
          </SoftButton>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-500/22 bg-rose-500/08 p-3 text-sm text-rose-100">{error}</div>
        ) : null}

        {!error && items.length === 0 && !loading ? <div className="mt-3 text-sm text-slate-500">Không có kênh phù hợp.</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((c) => {
            const keyName = c._key || "unknown";
            const connected = !!c._connected;
            return (
              <div
                key={c?.id || `${c?.url}-${Math.random()}`}
                className={cn(
                  "group relative overflow-hidden rounded-[26px] border p-4 transition",
                  "bg-slate-950/22 border-slate-800 hover:bg-slate-950/30 hover:border-slate-700/80",
                  connected ? "shadow-[0_0_0_1px_rgba(16,185,129,0.06)_inset]" : "shadow-[0_0_0_1px_rgba(245,158,11,0.06)_inset]"
                )}
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute -left-28 top-0 h-full w-56 rotate-12 bg-gradient-to-r from-transparent via-white/6 to-transparent" />
                </div>

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlatformPill keyName={keyName} />
                      <Badge tone={connected ? "ok" : "warn"}>{connected ? "Connected" : "Not connected"}</Badge>
                    </div>

                    <div className="mt-2 text-sm font-semibold text-slate-100 truncate">{c?.name || "Channel"}</div>
                    <div className="mt-1 text-xs text-slate-400 truncate">{c?.url}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <SoftButton tone="neutral" onClick={() => copy(c?.url || "")} title="Copy URL" className="rounded-full px-3">
                      ⧉
                    </SoftButton>
                    {c?.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900/45 hover:border-slate-700/80 transition"
                      >
                        ↗
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

/* =========================================================
   Main Page: Social Hub (Auto Post focus)
========================================================= */

export default function SocialHubPage({ activeShop }) {
  const location = useLocation();
  const navigate = useNavigate();

  const shopId = activeShop?.id ?? null;
  const shopLabel = useMemo(() => activeShop?.name || activeShop?.id || "Chưa chọn shop", [activeShop]);

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

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // data
  const [loadingConnectFb, setLoadingConnectFb] = useState(false);
  const [loadingFb, setLoadingFb] = useState(false);
  const [fbAccounts, setFbAccounts] = useState([]);

  const [loadingScheduler, setLoadingScheduler] = useState(false);
  const [schedulerData, setSchedulerData] = useState(null);
  const [schedulerError, setSchedulerError] = useState("");
  const [debugOpen, setDebugOpen] = useState(false);

  const [directoryOpen, setDirectoryOpen] = useState(false);

  const loadFacebookAccounts = useCallback(async () => {
    if (!shopId) return;
    setLoadingFb(true);
    try {
      const res = await api.get("/facebook/accounts", { params: { shop_id: shopId } });
      const data = res?.data?.data || res?.data || [];
      setFbAccounts(safeArray(data));
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (GET /facebook/accounts thất bại).";
      pushToast("warn", msg);
    } finally {
      setLoadingFb(false);
    }
  }, [shopId, pushToast]);

  const loadScheduler = useCallback(async () => {
    if (!shopId) return;
    setLoadingScheduler(true);
    setSchedulerError("");
    try {
      const data = await SchedulerAPI.getAccounts(shopId);
      setSchedulerData(data);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (SchedulerAPI.getAccounts thất bại).";
      setSchedulerError(msg);
      setSchedulerData(null);
    } finally {
      setLoadingScheduler(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    loadFacebookAccounts();
    loadScheduler();
  }, [shopId, loadFacebookAccounts, loadScheduler]);

  // callback cleanup: support both legacy (/social?fb=connected) and BE redirect (/channels?connected=facebook)
  useEffect(() => {
    if (!shopId) return;

    const params = new URLSearchParams(location.search || "");

    const fb = params.get("fb"); // legacy
    const connected = (params.get("connected") || "").toLowerCase(); // BE
    const connectedOk = connected === "facebook";

    const qsShopId = params.get("shop_id") || params.get("shopId");
    const isForThisShop = !qsShopId || String(qsShopId) === String(shopId);

    const isConnected = (fb === "connected" && isForThisShop) || (connectedOk && isForThisShop);

    if (!isConnected) return;

    pushToast("ok", "Facebook đã kết nối");
    loadFacebookAccounts();

    params.delete("fb");
    params.delete("connected");
    params.delete("shop_id");
    params.delete("shopId");

    const next = params.toString();
    const nextUrl = location.pathname + (next ? `?${next}` : "");

    window.history.replaceState({}, "", nextUrl);
    window.location.reload();
  }, [shopId, location.pathname, location.search, loadFacebookAccounts, pushToast]);

  const handleConnectFacebook = useCallback(async () => {
    if (!shopId) return;
    setLoadingConnectFb(true);
    try {
      const data = await FacebookAPI.getLoginUrl(shopId);
      const loginUrl = typeof data === "string" ? data : data?.loginUrl;
      if (!loginUrl) {
        pushToast("bad", "Không đủ dữ liệu để xác minh (không lấy được loginUrl).");
        return;
      }
      window.location.href = loginUrl;
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Không đủ dữ liệu để xác minh (Connect Facebook thất bại).";
      pushToast("bad", msg);
    } finally {
      setLoadingConnectFb(false);
    }
  }, [shopId, pushToast]);

  const fbStats = useMemo(() => {
    const pages = safeArray(fbAccounts);
    const total = pages.length;
    const connected = pages.filter((x) => hasPageToken(x)).length;
    const tokenIssues = pages.filter((x) => !hasPageToken(x)).length;
    return { total, connected, tokenIssues };
  }, [fbAccounts]);

  const schedulerStatus = useMemo(() => {
    if (!shopId) return { tone: "warn", label: "No shop", detail: "Không đủ dữ liệu để xác minh" };
    if (loadingScheduler) return { tone: "info", label: "Loading", detail: "Đang tải" };
    if (schedulerError) return { tone: "bad", label: "Error", detail: schedulerError };
    if (!schedulerData) return { tone: "warn", label: "Unknown", detail: "Không đủ dữ liệu để xác minh" };
    return { tone: "ok", label: "Ready", detail: "Dữ liệu đã tải" };
  }, [shopId, loadingScheduler, schedulerError, schedulerData]);

  const copy = async (text, okMsg = "Đã copy") => {
    try {
      await navigator.clipboard?.writeText?.(String(text || ""));
      pushToast("ok", okMsg);
    } catch {
      pushToast("warn", "Không đủ dữ liệu để xác minh (copy thất bại).");
    }
  };

  const goCreatePost = () => {
    if (!shopId) return;
    navigate("/posts");
  };

  const reloadAll = () => {
    loadFacebookAccounts();
    loadScheduler();
    pushToast("info", "Đã reload dữ liệu");
  };

  return (
    <div className="space-y-4">
      <Toast toast={toast} onClose={clearToast} />

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 -mx-2 px-2 pt-2">
        <GlassCard className="p-0">
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">🏪 {shopLabel}</Badge>
                <Badge tone={fbStats.tokenIssues > 0 ? "warn" : "ok"}>
                  Facebook: {fmtCount(fbStats.connected)}/{fmtCount(fbStats.total)} ready
                </Badge>
                <Badge tone={schedulerStatus.tone}>Scheduler: {schedulerStatus.label}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
               

                <SoftButton tone="neutral" disabled={!shopId || loadingFb || loadingScheduler} onClick={reloadAll} className="rounded-full px-4">
                  ⟳ Reload
                </SoftButton>

              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-3">
                <div className="text-[11px] text-slate-400">Pages</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-lg font-semibold text-slate-100">{fmtCount(fbStats.total)}</div>
                  <Badge tone="info">total</Badge>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-3">
                <div className="text-[11px] text-slate-400">Ready</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-lg font-semibold text-slate-100">{fmtCount(fbStats.connected)}</div>
                  <Badge tone="ok">token</Badge>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-3">
                <div className="text-[11px] text-slate-400">Token issue</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-lg font-semibold text-slate-100">{fmtCount(fbStats.tokenIssues)}</div>
                  <Badge tone={fbStats.tokenIssues > 0 ? "warn" : "ok"}>check</Badge>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-3">
                <div className="text-[11px] text-slate-400">Scheduler</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-lg font-semibold text-slate-100">{schedulerStatus.label}</div>
                  <Badge tone={schedulerStatus.tone}>{schedulerStatus.tone}</Badge>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SoftButton tone="neutral" disabled={!shopId} onClick={() => setDirectoryOpen((v) => !v)} className="rounded-full px-4">
                {directoryOpen ? "▾ Ẩn Directory" : "▸ Mở Directory"}
              </SoftButton>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Pages */}
      <GlassCard className="p-0">
        <div className="px-5 pt-5 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-100">Facebook Pages</div>
              <div className="mt-1 text-xs text-slate-400">Chỉ hiển thị trạng thái token phục vụ Auto Post.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{loadingFb ? "Loading…" : `${fmtCount(fbStats.total)} pages`}</Badge>
              <SoftButton tone="neutral" disabled={!shopId || loadingFb} onClick={loadFacebookAccounts} className="rounded-full px-4">
                ⟳ Reload
              </SoftButton>
              <SoftButton tone="premium" disabled={!shopId || loadingConnectFb} onClick={handleConnectFacebook} className="rounded-full px-5">
                {loadingConnectFb ? "Đang mở…" : "🔗 Connect"}
              </SoftButton>
            </div>
          </div>
        </div>
        <Divider />

        <div className="px-5 py-5">
          {!shopId ? (
            <div className="text-sm text-slate-500">Không đủ dữ liệu để xác minh (chưa chọn shop).</div>
          ) : loadingFb ? (
            <div className="text-sm text-slate-400">Đang tải…</div>
          ) : fbAccounts.length === 0 ? (
            <div className="rounded-[26px] border border-slate-800/70 bg-slate-950/20 p-6">
              <div className="text-sm font-semibold text-slate-100">Chưa có Facebook Page</div>
              <div className="mt-1 text-xs text-slate-400">Bấm Connect để lấy danh sách Pages và token.</div>
              <div className="mt-4">
                <SoftButton tone="premium" disabled={!shopId || loadingConnectFb} onClick={handleConnectFacebook} className="rounded-full px-5">
                  {loadingConnectFb ? "Đang mở…" : "🔗 Connect Facebook"}
                </SoftButton>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {fbAccounts.map((a) => {
                const pageId = String(a?.account_id || a?.page_id || a?.id || "");
                const ok = hasPageToken(a);
                const name = a?.account_name || a?.name || "Facebook Page";

                return (
                  <div
                    key={pageId || Math.random()}
                    className={cn(
                      "group relative overflow-hidden rounded-[28px] border p-5 transition",
                      "bg-slate-950/22 hover:bg-slate-950/30 hover:border-slate-700/80",
                      ok ? "border-emerald-500/18" : "border-amber-500/18"
                    )}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute -left-28 top-0 h-full w-56 rotate-12 bg-gradient-to-r from-transparent via-white/6 to-transparent" />
                    </div>

                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0",
                        ok
                          ? "bg-gradient-to-r from-emerald-600/10 via-cyan-600/8 to-transparent"
                          : "bg-gradient-to-r from-amber-500/10 via-slate-950/0 to-transparent"
                      )}
                    />

                    <div className="relative flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="indigo">📘 Page</Badge>
                          <Badge tone={ok ? "ok" : "warn"}>{ok ? "Ready" : "Reconnect required"}</Badge>
                          <Chip title={pageId}>id: {shortId(pageId)}</Chip>
                        </div>

                        <div className="mt-2 text-base font-semibold text-slate-100 truncate">{name}</div>
                        <div className="mt-1 text-xs text-slate-400 truncate">Page ID: {pageId || "—"}</div>

                        {!ok ? (
                          <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/08 px-3 py-2 text-xs text-amber-100">
                            Page thiếu token. Cần Connect để lấy lại token.
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <SoftButton tone="neutral" disabled={!pageId} onClick={() => copy(pageId, "Đã copy Page ID")} className="rounded-full px-4">
                          ⧉ Copy
                        </SoftButton>
                      </div>
                    </div>

                    <div className="relative mt-4 flex flex-wrap items-center gap-2">
                      <SoftButton tone="premium" disabled={!shopId || !ok} onClick={goCreatePost} title={!ok ? "Thiếu token" : "Tạo bài đăng"} className="rounded-full px-6">
                        ✍️ Tạo bài
                      </SoftButton>
                      {!ok ? (
                        <SoftButton tone="amber" disabled={!shopId || loadingConnectFb} onClick={handleConnectFacebook} className="rounded-full px-6">
                          {loadingConnectFb ? "Đang mở…" : "Reconnect"}
                        </SoftButton>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Optional Directory */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge tone="info">Optional</Badge>
            <div className="text-xs text-slate-400">Directory chỉ để tham khảo.</div>
          </div>
          <SoftButton tone="neutral" onClick={() => setDirectoryOpen((v) => !v)} className="rounded-full px-4">
            {directoryOpen ? "▾ Ẩn" : "▸ Mở"}
          </SoftButton>
        </div>

        {directoryOpen ? <ChannelsDirectory shopId={shopId} /> : null}
      </div>

      {/* DEBUG DRAWER */}
      <Drawer open={debugOpen} onClose={() => setDebugOpen(false)} title="Debug · Scheduler raw">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={schedulerStatus.tone}>Scheduler: {schedulerStatus.label}</Badge>
            <Badge tone="neutral">shop_id: {shopId ?? "—"}</Badge>
            <SoftButton tone="neutral" disabled={!shopId || loadingScheduler} onClick={loadScheduler} className="rounded-full px-4">
              ⟳ Reload
            </SoftButton>
          </div>

          {schedulerError ? (
            <div className="rounded-2xl border border-rose-500/22 bg-rose-500/08 p-3 text-sm text-rose-100">{schedulerError}</div>
          ) : null}

          {!schedulerError && !schedulerData ? <div className="text-sm text-slate-500">Không đủ dữ liệu để xác minh.</div> : null}

          {schedulerData ? (
            <pre className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
              {JSON.stringify(schedulerData, null, 2)}
            </pre>
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
