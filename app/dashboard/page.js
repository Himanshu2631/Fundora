"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, PLAN_LABELS } from "@/hooks/useSubscription";
import { useImpactScores } from "@/hooks/useImpactScores";
import { useCharities } from "@/hooks/useCharities";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import SubscriptionWidget from "@/features/subscriptions/SubscriptionWidget";
import {
  Trophy,
  Flame,
  ExternalLink,
  ShieldCheck,
  Check,
  ArrowRight,
  Inbox,
  TrendingUp,
  Heart,
  Loader2,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Droplet,
  Trees,
  GraduationCap,
  Award,
  Activity,
  Users,
} from "lucide-react";

const PLAN_PRICES = { scout: 499, advocate: 1299, builder: 4999 };

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(value);

  useEffect(() => {
    const strVal = String(value);
    const cleanVal = strVal.replace(/,/g, "");
    const match = cleanVal.match(/^([^\d\.]*)([\d\.]+)([^\d\.]*)$/);

    if (!match) {
      setCount(value);
      return;
    }

    const prefix = match[1] || "";
    const end = parseFloat(match[2]);
    const suffix = match[3] || "";
    const decimalPlaces = (match[2].split(".")[1] || "").length;

    if (isNaN(end) || end === 0) {
      setCount(value);
      return;
    }

    let startTime = null;
    let animationFrameId;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressRatio = Math.min(progress / duration, 1);
      const easedProgress = progressRatio * (2 - progressRatio); // easeOutQuad

      const current = easedProgress * end;
      const parts = current.toFixed(decimalPlaces).split(".");
      const integerPart = parseInt(parts[0], 10).toLocaleString();
      const formatted = parts[1] ? `${integerPart}.${parts[1]}` : integerPart;

      setCount(`${prefix}${formatted}${suffix}`);

      if (progressRatio < 1) {
        animationFrameId = window.requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    animationFrameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <span>{count}</span>;
}

export default function DashboardOverview() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user: authUser, profile } = useAuth();
  const { subscription, status } = useSubscription();

  // Data integration via custom hooks
  let { impactScores: scores, totalImpactScore, loading: scoresLoading, error: scoresError } = useImpactScores();
  let { allocations, loading: charitiesLoading, error: charitiesError } = useCharities();
  let { leaderboard, rank: leaderboardRank, loading: leaderboardLoading, error: leaderboardError } = useLeaderboard();

  // Safeguard array references
  scores = scores || [];
  allocations = allocations || [];
  leaderboard = leaderboard || [];

  const displayLeaderboard = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return [];
    const userIndex = leaderboard.findIndex(e => e.isYou);
    if (userIndex !== -1 && userIndex < 4) {
      return leaderboard.slice(0, 4);
    }
    const top3 = leaderboard.slice(0, 3);
    if (userIndex !== -1) {
      const userEntry = leaderboard[userIndex];
      return [...top3, userEntry];
    }
    return top3;
  }, [leaderboard]);

  const monthlyContribution = PLAN_PRICES[subscription?.plan_type] ?? 0;
  const hasActivePlan = status === "active" || status === "cancelled";

  // Calculate user total score from recorded impact score events in Supabase
  const totalScorePoints = totalImpactScore !== undefined ? totalImpactScore : (scores ? scores.reduce((sum, s) => sum + (parseInt(s.score, 10) || 0), 0) : 0);
  const averageScoreVal = scores && scores.length > 0 ? (totalScorePoints / scores.length).toFixed(1) : "0.0";

  // Giving score composite calculations
  const tierBasePoints = subscription?.plan_type === "scout"
    ? 100
    : subscription?.plan_type === "advocate"
      ? 250
      : subscription?.plan_type === "builder"
        ? 1000
        : 0;

  const streakMultiplier = 5; // static streak tracking
  const streakBonus = streakMultiplier * 5; // 25 bonus points
  const dynamicGivingScore = tierBasePoints + totalScorePoints + streakBonus;

  // Active allocations summary
  const totalAllocatedVal = allocations ? allocations.reduce((sum, item) => sum + item.contribution_percentage, 0) : 0;

  // Outcome metrics
  let waterLiters = 0;
  let treesPlanted = 0;
  let tutoringHours = 0;
  let healthConsults = 0;

  if (allocations) {
    const monthlyPrice = monthlyContribution || 1299;
    allocations.forEach(a => {
      const amt = (a.contribution_percentage / 100) * monthlyPrice;
      const name = a.charity_name?.toLowerCase() || "";
      if (name.includes("water")) {
        waterLiters += Math.floor(amt * 12);
      } else if (name.includes("green") || name.includes("forest")) {
        treesPlanted += Math.floor(amt * 0.4);
      } else if (name.includes("edu") || name.includes("school")) {
        tutoringHours += Math.round(amt * 0.15 * 10) / 10;
      } else if (name.includes("health") || name.includes("corps")) {
        healthConsults += Math.round(amt * 0.08 * 10) / 10;
      }
    });
  }

  const displayUser = {
    name: profile?.full_name || authUser?.email?.split("@")[0] || "Member",
    email: authUser?.email || "—",
    tier: hasActivePlan
      ? PLAN_LABELS[subscription?.plan_type] || "Member"
      : "No Active Plan",
    joinedDate: authUser?.created_at
      ? `Joined ${new Date(authUser.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
      : "Joined Jun 2026",
    score: dynamicGivingScore,
    streak: streakMultiplier,
    rank: leaderboardRank,
    monthlyContribution,
  };

  const receipts = [
    { id: "TXN-8840", date: "Jun 15, 2026", amount: "₹1,299.00", charity: "Apex Water Initiative", status: "Audited", docUrl: "#" },
    { id: "TXN-7412", date: "May 15, 2026", amount: "₹1,299.00", charity: "Apex Water Initiative", status: "Audited", docUrl: "#" },
    { id: "TXN-6395", date: "Apr 15, 2026", amount: "₹1,299.00", charity: "Acres of Green", status: "Audited", docUrl: "#" },
    { id: "TXN-5211", date: "Mar 15, 2026", amount: "₹1,299.00", charity: "Acres of Green", status: "Audited", docUrl: "#" },
    { id: "TXN-4019", date: "Feb 15, 2026", amount: "₹1,299.00", charity: "Empower Global Edu", status: "Audited", docUrl: "#" },
  ];

  const hasAllocations = allocations && allocations.length > 0;

  const impactMetrics = [
    {
      label: "Membership Tier",
      value: displayUser.tier,
      desc: hasActivePlan
        ? `${subscription?.plan_type === "builder" ? "10x" : subscription?.plan_type === "advocate" ? "3x" : "Base"} score multiplier active`
        : "No active giving plan",
      icon: ShieldCheck,
      color: "text-accent",
    },
    {
      label: "Contribution Amount",
      value: hasActivePlan ? `₹${monthlyContribution.toLocaleString("en-IN")}` : "Awaiting subscription",
      desc: hasActivePlan ? "Routed to selected causes" : "Select a plan to start giving",
      icon: Heart,
      color: "text-rose-400",
    },
    {
      label: "Supported Causes",
      value: hasAllocations
        ? allocations.map(a => a.charity_name).join(", ")
        : "Not configured yet",
      desc: hasAllocations ? `${allocations.length} cause(s) supported` : "Cause routing inactive",
      icon: Heart,
      color: "text-purple-400",
    },
    {
      label: "Current Impact Score",
      value: hasAllocations
        ? `${dynamicGivingScore} pts`
        : "Awaiting charity selection",
      desc: hasAllocations ? `Rank ${displayUser.rank} overall` : "Score generation pending",
      icon: Trophy,
      color: "text-accent",
    },
    {
      label: "Giving Streak",
      value: `${streakMultiplier} Weeks Active`,
      desc: "+25 bonus impact points maintained",
      icon: Flame,
      color: "text-amber-400",
    },
    ...(hasAllocations ? [] : [
      {
        label: "Impact Status",
        value: "Awaiting charity selection",
        desc: "Allocations required to process impact",
        icon: AlertTriangle,
        color: "text-amber-400 animate-pulse",
      }
    ]),
  ];

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* ── Welcome Banner ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="w-full mb-8">
          <Card className="bg-gradient-to-br from-[#061511] via-[#0A1C16] to-[#040D09] border-accent/25 relative overflow-hidden shadow-[0_0_50px_rgba(212,185,147,0.06)] rounded-3xl p-8 md:p-10 transition-all duration-300 hover:border-accent/40">
            {/* Glowing top line */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-accent/35 to-transparent" />

            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-[120px] rounded-full pointer-events-none -z-10" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-800/5 blur-[100px] rounded-full pointer-events-none -z-10" />
            {/* Grid Pattern mask */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1d18_1px,transparent_1px),linear-gradient(to_bottom,#0c1d18_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 -z-10 pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Column - Philanthropy Overview */}
              <div className="lg:col-span-7 flex flex-col justify-between h-full">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Badge variant="accent" className="gap-1.5 px-3 py-1 text-[10px] uppercase font-extrabold tracking-widest text-[#060C0A] bg-accent">
                      <Sparkles className="w-3.5 h-3.5" /> Philanthropy Command Center
                    </Badge>
                    <span className="text-xs text-muted-foreground/85 font-semibold">
                      Welcome back, <strong className="text-white">{displayUser.name.split(" ")[0]}</strong>
                    </span>
                  </div>

                  <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-8">
                    Your Verified <span className="text-accent">Giving Impact</span>
                  </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                  {/* Monthly Giving Allocation */}
                  <div className="md:col-span-6 bg-[#05110D]/95 border border-border/20 p-6 rounded-2xl relative overflow-hidden shadow-inner group/giving hover:border-accent/40 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-[3px] h-full bg-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                      Monthly Contribution
                    </span>
                    <span className="text-4xl md:text-5xl font-black text-accent font-heading block tracking-tight drop-shadow-[0_0_15px_rgba(212,185,147,0.15)]">
                      <AnimatedCounter value={hasActivePlan ? `₹${monthlyContribution.toLocaleString("en-IN")}` : "₹0"} />
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-3 block">
                      Tier: <strong>{displayUser.tier}</strong>
                    </span>
                  </div>

                  {/* Impact Score Standing */}
                  <div className="md:col-span-6 bg-[#05110D]/95 border border-border/20 p-6 rounded-2xl relative overflow-hidden shadow-inner hover:border-emerald-500/30 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                      Current Impact Score
                    </span>
                    <span className="text-4xl md:text-5xl font-black text-emerald-400 font-heading block tracking-tight">
                      <AnimatedCounter value={`${dynamicGivingScore} pts`} />
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-3 block">
                      Leaderboard Rank: <strong>{displayUser.rank}</strong>
                    </span>
                  </div>
                </div>

                {/* Score Progress bar */}
                <div className="space-y-3 bg-[#05110D]/40 border border-border/10 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">Weekly Score Logging Progress</span>
                    <span className="font-extrabold text-accent">{scores?.length || 0} / 5 Logged</span>
                  </div>
                  <div className="w-full h-3 bg-[#05110D] border border-border/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((scores?.length || 0) / 5) * 100, 100)}%` }}
                      transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.15 }}
                      className="h-full bg-gradient-to-r from-emerald-600 to-accent"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 leading-none">
                    {scores?.length === 5
                      ? "✓ All weekly scores logged! Maximum score multiplier active."
                      : `Log ${5 - (scores?.length || 0)} more impact score${5 - (scores?.length || 0) > 1 ? "s" : ""} to maximize weekly community standing.`}
                  </p>
                </div>
              </div>

              {/* Right Column - User command center widgets */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                {/* Membership Tier Widget */}
                <div className="bg-[#05110D]/50 border border-border/20 p-4.5 rounded-2xl flex items-center justify-between group hover:border-accent/40 hover:bg-[#071611]/70 transition-all duration-300">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">
                      Your Membership Tier
                    </span>
                    <span className="text-xl font-extrabold text-white font-heading block">
                      {displayUser.tier}
                    </span>
                    <span className="text-[9px] text-[#8a9690] font-semibold block mt-1">
                      {subscription?.plan_type === "builder"
                        ? "10x Impact Score multiplier active"
                        : subscription?.plan_type === "advocate"
                          ? "3x Impact Score multiplier active"
                          : subscription?.plan_type === "scout"
                            ? "Base Impact Score active"
                            : "No active giving plan"}
                    </span>
                  </div>
                  <div className="w-11 h-11 flex items-center justify-center bg-[#05110D] border border-border/30 rounded-xl text-accent group-hover:scale-105 transition-transform shadow-inner">
                    <ShieldCheck className="w-5.5 h-5.5" />
                  </div>
                </div>

                {/* Supported Causes Widget */}
                <div className="bg-[#05110D]/50 border border-border/20 p-4.5 rounded-2xl flex items-center justify-between group hover:border-accent/40 hover:bg-[#071611]/70 transition-all duration-300">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">
                      Active Allocations
                    </span>
                    <span className="text-xl font-extrabold text-white font-heading block">
                      <AnimatedCounter value={allocations.length} /> <span className="text-xs text-muted-foreground font-normal">causes</span>
                    </span>
                    <span className="text-[9px] text-emerald-400 font-semibold block mt-1">
                      {totalAllocatedVal}% of contribution routed
                    </span>
                  </div>
                  <div className="w-11 h-11 flex items-center justify-center bg-[#05110D] border border-border/30 rounded-xl text-emerald-400 group-hover:scale-105 transition-transform shadow-inner">
                    <Heart className="w-5.5 h-5.5" />
                  </div>
                </div>

                {/* Total Score Widget */}
                <div className="bg-[#05110D]/50 border border-border/20 p-4.5 rounded-2xl flex items-center justify-between group hover:border-accent/40 hover:bg-[#071611]/70 transition-all duration-300">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">
                      Your Total Score
                    </span>
                    <span className="text-xl font-extrabold text-white font-heading block">
                      <AnimatedCounter value={displayUser.score} /> <span className="text-xs text-muted-foreground font-normal">pts</span>
                    </span>
                    <span className="text-[9px] text-accent font-semibold block mt-1">
                      +{displayUser.streak * 5}wk logging streak active
                    </span>
                  </div>
                  <div className="w-11 h-11 flex items-center justify-center bg-[#05110D] border border-border/30 rounded-xl text-accent group-hover:scale-105 transition-transform shadow-inner">
                    <Trophy className="w-5.5 h-5.5" />
                  </div>
                </div>

                {/* Global Rank Widget */}
                <div className="bg-[#05110D]/50 border border-border/20 p-4.5 rounded-2xl flex items-center justify-between group hover:border-accent/40 hover:bg-[#071611]/70 transition-all duration-300">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">
                      Your Leaderboard Rank
                    </span>
                    <span className="text-xl font-extrabold text-white font-heading block">
                      {displayUser.rank}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-semibold block mt-1">
                      Top 25% of global members
                    </span>
                  </div>
                  <div className="w-11 h-11 flex items-center justify-center bg-[#05110D] border border-border/30 rounded-xl text-emerald-400 group-hover:scale-105 transition-transform shadow-inner">
                    <TrendingUp className="w-5.5 h-5.5" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Tab navigation ── */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-6 border-b border-border mb-8 text-sm overflow-x-auto">
            {["overview", "receipts"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 capitalize font-bold text-xs uppercase tracking-wider relative whitespace-nowrap ${activeTab === tab ? "text-accent" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab === "overview" ? "Community Overview" : "Audited Receipts"}
                {activeTab === tab && (
                  <motion.div
                    layoutId="overviewTabLine"
                    className="absolute bottom-0 left-0 w-full h-[2px] bg-accent"
                  />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Main Grid ── */}
      <div className="space-y-12">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            {/* Section 1: Compete */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
              }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Community Standing</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold ml-auto">
                  Impact Standings & Leaderboard
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                {/* Scores Widget */}
                <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col transition-all duration-300">
                  <Card className="p-6 flex flex-col justify-between border-border bg-card h-full">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-accent" />
                          Impact Scores Overview
                        </h3>
                        {!scoresLoading && !scoresError && scores.length > 0 && (
                          <Badge variant="outline" className="text-[9px]">
                            {scores.length} / 5 Logged
                          </Badge>
                        )}
                      </div>

                      {scoresLoading ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 text-accent animate-spin" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Loading scores...</span>
                        </div>
                      ) : scoresError ? (
                        <Alert variant="destructive" className="py-2.5 px-3">
                          <AlertTriangle className="w-4 h-4" />
                          <AlertDescription className="text-xs">{scoresError}</AlertDescription>
                        </Alert>
                      ) : scores.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-border/60 rounded-xl bg-secondary/5">
                          <Trophy className="w-7 h-7 text-muted-foreground/35 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-foreground/80">No Scores Registered</p>
                          <p className="text-[10.5px] text-muted-foreground mt-1 mb-4">
                            Submit up to 5 impact scores to calculate community statistics and boost your profile.
                          </p>
                          <Button asChild variant="accent" size="sm" className="h-8 text-xs font-bold uppercase tracking-wider">
                            <Link href="/dashboard/scores">Submit Impact Score</Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Latest Scores Timeline */}
                          <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                            {scores.slice(0, 3).map((item) => (
                              <div key={item.id} className="flex justify-between items-center p-2.5 bg-secondary/15 rounded-xl border border-border/30 hover:border-accent/15 transition-all">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-accent" />
                                  <span className="text-xs font-medium text-foreground">
                                    {new Date(item.score_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-foreground bg-accent/10 px-2 py-0.5 rounded-xl border border-accent/25">
                                  {item.score} pts
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Performance metrics grid */}
                          <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                            <div className="p-2 bg-secondary/10 border border-border/30 rounded-xl">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Average Score</span>
                              <span className="text-sm font-bold text-foreground">
                                {averageScoreVal}
                              </span>
                            </div>
                            <div className="p-2 bg-secondary/10 border border-border/30 rounded-xl">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Active Scores</span>
                              <span className="text-sm font-bold text-foreground">
                                {scores.length} / 5
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button asChild variant="outline" className="w-full mt-4 h-9 text-xs font-bold uppercase tracking-wider">
                      <Link href="/dashboard/scores">Manage Scores</Link>
                    </Button>
                  </Card>
                </motion.div>

                {/* Achievements Showcase */}
                <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col transition-all duration-300">
                  <Card className="p-6 flex flex-col justify-between border-border bg-card h-full relative overflow-hidden">
                    <div>
                      <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2 mb-6">
                        <Sparkles className="w-4 h-4 text-accent" />
                        Achievements & Badges
                      </h3>
                      <div className="space-y-3.5">
                        {[
                          { name: "Verified Supporter", desc: "Completed initial donation verification", unlocked: true, icon: Check },
                          { name: "Top Standing", desc: leaderboardRank === "Rank unavailable" || leaderboardRank === "Loading..." ? "Climbed the leaderboard" : `Climbed leaderboard to ${leaderboardRank}`, unlocked: true, icon: Trophy },
                          { name: "Global Advocate", desc: "Active Advocate giving tier selected", unlocked: true, icon: ShieldCheck },
                          { name: "Consistent Supporter", desc: "Submit weekly scores consistently (3/5)", unlocked: false, progress: 60, icon: Flame }
                        ].map((ach, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-secondary/5 border border-border/20">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${ach.unlocked ? "bg-emerald-950/45 text-emerald-500 border border-emerald-800/40" : "bg-secondary/15 text-muted-foreground border border-border/30"}`}>
                              <ach.icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-xs font-bold text-foreground truncate">{ach.name}</span>
                                <span className={`text-[8px] uppercase font-extrabold px-1.5 py-0.5 rounded-full ${ach.unlocked ? "bg-emerald-950/30 text-emerald-500" : "bg-secondary/20 text-muted-foreground"}`}>
                                  {ach.unlocked ? "Unlocked" : "60%"}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-none truncate">{ach.desc}</p>
                              {!ach.unlocked && ach.progress && (
                                <div className="w-full h-1 bg-secondary/35 rounded-full mt-1.5 overflow-hidden">
                                  <div className="h-full bg-accent" style={{ width: `${ach.progress}%` }} />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Score Leaderboard */}
                <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col transition-all duration-300">
                  <Card className="p-6 flex flex-col justify-between border-border bg-card h-full">
                    <div>
                      <h3 className="font-heading font-bold text-sm text-foreground mb-6 flex justify-between items-center">
                        <span>Impact Score Leaderboard</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Your rank: {displayUser.rank}
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {leaderboardLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                          </div>
                        ) : leaderboardError ? (
                          <div className="text-xs text-muted-foreground text-center py-6">
                            Rank unavailable
                          </div>
                        ) : (
                          displayLeaderboard.map((entry, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between text-xs py-2 px-3 rounded-xl ${entry.isYou
                                  ? "bg-accent/10 border border-accent/30 text-foreground"
                                  : "border border-transparent text-muted-foreground"
                                }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className={`w-6 font-bold shrink-0 ${entry.isYou ? "text-accent" : "text-muted-foreground/60"}`}>
                                  #{entry.rank}
                                </span>
                                <span className={`font-semibold truncate ${entry.isYou ? "text-foreground" : "text-muted-foreground"}`}>
                                  {entry.name} {entry.isYou && "(You)"}
                                </span>
                              </div>
                              <span className="font-bold text-foreground shrink-0 ml-2">{entry.score} pts</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <Button asChild variant="outline" className="w-full mt-5 h-9 text-xs font-bold uppercase tracking-wider">
                      <Link href="/dashboard/scores">View My Score Details</Link>
                    </Button>
                  </Card>
                </motion.div>
              </div>
            </motion.div>

            {/* Section 2: Impact */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
              }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Impact</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold ml-auto">
                  Charity Routing & Contributions
                </span>
              </div>

              <div className="space-y-8">
                {/* Top Row: Membership Status & Charity Allocations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  {/* Subscription Widget + Contribution Breakdown */}
                  <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col gap-6 transition-all duration-300">
                    <SubscriptionWidget />

                    {/* Contribution Breakdown */}
                    <Card className="p-6 flex-1 flex flex-col justify-between border-border bg-card">
                      <div>
                        <h3 className="font-heading font-extrabold text-base text-foreground mb-5 flex items-center gap-2">
                          <Award className="w-4 h-4 text-accent" />
                          Membership Benefits
                        </h3>

                        {/* Contribution Breakdown */}
                        <div className="space-y-3 mb-5">
                          {[
                            { label: "Monthly Contribution", value: `₹${monthlyContribution.toLocaleString("en-IN")}`, accent: true },
                            { label: "Charity Routing", value: `${totalAllocatedVal}% Allocated`, accent: totalAllocatedVal === 100 },
                            { label: "Impact Score Multiplier", value: subscription?.plan_type === "builder" ? "10x" : subscription?.plan_type === "advocate" ? "3x" : "Base", accent: true },
                            { label: "Impact Score", value: `${dynamicGivingScore} pts`, accent: true },
                          ].map((row, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs border-b border-border/25 pb-2 last:border-0 last:pb-0">
                              <span className="text-muted-foreground font-semibold">{row.label}</span>
                              <span className={`font-bold ${row.accent ? "text-accent" : "text-foreground"}`}>
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Impact Status */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold uppercase tracking-wider text-muted-foreground">Impact Status</span>
                            <span className={`font-extrabold ${hasActivePlan && scores.length > 0 && allocations.length > 0 ? "text-emerald-500" : "text-amber-500"}`}>
                              {hasActivePlan && scores.length > 0 && allocations.length > 0 ? "Active & Routing" : "Setup Incomplete"}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {[
                              { label: "Active Subscription", met: hasActivePlan },
                              { label: "Score Submitted", met: scores.length > 0 },
                              { label: "Charity Selected", met: allocations.length > 0 },
                            ].map((req, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px]">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${req.met ? "bg-emerald-950/45 text-emerald-500 border border-emerald-800/40" : "bg-secondary/15 text-muted-foreground border border-border/30"}`}>
                                  <Check className="w-2.5 h-2.5" />
                                </div>
                                <span className={`font-medium ${req.met ? "text-foreground" : "text-muted-foreground"}`}>
                                  {req.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Button asChild variant="outline" className="w-full mt-4 h-9 text-xs font-bold uppercase tracking-wider">
                        <Link href="/dashboard/subscription">Manage Subscription</Link>
                      </Button>
                    </Card>
                  </motion.div>

                  {/* Charity Allocations Widget */}
                  <motion.div whileHover={{ y: -2, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col transition-all duration-300 lg:col-span-1">
                    <Card className="p-6 flex flex-col justify-between border-border bg-card h-full flex-1">
                      <div>
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                            <Heart className="w-5 h-5 text-accent animate-pulse" />
                            Charity Allocations
                          </h3>
                          {!charitiesLoading && !charitiesError && allocations.length > 0 && (
                            <Badge variant={totalAllocatedVal === 100 ? "success" : "warning"} className="text-[10px] font-extrabold px-2.5 py-0.5 tracking-wider">
                              {totalAllocatedVal}% Allocated
                            </Badge>
                          )}
                        </div>

                        {charitiesLoading ? (
                          <div className="py-12 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 text-accent animate-spin" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold">Loading selections...</span>
                          </div>
                        ) : charitiesError ? (
                          <Alert variant="destructive" className="py-3 px-4 border-red-500/20 bg-red-950/15">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription className="text-xs text-red-400 font-medium">{charitiesError}</AlertDescription>
                          </Alert>
                        ) : allocations.length === 0 ? (
                          <div className="space-y-6 py-2">
                            <div className="space-y-2 max-w-md mx-auto text-center">
                              <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent mb-2 animate-pulse">
                                <Heart className="w-6 h-6" />
                              </div>
                              <h4 className="font-heading font-black text-sm text-white leading-snug">
                                Choose where your contribution creates impact.
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Your monthly membership contribution is ready to be routed to verified global causes. Select your preferences to start certified giving.
                              </p>
                            </div>

                            <div className="flex justify-center">
                              <Button asChild variant="accent" size="sm" className="h-9 px-8 text-xs font-extrabold uppercase tracking-wider shadow-lg hover:shadow-accent/5">
                                <Link href="/dashboard/charity">Select Causes & Set Allocations</Link>
                              </Button>
                            </div>

                            {/* 3 Featured Causes preview cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 text-left">
                              {[
                                { title: "Clean Water", desc: "Apex Water Initiative", mission: "Gravity-fed sand filters for remote settlements.", image: "/apex_water.png", color: "from-blue-500/10 to-blue-600/5 text-blue-400" },
                                { title: "Reforestation", desc: "Acres of Green", mission: "Restoring native woodlands and carbon sinks.", image: "/acres_of_green.png", color: "from-emerald-500/10 to-emerald-600/5 text-emerald-400" },
                                { title: "STEM Education", desc: "Empower Global Edu", mission: "Mentoring girls in coding & physics circles.", image: "/empower_edu.png", color: "from-purple-500/10 to-purple-600/5 text-purple-400" }
                              ].map((cause, i) => (
                                <div key={i} className="group/cause rounded-xl border border-border/45 bg-[#060C0A]/40 overflow-hidden flex flex-col justify-between hover:border-accent/40 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300">
                                  <div className="h-20 w-full relative overflow-hidden bg-secondary/25">
                                    <img src={cause.image} alt={cause.title} className="w-full h-full object-cover opacity-75 group-hover/cause:opacity-90 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <span className="absolute bottom-2 left-2 text-[8px] font-extrabold uppercase tracking-widest bg-black/60 px-1.5 py-0.5 rounded text-white">{cause.title}</span>
                                  </div>
                                  <div className="p-3 flex-1 flex flex-col justify-between">
                                    <div>
                                      <span className="text-[10px] font-bold text-white leading-tight block">{cause.desc}</span>
                                      <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{cause.mission}</p>
                                    </div>
                                    <Link href="/dashboard/charity" className="text-[8px] font-black uppercase tracking-widest text-accent hover:underline mt-2.5 block">
                                      Configure →
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Dynamic Outcome Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="p-3 bg-secondary/5 border border-border/10 rounded-xl hover:border-accent/20 transition-all flex flex-col justify-between">
                                <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground block">Allocated This Month</span>
                                <span className="text-sm font-black text-white mt-1.5 block">₹{(monthlyContribution || 499).toLocaleString("en-IN")}</span>
                              </div>
                              <div className="p-3 bg-secondary/5 border border-border/10 rounded-xl hover:border-accent/20 transition-all flex flex-col justify-between">
                                <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground block">Active Causes</span>
                                <span className="text-sm font-black text-white mt-1.5 block">{allocations.length} Selected</span>
                              </div>
                              {waterLiters > 0 && (
                                <div className="p-3 bg-secondary/5 border border-border/10 rounded-xl hover:border-accent/20 transition-all flex flex-col justify-between">
                                  <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground block">Water Projects</span>
                                  <span className="text-sm font-black text-blue-400 mt-1.5 block">{waterLiters} Liters</span>
                                </div>
                              )}
                              {treesPlanted > 0 && (
                                <div className="p-3 bg-secondary/5 border border-border/10 rounded-xl hover:border-accent/20 transition-all flex flex-col justify-between">
                                  <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground block">Trees Sponsored</span>
                                  <span className="text-sm font-black text-emerald-400 mt-1.5 block">{treesPlanted} Trees</span>
                                </div>
                              )}
                              {tutoringHours > 0 && (
                                <div className="p-3 bg-secondary/5 border border-border/10 rounded-xl hover:border-accent/20 transition-all flex flex-col justify-between">
                                  <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground block">Tutoring Funded</span>
                                  <span className="text-sm font-black text-purple-400 mt-1.5 block">{tutoringHours} Hrs</span>
                                </div>
                              )}
                              {healthConsults > 0 && (
                                <div className="p-3 bg-secondary/5 border border-border/10 rounded-xl hover:border-accent/20 transition-all flex flex-col justify-between">
                                  <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground block">Medical Support</span>
                                  <span className="text-sm font-black text-rose-400 mt-1.5 block">{healthConsults} Consults</span>
                                </div>
                              )}
                              {waterLiters === 0 && treesPlanted === 0 && tutoringHours === 0 && healthConsults === 0 && (
                                <div className="p-3 bg-secondary/5 border border-border/10 rounded-xl hover:border-accent/20 transition-all flex flex-col justify-between">
                                  <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground block">Verification State</span>
                                  <span className="text-sm font-black text-emerald-400 mt-1.5 block">Audited Active</span>
                                </div>
                              )}
                            </div>

                            {/* Multi-Segment Distribution bar */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <span>Fund split distribution</span>
                                <span className="text-accent">{totalAllocatedVal}% / 100%</span>
                              </div>
                              <div className="h-2.5 w-full bg-secondary/40 rounded-full overflow-hidden flex border border-border/10">
                                {allocations.map((item, idx) => {
                                  const colors = ["bg-emerald-500", "bg-[#C4A054]", "bg-blue-500", "bg-purple-500"];
                                  return (
                                    <motion.div
                                      key={item.id}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${item.contribution_percentage}%` }}
                                      transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.2 }}
                                      className={`${colors[idx % colors.length]} h-full`}
                                      title={`${item.charity_name}: ${item.contribution_percentage}%`}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            {/* Grid of Cause Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                              {allocations.map((item, idx) => {
                                const colors = [
                                  "border-emerald-500/20 hover:border-emerald-500/40",
                                  "border-accent/20 hover:border-accent/40",
                                  "border-blue-500/20 hover:border-blue-500/40",
                                  "border-purple-500/20 hover:border-purple-500/40"
                                ];
                                return (
                                  <div
                                    key={item.id}
                                    className={`group/alloc rounded-xl border bg-[#060C0A]/40 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 ${colors[idx % colors.length]}`}
                                  >
                                    <div className="h-20 w-full relative overflow-hidden bg-secondary/25">
                                      <img
                                        src={item.charity_image}
                                        alt={item.charity_name}
                                        className="w-full h-full object-cover opacity-70 group-hover/alloc:opacity-85 transition-opacity"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                                      <div className="absolute top-2 right-2">
                                        <Badge variant="accent" className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 bg-black/60 text-accent border border-accent/20 shadow-sm">
                                          {item.contribution_percentage}%
                                        </Badge>
                                      </div>
                                      <span className="absolute bottom-2 left-2 text-[8px] font-extrabold uppercase tracking-widest bg-black/60 px-1.5 py-0.5 rounded text-[#C4A054]">
                                        {item.charity_category || "General"}
                                      </span>
                                    </div>
                                    <div className="p-3 flex-1 flex flex-col justify-between">
                                      <div>
                                        <span className="text-xs font-extrabold text-white group-hover/alloc:text-accent transition-colors block line-clamp-1">{item.charity_name}</span>
                                        <p className="text-[9.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                          {item.charity_description || "Verified global cause support routing."}
                                        </p>
                                      </div>

                                      {item.charity_impact && (
                                        <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] text-[8.5px] text-emerald-400 font-bold flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                          <span className="truncate">{item.charity_impact}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button asChild variant="outline" className="w-full mt-4 h-9 text-xs font-bold uppercase tracking-wider hover:bg-secondary/10">
                        <Link href="/dashboard/charity">Manage Allocations</Link>
                      </Button>
                    </Card>
                  </motion.div>
                </div>

                {/* Bottom Row: Full Width Impact Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                  {/* Your Impact This Month (2/3 width) */}
                  <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="lg:col-span-2 flex flex-col transition-all duration-300">
                    <Card className="p-6 flex-1 flex flex-col justify-between border-border bg-card">
                      <div>
                        <h3 className="font-heading font-extrabold text-base text-foreground mb-5 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-accent" />
                          Your Impact This Month
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {impactMetrics.map((metric, idx) => {
                            const MetricIcon = metric.icon;
                            return (
                              <div
                                key={idx}
                                className="p-4 bg-secondary/5 border border-border/10 rounded-2xl flex flex-col justify-between hover:border-accent/30 hover:bg-[#071611]/50 transition-all duration-300 group"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {metric.label}
                                  </span>
                                  <div className={`p-1.5 rounded-lg bg-black/40 border border-white/[0.04] ${metric.color} group-hover:scale-105 transition-transform`}>
                                    <MetricIcon className="w-4 h-4" />
                                  </div>
                                </div>
                                <div className="space-y-1 mt-auto">
                                  <span className="text-sm font-extrabold text-white leading-tight font-heading block line-clamp-2">
                                    {metric.value}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/80 block leading-none">
                                    {metric.desc}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Certified Audited Philanthropist Shield (1/3 width) */}
                  <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="lg:col-span-1 flex flex-col transition-all duration-300">
                    <Card className="p-8 text-center border-accent/20 bg-accent/5 flex flex-col h-full justify-center items-center">
                      <ShieldCheck className="w-12 h-12 text-accent mb-4 animate-pulse" />
                      <h4 className="font-heading font-bold text-xs text-foreground mb-2">
                        Audited Philanthropist
                      </h4>
                      <p className="text-[10.5px] text-muted-foreground leading-relaxed mb-6 max-w-[200px]">
                        Cross-audited by independent cryptographic signatures. All transactions securely signed.
                      </p>
                      <div className="bg-black/40 border border-white/[0.04] px-4 py-2.5 rounded-xl w-full">
                        <span className="text-[9px] text-accent font-mono tracking-wider font-semibold block uppercase">
                          PHILANTHROPIST SIGNATURE
                        </span>
                        <code className="text-xs text-white font-mono block mt-1">
                          0x8F9A...B8C3
                        </code>
                      </div>
                    </Card>
                  </motion.div>
                </div>

                {/* Trust & Transparency Feature Card */}
                <motion.div
                  whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }}
                  className="transition-all duration-300"
                >
                  <Card className="p-6 md:p-8 border-accent/20 bg-gradient-to-br from-[#061511] via-[#0A1C16] to-[#040D09] shadow-lg relative overflow-hidden rounded-3xl">
                    {/* Glowing background highlights */}
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/5 blur-[80px] rounded-full pointer-events-none -z-10" />
                    <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-800/5 blur-[60px] rounded-full pointer-events-none -z-10" />

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.06] pb-6 mb-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
                            🛡️ Cryptographic Trust & Verification
                          </span>
                        </div>
                        <h3 className="font-heading font-black text-xl sm:text-2xl text-white leading-tight">
                          Verified Giving & Audited Transparency Hub
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                          Sahayata operates with absolute financial accountability. Every giving transaction is signed, recorded, and audited to guarantee your donations directly reach vetted local charities.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-2xl">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                            System Fully Audited
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4 Pillars Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        {
                          title: "Verified Charities",
                          value: "100% Vetted Causes",
                          desc: "Every cause is legally vetted, background-checked, and signed to guarantee strict regulatory compliance and escrow safety.",
                          icon: ShieldCheck,
                          color: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10",
                          badge: "Compliance Certified"
                        },
                        {
                          title: "Funds Audited",
                          value: "3rd-Party Verified Ledger",
                          desc: "Monthly billing receipts and donation matching distributions are verified by independent third-party audit ledger audits.",
                          icon: TrendingUp,
                          color: "text-accent bg-accent/5 border-accent/10",
                          badge: "Independent Audit Log"
                        },
                        {
                          title: "Donation Certificates",
                          value: "Audited Tax Receipts",
                          desc: "Download official tax-exempt donation certificates and cryptographic execution proofs directly from your billing history.",
                          icon: Award,
                          color: "text-blue-400 bg-blue-500/5 border-blue-500/10",
                          badge: "Tax Exemption Ready"
                        },
                        {
                          title: "Contribution Tracking",
                          value: "Cryptographic Receipt Escrow",
                          desc: "Track every single dollar contributed to your selected charities with digital proof receipts downloadable for tax exemption.",
                          icon: Check,
                          color: "text-rose-400 bg-rose-500/5 border-rose-500/10",
                          badge: "Real-time Auditing"
                        }
                      ].map((pillar, idx) => {
                        const Icon = pillar.icon;
                        return (
                          <div
                            key={idx}
                            className="p-5 bg-secondary/5 border border-border/10 rounded-2xl flex flex-col justify-between hover:border-accent/30 hover:bg-[#071611]/50 transition-all duration-300 group"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8a9690]">
                                  {pillar.title}
                                </span>
                                <div className={`p-2 rounded-xl bg-black/40 border border-white/[0.04] ${pillar.color} group-hover:scale-105 transition-transform`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                              </div>
                              <h4 className="text-sm font-extrabold text-white leading-snug font-heading block mb-2 group-hover:text-accent transition-colors">
                                {pillar.value}
                              </h4>
                              <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                                {pillar.desc}
                              </p>
                            </div>
                            <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                              <span className="text-[9px] font-bold text-accent uppercase tracking-wider">
                                {pillar.badge}
                              </span>
                              <span className="text-[9px] text-emerald-400 font-extrabold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Verified
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* Quick Audit Trail */}
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-row justify-between items-center bg-secondary/5 py-4 px-6 border-b border-border/60">
                  <CardTitle className="text-sm">Recent Giving Audit Trail</CardTitle>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setActiveTab("receipts")}
                    className="text-xs uppercase font-bold tracking-wider"
                  >
                    View All
                  </Button>
                </CardHeader>
                <Table>
                  <TableBody>
                    {receipts.slice(0, 3).map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="font-semibold py-4">
                          <span className="block text-foreground text-sm font-bold">{txn.charity}</span>
                          <span className="text-muted-foreground text-[10px] font-medium">
                            {txn.date} · {txn.id}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-sm text-right pr-6">
                          <div className="flex items-center justify-end gap-3.5">
                            <span>{txn.amount}</span>
                            <Badge variant="success">{txn.status}</Badge>
                            <Link href="/dashboard/billing" className="text-muted-foreground hover:text-foreground">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>

            {/* Section 3: Community Milestones */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
              }}
              className="space-y-6 pt-4"
            >
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Community Impact Milestones</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold ml-auto">
                  Verified Platform Records
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Clean Water Initiative",
                    badge: "12,000 People Served",
                    detail: "Apex Water Initiative deployed gravity sand filtration units to 14 rural community clusters.",
                    date: "Jun 19, 2026",
                    hash: "0x3e89...cf40"
                  },
                  {
                    title: "Forest Canopy Conservation",
                    badge: "7,400 Hectares Protected",
                    detail: "Acres of Green completed seasonal woodland patrol and seedling nurturing initiatives.",
                    date: "May 18, 2026",
                    hash: "0x8f2a...22ba"
                  },
                  {
                    title: "STEM Girls Fellowship",
                    badge: "340 Fellowships Funded",
                    detail: "Empower Global Edu distributed robotics hardware and mentorship access to collegiate scholars.",
                    date: "May 12, 2026",
                    hash: "0x6d9e...88ab"
                  }
                ].map((item, idx) => (
                  <Card key={idx} className="p-6 flex flex-col justify-between border-border bg-gradient-to-b from-[#0A1C16] to-[#040D09] hover:border-accent/60 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent via-accent-foreground to-accent opacity-20 group-hover:opacity-100 transition-opacity" />
                    <div className="space-y-4">
                      <div className="flex items-start justify-between border-b border-white/[0.04] pb-3">
                        <span className="text-xs font-bold text-white font-heading">{item.title}</span>
                        <Badge variant="outline" className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-400 border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5">
                          ✓ Verified Outcome
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm font-extrabold text-accent block font-heading">{item.badge}</span>
                        <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-2">{item.detail}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 border-t border-white/[0.04]">
                        <span>Audit Date: <strong>{item.date}</strong></span>
                        <span className="font-mono text-accent">{item.hash}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* RECEIPTS TAB */}
        {activeTab === "receipts" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Charity Cause</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Audit Status</TableHead>
                    <TableHead className="text-right pr-6">Receipt / Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono text-muted-foreground pl-6">{txn.id}</TableCell>
                      <TableCell>{txn.date}</TableCell>
                      <TableCell className="font-bold text-foreground">{txn.charity}</TableCell>
                      <TableCell className="font-bold text-foreground text-sm">{txn.amount}</TableCell>
                      <TableCell>
                        <Badge variant="success" className="gap-1">
                          <Check className="w-3 h-3" /> {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Link href="/dashboard/billing" className="inline-flex items-center gap-1 text-accent font-bold uppercase tracking-wider text-[10px] hover:underline">
                          View Certificate <ExternalLink className="w-3 h-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
