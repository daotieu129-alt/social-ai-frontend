import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Banner({ type = "error", children }) {
  const styles =
    type === "error"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";

  return (
    <div className={cn("rounded-2xl border px-3 py-2 text-[12px] leading-5", styles)}>
      {children}
    </div>
  );
}
