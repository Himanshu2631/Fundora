"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldAlert,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";

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
};

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { signIn } = useAuth();

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
    <div className="min-h-screen bg-[#060C0A] flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-red-500/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-1/4 w-[400px] h-[400px] rounded-full bg-red-500/[0.015] blur-[150px] pointer-events-none" />

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
          href="/login"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A9690] hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to portals
        </Link>
      </header>

      {/* ── Page Content Wrapper ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-12 md:py-20 max-w-6xl w-full mx-auto z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full space-y-10"
        >
          {/* Header Introduction Section */}
          <motion.div variants={itemVariants} className="text-center space-y-5 max-w-2xl mx-auto">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                Restricted Console
              </span>
            </div>

            {/* Giant Title Stack */}
            <h1 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Admin Console Access
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-[#8A9690] max-w-md mx-auto leading-relaxed">
              Log in below to access platform administration controls, winner claims verification, draw configurations, and analytics.
            </p>
          </motion.div>

          {/* Form Card Container */}
          <motion.div
            variants={formVariants}
            className="w-full max-w-md mx-auto"
          >
            <div className="relative rounded-2xl border border-red-500/25 bg-[#0A1C16]/60 backdrop-blur-sm overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.06)]">
              {/* Top red accent line */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

              <div className="p-7 pt-8">
                {/* Form header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
                    <ShieldAlert className="w-4.5 h-4.5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-red-400">
                      System Authority
                    </p>
                    <h2 className="font-heading text-base font-extrabold text-white leading-tight">
                      Sign In to Console
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
                      <Alert variant="destructive" className="border-red-500/30 bg-red-950/20">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <AlertTitle className="text-red-400">Security Notification</AlertTitle>
                        <AlertDescription className="text-red-400/90">{errorMsg}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Input
                    required
                    type="email"
                    label="Administrator Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@fundora.com"
                    id="admin-email"
                    className="focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                  />

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                        Console Password
                      </label>
                    </div>
                    <Input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      id="admin-password"
                      className="focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 font-extrabold uppercase tracking-wider text-xs mt-2 bg-red-600 hover:bg-red-500 text-white border-0 hover:shadow-red-500/10 hover:shadow-lg transition-all duration-300"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authenticating...
                      </span>
                    ) : (
                      "Access Admin Console"
                    )}
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
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("admin@fundora.com", "admin")}
                    disabled={isLoading}
                    className="w-full h-9 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[9px] font-extrabold uppercase tracking-wider hover:bg-red-500/10 hover:border-red-500/40 transition-all duration-200"
                  >
                    Quick-Login: Administrator Account
                  </button>
                  <p className="text-[9px] text-center text-[#8A9690]/50 mt-2.5 leading-relaxed">
                    One-click local authentication via simulated directory.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer note */}
          <motion.p
            variants={itemVariants}
            className="text-center text-[10px] text-[#8A9690]/50 mt-6"
          >
            © 2026 Fundora Technologies Inc. · Secure Console v1.0.0 ·{" "}
            <Link href="/" className="hover:text-[#8A9690] transition-colors">
              Privacy Policy
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
