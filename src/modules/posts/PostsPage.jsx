import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";

/* =========================================================
   Utils
========================================================= */
const cn = (...x) => x.filter(Boolean).join(" ");
const safeArray = (x) => (Array.isArray(x) ? x : []);
const pickData = (r) => r?.data?.data ?? r?.data ?? null;
const fmtCount = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : "—");

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isValidDate(d) ? d : null;
};
const ymd = (d) => {
  if (!d) return null;
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const startOfDay = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null);
const endOfDay = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) : null);

const humanDate = (d) =>
  d
    ? d.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "—";

const humanTime = (d) =>
  d
    ? d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const clampText = (s, max = 420) => {
  const t = typeof s === "string" ? s : "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
};

const statusTone = (s) => {
  const v = String(s || "unknown");
  if (v === "posted") return "ok";
  if (v === "failed" || v === "dead") return "bad";
  if (v === "processing") return "indigo";
  if (v === "retrying") return "warn";
  if (v === "scheduled") return "info";
  if (v === "cancelled") return "neutral";
  return "neutral";
};

const statusLabelVI = (s) => {
  const v = String(s || "unknown");
  if (v === "scheduled") return "Đã lên lịch";
  if (v === "processing") return "Đang xử lý";
  if (v === "retrying") return "Thử lại";
  if (v === "posted") return "Đã đăng";
  if (v === "failed") return "Thất bại";
  if (v === "dead") return "Dừng hẳn";
  if (v === "cancelled") return "Đã huỷ";
  return v;
};

const inferPrimaryTime = (p) => toDate(p?.scheduled_time) || toDate(p?.created_at) || toDate(p?.updated_at) || null;

function buildTimeline(items) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const buckets = {
    today: new Map(),
    upcoming: new Map(),
    past: new Map(),
    unknown: new Map(),
  };

  const add = (map, key, item) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  };

  for (const it of safeArray(items)) {
    const d = inferPrimaryTime(it);
    if (!d) {
      add(buckets.unknown, "unknown", it);
      continue;
    }
    const key = ymd(d) || "unknown";
    if (todayStart && todayEnd && d >= todayStart && d <= todayEnd) add(buckets.today, key, it);
    else if (todayEnd && d > todayEnd) add(buckets.upcoming, key, it);
    else add(buckets.past, key, it);
  }

  const sortMap = (m, dir = "asc") =>
    new Map(
      Array.from(m.entries())
        .sort((a, b) => (dir === "asc" ? String(a[0]).localeCompare(String(b[0])) : String(b[0]).localeCompare(String(a[0]))))
        .map(([k, v]) => [
          k,
          v.sort((x, y) => (inferPrimaryTime(x)?.getTime() || 0) - (inferPrimaryTime(y)?.getTime() || 0)),
        ])
    );

  return {
    today: sortMap(buckets.today, "asc"),
    upcoming: sortMap(buckets.upcoming, "asc"),
    past: sortMap(buckets.past, "desc"),
    unknown: sortMap(buckets.unknown, "asc"),
  };
}

function countMapItems(m) {
  let n = 0;
  for (const [, arr] of m.entries()) n += safeArray(arr).length;
  return n;
}

