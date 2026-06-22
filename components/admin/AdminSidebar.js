"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Heart,
  Ticket,
  Trophy,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  LogOut,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Management",
    items: [
      { name: "User Management",    href: "/admin/users",      icon: Users   },
      { name: "Draw Management",    href: "/admin/draws",      icon: Ticket  },
      { name: "Charity Management", href: "/admin/charities",  icon: Heart   },
      { name: "Winners Management", href: "/admin/winners",    icon: Trophy  },
    ],
  },
  {
    label: "Analytics",
    items: [
      { name: "Reports & Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
];

export default function AdminSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 256 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className={cn(
        // Floating card — rounded, dark glass, subtle gold border + shadow
        "relative flex flex-col h-full overflow-hidden shrink-0",
        "rounded-3xl border border-[#C4A054]/12",
        "bg-[#070D0B]/95 backdrop-blur-xl",
        "shadow-[0_8px_40px_rgba(0,0,0,0.55),0_1px_0_rgba(196,160,84,0.06)_inset]"
      )}
    >
      {/* Subtle inner glow at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C4A054]/20 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-[#C4A054]/[0.03] blur-2xl pointer-events-none rounded-full" />

      {/* ── Logo & Brand ────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-[60px] px-4 shrink-0 relative",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 group min-w-0">
          {/* Shield icon with gold ring */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.25)] group-hover:shadow-[0_0_18px_rgba(239,68,68,0.35)] transition-shadow duration-300">
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16 }}
                className="min-w-0"
              >
                <span className="font-heading font-extrabold tracking-widest text-[13px] text-white group-hover:text-[#C4A054] transition-colors duration-300 whitespace-nowrap block">
                  FUNDORA
                </span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-red-500/80 block -mt-0.5 whitespace-nowrap">
                  Admin Console
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {/* Collapse toggle */}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-lg border border-[#C4A054]/15 flex items-center justify-center text-[#8A9690] hover:text-[#C4A054] hover:border-[#C4A054]/30 hover:scale-[1.08] active:scale-[0.93] transition-all duration-200 shrink-0 ml-1"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
        )}

        {/* When collapsed — expand toggle is absolute */}
        {collapsed && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-[#C4A054]/20 bg-[#0A1C16] flex items-center justify-center text-[#8A9690] hover:text-[#C4A054] hover:border-[#C4A054]/40 transition-all duration-200 shadow-md z-10"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#C4A054]/10 to-transparent shrink-0" />

      {/* ── Profile Card ────────────────────────────── */}
      <div className={cn("px-3 py-3 shrink-0", collapsed ? "flex justify-center" : "")}>
        {collapsed ? (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600/20 to-red-700/10 border border-red-600/25 flex items-center justify-center text-red-400 text-[10px] font-extrabold">
            {initials}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="p-3 rounded-2xl bg-[#0A1C16]/60 border border-[#C4A054]/8 space-y-2.5"
          >
            {/* Avatar + name row */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600/25 to-red-700/15 border border-red-600/25 flex items-center justify-center text-[10px] font-extrabold text-red-300 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate leading-tight">{displayName}</p>
                <p className="text-[9px] text-[#8A9690] truncate leading-tight">{user?.email}</p>
              </div>
            </div>

            {/* Premium status chip */}
            <div className="flex items-center gap-1.5 w-full bg-red-600/10 border border-red-600/20 rounded-xl px-2.5 py-1.5">
              <ShieldAlert className="w-2.5 h-2.5 text-red-400 shrink-0" />
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-red-400">
                Administrator
              </span>
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2.5 space-y-4 scrollbar-none">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Section label */}
            {!collapsed && (
              <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#8A9690]/40 px-2 mb-1.5">
                {section.label}
              </p>
            )}

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold",
                        "transition-all duration-200 group",
                        "hover:scale-[1.01] active:scale-[0.98]",
                        active
                          ? "bg-[#C4A054]/10 text-[#C4A054]"
                          : "text-[#8A9690] hover:text-white hover:bg-white/[0.04]",
                        collapsed ? "justify-center" : ""
                      )}
                    >
                      {/* Active item glow pill */}
                      {active && (
                        <motion.div
                          layoutId="adminFloatActiveBar"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#C4A054]/8 to-transparent border border-[#C4A054]/15"
                          transition={{ type: "spring", stiffness: 320, damping: 30 }}
                        />
                      )}

                      {/* Active left accent bar */}
                      {active && (
                        <motion.div
                          layoutId="adminFloatAccentBar"
                          className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[#C4A054] rounded-r-full"
                          transition={{ type: "spring", stiffness: 320, damping: 30 }}
                        />
                      )}

                      <item.icon
                        className={cn(
                          "w-[15px] h-[15px] shrink-0 relative z-10 transition-colors duration-200",
                          active
                            ? "text-[#C4A054]"
                            : "text-[#8A9690] group-hover:text-white"
                        )}
                      />

                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            transition={{ duration: 0.14 }}
                            className="relative z-10 whitespace-nowrap"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Sign Out ─────────────────────────────────── */}
      <div className="px-2.5 pb-3 pt-2 shrink-0">
        {/* Thin divider */}
        <div className="mx-1 mb-3 h-px bg-gradient-to-r from-transparent via-[#C4A054]/8 to-transparent" />

        <button
          onClick={signOut}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
            "text-xs font-semibold text-[#8A9690]",
            "border border-transparent",
            "hover:bg-red-600/8 hover:text-red-400 hover:border-red-600/15",
            "active:scale-[0.98] transition-all duration-200 group",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="w-[15px] h-[15px] shrink-0 transition-colors duration-200 group-hover:text-red-400" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.14 }}
                className="whitespace-nowrap"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
