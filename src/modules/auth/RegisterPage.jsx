// src/modules/auth/RegisterPage.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const INPUT_BG = "#0b1323";
const INPUT_TEXT = "#f1f5f9";
const LABEL_IDLE = "#64748b";
const LABEL_ACTIVE = "#3679ff";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function Aura({ className }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]", className)}>
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-500/18 blur-3xl" />
      <div className="absolute top-8 right-8 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl" />
      <div className="absolute -bottom-36 -right-36 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(closest-side,rgba(255,255,255,0.05),transparent)] opacity-45" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
    </div>
  );
}

function GlassCard({ children, className }) {
  return (
    <div
      className={cn(
        "relative rounded-[28px] border border-slate-800/70",
        "bg-gradient-to-b from-slate-950/85 to-slate-950/45",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_30px_90px_rgba(0,0,0,0.48)]",
        className
      )}
    >
      <Aura />
      <div className="relative rounded-[28px] p-[1px] bg-gradient-to-r from-violet-500/16 via-cyan-500/10 to-emerald-500/12">
        <div className="rounded-[27px] bg-slate-950/35">{children}</div>
      </div>
    </div>
  );
}

function Badge({ tone = "neutral", children, className }) {
  const t = {
    neutral: "border-slate-800 bg-slate-950/35 text-slate-200",
    info: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        t[tone] || t.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

function AnimatedLabel({ text }) {
  const chars = Array.from(text || "");
  return (
    <span className="label-text">
      {chars.map((ch, i) => (
        <span key={`${ch}-${i}`} className="char" style={{ transitionDelay: `${Math.min(i * 28, 420)}ms` }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

/**
 * Style giống login:
 * - Label nằm trên viền input (notch), không nằm trong lòng input
 * - Focus/valid: animate từng ký tự translateY(-2px) + đổi màu
 */
function FloatingInput({ label, type = "text", value, onChange, autoComplete, name, required, right }) {
  return (
    <div className="input-box">
      <div className="relative">
        <input
          className={cn(
            "input w-full rounded-2xl border border-slate-800 px-3 py-[13px] text-sm outline-none",
            right ? "pr-12" : "",
            "focus:border-violet-400/25 focus:ring-2 focus:ring-violet-500/10"
          )}
          style={{
            backgroundColor: INPUT_BG,
            color: INPUT_TEXT,
            WebkitTextFillColor: INPUT_TEXT,
            caretColor: INPUT_TEXT,
            backgroundImage: "none",
          }}
          name={name}
          required={required}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder=" "
        />

        {/* label đặt SAU input để dùng selector input:focus ~ label */}
        <label
          className={cn(
            "label pointer-events-none absolute left-3 top-0 z-20 select-none rounded-md px-1 text-sm font-semibold"
          )}
          style={{
            backgroundColor: INPUT_BG,
            color: LABEL_IDLE,
            transform: "translateY(-50%)",
          }}
        >
          <AnimatedLabel text={label} />
        </label>

        {right ? <div className="absolute right-2 top-1/2 z-30 -translate-y-1/2">{right}</div> : null}
      </div>

      <style>{`
        .input-box .label-text{ display:inline-block; }
        .input-box .label .char{
          display:inline-block;
          transform: translateY(0);
          transition:
            transform 240ms ease,
            color 240ms ease,
            opacity 240ms ease;
          opacity: 0.95;
          font-size: 14px;
          line-height: 1;
        }

        .input-box .input:focus ~ .label .char,
        .input-box .input:not(:placeholder-shown) ~ .label .char,
        .input-box .input:valid ~ .label .char{
          transform: translateY(-2px);
          color: ${LABEL_ACTIVE};
          opacity: 1;
        }

        .input-box .input:focus ~ .label,
        .input-box .input:not(:placeholder-shown) ~ .label,
        .input-box .input:valid ~ .label{
          color: ${LABEL_ACTIVE};
          background: ${INPUT_BG};
        }

        /* Chrome autofill */
        .input-box .input:-webkit-autofill,
        .input-box .input:-webkit-autofill:hover,
        .input-box .input:-webkit-autofill:focus,
        .input-box .input:-webkit-autofill:active{
          -webkit-text-fill-color: ${INPUT_TEXT} !important;
          caret-color: ${INPUT_TEXT} !important;
          box-shadow: 0 0 0px 1000px ${INPUT_BG} inset !important;
          -webkit-box-shadow: 0 0 0px 1000px ${INPUT_BG} inset !important;
          background-image: none !important;
          border-color: rgba(30,41,59,1) !important;
        }
      `}</style>
    </div>
  );
}

function PrimaryButton({ disabled, children }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        "w-full rounded-2xl px-3 py-2 text-sm font-semibold transition border",
        "border-violet-400/22 bg-gradient-to-r from-violet-500/28 via-cyan-500/16 to-emerald-500/12",
        "text-white hover:brightness-110",
        "shadow-[0_0_0_1px_rgba(167,139,250,0.12)_inset,0_18px_40px_rgba(0,0,0,0.35)]",
        disabled && "cursor-not-allowed opacity-60 hover:brightness-100"
      )}
    >
      {children}
    </button>
  );
}

function Banner({ children }) {
  return (
    <div className="rounded-2xl border border-rose-500/22 bg-rose-500/08 px-3 py-2 text-xs text-rose-100">
      {children}
    </div>
  );
}

function Eye({ open }) {
  return open ? <span className="text-xs text-slate-300">🙈</span> : <span className="text-xs text-slate-300">👁️</span>;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const nameOk = form.name.trim().length > 0;
    const emailOk = form.email.trim().length > 0;
    const pwOk = form.password.length >= 6;
    return !loading && nameOk && emailOk && pwOk;
  }, [form, loading]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/shops", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Đăng ký thất bại";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] px-4 py-10">
      <div className="mx-auto w-full max-w-[980px]">
        <div className="relative overflow-hidden rounded-[36px] border border-slate-800/60 bg-slate-950/20 p-6 shadow-[0_50px_120px_rgba(0,0,0,0.55)]">
          <Aura className="rounded-[36px]" />

          <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left */}
            <div className="relative overflow-hidden rounded-[28px] border border-slate-800/60 bg-slate-950/30 p-8">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl" />
                <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
              </div>

              <div className="relative flex h-full flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 via-cyan-500 to-emerald-500 p-[1px]">
                      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white">
                        S
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-100">SocialAI Studio</div>
                      <div className="text-xs text-slate-400">AI-powered Social Automation</div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    <h2 className="text-xl font-semibold leading-snug text-slate-100">
                      Bắt đầu workspace
                      <br />
                      tự động hoá social
                    </h2>

                    <p className="text-sm leading-relaxed text-slate-400">
                      Tạo tài khoản để kết nối fanpage, lên lịch đăng bài và theo dõi vận hành trên một màn hình thống nhất.
                    </p>

                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>• Tạo nhiều Shops cho nhiều dự án</li>
                      <li>• Kết nối Pages và kiểm tra token</li>
                      <li>• Lên lịch đăng bài theo tuần</li>
                      <li>• Dành cho cá nhân, team, agency</li>
                    </ul>

                    <div className="mt-4 rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-4">
                      <div className="text-xs font-semibold text-slate-300">Yêu cầu</div>
                      <div className="mt-1 text-xs text-slate-500">Mật khẩu tối thiểu 6 ký tự.</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-xs text-slate-500">© {new Date().getFullYear()} SocialAI Studio · Built for growth</div>
              </div>
            </div>

            {/* Right */}
            <GlassCard className="p-0">
              <div className="px-6 py-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-100">Đăng ký</div>
                    <div className="mt-1 text-xs text-slate-400">Tạo tài khoản mới.</div>
                  </div>
                  <Badge tone={loading ? "info" : "neutral"}>{loading ? "Creating…" : "Auth"}</Badge>
                </div>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <FloatingInput
                    label="Tên hiển thị"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    autoComplete="name"
                    required
                  />

                  <FloatingInput
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                    autoComplete="email"
                    required
                  />

                  <FloatingInput
                    label="Mật khẩu"
                    name="password"
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={onChange}
                    autoComplete="new-password"
                    required
                    right={
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="rounded-xl border border-slate-800 px-2 py-2 text-slate-300 transition hover:border-slate-700/80 hover:bg-slate-900/45"
                        style={{ backgroundColor: "rgba(2,6,23,0.30)" }}
                        aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        <Eye open={showPw} />
                      </button>
                    }
                  />

                  {error ? <Banner>{error}</Banner> : null}

                  <PrimaryButton disabled={!canSubmit}>{loading ? "Đang tạo…" : "Tạo tài khoản"}</PrimaryButton>

                  <div className="text-[12px] text-slate-400">
                    Đã có tài khoản?{" "}
                    <Link to="/login" className="text-indigo-300 hover:underline">
                      Đăng nhập
                    </Link>
                  </div>
                </form>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