function parseJsonSafe(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function extractMetadata(p) {
  const m = p?.metadata;
  if (!m) return null;
  if (typeof m === "object") return m;
  if (typeof m === "string") return parseJsonSafe(m);
  return null;
}

/**
 * Facebook permalink + embed from external_post_id
 * external_post_id example: 102576262987083_843529668199438
 *
 * For Pages, stable permalink is:
 *   https://www.facebook.com/permalink.php?story_fbid={POST_ID}&id={PAGE_ID}
 */
function fbPermalinkFromExternalId(externalPostId) {
  if (!externalPostId) return "";
  const s = String(externalPostId);

  // expected: PAGEID_POSTID
  if (s.includes("_")) {
    const [pageId, postId] = s.split("_");
    if (pageId && postId) {
      return `https://www.facebook.com/permalink.php?story_fbid=${encodeURIComponent(postId)}&id=${encodeURIComponent(pageId)}`;
    }
  }

  // fallback
  return `https://www.facebook.com/${encodeURIComponent(s)}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* =========================================================
   UI Primitives
========================================================= */
function Badge({ children, tone = "neutral", className = "" }) {
  const base = "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold";
  const toneCls =
    tone === "ok"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : tone === "bad"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
      : tone === "info"
      ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
      : tone === "indigo"
      ? "border-violet-500/20 bg-violet-500/10 text-violet-100"
      : tone === "warn"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
      : "border-slate-800 bg-slate-950/30 text-slate-200";
  return <span className={cn(base, toneCls, className)}>{children}</span>;
}

function Chip({ children, className = "", title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full border border-slate-800 bg-slate-950/25 px-2.5 py-1 text-[11px] text-slate-300",
        className
      )}
    >
      {children}
    </span>
  );
}

function SoftButton({ children, className = "", tone = "neutral", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const toneCls =
    tone === "premium"
      ? "border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15"
      : tone === "indigo"
      ? "border-indigo-400/18 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/14"
      : tone === "cyan"
      ? "border-cyan-400/18 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/14"
      : "border-slate-800 bg-slate-950/20 text-slate-200 hover:bg-slate-950/30 hover:border-slate-700";
  return (
    <button type="button" className={cn(base, toneCls, className)} {...props}>
      {children}
    </button>
  );
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-violet-400/20 bg-gradient-to-r from-violet-500/22 via-indigo-500/16 to-cyan-500/14 px-5 py-2 text-[12px] font-semibold text-violet-50 shadow-[0_0_0_1px_rgba(167,139,250,0.08)_inset,0_18px_70px_rgba(0,0,0,0.55)] transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent" />;
}

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-slate-800/80 bg-slate-950/45 shadow-[0_0_0_1px_rgba(15,23,42,0.6)_inset,0_50px_120px_rgba(0,0,0,0.55)] overflow-hidden",
        className
      )}
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_-10%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(900px_circle_at_95%_0%,rgba(34,211,238,0.16),transparent_50%),radial-gradient(900px_circle_at_65%_110%,rgba(167,139,250,0.16),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:radial-gradient(rgba(148,163,184,0.35)_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className={cn("relative", "backdrop-blur-[2px]")}>{children}</div>
      </div>
    </div>
  );
}

function Toast({ text, onClose }) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => onClose?.(), 2200);
    return () => clearTimeout(t);
  }, [text, onClose]);

  if (!text) return null;

  return (
    <div className="fixed right-5 top-5 z-[80]">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.6)_inset,0_40px_120px_rgba(0,0,0,0.7)]">
        {text}
      </div>
    </div>
  );
}

/* =========================================================
   Status pills
========================================================= */
function StatusPills({ value, onChange, stats }) {
  const items = [
    ["all", "Tất cả", "neutral", stats?.total ?? null],
    ["scheduled", "Lên lịch", "info", stats?.scheduled ?? null],
    ["processing", "Xử lý", "indigo", stats?.processing ?? null],
    ["retrying", "Thử lại", "warn", stats?.retrying ?? null],
    ["posted", "Đã đăng", "ok", stats?.posted ?? null],
    ["failed", "Thất bại", "bad", stats?.failed ?? null],
    ["dead", "Dừng hẳn", "bad", stats?.dead ?? null],
    ["cancelled", "Đã huỷ", "neutral", stats?.cancelled ?? null],
  ];

  const dotCls = (tone) =>
    tone === "ok"
      ? "bg-emerald-400/80"
      : tone === "bad"
      ? "bg-rose-400/80"
      : tone === "info"
      ? "bg-cyan-400/75"
      : tone === "indigo"
      ? "bg-violet-400/75"
      : tone === "warn"
      ? "bg-amber-400/75"
      : "bg-slate-400/60";

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([k, label, tone, count]) => {
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange?.(k)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
              active
                ? "border-violet-400/25 bg-violet-500/10 text-violet-100 shadow-[0_0_0_1px_rgba(167,139,250,0.10)_inset]"
                : "border-slate-800 bg-slate-950/18 text-slate-300 hover:bg-slate-950/26 hover:border-slate-700/80"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full", dotCls(tone))} />
              {label}
              {typeof count === "number" ? (
                <span className="ml-1 rounded-full border border-slate-800 bg-slate-950/25 px-2 py-0.5 text-[10px] text-slate-300">
                  {fmtCount(count)}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   Section Tabs (Today / Upcoming / Past / Unknown)
========================================================= */
function SectionTabs({ value, onChange, counts }) {
  const items = [
    ["today", "Today", "info", counts.today],
    ["upcoming", "Upcoming", "indigo", counts.upcoming],
    ["past", "Past", "neutral", counts.past],
    ["unknown", "Unknown", "warn", counts.unknown],
  ];

  const dotCls = (tone) =>
    tone === "info"
      ? "bg-cyan-400/75"
      : tone === "indigo"
      ? "bg-violet-400/75"
      : tone === "warn"
      ? "bg-amber-400/75"
      : "bg-slate-400/60";

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
      {items.map(([k, label, tone, count]) => {
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange?.(k)}
            className={cn(
              "rounded-full border px-4 py-2 text-[12px] font-semibold transition whitespace-nowrap shrink-0",
              active
                ? "border-violet-400/25 bg-gradient-to-r from-violet-500/16 via-indigo-500/12 to-cyan-500/10 text-violet-100 shadow-[0_0_0_1px_rgba(167,139,250,0.10)_inset]"
                : "border-slate-800 bg-slate-950/18 text-slate-300 hover:bg-slate-950/26 hover:border-slate-700/80"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full", dotCls(tone))} />
              {label}
              <span className="ml-1 rounded-full border border-slate-800 bg-slate-950/25 px-2 py-0.5 text-[10px] text-slate-300">
                {fmtCount(count)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   Facebook Embed (Responsive / auto height via SDK)
========================================================= */
function loadFacebookSDK(locale = "vi_VN") {
  // Reuse existing
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.FB && typeof window.FB.XFBML?.parse === "function") return Promise.resolve(true);
  if (window.__fbSdkLoadingPromise) return window.__fbSdkLoadingPromise;

  window.__fbSdkLoadingPromise = new Promise((resolve) => {
    const id = "facebook-jssdk";
    if (document.getElementById(id)) {
      const t = setInterval(() => {
        if (window.FB && typeof window.FB.XFBML?.parse === "function") {
          clearInterval(t);
          resolve(true);
        }
      }, 120);
      setTimeout(() => {
        clearInterval(t);
        resolve(!!(window.FB && typeof window.FB.XFBML?.parse === "function"));
      }, 4500);
      return;
    }

    window.fbAsyncInit = function () {
      try {
        window.FB.init({
          xfbml: true,
          version: "v19.0",
        });
      } catch {
        // ignore
      }
      resolve(true);
    };

    const js = document.createElement("script");
    js.id = id;
    js.async = true;
    js.defer = true;
    js.crossOrigin = "anonymous";
    js.src = `https://connect.facebook.net/${locale}/sdk.js#xfbml=1&version=v19.0`;
    js.onload = () => {
      // fbAsyncInit should run; still resolve
      setTimeout(() => resolve(true), 200);
    };
    js.onerror = () => resolve(false);
    document.body.appendChild(js);
  });

  return window.__fbSdkLoadingPromise;
}

