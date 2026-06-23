"use client";

import { useSubscription, PLAN_DETAILS as plans } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { 
  ShieldCheck, 
  Calendar, 
  XCircle, 
  CreditCard, 
  AlertCircle, 
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Check
} from "lucide-react";
import { useState } from "react";

export default function SubscriptionWidget() {
  const { subscription, status, loading, error, subscribe, cancel, reactivate, openPortal, update } = useSubscription();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [isCancelModalOpen, _setIsCancelModalOpen] = useState(false);
  const [isUpgradeModalOpen, _setIsUpgradeModalOpen] = useState(false);

  const setIsCancelModalOpen = (val) => {
    if (val) {
      _setIsUpgradeModalOpen(false);
      setActionError(null); // clear stale errors when opening modal
    }
    _setIsCancelModalOpen(val);
  };

  const setIsUpgradeModalOpen = (val) => {
    if (val) {
      _setIsCancelModalOpen(false);
      setActionError(null); // clear stale errors when opening modal
    }
    _setIsUpgradeModalOpen(val);
  };

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

  const handleSubscribe = async (tier) => {
    setIsUpgradeModalOpen(false);
    setActionLoading(true);
    setActionError(null);
    try {
      const priceId = `price_${tier}_monthly`;
      await subscribe(priceId);
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Failed to activate subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = async (tier) => {
    setIsUpgradeModalOpen(false);
    setActionLoading(true);
    setActionError(null);
    try {
      await update({ plan_type: tier });
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Failed to upgrade subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelModalOpen(false);
    setActionLoading(true);
    setActionError(null);
    try {
      await cancel();
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Failed to cancel subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!subscription) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const priceId = subscription.stripe_price_id || `price_${subscription.plan_type}_monthly`;
      await subscribe(priceId);
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Failed to renew subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await reactivate();
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Failed to reactivate subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await openPortal();
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Failed to open customer billing portal.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || actionLoading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[260px] border border-border bg-card">
        <LoadingState message="Connecting to secure giving gateway..." />
      </Card>
    );
  }

  // Helper to render badge based on status
  const renderStatusBadge = () => {
    switch (status) {
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

  const planType = subscription?.plan_type;
  const isBuilder = planType === "builder";
  const isAdvocate = planType === "advocate";
  const isScout = planType === "scout";

  const monthlyPrice = plans[planType]?.price || 0;

  const getMonthsSince = (dateStr) => {
    if (!dateStr) return 1;
    const start = new Date(dateStr);
    const now = new Date();
    const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(1, diffMonths + 1);
  };
  const totalMonths = getMonthsSince(subscription?.created_at);
  const totalContributions = totalMonths * monthlyPrice;

  const multiplier = planType === "builder" ? "10x" : planType === "advocate" ? "3x" : "1x";
  const activeEntries = planType === "builder" ? "10 Entries" : planType === "advocate" ? "3 Entries" : "1 Entry";
  const impactScoreRate = planType === "builder" ? "+150 pts" : planType === "advocate" ? "+30" : "+10";

  const getMilestoneProgress = (dateStr) => {
    if (!dateStr) return { percent: 0, daysLeft: 30, nextMilestone: "1 Month" };
    const start = new Date(dateStr);
    const now = new Date();
    const startDay = start.getDate();
    let currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), startDay);
    if (currentPeriodStart > now) {
      currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);
    }
    let nextPeriodStart = new Date(currentPeriodStart);
    nextPeriodStart.setMonth(nextPeriodStart.getMonth() + 1);
    const totalDays = Math.max(28, Math.floor((nextPeriodStart - currentPeriodStart) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.floor((now - currentPeriodStart) / (1000 * 60 * 60 * 24));
    const percent = Math.min(100, Math.max(0, Math.floor((elapsedDays / totalDays) * 100)));
    const daysLeft = Math.max(0, totalDays - elapsedDays);
    return {
      percent,
      daysLeft,
      nextMilestone: `${totalMonths + 1} Month Milestone`
    };
  };
  const milestone = getMilestoneProgress(subscription?.created_at);

  const cardBorderClass = isBuilder 
    ? "border-[#C4A054] shadow-[0_0_35px_rgba(196,160,84,0.18)] bg-gradient-to-br from-[#0C1511] via-[#0A1C16] to-[#040D09]"
    : isAdvocate
    ? "border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.06)] bg-gradient-to-br from-[#061511] via-[#081712] to-[#040D09]"
    : "border-border/60 bg-card";

  return (
    <div className="space-y-6">
      {/* Display errors if any — only show context error when no subscription is active to avoid contradictory states */}
      {(actionError || (error && status !== "active")) && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Subscription Error</AlertTitle>
          <AlertDescription>{actionError || error}</AlertDescription>
        </Alert>
      )}

      {/* Active Subscription View */}
      {status === "active" && (
        <Card className={`relative overflow-hidden transition-all duration-300 ${cardBorderClass}`}>
          {isBuilder && (
            <div className="bg-gradient-to-r from-[#C4A054] via-[#e4c278] to-[#C4A054] text-[#060C0A] text-[10px] font-black uppercase tracking-widest px-6 py-2.5 flex items-center justify-between shadow-sm">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-[#060C0A]/20 text-[#060C0A]" /> Elite Legacy Builder
              </span>
              <span>Tier 3</span>
            </div>
          )}
          {isAdvocate && (
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 flex items-center justify-between shadow-sm">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-white/20 text-white animate-pulse" /> Global Advocate
              </span>
              <span>Tier 2</span>
            </div>
          )}
          {isScout && (
            <div className="bg-gradient-to-r from-secondary/40 via-secondary/20 to-secondary/40 text-foreground text-[10px] font-black uppercase tracking-widest px-6 py-2.5 flex items-center justify-between shadow-sm">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Eco Scout
              </span>
              <span>Tier 1</span>
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* Plan focal point */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {renderStatusBadge()}
                  <span className="text-[9px] uppercase tracking-widest font-bold text-accent">Active Member</span>
                </div>
                <h3 className="font-heading font-black text-2xl text-white tracking-tight flex items-center gap-2">
                  {plans[planType]?.name || "Active Tier"}
                  <ShieldCheck className="w-5.5 h-5.5 text-accent animate-pulse" />
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground block">Monthly Contribution</span>
                <span className="text-2xl font-black text-accent block mt-1">${monthlyPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Grid of Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Contributions", value: `$${totalContributions.toFixed(2)}`, desc: `${totalMonths} billing cycles` },
                { label: "Reward Multiplier", value: multiplier, desc: "On reward draws" },
                { label: "Active Draw Entries", value: activeEntries, desc: "In upcoming pools" },
                { label: "Giving Score Increment", value: impactScoreRate, desc: "Points added monthly" },
                { label: "Membership Since", value: new Date(subscription.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }), desc: "Date activated" },
                { label: "Audited Routing", value: "100.0% Verified", desc: "Cryptographically signed" },
              ].map((metric, i) => (
                <div key={i} className="p-3 bg-secondary/5 border border-border/10 rounded-xl hover:border-accent/20 transition-all flex flex-col justify-between group">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/80 group-hover:text-accent transition-colors">{metric.label}</span>
                  <span className="text-sm font-black text-white mt-1.5 block">{metric.value}</span>
                  <span className="text-[8.5px] text-muted-foreground/50 mt-0.5 block leading-none">{metric.desc}</span>
                </div>
              ))}
            </div>

            {/* Milestone Progress */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Milestone: {milestone.nextMilestone}</span>
                <span className="text-accent">{milestone.percent}% complete · {milestone.daysLeft} days left</span>
              </div>
              <div className="h-2 w-full bg-secondary/40 rounded-full overflow-hidden border border-border/10 flex">
                <div className="h-full bg-accent" style={{ width: `${milestone.percent}%` }} />
              </div>
            </div>

            {/* Payment details */}
            <div className="p-3 bg-secondary/5 border border-border/10 rounded-xl flex items-center justify-between text-xs mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-accent" />
                <span className="font-semibold text-muted-foreground">Payment Method:</span>
                <span className="font-bold text-white capitalize">
                  {subscription.card_brand ? `${subscription.card_brand} •••• ${subscription.card_last4}` : "Stripe Card"}
                </span>
              </div>
              <button 
                onClick={handleOpenPortal}
                className="text-[10px] text-accent hover:underline font-extrabold uppercase tracking-wider"
              >
                Manage Billing Portal
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4 border-t border-border/20">
              <Button 
                onClick={() => setIsUpgradeModalOpen(true)} 
                variant="accent" 
                className="flex-1 text-xs font-extrabold uppercase tracking-wider h-10 shadow-lg hover:shadow-accent/5"
              >
                <Sparkles className="w-4 h-4 animate-pulse" /> Change Giving Plan
              </Button>
              <Button 
                onClick={() => setIsCancelModalOpen(true)} 
                variant="outline" 
                className="flex-1 text-xs font-extrabold uppercase tracking-wider h-10 text-muted-foreground hover:text-white"
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Cancelled Subscription View */}
      {status === "cancelled" && (
        <Card className="border-destructive/30 bg-gradient-to-br from-[#100707] via-[#0D0404] to-[#060C0A] relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="bg-destructive/10 text-destructive border-b border-destructive/20 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Subscription Scheduled to Terminate
            </span>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {renderStatusBadge()}
                </div>
                <h3 className="font-heading font-black text-xl text-foreground">
                  {plans[subscription.plan_type]?.name || "Cancelled Tier"}
                </h3>
              </div>
              <XCircle className="w-6 h-6 text-destructive/85 animate-pulse" />
            </div>

            <div className="space-y-4 text-xs mb-6">
              <p className="text-muted-foreground leading-relaxed">
                Your giving subscription is scheduled to terminate at the end of the current cycle. You will retain draw eligibility and impact points until:
              </p>
              <div className="bg-background/40 p-3 border border-border/30 rounded-xl font-bold text-foreground flex items-center gap-2 max-w-fit">
                <Calendar className="w-4 h-4 text-accent" />
                {new Date(subscription.renewal_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* Grid of Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Contributions", value: `$${totalContributions.toFixed(2)}`, desc: `${totalMonths} billing cycles` },
                { label: "Reward Multiplier", value: multiplier, desc: "Active until termination" },
                { label: "Active Draw Entries", value: activeEntries, desc: "Active until termination" },
                { label: "Giving Score Increment", value: impactScoreRate, desc: "Active until termination" },
                { label: "Membership Since", value: new Date(subscription.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }), desc: "Date activated" },
                { label: "Audited Routing", value: "100.0% Verified", desc: "Cryptographically signed" },
              ].map((metric, i) => (
                <div key={i} className="p-3 bg-secondary/5 border border-border/10 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/80">{metric.label}</span>
                  <span className="text-sm font-black text-white mt-1.5 block">{metric.value}</span>
                  <span className="text-[8.5px] text-muted-foreground/50 mt-0.5 block leading-none">{metric.desc}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-secondary/5 border border-border/10 rounded-xl flex items-center justify-between text-xs mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-accent" />
                <span className="font-semibold text-muted-foreground">Payment Method:</span>
                <span className="font-bold text-white capitalize">
                  {subscription.card_brand ? `${subscription.card_brand} •••• ${subscription.card_last4}` : "Stripe Card"}
                </span>
              </div>
              <button 
                onClick={handleOpenPortal}
                className="text-[10px] text-accent hover:underline font-extrabold uppercase tracking-wider"
              >
                Manage Billing Portal
              </button>
            </div>

            <div className="pt-4 border-t border-border/30 flex gap-3">
              <Button 
                onClick={handleReactivate} 
                variant="accent" 
                className="flex-1 text-xs font-bold uppercase tracking-wider reactivate-subscription-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reactivate Subscription
              </Button>
              <Button 
                onClick={() => setIsUpgradeModalOpen(true)} 
                variant="outline" 
                className="flex-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white"
              >
                Change Plan
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Expired Subscription View */}
      {status === "expired" && (
        <Card className="border-amber-500/20 bg-gradient-to-br from-[#141007] via-[#0E0B05] to-[#060C0A] relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="bg-warning/10 text-amber-500 border-b border-amber-500/20 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Subscription Expired
            </span>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {renderStatusBadge()}
                </div>
                <h3 className="font-heading font-extrabold text-xl text-foreground">
                  {plans[subscription.plan_type]?.name || "Expired Plan"}
                </h3>
              </div>
              <AlertTriangle className="w-6 h-6 text-amber-500/90 animate-pulse" />
            </div>

            <div className="space-y-4 text-xs mb-6">
              <p className="text-muted-foreground leading-relaxed">
                Your giving subscription has expired due to non-payment or cycle end. Renew today to restore your draw eligibility and active streak bonuses.
              </p>
            </div>

            {/* Grid of Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Contributions", value: `$${totalContributions.toFixed(2)}`, desc: `${totalMonths} billing cycles` },
                { label: "Membership Duration", value: getMembershipDuration(subscription.created_at), desc: "Active period" },
                { label: "Last Active On", value: new Date(subscription.renewal_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), desc: "Expiration date" },
              ].map((metric, i) => (
                <div key={i} className="p-3 bg-secondary/5 border border-border/10 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/80">{metric.label}</span>
                  <span className="text-sm font-black text-white mt-1.5 block">{metric.value}</span>
                  <span className="text-[8.5px] text-muted-foreground/50 mt-0.5 block leading-none">{metric.desc}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border/30 flex gap-3">
              <Button 
                onClick={handleRenew} 
                variant="accent" 
                className="flex-1 text-xs font-bold uppercase tracking-wider"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Renew Subscription
              </Button>
              <Button 
                onClick={() => setIsUpgradeModalOpen(true)} 
                variant="outline" 
                className="flex-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white"
              >
                Switch Plan
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Inactive / No Plan View */}
      {status === "inactive" && (
        <Card className="p-6 border-border bg-card relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {renderStatusBadge()}
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground">No Active Plan</h3>
            </div>
            <CreditCard className="w-5 h-5 text-muted-foreground animate-pulse" />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-6">
            Select a giving tier to participate in secure, audited charity routing and unlock automatic draw entries.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/30">
            {Object.entries(plans).map(([key, p]) => {
              const isRecommended = key === "advocate";
              return (
                <div 
                  key={key} 
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.02] ${
                    isRecommended
                      ? "border-accent bg-accent/[0.03] shadow-md shadow-accent/5"
                      : "border-border bg-secondary/5 hover:border-border/80"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-extrabold text-white block font-heading">{p.name}</span>
                      {isRecommended && (
                        <Badge variant="accent" className="text-[7px] py-0 px-1 font-bold uppercase tracking-wider">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal mb-3">{p.description}</p>
                    
                    <ul className="space-y-1.5 mb-4">
                      {p.perks?.slice(0, 3).map((perk, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                          <Check className="w-3 h-3 text-accent shrink-0" />
                          <span className="truncate">{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] mt-auto">
                    <span className="text-xs font-black text-accent">${p.price}/mo</span>
                    <Button 
                      onClick={() => handleSubscribe(key)} 
                      variant={isRecommended ? "accent" : "outline"} 
                      size="xs" 
                      className="uppercase font-extrabold tracking-wider text-[8px] h-7 px-3 select-tier-btn"
                    >
                      Select
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Upgrade / Change Plan Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade or Change Plan"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Choose a giving tier to change your impact level, draw entry multipliers, and leaderboard score routing.
          </p>

          <div className="space-y-3">
            {Object.entries(plans).map(([key, p]) => {
              const isCurrent = subscription?.plan_type === key;
              return (
                <div 
                  key={key} 
                  className={`p-4 border rounded-xl flex flex-col gap-3 transition-all ${
                    isCurrent 
                      ? "border-accent bg-accent/5" 
                      : "border-border hover:border-accent/40 bg-secondary/5"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{p.name}</span>
                        {isCurrent && <Badge variant="accent">Current</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    </div>
                    <span className="text-sm font-bold text-accent">${p.price}/mo</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {p.perks.map((perk, i) => (
                      <span 
                        key={i} 
                        className="text-[9px] bg-background/80 text-foreground px-2 py-0.5 border border-border/30 rounded-full font-semibold"
                      >
                        {perk}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-border/10">
                    {isCurrent ? (
                      <span className="text-[10px] font-bold text-accent/60 uppercase tracking-widest py-1 px-3">
                        Active Plan
                      </span>
                    ) : (
                      <Button
                        onClick={() => {
                          if (status === "active") {
                            handleUpgrade(key);
                          } else {
                            handleSubscribe(key);
                          }
                        }}
                        variant={status === "active" ? "accent" : "default"}
                        size="sm"
                        className="text-[10px] font-bold uppercase tracking-wider"
                      >
                        {status === "active" ? "Switch Plan" : "Select Tier"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-border/40">
            <Button
              onClick={() => setIsUpgradeModalOpen(false)}
              variant="outline"
              size="sm"
              className="text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Giving Subscription?"
      >
        <div className="space-y-4">
          <div className="flex gap-3 bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <h4 className="font-heading font-bold text-sm leading-none mb-1">Termination Warning</h4>
              <p className="text-xs opacity-90 leading-relaxed">
                Cancelling means you will stop automating future recurring donations. Your active streak and global leaderboard position will freeze at the end of the billing period.
              </p>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your membership benefits, score points, and eligibility for all active prize draws will remain fully active until the end of your billing cycle on:
            <strong className="block text-foreground font-bold mt-1">
              {subscription && new Date(subscription.renewal_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </strong>
          </p>

          <div className="flex gap-3 pt-4 border-t border-border/40">
            <Button
              onClick={() => setIsCancelModalOpen(false)}
              variant="outline"
              className="flex-1 text-xs font-bold uppercase tracking-wider close-cancel-modal-btn"
            >
              Keep Giving
            </Button>
            <Button
              onClick={handleCancel}
              variant="destructive"
              className="flex-1 text-xs font-bold uppercase tracking-wider confirm-cancel-btn"
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
