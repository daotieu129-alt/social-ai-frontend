import React, { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../modules/auth/AuthContext";

/**
 * AppLayout (updated)
 * - Thêm Media (/media)
 * - Giữ nguyên style/layout
 */

const NAV = [
  {
    section: "Core",
    items: [
      { to: "/shops", label: "Shop", icon: "🛍️" },
      { to: "/dashboard", label: "Dashboard", icon: "📊" },
    ],
  },
  {
    section: "Growth",
    items: [
      { to: "/channels", label: "Channels", icon: "📡" },
      { to: "/posts", label: "Posts", icon: "📰" },
      { to: "/inbox", label: "Inbox", icon: "💬" },
      { to: "/media", label: "Media", icon: "🖼️" }, // ADD
      { to: "/ai", label: "AI Studio", icon: "🤖" },
      { to: "/planner", label: "Lịch nội dung", icon: "🗓️" },
    ],
  },
  {
    section: "CRM",
    items: [{ to: "/customers", label: "Khách hàng", icon: "👥" }],
  },
];

function FancyAvatar({ initial, size = 36 }) {
  return (
    <div className="relative grid place-items-center rounded-full" style={{ width: size, height: size }}>
      <div className="absolute -inset-[6px] rounded-full bg-gradient-to-br from-fuchsia-500/55 via-indigo-500/40 to-cyan-500/45 blur-[10px]" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-400/60 via-indigo-400/45 to-cyan-400/55 p-[1.2px]">
        <div className="h-full w-full rounded-full bg-slate-950/70 backdrop-blur-md" />
      </div>
      <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-fuchsia-200/80 shadow-[0_0_18px_rgba(232,121,249,0.65)]" />
      <div className="absolute bottom-0 left-0 h-1.5 w-1.5 rounded-full bg-cyan-200/70 shadow-[0_0_14px_rgba(34,211,238,0.55)]" />
      <span className="relative z-10 text-[12px] font-semibold tracking-wide text-slate-100">{initial}</span>
    </div>
  );
}

function AppLogo({ size = 40 }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute -inset-2 rounded-[999px] bg-gradient-to-br from-fuchsia-600/40 via-indigo-600/30 to-cyan-600/35 blur-[14px]" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-400/70 via-indigo-400/55 to-cyan-400/65 p-[1.5px]">
        <div className="relative h-full w-full rounded-full bg-slate-950/70 backdrop-blur-md">
          <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-fuchsia-500/25 via-indigo-500/15 to-cyan-500/20" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-indigo-400/20 blur-[10px]" />
              <span className="relative text-[14px] font-bold tracking-wide text-slate-100">S</span>
            </div>
          </div>
          <div className="absolute top-[7px] left-[10px] h-2 w-2 rounded-full bg-white/30" />
          <div className="absolute bottom-[8px] right-[10px] h-1.5 w-1.5 rounded-full bg-cyan-200/70 shadow-[0_0_16px_rgba(34,211,238,0.55)]" />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ collapsed, children }) {
  if (collapsed) return null;
  return (
    <div className="px-3 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400/70">
      {children}
    </div>
  );
}

function ShellCard({ children }) {
  return (
    <div className="rounded-[28px] border border-slate-900/70 bg-slate-950/45 backdrop-blur-sm shadow-[0_18px_80px_rgba(0,0,0,0.35)] overflow-hidden">
      {children}
    </div>
  );
}

