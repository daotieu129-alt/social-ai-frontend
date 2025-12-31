// src/modules/shop/ShopsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useBilling } from "../billing/useBilling";

const SHOP_CREATE_FEE_VND = 29000;
const LS_PINNED = "socialai.pinned_shop_ids.v1";
const LS_RECENT = "socialai.recent_shop_ids.v1";

const cx = (...a) => a.filter(Boolean).join(" ");

const fmtVND = (n) => {
  try {
    return new Intl.NumberFormat("vi-VN").format(Number(n || 0)) + "đ";
  } catch {
    return `${n}đ`;
  }
};

const safeParseJsonArray = (raw) => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const PLATFORM = {
  facebook: { label: "Facebook", icon: "📘", tone: "border-sky-400/30 bg-sky-400/12 text-sky-200" },
  instagram: { label: "Instagram", icon: "📸", tone: "border-pink-400/30 bg-pink-400/12 text-pink-200" },
  tiktok: { label: "TikTok", icon: "🎵", tone: "border-cyan-400/30 bg-cyan-400/12 text-cyan-200" },
  youtube: { label: "YouTube", icon: "▶️", tone: "border-red-400/30 bg-red-400/12 text-red-200" },
  zalo: { label: "Zalo", icon: "💬", tone: "border-sky-400/30 bg-sky-400/12 text-sky-200" },
  threads: { label: "Threads", icon: "🧵", tone: "border-slate-400/30 bg-slate-400/12 text-slate-100" },
  x: { label: "X", icon: "𝕏", tone: "border-slate-400/30 bg-slate-400/12 text-slate-100" },
  unknown: { label: "Channel", icon: "🔗", tone: "border-slate-700/70 bg-slate-950/55 text-slate-200" },
};

const detectPlatform = (url) => {
  const u = String(url || "").toLowerCase();
  if (u.includes("facebook.com")) return "facebook";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("zalo")) return "zalo";
  if (u.includes("threads.net")) return "threads";
  if (u.includes("twitter.com") || u.includes("x.com")) return "x";
  return "unknown";
};

const groupChannels = (channels) => {
  const map = new Map();
  for (const c of channels || []) {
    const pf = PLATFORM[c?.platform] ? c.platform : detectPlatform(c?.url);
    map.set(pf, (map.get(pf) || 0) + 1);
  }
  const order = ["facebook", "instagram", "tiktok", "youtube", "zalo", "threads", "x", "unknown"];
  const items = Array.from(map.entries()).map(([pf, count]) => ({ pf, count, meta: PLATFORM[pf] || PLATFORM.unknown }));
  items.sort((a, b) => order.indexOf(a.pf) - order.indexOf(b.pf));
  return items;
};

