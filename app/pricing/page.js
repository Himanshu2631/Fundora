"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Check,
  Minus,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Zap,
  Trophy,
  Heart,
  Sparkles,
  Lock,
  Globe,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const PLANS = [
  {
    key: "scout",
    name: "Eco Scout",
    tagline: "Start your giving journey.",
    monthlyPrice: 10,
    yearlyPrice: 8,
    yearlyTotal: 96,
    score: "+10 pts / mo",
    color: "border-border",
    recommended: false,
    features: [
      "100% audited charity routing",
      "Monthly digital receipt archive",
      "Giving Score calculation",
      "Base draw entry (1× ticket)",
      "Community leaderboard access",
      "Email impact digest",
    ],
  },
  {
    key: "advocate",
    name: "Global Advocate",
    tagline: "For committed philanthropists.",
    monthlyPrice: 25,
    yearlyPrice: 20,
    yearlyTotal: 240,
    score: "+30 pts / mo",
    color: "border-accent",
    recommended: true,
    features: [
      "Everything in Eco Scout",
      "3× draw ticket multiplier",
      "Weighted weekly rank shifts",
      "Priority corporate draw access",
      "Cause selection + rotation",
      "Monthly giving performance report",
    ],
  },
  {
    key: "builder",
    name: "Legacy Builder",
    tagline: "Maximum impact. Maximum rewards.",
    monthlyPrice: 100,
    yearlyPrice: 80,
    yearlyTotal: 960,
    score: "+150 pts / mo",
    color: "border-border",
    recommended: false,
    features: [
      "Everything in Global Advocate",
      "10× draw ticket multiplier",
      "Direct impact coordinator access",
      "On-chain receipt dashboard",
      "Exclusive NGO partner briefings",
      "Legacy builder profile badge",
    ],
  },
];

// Comparison matrix — null = not applicable, true = yes, false = no, string = value
const COMPARISON = [
  {
    category: "Core Giving",
    rows: [
      { label: "Audited charity routing", scout: true, advocate: true, builder: true },
      { label: "Digital receipt archive", scout: true, advocate: true, builder: true },
      { label: "Fund efficiency rate", scout: "98.2%", advocate: "98.2%", builder: "98.2%" },
      { label: "Cause allocation control", scout: false, advocate: true, builder: true },
    ],
  },
  {
    category: "Rewards & Score",
    rows: [
      { label: "Monthly giving score", scout: "+10 pts", advocate: "+30 pts", builder: "+150 pts" },
      { label: "Draw ticket entries", scout: "1×", advocate: "3×", builder: "10×" },
      { label: "Leaderboard ranking", scout: true, advocate: true, builder: true },
      { label: "Priority draw access", scout: false, advocate: true, builder: true },
    ],
  },
  {
    category: "Reporting & Trust",
    rows: [
      { label: "Monthly impact digest", scout: true, advocate: true, builder: true },
      { label: "Performance analytics", scout: false, advocate: true, builder: true },
      { label: "On-chain receipt proof", scout: false, advocate: false, builder: true },
      { label: "NGO coordinator access", scout: false, advocate: false, builder: true },
    ],
  },
];

const FAQS = [
  {
    q: "How does the audited charity routing work?",
    a: "Every dollar you contribute is processed through our independent auditing layer. Partner NGOs submit verified intake records, and we cross-reference these against cryptographic payment receipts to ensure 100% of allocated funds reach their intended cause. You can view your audit trail in the dashboard at any time.",
  },
  {
    q: "Can I switch between plans?",
    a: "Yes. You can upgrade or downgrade your plan at any time from your dashboard. Upgrades take effect immediately. Downgrades are applied at the start of your next billing cycle, so you retain current tier benefits until then.",
  },
  {
    q: "What happens to my draw tickets if I cancel?",
    a: "If you cancel, all existing draw tickets remain valid through the end of your current billing period. Any draws scheduled within that window will still include your entries. After your period ends, future draws will no longer include you.",
  },
  {
    q: "Is yearly billing charged upfront?",
    a: "Yes — annual plans are billed in a single upfront payment at the discounted rate. This gives you 2 months free compared to paying monthly. You can cancel at any time, though refunds are prorated based on unused months.",
  },
  {
    q: "How is my Giving Score calculated?",
    a: "Your Giving Score is a composite of: subscription tier base points, weekly streak multipliers (consecutive active months), and bonus points from score submissions and special charity campaigns. Scores reset monthly but a lifetime score tracks your cumulative impact.",
  },
  {
    q: "What is the 'on-chain receipt proof' on Legacy Builder?",
    a: "Legacy Builder subscribers get access to a cryptographic receipt dashboard where each verified transaction is paired with an immutable hash stored on a public ledger. This makes your charitable impact permanently verifiable, independent of Fundora's own records.",
  },
];

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Third-Party Audited",
    desc: "All charitable routing is independently verified by certified auditors. We publish quarterly transparency reports.",
  },
  {
    icon: Zap,
    title: "Instant Score Updates",
    desc: "Your Giving Score and rank update in real time. No lag, no batching — every contribution is reflected immediately.",
  },
  {
    icon: Trophy,
    title: "Exclusive Reward Draws",
    desc: "Corporate-sponsored eco-retreats, tech gear, and travel packages. Higher tiers earn exponentially more draw entries.",
  },
  {
    icon: Globe,
    title: "Global Cause Coverage",
    desc: "Partner causes span 4 continents covering reforestation, clean water access, STEM education, and emergency relief.",
  },
  {
    icon: Lock,
    title: "Cancel Anytime",
    desc: "No long-term lock-in. Cancel your subscription in one click. Your data, receipts, and score history are yours forever.",
  },
  {
    icon: BarChart3,
    title: "Measurable Impact",
    desc: "Every plan comes with real-world outcome metrics — hectares protected, liters purified, students funded — tied to your account.",
  },
];

