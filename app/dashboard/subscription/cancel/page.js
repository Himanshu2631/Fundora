"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  XCircle, 
  ArrowRight, 
  HelpCircle,
  CreditCard,
  ChevronLeft
} from "lucide-react";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-[#070D0B] text-foreground flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1d18_1px,transparent_1px),linear-gradient(to_bottom,#0c1d18_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-[120px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className="w-full max-w-lg"
      >
        <Card className="p-8 border border-red-500/30 bg-card/65 backdrop-blur-md relative overflow-hidden text-center shadow-[0_0_50px_rgba(239,68,68,0.04)]">
          {/* Accent border bar */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500/70" />

          {/* Cancel Icon */}
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500/90 mb-6">
            <XCircle className="w-8 h-8" />
          </div>

          <span className="text-[10px] text-red-500 bg-red-500/10 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-3 font-bold uppercase tracking-widest">
            Checkout Cancelled
          </span>

          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-4">
            Payment was not completed
          </h1>

          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto mb-8">
            Your transaction was cancelled or declined. No charges were made to your account. Feel free to try again when you are ready.
          </p>

          {/* Alternative block */}
          <div className="bg-background/40 border border-border/40 rounded-xl p-4 text-left text-xs space-y-2.5 mb-8">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-accent" /> Need assistance?
            </h4>
            <p className="text-muted-foreground/90 leading-relaxed text-[11px]">
              If you experienced a decline or credit card validation error, please ensure your card information is correct, or contact support at <span className="text-accent hover:underline cursor-pointer">billing@fundora.org</span>.
            </p>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline" className="flex-1 font-bold uppercase tracking-wider py-5 text-xs">
              <Link href="/dashboard/subscription">
                <ChevronLeft className="w-4 h-4 mr-1.5" /> Dashboard
              </Link>
            </Button>
            <Button asChild variant="accent" className="flex-1 font-bold uppercase tracking-wider py-5 text-xs">
              <Link href="/pricing">
                View Plans <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
