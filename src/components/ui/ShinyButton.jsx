import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ShinyButton({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl py-3 text-sm font-semibold text-white",
        "bg-gradient-to-r from-fuchsia-500 to-indigo-500",
        "shadow-[0_12px_30px_rgba(217,70,239,0.22)]",
        "transition-all hover:brightness-110 active:brightness-95",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
      <span className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 rotate-12 bg-white/20 blur-xl opacity-40 animate-[shine_2.2s_ease-in-out_infinite]" />
      <style>
        {`@keyframes shine { 0%{transform:translateX(-120%) rotate(12deg)} 100%{transform:translateX(360%) rotate(12deg)} }`}
      </style>
    </button>
  );
}
