"use client";

import Link from "next/link";
import { Bell, Menu, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export default function AdminTopbar({ onMobileMenuToggle, pageTitle, pageSub }) {
  const { profile, user } = useAuth();

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Admin";

  return (
    <header className="h-16 border-b border-[#162520] bg-[#070D0B]/90 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
      {/* Left: Mobile menu toggle + page title */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl border border-[#162520] text-[#8A9690] hover:text-white hover:border-red-500/40 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
          aria-label="Toggle menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Page context */}
        <div>
          <h1 className="font-heading text-base font-bold text-white leading-tight">
            {pageTitle || "Admin"}
          </h1>
          {pageSub && (
            <p className="text-[10px] text-[#8A9690] font-medium leading-tight mt-0.5">
              {pageSub}
            </p>
          )}
        </div>
      </div>

      {/* Right: Status indicators + user chip */}
      <div className="flex items-center gap-3">
        {/* Admin indicator */}
        <Badge
          className="hidden sm:flex gap-1 bg-red-600/15 text-red-400 border-red-600/25 hover:bg-red-600/20"
        >
          <ShieldAlert className="w-2.5 h-2.5" />
          Admin Panel
        </Badge>

        {/* Notification bell */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-xl border border-[#162520] text-[#8A9690] hover:text-white hover:border-red-500/40 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        {/* User chip */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#162520]">
          <div className="w-7 h-7 rounded-full bg-red-600/10 border border-red-600/20 flex items-center justify-center text-[10px] font-bold text-red-400 uppercase">
            {displayName.charAt(0)}
          </div>
          <span className="text-xs font-semibold text-[#8A9690] max-w-[120px] truncate">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
