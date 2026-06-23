"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Loader2,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { createClient, isPlaceholder } from "@/lib/supabase";

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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mockSessionInfo, setMockSessionInfo] = useState(null);

  const handleResetRequest = async (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setMockSessionInfo(null);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMsg(error.message || "Failed to send reset link. Please check the email address.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg("We've sent a password reset link to your email address.");

      // Check if we are in mock mode to help user proceed directly
      if (isPlaceholder) {
        // Retrieve or mock the user
        let mockUser = {
          id: "mock-uid-user",
          email: email,
          full_name: "Demo User",
        };

        try {
          const usersStr = localStorage.getItem("fundora-mock-users");
          const users = usersStr ? JSON.parse(usersStr) : [];
          const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
          if (found) {
            mockUser = found;
          }
        } catch (e) {
          console.warn("Could not retrieve mock users, using default mock details", e);
        }

        const session = {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            user_metadata: { full_name: mockUser.full_name },
          },
          role: (email.includes("admin") || email.startsWith("admin@")) ? "admin" : "user",
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        };

        setMockSessionInfo(session);
      }
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulatedClick = () => {
    if (mockSessionInfo) {
      // Set mock cookie
      document.cookie = `fundora-mock-session=${encodeURIComponent(JSON.stringify(mockSessionInfo))}; path=/; SameSite=Lax`;
      window.location.href = "/reset-password";
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

      {/* ── RIGHT SECTION: Forgot Password Form ── */}
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
              Forgot Password
            </h1>
            <p className="text-xs text-[#8A9690] leading-relaxed">
              Enter the email address associated with your account, and we will email you a secure link to reset your password.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                key="error-alert"
              >
                <Alert variant="destructive" className="border-red-500/30 bg-red-950/20">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <AlertTitle className="text-red-400">Request Failed</AlertTitle>
                  <AlertDescription className="text-red-400/90">{errorMsg}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                key="success-alert"
                className="space-y-4"
              >
                <Alert className="border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <AlertTitle className="text-emerald-400">Email Dispatched</AlertTitle>
                  <AlertDescription className="text-emerald-400/90">
                    {successMsg}
                  </AlertDescription>
                </Alert>

                {mockSessionInfo && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl border border-[#C4A054]/20 bg-[#C4A054]/5 space-y-3"
                  >
                    <p className="text-[11px] text-[#C4A054] font-medium leading-relaxed">
                      💡 <strong>Developer Mode:</strong> Since you are running in a local mock environment, no actual email is sent. You can simulate clicking the email verification link by using the button below.
                    </p>
                    <Button
                      type="button"
                      onClick={handleSimulatedClick}
                      className="w-full h-10 font-bold uppercase tracking-wider text-[10px] bg-[#C4A054] hover:bg-[#C4A054]/90 text-[#060C0A] rounded-lg border-0 flex items-center justify-center gap-1.5"
                    >
                      Simulate Recovery Link Click
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!successMsg && (
            <motion.div
              variants={formVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <form onSubmit={handleResetRequest} className="space-y-4">
                <Input
                  required
                  type="email"
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  id="forgot-email"
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
                      Sending link...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </motion.div>
          )}

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
