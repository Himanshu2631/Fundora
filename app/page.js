"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Trophy, Sparkles, Heart, Check, HelpCircle, Gift, Users } from "lucide-react";

export default function Home() {
  const [isYearly, setIsYearly] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 90, damping: 14 },
    },
  };

  const featuredCharities = [
    {
      name: "Acres of Green",
      category: "Environment",
      impact: "7,400+ hectares of ancient forests protected this quarter",
      rating: "9.8 Auditor Score",
      raised: "$145,300 raised",
    },
    {
      name: "Apex Water Initiative",
      category: "Clean Water",
      impact: "Direct access filtration installed for 12,000 villagers",
      rating: "9.9 Auditor Score",
      raised: "$98,400 raised",
    },
    {
      name: "Empower Global Edu",
      category: "Education",
      impact: "Coding and engineering fellowships for 340 women in STEM",
      rating: "9.7 Auditor Score",
      raised: "$112,000 raised",
    },
  ];

  const pricingTiers = [
    {
      name: "Eco Scout",
      monthlyPrice: 10,
      yearlyPrice: 8,
      score: "+10 Giving Score",
      description: "Automate core contributions targeting forest preservation.",
      features: [
        "100% audited charity routing",
        "Digital receipt tracking",
        "Monthly Giving Score calculations",
        "Base entry into standard draws"
      ]
    },
    {
      name: "Global Advocate",
      monthlyPrice: 25,
      yearlyPrice: 20,
      score: "+30 Giving Score",
      description: "Direct allocation to verified clean water & basic healthcare.",
      features: [
        "All Eco Scout benefits included",
        "3x entries ticket multiplier",
        "Weekly profile ranking shifts",
        "Priority access to corporate draws"
      ],
      recommended: true
    },
    {
      name: "Legacy Builder",
      monthlyPrice: 100,
      yearlyPrice: 80,
      score: "+150 Giving Score",
      description: "Sponsor advanced STEM fellowships and emergency humanitarian grids.",
      features: [
        "All Global Advocate benefits",
        "10x entries ticket multiplier",
        "Direct impact coordinator desk access",
        "Cryptographic auditor dashboard view"
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-36 border-b border-border bg-background">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1d18_1px,transparent_1px),linear-gradient(to_bottom,#0c1d18_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-45 -z-10" />

          <div className="mx-auto max-w-7xl px-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center"
            >
              {/* Hero Left */}
              <div className="lg:col-span-7 flex flex-col items-start text-left">
                <motion.div variants={itemVariants} className="mb-6">
                  <Badge variant="accent" className="gap-1.5 px-3 py-1 text-xs">
                    <Sparkles className="w-3.5 h-3.5" /> Reimagining Global Giving
                  </Badge>
                </motion.div>
                
                <motion.h1
                  variants={itemVariants}
                  className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.05] mb-6"
                >
                  Play Golf. Support Charity. <span className="text-accent">Win Premium Rewards.</span>
                </motion.h1>

                <motion.p
                  variants={itemVariants}
                  className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8"
                >
                  Fundora is the ultimate giving platform for golfers. Subscribe to fund verified, audited non-profits, log your weekly Stableford golf scores to boost your draw entries, and win monthly luxury eco-retreats or high-end green tech rewards. 100% of your subscription goes directly to your chosen charity.
                </motion.p>

                <motion.div
                  variants={itemVariants}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto"
                >
                  <Button asChild variant="accent" size="lg">
                    <Link href="/signup">
                      Subscribe & Start Winning <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="#how-it-works">
                      See How It Works
                    </Link>
                  </Button>
                </motion.div>
              </div>

              {/* Hero Right - Handcrafted interactive stats card */}
              <motion.div variants={itemVariants} className="lg:col-span-5 w-full">
                <Card glow className="p-8 shadow-xl">
                  {/* Subtle highlight border */}
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />

                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Monthly Reward Pool</p>
                      <h3 className="font-heading text-3xl font-extrabold text-foreground">$24,950</h3>
                    </div>
                    <Badge variant="accent">
                      Next Draw: 4d 11h
                    </Badge>
                  </div>

                  {/* Simulated interactive live tracker */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5 text-muted-foreground font-medium">
                        <span>Monthly Contribution Target</span>
                        <span className="text-foreground font-bold">83% achieved</span>
                      </div>
                      <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "83%" }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-accent"
                        />
                      </div>
                    </div>

                    <div className="h-[1px] bg-border/40 my-6" />

                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-3">Live Feed</p>
                    <div className="space-y-3">
                      {[
                        { user: "alicia_golf", score: "39 Stableford", action: "logged score & earned 3x entries", time: "2m ago" },
                        { user: "sam_drive", score: "+150 Giving Score", action: "subscribed to Legacy Builder", time: "12m ago" },
                        { user: "hiro_putt", score: "42 Stableford", action: "logged score & boosted entries", time: "44m ago" }
                      ].map((feed, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0">
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">{feed.user}</strong> {feed.action}
                          </span>
                          <span className="text-accent font-semibold">{feed.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-24 border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl mb-20">
              <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">Process</span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
                How It Works
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 leading-relaxed">
                Fundora bridges golf scores, charity subscriptions, and premium incentives. Follow these 5 steps to start making an impact and winning rewards.
              </p>
            </div>

            {/* 5-Step How It Works Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-6 relative">
              {/* Step 1 */}
              <div className="relative flex flex-col justify-between p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-accent/40 transition-all duration-300">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-10 h-10 flex items-center justify-center bg-background border border-border text-accent font-heading font-extrabold text-sm rounded-full">
                      01
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Setup</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground mb-4">Step 1: Subscribe</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose a monthly or annual membership tier matching your capacity. Automate giving as a tax-deductible contribution.
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-accent">
                  <Check className="w-3.5 h-3.5" /> Flexible Giving Tiers
                </div>

                {/* Connector pointing right (desktop) */}
                <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 translate-x-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-accent/60 animate-pulse" />
                </div>
                {/* Connector pointing down (mobile) */}
                <div className="lg:hidden absolute left-1/2 -bottom-8 -translate-x-1/2 z-10 rotate-90">
                  <ArrowRight className="w-5 h-5 text-accent/60 animate-pulse" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col justify-between p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-accent/40 transition-all duration-300">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-10 h-10 flex items-center justify-center bg-background border border-border text-accent font-heading font-extrabold text-sm rounded-full">
                      02
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Log Scores</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground mb-4">Step 2: Submit Golf Scores</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Log your Stableford golf scores in the Score Centre to determine your performance-based giving score.
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-accent">
                  <Trophy className="w-3.5 h-3.5" /> Stableford Points
                </div>

                {/* Connector pointing right (desktop) */}
                <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 translate-x-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-accent/60 animate-pulse" />
                </div>
                {/* Connector pointing down (mobile) */}
                <div className="lg:hidden absolute left-1/2 -bottom-8 -translate-x-1/2 z-10 rotate-90">
                  <ArrowRight className="w-5 h-5 text-accent/60 animate-pulse" />
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col justify-between p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-accent/40 transition-all duration-300">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-10 h-10 flex items-center justify-center bg-background border border-border text-accent font-heading font-extrabold text-sm rounded-full">
                      03
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Allocation</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground mb-4">Step 3: Support Your Favorite Charity</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    100% of your subscription funds go directly to your chosen vetted, audited non-profit organization.
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-accent">
                  <Heart className="w-3.5 h-3.5" /> 100% Direct Routing
                </div>

                {/* Connector pointing right (desktop) */}
                <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 translate-x-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-accent/60 animate-pulse" />
                </div>
                {/* Connector pointing down (mobile) */}
                <div className="lg:hidden absolute left-1/2 -bottom-8 -translate-x-1/2 z-10 rotate-90">
                  <ArrowRight className="w-5 h-5 text-accent/60 animate-pulse" />
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative flex flex-col justify-between p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-accent/40 transition-all duration-300">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-10 h-10 flex items-center justify-center bg-background border border-border text-accent font-heading font-extrabold text-sm rounded-full">
                      04
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Entries</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground mb-4">Step 4: Receive Draw Entries</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Get automatically registered for draws. Your logged scores plus active subscription multipliers generate your entries.
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-accent">
                  <Sparkles className="w-3.5 h-3.5" /> Automated Multipliers
                </div>

                {/* Connector pointing right (desktop) */}
                <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 translate-x-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-accent/60 animate-pulse" />
                </div>
                {/* Connector pointing down (mobile) */}
                <div className="lg:hidden absolute left-1/2 -bottom-8 -translate-x-1/2 z-10 rotate-90">
                  <ArrowRight className="w-5 h-5 text-accent/60 animate-pulse" />
                </div>
              </div>

              {/* Step 5 */}
              <div className="relative flex flex-col justify-between p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-accent/40 transition-all duration-300">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-10 h-10 flex items-center justify-center bg-background border border-border text-accent font-heading font-extrabold text-sm rounded-full">
                      05
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prizes</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground mb-4">Step 5: Win Monthly Rewards</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Win monthly eco-retreats, green technology bundles, and premium golf prizes in transparent draws.
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-accent">
                  <Check className="w-3.5 h-3.5" /> Monthly Eco Draws
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY PEOPLE JOIN SECTION */}
        <section className="py-24 border-b border-border bg-card/20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl mb-16">
              <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">Benefits</span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
                Why People Join Fundora
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 leading-relaxed">
                We bridge the gap between premium rewards and global impact, powered by your passion for golf.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pillar 1: Reward Opportunities */}
              <div className="flex flex-col p-8 bg-background border border-border rounded-2xl shadow-sm hover:border-accent/40 transition-all duration-300">
                <div className="w-12 h-12 flex items-center justify-center bg-card border border-border text-accent rounded-2xl mb-6">
                  <Gift className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-4">Reward Opportunities</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">
                  Win premium incentives including luxury eco-retreats, green tech bundles, and exclusive golf getaways. Boost your chances with active subscription multipliers and consistent golf score submissions.
                </p>
              </div>

              {/* Pillar 2: Charity Impact */}
              <div className="flex flex-col p-8 bg-background border border-border rounded-2xl shadow-sm hover:border-accent/40 transition-all duration-300">
                <div className="w-12 h-12 flex items-center justify-center bg-card border border-border text-accent rounded-2xl mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-4">Charity Impact</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">
                  Ensure 100% of your contributions go directly to verified non-profits of your choice. Track and audit the exact flow of funds with transparent cryptographic receipts and impact reports.
                </p>
              </div>

              {/* Pillar 3: Community Participation */}
              <div className="flex flex-col p-8 bg-background border border-border rounded-2xl shadow-sm hover:border-accent/40 transition-all duration-300">
                <div className="w-12 h-12 flex items-center justify-center bg-card border border-border text-accent rounded-2xl mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-4">Community Participation</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">
                  Compete on global performance and giving leaderboards. Share your score milestones, build donation streaks, and connect with a dedicated community of golfers who care.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* IMPACT SECTION */}
        <section className="py-24 border-b border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
              {/* Left Column - Big Text */}
              <div className="lg:col-span-5 lg:sticky lg:top-28">
                <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">Impact Metrics</span>
                <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground mb-6 leading-tight">
                  Independent auditing. Measurable on-the-ground outcome.
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-8">
                  We require rigorous registry verification, independent expense checking, and verified outcome tracking logs to validate non-profit partners. Every cent is tracked.
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="font-heading text-2xl font-bold text-foreground">12</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Causes Vetted</span>
                  </div>
                  <div className="w-[1px] h-8 bg-border" />
                  <div className="flex flex-col">
                    <span className="font-heading text-2xl font-bold text-foreground">98.2%</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Fund Efficiency</span>
                  </div>
                </div>
              </div>

              {/* Right Column - Handcrafted Charity Rows */}
              <div className="lg:col-span-7 space-y-6">
                {featuredCharities.map((charity, i) => (
                  <Card
                    key={i}
                    className="hover:border-accent/40 transition-all duration-300 p-8 group bg-background"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <Badge variant="accent">
                          {charity.category}
                        </Badge>
                        <h3 className="font-heading text-xl font-bold text-foreground mt-2 group-hover:text-accent transition-colors">
                          {charity.name}
                        </h3>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-bold text-foreground block">{charity.rating}</span>
                        <span className="text-[10px] font-medium text-muted-foreground block mt-1">{charity.raised}</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{charity.impact}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-24 border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">Plans</span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground mb-6">
                Select your contribution bracket.
              </h2>
              
              {/* Interactive Switcher */}
              <div className="inline-flex items-center gap-4 bg-card border border-border p-1.5 rounded-full mt-4">
                <button
                  onClick={() => setIsYearly(false)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                    !isYearly ? "bg-accent text-[#060C0A]" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsYearly(true)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                    isYearly ? "bg-accent text-[#060C0A]" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly <span className="text-[9px] px-1.5 py-0.5 bg-accent/25 rounded-full font-extrabold text-white">Save 20%</span>
                </button>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {pricingTiers.map((tier, i) => (
                <Card
                  key={i}
                  className={`flex flex-col justify-between p-8 relative overflow-hidden transition-all duration-300 ${
                    tier.recommended ? "border-accent shadow-forest bg-card" : "bg-card/40 border-border"
                  }`}
                >
                  {tier.recommended && (
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
                  )}

                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-heading font-extrabold text-lg text-foreground">{tier.name}</span>
                      {tier.recommended && (
                        <Badge variant="accent">Recommended</Badge>
                      )}
                    </div>
                    
                    <div className="mb-6 flex items-baseline gap-1.5">
                      <span className="font-heading text-4xl font-extrabold text-foreground">
                        ${isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                      </span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                      {tier.description}
                    </p>

                    <div className="h-[1px] bg-border/40 my-6" />

                    <ul className="space-y-4 text-xs">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-muted-foreground">
                          <Check className="w-4 h-4 text-accent shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border/30">
                    <Button
                      asChild
                      variant={tier.recommended ? "accent" : "outline"}
                      className="w-full"
                    >
                      <Link href="/signup">
                        Activate {tier.name}
                      </Link>
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground/60 mt-3 font-semibold uppercase tracking-wide">
                      {tier.score} &bull; Cancel Anytime
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* HERO CTA SECTION */}
        <section className="py-24 bg-background">
          <div className="mx-auto max-w-7xl px-6">
            <Card className="p-12 md:p-20 text-center relative overflow-hidden bg-card">
              {/* Highlight gradient */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-accent to-transparent" />

              <div className="max-w-3xl mx-auto flex flex-col items-center">
                <Trophy className="w-12 h-12 text-accent mb-8" />
                <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-6">
                  Ready to Play, Give, and Win?
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl mb-10">
                  Choose your subscription level. Route 100% of your contributions to audited charities. Log your golf Stableford scores to multiply your entries, and stand a chance to win monthly premium rewards.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center sm:w-auto">
                  <Button asChild variant="accent" size="lg">
                    <Link href="/signup">
                      Create Free Account
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">
                      Access Dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
