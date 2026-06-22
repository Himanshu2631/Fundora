"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Trophy,
  Activity,
  Heart,
  TrendingUp,
  Award,
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

// ─── Benefits definitions ─────────────────────────────────────────────────────
const BENEFITS = [
  {
    icon: Trophy,
    text: "Enter monthly reward draws",
    description: "Get entry tickets from subscription tiers and multipliers.",
    iconColor: "text-[#C4A054]",
    iconBg: "bg-[#C4A054]/10",
  },
  {
    icon: Activity,
    text: "Track golf performance",
    description: "Enter golf Stableford rounds and monitor your metrics over time.",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  {
    icon: Heart,
    text: "Support verified charities",
    description: "Direct 100% of subscription allocations to vetted non-profits.",
    iconColor: "text-red-400",
    iconBg: "bg-red-500/10",
  },
  {
    icon: TrendingUp,
    text: "Monitor impact and contributions",
    description: "Audit cryptographic receipts and outcome charts in real-time.",
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10",
  },
  {
    icon: Award,
    text: "View rankings and winnings",
    description: "Compete on performance and giving leaderboards globally.",
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
  },
];

export default function SubscriberLogin() {
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
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to sign in. Please verify credentials.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // Simulate Google Auth delay in mock mode or fallback
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const supabase = createClient();
      
      // Check if we are running in placeholder mode
      const urlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const anonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const isPlaceholder = 
        urlEnv === "https://placeholder.supabase.co" || 
        anonKeyEnv === "placeholder-anon-key" || 
        !urlEnv || 
        !anonKeyEnv;

      if (isPlaceholder) {
        // Set mock session cookie for user demo
        const session = {
          user: {
            id: "mock-uid-user",
            email: "user@fundora.com",
            user_metadata: { full_name: "Google User Demo" }
          },
          role: "user",
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        // Set cookie
        const setCookie = (name, value, days = 7) => {
          const date = new Date();
          date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
          const expires = "; expires=" + date.toUTCString();
          document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
        };
        setCookie("fundora-mock-session", JSON.stringify(session));
        window.location.href = "/dashboard";
      } else {
        // Actual Supabase redirect
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`
          }
        });
        if (error) throw error;
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to authenticate with Google.");
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
    <div className="min-h-screen bg-[#060C0A] grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden font-sans">
      
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#C4A054]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.02] blur-[150px] pointer-events-none" />

      {/* ── LEFT SECTION: Branding & Benefits ── */}
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
              Why Join <span className="text-[#C4A054]">Fundora</span>?
            </h2>
            <p className="text-xs sm:text-sm text-[#8A9690] leading-relaxed max-w-sm">
              We bridge golf performance logs with audited global giving, unlocking luxury incentives while driving outcome-based change.
            </p>
          </div>

          {/* Benefits Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 max-w-md"
          >
            {BENEFITS.map((benefit, idx) => {
              const IconComponent = benefit.icon;
              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.06] transition-all duration-300 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${benefit.iconBg} flex items-center justify-center shrink-0 border border-white/[0.04] group-hover:scale-105 transition-transform duration-300`}>
                    <IconComponent className={`w-5 h-5 ${benefit.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5 tracking-wide group-hover:text-[#C4A054] transition-colors duration-300">
                      {benefit.text}
                    </h4>
                    <p className="text-[10px] text-[#8A9690] leading-relaxed">
                      {benefit.description}
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
            Back to portal selection
          </Link>
        </header>

        {/* Vertical centered form container */}
        <div className="max-w-md w-full mx-auto my-auto relative z-10 space-y-8">
          
          {/* Header Title */}
          <div className="space-y-3">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#C4A054]/10 border border-[#C4A054]/20 rounded-full px-3 py-1">
              <Sparkles className="w-3 h-3 text-[#C4A054] animate-pulse" />
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#C4A054]">
                Member Portal
              </span>
            </div>
            <h1 className="text-3xl font-heading font-black text-white tracking-tight">
              Member Sign In
            </h1>
            <p className="text-xs text-[#8A9690] leading-relaxed">
              Access your membership, submit golf scores, support verified charities, and participate in monthly reward draws.
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
                  <AlertTitle className="text-red-400">Sign In Issue</AlertTitle>
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
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                id="subscriber-email"
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
                  id="subscriber-password"
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

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="w-full border-t border-white/[0.06]"></div>
              <span className="absolute bg-[#060C0A] px-3 text-[10px] font-bold uppercase tracking-widest text-[#8A9690]/50">
                Or continue with
              </span>
            </div>

            {/* Google OAuth Login Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-3 text-xs font-bold text-white hover:shadow-white/[0.02] hover:shadow-md"
            >
              {/* Google SVG Logo */}
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Quick Demo Access */}
            <div className="pt-4 border-t border-white/[0.04]">
              <button
                type="button"
                onClick={() => handleQuickLogin("user@fundora.com", "user")}
                disabled={isLoading}
                className="w-full h-9 rounded-xl border border-[#C4A054]/20 bg-[#C4A054]/5 text-[#C4A054] text-[9px] font-extrabold uppercase tracking-wider hover:bg-[#C4A054]/10 hover:border-[#C4A054]/40 transition-all duration-200"
              >
                Quick-Login: Regular Member Account
              </button>
            </div>
          </motion.div>

          {/* Form Footer Links */}
          <p className="text-center text-xs text-[#8A9690]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#C4A054] hover:underline font-bold transition-all">
              Create Account
            </Link>
          </p>
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
