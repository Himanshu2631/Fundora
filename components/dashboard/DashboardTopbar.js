"use client";

import { Menu } from "lucide-react";

export default function DashboardTopbar({ onMobileMenuToggle, pageTitle, pageSub }) {
  return (
    <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-sm flex items-center px-6 shrink-0 sticky top-20 z-20">
      {/* Left: Mobile menu toggle + page title */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
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
    </header>
  );
}
