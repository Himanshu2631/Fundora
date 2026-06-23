"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Trophy, Sparkles, Heart, Check, HelpCircle, Gift, Users, CreditCard, Activity, Award, Ticket, Zap } from "lucide-react";


export default function Home() {
  const [isYearly, setIsYearly] = useState(false);
  const [stats, setStats] = useState({
    activeMembers: 148,
    totalScores: 412,
    totalCharityContributions: 422900,
    totalCharitiesSupported: 4,
    activeDraws: 1,
    contributionAchieved: 83,
    rewardPool: 24950
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlatformData() {
      try {
        const { createClient } = await import("@/lib/supabase");
        const supabase = createClient();
        
        // 1. Fetch charities (publicly readable)
        const { data: charities } = await supabase
          .from("charities")
          .select("id, name, raised");
        
        let charitiesCount = 4;
        let contributionsSum = 422900;
        if (charities && charities.length > 0) {
          charitiesCount = charities.length;
          contributionsSum = charities.reduce((sum, c) => {
            const val = parseFloat(String(c.raised || "").replace(/[^0-9.]/g, ""));
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
        }

        // 2. Fetch active draws
        const { data: draws } = await supabase
          .from("draws")
          .select("id, title, status");
        
        let drawsCount = 1;
        if (draws && draws.length > 0) {
          drawsCount = draws.filter(d => d.status === "active" || d.status === "upcoming").length;
        }

        let activities = [];
        let membersCount = 148;
        let scoresCount = 412;

        const { data: { session } } = await supabase.auth.getSession();
        
        // Fetch profiles and scores (authenticated or mock client only)
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, created_at");
        
        if (profiles && profiles.length > 0) {
          membersCount = profiles.filter(p => p.role !== "admin").length;
          
          profiles.forEach(p => {
            if (p.created_at) {
              activities.push({
                type: "membership",
                user: p.full_name || "New Member",
                detail: "activated membership",
                time: p.created_at
              });
            }
          });
        }

        const { data: scores } = await supabase
          .from("scores")
          .select("id, score, score_date, user_id, created_at");
        
        if (scores && scores.length > 0) {
          scoresCount = scores.length;
          
          scores.forEach(s => {
            const userObj = profiles?.find(p => p.id === s.user_id);
            activities.push({
              type: "score",
              user: userObj?.full_name || "Member",
              detail: `logged round of ${s.score} Stableford`,
              time: s.created_at || s.score_date
            });
          });
        }

        // Process recent activity
        if (activities.length > 0) {
          activities.sort((a, b) => new Date(b.time) - new Date(a.time));
          const slicedActivities = activities.slice(0, 3).map(act => {
            const rawName = act.user;
            let maskedName = "Member";
            if (rawName && rawName !== "Member" && rawName !== "New Member") {
              const parts = rawName.split(" ");
              if (parts.length > 1) {
                maskedName = `${parts[0]} ${parts[1][0]}.`;
              } else {
                maskedName = rawName;
              }
            } else {
              maskedName = rawName;
            }
            
            const diffMs = new Date() - new Date(act.time);
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMin / 60);
            const diffDays = Math.floor(diffHrs / 24);
            
            let relativeTime = "Just now";
            if (diffMin > 0) relativeTime = `${diffMin}m ago`;
            if (diffHrs > 0) relativeTime = `${diffHrs}h ago`;
            if (diffDays > 0) relativeTime = `${diffDays}d ago`;
            
            return {
              title: maskedName,
              detail: act.detail,
              time: relativeTime,
              type: act.type
            };
          });
          setRecentActivity(slicedActivities);
        }

        const targetGoal = 500000;
        const pctAchieved = Math.min(Math.round((contributionsSum / targetGoal) * 100), 100) || 83;
        const calculatedPool = Math.round(contributionsSum * 0.05) || 24950;

        setStats({
          activeMembers: membersCount,
          totalScores: scoresCount,
          totalCharityContributions: contributionsSum,
          totalCharitiesSupported: charitiesCount,
          activeDraws: drawsCount,
          contributionAchieved: pctAchieved,
          rewardPool: calculatedPool
        });
      } catch (err) {
        console.error("Error loading stats for widget:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlatformData();
  }, []);

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
                  Golf Standings. Vetted Giving. <span className="text-accent">Monthly Rewards.</span>
                </motion.h1>
 
                <motion.p
                  variants={itemVariants}
                  className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8"
                >
                  Fundora is a member-driven platform where your passion for golf fuels global change. Subscribe to a tax-deductible giving plan, log your golf Stableford rounds to earn entry tickets, and win premium monthly rewards—while 100% of your subscription flows directly to audited, vetted charities.
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
                <Card glow className="p-6 shadow-xl">
                  {/* Subtle highlight border */}
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                        <Gift className="w-3 h-3 text-accent" /> Monthly Reward Pool
                      </p>
                      <h3 className="font-heading text-3xl font-extrabold text-foreground">
                        ${stats.rewardPool.toLocaleString("en-US")}
                      </h3>
                    </div>
                    <Badge variant="accent" className="font-semibold text-[10px]">
                      Next Draw: 4d 11h
                    </Badge>
                  </div>

                  {/* Dynamic interactive contribution tracker */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1 text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-accent" /> Contribution Goal</span>
                        <span className="text-foreground font-bold">{stats.contributionAchieved}% achieved</span>
                      </div>
                      <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.contributionAchieved}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-accent"
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Target: ${(500000).toLocaleString("en-US")} raised via member subscriptions.
                      </p>
                    </div>

                    <div className="h-[1px] bg-border/40 my-3.5" />

                    {/* Platform Analytics Grid */}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-2 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-accent" /> Platform Analytics
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-[#0A1C16]/20 border border-border/40 rounded-xl py-2 px-3">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Contributions</p>
                        <p className="text-sm font-extrabold text-foreground mt-0.5">${stats.totalCharityContributions.toLocaleString("en-US")}</p>
                      </div>
                      <div className="bg-[#0A1C16]/20 border border-border/40 rounded-xl py-2 px-3">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Active Members</p>
                        <p className="text-sm font-extrabold text-foreground mt-0.5">{stats.activeMembers}</p>
                      </div>
                      <div className="bg-[#0A1C16]/20 border border-border/40 rounded-xl py-2 px-3">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Causes Supported</p>
                        <p className="text-sm font-extrabold text-foreground mt-0.5">{stats.totalCharitiesSupported}</p>
                      </div>
                      <div className="bg-[#0A1C16]/20 border border-border/40 rounded-xl py-2 px-3">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Rounds Submitted</p>
                        <p className="text-sm font-extrabold text-foreground mt-0.5">{stats.totalScores}</p>
                      </div>
                    </div>

                    <div className="h-[1px] bg-border/40 my-3.5" />

                    {/* Audit activity feed */}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Audit Activity Feed
                    </p>

                    {loading ? (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        Querying platform data...
                      </div>
                    ) : recentActivity.length > 0 ? (
                      <div className="space-y-2.5">
                        {recentActivity.map((act, i) => (
                          <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-border/10 last:border-0">
                            <span className="text-muted-foreground truncate max-w-[200px]">
                              <strong className="text-foreground">{act.title}</strong> {act.detail}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0 font-medium">{act.time}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#0A1C16]/10 border border-border/30 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          No recent activity logged in this audit window. Platform activity feed will compile dynamically as new members subscribe and submit rounds.
                        </p>
                        <Link href="/signup" className="inline-flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider mt-1.5 hover:underline">
                          Be among the first members to participate <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
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
              <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">Process Flow</span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
                How Fundora Works
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 leading-relaxed">
                We bridge your passion for golf with verified global impact. Follow this simple 5-step progression to start giving and winning.
              </p>
            </div>
 
            {/* Horizontal flow sequence */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 relative">
              {[
                {
                  step: "01",
                  title: "1. Subscribe",
                  icon: CreditCard,
                  category: "Setup Plan",
                  desc: "Select a membership tier (Eco Scout, Global Advocate, or Legacy Builder) that fits your target monthly contribution.",
                  tag: "Flexible Tiers"
                },
                {
                  step: "02",
                  title: "2. Enter Scores",
                  icon: Trophy,
                  category: "Log rounds",
                  desc: "Log your weekly Stableford golf scores directly in the portal. Your logged scores determine your giving score multiplier.",
                  tag: "Stableford Points"
                },
                {
                  step: "03",
                  title: "3. Support Charity",
                  icon: Heart,
                  category: "Fund Causes",
                  desc: "Allocate 100% of your subscription to vetted, audited charities. Track routing transparently through your dashboard.",
                  tag: "100% Direct Routing"
                },
                {
                  step: "04",
                  title: "4. Receive Draw Tickets",
                  icon: Ticket,
                  category: "Get Entries",
                  desc: "Your subscription tier and logged golf scores automatically calculate your active tickets for the monthly drawings.",
                  tag: "Automated Multipliers"
                },
                {
                  step: "05",
                  title: "5. Win Rewards",
                  icon: Gift,
                  category: "Win Prizes",
                  desc: "Stand a chance to win monthly luxury eco-retreat getaways, premium electric cruisers, and green technology rewards.",
                  tag: "Monthly Eco Draws"
                }
              ].map((stepObj, idx) => {
                const IconComponent = stepObj.icon;
                return (
                  <div key={idx} className="relative flex flex-col justify-between p-6 bg-card/40 border border-border/80 hover:border-accent/40 rounded-2xl shadow-sm hover:-translate-y-1 transition-all duration-300 group">
                    {/* Glowing top line */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div>
                      {/* Step Header */}
                      <div className="flex justify-between items-center mb-6">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-[#07130F] border border-white/[0.05] px-2 py-0.5 rounded-md">
                          {stepObj.category}
                        </span>
                      </div>
                      
                      <h3 className="font-heading text-base font-bold text-foreground mb-3 group-hover:text-accent transition-colors">
                        {stepObj.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                        {stepObj.desc}
                      </p>
                    </div>
 
                    <div className="mt-6 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-accent">
                      <Check className="w-3.5 h-3.5 shrink-0" /> {stepObj.tag}
                    </div>
 
                    {/* Progress indicators / arrows */}
                    {idx < 4 && (
                      <>
                        {/* Horizontal Arrow (Desktop) */}
                        <div className="hidden lg:block absolute top-[28px] -right-4 -translate-y-1/2 translate-x-1/2 z-25">
                          <ArrowRight className="w-4 h-4 text-accent/60 animate-pulse" />
                        </div>
                        {/* Vertical Arrow (Mobile) */}
                        <div className="lg:hidden absolute left-1/2 -bottom-6 -translate-x-1/2 z-25 rotate-90">
                          <ArrowRight className="w-4 h-4 text-accent/60 animate-pulse" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* WHAT HAPPENS AFTER YOU SUBSCRIBE SECTION */}
        <section className="py-24 border-b border-border bg-[#091512]">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl mb-16">
              <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">Timeline Lifecycle</span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
                What Happens After You Subscribe
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 leading-relaxed">
                As soon as your membership is activated, a sequence of automated events ensures your contribution is routed and your rewards are tracked.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {[
                {
                  step: "01",
                  title: "Subscription Activates",
                  subtitle: "Instant Baseline Activation",
                  icon: Zap,
                  desc: "Your membership becomes active instantly, establishing your baseline giving score and initializing your monthly draw status."
                },
                {
                  step: "02",
                  title: "Scores Are Tracked",
                  subtitle: "Stableford Score Logs",
                  icon: Activity,
                  desc: "Connect your round history or log your golf Stableford score cards. Our system automatically processes your performance and updates leaderboards."
                },
                {
                  step: "03",
                  title: "Draw Eligibility Begins",
                  subtitle: "Reward Pool Integration",
                  icon: Award,
                  desc: "Your subscription tier combined with your logged golf scores calculates and registers your entries into the upcoming premium reward pools."
                },
                {
                  step: "04",
                  title: "Charity Allocation Starts",
                  subtitle: "100% Direct audited Routing",
                  icon: ShieldCheck,
                  desc: "100% of subscription funds are instantly routed to audited charities, and cryptographic receipts are generated and displayed on your user dashboard."
                }
              ].map((step, idx) => {
                const IconComponent = step.icon;
                return (
                  <div key={idx} className="relative flex flex-col justify-between p-6 bg-card/30 border border-border/50 hover:border-accent/30 rounded-2xl transition-all duration-300 group">
                    {/* Top Accent Gradient Line */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-all duration-300">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase bg-[#07130F] border border-white/[0.05] px-2.5 py-1 rounded-md">
                          Step {step.step}
                        </span>
                      </div>
                      
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-accent/80 block mb-1">
                        {step.subtitle}
                      </span>
                      <h3 className="font-heading text-base font-bold text-foreground mb-3 group-hover:text-accent transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* WHY MEMBERS JOIN SECTION */}
        <section className="py-24 border-b border-border bg-card/10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl mb-16">
              <span className="text-xs uppercase tracking-widest text-accent font-bold block mb-3">Benefits</span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
                Why Members Join Fundora
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 leading-relaxed">
                We bridge the gap between premium rewards and global impact, powered by your passion for golf.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pillar 1: Monthly Rewards */}
              <div className="flex flex-col p-8 bg-background border border-border/80 rounded-2xl shadow-sm hover:border-accent/40 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 flex items-center justify-center bg-[#07130F] border border-accent/20 text-accent rounded-2xl mb-6 group-hover:bg-accent/10 transition-colors">
                  <Gift className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors">Monthly Rewards</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                  Win premium incentives including luxury eco-retreats, electric cruiser bikes, and curated green tech getaways. Submissions and active subscription multipliers automatically boost your draw chances.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-accent">
                  <span>Eco-Travel & Tech Draws</span>
                </div>
              </div>

              {/* Pillar 2: Charity Impact */}
              <div className="flex flex-col p-8 bg-background border border-border/80 rounded-2xl shadow-sm hover:border-accent/40 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 flex items-center justify-center bg-[#07130F] border border-accent/20 text-accent rounded-2xl mb-6 group-hover:bg-accent/10 transition-colors">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors">Charity Impact</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                  Ensure 100% of your contributions go directly to verified non-profits of your choice. Track and audit the exact flow of funds with transparent cryptographic receipts and impact reports.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-accent">
                  <span>100% Vetted & Audited Routing</span>
                </div>
              </div>

              {/* Pillar 3: Community Competition */}
              <div className="flex flex-col p-8 bg-background border border-border/80 rounded-2xl shadow-sm hover:border-accent/40 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 flex items-center justify-center bg-[#07130F] border border-accent/20 text-accent rounded-2xl mb-6 group-hover:bg-accent/10 transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors">Community Competition</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                  Compete on global performance and giving leaderboards. Log Stableford golf rounds, track detailed game statistics, and connect with a dedicated community of golfers who care.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-accent">
                  <span>Leaderboards & Score Tracking</span>
                </div>
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
