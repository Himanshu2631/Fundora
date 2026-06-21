"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import SubscriptionWidget from "@/features/subscriptions/SubscriptionWidget";
import SubscriptionSimulatorPanel from "@/features/subscriptions/SubscriptionSimulatorPanel";
import SubscriptionTimeline from "@/features/subscriptions/SubscriptionTimeline";
import { useSubscription } from "@/hooks/useSubscription";
import {
  ArrowRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Info,
  Zap,
  Clock,
  Sparkles,
  HelpCircle,
  AlertCircle
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
  const { subscription, status, loading, error, refresh } = useSubscription();
  const [isMock, setIsMock] = useState(false);
  const [showMockPortalNotice, setShowMockPortalNotice] = useState(false);

  useEffect(() => {
    // Check if Stripe is mock
    fetch("/api/stripe/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.isMock) {
          setIsMock(true);
        }
      })
      .catch((err) => console.error("Failed to load stripe config:", err));

    // Safely check query param for mock customer portal redirect notice
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mock_portal") === "true") {
        setShowMockPortalNotice(true);
      }
    }
  }, []);

  const planKey = subscription?.plan_type;
  const plan = PLAN_DETAILS[planKey];

  const getMembershipDuration = (createdAt) => {
    if (!createdAt) return "Not a member yet";
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Started today";
    }
    if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? "day" : "days"}`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    
    if (diffMonths < 12) {
      return `${diffMonths} ${diffMonths === 1 ? "month" : "months"}${remainingDays > 0 ? ` and ${remainingDays} ${remainingDays === 1 ? "day" : "days"}` : ""}`;
    }
    const diffYears = Math.floor(diffMonths / 12);
    const remainingMonths = diffMonths % 12;
    return `${diffYears} ${diffYears === 1 ? "year" : "years"}${remainingMonths > 0 ? `, ${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}` : ""}`;
  };

  // Helper to render badge based on status
  const renderStatusBadge = (statusStr) => {
    switch (statusStr) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "expired":
        return <Badge variant="warning">Expired</Badge>;
      case "inactive":
      default:
        return <Badge variant="outline">Inactive</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-secondary/30 rounded-xl" />
          <div className="h-7 w-64 bg-secondary/20 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[280px] bg-secondary/15 border border-border/30 rounded-xl" />
          <div className="h-[280px] bg-secondary/15 border border-border/30 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
        className="max-w-5xl space-y-8"
      >
        {/* Error Alert */}
        {error && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Mock Portal Notice Alert */}
        {showMockPortalNotice && (
          <motion.div variants={itemVariants}>
            <Alert variant="accent" className="bg-accent/15 border-accent/25 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
              <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <AlertTitle className="text-xs font-bold text-foreground">Stripe Sandbox Billing Portal</AlertTitle>
                <AlertDescription className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  The Stripe Billing Customer Portal is disabled in sandboxed mock mode. Use the dashboard controls directly to manage, upgrade, or reactivate your subscription.
                </AlertDescription>
              </div>
            </Alert>
          </motion.div>
        )}

        {/* Header Title */}
        <motion.div variants={itemVariants} className="flex justify-between items-end">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-accent">
              Membership Overview
            </span>
            <h2 className="font-heading text-xl font-extrabold text-foreground mt-1">
              Manage your giving subscription
            </h2>
          </div>
          <div className="hidden sm:block text-right">
            <span className="text-[10px] text-muted-foreground block">MEMBER ID</span>
            <span className="font-mono text-xs font-bold text-foreground">{subscription?.id?.substring(0, 8) || "—"}</span>
          </div>
        </motion.div>

        {/* Main Grid: Widget and Perks Panel */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Live Subscription Widget */}
          <SubscriptionWidget />

          {/* Perks Panel */}
          {plan && (status === "active" || status === "cancelled") ? (
            <Card className="p-6 border border-border bg-card relative overflow-hidden h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm text-foreground">
                    {plan.name} Benefits
                  </h3>
                </div>
                <ul className="space-y-3.5">
                  {plan.perks.map((perk, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground font-medium">
                      <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-border/40">
                <p className="text-[10px] text-muted-foreground/75 leading-relaxed">
                  Your contribution goes directly to audited impact channels. Select a yearly pricing cycle to save up to 20% on monthly billing.
                </p>
              </div>
            </Card>
          ) : (
            <Card className="p-6 flex flex-col items-center justify-center text-center gap-5 border border-dashed border-border/70 bg-secondary/5 min-h-[280px]">
              <div className="p-3 bg-secondary/10 rounded-full border border-border/30">
                <CreditCard className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground mb-1">
                  No Active Giving Tier
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Subscribe to a giving tier to participate in secure charity routing, gain Giving Score rankings, and enter eco-retreat prize draws.
                </p>
              </div>
              <Button asChild variant="accent" size="sm" className="font-bold shadow-sm">
                <a href="#comparison-matrix">
                  Browse Plan Tiers <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </Button>
            </Card>
          )}
        </motion.div>

        {/* Billing Detailed Information Card */}
        {subscription && (
          <motion.div variants={itemVariants}>
            <Card className="p-6 border border-border bg-card">
              <div className="flex items-center gap-2 mb-5">
                <Calendar className="w-4 h-4 text-accent" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Billing Details
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1 uppercase tracking-wider text-[9px]">
                    Plan Type
                  </span>
                  <span className="font-bold text-foreground capitalize">
                    {plan?.name || planKey || "None"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1 uppercase tracking-wider text-[9px]">
                    Status
                  </span>
                  <div className="flex items-center mt-0.5">
                    {renderStatusBadge(status)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1 uppercase tracking-wider text-[9px]">
                    Membership Duration
                  </span>
                  <span className="font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    {getMembershipDuration(subscription.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1 uppercase tracking-wider text-[9px]">
                    {status === "cancelled" ? "Expiration Date" : "Renewal Date"}
                  </span>
                  <span className="font-bold text-foreground block mt-0.5">
                    {subscription.renewal_date && status !== "expired"
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

        {/* Subscription Timeline */}
        {subscription && (
          <motion.div variants={itemVariants}>
            <SubscriptionTimeline subscription={subscription} status={status} />
          </motion.div>
        )}

        {/* Upgrade Prompt Banner */}
        {planKey === "scout" && status === "active" && (
          <motion.div variants={itemVariants}>
            <Card className="p-6 relative overflow-hidden border border-border/80 bg-card">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="accent">Upgrade Available</Badge>
                    <span className="text-[10px] text-accent font-bold uppercase tracking-wider">3× Draw Multiplier</span>
                  </div>
                  <h3 className="font-heading font-bold text-base text-foreground">
                    Unlock more impact with Global Advocate
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Get 3× draw entries, priority corporate draw access, and rotating NGO allocation lists for just $25/mo.
                  </p>
                </div>
                <Button asChild variant="accent" className="shrink-0 font-bold">
                  <a href="#comparison-matrix">
                    Upgrade Now <Sparkles className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Plan Comparison Matrix Section */}
        <motion.div variants={itemVariants} id="comparison-matrix" className="pt-6">
          <div className="mb-6">
            <h3 className="font-heading font-bold text-base text-foreground">
              Compare Giving Tiers
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select or upgrade your plan to direct your giving stream and gain exclusive benefits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(PLAN_DETAILS).map(([key, p]) => {
              const isCurrent = subscription?.plan_type === key && (status === "active" || status === "cancelled");
              return (
                <Card 
                  key={key} 
                  className={`p-6 border relative overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
                    isCurrent 
                      ? "border-accent bg-accent/5 ring-1 ring-accent/20" 
                      : "border-border bg-card"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-sm">
                      Current
                    </div>
                  )}
                  <div>
                    <h4 className="font-heading font-bold text-base text-foreground mb-1">{p.name}</h4>
                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-2xl font-extrabold text-foreground">${p.price}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">/ month</span>
                    </div>
                    <ul className="space-y-3 my-5">
                      {p.perks.map((perk, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground/60 mb-4">
                      Billed monthly · Cancel anytime
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Developer Webhook Simulation Panel */}
        {isMock && (
          <motion.div variants={itemVariants}>
            <SubscriptionSimulatorPanel onRefresh={refresh} />
          </motion.div>
        )}

        {/* FAQ Notice and Support */}
        <motion.div variants={itemVariants}>
          <div className="flex items-start gap-3 p-4 bg-secondary/15 border border-border/40 rounded-xl text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground mb-0.5 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-accent" /> Payment Integration Information
              </p>
              <p className="leading-relaxed mt-1">
                Stripe payment integration is active in sandbox mode. You can fully test subscription upgrades, renewals, and cancellations using our mock-gateway client. If you encounter any billing queries, please contact our administrator dashboard or email support at{" "}
                <span className="text-accent font-semibold hover:underline cursor-pointer">billing@fundora.org</span>.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
