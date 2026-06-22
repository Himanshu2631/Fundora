"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Trophy,
  Heart,
  Ticket,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Shield,
  User,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, PLAN_LABELS } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BASE_NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
      { name: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
      { name: "Billing & History", href: "/dashboard/billing", icon: Receipt },
      { name: "My Scores", href: "/dashboard/scores", icon: Trophy },
    ],
  },
  {
    label: "Impact",
    items: [
      { name: "Charities", href: "/dashboard/charity", icon: Heart },
      { name: "Draws", href: "/dashboard/draws", icon: Ticket },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function DashboardSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { subscription, status } = useSubscription();

  // Admin detection — matches the pattern used across the codebase
  const isAdmin = profile?.role === "admin" || user?.email?.includes("admin") || user?.email?.startsWith("admin@");

  // Conditionally inject Admin Console nav item for admin users
  const navSections = useMemo(() => {
    if (!isAdmin) return BASE_NAV_SECTIONS;
    return BASE_NAV_SECTIONS.map((section) => {
      if (section.label !== "Account") return section;
      return {
        ...section,
        items: [
          { name: "Admin Panel", href: "/admin/dashboard", icon: Shield },
          ...section.items,
        ],
      };
    });
  }, [isAdmin]);

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const displayName =
    profile?.full_name ||
    user?.email?.split("@")[0] ||
    "Member";

  const tierLabel =
    status === "active" || status === "cancelled"
      ? PLAN_LABELS[subscription?.plan_type] || "Member"
      : "No Active Plan";

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="relative flex flex-col h-full bg-card rounded-[32px] border border-white/[0.08] shadow-2xl shadow-black/20 overflow-hidden shrink-0"
      whileHover={{ boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.35)" }}
    >
      {/* ── User Profile Card ── */}
      <div
        className={cn(
          "px-4 pt-6 pb-5 border-b border-white/[0.06] shrink-0",
          collapsed ? "flex justify-center" : ""
        )}
      >
        {collapsed ? (
          <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </motion.div>
        )}

        {/* Subscription status pill */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2.5"
          >
            <Badge
              variant={status === "active" ? "accent" : "outline"}
              className="text-[9px] w-full justify-center py-1"
            >
              {status === "active" && <ShieldCheck className="w-2.5 h-2.5 mr-1" />}
              {tierLabel}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            {/* Section label */}
            {!collapsed && (
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2">
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
                          ? "bg-accent/12 text-accent"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
                        collapsed ? "justify-center" : ""
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <motion.div
                          layoutId="activeNavBar"
                          className="absolute left-0 top-1 bottom-1 w-[2.5px] bg-accent rounded-r-full"
                          transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        />
                      )}

                      <item.icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          active ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
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

      {/* ── Bottom: Sign Out ── */}
      <div className="border-t border-white/[0.06] px-2 py-3 shrink-0">
        <button
          onClick={signOut}
          className={cn(
            "flex items-center gap-3 w-full px-2.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
            collapsed ? "justify-center" : ""
          )}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
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
