"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { getUserPayments } from "@/services/subscriptionService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  Receipt, 
  Calendar, 
  DollarSign, 
  CreditCard,
  ExternalLink,
  Download,
  AlertCircle,
  Clock,
  Heart,
  TrendingUp
} from "lucide-react";

const PLAN_LABELS = {
  scout: "Eco Scout",
  advocate: "Global Advocate",
  builder: "Legacy Builder",
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

export default function BillingPage() {
  const { user } = useAuth();
  const { subscription, status: subStatus, loading: subLoading } = useSubscription();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadPayments() {
      if (!user) return;
      try {
        setLoading(true);
        const data = await getUserPayments(user.id);
        if (active) {
          setPayments(data || []);
        }
      } catch (err) {
        console.error("Failed to load payments:", err);
        if (active) {
          setError(err.message || "Failed to retrieve billing history");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadPayments();
    return () => {
      active = false;
    };
  }, [user]);

  // Aggregate total contributions
  const totalContributions = payments
    .filter(p => p.status === "succeeded")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // Map amount/price to plan label
  const getPlanLabel = (payment) => {
    const amt = parseFloat(payment.amount);
    const priceId = payment.stripe_price_id || "";
    
    if (priceId.includes("scout") || amt === 10 || amt === 96) return "Eco Scout";
    if (priceId.includes("advocate") || amt === 25 || amt === 240) return "Global Advocate";
    if (priceId.includes("builder") || amt === 100 || amt === 960) return "Legacy Builder";
    return "Fundora Support";
  };

  // Render status badges dynamically
  const renderStatusBadge = (status) => {
    switch (status) {
      case "succeeded":
      case "paid":
        return <Badge variant="success" className="text-[10px]">Paid</Badge>;
      case "pending":
        return <Badge variant="warning" className="text-[10px] bg-amber-500/10 border-amber-500/20 text-amber-500">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
      case "refunded":
        return <Badge variant="outline" className="text-[10px] bg-sky-500/15 border-sky-500/35 text-sky-400">Refunded</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  if (subLoading || loading) {
    return (
      <div className="p-6 md:p-8 space-y-8 animate-pulse">
        <div className="h-[200px] bg-secondary/15 border border-border/30 rounded-[24px]" />
        <div className="h-[300px] bg-secondary/15 border border-border/30 rounded-[24px]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="max-w-5xl space-y-8"
      >
        {error && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Billing Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* ── BILLING SUMMARY CARD ── */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Plan */}
            <Card className="p-6 border border-border bg-card/60 relative overflow-hidden flex flex-col justify-between h-40">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
              <div>
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground/80 block mb-1">
                  Active Tier
                </span>
                <h3 className="font-heading text-lg font-extrabold text-foreground capitalize mt-1.5 flex items-center gap-2">
                  <CreditCard className="w-4.5 h-4.5 text-accent" />
                  {subStatus === "active" || subStatus === "cancelled"
                    ? PLAN_LABELS[subscription?.plan_type] || "Eco Member"
                    : "No Active Plan"}
                </h3>
              </div>
              <div className="mt-4">
                {subStatus === "active" ? (
                  <span className="text-[10px] text-accent font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Billed automatically via Stripe
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    Subscribe to reactivate rewards
                  </span>
                )}
              </div>
            </Card>

            {/* Next Billing Date */}
            <Card className="p-6 border border-border bg-card/60 relative overflow-hidden flex flex-col justify-between h-40">
              <div>
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground/80 block mb-1">
                  {subStatus === "cancelled" ? "Terminates On" : "Next Billing Date"}
                </span>
                <h3 className="font-heading text-lg font-extrabold text-foreground mt-1.5 flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-accent" />
                  {subscription?.renewal_date && subStatus !== "expired"
                    ? new Date(subscription.renewal_date).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </h3>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Standard billing period cycle</span>
              </div>
            </Card>

            {/* Total Contributions */}
            <Card className="p-6 border border-border bg-card/60 relative overflow-hidden flex flex-col justify-between h-40">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Heart className="w-24 h-24 text-accent" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground/80 block mb-1">
                  Total Contributions
                </span>
                <h3 className="font-heading text-2xl font-extrabold text-accent mt-1.5 flex items-center">
                  <DollarSign className="w-5 h-5 -mr-1 text-accent" />
                  {totalContributions.toFixed(2)}
                </h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>100% directly routed to charities</span>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* ── TRANSACTION HISTORY TABLE ── */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div>
            <h3 className="font-heading font-extrabold text-base text-foreground">
              Contributions Log
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Historical ledger of contributions processed under your member account.
            </p>
          </div>

          <Card className="border border-border bg-card overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-4">
                <div className="p-3.5 bg-secondary/20 rounded-full border border-border/40 text-muted-foreground/45">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-foreground mb-1">No Transactions Logged</h4>
                  <p className="max-w-xs leading-relaxed">
                    Once payments are finalized through Stripe, receipts will automatically appear in this transaction feed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-secondary/15 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      <th className="py-4 px-6">Transaction Date</th>
                      <th className="py-4 px-6">Plan Tier</th>
                      <th className="py-4 px-6">Amount</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Receipt Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-secondary/5 transition-colors">
                        {/* Date */}
                        <td className="py-4.5 px-6 font-semibold text-foreground/90">
                          {new Date(payment.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        {/* Plan */}
                        <td className="py-4.5 px-6 font-bold text-foreground">
                          {getPlanLabel(payment)}
                        </td>
                        {/* Amount */}
                        <td className="py-4.5 px-6 font-mono font-bold text-accent">
                          ${parseFloat(payment.amount).toFixed(2)}
                        </td>
                        {/* Status */}
                        <td className="py-4.5 px-6">
                          {renderStatusBadge(payment.status)}
                        </td>
                        {/* Actions */}
                        <td className="py-4.5 px-6 text-right space-x-2.5">
                          <Button 
                            asChild 
                            variant="outline" 
                            size="xs" 
                            className="h-7 text-[10px] font-bold uppercase tracking-wider gap-1 border-border/65 hover:border-accent/40"
                          >
                            <a 
                              href={payment.invoice_pdf_url || `/dashboard/billing/invoice?payment_id=${payment.stripe_invoice_id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Download className="w-3 h-3" /> Receipt
                            </a>
                          </Button>
                          <Button 
                            asChild 
                            variant="accent" 
                            size="xs" 
                            className="h-7 text-[10px] font-bold uppercase tracking-wider gap-1"
                          >
                            <a 
                              href={payment.hosted_invoice_url || `/dashboard/billing/invoice?payment_id=${payment.stripe_invoice_id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-3 h-3" /> Invoice
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
