"use client";

import * as React from "react";
import { useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useScores } from "@/hooks/useScores";
import { useCharities } from "@/hooks/useCharities";
import { useDraws } from "@/hooks/useDraws";
import { checkEligibility } from "@/lib/drawValidation";
import { calculateMatches, getPrizeCategory } from "@/lib/drawUtilities";
import { 
  Ticket, 
  Trophy, 
  Calendar, 
  Clock, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  XCircle,
  HelpCircle,
  AlertTriangle,
  Award,
  Sparkles,
  Info,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Check
} from "lucide-react";
import Link from "next/link";

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function DrawsPage() {
  const { user, profile } = useAuth();
  
  // Day 4 & 5 Hooks integration
  const { 
    draws, 
    userEntries, 
    claims,
    submitClaim,
    reviewClaim,
    fetchAllClaims,
    completeDraw,
    registerForDraw, 
    loading: drawsLoading, 
    error: drawsError 
  } = useDraws();

  const { status: subStatus, subscription } = useSubscription();
  const { scores, loading: scoresLoading } = useScores();
  const { allocations, loading: charitiesLoading } = useCharities();
  const [isPending, startTransition] = useTransition();

  // Claims UI states
  const [claimUrls, setClaimUrls] = React.useState({});
  const [claimErrors, setClaimErrors] = React.useState({});
  const [claimSuccess, setClaimSuccess] = React.useState({});
  const [claimSubmitting, setClaimSubmitting] = React.useState({});
  const [reviewSubmitting, setReviewSubmitting] = React.useState({});
  const [completingDrawId, setCompletingDrawId] = React.useState(null);

  const hasActivePlan = subStatus === "active" || subStatus === "cancelled";
  const isLoaded = !drawsLoading && !scoresLoading && !charitiesLoading;
  const isAdmin = profile?.role === "admin" || user?.email?.includes("admin") || user?.email?.startsWith("admin@");

  // 1. Calculate eligibility
  const { isEligible, reasons } = checkEligibility(subStatus, scores.length, allocations.length);

  // 2. Compute dynamic giving score for min score validation
  const totalScorePoints = scores ? scores.reduce((sum, s) => sum + s.score, 0) : 0;
  const tierBasePoints = subscription?.plan_type === "scout" 
    ? 100 
    : subscription?.plan_type === "advocate" 
      ? 250 
      : subscription?.plan_type === "builder" 
        ? 1000 
        : 0;
  const streakBonus = 5 * 5; // e.g. 25 points
  const dynamicGivingScore = tierBasePoints + totalScorePoints + streakBonus;

  // 3. Admin fetch all claims
  useEffect(() => {
    if (user && isAdmin) {
      fetchAllClaims();
    }
  }, [user, isAdmin, fetchAllClaims]);

  // 4. Background Entry Automation
  useEffect(() => {
    if (user && isEligible && draws.length > 0 && isLoaded) {
      const activeDraws = draws.filter(d => d.status === "active");
      
      activeDraws.forEach((draw) => {
        const hasTickets = userEntries.some(e => e.draw_id === draw.id);
        
        if (!hasTickets) {
          startTransition(async () => {
            try {
              console.log(`[Auto-Registration] Registering entries for draw: ${draw.title}`);
              await registerForDraw(draw.id, dynamicGivingScore, subscription?.plan_type, subStatus);
            } catch (err) {
              console.error("[Auto-Registration] Failure:", err);
            }
          });
        }
      });
    }
  }, [user, isEligible, draws, userEntries, registerForDraw, dynamicGivingScore, subscription, subStatus, isLoaded]);

  // Claims Submit Handler
  const handleClaimSubmit = async (drawId, entryId) => {
    const url = claimUrls[entryId] || "";
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      setClaimErrors(prev => ({ ...prev, [entryId]: "A valid screenshot URL starting with http:// or https:// is required." }));
      return;
    }
    setClaimErrors(prev => ({ ...prev, [entryId]: null }));
    setClaimSuccess(prev => ({ ...prev, [entryId]: null }));
    setClaimSubmitting(prev => ({ ...prev, [entryId]: true }));
    try {
      await submitClaim(drawId, entryId, url);
      setClaimSuccess(prev => ({ ...prev, [entryId]: "Claim submitted successfully! Review pending." }));
    } catch (err) {
      setClaimErrors(prev => ({ ...prev, [entryId]: err.message || "Failed to submit claim." }));
    } finally {
      setClaimSubmitting(prev => ({ ...prev, [entryId]: false }));
    }
  };

  // Admin review claim status
  const handleReviewStatus = async (claimId, newStatus) => {
    setReviewSubmitting(prev => ({ ...prev, [claimId]: true }));
    try {
      await reviewClaim(claimId, newStatus);
      await fetchAllClaims();
    } catch (err) {
      alert(err.message || "Failed to update claim verification status.");
    } finally {
      setReviewSubmitting(prev => ({ ...prev, [claimId]: false }));
    }
  };

  // Admin complete draw status trigger
  const handleCompleteDraw = async (drawId) => {
    setCompletingDrawId(drawId);
    try {
      await completeDraw(drawId);
      if (isAdmin) {
        await fetchAllClaims();
      }
    } catch (err) {
      alert(err.message || "Failed to execute monthly draw generation.");
    } finally {
      setCompletingDrawId(null);
    }
  };

  // Loading state
  if (!isLoaded || isPending) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Auditing draw entries..." />
      </div>
    );
  }

  const activeDraw = draws.find(d => d.status === "active");
  const upcomingDraws = draws.filter(d => d.status === "upcoming");
  const completedDraws = draws.filter(d => d.status === "completed");

  // Calculate user wins
  const userWins = [];
  for (const draw of completedDraws) {
    const drawEntries = userEntries.filter(e => e.draw_id === draw.id);
    for (const entry of drawEntries) {
      const entryNumbers = entry.numbers || [];
      const winningNumbers = draw.generated_numbers || [];
      const matchCount = calculateMatches(entryNumbers, winningNumbers);
      if (matchCount >= 3) {
        const category = getPrizeCategory(matchCount);
        const matchingClaim = claims.find(c => c.entry_id === entry.id);
        userWins.push({
          draw,
          entry,
          matchCount,
          category,
          claim: matchingClaim
        });
      }
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <span className="text-[10px] uppercase tracking-widest font-bold text-accent">
            Rewards Suite
          </span>
          <h2 className="font-heading text-xl font-extrabold text-foreground mt-1 mb-1 animate-fade-in">
            Monthly Prize Draws
          </h2>
          <p className="text-xs text-muted-foreground">
            View active tickets, check eligibility, and claim rewards when your ticket numbers match.
          </p>
        </motion.div>

        {/* Global Errors */}
        {drawsError && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Synchronization Issue</AlertTitle>
              <AlertDescription>{drawsError}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* ── Draw Prerequisite Checklist & Eligibility Card ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Eligibility Badge Status Panel */}
          <Card className="lg:col-span-5 border-border bg-card/65 backdrop-blur-md flex flex-col justify-between p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Eligibility Status
                </span>
                
                {isEligible ? (
                  <Badge variant="success" className="animate-pulse">Eligible</Badge>
                ) : (
                  <Badge variant="destructive">Not Eligible</Badge>
                )}
              </div>

              <div className="flex items-start gap-4">
                {isEligible ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                    <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    {isEligible ? "Verification Approved" : "Verification Pending"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                    {isEligible 
                      ? "Outstanding! You meet all guidelines. Your entries have been automatically generated and logged."
                      : "Prerequisites not met. Active draws require an active tier, at least 1 round registered, and allocations set."
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Score information */}
            <div className="border-t border-border/40 pt-4 mt-4 flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-accent" />
                Current Giving Score:
              </span>
              <strong className="text-foreground">{dynamicGivingScore} pts</strong>
            </div>
          </Card>

          {/* Verification Checklist */}
          <Card className="lg:col-span-7 border-border bg-card p-6">
            <h4 className="font-heading text-xs uppercase font-bold tracking-widest text-muted-foreground mb-4">
              Verification Checklist
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Requirement 1: Active Subscription */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                hasActivePlan ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-secondary/5"
              }`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-foreground">Eco Tier</span>
                    {hasActivePlan ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                    {hasActivePlan 
                      ? "Active Member" 
                      : "Subscription inactive. Members get entries."
                    }
                  </p>
                </div>
                {!hasActivePlan && (
                  <Button asChild variant="accent" size="xs" className="w-full">
                    <Link href="/dashboard/subscription">Activate Tier</Link>
                  </Button>
                )}
              </div>

              {/* Requirement 2: Logged Scores */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                scores.length > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-secondary/5"
              }`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-foreground">Log Rounds</span>
                    {scores.length > 0 ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                    {scores.length > 0 
                      ? `${scores.length} / 5 Logged` 
                      : "Register at least one golf score."
                    }
                  </p>
                </div>
                {scores.length === 0 && (
                  <Button asChild variant="accent" size="xs" className="w-full">
                    <Link href="/dashboard/scores">Register Score</Link>
                  </Button>
                )}
              </div>

              {/* Requirement 3: Selected Charity */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                allocations.length > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-secondary/5"
              }`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-foreground">Set Charity</span>
                    {allocations.length > 0 ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                    {allocations.length > 0 
                      ? `${allocations.length} Selected` 
                      : "Direct your contribution split."
                    }
                  </p>
                </div>
                {allocations.length === 0 && (
                  <Button asChild variant="accent" size="xs" className="w-full">
                    <Link href="/dashboard/charity">Set Allocations</Link>
                  </Button>
                )}
              </div>

            </div>
          </Card>
        </motion.div>

        {/* ── Main Layout Widgets Grid ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Content Column (Left) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Widget 1: Current Draw Widget */}
            <Card className="border-accent/25 relative overflow-hidden bg-card/45 backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
              <CardHeader className="pb-4 border-b border-border/30">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-accent block leading-none mb-1.5">
                      Current Draw Month
                    </span>
                    <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-accent" />
                      {activeDraw ? activeDraw.title : "Eco Prize Bracket"}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      {activeDraw ? activeDraw.prize : "Draws reset on the 1st of every month."}
                    </CardDescription>
                  </div>
                  <Badge variant={activeDraw ? "accent" : "outline"} className="uppercase">
                    {activeDraw ? `Status: ${activeDraw.status}` : "Closed"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {activeDraw ? (
                  <>
                    {/* Draw Information Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="p-3 bg-secondary/10 border border-border/30 rounded-xl">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground block">Month</span>
                        <span className="text-xs font-bold text-foreground">
                          {new Date(activeDraw.draw_date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="p-3 bg-secondary/10 border border-border/30 rounded-xl">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground block">Min Score Required</span>
                        <span className="text-xs font-bold text-foreground">{activeDraw.min_score} pts</span>
                      </div>
                      <div className="p-3 bg-secondary/10 border border-border/30 rounded-xl">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground block">Sponsor</span>
                        <span className="text-xs font-bold text-foreground line-clamp-1">{activeDraw.sponsor}</span>
                      </div>
                    </div>

                    {/* Entry Status & Ticket Details */}
                    <div>
                      <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        Your Ticket Entries Status
                      </h4>

                      {!isEligible ? (
                        <div className="bg-destructive/5 p-3 rounded-xl border border-destructive/10 flex gap-2 text-[11px] text-muted-foreground leading-relaxed">
                          <Lock className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <strong>Entries Locked:</strong> Complete the checklist prerequisites above to automatically allocate entries.
                          </div>
                        </div>
                      ) : dynamicGivingScore < activeDraw.min_score ? (
                        <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 flex gap-2 text-[11px] text-muted-foreground leading-relaxed">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong>Threshold Pending:</strong> This draw requires a Giving Score of {activeDraw.min_score} pts. Increase your score to unlock.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-muted-foreground">Allocation status:</span>
                            <Badge variant="success" className="font-bold">Entered</Badge>
                          </div>
                          
                          {/* Ticket details with individual lottery numbers */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {userEntries.filter(e => e.draw_id === activeDraw.id).map((entry, idx) => (
                              <div key={entry.id} className="p-3 bg-secondary/15 rounded-xl border border-border/30 space-y-2 hover:border-accent/15 transition-all">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono text-xs font-bold text-accent">{entry.ticket_number}</span>
                                  <span className="text-[9px] text-muted-foreground font-semibold">Ticket #{idx+1}</span>
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                  {(entry.numbers || []).map((num, i) => (
                                    <span key={i} className="text-[10px] bg-card border border-border/60 text-foreground px-2 py-0.5 rounded-xl font-semibold font-mono">
                                      {num}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="No Active Draw Period"
                    description="The monthly draw submission phase is closed. The next draw will launch dynamically at the start of next cycle."
                    icon={Ticket}
                  />
                )}
              </CardContent>
            </Card>

            {/* Widget 2: Winner Widget */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-accent" />
                  Winner Claims Panel
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  View winning results and submit claim verifications for matching tickets.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {userWins.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border/40 rounded-xl bg-secondary/5">
                    <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-foreground/80">No Winning Entries Identified</p>
                    <p className="text-[10.5px] text-muted-foreground mt-1 leading-relaxed max-w-md mx-auto">
                      Once draws close and numbers are drawn, tickets matching 3 or more numbers qualify as winners. Your claim panels will appear here dynamically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Alert className="bg-accent/5 border-accent/25">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <AlertTitle className="text-xs font-bold text-foreground">Outstanding Achievements!</AlertTitle>
                      <AlertDescription className="text-[10.5px] text-muted-foreground mt-0.5">
                        You have {userWins.length} winning tickets that qualify for rewards. Upload your screenshot receipt to confirm payout.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      {userWins.map(({ draw, entry, matchCount, category, claim }) => (
                        <div key={entry.id} className="p-5 border border-accent/20 bg-secondary/5 rounded-xl space-y-4 hover:border-accent/35 transition-all">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-border/30">
                            <div>
                              <Badge variant="accent" className="mb-1">{category}</Badge>
                              <h4 className="text-xs font-bold text-foreground mt-0.5">{draw.title}</h4>
                            </div>
                            <div className="text-left sm:text-right text-[10px] text-muted-foreground">
                              Ticket: <span className="font-mono font-bold text-foreground">{entry.ticket_number}</span>
                            </div>
                          </div>

                          {/* Math Comparison Visual */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-card p-3 rounded-xl border border-border/40">
                            <div>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Your Numbers</span>
                              <div className="flex gap-1 flex-wrap">
                                {(entry.numbers || []).map((num, i) => {
                                  const isMatch = (draw.generated_numbers || []).includes(num);
                                  return (
                                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-xl font-bold font-mono border ${
                                      isMatch 
                                        ? "bg-accent/15 border-accent/40 text-accent" 
                                        : "bg-secondary border-border/60 text-muted-foreground"
                                    }`}>
                                      {num}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Winning Numbers</span>
                              <div className="flex gap-1 flex-wrap">
                                {(draw.generated_numbers || []).map((num, i) => (
                                  <span key={i} className="text-[10px] bg-secondary border border-border/60 text-foreground px-1.5 py-0.5 rounded-xl font-bold font-mono">
                                    {num}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Claim submission / status UI */}
                          <div className="pt-2">
                            {!claim ? (
                              <div className="space-y-3">
                                <span className="text-[10.5px] font-bold text-foreground block">
                                  Submit Screenshot Verification Link to Claim:
                                </span>
                                <div className="flex flex-col sm:flex-row gap-2.5">
                                  <Input
                                    value={claimUrls[entry.id] || ""}
                                    onChange={(e) => setClaimUrls(prev => ({ ...prev, [entry.id]: e.target.value }))}
                                    placeholder="Paste public image link (e.g. https://imgur.com/ticket.png)"
                                    className="h-9 text-xs"
                                    disabled={claimSubmitting[entry.id]}
                                  />
                                  <Button 
                                    onClick={() => handleClaimSubmit(draw.id, entry.id)}
                                    disabled={claimSubmitting[entry.id]}
                                    variant="accent"
                                    size="sm"
                                    className="h-9 font-bold uppercase tracking-wider text-[10px] shrink-0"
                                  >
                                    {claimSubmitting[entry.id] ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                        Submitting...
                                      </>
                                    ) : "Claim Prize"}
                                  </Button>
                                </div>
                                {claimErrors[entry.id] && (
                                  <p className="text-[10.5px] text-destructive font-medium">{claimErrors[entry.id]}</p>
                                )}
                                {claimSuccess[entry.id] && (
                                  <p className="text-[10.5px] text-emerald-500 font-medium">{claimSuccess[entry.id]}</p>
                                )}
                              </div>
                            ) : (
                              <div className="p-3 bg-secondary/15 rounded-xl border border-border/30 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-muted-foreground">Claim ID:</span>
                                    <span className="font-mono text-[10px] text-foreground font-bold">{claim.id}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span>Submitted: {new Date(claim.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span>·</span>
                                    <a href={claim.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-0.5">
                                      Receipt <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground font-semibold">Prize status:</span>
                                  {claim.status === "pending" && (
                                    <Badge variant="warning">Verification Pending</Badge>
                                  )}
                                  {claim.status === "approved" && (
                                    <Badge variant="success">Approved</Badge>
                                  )}
                                  {claim.status === "paid" && (
                                    <Badge variant="accent">Paid (Disbursed)</Badge>
                                  )}
                                  {claim.status === "rejected" && (
                                    <Badge variant="destructive">Rejected</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar Columns (Right) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Widget 3: History Widget */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Past Draws History
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Archive of completed draws and past outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                {completedDraws.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No draws have completed on the platform yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedDraws.map((draw) => {
                      const drawEntries = userEntries.filter(e => e.draw_id === draw.id);
                      const hasEntered = drawEntries.length > 0;
                      
                      // check win status
                      let wonCategory = null;
                      for (const entry of drawEntries) {
                        const matchCount = calculateMatches(entry.numbers || [], draw.generated_numbers || []);
                        if (matchCount >= 3) {
                          wonCategory = getPrizeCategory(matchCount);
                        }
                      }

                      return (
                        <div key={draw.id} className="p-3 bg-secondary/10 border border-border/30 rounded-xl space-y-3 hover:border-accent/15 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-xs font-bold text-foreground line-clamp-1">{draw.title}</h5>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(draw.draw_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            {hasEntered ? (
                              wonCategory ? (
                                <Badge variant="success" className="text-[8px] py-0 px-1">Won {wonCategory}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[8px] py-0 px-1 text-muted-foreground">No Win</Badge>
                              )
                            ) : (
                              <span className="text-[9px] text-muted-foreground italic font-medium">No Entry</span>
                            )}
                          </div>

                          {/* Winning Lottery Circles */}
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase shrink-0">Winning:</span>
                            <div className="flex gap-1">
                              {(draw.generated_numbers || []).map((num, i) => (
                                <span key={i} className="w-5 h-5 rounded-full bg-secondary border border-border/50 text-[10px] font-bold font-mono flex items-center justify-center text-foreground">
                                  {num}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Widget 4: Upcoming Draws Panel */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  Upcoming Prize Brackets
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {upcomingDraws.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    No upcoming draws scheduled. Check back later.
                  </div>
                ) : (
                  upcomingDraws.map((draw) => {
                    const meetsScore = dynamicGivingScore >= draw.min_score;
                    return (
                      <div key={draw.id} className="text-xs space-y-1.5 pb-3 border-b border-border/30 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="font-bold text-foreground line-clamp-1">{draw.title}</h5>
                          <Badge variant="outline" className="text-[8px] capitalize">upcoming</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{draw.prize}</p>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-0.5">
                          <span>Min Score: {draw.min_score} pts</span>
                          {meetsScore ? (
                            <span className="text-emerald-500 font-semibold flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /> Qualified</span>
                          ) : (
                            <span className="text-amber-500 font-semibold flex items-center gap-0.5"><Lock className="w-3 h-3" /> Needs +{draw.min_score - dynamicGivingScore} pts</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

          </div>

        </motion.div>

        {/* ── Togglable Administrative Console Card (For testing claim reviews and completes) ── */}
        {isAdmin && (
          <motion.div variants={itemVariants} className="pt-8">
            <Card className="border-dashed border-accent/40 bg-accent/5 overflow-hidden">
              <CardHeader className="bg-accent/10 border-b border-accent/20 py-4 px-6 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-extrabold text-accent flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 animate-pulse" />
                    Admin Simulation Dashboard
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/90 mt-0.5">
                    Trigger draw completions and review winner claim verification states locally.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="accent">Admin Profile Mode</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Left sub-column: Active Draws Control */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      1. Draw Status Generator
                    </h4>
                    <div className="space-y-2.5">
                      {draws.filter(d => d.status !== "completed").map((draw) => (
                        <div key={draw.id} className="p-3 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-4 text-xs">
                          <div>
                            <span className="font-semibold text-foreground block">{draw.title}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">Status: {draw.status} · Month: {draw.month}/{draw.year}</span>
                          </div>
                          <Button 
                            onClick={() => handleCompleteDraw(draw.id)}
                            disabled={completingDrawId === draw.id}
                            variant="accent"
                            size="xs"
                            className="font-bold uppercase tracking-wider text-[9px] h-7"
                          >
                            {completingDrawId === draw.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                Processing...
                              </>
                            ) : "Complete & Draw"}
                          </Button>
                        </div>
                      ))}
                      {draws.filter(d => d.status !== "completed").length === 0 && (
                        <p className="text-[11px] text-muted-foreground italic">No active or upcoming draws remaining to complete.</p>
                      )}
                    </div>
                  </div>

                  {/* Right sub-column: Submitted Claims Review List */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-accent" />
                      2. Submitted Winner Claims ({claims.length})
                    </h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {claims.map((claim) => {
                        const matchingDraw = draws.find(d => d.id === claim.draw_id);
                        return (
                          <div key={claim.id} className="p-4 bg-card border border-border/80 rounded-xl space-y-3 text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-bold text-foreground block">{matchingDraw ? matchingDraw.title : "Draw Claim"}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">ID: {claim.id}</span>
                              </div>
                              {claim.status === "pending" && <Badge variant="warning">Pending</Badge>}
                              {claim.status === "approved" && <Badge variant="success">Approved</Badge>}
                              {claim.status === "paid" && <Badge variant="accent">Paid</Badge>}
                              {claim.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                            </div>

                            <div className="text-[10px] text-muted-foreground space-y-1">
                              <div>Category: <strong className="text-foreground">{claim.prize_category}</strong> (Matches: {claim.match_count})</div>
                              <div>Screenshot: <a href={claim.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">{claim.screenshot_url} <ExternalLink className="w-2.5 h-2.5" /></a></div>
                            </div>

                            {claim.status === "pending" && (
                              <div className="flex gap-2 pt-1.5 border-t border-border/40">
                                <Button 
                                  onClick={() => handleReviewStatus(claim.id, "approved")}
                                  disabled={reviewSubmitting[claim.id]}
                                  variant="default"
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-6 text-[9px] font-bold uppercase tracking-wider flex-1"
                                >
                                  Approve
                                </Button>
                                <Button 
                                  onClick={() => handleReviewStatus(claim.id, "rejected")}
                                  disabled={reviewSubmitting[claim.id]}
                                  variant="destructive" 
                                  size="xs"
                                  className="h-6 text-[9px] font-bold uppercase tracking-wider flex-1"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}

                            {claim.status === "approved" && (
                              <div className="pt-1.5 border-t border-border/40">
                                <Button 
                                  onClick={() => handleReviewStatus(claim.id, "paid")}
                                  disabled={reviewSubmitting[claim.id]}
                                  variant="goldOutline" 
                                  size="xs"
                                  className="h-6 text-[9px] font-bold uppercase tracking-wider w-full"
                                >
                                  Mark Payout Disbursed (Paid)
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {claims.length === 0 && (
                        <p className="text-[11px] text-muted-foreground italic">No submitted user claims currently pending review.</p>
                      )}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
