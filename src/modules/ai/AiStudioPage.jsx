// src/modules/ai/AiStudioPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../auth/AuthContext.jsx";

const tones = ["Thân thiện", "Chuyên gia", "Hài hước", "Thuyết phục", "Ngắn gọn"];
const platforms = ["Facebook", "Instagram", "TikTok", "Zalo", "Generic"];

// Tags để nhận diện “ảnh marketing” trong Media
// Nếu backend bạn đang tag khác, chỉnh list này để match đúng.
const MARKETING_TAGS = ["marketing", "marketing_asset", "marketing_composed", "composed", "poster"];

function Pill({ children, tone = "slate" }) {
  const map = {
    slate: "bg-slate-900/60 text-slate-200 border-slate-800/60",
    indigo: "bg-indigo-950/45 text-indigo-200 border-indigo-900/40",
    green: "bg-emerald-950/45 text-emerald-200 border-emerald-900/40",
    red: "bg-rose-950/45 text-rose-200 border-rose-900/40",
    yellow: "bg-amber-950/45 text-amber-200 border-amber-900/40",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${map[tone] || map.slate}`}>
      {children}
    </span>
  );
}

function StatTile({ label, value, hint, right }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400">{label}</div>
          <div className="mt-0.5 text-lg font-semibold text-white">{value}</div>
          {hint ? <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl" />
    </div>
  );
}

function SectionShell({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/55 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-slate-400">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function pad2(n) {
  return String(n).padStart(2, "0");
}
function defaultDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function buildLocalDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  return dt.toISOString();
}
function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
function historyKey(shopId) {
  return `aiStudioHistory:${shopId}`;
}
function coerceToText(any) {
  if (typeof any === "string") return any;
  try {
    return JSON.stringify(any);
  } catch {
    return String(any);
  }
}
function truncateText(s, max = 140) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}
function extractIdeaLines(raw) {
  let text = coerceToText(raw).trim();
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      const obj = JSON.parse(text);
      if (Array.isArray(obj)) return obj.map((x) => String(x).trim()).filter(Boolean);
      if (obj && typeof obj === "object") {
        const list = obj.ideas || obj.items || obj.suggestions || obj.posts;
        if (Array.isArray(list)) return list.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {}
  }
  return text
    .split("\n")
    .map((x) => x.replace(/^\s*[-*\d.)]+\s*/, "").trim())
    .filter(Boolean);
}

function normalizeFacebookAccountsResponse(resData) {
  if (Array.isArray(resData)) return resData;
  if (resData && typeof resData === "object") {
    if (Array.isArray(resData.data)) return resData.data;
    if (resData.data && typeof resData.data === "object" && Array.isArray(resData.data.data)) return resData.data.data;
  }
  return [];
}
function getAccountPid(a) {
  return String(a?.account_id || a?.page_id || a?.id || "");
}
function normalizePlatformToProvider(platform) {
  const p = String(platform || "").toLowerCase();
  if (p.includes("facebook")) return "facebook";
  return "facebook";
}
function safeGetPlannerId(res) {
  return res?.data?.data?.id ?? res?.data?.id ?? null;
}
function extractScheduledPostsList(resData) {
  if (Array.isArray(resData)) return resData;
  if (resData && typeof resData === "object") {
    if (Array.isArray(resData.data)) return resData.data;
    if (Array.isArray(resData?.data?.data)) return resData.data.data;
  }
  return [];
}
function getPlannerIdFromScheduledPost(row) {
  const m = row?.metadata;
  if (!m) return null;
  if (typeof m === "string") {
    const obj = safeJsonParse(m, null);
    return obj?.planner_id ?? null;
  }
  if (typeof m === "object") return m?.planner_id ?? null;
  return null;
}

const UI_TONE_TO_PROMPT = {
  "Thân thiện": "thân thiện, rõ ràng, tự nhiên, tập trung lợi ích cho khách hàng",
  "Chuyên gia": "chuyên gia, có dẫn chứng ngắn gọn, chuyên nghiệp, tư vấn rõ ràng",
  "Hài hước": "hài hước vừa phải, dễ đọc, không phản cảm, vẫn tập trung bán hàng",
  "Thuyết phục": "thuyết phục, CTA rõ, nhấn mạnh ưu đãi/điểm khác biệt, ngắn gọn",
  "Ngắn gọn": "ngắn gọn, súc tích, dễ quét, CTA 1 dòng",
};

function computeTonePrompt({ mode, uiTone, customTone, defaultTone }) {
  if (mode === "custom") {
    const t = String(customTone || "").trim();
    if (t) return t;
  }
  const mapped = UI_TONE_TO_PROMPT[String(uiTone || "").trim()];
  if (mapped) return mapped;
  const def = String(defaultTone || "").trim();
  if (def) return def;
  return "thân thiện, rõ ràng, tập trung bán hàng";
}

function hasAnyTag(assetTags, wanted) {
  if (!Array.isArray(assetTags)) return false;
  const set = new Set(assetTags.map((x) => String(x).toLowerCase()));
  return wanted.some((t) => set.has(String(t).toLowerCase()));
}

function getAssetPreviewUrl(a) {
  return (
    a?.public_url ||
    a?.url ||
    a?.asset_url ||
    a?.original_url ||
    a?.cutout_url ||
    a?.signed_url ||
    a?.download_url ||
    ""
  );
}

/** Modal giống kiểu “Tạo bài” ở Posts (backdrop + card giữa màn hình) */
function ModalShell({ open, title, subtitle, right, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onMouseDown={onClose} />
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/70 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/70 bg-gradient-to-r from-indigo-950/35 via-slate-950/45 to-emerald-950/25 p-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{title}</div>
            {subtitle ? <div className="mt-0.5 text-xs text-slate-300">{subtitle}</div> : null}
          </div>
          <div className="flex items-center gap-2">
            {right ? <div className="hidden sm:block">{right}</div> : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="max-h-[calc(100vh-140px)] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export default function AiStudioPage({ activeShop }) {
  const nav = useNavigate();
  const { user, limits, refreshMe } = useAuth();

  const [form, setForm] = useState({
    brief: "",
    tone: tones[0],
    platform: platforms[0],
  });

  // preferences
  const [shopPrefs, setShopPrefs] = useState(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState("");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefsDraft, setPrefsDraft] = useState({ target_posts_per_week: 14, default_tone: "" });

  const [toneMode, setToneMode] = useState("preset"); // preset | custom
  const [customTone, setCustomTone] = useState("");

  async function loadPreferences(shopId) {
    if (!shopId) return;
    setPrefsLoading(true);
    setPrefsError("");
    try {
      const res = await api.get(`/shops/${shopId}/preferences`);
      const data = res?.data?.data ?? res?.data;
      setShopPrefs(data || null);

      const defTone = String(data?.default_tone || "").trim();
      setPrefsDraft({
        target_posts_per_week: Number(data?.target_posts_per_week ?? 14),
        default_tone: defTone,
      });
      setCustomTone((prev) => (prev ? prev : defTone));
    } catch (e) {
      setShopPrefs(null);
      setPrefsError(e?.response?.data?.message || "Không load được preferences.");
    } finally {
      setPrefsLoading(false);
    }
  }

  useEffect(() => {
    if (!activeShop?.id) return;
    loadPreferences(activeShop.id).catch(() => {});
  }, [activeShop?.id]);

  // result + audit
  const [aiText, setAiText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const [audit, setAudit] = useState([]);
  const auditRef = useRef(null);

  function pushAudit(level, text) {
    const item = { id: `${Date.now()}-${Math.random()}`, ts: new Date().toISOString(), level, text: String(text || "") };
    setAudit((prev) => [item, ...prev].slice(0, 200));
    if (activeShop?.id) {
      try {
        const raw = localStorage.getItem(historyKey(activeShop.id));
        const arr = raw ? safeJsonParse(raw, []) : [];
        localStorage.setItem(historyKey(activeShop.id), JSON.stringify([item, ...(Array.isArray(arr) ? arr : [])].slice(0, 50)));
      } catch {}
    }
  }

  function clearAudit() {
    setAudit([]);
  }

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!auditRef.current) return;
    auditRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [audit.length]);

  // limits
  function prettyAiRemaining() {
    const remaining =
      limits?.aiRemaining ??
      limits?.ai?.remaining ??
      (typeof limits?.ai?.limit === "number" && typeof limits?.ai?.used === "number"
        ? Math.max(0, limits.ai.limit - limits.ai.used)
        : null);
    const used = limits?.aiUsed ?? limits?.ai?.used ?? null;
    if (remaining == null && used == null) return "Không rõ";
    if (remaining != null) return `${remaining}`;
    return `${used ?? ""}`;
  }

  const canGenerate = useMemo(() => {
    const remaining =
      limits?.aiRemaining ??
      limits?.ai?.remaining ??
      (typeof limits?.ai?.limit === "number" && typeof limits?.ai?.used === "number"
        ? Math.max(0, limits.ai.limit - limits.ai.used)
        : null);
    if (remaining == null) return true;
    return remaining > 0;
  }, [limits]);

  // facebook pages
  const [fbAccounts, setFbAccounts] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");

  async function loadFacebookAccounts(shopId, { keepSelection = true } = {}) {
    if (!shopId) {
      setFbAccounts([]);
      setSelectedPageId("");
      return;
    }
    try {
      const res = await api.get("/facebook/accounts", { params: { shop_id: shopId } });
      const list = normalizeFacebookAccountsResponse(res?.data);
      setFbAccounts(list);

      const current = keepSelection ? selectedPageId : "";
      const hasCurrent = current && list.some((a) => getAccountPid(a) === String(current));
      if (hasCurrent) return;

      const firstPid = list.length ? getAccountPid(list[0]) : "";
      setSelectedPageId(firstPid || "");
    } catch {
      setFbAccounts([]);
      setSelectedPageId("");
    }
  }

  useEffect(() => {
    const handler = () => {
      if (!activeShop?.id) return;
      loadFacebookAccounts(activeShop.id, { keepSelection: true }).catch(() => {});
    };
    window.addEventListener("focus", handler);
    document.addEventListener("visibilitychange", handler);
    return () => {
      window.removeEventListener("focus", handler);
      document.removeEventListener("visibilitychange", handler);
    };
  }, [activeShop?.id, selectedPageId]);

  // media topics/assets -> marketing list
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  const marketingList = useMemo(() => {
    const arr = Array.isArray(assets) ? assets : [];
    return arr.filter((a) => hasAnyTag(a?.tags, MARKETING_TAGS));
  }, [assets]);

  const [selectedMarketingId, setSelectedMarketingId] = useState("");

  useEffect(() => {
    if (!marketingList.length) {
      setSelectedMarketingId("");
      return;
    }
    setSelectedMarketingId((prev) =>
      prev && marketingList.some((x) => String(x.id) === String(prev)) ? prev : String(marketingList[0].id)
    );
  }, [marketingList]);

  const selectedMarketingAsset = useMemo(() => {
    if (!selectedMarketingId) return null;
    return marketingList.find((a) => String(a.id) === String(selectedMarketingId)) || null;
  }, [marketingList, selectedMarketingId]);

  const selectedMarketingUrl = useMemo(() => getAssetPreviewUrl(selectedMarketingAsset), [selectedMarketingAsset]);

  async function loadTopicsAndAssets(shopId, maybeTopicId = null) {
    if (!shopId) return;
    setMediaLoading(true);
    setError("");
    try {
      const tRes = await api.get("/media/topics", { params: { shop_id: shopId } });
      const list = Array.isArray(tRes?.data?.data) ? tRes.data.data : [];
      setTopics(list);

      const chosen = maybeTopicId || (list[0]?.id ?? null);
      setTopicId(chosen);

      if (!chosen) {
        setAssets([]);
        setSelectedMarketingId("");
        return;
      }

      const aRes = await api.get(`/media/topics/${chosen}/assets`, { params: { shop_id: shopId } });
      const arr = Array.isArray(aRes?.data?.data) ? aRes.data.data : [];
      setAssets(arr);

      const marketing = arr.filter((x) => hasAnyTag(x?.tags, MARKETING_TAGS));
      setSelectedMarketingId(marketing[0]?.id ? String(marketing[0].id) : "");
    } catch (e) {
      setError(e?.response?.data?.message || "Không load được media topics/assets.");
      setTopics([]);
      setTopicId(null);
      setAssets([]);
      setSelectedMarketingId("");
    } finally {
      setMediaLoading(false);
    }
  }

  // save planner (MODAL)
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveDraft, setSaveDraft] = useState({
    title: "",
    dateStr: defaultDateStr(),
    timeStr: "09:00",
    status: "Idea", // Idea | Scheduled
  });

  function openSave() {
    if (!aiText) return;
    const firstLine = String(aiText).split("\n")[0] || "";
    setSaveDraft((d) => ({ ...d, title: truncateText(firstLine, 60) }));
    setSaveOpen(true);
  }

  async function savePlanner() {
    if (!activeShop?.id) return setError("Bạn cần chọn shop.");
    if (!aiText) return setError("Chưa có nội dung để lưu.");

    const scheduledIso = buildLocalDate(saveDraft.dateStr, saveDraft.timeStr);
    if (!scheduledIso) return setError("Ngày/giờ không hợp lệ.");

    const platform = String(form.platform || "").trim();
    if (!platform) return setError("Thiếu platform.");

    const wantsAutoPost = saveDraft.status === "Scheduled";
    if (wantsAutoPost && !selectedPageId) return setError("Chưa chọn Facebook Page.");
    // FIX: AutoPost cần ảnh marketing để attach
    if (wantsAutoPost && !selectedMarketingId) return setError("Chưa chọn ảnh marketing.");

    setLoading(true);
    setError("");

    try {
      const payloadPlanner = {
        shop_id: activeShop.id,
        title: saveDraft.title || "AI Idea",
        idea: aiText,
        status: saveDraft.status,
        scheduled_at: scheduledIso,
        platform,
        // optional: lưu trace marketing vào planner (backend có thể ignore nếu schema không dùng)
        marketing_asset_id: selectedMarketingId ? String(selectedMarketingId) : null,
      };

      pushAudit("info", "Đang lưu Planner…");
      const r1 = await api.post("/planner", payloadPlanner, { headers: { "x-shop-id": String(activeShop.id) } });

      const plannerId = safeGetPlannerId(r1);
      if (!plannerId) {
        setSaveOpen(false);
        setNotice("Đã lưu Planner ✅");
        pushAudit("ok", "Đã lưu Planner (không lấy được planner_id).");
        return;
      }

      if (wantsAutoPost) {
        const provider = normalizePlatformToProvider(platform);

        let alreadyExists = false;
        try {
          const rList = await api.get("/scheduled-posts", {
            params: { shop_id: activeShop.id },
            headers: { "x-shop-id": String(activeShop.id) },
          });
          const list = extractScheduledPostsList(rList?.data);
          alreadyExists = list.some((row) => String(getPlannerIdFromScheduledPost(row)) === String(plannerId));
        } catch {}

        if (!alreadyExists) {
          pushAudit("info", "Đang tạo scheduled_post…");
          const payloadScheduled = {
            shop_id: activeShop.id,
            provider,
            account_id: String(selectedPageId),
            content: aiText,
            scheduled_time: scheduledIso,
            // FIX: truyền marketing_asset_id để backend/scheduler attach ảnh
            metadata: {
              planner_id: plannerId,
              marketing_asset_id: String(selectedMarketingId),
              marketing_url: selectedMarketingUrl || null, // debug/support (backend có thể ignore)
            },
          };
          await api.post("/scheduled-posts", payloadScheduled, { headers: { "x-shop-id": String(activeShop.id) } });
          pushAudit("ok", `Đã tạo scheduled_post (planner_id=${plannerId}).`);
          setNotice("Đã lưu Planner + Auto Post ✅");
        } else {
          pushAudit("ok", `scheduled_post đã tồn tại (planner_id=${plannerId}).`);
          setNotice("Đã lưu Planner ✅");
        }
      } else {
        pushAudit("ok", `Đã lưu Planner (planner_id=${plannerId}).`);
        setNotice("Đã lưu Planner ✅");
      }

      setSaveOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Lỗi khi lưu Planner.";
      setError(msg);
      pushAudit("error", `Lỗi lưu Planner/auto post: ${msg}`);
    } finally {
      setLoading(false);
      refreshMe?.();
    }
  }

  // prefs save
  async function savePreferences() {
    if (!activeShop?.id) return;
    const target = Number(prefsDraft.target_posts_per_week);
    const tone = String(prefsDraft.default_tone || "").trim();

    if (!Number.isFinite(target) || target < 1 || target > 100) {
      setPrefsError("target_posts_per_week phải là số nguyên 1–100.");
      return;
    }
    if (!tone || tone.length > 300) {
      setPrefsError("default_tone không rỗng và tối đa 300 ký tự.");
      return;
    }

    setPrefsLoading(true);
    setPrefsError("");
    try {
      const res = await api.put(`/shops/${activeShop.id}/preferences`, {
        target_posts_per_week: target,
        default_tone: tone,
      });
      const data = res?.data?.data ?? res?.data;
      setShopPrefs(data || null);
      setPrefsOpen(false);
      setNotice("Đã lưu preferences ✅");
      setCustomTone((prev) => (prev ? prev : tone));
    } catch (e) {
      setPrefsError(e?.response?.data?.message || "Lỗi lưu preferences.");
    } finally {
      setPrefsLoading(false);
    }
  }

  // actions
  function copyResult() {
    if (!aiText) return;
    navigator.clipboard.writeText(aiText).catch(() => {});
    setNotice("Đã copy ✅");
  }

  function gotoPlanner() {
    nav("/planner");
  }
  function gotoPosts() {
    nav("/posts");
  }
  function gotoMedia() {
    nav("/media");
  }
  function refreshAll() {
    refreshMe?.();
    if (activeShop?.id) {
      loadFacebookAccounts(activeShop.id, { keepSelection: true }).catch(() => {});
      loadTopicsAndAssets(activeShop.id, topicId).catch(() => {});
    }
    setNotice("Đã refresh ✅");
  }

  // init when shop changes
  useEffect(() => {
    if (!activeShop?.id) return;

    setSelectedPageId("");
    setFbAccounts([]);
    setTopicId(null);
    setTopics([]);
    setAssets([]);
    setSelectedMarketingId("");
    setAiText("");
    setError("");
    setNotice("");
    setSaveOpen(false);

    loadFacebookAccounts(activeShop.id, { keepSelection: false }).catch(() => {});
    loadTopicsAndAssets(activeShop.id).catch(() => {});
  }, [activeShop?.id]);

  // generate
  async function generateOne({ topicId, assetId = null }) {
    if (!activeShop?.id) return setError("Bạn cần chọn shop.");
    const base = (form.brief || "").trim();
    if (!base) return setError("Bạn hãy nhập brief.");
    if (!canGenerate) return setError("Bạn đã hết lượt AI hôm nay.");

    setLoading(true);
    setError("");
    setAiText("");
    pushAudit("info", "Bắt đầu tạo 1 bài…");

    try {
      const tonePrompt = computeTonePrompt({
        mode: toneMode,
        uiTone: form.tone,
        customTone,
        defaultTone: shopPrefs?.default_tone,
      });

      const payload = {
        topic: base,
        tone: tonePrompt,
        platform: form.platform,
        topic_id: topicId,
        asset_id: assetId, // marketing asset id
        shop_id: activeShop.id,
      };

      const res = await api.post("/ai/compose", payload, { headers: { "x-shop-id": String(activeShop.id) } });

      const data = res?.data?.data ?? res?.data;
      const lines = extractIdeaLines(data);
      const summary = lines.length ? lines.join("\n") : coerceToText(data);

      setAiText(summary);
      setNotice("Đã tạo ✅");
      pushAudit("ok", "Hoàn tất tạo 1 bài.");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Lỗi khi tạo 1 bài.";
      setError(msg);
      pushAudit("error", `Lỗi tạo 1 bài: ${msg}`);
    } finally {
      setLoading(false);
      refreshMe?.();
    }
  }

  async function generate() {
    if (!selectedMarketingId) return setError("Chưa chọn ảnh marketing.");
    await generateOne({ topicId, assetId: selectedMarketingId });
  }

  async function generate7Days() {
    if (!activeShop?.id) return setError("Bạn cần chọn shop.");
    const productName = (form.brief || "").trim();
    if (!productName) return setError("Bạn hãy nhập brief (tên sản phẩm/ưu đãi) để tạo chiến dịch 7 ngày.");
    if (!canGenerate) return setError("Bạn đã hết lượt AI hôm nay.");
    if (!selectedPageId) return setError("Chưa chọn Facebook Page.");
    if (!selectedMarketingId) return setError("Chưa chọn ảnh marketing.");

    setLoading(true);
    setError("");
    setAiText("");
    pushAudit("info", "Đang chạy pipeline 7 ngày…");

    try {
      const res = await api.post(
        "/ai/push-7d",
        {
          shop_id: activeShop.id,
          account_id: String(selectedPageId),
          marketing_asset_id: String(selectedMarketingId),
          product_name: productName,
        },
        { headers: { "x-shop-id": String(activeShop.id) } }
      );

      const payload = res?.data?.data ?? res?.data ?? {};
      const total = payload?.total_planned ?? payload?.totalPlanned ?? null;
      const scheduled = payload?.scheduled ?? (Array.isArray(payload?.posts) ? payload.posts.length : null);
      const skipped = payload?.skipped ?? (Array.isArray(payload?.skipped_items) ? payload.skipped_items.length : null);

      const summary = [
        "✅ Hoàn tất",
        total != null ? `- Planned: ${total}` : null,
        scheduled != null ? `- Scheduled (PASS): ${scheduled}` : null,
        skipped != null ? `- Skipped (FAIL): ${skipped}` : null,
        `- Marketing: ${selectedMarketingId}`,
        `- Page: ${selectedPageId}`,
      ]
        .filter(Boolean)
        .join("\n");

      setAiText(summary);
      setNotice("Hoàn tất ✅");
      pushAudit("ok", "Hoàn tất push-7d.");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Lỗi khi chạy pipeline 7 ngày.";
      setError(msg);
      pushAudit("error", `Lỗi push-7d: ${msg}`);
    } finally {
      setLoading(false);
      refreshMe?.();
    }
  }

  // header derived
  const shopLabel = activeShop?.id ? activeShop?.name || `Shop ${activeShop.id}` : "Chưa chọn shop";
  const remainingLabel = prettyAiRemaining();
  const targetPerWeek = Number(shopPrefs?.target_posts_per_week ?? 14);
  const defaultTone = String(shopPrefs?.default_tone || "").trim();

  const effectiveTonePreview = useMemo(() => {
    const t = computeTonePrompt({ mode: toneMode, uiTone: form.tone, customTone, defaultTone });
    return truncateText(t, 120);
  }, [toneMode, form.tone, customTone, defaultTone]);

  const nextAction = useMemo(() => {
    if (!activeShop?.id) return "Chọn shop để bắt đầu.";
    if (!selectedPageId) return "Chọn Facebook Page.";
    if (!selectedMarketingId) return "Chọn ảnh marketing từ Media.";
    if (!form.brief.trim()) return "Nhập brief (tên sản phẩm/ưu đãi).";
    return "Tạo 1 bài hoặc chạy 7 ngày.";
  }, [activeShop?.id, selectedPageId, selectedMarketingId, form.brief]);

  const marketingCountLabel = useMemo(() => {
    if (!activeShop?.id) return "—";
    if (mediaLoading) return "…";
    return `${marketingList.length}`;
  }, [activeShop?.id, mediaLoading, marketingList.length]);

  const modalPreview = useMemo(() => {
    const title = (saveDraft.title || "").trim();
    const when = buildLocalDate(saveDraft.dateStr, saveDraft.timeStr);
    const provider = normalizePlatformToProvider(form.platform);
    const page = selectedPageId ? String(selectedPageId) : "";
    const marketingName = selectedMarketingAsset?.filename || selectedMarketingAsset?.name || selectedMarketingId || "";
    return {
      title: title || "AI Idea",
      status: saveDraft.status,
      scheduled_at: when,
      platform: form.platform,
      provider,
      account_id: page || "—",
      marketing: marketingName ? truncateText(marketingName, 52) : "—",
      content: truncateText(aiText, 260),
    };
  }, [saveDraft, aiText, form.platform, selectedPageId, selectedMarketingId, selectedMarketingAsset]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      {/* HERO giống Dashboard */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-r from-indigo-950/50 via-slate-950/50 to-emerald-950/40 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Pill tone="slate">AI STUDIO</Pill>
              <Pill tone={canGenerate ? "green" : "red"}>{canGenerate ? "AI: Available" : "AI: Limit"}</Pill>
              <Pill tone="indigo">Target/wk: {Number.isFinite(targetPerWeek) ? targetPerWeek : "—"}</Pill>
            </div>
            <div className="mt-2 text-xl font-semibold text-white">{shopLabel}</div>
            <div className="mt-1 text-xs text-slate-300">
              Tạo nội dung + chọn ảnh marketing → lưu Planner → (tuỳ chọn) Auto Post.
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone="indigo">AI remaining: {remainingLabel}</Pill>
              {user?.email ? <Pill tone="slate">{user.email}</Pill> : null}
              <Pill tone="slate">Tone: {effectiveTonePreview}</Pill>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
              disabled={!activeShop?.id}
            >
              Preferences
            </button>
            <button
              type="button"
              onClick={refreshAll}
              className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={gotoPlanner}
              className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            >
              Planner
            </button>
            <button
              type="button"
              onClick={gotoPosts}
              className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            >
              Posts
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Next best action"
            value={truncateText(nextAction, 34)}
            hint="Gợi ý thao tác tiếp theo theo trạng thái hiện tại."
            right={<Pill tone="slate">AI</Pill>}
          />
          <StatTile
            label="Marketing assets"
            value={marketingCountLabel}
            hint={`Theo tags: ${MARKETING_TAGS.join(", ")}`}
          />
          <StatTile
            label="Selected page"
            value={selectedPageId ? truncateText(selectedPageId, 18) : "—"}
            hint="Dùng cho 7 ngày / auto post."
          />
        </div>

        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {notice ? (
        <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-900/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      {/* Preferences */}
      {prefsOpen ? (
        <div className="rounded-3xl border border-slate-800/70 bg-slate-950/55 p-4 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Shop Preferences</div>
              <div className="mt-0.5 text-xs text-slate-400">Target/tuần + default tone theo shop.</div>
            </div>
            <button
              type="button"
              onClick={() => setPrefsOpen(false)}
              className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            >
              Close
            </button>
          </div>

          {prefsError ? (
            <div className="mb-2 rounded-2xl border border-rose-900/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
              {prefsError}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-slate-300">Target posts / week</div>
              <input
                type="number"
                min={1}
                max={100}
                value={prefsDraft.target_posts_per_week}
                onChange={(e) => setPrefsDraft((d) => ({ ...d, target_posts_per_week: e.target.value }))}
                className="ui-field w-full"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-300">Default tone</div>
              <textarea
                rows={4}
                value={prefsDraft.default_tone}
                onChange={(e) => setPrefsDraft((d) => ({ ...d, default_tone: e.target.value }))}
                className="ui-field w-full"
                placeholder="VD: thân thiện, rõ ràng, tập trung bán hàng, CTA 1 dòng"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={savePreferences}
              disabled={prefsLoading || !activeShop?.id}
              className="rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {prefsLoading ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => loadPreferences(activeShop?.id)}
              disabled={prefsLoading || !activeShop?.id}
              className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
            >
              Reload
            </button>
          </div>
        </div>
      ) : null}

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT */}
        <div className="space-y-4">
          <SectionShell
            title="Composer"
            subtitle="Thiết lập tone/platform + chọn Page."
            right={
              <div className="flex items-center gap-2">
                <Pill tone={loading ? "yellow" : "slate"}>{loading ? "Running…" : "Ready"}</Pill>
                <button
                  type="button"
                  onClick={clearAudit}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900"
                >
                  Clear log
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-slate-300">Tone mode</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs ${
                      toneMode === "preset"
                        ? "border-indigo-900/40 bg-indigo-950/40 text-indigo-200"
                        : "border-slate-800/60 bg-slate-950/40 text-slate-200"
                    }`}
                    onClick={() => setToneMode("preset")}
                    disabled={loading}
                  >
                    Preset
                  </button>
                  <button
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs ${
                      toneMode === "custom"
                        ? "border-indigo-900/40 bg-indigo-950/40 text-indigo-200"
                        : "border-slate-800/60 bg-slate-950/40 text-slate-200"
                    }`}
                    onClick={() => setToneMode("custom")}
                    disabled={loading}
                  >
                    Custom (shop default)
                  </button>
                </div>
              </div>

              {toneMode === "preset" ? (
                <div>
                  <div className="mb-1 text-xs text-slate-300">Preset tone</div>
                  <div className="flex flex-wrap gap-2">
                    {tones.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs ${
                          form.tone === t
                            ? "border-indigo-900/40 bg-indigo-950/40 text-indigo-200"
                            : "border-slate-800/60 bg-slate-950/40 text-slate-200"
                        }`}
                        onClick={() => setForm((f) => ({ ...f, tone: t }))}
                        disabled={loading}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-1 text-xs text-slate-300">Custom tone</div>
                  <textarea
                    rows={4}
                    value={customTone}
                    onChange={(e) => setCustomTone(e.target.value)}
                    className="ui-field w-full"
                    disabled={loading}
                    placeholder={defaultTone || "VD: thân thiện, rõ ràng, tập trung bán hàng, CTA 1 dòng"}
                  />
                </div>
              )}

              <div>
                <div className="mb-1 text-xs text-slate-300">Platform</div>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs ${
                        form.platform === p
                          ? "border-indigo-900/40 bg-indigo-950/40 text-indigo-200"
                          : "border-slate-800/60 bg-slate-950/40 text-slate-200"
                      }`}
                      onClick={() => setForm((f) => ({ ...f, platform: p }))}
                      disabled={loading}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs text-slate-300">Brief</div>
                <textarea
                  value={form.brief}
                  onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
                  rows={5}
                  className="ui-field w-full"
                  placeholder='VD: Shop mỹ phẩm. Bán "Serum vitamin C"...'
                  disabled={loading}
                />
              </div>

              <div>
                <div className="mb-1 text-xs text-slate-300">Facebook Page</div>
                <div className="flex gap-2">
                  <select
                    value={selectedPageId}
                    onChange={(e) => setSelectedPageId(e.target.value)}
                    className="ui-field w-full"
                    disabled={loading}
                  >
                    <option value="">-- Chọn Page --</option>
                    {fbAccounts.map((a) => {
                      const pid = getAccountPid(a);
                      const name = a?.account_name || a?.name || pid;
                      return (
                        <option key={pid} value={pid}>
                          {name} ({pid})
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => loadFacebookAccounts(activeShop?.id, { keepSelection: true })}
                    disabled={!activeShop?.id || loading}
                    className="shrink-0 rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                  >
                    Reload
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={generate}
                  disabled={loading || !canGenerate || !activeShop?.id}
                  className="w-full rounded-2xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {loading ? "Đang tạo…" : !canGenerate ? "Hết lượt AI" : "Tạo 1 bài"}
                </button>

                <button
                  type="button"
                  onClick={generate7Days}
                  disabled={loading || !canGenerate || !activeShop?.id}
                  className="w-full rounded-2xl border border-slate-800/70 bg-slate-950/50 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                >
                  {loading ? "Đang chạy…" : "1-Click: Tạo 7 ngày"}
                </button>
              </div>
            </div>
          </SectionShell>

          <SectionShell title="Log" subtitle="Audit trail." right={<Pill tone="slate">{audit.length}</Pill>}>
            <div ref={auditRef} className="max-h-[340px] overflow-auto space-y-2 pr-1">
              {audit.length === 0 ? (
                <div className="text-xs text-slate-500">Chưa có log.</div>
              ) : (
                audit.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-800/60 bg-slate-950/30 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <Pill
                        tone={
                          a.level === "error"
                            ? "red"
                            : a.level === "ok"
                            ? "green"
                            : a.level === "info"
                            ? "indigo"
                            : "slate"
                        }
                      >
                        {a.level}
                      </Pill>
                      <div className="text-[10px] text-slate-500">{a.ts}</div>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-xs text-slate-200">{a.text}</div>
                  </div>
                ))
              )}
            </div>
          </SectionShell>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <SectionShell
            title="Kết quả"
            subtitle="Phần trên: ảnh marketing • Phần dưới: AI text"
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyResult}
                  disabled={!aiText}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-50"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={openSave}
                  disabled={!aiText}
                  className="rounded-2xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Save Planner
                </button>
              </div>
            }
          >
            <div className="flex min-h-[640px] flex-col gap-3 lg:max-h-[calc(100vh-260px)]">
              {/* TOP */}
              <div className="flex-[3] overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/40">
                <div className="flex items-center justify-between border-b border-slate-800/70 px-3 py-2">
                  <div className="text-xs font-semibold text-slate-200">Ảnh marketing</div>
                  <div className="flex items-center gap-2">
                    <Pill tone={mediaLoading ? "yellow" : marketingList.length ? "green" : "red"}>
                      {mediaLoading ? "Loading…" : `${marketingList.length} marketing`}
                    </Pill>
                    <button
                      type="button"
                      onClick={gotoMedia}
                      className="rounded-2xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                      disabled={!activeShop?.id}
                    >
                      Mở Media
                    </button>
                    <button
                      type="button"
                      onClick={() => loadTopicsAndAssets(activeShop?.id, topicId)}
                      className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                      disabled={!activeShop?.id || mediaLoading}
                    >
                      Reload
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs text-slate-300">Topic</div>
                      <select
                        value={topicId || ""}
                        onChange={(e) => loadTopicsAndAssets(activeShop?.id, e.target.value || null)}
                        disabled={!activeShop?.id || mediaLoading}
                        className="ui-field w-full"
                      >
                        <option value="">-- Chọn topic --</option>
                        {topics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name || t.title || `Topic ${t.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="mb-1 text-xs text-slate-300">Ảnh marketing</div>
                      <select
                        value={selectedMarketingId || ""}
                        onChange={(e) => setSelectedMarketingId(e.target.value)}
                        disabled={!activeShop?.id || mediaLoading || marketingList.length === 0}
                        className="ui-field w-full"
                      >
                        <option value="">
                          {marketingList.length ? "-- Chọn ảnh marketing --" : "Chưa có ảnh marketing"}
                        </option>
                        {marketingList.map((a) => (
                          <option key={a.id} value={String(a.id)}>
                            {truncateText(a?.filename || a?.name || a.id, 32)} ({a.id})
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 text-[11px] text-slate-500">Tags: {MARKETING_TAGS.join(", ")}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex min-h-[360px] items-center justify-center overflow-auto rounded-2xl border border-slate-800/40 bg-slate-950/40 p-3">
                    {selectedMarketingUrl ? (
                      <img
                        src={selectedMarketingUrl}
                        alt="Selected marketing"
                        className="max-h-[560px] w-full rounded-xl object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-xs text-slate-500">Chọn 1 ảnh marketing để hiển thị.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTTOM */}
              <div className="flex-[2] overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/40">
                <div className="flex items-center justify-between border-b border-slate-800/70 px-3 py-2">
                  <div className="text-xs font-semibold text-slate-200">AI text</div>
                  <div className="flex items-center gap-2">
                    <Pill tone="slate">{aiText ? `${aiText.length} chars` : "empty"}</Pill>
                  </div>
                </div>

                <div className="p-2">
                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    rows={10}
                    className="ui-field w-full"
                    placeholder="Kết quả AI sẽ hiện ở đây…"
                  />
                </div>
              </div>
            </div>
          </SectionShell>
        </div>
      </div>

      {/* SAVE PLANNER MODAL (giống kiểu bấm “Tạo bài” trang Posts) */}
      <ModalShell
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Lưu vào Planner"
        subtitle="Tạo Planner • (tuỳ chọn) tạo scheduled_post khi Status=Scheduled"
        right={
          <div className="flex items-center gap-2">
            <Pill tone={saveDraft.status === "Scheduled" ? "indigo" : "slate"}>{saveDraft.status}</Pill>
            {selectedPageId ? <Pill tone="green">Page: OK</Pill> : <Pill tone="red">Page: —</Pill>}
            {selectedMarketingId ? <Pill tone="green">Img: OK</Pill> : <Pill tone="red">Img: —</Pill>}
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {/* LEFT: Form */}
          <div className="lg:col-span-2 space-y-3">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/55 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Thông tin Planner</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    Title / Status / thời gian đăng (dùng chung cho Planner + Scheduled).
                  </div>
                </div>
                <Pill tone="slate">{form.platform}</Pill>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="mb-1 text-xs text-slate-300">Title</div>
                  <input
                    className="ui-field w-full"
                    value={saveDraft.title}
                    onChange={(e) => setSaveDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="VD: Idea cho campaign"
                  />
                </div>

                <div>
                  <div className="mb-1 text-xs text-slate-300">Status</div>
                  <select
                    className="ui-field w-full"
                    value={saveDraft.status}
                    onChange={(e) => setSaveDraft((d) => ({ ...d, status: e.target.value }))}
                  >
                    <option value="Idea">Idea</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {saveDraft.status === "Scheduled"
                      ? "Sẽ tạo scheduled_post (cần Facebook Page + ảnh marketing)."
                      : "Chỉ lưu Planner."}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-slate-300">Time</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="date"
                        className="ui-field w-full"
                        value={saveDraft.dateStr}
                        onChange={(e) => setSaveDraft((d) => ({ ...d, dateStr: e.target.value }))}
                      />
                    </div>
                    <div>
                      <input
                        type="time"
                        className="ui-field w-full"
                        value={saveDraft.timeStr}
                        onChange={(e) => setSaveDraft((d) => ({ ...d, timeStr: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Local time → ISO trong backend.</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/55 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Nội dung</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    Nội dung sẽ lưu vào Planner.idea và dùng cho scheduled_post.content.
                  </div>
                </div>
                <Pill tone="slate">{aiText ? `${aiText.length} chars` : "empty"}</Pill>
              </div>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={8}
                className="ui-field w-full"
                placeholder="Kết quả AI…"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={savePlanner}
                disabled={loading}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={copyResult}
                disabled={!aiText}
                className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
              >
                Copy
              </button>
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/55 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Preview</div>
                  <div className="mt-0.5 text-xs text-slate-400">Tóm tắt payload sẽ gửi.</div>
                </div>
                <Pill tone="slate">{modalPreview.provider}</Pill>
              </div>

              <div className="space-y-2">
                <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-3">
                  <div className="text-[11px] text-slate-400">Title</div>
                  <div className="mt-0.5 text-xs text-slate-100">{modalPreview.title}</div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-3">
                    <div className="text-[11px] text-slate-400">Status</div>
                    <div className="mt-0.5 text-xs text-slate-100">{modalPreview.status}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-3">
                    <div className="text-[11px] text-slate-400">Scheduled</div>
                    <div className="mt-0.5 text-xs text-slate-100">{modalPreview.scheduled_at || "—"}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-400">Marketing image</div>
                    {selectedMarketingUrl ? <Pill tone="green">selected</Pill> : <Pill tone="red">—</Pill>}
                  </div>
                  <div className="mt-1 text-xs text-slate-100">{modalPreview.marketing}</div>
                  {selectedMarketingUrl ? (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40 p-2">
                      <img
                        src={selectedMarketingUrl}
                        alt="marketing"
                        className="max-h-[220px] w-full rounded-xl object-contain"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-3">
                  <div className="text-[11px] text-slate-400">Account</div>
                  <div className="mt-0.5 text-xs text-slate-100">{modalPreview.account_id}</div>
                </div>

                <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-3">
                  <div className="text-[11px] text-slate-400">Content (preview)</div>
                  <div className="mt-1 whitespace-pre-wrap text-xs text-slate-100">{modalPreview.content}</div>
                </div>

                <div className="text-[11px] text-slate-500">
                  {saveDraft.status === "Scheduled"
                    ? "Scheduled: tạo scheduled_post nếu chưa tồn tại theo planner_id. (kèm marketing_asset_id)"
                    : "Idea: chỉ lưu Planner."}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-950/55 p-4">
              <div className="text-xs text-slate-300">Yêu cầu</div>
              <div className="mt-1 text-xs text-slate-500">
                - Có AI text
                <br />- Nếu Scheduled: cần Facebook Page + ảnh marketing
              </div>
            </div>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}

/**
 * LƯU Ý:
 * File này đã sửa để:
 * - Khi Status = Scheduled: bắt buộc chọn ảnh marketing
 * - Tạo /scheduled-posts có metadata.marketing_asset_id (để backend attach ảnh)
 */
