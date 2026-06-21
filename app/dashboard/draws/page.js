"use client";

import * as React from "react";
import { useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useScores } from "@/hooks/useScores";
import { useCharities } from "@/hooks/useCharities";
import { useDraws } from "@/hooks/useDraws";
import { checkEligibility } from "@/lib/drawValidation";
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
  Info
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
  const { user } = useAuth();
  
  // Day 4 Hooks integration
  const { 
    draws, 
    userEntries, 
    registerForDraw, 
    loading: drawsLoading, 
    error: drawsError 
  } = useDraws();

  const { status: subStatus, subscription } = useSubscription();
  const { scores, loading: scoresLoading } = useScores();
  const { allocations, loading: charitiesLoading } = useCharities();
  const [isPending, startTransition] = useTransition();

  const hasActivePlan = subStatus === "active" || subStatus === "cancelled";
  const isLoaded = !drawsLoading && !scoresLoading && !charitiesLoading;

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

  // 3. Background Entry Automation
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

  // Loading state
  if (!isLoaded || isPending) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Auditing draw entries..." />
      </div>
    );
  }

  const activeDraws = draws.filter(d => d.status === "active");
  const upcomingDraws = draws.filter(d => d.status === "upcoming");

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
            View active tickets and upcoming prize brackets. Entries are automatically generated based on score eligibility.
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
              <div className={`p-4 rounded-sm border flex flex-col justify-between gap-3 ${
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
              <div className={`p-4 rounded-sm border flex flex-col justify-between gap-3 ${
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
              <div className={`p-4 rounded-sm border flex flex-col justify-between gap-3 ${
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

        {/* ── Active Draws ── */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Active Draw Brackets
          </h3>

          {activeDraws.length === 0 ? (
            <EmptyState
              title="No Active Draws Currently"
              description="Check back soon! Vetted draws are initialized monthly on cycle completion."
              icon={Ticket}
            />
          ) : (
            <div className="space-y-4">
              {activeDraws.map((draw) => {
                const drawTickets = userEntries
                  .filter(e => e.draw_id === draw.id)
                  .map(e => e.ticket_number);

                const meetsScore = dynamicGivingScore >= draw.min_score;

                return (
                  <Card key={draw.id} className="p-6 border-accent/25 relative overflow-hidden bg-card/45 backdrop-blur-md">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
                    
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-4 mb-4 border-b border-border/30">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="accent">Active</Badge>
                          <span className="text-[10px] text-muted-foreground">Sponsored by {draw.sponsor || "Eco Fund"}</span>
                        </div>
                        <h4 className="font-heading font-extrabold text-base text-foreground mt-1">
                          {draw.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">{draw.prize}</p>
                      </div>

                      <div className="text-left md:text-right shrink-0 space-y-1 text-xs text-muted-foreground font-semibold">
                        <div className="flex items-center md:justify-end gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-accent" />
                          Draw Scheduled: {new Date(draw.draw_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex items-center md:justify-end gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-accent" />
                          Minimum Score: {draw.min_score} pts
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Tickets Display */}
                    {!isEligible ? (
                      <div className="bg-destructive/5 p-3 rounded-sm border border-destructive/10 flex gap-2 text-[11px] text-muted-foreground leading-relaxed">
                        <Lock className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <strong>Entries Locked:</strong> You are not currently eligible to participate in draws. Complete the checklist prerequisites above to automatically allocate your entries.
                        </div>
                      </div>
                    ) : !meetsScore ? (
                      <div className="bg-amber-500/5 p-3 rounded-sm border border-amber-500/10 flex gap-2 text-[11px] text-muted-foreground leading-relaxed">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>Score Threshold Pending:</strong> This draw requires a Giving Score of {draw.min_score} pts. Your current score is {dynamicGivingScore} pts. Record more scores or increase subscription tier to unlock.
                        </div>
                      </div>
                    ) : drawTickets.length === 0 ? (
                      <div className="flex items-center gap-2 text-accent text-xs font-semibold py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Allocating your eco-tickets in the background...
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          Your Auto-Allocated Tickets ({drawTickets.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {drawTickets.map((ticketNumber) => (
                            <span 
                              key={ticketNumber} 
                              className="font-mono text-xs bg-accent/10 border border-accent/25 text-accent px-3 py-1 rounded-sm font-bold shadow-sm"
                            >
                              {ticketNumber}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Upcoming Draws ── */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Upcoming Prizes Brackets
          </h3>

          <div className="space-y-3">
            {upcomingDraws.map((draw) => (
              <Card key={draw.id} className="p-5 opacity-75 hover:opacity-100 transition-opacity bg-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-[8px] font-bold">upcoming</Badge>
                      <span className="text-[10px] text-muted-foreground">Sponsored by {draw.sponsor}</span>
                    </div>
                    <h4 className="font-heading font-bold text-sm text-foreground mt-1">
                      {draw.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {draw.prize} · Min score: <strong className="text-foreground">{draw.min_score} pts</strong>
                    </p>
                  </div>
                  
                  <div className="text-left sm:text-right shrink-0 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center sm:justify-end gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      Date: {new Date(draw.draw_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {dynamicGivingScore < draw.min_score && (
                      <div className="flex items-center sm:justify-end gap-1 text-[10px] text-amber-500 font-semibold bg-amber-500/5 px-2 py-0.5 rounded-sm border border-amber-500/10 mt-1">
                        <Lock className="w-3 h-3" /> Needs +{draw.min_score - dynamicGivingScore} pts
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
