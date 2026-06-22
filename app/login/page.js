"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Globe,
  User,
  ShieldAlert,
  Trophy,
  Heart,
  Ticket,
  Users,
  BarChart3,
  Settings,
  LogIn,
  AlertCircle,
  Sparkles,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLES = [
  {
    id: "visitor",
    label: "Public Visitor",
    icon: Globe,
    accentColor: "emerald",
    badge: "No Account Needed",
    headline: "Explore Fundora",
    description: "Discover how charitable giving meets premium prize draws.",
    features: [
      "View platform concept & mission",
      "Explore listed charities",
      "Understand draw mechanics",
      "Learn how membership works",
    ],
    cta: "Explore Platform",
    ctaHref: "/",
    isLink: true,
    gradient: "from-emerald-500/8 to-emerald-600/3",
    border: "border-emerald-500/15 hover:border-emerald-500/40",
    activeBorder: "border-emerald-500/60",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ctaStyle: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50",
    glow: "shadow-emerald-500/5",
  },
  {
    id: "subscriber",
    label: "Registered Subscriber",
    icon: User,
    accentColor: "accent",
    badge: "Member Access",
    headline: "Member Sign In",
    description: "Access your giving dashboard, scores, and draw entries.",
    features: [
      "Manage profile & settings",
      "Enter golf Stableford scores",
      "Participate in prize draws",
      "Track winnings & impact",
    ],
    cta: "Sign In",
    ctaHref: null,
    isLink: false,
    gradient: "from-[#C4A054]/8 to-[#C4A054]/3",
    border: "border-[#C4A054]/15 hover:border-[#C4A054]/40",
    activeBorder: "border-[#C4A054]/70",
    iconBg: "bg-[#C4A054]/10",
    iconColor: "text-[#C4A054]",
    badgeBg: "bg-[#C4A054]/10 text-[#C4A054] border-[#C4A054]/20",
    ctaStyle: "bg-[#C4A054] text-[#060C0A] hover:bg-[#C4A054]/90 font-extrabold",
    glow: "shadow-[#C4A054]/5",
  },
  {
    id: "admin",
    label: "Administrator",
    icon: ShieldAlert,
    accentColor: "red",
    badge: "Restricted Access",
    headline: "Admin Console",
    description: "Platform management, analytics, and system controls.",
    features: [
      "Manage users & subscriptions",
      "Configure draw protocols",
      "Verify winner claims",
      "Access platform analytics",
    ],
    cta: "Admin Sign In",
    ctaHref: null,
    isLink: false,
    gradient: "from-red-500/8 to-red-600/3",
    border: "border-red-500/15 hover:border-red-500/40",
    activeBorder: "border-red-500/60",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    badgeBg: "bg-red-500/10 text-red-400 border-red-500/20",
    ctaStyle: "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50",
    glow: "shadow-red-500/5",
  },
];

// ─── Animations ───────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 16 } },
};

const formVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 18 } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.2 } },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { signIn } = useAuth();

  const activeRole = ROLES.find((r) => r.id === selectedRole);
  const showForm = selectedRole === "subscriber" || selectedRole === "admin";

  const handleSignIn = async (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await signIn(email, password);
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to sign in. Please verify credentials.");
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await signIn(demoEmail, demoPassword);
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to sign in. Please verify credentials.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060C0A] flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-1/4 w-[400px] h-[400px] rounded-full bg-[#C4A054]/[0.03] blur-[150px] pointer-events-none" />

      {/* ── Top Header (Unified) ── */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04] shrink-0 z-10 max-w-7xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-xl bg-[#C4A054] flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-sm select-none">
            F
          </div>
          <span className="font-heading font-extrabold tracking-wider text-base text-white group-hover:text-[#C4A054] transition-colors duration-300">
            FUNDORA
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A9690] hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to home
        </Link>
      </header>

      {/* ── Page Content Wrapper ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-12 md:py-20 max-w-6xl w-full mx-auto z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full space-y-16"
        >
          {/* ── Premium Hero Introduction Section ── */}
          <motion.div variants={itemVariants} className="text-center space-y-6 max-w-4xl mx-auto">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 bg-[#C4A054]/10 border border-[#C4A054]/20 rounded-full px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C4A054] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C4A054]">
                Introducing Fundora
              </span>
            </div>

            {/* Giant Title Stack */}
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] md:leading-[1.05]">
              <span className="block hover:text-[#C4A054] transition-colors duration-300">Fund Your Impact.</span>
              <span className="block hover:text-[#C4A054] transition-colors duration-300">Track Your Performance.</span>
              <span className="block text-[#C4A054]">Unlock Monthly Rewards.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-[#8A9690] max-w-2xl mx-auto leading-relaxed font-medium">
              Fundora combines golf performance tracking, verified charity contributions, and monthly reward draws into a single membership platform.
            </p>
          </motion.div>

          {/* Divider */}
          <div className="w-full max-w-xs mx-auto border-t border-white/[0.06]" />

          {/* ── Portal Area / Role Cards Section ── */}
          <div className="space-y-12">
            <motion.div variants={itemVariants} className="text-center">
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-2">
                Access Portals
              </h2>
              <p className="text-xs text-[#8A9690] max-w-md mx-auto">
                Select your relationship with Fundora below to view public information or sign into your secure account.
              </p>
            </motion.div>

            {/* ── Role Cards Grid ── */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto"
            >
              {ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;

                return (
                  <motion.button
                    key={role.id}
                    onClick={() => {
                      if (role.isLink) return;
                      setSelectedRole(isSelected ? null : role.id);
                      setErrorMsg("");
                      setEmail("");
                      setPassword("");
                    }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative text-left p-6 rounded-2xl border bg-[#0A1C16]/40 backdrop-blur-sm bg-gradient-to-br ${role.gradient} transition-all duration-300 cursor-pointer group overflow-hidden shadow-xl ${
                      isSelected
                        ? `${role.activeBorder} ${role.glow}`
                        : role.border
                    }`}
                  >
                    {/* Ambient glow on select */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"
                      />
                    )}

                    {/* Selected checkmark */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute top-4 right-4 w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
                        >
                          <Check className="w-2.5 h-2.5 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Icon & Badge */}
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-11 h-11 rounded-xl ${role.iconBg} border border-white/[0.06] flex items-center justify-center`}>
                        <Icon className={`w-5.5 h-5.5 ${role.iconColor}`} />
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${role.badgeBg}`}>
                        {role.badge}
                      </span>
                    </div>

                    {/* Title & desc */}
                    <h3 className="font-heading text-sm font-extrabold text-white mb-1.5 tracking-wide">
                      {role.label}
                    </h3>
                    <p className="text-[11px] text-[#8A9690] leading-relaxed mb-5">
                      {role.description}
                    </p>

                    {/* Features list */}
                    <ul className="space-y-2 mb-6">
                      {role.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-[10px] text-[#8A9690]">
                          <span className={`w-1 h-1 rounded-full shrink-0 ${role.iconColor} opacity-70`} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {role.isLink ? (
                      <Link
                        href={role.ctaHref}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200 ${role.ctaStyle}`}
                      >
                        {role.cta}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <div
                        className={`w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200 ${role.ctaStyle} ${
                          isSelected ? "ring-1 ring-white/10" : ""
                        }`}
                      >
                        {role.cta}
                        <LogIn className="w-3 h-3" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </div>

          {/* ── Auth Form ── */}
          <AnimatePresence mode="wait">
            {showForm && activeRole && (
              <motion.div
                key={selectedRole}
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-md mx-auto"
              >
                {/* Form Card */}
                <div
                  className={`relative rounded-2xl border bg-[#0A1C16]/60 backdrop-blur-sm overflow-hidden ${
                    selectedRole === "admin"
                      ? "border-red-500/25"
                      : "border-[#C4A054]/25"
                  }`}
                >
                  {/* Top accent line */}
                  <div
                    className={`absolute top-0 left-0 w-full h-[2px] ${
                      selectedRole === "admin"
                        ? "bg-gradient-to-r from-transparent via-red-500/60 to-transparent"
                        : "bg-gradient-to-r from-transparent via-[#C4A054]/60 to-transparent"
                    }`}
                  />

                  <div className="p-7 pt-8">
                    {/* Form header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeRole.iconBg}`}
                      >
                        <activeRole.icon className={`w-4.5 h-4.5 ${activeRole.iconColor}`} />
                      </div>
                      <div>
                        <p className={`text-[9px] font-extrabold uppercase tracking-widest ${activeRole.iconColor}`}>
                          {activeRole.label}
                        </p>
                        <h2 className="font-heading text-lg font-extrabold text-white leading-tight">
                          {activeRole.headline}
                        </h2>
                      </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {errorMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mb-5"
                        >
                          <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>Sign In Error</AlertTitle>
                            <AlertDescription>{errorMsg}</AlertDescription>
                          </Alert>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <Input
                        required
                        type="email"
                        label="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        id={`email-${selectedRole}`}
                      />

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                            Password
                          </label>
                          <Link
                            href="/forgot"
                            className={`text-xs font-semibold hover:underline ${activeRole.iconColor}`}
                          >
                            Forgot?
                          </Link>
                        </div>
                        <Input
                          required
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          id={`password-${selectedRole}`}
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full h-11 font-extrabold uppercase tracking-wider text-xs mt-2 ${
                          selectedRole === "admin"
                            ? "bg-red-600 hover:bg-red-500 text-white border-0"
                            : "bg-[#C4A054] hover:bg-[#C4A054]/90 text-[#060C0A] border-0"
                        }`}
                      >
                        {isLoading
                          ? "Authenticating..."
                          : selectedRole === "admin"
                          ? "Access Admin Console"
                          : "Sign In to Fundora"}
                      </Button>
                    </form>

                    {/* Demo access */}
                    <div className="mt-6 pt-5 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Sparkles className="w-3 h-3 text-[#C4A054] animate-pulse" />
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#8A9690]">
                          Demo Console Access
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleQuickLogin("admin@fundora.com", "admin")}
                          disabled={isLoading}
                          className="h-9 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[9px] font-extrabold uppercase tracking-wider hover:bg-red-500/10 hover:border-red-500/40 transition-all duration-200"
                        >
                          Admin Portal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin("user@fundora.com", "user")}
                          disabled={isLoading}
                          className="h-9 rounded-xl border border-white/10 bg-white/[0.02] text-[#8A9690] text-[9px] font-extrabold uppercase tracking-wider hover:bg-white/[0.04] hover:border-white/20 hover:text-white transition-all duration-200"
                        >
                          Regular User
                        </button>
                      </div>
                      <p className="text-[9px] text-center text-[#8A9690]/50 mt-2.5 leading-relaxed">
                        One-click demo login via local mock database.
                      </p>
                    </div>

                    {/* Sign up link (subscribers only) */}
                    {selectedRole === "subscriber" && (
                      <p className="text-xs text-center text-[#8A9690] mt-5">
                        New to Fundora?{" "}
                        <Link href="/signup" className="text-[#C4A054] hover:underline font-bold">
                          Create an account
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Footer note ── */}
          <motion.p
            variants={itemVariants}
            className="text-center text-[10px] text-[#8A9690]/50 mt-12"
          >
            © 2026 Fundora Technologies Inc. · v1.0.0 Stable ·{" "}
            <Link href="/" className="hover:text-[#8A9690] transition-colors">
              Privacy Policy
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
