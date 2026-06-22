"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldAlert,
  AlertCircle,
  Loader2,
  Users,
  Trophy,
  CheckCircle2,
  Heart,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";

// ─── Animations ───────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 90, damping: 15 } },
};

const formVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 18 } },
};

// ─── Capabilities definitions ──────────────────────────────────────────────────
const CAPABILITIES = [
  {
    icon: Users,
    title: "Users & Memberships",
    description: "Manage subscriber profiles, subscription states, and accounts.",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  {
    icon: Trophy,
    title: "Draw Management",
    description: "Configure and run monthly draws and rewards.",
    iconColor: "text-[#C4A054]",
    iconBg: "bg-[#C4A054]/10",
  },
  {
    icon: CheckCircle2,
    title: "Winner Verification",
    description: "Audit claims and verify monthly draw winners.",
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
  },
  {
    icon: Heart,
    title: "Charity Operations",
    description: "Manage vetted non-profit organizations and payouts.",
    iconColor: "text-red-400",
    iconBg: "bg-red-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description: "Access system-wide giving logs and financial auditing.",
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10",
  },
];

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { signIn } = useAuth();

  const [isReviewerExpanded, setIsReviewerExpanded] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("admin@fundora.demo");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText("Admin@123");
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

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
        // Clear session if they are not an administrator
        await supabase.auth.signOut();
        setErrorMsg("Access denied. Administrator credentials required.");
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to sign in. Please verify credentials.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060C0A] grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden font-sans">
      
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#C4A054]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.02] blur-[150px] pointer-events-none" />

      {/* ── LEFT SECTION: Branding & Capabilities ── */}
      <section className="lg:col-span-5 bg-gradient-to-br from-[#05110B] via-[#081510] to-[#060C0A] border-r border-white/[0.04] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative">
        {/* Subtle grid background inside left section */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1d18_1px,transparent_1px),linear-gradient(to_bottom,#0c1d18_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-[0.15] pointer-events-none" />

        <div className="relative z-10 space-y-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group w-fit">
            <div className="w-8 h-8 rounded-xl bg-[#C4A054] flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-sm select-none shadow-[0_0_20px_rgba(196,160,84,0.3)]">
              F
            </div>
            <span className="font-heading font-black tracking-widest text-lg text-white group-hover:text-[#C4A054] transition-colors duration-300">
              FUNDORA
            </span>
          </Link>

          {/* Heading Info */}
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-heading font-black text-white leading-tight">
              Fundora
              <br />
              <span className="text-[#C4A054]">Administration Center</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#8A9690] leading-relaxed max-w-sm">
              Manage subscriptions, users, reward draws, charities, winner verification, and analytics.
            </p>
          </div>

          {/* Capability Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 max-w-md"
          >
            {CAPABILITIES.map((capability, idx) => {
              const IconComponent = capability.icon;
              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.06] transition-all duration-300 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${capability.iconBg} flex items-center justify-center shrink-0 border border-white/[0.04] group-hover:scale-105 transition-transform duration-300`}>
                    <IconComponent className={`w-5 h-5 ${capability.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5 tracking-wide group-hover:text-[#C4A054] transition-colors duration-300">
                      {capability.title}
                    </h4>
                    <p className="text-[10px] text-[#8A9690] leading-relaxed">
                      {capability.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-[9px] text-[#8A9690]/40 mt-12 border-t border-white/[0.04] pt-4">
          © 2026 Fundora Technologies Inc. · Secured Platform.
        </div>
      </section>

      {/* ── RIGHT SECTION: Authentication Form ── */}
      <section className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative">
        {/* Header link back to portals */}
        <header className="flex justify-end mb-12 relative z-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A9690] hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to portals
          </Link>
        </header>

        {/* Vertical centered form container */}
        <div className="max-w-md w-full mx-auto my-auto relative z-10 space-y-8">
          
          {/* Header Title */}
          <div className="space-y-3">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#C4A054]/10 border border-[#C4A054]/20 rounded-full px-3 py-1">
              <ShieldAlert className="w-3 h-3 text-red-500" />
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#C4A054]">
                Administrator Portal
              </span>
            </div>
            <h1 className="text-3xl font-heading font-black text-white tracking-tight">
              Admin Sign In
            </h1>
            <p className="text-xs text-[#8A9690] leading-relaxed">
              Secure access to platform administration tools.
            </p>
          </div>

          {/* Alert Error Messages */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Alert variant="destructive" className="border-red-500/30 bg-red-950/20">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <AlertTitle className="text-red-400">Security Notification</AlertTitle>
                  <AlertDescription className="text-red-400/90">{errorMsg}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                required
                type="email"
                label="Administrator Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fundora.demo"
                id="admin-email"
                className="focus:ring-1 focus:ring-[#C4A054]/20"
              />

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                    Password
                  </label>
                  <Link
                    href="/forgot"
                    className="text-xs font-semibold text-[#C4A054] hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  id="admin-password"
                  className="focus:ring-1 focus:ring-[#C4A054]/20"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 font-extrabold uppercase tracking-wider text-xs mt-2 bg-[#C4A054] hover:bg-[#C4A054]/90 text-[#060C0A] rounded-xl border-0 hover:shadow-[#C4A054]/10 hover:shadow-lg transition-all duration-300"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Reviewer Access Collapsible Section */}
            <div className="border border-white/[0.04] bg-[#0A1C16]/20 hover:bg-[#0A1C16]/30 rounded-xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => setIsReviewerExpanded(!isReviewerExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none"
              >
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/90">
                  Reviewer Access
                </span>
                {isReviewerExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#C4A054]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#8A9690]" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isReviewerExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-white/[0.03] space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#C4A054] mb-0.5">
                          Evaluation Credentials
                        </p>
                        <p className="text-[9px] text-[#8A9690] uppercase tracking-widest font-extrabold">
                          Admin Portal
                        </p>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Email Credential Item */}
                        <div className="flex items-center justify-between bg-black/40 border border-white/[0.03] rounded-lg px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] uppercase tracking-wider text-[#8A9690] block mb-0.5">Email</span>
                            <code className="text-white font-mono text-[11px] select-all block truncate">admin@fundora.demo</code>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyEmail}
                            className="p-1.5 hover:bg-white/5 rounded-md text-[#8A9690] hover:text-white transition-colors ml-2"
                            title="Copy email"
                          >
                            {copiedEmail ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Password Credential Item */}
                        <div className="flex items-center justify-between bg-black/40 border border-white/[0.03] rounded-lg px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] uppercase tracking-wider text-[#8A9690] block mb-0.5">Password</span>
                            <code className="text-white font-mono text-[11px] select-all block truncate">Admin@123</code>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyPassword}
                            className="p-1.5 hover:bg-white/5 rounded-md text-[#8A9690] hover:text-white transition-colors ml-2"
                            title="Copy password"
                          >
                            {copiedPassword ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="bg-red-950/20 border border-red-500/15 rounded-lg px-3 py-2 text-[10px] text-red-400 font-medium">
                        Note: For assignment evaluation purposes only.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Footer Links */}
        <footer className="text-center text-[10px] text-[#8A9690]/40 mt-12 border-t border-white/[0.04] pt-4">
          <Link href="/" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </footer>
      </section>

    </div>
  );
}
