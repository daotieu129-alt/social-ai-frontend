// src/components/media/TopicsSelect.jsx
import { useMemo, useState } from "react";

export default function TopicsSelect({
  topics,
  value,
  onChange,
  onCreate,
  onRename,
  onDelete,
  disabled,
}) {
  const [name, setName] = useState("");
  const current = useMemo(
    () => topics?.find((t) => String(t.id) === String(value)) || null,
    [topics, value]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select
          className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 min-w-[220px]"
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value || null)}
          disabled={disabled}
        >
          <option value="">Select topic...</option>
          {(topics || []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || `Topic ${t.id}`}
            </option>
          ))}
        </select>

        <input
          className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 w-[220px]"
          placeholder="New topic name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
        <button
          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
          onClick={async () => {
            const n = name.trim();
            if (!n) return;
            await onCreate?.(n);
            setName("");
          }}
          disabled={disabled}
        >
          Create
        </button>
      </div>

      {current && (
        <div className="flex items-center gap-2 text-sm opacity-90">
          <span className="opacity-70">Selected:</span>
          <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
            {current.name}
          </span>

          <button
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
            onClick={async () => {
              const newName = prompt("Rename topic", current.name || "");
              if (!newName) return;
              await onRename?.(current.id, newName.trim());
            }}
            disabled={disabled}
          >
            Rename
          </button>

          <button
            className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/20"
            onClick={async () => {
              const ok = confirm("Delete this topic?");
              if (!ok) return;
              await onDelete?.(current.id);
              onChange?.(null);
            }}
            disabled={disabled}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
