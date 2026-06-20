"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ShieldCheck, Calendar, XCircle, CreditCard, AlertCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function SubscriptionWidget() {
  const { subscription, status, loading, error, subscribe, cancel } = useSubscription();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const plans = {
    scout: { name: "Eco Scout", price: 10, description: "Automate contributions targeting forest preservation." },
    advocate: { name: "Global Advocate", price: 25, description: "Allocation to verified clean water & basic healthcare." },
    builder: { name: "Legacy Builder", price: 100, description: "Sponsor advanced STEM fellowships and emergency grids." }
  };

  const handleSubscribe = async (tier) => {
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

  if (loading || actionLoading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[220px]">
        <LoadingState message="Connecting to secure giving gateway..." />
      </Card>
    );
  }

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
        <Card className="p-6 border-accent bg-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <Badge variant="accent" className="mb-2">ACTIVE MEMBER</Badge>
              <h3 className="font-heading font-extrabold text-xl text-foreground">
                {plans[subscription.plan_type]?.name || "Active Tier"}
              </h3>
            </div>
            <ShieldCheck className="w-6 h-6 text-accent" />
          </div>
          <div className="space-y-4 text-xs">
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
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Audited Routing</span>
              <span className="font-bold text-emerald-500">100.0% Verified</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border/30">
            <Button onClick={() => setIsCancelModalOpen(true)} variant="destructive" className="w-full text-xs font-bold uppercase tracking-wider cancel-subscription-btn">
              Cancel Subscription
            </Button>
          </div>
        </Card>
      )}

      {/* Cancelled but not expired view */}
      {status === "cancelled" && (
        <Card className="p-6 border-destructive/30 bg-card/60 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <Badge variant="destructive" className="mb-2 bg-destructive/10 text-destructive border-destructive/20">CANCELED</Badge>
              <h3 className="font-heading font-extrabold text-xl text-foreground">
                {plans[subscription.plan_type]?.name || "Cancelled Tier"}
              </h3>
            </div>
            <XCircle className="w-6 h-6 text-destructive/80" />
          </div>
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Your giving subscription is set to terminate at the end of the current cycle. You will retain draw eligibility and impact points until:
            </p>
            <div className="bg-background/40 p-2.5 border border-border/30 rounded-sm font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              {new Date(subscription.renewal_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border/30 flex gap-3">
            <Button onClick={() => handleSubscribe(subscription.plan_type)} variant="accent" className="flex-1 text-xs font-bold uppercase tracking-wider reactivate-subscription-btn">
              Re-Activate Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Expired / Inactive View */}
      {(status === "inactive" || status === "expired") && (
        <Card className="p-6 border-border/80 bg-card relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Badge variant="outline" className="mb-2 uppercase">INACTIVE</Badge>
              <h3 className="font-heading font-bold text-lg text-foreground">No Active Plan</h3>
            </div>
            <CreditCard className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-6">
            Select a giving tier to participate in secure charity routing and unlock automated ticket entries for upcoming retreat draws.
          </p>
          
          <div className="space-y-3">
            {Object.entries(plans).map(([key, p]) => (
              <div key={key} className="p-3 bg-secondary/10 border border-border/30 rounded-sm flex items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="block text-xs font-bold text-foreground">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">{p.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-accent">${p.price}/mo</span>
                  <Button onClick={() => handleSubscribe(key)} variant="accent" size="xs" className="uppercase font-bold tracking-wider text-[9px] select-tier-btn">
                    Select Tier
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Giving Subscription?"
      >
        <div className="space-y-4">
          <div className="flex gap-3 bg-destructive/10 border border-destructive/20 p-4 rounded-sm text-destructive">
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
