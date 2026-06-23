"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  CreditCard,
  Receipt,
  Trophy,
  Heart,
  Ticket,
  Settings,
  ShieldAlert,
  BarChart3,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();
  const { status } = useSubscription();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Member";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isAdmin = profile?.role === "admin" || user?.email?.includes("admin") || user?.email?.startsWith("admin@");

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "How It Works", href: "/#how-it-works" },
    { name: "Pricing", href: "/pricing" },
  ];

  const menuItems = isAdmin
    ? [
      { name: "Admin Dashboard", href: "/admin/dashboard", icon: ShieldAlert },
      { name: "User Management", href: "/admin/users", icon: User },
      { name: "Draw Management", href: "/admin/draws", icon: Ticket },
      { name: "Charity Management", href: "/admin/charities", icon: Heart },
      { name: "Winners Management", href: "/admin/winners", icon: Trophy },
      { name: "Reports & Analytics", href: "/admin/analytics", icon: BarChart3 },
    ]
    : [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
      { name: "Billing & History", href: "/dashboard/billing", icon: Receipt },
      { name: "My Scores", href: "/dashboard/scores", icon: Trophy },
      { name: "Charities", href: "/dashboard/charity", icon: Heart },
      { name: "Draws", href: "/dashboard/draws", icon: Ticket },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1700px] px-6 md:px-8 lg:px-12 xl:px-16 h-20 flex items-center justify-between">
        {/* Left Section: Logo */}
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-lg select-none">
              F
            </div>
            <span className="font-heading font-extrabold tracking-wider text-xl text-foreground group-hover:text-accent transition-colors duration-300">
              FUNDORA
            </span>
          </Link>
        </div>

        {/* Center Section: Navigation Links */}
        <div className="hidden md:flex justify-center flex-initial">
          <nav className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="relative text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200 py-2 group"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
            {user && (
              <Link
                href={isAdmin ? "/admin/dashboard" : "/dashboard"}
                className="relative text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200 py-2 group"
              >
                {isAdmin ? "Admin Panel" : "Dashboard"}
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            )}
          </nav>
        </div>

        {/* Right Section: Action Buttons & Mobile Trigger */}
        <div className="flex-1 flex justify-end items-center gap-4">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {!loading && (
              user ? (
                <div className="flex items-center gap-3">
                  {/* Active Member Badge */}
                  {status === "active" && (
                    <Badge variant="success" className="hidden lg:flex gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Member
                    </Badge>
                  )}

                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setNotifOpen(!notifOpen)}
                      className="relative w-8 h-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                      aria-label="Notifications"
                    >
                      <Bell className="w-4 h-4" />
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                    </button>
                    <AnimatePresence>
                      {notifOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/[0.08] bg-[#070D0B]/95 backdrop-blur-xl shadow-2xl p-4 z-50"
                          >
                            <p className="text-xs font-bold text-white mb-1">Notifications</p>
                            <p className="text-[11px] text-muted-foreground">No new notifications.</p>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Profile Menu Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200 focus:outline-none group"
                    >
                      <div className="w-6.5 h-6.5 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-[10px] font-bold text-accent uppercase shrink-0">
                        {initials}
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors max-w-[120px] truncate">
                        {displayName}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>

                    <AnimatePresence>
                      {profileMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/[0.08] bg-[#070D0B]/95 backdrop-blur-xl shadow-2xl p-2.5 z-50 space-y-0.5"
                          >
                            <div className="px-3 py-2 border-b border-white/[0.06] mb-1.5">
                              <p className="text-xs font-bold text-white truncate leading-tight">{displayName}</p>
                              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{user.email}</p>
                              {isAdmin && (
                                <span className="inline-block text-[8px] font-extrabold uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5 mt-1.5">
                                  Admin Console
                                </span>
                              )}
                            </div>

                            {menuItems.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setProfileMenuOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-[#C4A054] hover:bg-[#C4A054]/8 border border-transparent hover:border-[#C4A054]/12 transition-all duration-150"
                              >
                                <item.icon className="w-3.5 h-3.5 shrink-0" />
                                {item.name}
                              </Link>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <Button
                    onClick={signOut}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs font-bold uppercase hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all duration-200"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </Button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                  <Button
                    asChild
                    variant="accent"
                    size="sm"
                  >
                    <Link href="/signup">
                      Join Fundora <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-muted-foreground hover:text-foreground focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden border-b border-border bg-background px-6 py-6 flex flex-col gap-6"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {link.name}
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    href={isAdmin ? "/admin/dashboard" : "/dashboard"}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    {isAdmin ? "Admin Panel" : "Dashboard"}
                  </Link>
                  <div className="flex flex-col gap-2 pl-4 border-l border-white/10 mt-1">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-1">
                      Dashboard Navigation
                    </p>
                    {menuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground py-1"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="h-[1px] bg-border/60" />
            <div className="flex items-center justify-between">
              {user ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-accent" /> {displayName}
                  </span>
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      signOut();
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-1 h-8 text-xs font-bold uppercase"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </Button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    Sign In
                  </Link>
                  <Button
                    asChild
                    variant="accent"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <Link href="/signup">
                      Join Fundora <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
