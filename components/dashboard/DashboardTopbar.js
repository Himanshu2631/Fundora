"use client";

import { Bell, Menu, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";

// Maps route segments to breadcrumb display names
const BREADCRUMB_MAP = {
  dashboard: "Dashboard",
  subscription: "Subscription",
  scores: "My Scores",
  charity: "Charities",
  draws: "Draws",
  settings: "Settings",
};

export default function DashboardTopbar({ onMobileMenuToggle, pageTitle, pageSub }) {
  const { profile, user } = useAuth();
  const { status } = useSubscription();

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Member";

  return (
    <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
      {/* Left: Mobile menu toggle + page title */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Page context */}
        <div>
          <h1 className="font-heading text-base font-bold text-foreground leading-tight">
            {pageTitle || "Dashboard"}
          </h1>
          {pageSub && (
            <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
              {pageSub}
            </p>
          )}
        </div>
      </div>

      {/* Right: Status indicators + user chip */}
      <div className="flex items-center gap-3">
        {/* Subscription status indicator */}
        {status === "active" && (
          <Badge variant="success" className="hidden sm:flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Member
          </Badge>
        )}
        {status === "inactive" && (
          <Badge variant="outline" className="hidden sm:flex text-muted-foreground">
            No Subscription
          </Badge>
        )}

        {/* Notification bell placeholder */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors">
          <Bell className="w-4 h-4" />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
        </button>

        {/* User chip */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/60">
          <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent uppercase">
            {displayName.charAt(0)}
          </div>
          <span className="text-xs font-semibold text-muted-foreground max-w-[120px] truncate">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