function GradientMiniCard({ collapsed, children, title }) {
  return (
    <div
      title={collapsed ? title : undefined}
      className={clsx(
        "rounded-2xl border border-slate-900/70 overflow-hidden",
        "bg-gradient-to-br from-indigo-600/18 via-fuchsia-600/10 to-cyan-600/14",
        "shadow-[0_18px_70px_-45px_rgba(217,70,239,0.75)]"
      )}
    >
      <div className="bg-slate-950/55 backdrop-blur-sm">{children}</div>
    </div>
  );
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const p = location.pathname;

    if (p.startsWith("/shops")) return "Quản lý Shop";
    if (p.startsWith("/dashboard")) return "Tổng quan";

    if (p.startsWith("/channels")) return "Channels";
    if (p.startsWith("/posts")) return "Posts";
    if (p.startsWith("/inbox")) return "Inbox";
    if (p.startsWith("/media")) return "Media"; // ADD

    if (p.startsWith("/ai")) return "AI Studio";
    if (p.startsWith("/planner")) return "Lịch nội dung";
    if (p.startsWith("/customers")) return "Khách hàng";
    if (p.startsWith("/account")) return "Tài khoản";
    if (p.startsWith("/pricing")) return "Bảng giá";

    if (p.startsWith("/channels")) return "Kênh Social";

    return "";
  }, [location.pathname]);

  const pageTip = useMemo(() => {
    const p = location.pathname;

    if (p.startsWith("/shops")) return "Chọn shop để bắt đầu quản lý nội dung & kênh.";
    if (p.startsWith("/dashboard")) return "Tổng quan hoạt động.";

    if (p.startsWith("/social")) return "Kết nối kênh và quản lý trạng thái kênh theo shop.";
    if (p.startsWith("/posts")) return "Theo dõi scheduled_posts: Scheduled / Processing / Posted / Failed.";
    if (p.startsWith("/inbox")) return "Xem hội thoại, gửi tin nhắn, cấu hình rules & giờ làm việc.";
    if (p.startsWith("/media")) return "Upload & quản lý assets (Original/Cutout/Marketing)."; // ADD

    if (p.startsWith("/ai")) return "Tạo nội dung nhanh và lưu vào Planner.";
    if (p.startsWith("/planner")) return "Lên lịch nội dung, theo dõi tiến độ.";
    if (p.startsWith("/customers")) return "Quản lý khách hàng & tương tác.";
    if (p.startsWith("/account")) return "Thông tin tài khoản & cấu hình.";

    return "";
  }, [location.pathname]);

  const initial = useMemo(() => {
    const name = (user?.name || "").trim();
    if (name) return name[0].toUpperCase();
    const email = (user?.email || "").trim();
    if (email) return email[0].toUpperCase();
    return "?";
  }, [user]);

  const displayName = useMemo(() => {
    const n = (user?.name || "").trim();
    if (n) return n;
    const e = (user?.email || "").trim();
    if (e) return e.split("@")[0] || e;
    return "Account";
  }, [user]);

  const renderNavLinks = (onClickItem) =>
    NAV.map((group) => (
      <div key={group.section}>
        <SectionLabel collapsed={collapsed}>{group.section}</SectionLabel>

        <div className="space-y-2">
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClickItem && onClickItem()}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                clsx(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-indigo-500/15 text-indigo-100 border border-indigo-400/25 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]"
                    : "border border-transparent text-slate-300 hover:text-slate-50 hover:bg-slate-900/60 hover:border-slate-800/70"
                )
              }
            >
              <span className="text-base">{item.icon}</span>
              <span className={clsx("truncate", collapsed && "hidden")}>{item.label}</span>

              <span
                className={clsx(
                  "absolute left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full opacity-0 transition-opacity",
                  "bg-gradient-to-b from-fuchsia-300/80 via-indigo-300/80 to-cyan-300/80",
                  "shadow-[0_0_18px_rgba(165,180,252,0.55)]",
                  "group-[.active]:opacity-100"
                )}
              />
            </NavLink>
          ))}
        </div>
      </div>
    ));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full bg-fuchsia-600/18 blur-[120px]" />
        <div className="absolute top-24 -right-48 h-[600px] w-[600px] rounded-full bg-indigo-600/16 blur-[140px]" />
        <div className="absolute bottom-[-260px] left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.09)_1px,transparent_0)] [background-size:22px_22px] opacity-25" />
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside
          className={clsx(
            "hidden md:flex h-screen sticky top-0 flex-col border-r border-slate-900/70 bg-slate-950/55 backdrop-blur",
            collapsed ? "w-[76px]" : "w-[268px]"
          )}
        >
          {/* Brand */}
          <div className="px-3 py-4">
            <button
              onClick={() => navigate("/shops")}
              className={clsx(
                "group w-full relative overflow-hidden rounded-2xl border border-slate-900/70",
                "bg-slate-950/55 hover:bg-slate-900/35 transition-all",
                "px-3 py-3",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? "SocialAI Studio" : undefined}
              type="button"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute -left-24 top-0 h-full w-40 rotate-12 bg-gradient-to-r from-transparent via-white/8 to-transparent" />
              </div>

              <div className={clsx("relative flex items-center gap-3", collapsed && "justify-center")}>
                <AppLogo size={40} />

                <div className={clsx("min-w-0", collapsed && "hidden")}>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-100 truncate">SocialAI Studio</div>
                    <span className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-100">
                      PRO
                    </span>
                  </div>
                  <div className="text-xs text-slate-400/70 truncate">Workspace • Social AI</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setCollapsed((v) => !v)}
              className={clsx(
                "mt-3 w-full rounded-2xl border border-slate-900/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/50 transition-all",
                collapsed && "px-0"
              )}
              title={collapsed ? "Expand" : "Collapse"}
              type="button"
            >
              {collapsed ? "»" : "Thu gọn"}
            </button>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="space-y-1">{renderNavLinks()}</div>
          </div>

          {/* Bottom-left gradient account card */}
          <div className="px-3 pb-3">
            <GradientMiniCard collapsed={collapsed} title="Tài khoản">
              <button
                onClick={() => navigate("/account")}
                className={clsx("w-full flex items-center gap-3 px-3 py-3 text-left transition-all", "hover:bg-slate-900/35")}
                type="button"
              >
                <FancyAvatar initial={initial} size={36} />
                <div className={clsx("min-w-0", collapsed && "hidden")}>
                  <div className="text-sm font-semibold text-slate-100 truncate">{displayName}</div>
                  <div className="text-xs text-slate-300/70 truncate">Tài khoản</div>
                </div>
              </button>

              <div className={clsx("px-3 pb-3", collapsed && "hidden")}>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("/account")}
                    className="flex-1 rounded-2xl border border-slate-900/70 bg-slate-950/55 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/45"
                    type="button"
                  >
                    Cài đặt
                  </button>
                  <button
                    onClick={logout}
                    className="flex-1 rounded-2xl border border-slate-900/70 bg-slate-950/55 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/45"
                    type="button"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>

              {collapsed ? (
                <div className="px-2 pb-2">
                  <button
                    onClick={logout}
                    className="w-full rounded-2xl border border-slate-900/70 bg-slate-950/55 px-0 py-2 text-xs text-slate-200 hover:bg-slate-900/45"
                    title="Đăng xuất"
                    type="button"
                  >
                    ⎋
                  </button>
                </div>
              ) : null}
            </GradientMiniCard>
          </div>

          <div className="h-2" />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen ? (
          <div className="md:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[82%] max-w-[320px] border-r border-slate-900/70 bg-slate-950/85 backdrop-blur p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">SocialAI Studio</div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200"
                  type="button"
                >
                  Đóng
                </button>
              </div>

              <div className="mt-3 space-y-3">{renderNavLinks(() => setMobileOpen(false))}</div>

              <div className="mt-4">
                <GradientMiniCard collapsed={false} title="Tài khoản">
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      navigate("/account");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-slate-900/35"
                    type="button"
                  >
                    <FancyAvatar initial={initial} size={36} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100 truncate">{displayName}</div>
                      <div className="text-xs text-slate-300/70 truncate">Tài khoản</div>
                    </div>
                  </button>
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        logout();
                      }}
                      className="w-full rounded-2xl border border-slate-900/70 bg-slate-950/55 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/45"
                      type="button"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </GradientMiniCard>
              </div>
            </div>
          </div>
        ) : null}

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-slate-900/70 bg-slate-950/55 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200"
                  type="button"
                >
                  ☰
                </button>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-100 truncate">{pageTitle || " "}</div>
                  {pageTip ? <div className="text-[11px] text-slate-400/70 truncate">{pageTip}</div> : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-2xl border border-slate-900/70 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/60"
                  title="Làm mới"
                  type="button"
                >
                  ⟳
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              <ShellCard>
                <div className="px-4 md:px-6 py-5">{children}</div>
              </ShellCard>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
