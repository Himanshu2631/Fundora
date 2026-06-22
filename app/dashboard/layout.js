"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/hooks/useAuth";

// ─── Per-route metadata ───────────────────────────────────────────────────────
const ROUTE_META = {
  "/dashboard": {
    title: "Overview",
    sub: "Your giving summary and activity at a glance.",
  },
  "/dashboard/subscription": {
    title: "Subscription",
    sub: "Manage your giving tier and billing.",
  },
  "/dashboard/billing": {
    title: "Billing & History",
    sub: "Manage your billing summary and check contributions history.",
  },
  "/dashboard/scores": {
    title: "My Scores",
    sub: "Track your Giving Score and leaderboard rank.",
  },
  "/dashboard/charity": {
    title: "Charities",
    sub: "Browse and follow audited partner causes.",
  },
  "/dashboard/draws": {
    title: "Draws",
    sub: "Your active tickets and upcoming prize draws.",
  },
  "/dashboard/settings": {
    title: "Settings",
    sub: "Profile preferences and notification controls.",
  },
};

export default function DashboardLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = usePathname();
  const router = useRouter();
  const { loading: authLoading, profile } = useAuth();

  // ── Admin redirect guard (client-side defence-in-depth) ──
  // Middleware handles the server-side redirect, but this catches
  // any client-side navigation that may bypass it.
  useEffect(() => {
    if (!authLoading && profile?.role === "admin") {
      router.replace("/admin/dashboard");
    }
  }, [authLoading, profile, router]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const routeMeta = ROUTE_META[currentPath] || ROUTE_META["/dashboard"];

  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <LoadingState message="Authenticating session..." />
      </div>
    );
  }

  // Show loading while an admin is being redirected
  if (profile?.role === "admin") {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <LoadingState message="Redirecting to Admin Panel..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Mobile overlay backdrop ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      {/* Desktop: floating fixed sidebar */}
      <div className="hidden md:flex md:flex-col md:shrink-0" style={{ width: (sidebarCollapsed ? 72 : 260) + 32 }}>
        <div
          className="fixed top-4 left-4 z-20"
          style={{
            width: sidebarCollapsed ? 72 : 260,
            height: "calc(100vh - 32px)",
          }}
        >
          <DashboardSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
          />
        </div>
      </div>

      {/* Mobile: floating slide-over drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-4 left-4 z-40 md:hidden"
            style={{ width: 260, height: "calc(100vh - 32px)" }}
          >
            <DashboardSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <DashboardTopbar
          onMobileMenuToggle={() => setMobileOpen((o) => !o)}
          pageTitle={routeMeta.title}
          pageSub={routeMeta.sub}
        />

        {/* Page content */}
        <motion.main
          key={currentPath}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 overflow-y-auto"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
