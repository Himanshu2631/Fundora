"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Heart,
  Ticket,
  Trophy,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ShieldAlert,
  User,
  Settings,
  DollarSign,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { name: "Executive Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
      { name: "Payments", href: "/admin/payments", icon: DollarSign },
    ],
  },
  {
    label: "Draw Management",
    items: [
      { name: "Draws", href: "/admin/draws", icon: Ticket },
      { name: "Winners", href: "/admin/winners", icon: Trophy },
    ],
  },
  {
    label: "Charity Management",
    items: [
      { name: "Charities", href: "/admin/charities", icon: Heart },
    ],
  },
  {
    label: "Insights",
    items: [
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Admin";

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="relative flex flex-col h-full bg-[#070D0B] border-r border-[#162520] overflow-hidden shrink-0"
    >
      {/* ── Logo & Brand ── */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-[#162520] px-4 shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link href="/admin" className="flex items-center gap-2.5 group min-w-0">
          <div className="w-7 h-7 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="font-heading font-extrabold tracking-wider text-base text-white group-hover:text-red-400 transition-colors whitespace-nowrap"
              >
                FUNDORA
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "w-7 h-7 rounded-xl border border-[#162520] flex items-center justify-center text-[#8A9690] hover:text-white hover:border-red-500/40 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200 shrink-0",
            collapsed && "absolute -right-3.5 top-4 bg-[#070D0B] z-10 shadow-sm"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* ── Admin Profile Card ── */}
      <div
        className={cn(
          "px-3 py-4 border-b border-[#162520] shrink-0",
          collapsed ? "flex justify-center" : ""
        )}
      >
        {collapsed ? (
          <div className="w-9 h-9 rounded-full bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-4 h-4" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-full bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-[#8A9690] truncate">{user?.email}</p>
            </div>
          </motion.div>
        )}

        {/* Admin role badge */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2.5"
          >
            <Badge
              className="text-[9px] w-full justify-center py-1 bg-red-600/15 text-red-400 border-red-600/25 hover:bg-red-600/20"
            >
              <ShieldAlert className="w-2.5 h-2.5 mr-1" />
              Administrator
            </Badge>
          </motion.div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Section label */}
            {!collapsed && (
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#8A9690]/50 px-2 mb-2">
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
                      className={cn(
                        "flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative hover:scale-[1.02] active:scale-[0.98]",
                        active
                          ? "bg-red-600/12 text-red-400"
                          : "text-[#8A9690] hover:text-white hover:bg-[#0D2B20]/60",
                        collapsed ? "justify-center" : ""
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <motion.div
                          layoutId="adminActiveNavBar"
                          className="absolute left-0 top-1 bottom-1 w-[2.5px] bg-red-500 rounded-r-full"
                          transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        />
                      )}

                      <item.icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          active ? "text-red-400" : "text-[#8A9690] group-hover:text-white"
                        )}
                      />

                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.15 }}
                            className="whitespace-nowrap"
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

      {/* ── Bottom: Spacer ── */}
      <div className="border-t border-[#162520] px-2 py-3 shrink-0" />
    </motion.aside>
  );
}
