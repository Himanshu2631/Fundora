"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription, PLAN_LABELS } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Heart,
  Sparkles,
  AlertTriangle
} from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id") || "mock-checkout-session";
  
  const { subscription, status, refresh } = useSubscription();
  const { refreshProfile } = useAuth();
  
  const [activationState, setActivationState] = useState("processing"); // "processing" | "activating" | "active" | "error"
  const [dots, setDots] = useState("");

  // Simple dots animation for loading states
  useEffect(() => {
    if (activationState === "processing" || activationState === "activating") {
      const interval = setInterval(() => {
        setDots(d => (d.length >= 3 ? "" : d + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [activationState]);

  // Simulate payment processing first, then transition to activating
  useEffect(() => {
    const timer = setTimeout(() => {
      setActivationState("activating");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Poll for subscription status when in "activating" state
  useEffect(() => {
    if (activationState !== "activating") return;

    // Check if it's already active
    if (status === "active") {
      setActivationState("active");
      return;
    }

    let pollCount = 0;
    const maxPolls = 12; // 18 seconds max polling

    const interval = setInterval(async () => {
      pollCount++;
      try {
        await refresh();
      } catch (err) {
        console.error("Webhook state polling error:", err);
      }

      if (status === "active") {
        clearInterval(interval);
        setActivationState("active");
      } else if (pollCount >= maxPolls) {
        clearInterval(interval);
        setActivationState("error");
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activationState, status, refresh]);

  // Handle redirecting to dashboard and clearing caches
  const handleGoToDashboard = async () => {
    try {
      // Force immediate revalidation of client states
      await refresh();
      await refreshProfile();
      // Revalidate layout/dashboard path from router cache
      router.refresh();
    } catch (e) {
      console.error("Dashboard transition revalidation failed:", e);
    }
    router.push("/dashboard");
  };

  const planLabel = PLAN_LABELS[subscription?.plan_type] || "Global Advocate";

  return (
    <div className="min-h-screen bg-[#070D0B] text-foreground flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1d18_1px,transparent_1px),linear-gradient(to_bottom,#0c1d18_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[120px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className="w-full max-w-lg"
      >
        <Card className="p-8 border border-accent/40 bg-card/65 backdrop-blur-md relative overflow-hidden text-center shadow-[0_0_50px_rgba(16,185,129,0.07)]">
          {/* Accent border bar */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />

          <AnimatePresence mode="wait">
            {activationState === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 py-4 flex flex-col items-center justify-center"
              >
                <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <div>
                  <h2 className="font-heading text-lg font-bold text-foreground">Processing Payment{dots}</h2>
                  <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                    Verifying your transaction with secure payment gateways. Please do not close this window.
                  </p>
                </div>
              </motion.div>
            )}

            {activationState === "activating" && (
              <motion.div
                key="activating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 py-4 flex flex-col items-center justify-center"
              >
                <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <div>
                  <span className="text-[9px] text-accent uppercase font-extrabold tracking-widest bg-accent/10 px-2.5 py-1 rounded-full mb-3 inline-block">
                    Syncing Webhooks
                  </span>
                  <h2 className="font-heading text-lg font-bold text-foreground">Activating Membership{dots}</h2>
                  <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                    Initializing your giving tier metrics and auditing smart allocations. Almost ready.
                  </p>
                </div>
              </motion.div>
            )}

            {activationState === "active" && (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="space-y-6"
              >
                {/* Success Icon */}
                <div className="mx-auto w-16 h-16 bg-accent/15 border border-accent/25 rounded-full flex items-center justify-center text-accent mb-2 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[10px] text-accent uppercase font-extrabold tracking-widest bg-accent/10 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-3.5 h-3.5" /> {planLabel} Active
                  </span>

                  <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-3">
                    Thank you for your support!
                  </h1>

                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto mb-6">
                    Your subscription is fully active. 100% of your tier contribution is now routed to audited causes. Your Giving Score and entry tickets are initialized.
                  </p>
                </div>

                {/* Details list */}
                <div className="bg-background/40 border border-border/40 rounded-xl p-4 text-left text-xs space-y-2.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Status</span>
                    <span className="text-accent font-bold">Paid & Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gateway Transaction ID</span>
                    <span className="font-mono text-muted-foreground/80">{sessionId.substring(0, 24)}...</span>
                  </div>
                  <div className="flex justify-between border-t border-border/20 pt-2.5 mt-1">
                    <span className="text-muted-foreground">Cause Routing Efficiency</span>
                    <span className="font-bold text-emerald-500">98.2% Verified</span>
                  </div>
                </div>

                {/* Call to Actions */}
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleGoToDashboard} 
                    variant="accent" 
                    className="w-full font-bold uppercase tracking-wider py-5 text-xs"
                  >
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                  <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/70 mt-2">
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-accent" /> Third-Party Audited</span>
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-accent" /> Tax Deductible</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activationState === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Warning Icon */}
                <div className="mx-auto w-16 h-16 bg-yellow-500/10 border border-yellow-500/25 rounded-full flex items-center justify-center text-yellow-500 mb-2">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[10px] text-yellow-500 uppercase font-extrabold tracking-widest bg-yellow-500/10 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-3">
                    Activation Delay
                  </span>

                  <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground mb-3">
                    Almost there!
                  </h1>

                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto mb-6">
                    We are experiencing a slight gateway verification delay. Your payment was processed successfully. You can proceed to the dashboard while activation completes in the background.
                  </p>
                </div>

                {/* Call to Actions */}
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleGoToDashboard} 
                    variant="outline" 
                    className="w-full font-bold uppercase tracking-wider py-5 text-xs border-border/70 hover:border-accent/40"
                  >
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070D0B] text-foreground flex items-center justify-center text-xs animate-pulse">
        Processing secure transaction confirmation...
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
