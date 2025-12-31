import React from "react";
import "./authAutofill.css";

export default function AuthShell({ badgeText, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-fuchsia-500/18 blur-3xl" />
        <div className="absolute -bottom-52 left-[-140px] h-[560px] w-[560px] rounded-full bg-indigo-500/16 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(217,70,239,0.14),transparent_45%),radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.12),transparent_45%)]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_30%_10%,rgba(217,70,239,0.18),transparent_55%),radial-gradient(circle_at_80%_45%,rgba(99,102,241,0.12),transparent_55%)]" />

            <div className="relative">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[12px] text-slate-200">
                  <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_16px_rgba(217,70,239,0.9)]" />
                  {badgeText}
                </div>

                <h1 className="text-2xl font-semibold text-white">{title}</h1>

                {subtitle ? (
                  <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
                ) : null}
              </div>

              {children}
            </div>
          </div>

          <div className="mt-4 text-center text-[11px] text-slate-500">
            © {new Date().getFullYear()} SocialAI Studio
          </div>
        </div>
      </div>
    </div>
  );
}
