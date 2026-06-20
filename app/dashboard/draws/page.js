"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useSubscription } from "@/hooks/useSubscription";
import { Ticket, Trophy, Calendar, Clock, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

const ACTIVE_DRAWS = [
  {
    id: "DR-42",
    title: "Patagonia Eco-Retreat",
    prize: "7-night luxury eco-retreat for 2",
    drawDate: "Jun 24, 2026",
    minScore: 50,
    entriesCount: 412,
    myTickets: ["FND-884-29A", "FND-884-29B", "FND-884-29C"],
    status: "Active",
    sponsor: "Apex Corp Sustainability Fund",
  },
];

const UPCOMING_DRAWS = [
  {
    id: "DR-43",
    title: "Custom Electric Cruiser",
    prize: "Limited-edition electric bicycle",
    drawDate: "Jul 1, 2026",
    minScore: 120,
    status: "Pending Init",
    sponsor: "GreenRide Initiative",
  },
  {
    id: "DR-44",
    title: "STEM Fellowship Retreat",
    prize: "3-day tech innovation summit pass",
    drawDate: "Jul 15, 2026",
    minScore: 200,
    status: "Pending Init",
    sponsor: "Empower Global Edu",
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

export default function DrawsPage() {
  const { status } = useSubscription();
  const hasActivePlan = status === "active" || status === "cancelled";

  return (
    <div className="p-6 md:p-8 space-y-10">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
      >
        <motion.div variants={itemVariants}>
          <span className="text-[10px] uppercase tracking-widest font-bold text-accent">
            Reward Draws
          </span>
          <h2 className="font-heading text-lg font-extrabold text-foreground mt-1 mb-1">
            Your draw tickets & prizes
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            Tickets are automatically allocated based on your Giving Score. Higher tiers earn more entries per draw.
          </p>
        </motion.div>

        {/* How it works strip */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { step: "01", label: "Subscribe", desc: "Any tier activates draw eligibility" },
              { step: "02", label: "Score Points", desc: "More points → more tickets" },
              { step: "03", label: "Win Prizes", desc: "Prizes drawn via verified protocol" },
            ].map((s, i) => (
              <div key={i} className="border-t border-border pt-4">
                <span className="text-accent font-heading font-extrabold text-xs">{s.step}</span>
                <p className="font-bold text-xs text-foreground mt-1">{s.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Active Draws ── */}
        <motion.div variants={itemVariants}>
          <h3 className="font-heading font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Active Draws
          </h3>

          {hasActivePlan ? (
            <div className="space-y-4">
              {ACTIVE_DRAWS.map((draw) => (
                <Card key={draw.id} className="p-6 border-accent/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="accent">{draw.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">Sponsored by {draw.sponsor}</span>
                      </div>
                      <h4 className="font-heading font-bold text-base text-foreground">{draw.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{draw.prize}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" />
                        {draw.drawDate}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Trophy className="w-3 h-3 text-accent" />
                        {draw.entriesCount} total entrants
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/30 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      Your tickets ({draw.myTickets.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {draw.myTickets.map((t) => (
                        <span key={t} className="font-mono text-[11px] bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-sm font-bold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Active Draw Tickets"
              description="Activate a subscription to receive automatic draw entries. Every month you contribute earns you tickets based on your giving tier."
              icon={Ticket}
              action={
                <Button asChild variant="accent" size="sm">
                  <Link href="/dashboard/subscription">
                    Activate Subscription <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              }
            />
          )}
        </motion.div>

        {/* ── Upcoming Draws ── */}
        <motion.div variants={itemVariants}>
          <h3 className="font-heading font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Upcoming Draws
          </h3>
          <div className="space-y-3">
            {UPCOMING_DRAWS.map((draw) => (
              <Card key={draw.id} className="p-5 opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{draw.status}</Badge>
                    </div>
                    <h4 className="font-heading font-bold text-sm text-foreground">{draw.title}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {draw.prize} · Min score: {draw.minScore} pts
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {draw.drawDate}
                    </div>
                    {!hasActivePlan && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mt-1">
                        <Lock className="w-3 h-3" /> Requires subscription
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
