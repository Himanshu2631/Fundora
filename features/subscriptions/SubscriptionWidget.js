"use client";

import { useSubscription } from "@/hooks/useSubscription";
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
  RefreshCw
} from "lucide-react";
import { useState } from "react";

export default function SubscriptionWidget() {
  const { subscription, status, loading, error, subscribe, cancel, update } = useSubscription();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [isCancelModalOpen, _setIsCancelModalOpen] = useState(false);
  const [isUpgradeModalOpen, _setIsUpgradeModalOpen] = useState(false);

  const setIsCancelModalOpen = (val) => {
    if (val) _setIsUpgradeModalOpen(false);
    _setIsCancelModalOpen(val);
  };

  const setIsUpgradeModalOpen = (val) => {
    if (val) _setIsCancelModalOpen(false);
    _setIsUpgradeModalOpen(val);
  };

  const plans = {
    scout: { 
      name: "Eco Scout", 
      price: 10, 
      description: "Automate contributions targeting forest preservation.",
      perks: ["1× draw entry", "+10 score/mo", "Audit receipts"]
    },
    advocate: { 
      name: "Global Advocate", 
      price: 25, 
      description: "Allocation to verified clean water & basic healthcare.",
      perks: ["3× draw multiplier", "+30 score/mo", "Priority draws", "Cause rotation"]
    },
    builder: { 
      name: "Legacy Builder", 
      price: 100, 
      description: "Sponsor advanced STEM fellowships and emergency grids.",
      perks: ["10× draw multiplier", "+150 score/mo", "On-chain receipts", "NGO access"]
    }
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
      await subscribe(tier);
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
      await subscribe(subscription.plan_type);
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Failed to renew subscription.");
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

  return (
    <div className="space-y-6">
      {/* Display errors if any */}
      {(error || actionError) && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Subscription Error</AlertTitle>
          <AlertDescription>{actionError || error}</AlertDescription>
        </Alert>
      )}

      {/* Active Subscription View */}
      {status === "active" && (
        <Card className="p-6 border-accent bg-card relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {renderStatusBadge()}
                <span className="text-[9px] uppercase tracking-widest font-bold text-accent">Active Member</span>
              </div>
              <h3 className="font-heading font-extrabold text-xl text-foreground">
                {plans[subscription.plan_type]?.name || "Active Tier"}
              </h3>
            </div>
            <ShieldCheck className="w-6 h-6 text-accent animate-pulse" />
          </div>
          
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground font-semibold">Monthly Allocation</span>
              <span className="font-bold text-foreground">
                ${(plans[subscription.plan_type]?.price || 0).toFixed(2)}/mo
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground font-semibold">Next Renewal Date</span>
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                {new Date(subscription.renewal_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground font-semibold">Membership Duration</span>
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent" />
                {getMembershipDuration(subscription.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Audited Routing</span>
              <span className="font-bold text-emerald-500">100.0% Verified</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border/30 flex gap-3">
            <Button 
              onClick={() => setIsUpgradeModalOpen(true)} 
              variant="accent" 
              className="flex-1 text-xs font-bold uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5" /> Upgrade Plan
            </Button>
            <Button 
              onClick={() => setIsCancelModalOpen(true)} 
              variant="destructive" 
              className="flex-1 text-xs font-bold uppercase tracking-wider cancel-subscription-btn"
            >
              Cancel Subscription
            </Button>
          </div>
        </Card>
      )}

      {/* Cancelled Subscription View */}
      {status === "cancelled" && (
        <Card className="p-6 border-destructive/30 bg-card/60 relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {renderStatusBadge()}
              </div>
              <h3 className="font-heading font-extrabold text-xl text-foreground">
                {plans[subscription.plan_type]?.name || "Cancelled Tier"}
              </h3>
            </div>
            <XCircle className="w-6 h-6 text-destructive/85" />
          </div>

          <div className="space-y-3.5 text-xs mb-6">
            <p className="text-muted-foreground leading-relaxed">
              Your giving subscription is scheduled to terminate at the end of the current cycle. You will retain draw eligibility and impact points until:
            </p>
            <div className="bg-background/40 p-2.5 border border-border/30 rounded-xl font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              {new Date(subscription.renewal_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex justify-between border-t border-border/20 pt-2.5">
              <span className="text-muted-foreground font-semibold">Membership Duration</span>
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent" />
                {getMembershipDuration(subscription.created_at)}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border/30 flex gap-3">
            <Button 
              onClick={handleRenew} 
              variant="accent" 
              className="flex-1 text-xs font-bold uppercase tracking-wider reactivate-subscription-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Renew Subscription
            </Button>
            <Button 
              onClick={() => setIsUpgradeModalOpen(true)} 
              variant="outline" 
              className="flex-1 text-xs font-bold uppercase tracking-wider"
            >
              Change Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Expired Subscription View */}
      {status === "expired" && (
        <Card className="p-6 border-amber-500/20 bg-card relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {renderStatusBadge()}
              </div>
              <h3 className="font-heading font-extrabold text-xl text-foreground">
                {plans[subscription.plan_type]?.name || "Expired Plan"}
              </h3>
            </div>
            <AlertTriangle className="w-6 h-6 text-amber-500/90" />
          </div>

          <div className="space-y-3.5 text-xs mb-6">
            <p className="text-muted-foreground leading-relaxed">
              Your giving subscription has expired due to non-payment or cycle end. Renew today to restore your draw eligibility and active streak bonuses.
            </p>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground font-semibold">Membership Duration</span>
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent" />
                {getMembershipDuration(subscription.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Last Active On</span>
              <span className="font-bold text-muted-foreground">
                {new Date(subscription.renewal_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
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
              className="flex-1 text-xs font-bold uppercase tracking-wider"
            >
              Switch Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Inactive / No Plan View */}
      {status === "inactive" && (
        <Card className="p-6 border-border bg-card relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {renderStatusBadge()}
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground">No Active Plan</h3>
            </div>
            <CreditCard className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="space-y-3.5 text-xs mb-6">
            <p className="text-muted-foreground leading-relaxed">
              Select a giving tier to participate in secure, audited charity routing and unlock automatic draw entries.
            </p>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground font-semibold">Membership Duration</span>
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent" />
                {getMembershipDuration(null)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Renewal Date</span>
              <span className="font-bold text-muted-foreground">N/A</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-border/30">
            {Object.entries(plans).map(([key, p]) => (
              <div 
                key={key} 
                className="p-3 bg-secondary/15 border border-border/45 rounded-xl flex items-center justify-between gap-4 transition-all hover:bg-secondary/20"
              >
                <div className="flex-1">
                  <span className="block text-xs font-bold text-foreground">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">{p.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-accent">${p.price}/mo</span>
                  <Button 
                    onClick={() => handleSubscribe(key)} 
                    variant="accent" 
                    size="xs" 
                    className="uppercase font-bold tracking-wider text-[9px] select-tier-btn"
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))}
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