function FacebookPostEmbed({ externalPostId }) {
  const permalink = useMemo(() => fbPermalinkFromExternalId(externalPostId), [externalPostId]);
  const wrapRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!externalPostId || !permalink) return;

    loadFacebookSDK("vi_VN").then((ok) => {
      if (!mounted) return;
      setSdkReady(!!ok);
    });

    return () => {
      mounted = false;
    };
  }, [externalPostId, permalink]);

  useEffect(() => {
    if (!sdkReady) return;
    if (!wrapRef.current) return;
    try {
      window.FB?.XFBML?.parse(wrapRef.current);
    } catch {
      // ignore
    }
  }, [sdkReady, permalink]);

  if (!externalPostId || !permalink) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/18 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone="info">Embed</Badge>
          <Chip title={permalink}>Facebook post</Chip>
        </div>
        <a
          href={permalink}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-cyan-200 hover:text-cyan-100 underline underline-offset-4"
        >
          Mở bài
        </a>
      </div>
      <div className="h-px w-full bg-slate-800/70" />

      <div className="p-3">
        <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-black/20">
          {/* SDK mode: auto height */}
          <div ref={wrapRef} className="w-full">
            <div
              className="fb-post"
              data-href={permalink}
              data-show-text="true"
              data-width="auto"
              style={{ width: "100%" }}
            />
          </div>

          {/* Fallback hint if SDK fails */}
          {!sdkReady ? (
            <div className="p-4 text-xs text-slate-500">
              Không đủ dữ liệu để xác minh (SDK embed chưa sẵn sàng). Mở bài để xem trực tiếp.
            </div>
          ) : null}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">Điều kiện: bài post phải public/đủ quyền xem.</div>
      </div>
    </div>
  );
}

