"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Heart,
  Sparkles,
  Trophy
} from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "mock-checkout-session";

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
        <Card className="p-8 border border-accent bg-card/65 backdrop-blur-md relative overflow-hidden text-center shadow-[0_0_50px_rgba(16,185,129,0.07)]">
          {/* Accent border bar */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />

          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-accent/15 border border-accent/25 rounded-full flex items-center justify-center text-accent mb-6 animate-pulse">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="text-[10px] text-accent uppercase font-extrabold tracking-widest bg-accent/10 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3 h-3" /> Subscription Activated
          </span>

          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-4">
            Thank you for your support!
          </h1>

          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto mb-8">
            Your payment succeeded. 100% of your tier contribution is now routed to audited global causes. Your Giving Score and entry tickets are updated.
          </p>

          {/* Details list */}
          <div className="bg-background/40 border border-border/40 rounded-xl p-4 text-left text-xs space-y-2.5 mb-8 font-medium">
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
            <Button asChild variant="accent" className="w-full font-bold uppercase tracking-wider py-5 text-xs">
              <Link href="/dashboard/subscription?checkout_success=true">
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/70 mt-2">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-accent" /> Third-Party Audited</span>
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-accent" /> Tax Deductible</span>
            </div>
          </div>
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
