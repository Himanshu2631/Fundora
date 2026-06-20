"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SubscriptionWidget from "@/features/subscriptions/SubscriptionWidget";
import { useSubscription } from "@/hooks/useSubscription";
import {
  ArrowRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Info,
  Zap,
} from "lucide-react";

const PLAN_DETAILS = {
  scout: {
    name: "Eco Scout",
    price: 10,
    yearlyPrice: 8,
    perks: ["1× draw entry", "+10 score/mo", "Audit receipts", "Community rank"],
  },
  advocate: {
    name: "Global Advocate",
    price: 25,
    yearlyPrice: 20,
    perks: ["3× draw multiplier", "+30 score/mo", "Priority draws", "Cause rotation"],
  },
  builder: {
    name: "Legacy Builder",
    price: 100,
    yearlyPrice: 80,
    perks: ["10× draw multiplier", "+150 score/mo", "On-chain receipts", "NGO access"],
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

export default function SubscriptionPage() {
  const { subscription, status } = useSubscription();
  const planKey = subscription?.plan_type;
  const plan = PLAN_DETAILS[planKey];

  return (
    <div className="p-6 md:p-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
        className="max-w-5xl space-y-8"
      >
        {/* ── Current subscription widget ── */}
        <motion.div variants={itemVariants}>
          <div className="mb-4">
            <span className="text-[10px] uppercase tracking-widest font-bold text-accent">
              Current Plan
            </span>
            <h2 className="font-heading text-lg font-extrabold text-foreground mt-1">
              Manage your giving subscription
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live widget */}
            <SubscriptionWidget />

            {/* Plan perks panel (only when active/cancelled) */}
            {plan && (status === "active" || status === "cancelled") ? (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm text-foreground">
                    {plan.name} Perks
                  </h3>
                </div>
                <ul className="space-y-3">
                  {plan.perks.map((perk, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground/70">
                    Yearly plan saves 20% · billed as ${plan.yearlyPrice}/mo
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="p-6 flex flex-col items-center justify-center text-center gap-4 border-dashed">
                <CreditCard className="w-8 h-8 text-muted-foreground/40" />
                <div>
                  <h4 className="font-heading font-bold text-sm text-foreground mb-1">
                    No active plan selected
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose a giving tier to begin automated charity routing, score accumulation, and draw entries.
                  </p>
                </div>
                <Button asChild variant="accent" size="sm">
                  <Link href="/pricing">
                    View All Plans <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </Card>
            )}
          </div>
        </motion.div>

        {/* ── Billing info ── */}
        {subscription && (
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Calendar className="w-4 h-4 text-accent" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Billing Information
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1 uppercase tracking-wider text-[10px]">
                    Plan Type
                  </span>
                  <span className="font-bold text-foreground capitalize">
                    {plan?.name || planKey || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1 uppercase tracking-wider text-[10px]">
                    Status
                  </span>
                  <Badge
                    variant={
                      status === "active"
                        ? "success"
                        : status === "cancelled"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1 uppercase tracking-wider text-[10px]">
                    Next Renewal
                  </span>
                  <span className="font-bold text-foreground">
                    {subscription.renewal_date
                      ? new Date(subscription.renewal_date).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── FAQ notice ── */}
        <motion.div variants={itemVariants}>
          <div className="flex items-start gap-3 p-4 bg-secondary/20 border border-border/60 rounded-sm text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground mb-0.5">Payment gateway coming soon</p>
              <p className="leading-relaxed">
                Stripe payment integration is in progress. When live, you will be able to manage billing directly here. For now, subscription changes are processed via our team at{" "}
                <span className="text-accent font-semibold">billing@fundora.org</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Upgrade prompt (when on scout / no plan) ── */}
        {(planKey === "scout" || !planKey) && (
          <motion.div variants={itemVariants}>
            <Card className="p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Badge variant="accent" className="mb-2">Upgrade Available</Badge>
                  <h3 className="font-heading font-bold text-base text-foreground">
                    Unlock more impact with Global Advocate
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Get 3× draw entries, priority corporate draw access, and cause rotation for just $25/mo.
                  </p>
                </div>
                <Button asChild variant="accent" className="shrink-0">
                  <Link href="/pricing">
                    Compare Plans <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