// ─────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────
function ComparisonCell({ value }) {
  if (value === true) return <CheckCircle2 className="w-4 h-4 text-accent mx-auto" />;
  if (value === false) return <Minus className="w-3.5 h-3.5 text-border mx-auto" />;
  return <span className="text-xs font-bold text-foreground">{value}</span>;
}

function FaqItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
          {q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-xs text-muted-foreground leading-relaxed pb-5 max-w-3xl">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// PLAN CARD
// ─────────────────────────────────────────────
function PlanCard({ plan, isYearly, onSubscribe, activeStatus, currentPlanKey, isLoggedIn }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const displayPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  const savedAmount = (plan.monthlyPrice - plan.yearlyPrice) * 12;
  const isCurrentPlan = currentPlanKey === plan.key && activeStatus === "active";
  const isCancelled = currentPlanKey === plan.key && activeStatus === "cancelled";

  const handleClick = async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      await onSubscribe(plan.key);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getButtonState = () => {
    if (!isLoggedIn) return { label: "Get Started", variant: plan.recommended ? "accent" : "outline", action: "link" };
    if (isCurrentPlan) return { label: "Current Plan", variant: "outline", action: "none", disabled: true };
    if (isCancelled) return { label: "Re-Activate Plan", variant: "accent", action: "subscribe" };
    if (success) return { label: "Activated!", variant: "accent", action: "none", disabled: true };
    if (loading) return { label: "Activating...", variant: plan.recommended ? "accent" : "outline", action: "none", disabled: true };
    return { label: `Activate ${plan.name}`, variant: plan.recommended ? "accent" : "outline", action: "subscribe" };
  };

  const btn = getButtonState();

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="h-full"
    >
      <Card
        className={`relative flex flex-col h-full transition-all duration-300 overflow-hidden ${
          plan.recommended
            ? "border-accent shadow-[0_0_0_1px_hsl(var(--accent)/0.4),0_8px_32px_hsl(var(--accent)/0.12)]"
            : "hover:border-accent/30 hover:shadow-md"
        } ${isCurrentPlan ? "ring-2 ring-accent/40" : ""}`}
      >
        {/* Gold top bar for recommended */}
        {plan.recommended && (
          <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
        )}

        {/* Yearly savings ribbon */}
        {isYearly && savedAmount > 0 && (
          <div className="absolute top-4 right-4">
            <span className="bg-accent text-[#060C0A] text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-xl">
              Save ${savedAmount}/yr
            </span>
          </div>
        )}

        {/* Current plan badge */}
        {isCurrentPlan && (
          <div className="absolute top-4 right-4">
            <Badge variant="success">Active</Badge>
          </div>
        )}

        <div className="p-8 flex flex-col flex-1">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {plan.recommended && (
                    <Badge variant="accent">Recommended</Badge>
                  )}
                </div>
                <h3 className="font-heading text-xl font-extrabold text-foreground">
                  {plan.name}
                </h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
          </div>

          {/* Price block */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <AnimatePresence mode="wait">
                <motion.span
                  key={displayPrice}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.2 }}
                  className="font-heading text-5xl font-extrabold text-foreground tracking-tight"
                >
                  ${displayPrice}
                </motion.span>
              </AnimatePresence>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">/mo</span>
                {isYearly && (
                  <span className="text-[10px] text-muted-foreground/70 line-through">
                    ${plan.monthlyPrice}/mo
                  </span>
                )}
              </div>
            </div>
            {isYearly && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Billed ${plan.yearlyTotal}/year · 2 months free
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-border/40 mb-6" />

          {/* Features */}
          <ul className="space-y-3 flex-1 mb-8">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {/* Giving Score pill */}
          <div className="mb-4 flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-wider">
            <Trophy className="w-3 h-3" />
            {plan.score}
            <span className="text-muted-foreground font-normal normal-case tracking-normal">
              · Cancel anytime
            </span>
          </div>

          {/* CTA button */}
          {btn.action === "link" ? (
            <Button asChild variant={btn.variant} className="w-full" size="default">
              <Link href="/signup">
                {btn.label} <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          ) : (
            <Button
              variant={btn.variant}
              className="w-full relative overflow-hidden"
              onClick={btn.action === "subscribe" ? handleClick : undefined}
              disabled={btn.disabled || loading}
            >
              {success && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> {btn.label}
                </motion.span>
              )}
              {!success && btn.label}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────
export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const { user } = useAuth();
  const { subscribe, status, subscription } = useSubscription();
  const router = useRouter();

  const handleSubscribe = async (planKey) => {
    if (!user) {
      router.push("/signup");
      return;
    }
    await subscribe(planKey);
    // After subscribe, navigate to dashboard
    setTimeout(() => router.push("/dashboard"), 1200);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1, y: 0,
      transition: { type: "spring", stiffness: 80, damping: 14 },
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20 border-b border-border">
          {/* Background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1d18_1px,transparent_1px),linear-gradient(to_bottom,#0c1d18_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)] opacity-30 -z-10" />

          <div className="mx-auto max-w-7xl px-6 text-center">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="max-w-3xl mx-auto"
            >
              <motion.div variants={itemVariants} className="mb-5">
                <Badge variant="accent" className="gap-1.5 px-3 py-1 text-xs">
                  <Sparkles className="w-3 h-3" /> Transparent Pricing
                </Badge>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.05] mb-5"
              >
                Choose your giving tier.
                <br />
                <span className="text-accent">Scale your impact.</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10"
              >
                Every plan routes 100% of your contribution to vetted global causes. Unlock higher giving scores and exclusive reward draws as you grow.
              </motion.p>

              {/* Billing toggle */}
              <motion.div variants={itemVariants}>
                <div className="inline-flex items-center gap-1 bg-card border border-border p-1 rounded-full shadow-sm">
                  <button
                    id="billing-toggle-monthly"
                    onClick={() => setIsYearly(false)}
                    className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-250 ${
                      !isYearly
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    id="billing-toggle-yearly"
                    onClick={() => setIsYearly(true)}
                    className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-250 flex items-center gap-2 ${
                      isYearly
                        ? "bg-accent text-[#060C0A] shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yearly
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-xl font-extrabold leading-none ${
                        isYearly
                          ? "bg-[#060C0A]/20 text-[#060C0A]"
                          : "bg-accent/20 text-accent"
                      }`}
                    >
                      −20%
                    </span>
                  </button>
                </div>

                <AnimatePresence>
                  {isYearly && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-muted-foreground mt-3 font-medium"
                    >
                      <span className="text-accent font-bold">2 months free</span> · billed annually · cancel anytime
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── PLAN CARDS ── */}
        <section className="py-16 md:py-20 border-b border-border">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
            >
              {PLANS.map((plan) => (
                <motion.div key={plan.key} variants={itemVariants} className="flex">
                  <PlanCard
                    plan={plan}
                    isYearly={isYearly}
                    onSubscribe={handleSubscribe}
                    activeStatus={status}
                    currentPlanKey={subscription?.plan_type}
                    isLoggedIn={!!user}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Reassurance strip */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wider"
            >
              {[
                "No hidden fees",
                "Instant receipt on every contribution",
                "98.2% fund efficiency verified",
                "Cancel anytime — no penalty",
              ].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-accent" /> {t}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── BENEFITS SECTION ── */}
        <section className="py-20 md:py-24 border-b border-border bg-card/30">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mb-16"
            >
              <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">
                Why Fundora
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
                Built for transparency. Designed for growth.
              </h2>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0"
            >
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="border-t border-l border-border/60 p-8 group hover:bg-card transition-colors duration-300 first:border-l-0 [&:nth-child(3n+1)]:border-l-0 sm:[&:nth-child(2n+1)]:border-l-0 lg:[&:nth-child(3n+1)]:border-l-0 lg:[&:nth-child(3n+2)]:border-l lg:[&:nth-child(3n+3)]:border-l sm:[&:nth-child(2n+2)]:border-l"
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-accent/10 border border-accent/20 rounded-xl mb-5 group-hover:bg-accent/15 transition-colors">
                    <b.icon className="w-4.5 h-4.5 text-accent" />
                  </div>
                  <h3 className="font-heading font-bold text-base text-foreground mb-2">
                    {b.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section className="py-20 md:py-24 border-b border-border">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-14"
            >
              <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">
                Compare Plans
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
                Feature-by-feature breakdown.
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="overflow-x-auto"
            >
              <table className="w-full min-w-[640px] border-collapse">
                {/* Sticky header with plan names */}
                <thead>
                  <tr>
                    <th className="text-left py-4 pr-6 w-[40%] text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Feature
                    </th>
                    {PLANS.map((p) => (
                      <th key={p.key} className="text-center py-4 px-3 w-[20%]">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`text-xs font-extrabold uppercase tracking-wider ${
                              p.recommended ? "text-accent" : "text-foreground"
                            }`}
                          >
                            {p.name}
                          </span>
                          {p.recommended && (
                            <Badge variant="accent" className="text-[8px]">
                              Popular
                            </Badge>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {COMPARISON.map((section) => (
                  <tbody key={section.category}>
                    {/* Category row */}
                    <tr>
                      <td
                        colSpan={4}
                        className="pt-8 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-accent border-b border-border/60"
                      >
                        {section.category}
                      </td>
                    </tr>
                    {section.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b border-border/30 hover:bg-secondary/10 transition-colors"
                      >
                        <td className="py-3.5 pr-6 text-xs text-muted-foreground font-medium">
                          {row.label}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <ComparisonCell value={row.scout} />
                        </td>
                        <td className="py-3.5 px-3 text-center bg-accent/[0.04]">
                          <ComparisonCell value={row.advocate} />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <ComparisonCell value={row.builder} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </motion.div>
          </div>
        </section>

        {/* ── FAQ SECTION ── */}
        <section className="py-20 md:py-24 border-b border-border bg-card/20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              {/* Left sticky heading */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start"
              >
                <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">
                  FAQ
                </span>
                <h2 className="font-heading text-3xl font-extrabold text-foreground mb-4 leading-tight">
                  Questions answered, trust established.
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  If you have a question not answered here, reach us directly at{" "}
                  <span className="text-accent font-semibold">support@fundora.org</span>
                </p>
                <Button asChild variant="goldOutline" size="sm">
                  <Link href="mailto:support@fundora.org">Contact Support</Link>
                </Button>
              </motion.div>

              {/* Right FAQ accordion */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-8"
              >
                {FAQS.map((faq, i) => (
                  <FaqItem
                    key={i}
                    q={faq.q}
                    a={faq.a}
                    isOpen={openFaq === i}
                    onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                  />
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="p-12 md:p-20 text-center relative overflow-hidden">
                {/* Gradient bar */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-accent to-transparent" />
                {/* Subtle radial glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--accent)/0.06),transparent)] pointer-events-none" />

                <div className="relative max-w-2xl mx-auto flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
                    <Heart className="w-6 h-6 text-accent" />
                  </div>
                  <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-5">
                    Ready to start giving with purpose?
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-10">
                    Join thousands of members automating direct, verified global impact. Subscribe today — your first contribution is routed the same day.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center sm:w-auto">
                    {user ? (
                      <Button asChild variant="accent" size="lg">
                        <Link href="/dashboard">
                          Go to Dashboard <ArrowRight className="w-5 h-5" />
                        </Link>
                      </Button>
                    ) : (
                      <>
                        <Button asChild variant="accent" size="lg">
                          <Link href="/signup">
                            Create Free Account <ArrowRight className="w-5 h-5" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                          <Link href="/login">Sign In</Link>
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-6 font-medium">
                    No credit card required to sign up · Cancel anytime
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* ── MOBILE STICKY CTA BAR ── */}
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur-md px-5 py-4 flex gap-3 items-center">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Start from $8/month
            </p>
            <p className="text-[10px] text-muted-foreground/60">Cancel anytime · 100% audited</p>
          </div>
          <Button asChild variant="accent" size="sm" className="shrink-0">
            <Link href={user ? "/dashboard" : "/signup"}>
              {user ? "Go to Dashboard" : "Get Started"}
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
