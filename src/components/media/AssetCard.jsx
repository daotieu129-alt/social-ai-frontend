// src/components/media/AssetCard.jsx
function hasTag(asset, tag) {
  const tags = asset?.tags;
  if (!tags) return false;
  if (Array.isArray(tags)) return tags.includes(tag);
  if (typeof tags === "object") return Boolean(tags[tag]);
  if (typeof tags === "string") return tags.includes(tag);
  return false;
}

function typeBadge(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("cutout")) return "CUTOUT";
  if (t.includes("marketing")) return "MARKETING";
  return "ORIGINAL";
}

export default function AssetCard({ asset, onDelete, onCopyUrl }) {
  const url = asset?.url || asset?.public_url || asset?.signed_url || "";
  const type = asset?.type || "original";
  const isProcessing = hasTag(asset, "processing_cutout");
  const isFailed = hasTag(asset, "failed_cutout");

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      <div className="relative aspect-square bg-black/30">
        {url ? (
          <img
            src={url}
            alt={asset?.title || ""}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-60 text-sm">
            No preview
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-2">
          <span className="px-2 py-1 rounded-lg text-xs bg-black/50 border border-white/10">
            {typeBadge(type)}
          </span>
          {isProcessing && (
            <span className="px-2 py-1 rounded-lg text-xs bg-yellow-500/20 border border-yellow-500/30">
              Processing
            </span>
          )}
          {isFailed && (
            <span className="px-2 py-1 rounded-lg text-xs bg-red-500/20 border border-red-500/30">
              Failed
            </span>
          )}
        </div>
      </div>

      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {asset?.title || asset?.alt || asset?.filename || asset?.id}
          </div>
          <div className="text-xs opacity-60 truncate">{asset?.id}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
            onClick={() => onCopyUrl?.(url)}
            disabled={!url}
          >
            Copy URL
          </button>
          <button
            className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-xs"
            onClick={() => onDelete?.(asset)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
