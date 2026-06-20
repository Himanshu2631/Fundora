"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Flame, TrendingUp, Star, ArrowRight, Lock } from "lucide-react";

const SCORE_MILESTONES = [
  { pts: 50, label: "Entry Level", desc: "Qualify for standard reward draws.", unlocked: true },
  { pts: 150, label: "Silver Tier", desc: "Unlock priority draw queue access.", unlocked: true },
  { pts: 300, label: "Gold Tier", desc: "Access exclusive corporate-sponsored draws.", unlocked: false },
  { pts: 600, label: "Platinum Tier", desc: "Gain direct NGO briefing invite access.", unlocked: false },
];

export default function ScoresPage() {
  const { user, profile } = useAuth();
  const { status } = useSubscription();
  const score = 145;
  const streak = 5;
  const rank = 284;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 14 }}
      >
        <span className="text-[10px] uppercase tracking-widest font-bold text-accent">
          Score Centre
        </span>
        <h2 className="font-heading text-lg font-extrabold text-foreground mt-1">
          Your Giving Score & Rank
        </h2>
      </motion.div>

      {/* Score summary row */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 80, damping: 14 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { label: "Current Score", value: `${score} pts`, icon: Trophy, accent: true },
          { label: "Active Streak", value: `${streak} weeks`, icon: Flame, accent: false },
          { label: "Global Rank", value: `#${rank}`, icon: TrendingUp, accent: false },
        ].map((stat, i) => (
          <Card key={i} className="p-6 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${stat.accent ? "bg-accent/10 border border-accent/20" : "bg-secondary/30 border border-border"}`}>
              <stat.icon className={`w-5 h-5 ${stat.accent ? "text-accent" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{stat.label}</p>
              <p className={`font-heading text-2xl font-extrabold ${stat.accent ? "text-accent" : "text-foreground"}`}>{stat.value}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Score progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 80, damping: 14 }}
      >
        <Card className="p-6">
          <div className="flex justify-between items-center mb-3 text-xs">
            <span className="font-bold text-foreground">Progress to Gold Tier (300 pts)</span>
            <span className="text-accent font-bold">{score} / 300</span>
          </div>
          <div className="w-full h-2 bg-border/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((score / 300) * 100, 100)}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              className="h-full bg-accent rounded-full"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {300 - score} more points needed · Keep your streak active to earn bonus multipliers
          </p>
        </Card>
      </motion.div>

      {/* Milestones */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 80, damping: 14 }}
      >
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-secondary/5">
            <h3 className="font-heading font-bold text-sm text-foreground">Score Milestones</h3>
          </div>
          <div className="divide-y divide-border/30">
            {SCORE_MILESTONES.map((m, i) => (
              <div key={i} className={`flex items-center gap-4 px-6 py-4 ${!m.unlocked ? "opacity-50" : ""}`}>
                <div className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 ${m.unlocked ? "bg-accent/10 border border-accent/20" : "bg-secondary/30 border border-border"}`}>
                  {m.unlocked ? (
                    <Star className="w-4 h-4 text-accent" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-foreground">{m.label}</span>
                    <Badge variant={m.unlocked ? "success" : "outline"} className="text-[8px]">
                      {m.pts} pts
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </div>
                {m.unlocked && <Badge variant="accent">Unlocked</Badge>}
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Score history placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <EmptyState
          title="Score History Coming Soon"
          description="Monthly score breakdowns, streak graphs, and peer comparison charts will be available in a future update."
          icon={TrendingUp}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Back to Overview</Link>
            </Button>
          }
        />
      </motion.div>
    </div>
  );
}
