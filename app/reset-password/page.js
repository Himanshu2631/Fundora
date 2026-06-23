"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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

// ─── Stepper definitions ──────────────────────────────────────────────────────
const STEPS = [
  {
    number: "1",
    title: "Subscribe",
    description: "Join a membership tier.",
  },
  {
    number: "2",
    title: "Enter Scores",
    description: "Track your golf performance.",
  },
  {
    number: "3",
    title: "Support Charities",
    description: "Choose verified causes.",
  },
  {
    number: "4",
    title: "Earn Draw Entries",
    description: "Become eligible for monthly rewards.",
  },
  {
    number: "5",
    title: "Win Rewards",
    description: "Participate in monthly prize draws.",
  },
];

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const supabase = createClient();

  useEffect(() => {
    let active = true;
    let timeoutId = null;
    let subscription = null;

    const runCheck = async () => {
      // Check if hash fragment has access token or recovery type, or query has token
      const hasHashToken = typeof window !== "undefined" && 
        (window.location.hash.includes("access_token=") || 
         window.location.hash.includes("type=recovery") ||
         window.location.search.includes("token="));

      try {
        // Try getting session immediately
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (active) {
            setUser(session.user);
            setLoadingSession(false);
          }
          return;
        }

        // If no session and no recovery tokens are in the URL/hash, resolve immediately as invalid session
        if (!hasHashToken) {
          if (active) {
            setUser(null);
            setLoadingSession(false);
          }
          return;
        }

        // We have recovery tokens but no session yet (client is parsing the hash/URL fragment).
        // Listen for the PASSWORD_RECOVERY or SIGNED_IN event to set the session.
        const authListener = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!active) return;
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || session?.user) {
            setUser(session?.user || null);
            setLoadingSession(false);
            if (timeoutId) clearTimeout(timeoutId);
          }
        });
        subscription = authListener.data?.subscription;

        // Set fallback timeout to prevent infinite loading state
        timeoutId = setTimeout(() => {
          if (active && loadingSession) {
            console.warn("Recovery session validation timed out.");
            setUser(null);
            setLoadingSession(false);
          }
        }, 5000);

      } catch (err) {
        console.error("Error in session validation:", err);
        if (active) {
          setUser(null);
          setLoadingSession(false);
        }
      }
    };

    runCheck();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handlePasswordUpdate = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message || "Failed to update password. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg("Your password has been successfully reset.");
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = "/register-subscriber/login";
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060C0A] grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden font-sans">
      
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#C4A054]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.02] blur-[150px] pointer-events-none" />

      {/* ── LEFT SECTION: Branding & Stepper ── */}
      <section className="lg:col-span-5 bg-gradient-to-br from-[#05110B] via-[#081510] to-[#060C0A] border-r border-white/[0.04] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative">
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
              Fund Your Impact.
              <br />
              Track Your Performance.
              <br />
              <span className="text-[#C4A054]">Unlock Monthly Rewards.</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#8A9690] leading-relaxed max-w-sm">
              Fundora combines golf performance tracking, verified charity contributions, and monthly reward draws into a single membership platform.
            </p>
          </div>

          {/* How Fundora Works (Stepper) */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
              How Fundora Works
            </h3>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="relative border-l border-white/[0.06] ml-2 pl-6 space-y-6 max-w-md"
            >
              {STEPS.map((step, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="relative group"
                >
                  <div className="absolute -left-[32px] top-0.5 w-4 h-4 rounded-full bg-[#060C0A] border border-white/20 group-hover:border-[#C4A054] flex items-center justify-center text-[8px] font-black text-white/50 group-hover:text-[#C4A054] transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                    {step.number}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5 tracking-wide group-hover:text-[#C4A054] transition-colors duration-300">
                      {step.title}
                    </h4>
                    <p className="text-[10px] text-[#8A9690] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="relative z-10 text-[9px] text-[#8A9690]/40 mt-12 border-t border-white/[0.04] pt-4">
          © 2026 Fundora Technologies Inc. · Secured Platform.
        </div>
      </section>

      {/* ── RIGHT SECTION: Reset Password Form ── */}
      <section className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative">
        <header className="flex justify-end mb-12 relative z-10">
          <Link
            href="/register-subscriber/login"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A9690] hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Sign In
          </Link>
        </header>

        <div className="max-w-md w-full mx-auto my-auto relative z-10 space-y-8">
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#C4A054]/10 border border-[#C4A054]/20 rounded-full px-3 py-1">
              <Sparkles className="w-3 h-3 text-[#C4A054] animate-pulse" />
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#C4A054]">
                Security Center
              </span>
            </div>
            <h1 className="text-3xl font-heading font-black text-white tracking-tight">
              Reset Password
            </h1>
            <p className="text-xs text-[#8A9690] leading-relaxed">
              Create a new secure password for your Fundora account. Please ensure it is at least 6 characters long.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {loadingSession ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3" key="loader">
                <Loader2 className="w-8 h-8 text-[#C4A054] animate-spin" />
                <p className="text-xs text-[#8A9690]">Validating recovery session...</p>
              </div>
            ) : !user ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                key="invalid-session"
                className="space-y-6"
              >
                <Alert variant="destructive" className="border-red-500/30 bg-red-950/20">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <AlertTitle className="text-red-400">Invalid Session</AlertTitle>
                  <AlertDescription className="text-red-400/90">
                    No active password recovery session was found. Password reset tokens are time-sensitive and expire quickly. Please request a new recovery link.
                  </AlertDescription>
                </Alert>
                <Link href="/forgot" className="block">
                  <Button className="w-full h-11 font-extrabold uppercase tracking-wider text-xs bg-[#C4A054] hover:bg-[#C4A054]/90 text-[#060C0A] rounded-xl border-0">
                    Request New Link
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <div key="reset-form-container" className="space-y-6">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Alert variant="destructive" className="border-red-500/30 bg-red-950/20">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <AlertTitle className="text-red-400">Update Failed</AlertTitle>
                      <AlertDescription className="text-red-400/90">{errorMsg}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Alert className="border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <AlertTitle className="text-emerald-400">Password Reset Complete</AlertTitle>
                      <AlertDescription className="text-emerald-400/90">
                        {successMsg} Redirecting you to sign in...
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                {!successMsg && (
                  <motion.div
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                      <div className="relative">
                        <Input
                          required
                          type={showPassword ? "text" : "password"}
                          label="New Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          id="reset-password-input"
                          className="focus:ring-1 focus:ring-[#C4A054]/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-[34px] text-[#8A9690] hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <Input
                        required
                        type="password"
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        id="reset-confirm-password"
                        className="focus:ring-1 focus:ring-[#C4A054]/20"
                      />

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 font-extrabold uppercase tracking-wider text-xs mt-2 bg-[#C4A054] hover:bg-[#C4A054]/90 text-[#060C0A] rounded-xl border-0 hover:shadow-[#C4A054]/10 hover:shadow-lg transition-all duration-300"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving password...
                          </span>
                        ) : (
                          "Save Password"
                        )}
                      </Button>
                    </form>
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-[#8A9690]">
            Remember your password?{" "}
            <Link href="/register-subscriber/login" className="text-[#C4A054] hover:underline font-bold transition-all">
              Sign In
            </Link>
          </p>
        </div>

        <footer className="text-center text-[10px] text-[#8A9690]/40 mt-12 border-t border-white/[0.04] pt-4">
          <Link href="/" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </footer>
      </section>

    </div>
  );
}