/* =========================================================
   Post Accordion Row
========================================================= */
function PostAccordionRow({ p, isOpen, onToggle, onToast }) {
  const s = String(p?.status || "unknown");
  const tone = statusTone(s);
  const d = inferPrimaryTime(p);

  const provider = p?.provider || p?.platform || "facebook";
  const accountId = p?.account_id || p?.page_id || p?.social_account_id || p?.pageId || "";
  const channelId = p?.channel_id || p?.channelId || "";
  const contentRaw = typeof p?.content === "string" ? p.content : typeof p?.message === "string" ? p.message : "";
  const contentShort = clampText(contentRaw, 160);
  const externalPostId = p?.external_post_id || p?.externalPostId || "";
  const errMsg = p?.error_message || "";
  const lastErr = p?.last_error || "";

  const permalink = useMemo(() => fbPermalinkFromExternalId(externalPostId), [externalPostId]);
  const canEmbed = String(provider).toLowerCase() === "facebook" && !!externalPostId;

  const chevron = isOpen ? "▾" : "▸";

  const onCopy = async () => {
    if (!permalink) return;
    const ok = await copyText(permalink);
    onToast?.(ok ? "Đã copy link" : "Copy thất bại");
  };

  return (
    <div className={cn("rounded-2xl border border-slate-800 bg-slate-950/18 overflow-hidden")}>
      <button
        type="button"
        onClick={onToggle}
        className={cn("w-full text-left px-4 py-3 flex items-center justify-between gap-3", "hover:bg-slate-950/26 transition")}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{statusLabelVI(s)}</Badge>
            <Chip title={d ? d.toISOString() : ""}>{d ? humanTime(d) : "—"}</Chip>
            <Chip>{provider}</Chip>
            {accountId ? <Chip title="account_id">Page: {accountId}</Chip> : null}
            {externalPostId ? <Badge tone="ok">Posted</Badge> : null}
          </div>
          <div className="mt-2 text-sm text-slate-200 truncate">{contentShort || "—"}</div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-slate-400 text-sm">{chevron}</span>
        </div>
      </button>

      {isOpen ? (
        <div className="px-4 pb-4">
          <Divider />
          <div className="pt-3 space-y-3">
            <div className="text-sm text-slate-200 whitespace-pre-wrap break-words">{clampText(contentRaw, 2400) || "—"}</div>

            <div className="flex flex-wrap gap-2">
              {channelId ? <Chip title="channel_id">Channel: {String(channelId)}</Chip> : null}
              {externalPostId ? (
                <Chip className="border-emerald-500/25 bg-emerald-500/06 text-emerald-100">External: {externalPostId}</Chip>
              ) : null}
              {p?.id ? <Chip title="id">ID: {String(p.id)}</Chip> : null}
            </div>

            {externalPostId ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/18 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">Facebook Post</div>
                    <div className="text-xs text-slate-200 break-words">{permalink}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-slate-800 bg-slate-950/25 px-4 py-2 text-[12px] font-semibold text-slate-200 hover:bg-slate-950/35"
                    >
                      🔗 Mở bài
                    </a>
                    <button
                      type="button"
                      onClick={onCopy}
                      className="inline-flex items-center justify-center rounded-full border border-slate-800 bg-slate-950/25 px-4 py-2 text-[12px] font-semibold text-slate-200 hover:bg-slate-950/35"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/14 p-3 text-xs text-slate-500">
                Không đủ dữ liệu để xác minh (chưa có external_post_id).
              </div>
            )}

            {canEmbed ? <FacebookPostEmbed externalPostId={externalPostId} /> : null}

            {errMsg || lastErr ? (
              <div className="rounded-2xl border border-rose-500/22 bg-rose-500/08 p-3 text-xs text-rose-100">
                {errMsg ? <div className="font-semibold">error_message: {errMsg}</div> : null}
                {lastErr ? <div className="opacity-90 mt-1">last_error: {lastErr}</div> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   Create Modal
========================================================= */
function datetimeLocalFromIso(iso) {
  const d = new Date(iso);
  if (!isValidDate(d)) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function toIsoFromDatetimeLocal(v) {
  const d = new Date(v);
  return isValidDate(d) ? d.toISOString() : null;
}

function CreateScheduledPostModal({ open, onClose, shopId, accounts, onCreated, onToast }) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const [provider, setProvider] = useState("facebook");
  const [accountId, setAccountId] = useState("");
  const [content, setContent] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState(() => datetimeLocalFromIso(new Date().toISOString()));
  const [channelId, setChannelId] = useState("");
  const [metadataText, setMetadataText] = useState("{}");

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setErr("");
    setProvider("facebook");
    setAccountId("");
    setContent("");
    setScheduledLocal(datetimeLocalFromIso(new Date(Date.now() + 10 * 60 * 1000).toISOString()));
    setChannelId("");
    setMetadataText("{}");
  }, [open]);

  const providerAccounts = useMemo(() => {
    const list = safeArray(accounts);
    if (!provider) return list;
    const pv = String(provider).toLowerCase();
    return list.filter((a) => {
      const ap = String(a?.provider || a?.platform || "facebook").toLowerCase();
      return ap === pv;
    });
  }, [accounts, provider]);

  const parsedMeta = useMemo(() => parseJsonSafe(metadataText.trim()), [metadataText]);
  const scheduledIso = useMemo(() => toIsoFromDatetimeLocal(scheduledLocal), [scheduledLocal]);

  const canSubmit = !!shopId && !!provider && !!accountId && !!scheduledIso && content.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErr("");

    let channel_id_payload = null;
    const raw = String(channelId || "").trim();
    if (raw) {
      const n = Number(raw);
      channel_id_payload = Number.isFinite(n) ? n : raw;
    }

    try {
      await api.post("/scheduled-posts", {
        shop_id: shopId,
        provider,
        account_id: accountId,
        channel_id: channel_id_payload,
        content: content.trim(),
        scheduled_time: scheduledIso,
        metadata: parsedMeta ?? {},
      });

      onToast?.("Đã tạo scheduled post");
      onCreated?.();
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "POST /scheduled-posts thất bại.";
      setErr(msg);
      onToast?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full max-w-5xl">
        <GlassCard className="overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="warn">✨ Create</Badge>
              <Badge tone="info">Scheduled post</Badge>
              <Badge tone="neutral">Shop: {shopId || "—"}</Badge>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-950/40"
              aria-label="close"
            >
              ✕
            </button>
          </div>

          <Divider />

          <div className="p-6">
            {err ? (
              <div className="mb-4 rounded-2xl border border-rose-900/60 bg-rose-950/30 p-3 text-sm text-rose-200">{err}</div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/16 p-4">
                  <div className="text-sm font-semibold text-slate-100">Composer</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">PROVIDER</div>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
                      >
                        <option value="facebook">facebook</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400 mb-1">PAGE (ACCOUNT_ID)</div>
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
                      >
                        <option value="">— Chọn Page —</option>
                        {providerAccounts.map((a) => {
                          const id = String(a?.account_id || a?.page_id || a?.id || "");
                          const name = a?.name || a?.account_name || a?.page_name || id;
                          return (
                            <option key={id} value={id}>
                              {name} ({id})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-400 mb-1">SCHEDULED TIME</div>
                      <input
                        type="datetime-local"
                        value={scheduledLocal}
                        onChange={(e) => setScheduledLocal(e.target.value)}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-400 mb-1">CONTENT</div>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={6}
                        placeholder="Nhập nội dung bài đăng…"
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none resize-y"
                      />
                    </div>

                    <div>
                      <div className="text-xs text-slate-400 mb-1">CHANNEL_ID (OPTIONAL)</div>
                      <input
                        value={channelId}
                        onChange={(e) => setChannelId(e.target.value)}
                        placeholder="Ví dụ: 1"
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
                      />
                    </div>

                    <div>
                      <div className="text-xs text-slate-400 mb-1">METADATA (JSON)</div>
                      <input
                        value={metadataText}
                        onChange={(e) => setMetadataText(e.target.value)}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/25 p-4">
                  <div className="text-sm font-semibold text-slate-100">Preview</div>
                  <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/20 p-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="neutral">provider: {provider || "—"}</Badge>
                      <Badge tone="info">page: {accountId || "—"}</Badge>
                      <Badge tone="neutral">time: {scheduledIso ? humanTime(toDate(scheduledIso)) : "—"}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap break-words">
                      {content.trim() ? clampText(content.trim(), 300) : "Nội dung sẽ hiện ở đây…"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 break-words">
                      metadata: {parsedMeta ? "valid JSON" : metadataText.trim() ? "invalid JSON" : "—"}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
                    <div className="text-sm font-semibold text-slate-100">Actions</div>
                    <div className="mt-3 flex flex-col gap-2">
                      <PrimaryButton onClick={submit} disabled={!canSubmit} className="w-full justify-center rounded-full">
                        {submitting ? "Đang tạo…" : "🚀 Lên lịch"}
                      </PrimaryButton>
                      <SoftButton onClick={onClose} className="w-full rounded-full">
                        Đóng
                      </SoftButton>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500">Yêu cầu login + PRO + Page token.</div>
                  </div>
                </div>
              </div>
            </div>

            <Divider />

            <div className="relative px-6 py-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">Create scheduled_posts (status=scheduled).</div>
              <div className="flex items-center gap-2">
                <SoftButton onClick={onClose} className="rounded-full px-4">
                  Huỷ
                </SoftButton>
                <PrimaryButton onClick={submit} disabled={!canSubmit} className="rounded-full px-5">
                  Tiếp tục
                </PrimaryButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN
========================================================= */
export default function PostsPage({ activeShop }) {
  const shopId = activeShop?.id ?? null;
  const shopLabel = activeShop?.name || "Chưa chọn shop";

  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("all");
  const [activeSection, setActiveSection] = useState("today");
  const [openRows, setOpenRows] = useState(() => new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState("");

  // ✅ Unified endpoints:
  // - accounts: /facebook/accounts (same as AI Studio)
  // - scheduled_posts: /scheduled-posts (same as AI Studio)
  const loadAccounts = useCallback(async () => {
    if (!shopId) return;
    setLoadingAccounts(true);
    try {
      const res = await api.get("/facebook/accounts", { params: { shop_id: shopId } });
      setAccounts(safeArray(pickData(res)));
    } catch {
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }, [shopId]);

  const loadScheduledPosts = useCallback(async () => {
    if (!shopId) return;
    setLoadingPosts(true);
    setError("");
    try {
      const res = await api.get("/scheduled-posts", { params: { shop_id: shopId } });
      setScheduledPosts(safeArray(pickData(res)));
    } catch {
      setError("Không tải được scheduled_posts (cần login + PRO)");
      setScheduledPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, [shopId]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadAccounts(), loadScheduledPosts()]);
  }, [loadAccounts, loadScheduledPosts]);

  useEffect(() => {
    if (!shopId) return;
    loadAll();
  }, [shopId, loadAll]);

  const stats = useMemo(() => {
    const by = (s) => safeArray(scheduledPosts).filter((i) => String(i?.status || "") === s).length;
    return {
      total: safeArray(scheduledPosts).length,
      scheduled: by("scheduled"),
      processing: by("processing"),
      retrying: by("retrying"),
      posted: by("posted"),
      failed: by("failed"),
      dead: by("dead"),
      cancelled: by("cancelled"),
    };
  }, [scheduledPosts]);

  const filteredItems = useMemo(() => {
    let arr = safeArray(scheduledPosts);
    if (status !== "all") arr = arr.filter((p) => String(p?.status || "") === status);
    return arr;
  }, [scheduledPosts, status]);

  const timeline = useMemo(() => buildTimeline(filteredItems), [filteredItems]);

  const sectionCounts = useMemo(
    () => ({
      today: countMapItems(timeline.today),
      upcoming: countMapItems(timeline.upcoming),
      past: countMapItems(timeline.past),
      unknown: countMapItems(timeline.unknown),
    }),
    [timeline]
  );

  const resetAll = () => {
    setStatus("all");
    setOpenRows(new Set());
  };

  const readyState = error ? "Error" : loadingPosts || loadingAccounts ? "Loading" : "Ready";

  const toggleRow = (id) => {
    if (!id) return;
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeAllRows = () => setOpenRows(new Set());

  const onChangeSection = (k) => {
    setActiveSection(k);
    closeAllRows();
  };

  const listForSection = useMemo(() => {
    if (activeSection === "today") return timeline.today;
    if (activeSection === "upcoming") return timeline.upcoming;
    if (activeSection === "past") return timeline.past;
    return timeline.unknown;
  }, [activeSection, timeline]);

  const sectionTitle = useMemo(() => {
    if (activeSection === "today") return { title: "Today", sub: "Theo scheduled_time (fallback created_at)" };
    if (activeSection === "upcoming") return { title: "Upcoming", sub: "Theo scheduled_time" };
    if (activeSection === "past") return { title: "Past", sub: "Theo scheduled_time (fallback created_at)" };
    return { title: "Unknown", sub: "Không xác định thời gian" };
  }, [activeSection]);

  const accountsOkCount = useMemo(() => safeArray(accounts).filter((a) => !!(a?.access_token || a?.token)).length, [accounts]);
  const accountsBadCount = useMemo(() => safeArray(accounts).filter((a) => !(a?.access_token || a?.token)).length, [accounts]);

  return (
    <div className="space-y-4">
      <Toast text={toast} onClose={() => setToast("")} />

      {/* HEADER */}
      <GlassCard className="p-0">
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex gap-2 items-center flex-wrap">
            <Badge tone="indigo">🗓️ Auto Posts</Badge>
            <Badge>🏪 {shopLabel}</Badge>
            <Badge tone={error ? "bad" : loadingPosts || loadingAccounts ? "info" : "ok"}>{readyState}</Badge>
            <Chip>Total: {fmtCount(stats.total)}</Chip>
          </div>

          <div className="flex items-center gap-2">
            <SoftButton tone="neutral" onClick={loadAll} disabled={!shopId || loadingPosts || loadingAccounts}>
              ⟳ Reload
            </SoftButton>
          </div>
        </div>
      </GlassCard>

      {/* TOP GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* LEFT */}
        <GlassCard className="lg:col-span-2 p-0 self-start">
          <div className="bg-slate-950/14 h-full">
            <div className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="warn">✨ Dashboard v3</Badge>
                  <Badge tone="info">Timeline</Badge>
                  <Badge tone="ok">PRO gated</Badge>
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-100">Quản lý bài auto post</div>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0 whitespace-nowrap">
                <PrimaryButton onClick={() => setCreateOpen(true)} disabled={!shopId} className="whitespace-nowrap">
                  ✍️ Tạo bài
                </PrimaryButton>
                <span className="text-xs text-slate-500 hidden sm:inline">Mở composer</span>
              </div>
            </div>

            <Divider />

            <div className="px-5 py-4 space-y-3">
              <div className="text-xs text-slate-400">STATUS</div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <StatusPills value={status} onChange={setStatus} stats={stats} />
                <SoftButton tone="neutral" onClick={resetAll}>
                  Reset
                </SoftButton>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* RIGHT (Health checks) */}
        <GlassCard className="lg:col-span-1 p-0 self-start">
          <div className="bg-slate-950/14">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">Health checks</div>
                <div className="text-xs text-slate-400">Token status từ /facebook/accounts</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="ok">OK: {fmtCount(accountsOkCount)}</Badge>
                <Badge tone="bad">Bad: {fmtCount(accountsBadCount)}</Badge>
              </div>
            </div>

            <div className="h-px w-full bg-slate-800/70" />

            <div className="p-5 space-y-3">
              {!shopId ? (
                <div className="text-sm text-slate-500">Không đủ dữ liệu để xác minh (chưa chọn shop).</div>
              ) : loadingAccounts ? (
                <div className="text-sm text-slate-400">Đang tải…</div>
              ) : accounts.length === 0 ? (
                <div className="text-sm text-slate-500">Chưa có account.</div>
              ) : (
                <div className="space-y-2">
                  {accounts.map((a) => {
                    const ok = !!(a?.access_token || a?.token);
                    const name = a?.name || a?.account_name || a?.page_name || "—";
                    const key = String(a?.id || a?.account_id || a?.page_id || name);
                    return (
                      <div key={key} className="rounded-2xl border border-slate-800 bg-slate-950/14 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("h-2 w-2 rounded-full", ok ? "bg-emerald-400" : "bg-rose-400")} />
                              <div className="text-sm font-semibold text-slate-100 truncate">{name}</div>
                              <Badge tone="neutral">facebook</Badge>
                            </div>
                            <div className="mt-1 text-xs text-slate-500 truncate">{ok ? "access_token tồn tại" : "thiếu token"}</div>
                          </div>
                          <Badge tone={ok ? "ok" : "bad"}>{ok ? "Ready" : "Reconnect"}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* SECTION TABS + CONTENT */}
      <GlassCard className="p-0">
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100">Timeline</div>
            <div className="text-xs text-slate-400">Chọn 1 mục để xem nội dung</div>
          </div>

          <div className="flex items-center gap-2">
            <SoftButton onClick={closeAllRows}>Đóng tất cả</SoftButton>
          </div>
        </div>

        <Divider />

        <div className="px-5 py-4">
          <SectionTabs value={activeSection} onChange={onChangeSection} counts={sectionCounts} />
        </div>

        <Divider />

        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">{sectionTitle.title}</div>
              <div className="text-xs text-slate-400">{sectionTitle.sub}</div>
            </div>
            <Badge tone="neutral">{fmtCount(sectionCounts[activeSection])}</Badge>
          </div>

          <div className="mt-4">
            {activeSection === "unknown" ? (
              safeArray(listForSection.get("unknown")).length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/18 p-4 text-sm text-slate-400">Không có item Unknown.</div>
              ) : (
                <div className="space-y-3">
                  {safeArray(listForSection.get("unknown")).map((p) => {
                    const id = p?.id ? String(p.id) : `tmp-${Math.random()}`;
                    const open = openRows.has(id);
                    return <PostAccordionRow key={id} p={p} isOpen={open} onToggle={() => toggleRow(id)} onToast={setToast} />;
                  })}
                </div>
              )
            ) : Array.from(listForSection.entries()).length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/18 p-4 text-sm text-slate-400">
                Không có bài nào trong {sectionTitle.title}.
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(listForSection.entries()).map(([day, arr]) => {
                  const dayDate = toDate(day) || null;
                  return (
                    <div key={day} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Chip>{dayDate ? humanDate(dayDate) : day}</Chip>
                        <Badge tone="neutral">{fmtCount(arr.length)}</Badge>
                      </div>

                      <div className="space-y-3">
                        {safeArray(arr).map((p) => {
                          const id = p?.id ? String(p.id) : `tmp-${Math.random()}`;
                          const open = openRows.has(id);
                          return <PostAccordionRow key={id} p={p} isOpen={open} onToggle={() => toggleRow(id)} onToast={setToast} />;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <CreateScheduledPostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        shopId={shopId}
        accounts={accounts}
        onCreated={loadScheduledPosts}
        onToast={setToast}
      />
    </div>
  );
}
