// src/components/media/AssetsGrid.jsx
import AssetCard from "./AssetCard";

export default function AssetsGrid({ assets, onDelete, onCopyUrl }) {
  if (!assets?.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm opacity-70">
        No assets
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {assets.map((a) => (
        <AssetCard
          key={a.id}
          asset={a}
          onDelete={onDelete}
          onCopyUrl={onCopyUrl}
        />
      ))}
    </div>
  );
}
