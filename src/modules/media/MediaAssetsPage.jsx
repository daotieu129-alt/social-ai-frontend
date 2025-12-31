// src/modules/media/MediaAssetsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { mediaApi, marketingApi } from "./api";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate" }) {
  const map = {
    slate: "bg-slate-900/60 text-slate-200 border-slate-800/60",
    indigo: "bg-indigo-950/45 text-indigo-200 border-indigo-900/40",
    green: "bg-emerald-950/45 text-emerald-200 border-emerald-900/40",
    red: "bg-rose-950/45 text-rose-200 border-rose-900/40",
    yellow: "bg-amber-950/45 text-amber-200 border-amber-900/40",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]", map[tone] || map.slate)}>
      {children}
    </span>
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

function detectKind(asset) {
  const url = asset?.url || asset?.public_url || asset?.signed_url || asset?.download_url || "";
  const tags = asset?.tags;

  const has = (k) =>
    (Array.isArray(tags) && tags.includes(k)) ||
    (typeof tags === "object" && tags?.[k]) ||
    (typeof tags === "string" && tags.includes(k));

  const isCutout = has("cutout") || (typeof url === "string" && url.includes("/cutout/"));
  const isMarketing = has("marketing") || (typeof url === "string" && url.includes("/marketing/"));
  const isOriginal = has("original") || (!isCutout && !isMarketing);

  return { url, tags, isCutout, isMarketing, isOriginal };
}

