// src/components/media/UploadButton.jsx
import { useRef, useState } from "react";

export default function UploadButton({ disabled, onUpload }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onChange = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;

    setBusy(true);
    try {
      await onUpload?.(f);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
        onClick={pick}
        disabled={disabled || busy}
      >
        {busy ? "Uploading..." : "Upload"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
