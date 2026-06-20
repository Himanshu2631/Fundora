"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
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
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
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
} from "lucide-react";

const PLAN_PRICES = { scout: 10, advocate: 25, builder: 100 };
const PLAN_LABELS = { scout: "Eco Scout", advocate: "Global Advocate", builder: "Legacy Builder" };

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function DashboardOverview() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user: authUser, profile } = useAuth();
  const { subscription, status } = useSubscription();

  const monthlyContribution = PLAN_PRICES[subscription?.plan_type] ?? 0;
  const hasActivePlan = status === "active" || status === "cancelled";

  const displayUser = {
    name: profile?.full_name || authUser?.email?.split("@")[0] || "Member",
    email: authUser?.email || "—",
    tier: hasActivePlan
      ? PLAN_LABELS[subscription?.plan_type] || "Member"
      : "No Active Plan",
    joinedDate: authUser?.created_at
      ? `Joined ${new Date(authUser.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
      : "Joined Jun 2026",
    score: 145,
    streak: 5,
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

  const currentDrawEntries = [
    { ticketNumber: "FND-884-29A", drawName: "Patagonia Eco-Retreat", date: "Jun 24, 2026", status: "Active" },
    { ticketNumber: "FND-884-29B", drawName: "Patagonia Eco-Retreat", date: "Jun 24, 2026", status: "Active" },
    { ticketNumber: "FND-884-29C", drawName: "Patagonia Eco-Retreat", date: "Jun 24, 2026", status: "Active" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* ── Welcome Banner ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h2 className="font-heading text-2xl font-extrabold text-foreground">
              Welcome back, {displayUser.name.split(" ")[0]}.
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {displayUser.joinedDate} · {displayUser.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Score pill */}
            <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-sm">
              <Trophy className="w-3.5 h-3.5 text-accent" />
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                  Score
                </span>
                <span className="text-sm font-bold text-foreground">{displayUser.score} pts</span>
              </div>
            </div>
            {/* Streak pill */}
            <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-sm">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                  Streak
                </span>
                <span className="text-sm font-bold text-foreground">{displayUser.streak}wk</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Quick Stats Row ── */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            {
              label: "Giving Rank",
              value: displayUser.rank,
              sub: "Global leaderboard",
              icon: TrendingUp,
              accent: false,
            },
            {
              label: "Monthly Contribution",
              value: hasActivePlan ? `$${displayUser.monthlyContribution}` : "—",
              sub: hasActivePlan ? displayUser.tier : "No active plan",
              icon: ShieldCheck,
              accent: true,
            },
            {
              label: "Active Draw Tickets",
              value: hasActivePlan ? "3" : "0",
              sub: "Patagonia Eco-Retreat",
              icon: Ticket,
              accent: false,
            },
            {
              label: "Giving Score",
              value: `${displayUser.score} pts`,
              sub: `+${displayUser.streak * 5} streak bonus`,
              icon: Trophy,
              accent: false,
            },
          ].map((stat, i) => (
            <Card key={i} className="p-5 hover:border-accent/30 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </span>
                <stat.icon
                  className={`w-4 h-4 shrink-0 ${stat.accent ? "text-accent" : "text-muted-foreground/50"}`}
                />
              </div>
              <p className={`font-heading text-2xl font-extrabold ${stat.accent ? "text-accent" : "text-foreground"}`}>
                {stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{stat.sub}</p>
            </Card>
          ))}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Main Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Subscription Widget */}
                <SubscriptionWidget />

                {/* Real-World Outcomes */}
                <Card className="p-6">
                  <h3 className="font-heading font-bold text-base text-foreground mb-6">
                    Real-World Outcomes
                  </h3>
                  <ul className="space-y-4 text-xs">
                    {[
                      { label: "Reforestation contribution:", value: "1.2 hectares protected" },
                      { label: "Clean water filtration:", value: "240 L daily capacity funded" },
                      { label: "STEM education credits:", value: "4.5 module hrs sponsored" },
                    ].map((row, i) => (
                      <li key={i} className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground font-semibold">{row.label}</span>
                        <span className="text-foreground font-bold text-right">{row.value}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="h-[1px] bg-border/40 my-4" />
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                    Receipt log verified on-chain and cross-audited by Apex Third Party Auditors.
                  </p>
                </Card>
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
              {hasActivePlan ? (
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
                              <Badge variant="accent" className="mb-1.5">{ticket.status}</Badge>
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
                  description="Activate a subscription to automatically receive draw entries and compete for exclusive eco-retreat prizes."
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
          )}
        </div>

        {/* Right Column — Sidebar Widgets */}
        <div className="lg:col-span-4 space-y-6">
          {/* Score Leaderboard */}
          <Card className="p-6">
            <h3 className="font-heading font-bold text-sm text-foreground mb-6 flex justify-between items-center">
              <span>Score Leaderboard</span>
              <span className="text-xs font-normal text-muted-foreground">
                Your rank: {displayUser.rank}
              </span>
            </h3>
            <div className="space-y-2">
              {[
                { rank: "1", name: "marcus.k", points: "490 pts", isYou: false },
                { rank: "2", name: "elena_r", points: "420 pts", isYou: false },
                { rank: "3", name: "yuki.s", points: "380 pts", isYou: false },
                { rank: "284", name: `${displayUser.name.split(" ")[0]} (You)`, points: `${displayUser.score} pts`, isYou: true },
              ].map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between text-xs py-2 px-3 rounded-sm ${
                    entry.isYou
                      ? "bg-accent/10 border border-accent/30 text-foreground"
                      : "border border-transparent text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 font-bold ${entry.isYou ? "text-accent" : "text-muted-foreground/60"}`}>
                      #{entry.rank}
                    </span>
                    <span className={`font-semibold ${entry.isYou ? "text-foreground" : "text-muted-foreground"}`}>
                      {entry.name}
                    </span>
                  </div>
                  <span className="font-bold text-foreground">{entry.points}</span>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="w-full mt-5 h-9 text-xs font-bold uppercase tracking-wider">
              <Link href="/dashboard/scores">View My Score Details</Link>
            </Button>
          </Card>

          {/* Verified Badge */}
          <Card className="p-6 text-center">
            <ShieldCheck className="w-10 h-10 text-accent mx-auto mb-4" />
            <h4 className="font-heading font-bold text-sm text-foreground mb-2">
              Audited Philanthropist
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
              All transactions have matching on-chain cryptographic receipts and verified NGO intake signatures.
            </p>
            <span className="text-[10px] text-accent font-mono tracking-wider font-semibold">
              SIGNATURE: 0x8F9A...B8C3
            </span>
          </Card>

          {/* Quick Links */}
          <Card className="p-5">
            <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Quick Actions
            </h4>
            <div className="space-y-2">
              {[
                { label: "Manage Subscription", href: "/dashboard/subscription", icon: ArrowRight },
                { label: "View Active Draws", href: "/dashboard/draws", icon: ArrowRight },
                { label: "Browse Charities", href: "/dashboard/charity", icon: ArrowRight },
                { label: "Account Settings", href: "/dashboard/settings", icon: ArrowRight },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-2 border-b border-border/30 last:border-0 group transition-colors"
                >
                  {link.label}
                  <link.icon className="w-3.5 h-3.5 group-hover:text-accent transition-colors" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