function TopicsBar({ topics, topicId, setTopicId, disabled, onCreate, onRename, onDelete }) {
  const [name, setName] = useState("");

  const current = useMemo(
    () => topics.find((t) => String(t.id) === String(topicId)) || null,
    [topics, topicId]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="px-3 py-2 rounded-2xl bg-slate-950/40 border border-slate-800/70 min-w-[220px] text-slate-100"
          value={topicId || ""}
          onChange={(e) => setTopicId(e.target.value || null)}
          disabled={disabled}
        >
          <option value="">Chọn topic...</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || `Topic ${t.id}`}
            </option>
          ))}
        </select>

        <input
          className="px-3 py-2 rounded-2xl bg-slate-950/40 border border-slate-800/70 w-[240px] text-slate-100"
          placeholder="New topic name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />

        <button
          className="px-3 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-60"
          onClick={async () => {
            const n = name.trim();
            if (!n) return;
            await onCreate(n);
            setName("");
          }}
          disabled={disabled}
          type="button"
        >
          Create
        </button>
      </div>

      {current && (
        <div className="flex items-center gap-2 text-sm text-slate-300 flex-wrap">
          <span className="opacity-70">Selected:</span>
          <span className="px-2 py-1 rounded-2xl bg-slate-900/50 border border-slate-800/70">{current.name}</span>

          <button
            className="px-2 py-1 rounded-2xl bg-slate-900/50 hover:bg-slate-900/70 border border-slate-800/70"
            onClick={async () => {
              const newName = prompt("Rename topic", current.name || "");
              if (!newName) return;
              await onRename(current.id, newName.trim());
            }}
            disabled={disabled}
            type="button"
          >
            Rename
          </button>

          <button
            className="px-2 py-1 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20"
            onClick={async () => {
              const ok = confirm("Delete this topic?");
              if (!ok) return;
              await onDelete(current.id);
              setTopicId(null);
            }}
            disabled={disabled}
            type="button"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function UploadButton({ disabled, onUpload }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="inline-flex items-center gap-2">
      <button
        className="px-3 py-2 rounded-2xl border border-slate-800/70 bg-slate-950/50 text-slate-200 hover:bg-slate-900 text-sm font-semibold disabled:opacity-60"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        type="button"
      >
        {busy ? "Uploading..." : "Upload"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            await onUpload(f);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function AssetCard({ asset, active, onSelect }) {
  const { url, isCutout, isMarketing } = detectKind(asset);
  const badge = isMarketing ? "MARKETING" : isCutout ? "CUTOUT" : "ORIGINAL";

  return (
    <button
      type="button"
      onClick={() => onSelect(asset)}
      className={cx(
        "rounded-2xl overflow-hidden border bg-slate-950/35 transition text-left",
        active ? "border-indigo-400/35 ring-1 ring-indigo-400/15" : "border-slate-800/70 hover:border-slate-700/80"
      )}
      title="Select asset"
    >
      <div className="relative w-full aspect-square bg-black/30">
        {url ? (
          <img src={url} className="w-full h-full object-cover" loading="lazy" alt="" />
        ) : (
          <div className="w-full h-full grid place-items-center text-sm opacity-60 text-slate-200">No preview</div>
        )}

        <div className="absolute top-2 left-2 flex gap-2">
          <span className="px-2 py-1 rounded-lg text-[10px] bg-black/55 border border-white/10 text-slate-100">{badge}</span>
        </div>

        {active ? <div className="absolute inset-0 ring-2 ring-indigo-400/20 pointer-events-none" /> : null}
      </div>
    </button>
  );
}

function SelectedAssetCard({ selected, selectedUrl, deleting, onDeleteSelected }) {
  const meta = useMemo(() => detectKind(selected), [selected]);
  const typeLabel = meta?.isMarketing ? "MARKETING" : meta?.isCutout ? "CUTOUT" : meta?.isOriginal ? "ORIGINAL" : "-";
  const idLabel = selected?.id ? `#${selected.id}` : "—";

  const canCopy = !!selectedUrl;
  const canOpen = !!selectedUrl;
  const canDelete = !!selected?.id && !deleting;

  return (
    <SectionShell
      title="Ảnh đang chọn"
      subtitle="Dùng để tạo marketing (yêu cầu CUTOUT)."
      right={
        <div className="flex items-center gap-2">
          <Pill tone="slate">{typeLabel}</Pill>
          <Pill tone="indigo">{idLabel}</Pill>

          <button
            type="button"
            className={cx(
              "rounded-2xl border px-3 py-1.5 text-xs font-semibold",
              canCopy
                ? "border-slate-800/70 bg-slate-950/50 text-slate-200 hover:bg-slate-900"
                : "border-slate-800/40 bg-slate-950/30 text-slate-500 cursor-not-allowed"
            )}
            onClick={() => canCopy && navigator.clipboard.writeText(selectedUrl)}
            disabled={!canCopy}
          >
            Copy URL
          </button>

          <a
            className={cx(
              "rounded-2xl border px-3 py-1.5 text-xs font-semibold",
              canOpen
                ? "border-slate-800/70 bg-slate-950/50 text-slate-200 hover:bg-slate-900"
                : "border-slate-800/40 bg-slate-950/30 text-slate-500 pointer-events-none"
            )}
            href={selectedUrl || "#"}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>

          <button
            type="button"
            className={cx(
              "rounded-2xl border px-3 py-1.5 text-xs font-semibold",
              canDelete
                ? "border-rose-500/20 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
                : "border-rose-500/20 bg-rose-500/10 text-rose-200/50 cursor-not-allowed"
            )}
            onClick={onDeleteSelected}
            disabled={!canDelete}
            title="Delete selected asset"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3">
        <div className="w-full aspect-square rounded-2xl bg-black/30 overflow-hidden grid place-items-center">
          {selectedUrl ? (
            <img src={selectedUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <div className="text-xs text-slate-500">Chưa chọn asset.</div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Pill tone={meta?.isCutout ? "green" : "yellow"}>{meta?.isCutout ? "OK: CUTOUT" : "Cần CUTOUT để compose"}</Pill>
          {selected?.title ? <Pill tone="slate">{selected.title}</Pill> : null}
        </div>
      </div>
    </SectionShell>
  );
}

function AiMarketingCard({ style, setStyle, styles, composing, composeErr, canCompose, onCompose }) {
  return (
    <SectionShell
      title="AI Media Marketing"
      subtitle="Chọn CUTOUT rồi compose ra ảnh marketing."
      right={<Pill tone={canCompose ? "green" : "yellow"}>{canCompose ? "Ready" : "Need CUTOUT"}</Pill>}
    >
      <div>
        <div className="text-xs text-slate-300/70 mb-1">Style</div>
        <select
          className="w-full px-3 py-2 rounded-2xl bg-slate-950/40 border border-slate-800/70 text-slate-100"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          {styles.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={cx(
            "mt-4 w-full px-4 py-3 rounded-2xl text-white font-semibold",
            composing ? "bg-slate-900/60 border border-slate-800/70 opacity-80 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"
          )}
          disabled={!canCompose || composing}
          onClick={onCompose}
        >
          {composing ? "Composing..." : "Compose marketing"}
        </button>

        {composeErr ? <div className="mt-3 text-sm text-rose-200">{composeErr}</div> : null}
      </div>
    </SectionShell>
  );
}

function MarketingResultCard({ resultAsset }) {
  const url = resultAsset?.url || resultAsset?.public_url || resultAsset?.signed_url || "";
  const hasResult = !!url;

  return (
    <SectionShell
      title="Kết quả marketing"
      subtitle="Ảnh output sau khi compose."
      right={
        <div className="flex items-center gap-2">
          <Pill tone={hasResult ? "green" : "slate"}>{hasResult ? "Ready" : "Empty"}</Pill>

          <button
            className={cx(
              "rounded-2xl border px-3 py-1.5 text-xs font-semibold",
              hasResult
                ? "border-slate-800/70 bg-slate-950/50 text-slate-200 hover:bg-slate-900"
                : "border-slate-800/40 bg-slate-950/30 text-slate-500 cursor-not-allowed"
            )}
            onClick={() => hasResult && navigator.clipboard.writeText(url)}
            disabled={!hasResult}
            type="button"
          >
            Copy URL
          </button>

          <a
            className={cx(
              "rounded-2xl border px-3 py-1.5 text-xs font-semibold",
              hasResult
                ? "border-slate-800/70 bg-slate-950/50 text-slate-200 hover:bg-slate-900"
                : "border-slate-800/40 bg-slate-950/30 text-slate-500 pointer-events-none"
            )}
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3">
        <div className="w-full aspect-[4/5] rounded-2xl bg-black/30 overflow-hidden grid place-items-center">
          {hasResult ? <img src={url} alt="" className="w-full h-full object-contain" /> : <div className="text-xs text-slate-500">Chưa có kết quả.</div>}
        </div>

        {hasResult ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill tone="indigo">Preview ratio 4:5</Pill>
            <Pill tone="slate">#{resultAsset?.id || "—"}</Pill>
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

export default function MediaAssetsPage({ activeShop }) {
  const shopId = activeShop?.id || activeShop?.shop_id || "";
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState(null);
  const [assets, setAssets] = useState([]);

  const [err, setErr] = useState("");
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const pollRef = useRef(null);

  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [style, setStyle] = useState("minimal_white");
  const [composing, setComposing] = useState(false);
  const [composeErr, setComposeErr] = useState("");
  const [resultAsset, setResultAsset] = useState(null);

  const styles = useMemo(
    () => [
      { value: "minimal_white", label: "Minimal trắng" },
      { value: "lifestyle_green", label: "Lifestyle xanh" },
      { value: "pastel_fresh", label: "Pastel tươi" },
      { value: "sale_red", label: "Sale đỏ" },
    ],
    []
  );

  const selectedMeta = useMemo(() => detectKind(selected), [selected]);
  const selectedUrl = selectedMeta?.url || "";

  const refreshTopics = async () => {
    if (!shopId) {
      setTopics([]);
      setTopicId(null);
      return;
    }
    setLoadingTopics(true);
    setErr("");
    try {
      const data = await mediaApi.getTopics(shopId);
      setTopics(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load topics");
    } finally {
      setLoadingTopics(false);
    }
  };

  const refreshAssets = async (tid = topicId) => {
    if (!tid) {
      setAssets([]);
      return;
    }
    setLoadingAssets(true);
    setErr("");
    try {
      const data = await mediaApi.getAssets(tid);
      setAssets(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load assets");
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    refreshTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    refreshAssets(topicId);
    setSelected(null);
    setResultAsset(null);
    setComposeErr("");

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);

    const started = Date.now();
    pollRef.current = setInterval(async () => {
      await refreshAssets(topicId);
      if ((Date.now() - started) / 1000 > 90) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 2000);
  };

  const onCreateTopic = async (name) => {
    await mediaApi.createTopic({ shop_id: shopId, name });
    await refreshTopics();
  };

  const onRenameTopic = async (id, name) => {
    await mediaApi.updateTopic(id, { name });
    await refreshTopics();
  };

  const onDeleteTopic = async (id) => {
    await mediaApi.deleteTopic(id);
    await refreshTopics();
  };

  const onUpload = async (file) => {
    if (!topicId) return;
    await mediaApi.uploadAsset(topicId, file);
    startPolling();
  };

  const onSelect = (asset) => {
    setSelected(asset);
    setComposeErr("");
    setResultAsset(null);
  };

  const onDeleteSelected = async () => {
    if (!selected?.id) return;
    const ok = confirm("Delete selected asset?");
    if (!ok) return;

    setDeleting(true);
    try {
      await mediaApi.deleteAsset(selected.id);
      await refreshAssets(topicId);
      setSelected(null);
      setResultAsset(null);
      setComposeErr("");
    } catch (e) {
      setErr(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const canCompose = !!shopId && !!topicId && !!selected?.id && !!selectedMeta?.isCutout;

  const onCompose = async () => {
    setComposeErr("");
    setResultAsset(null);

    if (!shopId) return setComposeErr("Thiếu shop_id");
    if (!topicId) return setComposeErr("Thiếu topic_id");
    if (!selected?.id) return setComposeErr("Chưa chọn asset");
    if (!selectedMeta?.isCutout) return setComposeErr("Asset hiện tại không phải CUTOUT.");

    setComposing(true);
    try {
      const data = await marketingApi.compose({
        shop_id: shopId,
        topic_id: topicId,
        cutout_asset_id: selected.id,
        style,
      });

      const mk = data?.marketing || data?.result || data;
      const mkUrl = mk?.url || mk?.public_url || mk?.signed_url;

      if (mkUrl) {
        const normalized = { ...mk, url: mkUrl };
        setResultAsset(normalized);
        setAssets((prev) => [normalized, ...prev]);
      } else {
        await refreshAssets(topicId);
      }
    } catch (e) {
      setComposeErr(e?.message || "Compose failed");
    } finally {
      setComposing(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-r from-indigo-950/45 via-slate-950/55 to-emerald-950/35 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-[260px]">
            <div className="flex items-center gap-2">
              <Pill tone="slate">MEDIA</Pill>
              <Pill tone={shopId ? "green" : "red"}>{shopId ? "Shop: Ready" : "Shop: Missing"}</Pill>
            </div>
            <div className="mt-2 text-lg font-semibold text-white">Media Assets</div>
            <div className="text-xs text-slate-300/70">Upload & quản lý assets (Original/Cutout/Marketing).</div>
            <div className="mt-2 text-xs text-slate-300/70">Shop: {shopId || "NOT SELECTED"}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-2xl border border-slate-800/70 bg-slate-950/50 text-slate-200 hover:bg-slate-900 text-sm font-semibold disabled:opacity-60"
              onClick={() => refreshAssets(topicId)}
              disabled={!topicId}
              type="button"
            >
              Reload
            </button>
            <UploadButton disabled={!topicId} onUpload={onUpload} />
          </div>
        </div>

        <div className="mt-3">
          <TopicsBar
            topics={topics}
            topicId={topicId}
            setTopicId={setTopicId}
            onCreate={onCreateTopic}
            onRename={onRenameTopic}
            onDelete={onDeleteTopic}
            disabled={!shopId || loadingTopics}
          />

          {err ? <div className="mt-2 text-sm text-rose-200">{err}</div> : null}

          <div className="mt-2 text-xs text-slate-300/60">
            {loadingTopics ? "Loading topics... " : ""}
            {loadingAssets ? "Loading assets..." : ""}
          </div>
        </div>

        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {!shopId ? (
        <SectionShell title="Chưa chọn shop" subtitle="Chọn shop ở trang Shop trước.">
          <div className="text-sm text-slate-300/70">Không có shop_id.</div>
        </SectionShell>
      ) : null}

      {/* ===== Layout theo yêu cầu:
          Row 1: [Danh sách assets] ngang [AI Media Marketing]
          Row 2: [Ảnh đang chọn]   ngang [Kết quả marketing]
      ===== */}
      <div className="space-y-4">
        {/* ROW 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <SectionShell title="Danh sách assets" subtitle="Click để chọn asset.">
            {topicId ? (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {assets.map((a) => (
                  <AssetCard key={a.id} asset={a} active={selected?.id === a?.id} onSelect={onSelect} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-300/70">Chọn hoặc tạo topic để xem assets.</div>
            )}
          </SectionShell>

          <AiMarketingCard
            style={style}
            setStyle={setStyle}
            styles={styles}
            composing={composing}
            composeErr={composeErr}
            canCompose={canCompose}
            onCompose={onCompose}
          />
        </div>

        {/* ROW 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <SelectedAssetCard selected={selected} selectedUrl={selectedUrl} deleting={deleting} onDeleteSelected={onDeleteSelected} />
          <MarketingResultCard resultAsset={resultAsset} />
        </div>
      </div>
    </div>
  );
}
