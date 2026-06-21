"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Lock, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  AlertTriangle
} from "lucide-react";

const PLAN_MAP = {
  price_scout_monthly: { name: "Eco Scout", price: "$10.00", cycle: "monthly", desc: "Automate contributions targeting forest preservation." },
  price_scout_yearly: { name: "Eco Scout", price: "$96.00", cycle: "yearly", desc: "Automate contributions targeting forest preservation." },
  price_advocate_monthly: { name: "Global Advocate", price: "$25.00", cycle: "monthly", desc: "Allocation to verified clean water & basic healthcare." },
  price_advocate_yearly: { name: "Global Advocate", price: "$240.00", cycle: "yearly", desc: "Allocation to verified clean water & basic healthcare." },
  price_builder_monthly: { name: "Legacy Builder", price: "$100.00", cycle: "monthly", desc: "Sponsor advanced STEM fellowships and emergency grids." },
  price_builder_yearly: { name: "Legacy Builder", price: "$960.00", cycle: "yearly", desc: "Sponsor advanced STEM fellowships and emergency grids." },
};

function MockCheckoutForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const priceId = searchParams.get("price_id") || "price_scout_monthly";

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("424");
  const [cardName, setCardName] = useState("Jane Doe");

  const plan = PLAN_MAP[priceId] || {
    name: priceId.includes("builder") ? "Legacy Builder" : priceId.includes("advocate") ? "Global Advocate" : "Eco Scout",
    price: priceId.includes("yearly") ? "$96.00" : "$10.00",
    cycle: priceId.includes("yearly") ? "yearly" : "monthly",
    desc: "Vetted charity routing and impact score bonuses."
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/mock-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard/subscription?success=true");
        }, 1500);
      } else {
        alert("Simulated transaction failed. Please check the logs.");
      }
    } catch (err) {
      console.error(err);
      alert("Simulated payment connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D0B] text-foreground flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="border-b border-border/40 bg-card/25 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-accent/15 border border-accent/30 text-accent font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
              <Sparkles className="w-3 h-3" /> Stripe Test Mode
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
        {/* Left Side: Summary */}
        <section className="md:col-span-5 space-y-6">
          <div>
            <span className="text-[10px] text-accent uppercase font-bold tracking-wider block mb-1">Fundora Subscription</span>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
              Review your checkout details
            </h1>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              You are subscribing using Stripe Sandboxed Simulator. No real funds will be transferred.
            </p>
          </div>

          <Card className="p-6 border border-border/80 bg-card relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-heading text-sm font-extrabold text-foreground">{plan.name} Plan</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{plan.desc}</p>
              </div>
              <Badge variant="accent" className="capitalize text-[9px] font-bold">
                {plan.cycle}
              </Badge>
            </div>
            
            <div className="space-y-2 text-xs border-t border-border/40 pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold">{plan.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxes</span>
                <span className="font-bold">$0.00</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border/20 pt-2 mt-2">
                <span className="text-foreground">Total Due Today</span>
                <span className="text-accent">{plan.price}</span>
              </div>
            </div>
          </Card>

          <div className="flex items-start gap-2.5 p-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl text-[11px] leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Sandbox Environment:</strong> This interface is rendering because standard Stripe configurations are set to mock. Entering fake payment data is safe.
            </p>
          </div>
        </section>

        {/* Right Side: Credit Card Form */}
        <section className="md:col-span-7">
          <Card className="p-6 md:p-8 border border-border/70 bg-card shadow-lg relative">
            {success ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center gap-4"
              >
                <div className="w-14 h-14 bg-accent/15 border border-accent/20 rounded-full flex items-center justify-center text-accent animate-bounce">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-extrabold text-foreground">Simulated Payment Approved</h3>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Redirecting back to your dashboard...
                  </p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handlePay} className="space-y-6">
                <div>
                  <h2 className="font-heading text-base font-extrabold text-foreground mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-accent" /> Payment Method
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Enter credit card credentials to finalize setup.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Card Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Name on Card
                    </label>
                    <input 
                      type="text" 
                      required
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-[#0b1310] border border-border/80 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Card Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Card Number
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-[#0b1310] border border-border/80 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-accent"
                      />
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/60 absolute right-3.5 top-3.5" />
                    </div>
                  </div>

                  {/* Expiry / CVC Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Expiration
                      </label>
                      <input 
                        type="text" 
                        required
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full bg-[#0b1310] border border-border/80 rounded-xl px-4 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        CVC
                      </label>
                      <input 
                        type="password" 
                        required
                        maxLength={4}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        placeholder="•••"
                        className="w-full bg-[#0b1310] border border-border/80 rounded-xl px-4 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  variant="accent" 
                  className="w-full relative py-5 text-xs font-bold uppercase tracking-wider shadow-sm"
                >
                  {loading ? "Approving Transaction..." : `Authorize Payment of ${plan.price}`}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Secured by simulated sandbox protocol.
                </div>
              </form>
            )}
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 bg-card/10 text-center text-[10px] text-muted-foreground">
        <div className="max-w-6xl mx-auto px-6">
          Fundora Mock Billing Systems. Stripe and the Stripe Logo are trademarks of Stripe, Inc.
        </div>
      </footer>
    </div>
  );
}

// Simple Badge component defined locally to guarantee dependency safety
function Badge({ children, variant }) {
  const styles = variant === "accent" 
    ? "bg-accent/15 border border-accent/25 text-accent" 
    : "bg-secondary text-secondary-foreground";
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles}`}>
      {children}
    </span>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070D0B] text-foreground flex items-center justify-center text-xs animate-pulse">
        Initializing secure mock transaction gateway...
      </div>
    }>
      <MockCheckoutForm />
    </Suspense>
  );
}
