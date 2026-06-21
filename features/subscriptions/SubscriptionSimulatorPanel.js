"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, 
  Sparkles, 
  RefreshCw, 
  ShieldAlert, 
  Trash2, 
  DollarSign, 
  Clock,
  Play
} from "lucide-react";

export default function SubscriptionSimulatorPanel({ onRefresh }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = async (action, status = null) => {
    setLoadingAction(action + (status || ""));
    setMessage(null);
    setError(null);
    try {
      const payload = { action };
      if (status) payload.status = status;
      if (action === "checkout") {
        payload.priceId = "price_scout_monthly";
      }

      const res = await fetch("/api/stripe/mock-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Simulation failed");
      }

      setMessage(`Simulation successful: ${action} ${status || ""} triggered.`);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong during simulation.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Card className="p-6 border border-dashed border-accent/40 bg-accent/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-accent/10 border-b border-l border-accent/20 px-3 py-1 text-[9px] font-mono text-accent rounded-bl-xl uppercase tracking-widest font-bold">
        Stripe Webhook Sandbox
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Terminal className="w-4 h-4 text-accent animate-pulse" />
        <h3 className="font-heading font-extrabold text-sm text-foreground">
          Developer Lifecycle Simulation Console
        </h3>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-6">
        Simulate Stripe Webhook events and subscription lifecycle state transitions. These actions execute simulated webhook reconciliations in the database directly.
      </p>

      {/* Action Messages */}
      {message && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Simulation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Action 1: Checkout Session Completed */}
        <div className="p-3 bg-card/60 border border-border/40 rounded-xl flex flex-col justify-between gap-3 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-foreground">1. Checkout Completed</span>
              <Badge variant="success" className="text-[8px]">Active</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Triggers <code className="font-mono text-[9px] text-accent">checkout.session.completed</code>. Activates Eco Scout plan.
            </p>
          </div>
          <Button
            onClick={() => runSimulation("checkout")}
            disabled={loadingAction !== null}
            variant="accent"
            size="xs"
            className="w-full text-[10px] font-bold uppercase tracking-wider h-8"
          >
            {loadingAction === "checkout" ? "Triggering..." : "Simulate Checkout"}
          </Button>
        </div>

        {/* Action 2: Customer Subscription Updated (Trialing) */}
        <div className="p-3 bg-card/60 border border-border/40 rounded-xl flex flex-col justify-between gap-3 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-foreground">2. Set Trialing</span>
              <Badge variant="warning" className="text-[8px] bg-amber-500/15 text-amber-500 border border-amber-500/30">Trialing</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Triggers <code className="font-mono text-[9px] text-accent">customer.subscription.updated</code>. Sets status to trialing.
            </p>
          </div>
          <Button
            onClick={() => runSimulation("update_status", "trialing")}
            disabled={loadingAction !== null}
            variant="outline"
            size="xs"
            className="w-full text-[10px] font-bold uppercase tracking-wider h-8 hover:bg-accent/10 hover:text-accent"
          >
            {loadingAction === "update_statustrialing" ? "Triggering..." : "Simulate Trialing"}
          </Button>
        </div>

        {/* Action 3: Invoice Payment Succeeded (Renewal) */}
        <div className="p-3 bg-card/60 border border-border/40 rounded-xl flex flex-col justify-between gap-3 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-foreground">3. Invoice Paid</span>
              <Badge variant="success" className="text-[8px]">Renewal</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Triggers <code className="font-mono text-[9px] text-accent">invoice.payment_succeeded</code>. Extends renewal +1 month.
            </p>
          </div>
          <Button
            onClick={() => runSimulation("payment_succeeded")}
            disabled={loadingAction !== null}
            variant="outline"
            size="xs"
            className="w-full text-[10px] font-bold uppercase tracking-wider h-8 hover:bg-accent/10 hover:text-accent"
          >
            {loadingAction === "payment_succeeded" ? "Triggering..." : "Simulate Paid Renewal"}
          </Button>
        </div>

        {/* Action 4: Invoice Payment Failed (Past Due) */}
        <div className="p-3 bg-card/60 border border-border/40 rounded-xl flex flex-col justify-between gap-3 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-foreground">4. Payment Failed</span>
              <Badge variant="destructive" className="text-[8px]">Past Due</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Triggers <code className="font-mono text-[9px] text-accent">invoice.payment_failed</code>. Sets status to past_due.
            </p>
          </div>
          <Button
            onClick={() => runSimulation("payment_failed")}
            disabled={loadingAction !== null}
            variant="outline"
            size="xs"
            className="w-full text-[10px] font-bold text-rose-500 border-rose-500/30 uppercase tracking-wider h-8 hover:bg-rose-500/10 hover:text-rose-500"
          >
            {loadingAction === "payment_failed" ? "Triggering..." : "Simulate Payment Fail"}
          </Button>
        </div>

        {/* Action 5: Customer Subscription Updated (Cancelled) */}
        <div className="p-3 bg-card/60 border border-border/40 rounded-xl flex flex-col justify-between gap-3 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-foreground">5. Cancel Subscription</span>
              <Badge variant="outline" className="text-[8px] border-destructive/40 text-destructive bg-destructive/5">Canceled</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Simulates cancellation. Sets status to canceled but keeps renewal date in the future.
            </p>
          </div>
          <Button
            onClick={() => runSimulation("update_status", "canceled")}
            disabled={loadingAction !== null}
            variant="outline"
            size="xs"
            className="w-full text-[10px] font-bold text-amber-500 border-amber-500/30 uppercase tracking-wider h-8 hover:bg-amber-500/10 hover:text-amber-500"
          >
            {loadingAction === "update_statuscanceled" ? "Triggering..." : "Simulate Cancel"}
          </Button>
        </div>

        {/* Action 6: Customer Subscription Deleted (Expired) */}
        <div className="p-3 bg-card/60 border border-border/40 rounded-xl flex flex-col justify-between gap-3 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-foreground">6. Immediate Deletion</span>
              <Badge variant="outline" className="text-[8px] bg-secondary text-muted-foreground border border-border/50">Expired</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Triggers <code className="font-mono text-[9px] text-accent">customer.subscription.deleted</code>. Ends tier immediately.
            </p>
          </div>
          <Button
            onClick={() => runSimulation("delete")}
            disabled={loadingAction !== null}
            variant="outline"
            size="xs"
            className="w-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider h-8 hover:bg-secondary/40"
          >
            {loadingAction === "delete" ? "Triggering..." : "Simulate Deletion"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
