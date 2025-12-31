import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Field “best”:
 * - Không nhảy baseline khi gõ: py + leading cố định
 * - Không lệch màu khi có value/autofill: input bg-transparent
 */
export default function PlannerField({ label, icon, right, hint, error, className, ...props }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <label className="text-sm font-medium text-slate-200">{label}</label>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>

      <div
        className={cn(
          "rounded-2xl border bg-white/[0.04] shadow-sm",
          "border-white/10 transition-all",
          "focus-within:border-fuchsia-400/40 focus-within:bg-white/[0.06]",
          "focus-within:shadow-[0_0_0_4px_rgba(217,70,239,0.13)]",
          error &&
            "border-rose-500/35 focus-within:border-rose-400/60 focus-within:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]",
          className
        )}
      >
        <div className="flex items-center gap-3 px-3 min-h-[48px]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300">
            {icon}
          </div>

          <input
            {...props}
            className={cn(
              "block w-full flex-1 min-w-0",
              "bg-transparent outline-none appearance-none shadow-none",
              "text-sm text-slate-100 font-normal",
              "placeholder:text-slate-500",
              "py-[14px] leading-[20px]",
              "caret-fuchsia-300"
            )}
          />

          {right ? <div className="flex items-center">{right}</div> : null}
        </div>
      </div>
    </div>
  );
}
