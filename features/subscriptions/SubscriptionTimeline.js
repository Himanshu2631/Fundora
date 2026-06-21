"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { getUserPayments } from "@/services/subscriptionService";
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Calendar,
  DollarSign
} from "lucide-react";

const PLAN_LABELS = {
  scout: "Eco Scout",
  advocate: "Global Advocate",
  builder: "Legacy Builder"
};

export default function SubscriptionTimeline({ subscription, status }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let active = true;
    const fetchPayments = async () => {
      try {
        const data = await getUserPayments(user.id);
        if (active) {
          setPayments(data || []);
        }
      } catch (err) {
        console.error("Timeline: Failed to load payments:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchPayments();
    return () => {
      active = false;
    };
  }, [user]);

  if (!subscription) return null;

  // Build chronological events
  const events = [];

  // Event 1: Subscription Activated
  events.push({
    id: "activation",
    type: "activation",
    title: "Giving Plan Activated",
    description: `Subscribed to ${PLAN_LABELS[subscription.plan_type] || "Eco Member"} tier.`,
    date: new Date(subscription.created_at),
    icon: Sparkles,
    color: "text-accent bg-accent/15 border-accent/30"
  });

  // Event 2: Payments Succeeded / Failed
  payments.forEach((payment) => {
    if (payment.status === "succeeded") {
      events.push({
        id: `pay-success-${payment.id}`,
        type: "payment_success",
        title: "Contribution Received",
        description: `Successfully processed billing invoice of $${parseFloat(payment.amount).toFixed(2)}.`,
        date: new Date(payment.created_at),
        icon: CheckCircle2,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      });
    } else if (payment.status === "failed") {
      events.push({
        id: `pay-failed-${payment.id}`,
        type: "payment_failed",
        title: "Billing Transaction Failed",
        description: `Invoice collection of $${parseFloat(payment.amount).toFixed(2)} was declined.`,
        date: new Date(payment.created_at),
        icon: AlertTriangle,
        color: "text-rose-500 bg-rose-500/10 border-rose-500/30"
      });
    }
  });

  // Event 3: Future renewal / cancellation schedule / expired
  const renewalDate = new Date(subscription.renewal_date);
  
  if (status === "active" || status === "trialing") {
    events.push({
      id: "renewal-schedule",
      type: "renewal_schedule",
      title: "Renewal Scheduled",
      description: `Next automated allocation cycle scheduled to process.`,
      date: renewalDate,
      icon: Calendar,
      color: "text-accent bg-accent/10 border-accent/20",
      isFuture: true
    });
  } else if (status === "cancelled") {
    events.push({
      id: "cancellation-schedule",
      type: "cancellation_schedule",
      title: "Cancellation Scheduled",
      description: `Pending plan cancellation. Access remains active until expiration date.`,
      date: renewalDate,
      icon: XCircle,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      isFuture: true
    });
  } else if (status === "expired") {
    events.push({
      id: "expired-milestone",
      type: "expired_milestone",
      title: "Giving Plan Expired",
      description: `Access terminated. Streak bonuses and draw eligibility suspended.`,
      date: renewalDate,
      icon: XCircle,
      color: "text-muted-foreground bg-secondary border-border/70"
    });
  }

  // Sort events chronologically (oldest to newest)
  events.sort((a, b) => a.date - b.date);

  if (loading) {
    return (
      <Card className="p-6 border border-border bg-card animate-pulse">
        <div className="h-4 w-32 bg-secondary/30 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-secondary/20 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-secondary/20 rounded w-1/3" />
                <div className="h-2.5 bg-secondary/15 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border border-border bg-card">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-4 h-4 text-accent" />
        <h3 className="font-heading font-extrabold text-sm text-foreground">
          Subscription Timeline & History
        </h3>
      </div>

      <div className="relative pl-6 border-l border-border/60 ml-3.5 space-y-6">
        {events.map((event, index) => {
          const Icon = event.icon;
          return (
            <div key={event.id} className="relative">
              {/* Chronological Circle Node */}
              <div className={`absolute -left-[35px] top-0 w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${event.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className={`text-xs font-bold ${event.isFuture ? "text-accent" : "text-foreground"}`}>
                    {event.title}
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {event.date.toLocaleDateString(undefined, { 
                      month: "short", 
                      day: "numeric", 
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