function Badge({ children, tone = "neutral", className }) {
  const map = {
    neutral: "border-slate-700/70 bg-slate-950/55 text-slate-200",
    pro: "border-amber-400/35 bg-amber-400/12 text-amber-200",
    active: "border-fuchsia-400/40 bg-fuchsia-500/14 text-fuchsia-200",
    ok: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
    warn: "border-rose-400/35 bg-rose-400/12 text-rose-200",
    cyan: "border-cyan-400/35 bg-cyan-400/12 text-cyan-200",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4",
        map[tone] || map.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

function Chip({ icon, label, tone }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4", tone)}>
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function Btn({ variant = "ghost", children, onClick, disabled, title, className, type = "button" }) {
  const base =
    "inline-flex items-center justify-center rounded-xl transition-transform duration-150 active:scale-[0.985] disabled:opacity-60";
  const styles = {
    ghost: "border border-slate-700/70 bg-slate-950/55 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/55",
    secondary: "border border-slate-700/70 bg-slate-950/45 px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-900/45",
    primary:
      "bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 shadow-[0_18px_60px_-30px_rgba(217,70,239,0.85)] ring-1 ring-fuchsia-400/20",
  };
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled} className={cx(base, styles[variant], className)}>
      {children}
    </button>
  );
}

function Card({ title, subtitle, right, glow = "via-fuchsia-500/55", className, children }) {
  return (
    <div className={cx("rounded-2xl border border-slate-700/60 bg-slate-950/55 backdrop-blur shadow-[0_40px_120px_-90px_rgba(0,0,0,0.95)]", className)}>
      <div className="relative border-b border-slate-800/70 px-4 py-3">
        <div className={cx("pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent", glow, "to-transparent")} />
        <div className="flex items-start justify-between gap-3">
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

function Kbd({ children }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-800/70 bg-slate-950/60 px-1.5 py-0.5 text-[11px] text-slate-200">
      {children}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast?.message) return null;
  const tone =
    toast.type === "ok"
      ? "border-emerald-400/25 bg-emerald-400/12 text-emerald-200"
      : toast.type === "warn"
      ? "border-rose-400/25 bg-rose-400/12 text-rose-200"
      : "border-slate-800 bg-slate-950/80 text-slate-200";
  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[90] w-[360px] max-w-[calc(100vw-40px)]">
      <div className={cx("pointer-events-auto rounded-2xl border p-3 text-sm shadow-[0_20px_60px_-45px_rgba(0,0,0,0.95)]", tone)}>
        {toast.message}
      </div>
    </div>
  );
}

function PaywallModal({ open, onClose, onUpgrade, billingLoading, billingError }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl">
        <div className="pointer-events-none absolute -inset-24 bg-gradient-to-r from-indigo-600/25 via-fuchsia-600/18 to-cyan-600/18 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-slate-100">Nâng cấp</div>
              <div className="mt-1 text-xs text-slate-300/70">Hết lượt tạo shop. Nâng cấp để tạo thêm.</div>
            </div>
            <Btn variant="ghost" onClick={onClose} className="px-3 py-2">
              Đóng
            </Btn>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-amber-200">PRO</div>
                  <div className="mt-0.5 text-xs text-amber-200/80">{fmtVND(SHOP_CREATE_FEE_VND)} / tháng</div>
                </div>
                <Badge tone="pro">Unlock</Badge>
              </div>
            </div>

            {billingError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200">{String(billingError)}</div>
            ) : null}

            <Btn variant="primary" onClick={onUpgrade} disabled={billingLoading} className="w-full">
              {billingLoading ? "Creating..." : "Upgrade"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatePanel({
  isPro,
  open,
  onToggle,
  creating,
  newShop,
  setNewShop,
  seedDemo,
  setSeedDemo,
  canCreate,
  onReset,
  onCreate,
  onUpgrade,
  nameInputRef,
}) {
  if (!open) {
    return (
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-fuchsia-500/55 via-indigo-500/35 to-cyan-500/35">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/65 backdrop-blur shadow-[0_40px_120px_-90px_rgba(0,0,0,0.95)]">
          <div className="relative border-b border-slate-800/70 px-4 py-3">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/55 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Create shop</div>
                <div className="mt-0.5 text-xs text-slate-300/70">Open form to create a new shop</div>
              </div>
              <Btn variant="ghost" onClick={onToggle} className="px-3 py-2" title="Open">
                +
              </Btn>
            </div>
          </div>
          <div className="p-4">
            <Btn variant="primary" onClick={onToggle} className="w-full">
              + Create shop
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      title="Create shop"
      subtitle={isPro ? "Ready" : "Limited"}
      glow="via-fuchsia-500/70"
      right={
        <Btn variant="ghost" onClick={onToggle} className="px-2 py-2" title="Close">
          ✕
        </Btn>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs text-slate-300/70">Shop name</div>
          <input
            ref={nameInputRef}
            value={newShop.name}
            onChange={(e) => setNewShop((p) => ({ ...p, name: e.target.value }))}
            placeholder="VD: Tiệm bánh ABC"
            className="w-full rounded-xl border border-slate-700/70 bg-slate-950/55 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-fuchsia-400/40 focus:ring-2 focus:ring-fuchsia-500/15"
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-slate-300/70">Industry</div>
          <input
            value={newShop.industry}
            onChange={(e) => setNewShop((p) => ({ ...p, industry: e.target.value }))}
            placeholder="VD: F&B, Spa..."
            className="w-full rounded-xl border border-slate-700/70 bg-slate-950/55 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300/70">
          <input type="checkbox" checked={seedDemo} onChange={(e) => setSeedDemo(e.target.checked)} />
          Seed demo data
        </label>

        {!isPro ? (
          <div className="rounded-xl border border-slate-800/60 bg-slate-950/35 p-3 text-xs text-slate-300/70">
            Giới hạn lượt tạo shop.{" "}
            <button
              type="button"
              className="text-slate-200 underline decoration-slate-500/60 underline-offset-2 hover:text-white"
              onClick={onUpgrade}
            >
              Upgrade
            </button>{" "}
            <span className="text-slate-400">({fmtVND(SHOP_CREATE_FEE_VND)}/tháng)</span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Btn variant="secondary" onClick={onReset} disabled={creating}>
            Reset
          </Btn>
          <Btn
            variant="primary"
            onClick={onCreate}
            disabled={!canCreate}
            title={!String(newShop.name || "").trim() ? "Nhập tên shop" : ""}
          >
            {creating ? "Creating..." : "Create"}
          </Btn>
        </div>
      </div>
    </Card>
  );
}

export default function ShopsPage({ selectedShopId, onSelectShop }) {
  const navigate = useNavigate();
  const { isPro, createCheckout, loading: billingLoading, error: billingError } = useBilling();

  const [shops, setShops] = useState([]);
  const [channelsByShop, setChannelsByShop] = useState({});
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [toast, setToast] = useState({ type: "", message: "" });

  const [creating, setCreating] = useState(false);
  const [newShop, setNewShop] = useState({ name: "", industry: "" });
  const [seedDemo, setSeedDemo] = useState(true);

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [pinnedIds, setPinnedIds] = useState([]);
  const [recentIds, setRecentIds] = useState([]);

  const [kbdIndex, setKbdIndex] = useState(-1);

  const searchRef = useRef(null);
  const createRef = useRef(null);
  const nameInputRef = useRef(null);

  const activeShopId = useMemo(() => {
    if (!selectedShopId) return null;
    if (typeof selectedShopId === "object" && selectedShopId?.id != null) return selectedShopId.id;
    return selectedShopId;
  }, [selectedShopId]);

  useEffect(() => {
    setPinnedIds(safeParseJsonArray(localStorage.getItem(LS_PINNED)).map(String));
    setRecentIds(safeParseJsonArray(localStorage.getItem(LS_RECENT)).map(String));
  }, []);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ type: "", message: "" }), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const showOk = (msg) => setToast({ type: "ok", message: msg });
  const showWarn = (msg) => setToast({ type: "warn", message: msg });

  const persistPinned = (next) => {
    const v = Array.from(new Set(next.map(String)));
    setPinnedIds(v);
    localStorage.setItem(LS_PINNED, JSON.stringify(v));
  };

  const persistRecent = (shopId) => {
    const id = String(shopId);
    const next = [id, ...recentIds.filter((x) => String(x) !== id)].slice(0, 6);
    setRecentIds(next);
    localStorage.setItem(LS_RECENT, JSON.stringify(next));
  };

  const goDashboard = () => navigate("/dashboard");

  const safeSelectShop = (shop, { redirect = false } = {}) => {
    if (!shop) return;
    onSelectShop?.(shop, shop?.id);
    persistRecent(shop?.id);
    if (redirect) goDashboard();
  };

  const loadChannelsForShop = async (shopId) => {
    try {
      const res = await api.get("/channels", { params: { shop_id: shopId } });
      const data = res.data?.data?.channels || res.data?.data || res.data?.channels || res.data || [];
      setChannelsByShop((prev) => ({ ...prev, [shopId]: Array.isArray(data) ? data : [] }));
    } catch {
      setChannelsByShop((prev) => ({ ...prev, [shopId]: prev[shopId] || [] }));
    }
  };

  const loadShops = async () => {
    setLoading(true);
    try {
      const res = await api.get("/shops");
      const data = res.data?.data?.shops || res.data?.data || res.data?.shops || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setShops(list);

      
      await Promise.all(list.map((s) => loadChannelsForShop(s.id)));
      return list;
    } catch (e) {
      showWarn(e?.response?.data?.message || e?.message || "Không tải được danh sách shop");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredShopsBase = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((s) => {
      const name = String(s?.name || "").toLowerCase();
      const industry = String(s?.industry || "").toLowerCase();
      const id = String(s?.id ?? "").toLowerCase();
      return name.includes(q) || industry.includes(q) || id.includes(q);
    });
  }, [shops, query]);

  const filteredShops = useMemo(() => {
    const pins = new Set(pinnedIds.map(String));
    const recs = recentIds.map(String);
    const score = (id) => {
      const sid = String(id);
      if (pins.has(sid)) return 0;
      const r = recs.indexOf(sid);
      if (r >= 0) return 1 + r / 10;
      return 100;
    };
    return [...filteredShopsBase].sort((a, b) => score(a.id) - score(b.id));
  }, [filteredShopsBase, pinnedIds, recentIds]);

  const canCreate = useMemo(() => Boolean(String(newShop.name || "").trim()) && !creating, [newShop.name, creating]);

  const toggleCreate = () => {
    setCreateOpen((v) => {
      const next = !v;
      if (next) {
        setTimeout(() => {
          createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => nameInputRef.current?.focus(), 80);
        }, 0);
      }
      return next;
    });
  };

  const resetCreate = () => setNewShop({ name: "", industry: "" });

  const handleCreate = async () => {
    const name = String(newShop.name || "").trim();
    const industry = String(newShop.industry || "").trim();
    if (!name) {
      showWarn("Thiếu tên shop");
      setCreateOpen(true);
      return;
    }

    setCreating(true);
    try {
      const res = await api.post("/shops", { name, industry, seed_demo: Boolean(seedDemo) });
      showOk("Created");
      setNewShop({ name: "", industry: "" });

      const list = await loadShops();

      const createdId = res?.data?.data?.shop?.id ?? res?.data?.shop?.id ?? res?.data?.id;
      if (createdId != null) {
        const created = (Array.isArray(list) ? list : []).find((s) => String(s.id) === String(createdId));
        if (created) safeSelectShop(created);
        else {
          onSelectShop?.({ id: createdId, name }, createdId);
          persistRecent(createdId);
          goDashboard();
        }
      } else {
        if (Array.isArray(list) && list[0]) safeSelectShop(list[0]);
        else goDashboard();
      }
    } catch (e) {
      const code = e?.response?.data?.code;
      if (String(code) === "SHOP_LIMIT_REACHED") {
        setPaywallOpen(true);
        return;
      }
      const msg = e?.response?.data?.message || e?.message || "Create failed";
      showWarn(msg);
    } finally {
      setCreating(false);
    }
  };

  const togglePin = (shopId) => {
    const id = String(shopId);
    const set = new Set(pinnedIds.map(String));
    if (set.has(id)) set.delete(id);
    else set.add(id);
    persistPinned(Array.from(set));
  };

  const getNextHint = (shopId) => {
    const channels = channelsByShop?.[shopId] || [];
    if (!channels.length) return { text: "Connect channel", tone: "cyan" };
    return { text: "Schedule first post", tone: "active" };
  };

  useEffect(() => {
    const onKey = (e) => {
      const tag = String(e.target?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;

      if (!typing && e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (e.key === "Escape") {
        if (createOpen) setCreateOpen(false);
        return;
      }

      if (typing) return;
      if (filteredShops.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setKbdIndex((i) => Math.min((i < 0 ? 0 : i + 1), filteredShops.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setKbdIndex((i) => Math.max((i <= 0 ? 0 : i - 1), 0));
      }
      if (e.key === "Enter") {
        if (kbdIndex >= 0 && kbdIndex < filteredShops.length) safeSelectShop(filteredShops[kbdIndex]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredShops, kbdIndex, createOpen]);

  useEffect(() => {
    if (filteredShops.length === 0) setKbdIndex(-1);
    else if (kbdIndex >= filteredShops.length) setKbdIndex(filteredShops.length - 1);
  }, [filteredShops.length, kbdIndex]);

  const handleUpgradeFromPaywall = async () => {
    const sid = activeShopId || shops?.[0]?.id || null;
    if (!sid) {
      navigate("/pricing");
      return;
    }
    await createCheckout?.({ shopId: sid, months: 1, plan: "PRO", provider: "vnpay" });
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-5 py-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-40 h-[520px] w-[520px] rounded-full bg-fuchsia-600/22 blur-[120px]" />
        <div className="absolute top-24 -right-44 h-[560px] w-[560px] rounded-full bg-indigo-600/20 blur-[130px]" />
        <div className="absolute bottom-[-220px] left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-cyan-500/14 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.09)_1px,transparent_0)] [background-size:22px_22px] opacity-30" />
      </div>

      <Toast toast={toast} />

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUpgrade={handleUpgradeFromPaywall}
        billingLoading={billingLoading}
        billingError={billingError}
      />

      <div className="mx-auto w-full max-w-6xl">
        <div className="relative mb-6 rounded-2xl border border-slate-700/60 bg-slate-950/45 p-5 backdrop-blur shadow-[0_60px_160px_-120px_rgba(0,0,0,0.95)]">
          <div className="pointer-events-none absolute -inset-20 bg-gradient-to-r from-fuchsia-600/14 via-indigo-600/10 to-cyan-600/10 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/45 to-transparent" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-slate-100">Shops</div>
              <div className="mt-1 text-sm text-slate-300/70">
                Chọn shop để các module hoạt động đúng <span className="text-slate-400">(shop_id)</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300/60">
                <span className="inline-flex items-center gap-2">
                  <Kbd>/</Kbd> search
                </span>
                <span className="inline-flex items-center gap-2">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> navigate
                </span>
                <span className="inline-flex items-center gap-2">
                  <Kbd>Enter</Kbd> select
                </span>
                <span className="inline-flex items-center gap-2">
                  <Kbd>Esc</Kbd> close
                </span>
              </div>
            </div>

            <Btn variant="ghost" onClick={loadShops} title="Refresh" className="px-3">
              ⟳
            </Btn>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Card
              title="Your shops"
              subtitle={loading ? "Loading..." : `${shops.length} shops`}
              glow="via-fuchsia-500/65"
              right={
                <div className="flex items-center gap-2">
                  {pinnedIds.length ? <Badge tone="pro">Pinned {pinnedIds.length}</Badge> : null}
                  {recentIds.length ? <Badge>Recent</Badge> : null}
                </div>
              }
            >
              <div className="flex items-center gap-2">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name / industry / ID..."
                  className="w-full rounded-xl border border-slate-700/70 bg-slate-950/55 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-fuchsia-400/40 focus:ring-2 focus:ring-fuchsia-500/15"
                />
                <Btn variant="ghost" title="Clear" onClick={() => setQuery("")} disabled={!query} className="px-3">
                  ✕
                </Btn>
              </div>

              {!loading && recentIds.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentIds
                    .map((id) => shops.find((s) => String(s.id) === String(id)))
                    .filter(Boolean)
                    .slice(0, 6)
                    .map((s) => (
                      <button
                        key={`recent-${s.id}`}
                        type="button"
                        onClick={() => safeSelectShop(s, { redirect: true })}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/45 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900/45"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80" />
                        <span className="max-w-[180px] truncate">{s.name}</span>
                      </button>
                    ))}
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                {loading ? (
                  <>
                    <div className="rounded-xl border border-slate-800/60 bg-slate-950/35 p-4">
                      <div className="h-4 w-44 rounded bg-slate-800/60" />
                      <div className="mt-2 h-3 w-64 rounded bg-slate-800/40" />
                      <div className="mt-3 flex gap-2">
                        <div className="h-5 w-20 rounded-full bg-slate-800/40" />
                        <div className="h-5 w-24 rounded-full bg-slate-800/40" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800/60 bg-slate-950/35 p-4">
                      <div className="h-4 w-44 rounded bg-slate-800/60" />
                      <div className="mt-2 h-3 w-64 rounded bg-slate-800/40" />
                      <div className="mt-3 flex gap-2">
                        <div className="h-5 w-20 rounded-full bg-slate-800/40" />
                        <div className="h-5 w-24 rounded-full bg-slate-800/40" />
                      </div>
                    </div>
                  </>
                ) : filteredShops.length === 0 ? (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-950/35 p-4 text-sm text-slate-300/70">
                    No results.{" "}
                    <button
                      type="button"
                      className="text-slate-200 underline decoration-slate-500/60 underline-offset-2 hover:text-white"
                      onClick={() => setQuery("")}
                    >
                      Clear
                    </button>{" "}
                    ·{" "}
                    <button
                      type="button"
                      className="text-slate-200 underline decoration-slate-500/60 underline-offset-2 hover:text-white"
                      onClick={() => setCreateOpen(true)}
                    >
                      Create shop
                    </button>
                  </div>
                ) : (
                  filteredShops.map((s, idx) => {
                    const active = String(s.id) === String(activeShopId);
                    const channels = channelsByShop?.[s.id] || [];
                    const grouped = groupChannels(channels);
                    const totalChannels = channels.length;
                    const pinned = pinnedIds.includes(String(s.id));
                    const kbdActive = idx === kbdIndex;
                    const nextHint = getNextHint(s.id);

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => safeSelectShop(s, { redirect: true })}
                        className={cx(
                          "group relative w-full overflow-hidden rounded-xl border p-4 text-left outline-none",
                          active
                            ? "border-fuchsia-400/45 bg-gradient-to-br from-fuchsia-500/16 via-indigo-500/12 to-cyan-500/10 ring-1 ring-fuchsia-500/25 shadow-[0_40px_120px_-90px_rgba(217,70,239,0.95)]"
                            : "border-slate-800/70 bg-slate-950/35 hover:border-slate-600/60 hover:bg-slate-900/35 hover:shadow-[0_30px_90px_-80px_rgba(99,102,241,0.45)]",
                          kbdActive ? "ring-1 ring-indigo-500/30" : ""
                        )}
                      >
                        <div className="pointer-events-none absolute -inset-20 bg-gradient-to-r from-fuchsia-500/10 via-indigo-500/8 to-cyan-500/8 blur-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        <div
                          className={cx(
                            "absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b",
                            active ? "from-fuchsia-500/80 via-indigo-500/70 to-cyan-500/60" : "from-transparent via-transparent to-transparent"
                          )}
                        />

                        <div className="relative flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold text-slate-100">{s.name}</div>
                              {pinned ? <Badge tone="pro">Pinned</Badge> : null}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              ID: {s.id}
                              {s.industry ? <span> • {s.industry}</span> : null}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge tone={nextHint.tone}>{nextHint.text}</Badge>
                              {!totalChannels ? <Badge tone="warn">No channel</Badge> : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge>{totalChannels} ch</Badge>
                            {active ? <Badge tone="active">Selected</Badge> : null}
                            <Btn
                              variant="ghost"
                              title={pinned ? "Unpin" : "Pin"}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                togglePin(s.id);
                                showOk(pinned ? "Unpinned" : "Pinned");
                              }}
                              className="px-2"
                            >
                              {pinned ? "★" : "☆"}
                            </Btn>
                          </div>
                        </div>

                        <div className="relative mt-3 flex flex-wrap gap-2">
                          {grouped.length === 0 ? (
                            <Chip {...PLATFORM.unknown} label="Not connected" />
                          ) : (
                            grouped.slice(0, 5).map((it) => (
                              <Chip
                                key={`${s.id}-${it.pf}`}
                                icon={it.meta.icon}
                                label={`${it.meta.label} ×${it.count}`}
                                tone={it.meta.tone}
                              />
                            ))
                          )}
                          {grouped.length > 5 ? <Badge>+{grouped.length - 5}</Badge> : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-6 self-start">
            <div className="space-y-5">
              <div ref={createRef}>
                <CreatePanel
                  isPro={isPro}
                  open={createOpen}
                  onToggle={toggleCreate}
                  creating={creating}
                  newShop={newShop}
                  setNewShop={setNewShop}
                  seedDemo={seedDemo}
                  setSeedDemo={setSeedDemo}
                  canCreate={canCreate}
                  onReset={resetCreate}
                  onCreate={handleCreate}
                  onUpgrade={() => setPaywallOpen(true)}
                  nameInputRef={nameInputRef}
                />
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/35 p-3 text-xs text-slate-300/70">
                Tip: Nếu Dashboard báo thiếu <span className="text-slate-200">shop_id</span>, quay lại trang Shops và chọn shop.
              </div>
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
