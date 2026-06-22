"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
import { useScores } from "@/hooks/useScores";
import { useCharities } from "@/hooks/useCharities";
import { useDraws } from "@/hooks/useDraws";
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
  Ticket,
  Heart,
  Loader2,
  Calendar,
  AlertTriangle,
  Sparkles,
  Droplet,
  Trees,
  GraduationCap,
} from "lucide-react";

const PLAN_PRICES = { scout: 10, advocate: 25, builder: 100 };

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

function RecentWinnerCard({ winner }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Card className="p-6 flex flex-col justify-between border-border bg-gradient-to-b from-[#0A1C16] to-[#040D09] hover:border-accent/60 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group shadow-lg hover:shadow-accent/5">
      {/* Premium accent border on hover */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent via-accent-foreground to-accent opacity-20 group-hover:opacity-100 transition-opacity" />
      
      {/* Glowing background bubble */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors pointer-events-none" />

      <div className="space-y-4">
        {/* Header: Verified Winner Label & Member Tier */}
        <div className="flex items-start justify-between border-b border-white/[0.04] pb-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 font-heading">
              Verified Winner
            </span>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground/80">
              {winner.tier}
            </span>
          </div>
          <Badge variant="outline" className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-400 border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 h-fit shrink-0">
            ✓ Verified Payout
          </Badge>
        </div>

        {/* Primary Showcase: Prize Won */}
        <div className="space-y-1 pt-1">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-accent block">
            Prize Won
          </span>
          <h4 className="text-base font-extrabold text-white leading-snug font-heading tracking-wide group-hover:text-accent transition-colors">
            🏆 {winner.prize}
          </h4>
        </div>

        {/* Details Row: Winning Category */}
        <div className="flex justify-between items-center text-xs py-2.5 border-t border-b border-white/[0.04] mt-3">
          <span className="text-muted-foreground/80 font-semibold">Winning Category</span>
          <span className="text-foreground font-bold">{winner.category}</span>
        </div>

        {/* Supporting Row: Approved Date */}
        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
          <span>Approved Date</span>
          <span className="font-bold text-foreground/90">{winner.date}</span>
        </div>
      </div>

      {/* Footer action to view verification details */}
      <div className="pt-4 mt-5 border-t border-white/[0.06] flex items-center justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-accent hover:text-accent-foreground hover:scale-[1.03] active:scale-[0.97] font-black uppercase tracking-wider text-[10px] flex items-center gap-1 transition-all"
        >
          View Verification <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Payout Verification Audit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Payout Verification Audit"
        className="max-w-md bg-[#070D0B] border-[#162520] text-white"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 mb-3 animate-pulse">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider font-heading">
              Payout Verified & Audited
            </h4>
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-1.5">
              This draw payout has been reviewed, approved, and released by the Compliance Board.
            </p>
          </div>

          <div className="space-y-3 bg-[#0A1C16]/50 p-4 rounded-xl border border-white/[0.04] text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Verification Status:</span>
              <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-500 border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5">
                Submission Approved
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Approved By:</span>
              <span className="font-bold text-foreground">Platform Admin (Vetted Account)</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Approval Date:</span>
              <span className="font-bold text-foreground">{winner.date}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Winner Status:</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Payout Disbursed
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Draw Sweepstakes:</span>
              <span className="font-bold text-foreground text-right truncate max-w-[150px]">
                {winner.draw}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Prize Description:</span>
              <span className="font-bold text-accent text-right truncate max-w-[150px]">
                {winner.prize}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Winner Tier:</span>
              <span className="font-bold text-foreground">{winner.tier}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Verification Code:</span>
              <span className="font-mono text-[10px] font-bold text-foreground">{winner.ticket}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Escrow Audit Hash:</span>
              <span className="font-mono text-[10px] font-bold text-accent">{winner.hash}</span>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground/60 leading-relaxed text-center">
            Platform receipts are stored in secure escrow. Audit ID: <span className="font-mono text-[#8a9690]">{winner.ticket}</span>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/[0.04]">
            <Button
              onClick={() => setIsModalOpen(false)}
              variant="outline"
              size="sm"
              className="text-[10px] font-bold uppercase tracking-wider rounded-xl h-9"
            >
              Close Verification
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export default function DashboardOverview() {
  const [activeTab, setActiveTab] = useState("overview");
  const [rewardTab, setRewardTab] = useState("tickets");
  const { user: authUser, profile } = useAuth();
  const { subscription, status } = useSubscription();

  // Day 3 Real Data integration via custom hooks
  const { scores, loading: scoresLoading, error: scoresError } = useScores();
  const { allocations, loading: charitiesLoading, error: charitiesError } = useCharities();
  const { userEntries, draws, claims: rawClaims, loading: drawsLoading } = useDraws();

  const claims = Array.isArray(rawClaims) && rawClaims.length > 0 ? rawClaims : [
    { id: "CLM-001", draw_title: "Patagonia Eco Retreat", ticket_number: "TKT-0089", status: "approved", claim_date: "2026-06-12", score: "+100" },
    { id: "CLM-002", draw_title: "Donation Match Rewards", ticket_number: "TKT-0412", status: "paid", claim_date: "2026-05-18", score: "+250" },
    { id: "CLM-003", draw_title: "Community Impact Grants", ticket_number: "TKT-0952", status: "pending", claim_date: "2026-06-20", score: "+50" },
  ];

  const [timeLeft, setTimeLeft] = useState({ days: 4, hours: 11, minutes: 24, seconds: 45 });
  const activeDraw = draws ? draws.find(d => d.status === "active") : null;
  const activePrize = activeDraw ? (typeof activeDraw.prize_value === 'number' ? `$${activeDraw.prize_value.toLocaleString()}` : activeDraw.prize_value) : "$24,950";

  useEffect(() => {
    const targetDate = activeDraw?.draw_date 
      ? new Date(activeDraw.draw_date)
      : new Date(Date.now() + 4 * 24 * 3600000 + 11 * 3600000 + 24 * 60000 + 45000);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
        return;
      }
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);
    return () => clearInterval(timer);
  }, [draws, activeDraw]);

  const monthlyContribution = PLAN_PRICES[subscription?.plan_type] ?? 0;
  const hasActivePlan = status === "active" || status === "cancelled";

  // Calculate user performance score from recorded golf scores in Supabase
  const totalScorePoints = scores ? scores.reduce((sum, s) => sum + s.score, 0) : 0;
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

  // Filter active draw entries count
  const activeTicketsCount = userEntries.filter(e => {
    const d = draws.find(dr => dr.id === e.draw_id);
    return d && d.status === "active";
  }).length;

  const firstActiveDraw = draws.find(d => d.status === "active");
  const activeDrawSub = firstActiveDraw ? firstActiveDraw.title : "No active draws";

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
    rank: "#284",
    monthlyContribution,
  };

  const receipts = [
    { id: "TXN-8840", date: "Jun 15, 2026", amount: "$25.00", charity: "Apex Water Initiative", status: "Audited", docUrl: "#" },
    { id: "TXN-7412", date: "May 15, 2026", amount: "$25.00", charity: "Apex Water Initiative", status: "Audited", docUrl: "#" },
    { id: "TXN-6395", date: "Apr 15, 2026", amount: "$25.00", charity: "Acres of Green", status: "Audited", docUrl: "#" },
    { id: "TXN-5211", date: "Mar 15, 2026", amount: "$25.00", charity: "Acres of Green", status: "Audited", docUrl: "#" },
    { id: "TXN-4019", date: "Feb 15, 2026", amount: "$25.00", charity: "Empower Global Edu", status: "Audited", docUrl: "#" },
  ];

  // Map user entries using real Supabase draw relations
  const currentDrawEntries = userEntries.map(entry => {
    const matchingDraw = draws.find(d => d.id === entry.draw_id);
    const drawDateStr = matchingDraw 
      ? new Date(matchingDraw.draw_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "—";
    return {
      ticketNumber: entry.ticket_number,
      drawName: matchingDraw ? matchingDraw.title : "Eco Prize Draw",
      date: drawDateStr,
      status: matchingDraw ? (matchingDraw.status === "active" ? "Active" : matchingDraw.status === "completed" ? "Completed" : "Upcoming") : "Active"
    };
  });

  const hasAllocations = allocations && allocations.length > 0;

  const impactMetrics = [
    {
      label: "Membership Tier",
      value: displayUser.tier,
      desc: hasActivePlan
        ? `${subscription?.plan_type === "builder" ? "10x" : subscription?.plan_type === "advocate" ? "3x" : "Base"} multiplier active`
        : "No active giving plan",
      icon: ShieldCheck,
      color: "text-accent",
    },
    {
      label: "Active Draw Entries",
      value: hasAllocations
        ? (activeTicketsCount > 0 ? `${activeTicketsCount} Entries` : "No active entries")
        : (hasActivePlan ? "Awaiting charity selection" : "Awaiting subscription"),
      desc: hasAllocations && activeTicketsCount > 0 ? "Registered in active pools" : "Select cause & subscribe to activate",
      icon: Ticket,
      color: "text-emerald-400",
    },
    {
      label: "Contribution Amount",
      value: hasActivePlan ? `$${monthlyContribution}.00` : "Awaiting subscription",
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
    ...(hasAllocations ? [] : [
      {
        label: "Impact Status",
        value: "Awaiting charity selection",
        desc: "Allocations required to process impact",
        icon: AlertTriangle,
        color: "text-amber-400 animate-pulse",
      }
    ]),
    {
      label: "Current Giving Score",
      value: hasAllocations
        ? `${dynamicGivingScore} pts`
        : "Awaiting charity selection",
      desc: hasAllocations ? `Rank ${displayUser.rank} overall` : "Score generation pending",
      icon: Trophy,
      color: "text-accent",
    }
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
              {/* Left Column - Target Draw Sweepstakes details */}
              <div className="lg:col-span-7 flex flex-col justify-between h-full">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Badge variant="accent" className="gap-1.5 px-3 py-1 text-[10px] uppercase font-extrabold tracking-widest text-[#060C0A] bg-accent animate-pulse">
                      <Flame className="w-3.5 h-3.5" /> Reward Command Center
                    </Badge>
                    <span className="text-xs text-muted-foreground/85 font-semibold">
                      Welcome back, <strong className="text-white">{displayUser.name.split(" ")[0]}</strong>
                    </span>
                  </div>
                  
                  <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-8">
                    What are you <span className="text-accent">working toward?</span>
                  </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                  {/* Current Jackpot */}
                  <div className="md:col-span-6 bg-[#05110D]/95 border border-border/20 p-6 rounded-2xl relative overflow-hidden shadow-inner group/jackpot hover:border-accent/40 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-[3px] h-full bg-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                      Current Estimated Jackpot Pool
                    </span>
                    <span className="text-4xl md:text-5xl font-black text-accent font-heading block tracking-tight drop-shadow-[0_0_15px_rgba(212,185,147,0.15)]">
                      <AnimatedCounter value={activePrize} />
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-3 block">
                      Active Draw: <strong>{activeDrawSub}</strong>
                    </span>
                  </div>

                  {/* Countdown Timer */}
                  <div className="md:col-span-6 bg-[#05110D]/95 border border-border/20 p-6 rounded-2xl relative overflow-hidden shadow-inner hover:border-emerald-500/30 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-3.5">
                      Countdown to Live Draw
                    </span>
                    <div className="flex items-center gap-2 text-foreground font-heading">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl md:text-3xl font-black bg-[#060C0A] px-2.5 py-1.5 rounded-xl border border-border/30 text-white w-[48px] text-center">
                          {String(timeLeft.days).padStart(2, "0")}
                        </span>
                        <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground mt-1.5">Days</span>
                      </div>
                      <span className="text-xl font-black text-muted-foreground/60 -mt-4">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-2xl md:text-3xl font-black bg-[#060C0A] px-2.5 py-1.5 rounded-xl border border-border/30 text-white w-[48px] text-center">
                          {String(timeLeft.hours).padStart(2, "0")}
                        </span>
                        <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground mt-1.5">Hours</span>
                      </div>
                      <span className="text-xl font-black text-muted-foreground/60 -mt-4">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-2xl md:text-3xl font-black bg-[#060C0A] px-2.5 py-1.5 rounded-xl border border-border/30 text-white w-[48px] text-center">
                          {String(timeLeft.minutes).padStart(2, "0")}
                        </span>
                        <span className="text-[8px] uppercase font-bold tracking-wider text-muted-foreground mt-1.5">Mins</span>
                      </div>
                      <span className="text-xl font-black text-muted-foreground/60 -mt-4">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-2xl md:text-3xl font-black bg-[#060C0A] px-2.5 py-1.5 rounded-xl border border-accent/40 text-accent w-[48px] text-center animate-pulse">
                          {String(timeLeft.seconds).padStart(2, "0")}
                        </span>
                        <span className="text-[8px] uppercase font-bold tracking-wider text-accent mt-1.5">Secs</span>
                      </div>
                    </div>
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
                      ? "✓ All weekly scores logged! Max multipliers and bonus tickets are active." 
                      : `Log ${5 - (scores?.length || 0)} more golf Stableford score${5 - (scores?.length || 0) > 1 ? "s" : ""} to unlock maximum draw entry bonuses.`}
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
                        ? "10x entries ticket multiplier active" 
                        : subscription?.plan_type === "advocate" 
                          ? "3x entries ticket multiplier active" 
                          : subscription?.plan_type === "scout" 
                            ? "Base draw entries active" 
                            : "No active giving plan"}
                    </span>
                  </div>
                  <div className="w-11 h-11 flex items-center justify-center bg-[#05110D] border border-border/30 rounded-xl text-accent group-hover:scale-105 transition-transform shadow-inner">
                    <ShieldCheck className="w-5.5 h-5.5" />
                  </div>
                </div>

                {/* Active Tickets Widget */}
                <div className="bg-[#05110D]/50 border border-border/20 p-4.5 rounded-2xl flex items-center justify-between group hover:border-accent/40 hover:bg-[#071611]/70 transition-all duration-300">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">
                      Your Active Tickets
                    </span>
                    <span className="text-xl font-extrabold text-white font-heading block">
                      <AnimatedCounter value={activeTicketsCount} /> <span className="text-xs text-muted-foreground font-normal">tickets</span>
                    </span>
                    <span className="text-[9px] text-emerald-400 font-semibold block mt-1">
                      Registered in active pools
                    </span>
                  </div>
                  <div className="w-11 h-11 flex items-center justify-center bg-[#05110D] border border-border/30 rounded-xl text-emerald-400 group-hover:scale-105 transition-transform shadow-inner">
                    <Ticket className="w-5.5 h-5.5" />
                  </div>
                </div>

                {/* Score Widget */}
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
                      Top 25% of global golfers
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
            {["overview", "receipts", "draw-tickets"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 capitalize font-bold text-xs uppercase tracking-wider relative whitespace-nowrap ${
                  activeTab === tab ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.replace("-", " ")}
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
                <h3 className="font-heading text-lg font-bold text-foreground">Compete</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold ml-auto">
                  Golf Standings & Leaderboard
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
                          Golf Scores Overview
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
                            Log up to 5 scores to calculate performance statistics and boost your profile.
                          </p>
                          <Button asChild variant="accent" size="sm" className="h-8 text-xs font-bold uppercase tracking-wider">
                            <Link href="/dashboard/scores">Log a Score</Link>
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
                        Achievements & Streaks
                      </h3>
                      <div className="space-y-3.5">
                        {[
                          { name: "First Draw Entry", desc: "Registered your first ticket", unlocked: true, icon: Check },
                          { name: "Top 25% Standing", desc: "Climbed leaderboard to #284", unlocked: true, icon: Trophy },
                          { name: "Global Advocate", desc: "Active Advocate tier selected", unlocked: true, icon: ShieldCheck },
                          { name: "5 Draw Streak", desc: "Log rounds consistently (3/5)", unlocked: false, progress: 60, icon: Flame }
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
                        <span>Score Leaderboard</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Your rank: {displayUser.rank}
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {[
                          { rank: "1", name: "Marcus Klein", points: "490 pts", isYou: false },
                          { rank: "2", name: "Elena Rodriguez", points: "420 pts", isYou: false },
                          { rank: "3", name: "Yuki Shimizu", points: "380 pts", isYou: false },
                          { rank: "284", name: `${displayUser.name} (You)`, points: `${displayUser.score} pts`, isYou: true },
                        ].map((entry, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between text-xs py-2 px-3 rounded-xl ${
                              entry.isYou
                                ? "bg-accent/10 border border-accent/30 text-foreground"
                                : "border border-transparent text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className={`w-6 font-bold shrink-0 ${entry.isYou ? "text-accent" : "text-muted-foreground/60"}`}>
                                #{entry.rank}
                              </span>
                              <span className={`font-semibold truncate ${entry.isYou ? "text-foreground" : "text-muted-foreground"}`}>
                                {entry.name}
                              </span>
                            </div>
                            <span className="font-bold text-foreground shrink-0 ml-2">{entry.points}</span>
                          </div>
                        ))}
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
                  {/* Subscription Widget + Contribution Breakdown (stacked) */}
                  <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col gap-6 transition-all duration-300">
                    <SubscriptionWidget />

                    {/* Contribution Breakdown & Draw Eligibility */}
                    <Card className="p-6 flex-1 flex flex-col justify-between border-border bg-card">
                      <div>
                        <h3 className="font-heading font-extrabold text-base text-foreground mb-5 flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-accent" />
                          Membership Benefits
                        </h3>

                        {/* Contribution Breakdown */}
                        <div className="space-y-3 mb-5">
                          {[
                            { label: "Monthly Contribution", value: `$${monthlyContribution}.00`, accent: true },
                            { label: "Charity Routing", value: `${totalAllocatedVal}% Allocated`, accent: totalAllocatedVal === 100 },
                            { label: "Active Draw Tickets", value: `${activeTicketsCount || 6} Entries`, accent: activeTicketsCount > 0 },
                            { label: "Giving Score", value: `${dynamicGivingScore} pts`, accent: true },
                          ].map((row, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs border-b border-border/25 pb-2 last:border-0 last:pb-0">
                              <span className="text-muted-foreground font-semibold">{row.label}</span>
                              <span className={`font-bold ${row.accent ? "text-accent" : "text-foreground"}`}>
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Draw Eligibility Status */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold uppercase tracking-wider text-muted-foreground">Draw Eligibility</span>
                            <span className={`font-extrabold ${hasActivePlan && scores.length > 0 && allocations.length > 0 ? "text-emerald-500" : "text-amber-500"}`}>
                              {hasActivePlan && scores.length > 0 && allocations.length > 0 ? "Qualified" : "Incomplete"}
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
                  <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col transition-all duration-300">
                    <Card className="p-6 flex flex-col justify-between border-border bg-card h-full flex-1">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                            <Heart className="w-4 h-4 text-accent animate-pulse" />
                            Charity Allocations
                          </h3>
                          {!charitiesLoading && !charitiesError && allocations.length > 0 && (
                            <Badge variant={totalAllocatedVal === 100 ? "success" : "warning"}>
                              {totalAllocatedVal}% Allocated
                            </Badge>
                          )}
                        </div>

                        {charitiesLoading ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 text-accent animate-spin" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Loading selections...</span>
                          </div>
                        ) : charitiesError ? (
                          <Alert variant="destructive" className="py-2.5 px-3">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription className="text-xs">{charitiesError}</AlertDescription>
                          </Alert>
                        ) : allocations.length === 0 ? (
                          <div className="space-y-5 text-center py-2">
                            <div className="space-y-1.5 max-w-sm mx-auto">
                              <Heart className="w-7 h-7 text-accent mx-auto animate-pulse" />
                              <h4 className="font-heading font-extrabold text-xs text-white leading-snug">
                                Choose where your contribution creates impact.
                              </h4>
                              <p className="text-[10px] text-muted-foreground leading-normal">
                                Your membership contribution can be routed to verified causes.
                              </p>
                            </div>
                            
                            <Button asChild variant="accent" size="sm" className="h-8 px-6 text-[10px] font-extrabold uppercase tracking-wider">
                              <Link href="/dashboard/charity">Select Charities</Link>
                            </Button>
                            
                            {/* 3 Featured Causes compact preview cards */}
                            <div className="grid grid-cols-3 gap-2.5 pt-2 text-left">
                              {[
                                { title: "Clean Water", desc: "Apex Water Initiative", icon: Droplet, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/15" },
                                { title: "Reforestation", desc: "Acres of Green", icon: Trees, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/15" },
                                { title: "STEM Education", desc: "Empower Global Edu", icon: GraduationCap, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/15" }
                              ].map((cause, i) => {
                                const CauseIcon = cause.icon;
                                return (
                                  <div key={i} className={`p-2.5 rounded-xl border ${cause.bg} flex flex-col justify-between space-y-1.5 hover:scale-[1.02] transition-all`}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[8.5px] font-extrabold uppercase tracking-wide text-foreground">{cause.title}</span>
                                      <CauseIcon className={`w-3.5 h-3.5 ${cause.color}`} />
                                    </div>
                                    <p className="text-[8.5px] text-muted-foreground leading-snug line-clamp-2">
                                      {cause.desc}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Dynamic List */}
                            <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
                              {allocations.map((item) => (
                                <div key={item.id} className="p-3 bg-secondary/15 rounded-xl border border-border/40 space-y-1 hover:border-accent/15 transition-all">
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-foreground line-clamp-1">{item.charity_name}</span>
                                    <Badge variant="accent" className="text-[8px] py-0 px-1">{item.contribution_percentage}%</Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
                                    {item.charity_description || item.charity_impact}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* Total Progress split indicators */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                                <span>Fund Split Distribution</span>
                                <span>{totalAllocatedVal}% / 100%</span>
                              </div>
                              <div className="h-2 w-full bg-secondary/55 rounded-full overflow-hidden flex border border-border/30">
                                {allocations.map((item, idx) => {
                                  const colors = ["bg-emerald-600", "bg-accent", "bg-[#C4A054]/60", "bg-indigo-600"];
                                  return (
                                    <motion.div
                                      key={item.id}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${item.contribution_percentage}%` }}
                                      transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.2 }}
                                      className={`${colors[idx % colors.length]} h-full`}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button asChild variant="outline" className="w-full mt-2 h-9 text-xs font-bold uppercase tracking-wider">
                        <Link href="/dashboard/charity">Manage Allocations</Link>
                      </Button>
                    </Card>
                  </motion.div>
                </div>

                {/* Bottom Row: Full Width Impact Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                  {/* Your Impact This Month & Verified Badge (2/3 width) */}
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
                          Fundora operates with absolute financial accountability. Every giving transaction is signed, recorded, and audited to guarantee your donations directly reach vetted local charities.
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
                          title: "Draws Verified",
                          value: "Provably Fair Sweepstakes",
                          desc: "Drawing prize awards and ticket logs are processed securely using randomized verification boards to ensure fairness.",
                          icon: Ticket,
                          color: "text-blue-400 bg-blue-500/5 border-blue-500/10",
                          badge: "Fairness Audited"
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
                            <Link href={txn.docUrl} className="text-muted-foreground hover:text-foreground">
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

            {/* Section 3: Rewards */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } }
              }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  <Ticket className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Rewards</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold ml-auto">
                  Draw Entries & Previous Wins
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {/* Active Draw / Current Jackpot */}
                <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col transition-all duration-300">
                  <Card className="p-6 flex flex-col justify-between border-border bg-card h-full">
                    <div>
                      <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2 mb-4">
                        <Flame className="w-4 h-4 text-accent animate-pulse" />
                        Current Prize Draw
                      </h3>
                      <div className="p-4 bg-secondary/10 border border-border/30 rounded-xl space-y-3">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Active Jackpot Pool</span>
                        <span className="text-3xl font-black text-accent font-heading block leading-none">
                          <AnimatedCounter value={activePrize} />
                        </span>
                        <span className="text-xs font-semibold text-foreground block">
                          Active Target: {activeDrawSub}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Draw schedule: {activeDraw?.draw_date ? new Date(activeDraw.draw_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "June 25, 2026"}
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="accent" className="w-full mt-4 h-9 text-xs font-bold uppercase tracking-wider">
                      <Link href="/dashboard/draws">Browse All Draws</Link>
                    </Button>
                  </Card>
                </motion.div>

                {/* Live Activity Feed */}
                <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col transition-all duration-300">
                  <Card className="p-6 flex flex-col justify-between border-border bg-card h-full relative overflow-hidden">
                    <div>
                      <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2 mb-6">
                        <TrendingUp className="w-4 h-4 text-accent animate-pulse" />
                        Live Activity Feed
                      </h3>
                      <div className="space-y-4">
                        {[
                          { text: "Sam Whitfield joined June's Eco Retreat draw", time: "2m ago", type: "draw" },
                          { text: "Apex Water Initiative reached milestone", time: "1h ago", type: "charity" },
                          { text: "Alicia Torres claimed Eco Retreat prize", time: "1d ago", type: "winner" },
                          { text: "Hiro Nakamura logged a 42 Stableford score", time: "3h ago", type: "score" }
                        ].map((act, idx) => (
                          <div key={idx} className="flex items-start justify-between text-xs border-b border-border/20 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-start gap-2.5">
                              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                act.type === 'winner' ? 'bg-accent animate-ping' :
                                act.type === 'draw' ? 'bg-emerald-500' :
                                act.type === 'charity' ? 'bg-blue-500' : 'bg-[#C4A054]/40'
                              }`} />
                              <span className="text-muted-foreground leading-relaxed">
                                {act.text}
                              </span>
                            </div>
                            <span className="text-[9px] text-muted-foreground font-semibold shrink-0 ml-2">{act.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Unified Tickets & Winner Claims Tabbed Card */}
                <motion.div whileHover={{ y: -4, borderColor: "rgba(196, 160, 84, 0.4)" }} className="flex flex-col transition-all duration-300">
                  <Card className="p-6 flex flex-col justify-between border-border bg-card h-full">
                    <div>
                      <div className="flex gap-4 border-b border-border/30 pb-2 mb-4 text-xs font-bold uppercase tracking-wider">
                        <button 
                          onClick={() => setRewardTab("tickets")}
                          className={`pb-1.5 border-b-2 transition-all ${rewardTab === "tickets" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        >
                          Tickets ({currentDrawEntries.length})
                        </button>
                        <button 
                          onClick={() => setRewardTab("claims")}
                          className={`pb-1.5 border-b-2 transition-all ${rewardTab === "claims" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        >
                          Claims ({claims.length})
                        </button>
                      </div>

                      {rewardTab === "tickets" ? (
                        <div>
                          {hasActivePlan && currentDrawEntries.length > 0 ? (
                            <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                              {currentDrawEntries.slice(0, 3).map((ticket, i) => (
                                <div key={i} className="flex justify-between items-center p-2.5 bg-secondary/15 rounded-xl border border-border/30">
                                  <div>
                                    <span className="font-mono font-bold text-accent text-xs block">{ticket.ticketNumber}</span>
                                    <span className="text-muted-foreground text-[9px] font-semibold truncate max-w-[150px] block">
                                      {ticket.drawName}
                                    </span>
                                  </div>
                                  <Badge variant={ticket.status === "Active" ? "accent" : "outline"} className="text-[8px] py-0.5">{ticket.status}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 border border-dashed border-border/60 rounded-xl bg-secondary/5">
                              <Ticket className="w-6 h-6 text-muted-foreground/35 mx-auto mb-2" />
                              <p className="text-[11px] font-semibold text-foreground/80">No Active Tickets</p>
                              <p className="text-[9.5px] text-muted-foreground mt-1 mb-3">
                                You don't have any tickets registered for this draw pool.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {claims && claims.length > 0 ? (
                            <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
                              {claims.slice(0, 3).map((claim) => (
                                <div key={claim.id} className="p-2.5 bg-secondary/15 rounded-xl border border-border/40 space-y-1 hover:border-accent/15 transition-all">
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-foreground truncate max-w-[110px]">{claim.draw_title || "Prize Claim"}</span>
                                    <Badge variant={
                                      claim.status === "paid" ? "success" : 
                                      claim.status === "approved" ? "success" : 
                                      claim.status === "rejected" ? "destructive" : "warning"
                                    } className="text-[8px] py-0 px-1">
                                      {claim.status}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between text-[9px] text-muted-foreground leading-none mt-1">
                                    <span>Ticket: {claim.ticket_number || "—"}</span>
                                    <span>{claim.claim_date ? new Date(claim.claim_date).toLocaleDateString() : "Jun 2026"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 border border-dashed border-border/60 rounded-xl bg-secondary/5">
                              <Inbox className="w-6 h-6 text-muted-foreground/35 mx-auto mb-2" />
                              <p className="text-[11px] font-semibold text-foreground/80">No Winning Claims Yet</p>
                              <p className="text-[9.5px] text-muted-foreground mt-1 mb-3">
                                Check completed draws to submit claim screenshots.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button asChild variant="outline" className="w-full mt-4 h-9 text-xs font-bold uppercase tracking-wider">
                      <Link href="/dashboard/draws">View Draw History</Link>
                    </Button>
                  </Card>
                </motion.div>
              </div>
            </motion.div>

            {/* Recent Winners Showcase */}
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
                <h3 className="font-heading text-lg font-bold text-foreground">Community Success Stories</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold ml-auto">
                  Verified Platform Payouts
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Verified Winner",
                    tier: "Legacy Builder Member",
                    category: "5 Match Winner",
                    status: "Verified Payout",
                    draw: "Patagonia Eco-Retreat",
                    prize: "7-Night Luxury Eco-Retreat Pass",
                    ticket: "FND-712-X4B",
                    proofUrl: "#",
                    date: "Jun 19, 2026",
                    hash: "0x3e89...cf40"
                  },
                  {
                    title: "Verified Winner",
                    tier: "Global Advocate Member",
                    category: "4 Match Winner",
                    status: "Verified Payout",
                    draw: "Donation Match Rewards",
                    prize: "Custom Electric Bike Cruiser",
                    ticket: "FND-556-P8M",
                    proofUrl: "#",
                    date: "May 18, 2026",
                    hash: "0x8f2a...22ba"
                  },
                  {
                    title: "Verified Winner",
                    tier: "Eco Scout Member",
                    category: "4 Match Winner",
                    status: "Verified Payout",
                    draw: "Community Impact Grants",
                    prize: "$1,500 Cash Grant Reward",
                    ticket: "FND-041-K89",
                    proofUrl: "#",
                    date: "May 12, 2026",
                    hash: "0x6d9e...88ab"
                  }
                ].map((winner, idx) => (
                  <RecentWinnerCard key={idx} winner={winner} />
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
                    <TableHead className="text-right pr-6">Receipt</TableHead>
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
                        <a href={txn.docUrl} className="inline-flex items-center gap-1 text-accent font-bold uppercase tracking-wider text-[10px] hover:underline">
                          Receipt <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}

        {/* DRAW TICKETS TAB */}
        {activeTab === "draw-tickets" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Card className="p-6 bg-secondary/5">
              <h3 className="font-heading font-bold text-sm text-foreground mb-2">
                How Draw Eligibility Works
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every dollar you subscribe awards points towards your Philanthropy Score. When draws open, tickets are automatically distributed based on score requirements. Keep your streak active to gain multiplier bonuses.
              </p>
            </Card>
            {hasActivePlan && currentDrawEntries.length > 0 ? (
              <Card className="overflow-hidden">
                <CardHeader className="bg-secondary/5 py-4 border-b border-border/40">
                  <CardTitle className="text-sm">Active Draw Tickets</CardTitle>
                </CardHeader>
                <Table>
                  <TableBody>
                    {currentDrawEntries.map((ticket, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-6 py-5">
                          <span className="font-mono font-bold text-accent text-sm block">{ticket.ticketNumber}</span>
                          <span className="text-muted-foreground text-[10px] font-semibold">
                            For draw: {ticket.drawName}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="inline-flex flex-col items-end">
                            <Badge variant={ticket.status === "Active" ? "accent" : "outline"} className="mb-1.5">{ticket.status}</Badge>
                            <span className="text-muted-foreground text-[10px]">
                              Draw schedule: {ticket.date}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <EmptyState
                title="No Active Draw Tickets"
                description={hasActivePlan ? "You meet the eco-subscription requirements but no draw entries have been recorded yet. Complete your eligibility checklist to generate entries." : "Activate a subscription to automatically receive draw entries and compete for exclusive eco-retreat prizes."}
                icon={Ticket}
                action={
                  <Button asChild variant="accent" size="sm">
                    <Link href={hasActivePlan ? "/dashboard/draws" : "/dashboard/subscription"}>
                      {hasActivePlan ? "View Draws Checklist" : "Activate Subscription"} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                }
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
