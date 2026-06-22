"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { LoadingState } from "@/components/ui/loading-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";

// ─── Per-route metadata ───────────────────────────────────────────────────────
const ROUTE_META = {
  "/admin": {
    title: "Admin Dashboard",
    sub: "Platform overview, KPIs, and operational summary.",
  },
  "/admin/dashboard": {
    title: "Admin Dashboard",
    sub: "Platform overview, KPIs, and operational summary.",
  },
  "/admin/users": {
    title: "User Management",
    sub: "View and manage all registered platform users and subscriptions.",
  },
  "/admin/charities": {
    title: "Charity Management",
    sub: "Add, edit, and manage partner charities and content.",
  },
  "/admin/draws": {
    title: "Draw Management",
    sub: "Configure draw logic, run simulations, and publish results.",
  },
  "/admin/winners": {
    title: "Winners Management",
    sub: "View winners, verify submissions, and mark payouts as completed.",
  },
  "/admin/analytics": {
    title: "Reports & Analytics",
    sub: "Total users, prize pool, charity contributions, and draw statistics.",
  },
};


export default function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = usePathname();
  const { loading: authLoading, profile } = useAuth();

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const routeMeta = ROUTE_META[currentPath] || ROUTE_META["/admin/dashboard"];

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-[#060C0A] items-center justify-center">
        <LoadingState message="Authenticating admin session..." />
      </div>
    );
  }

  // Profile not yet resolved — hold loading instead of flashing "Access Restricted"
  // This covers the brief window after auth completes but before the profile fetch resolves
  if (!profile) {
    return (
      <div className="flex min-h-screen bg-[#060C0A] items-center justify-center">
        <LoadingState message="Loading admin profile..." />
      </div>
    );
  }

  // Client-side role guard (defense-in-depth — middleware handles server-side)
  if (profile.role !== "admin") {
    return (
      <div className="flex min-h-screen bg-[#060C0A] items-center justify-center p-6">
        <Card className="p-8 max-w-md mx-auto bg-[#0A1C16] border-[#162520] text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-heading text-lg font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-xs text-[#8A9690] leading-relaxed mb-6">
            Administrative privileges are required to access this panel. Contact your system administrator for access.
          </p>
          <Button asChild variant="default" className="w-full">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#060C0A] text-white">
      {/* ── Mobile overlay backdrop ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-[#060C0A]/80 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      {/* Desktop: static */}
      <div className="hidden md:flex md:flex-col md:shrink-0" style={{ width: sidebarCollapsed ? 72 : 260 }}>
        <div className="fixed top-0 left-0 h-screen" style={{ width: sidebarCollapsed ? 72 : 260 }}>
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
          />
        </div>
      </div>

      {/* Mobile: slide-over drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-screen w-[260px] z-40 md:hidden"
          >
            <AdminSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <AdminTopbar
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
