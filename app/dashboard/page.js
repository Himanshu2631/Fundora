"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionWidget from "@/features/subscriptions/SubscriptionWidget";
import { 
  Trophy, Flame, User, ExternalLink, ShieldCheck, Check, Sparkles, Inbox 
} from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isSimulatingLoading, setIsSimulatingLoading] = useState(false);
  const [isSimulatingEmpty, setIsSimulatingEmpty] = useState(false);
  const { user: authUser, profile, loading: authLoading } = useAuth();
  const { subscription, status } = useSubscription();

  const plans = {
    scout: "Eco Scout",
    advocate: "Global Advocate",
    builder: "Legacy Builder",
  };

  const currentTier = profile?.role === "admin" 
    ? "Platform Admin" 
    : (status === "active" || status === "cancelled")
      ? plans[subscription?.plan_type] || "Member"
      : "No Active Plan";

  const monthlyContribution = (status === "active" || status === "cancelled")
    ? subscription?.plan_type === "scout" ? 10 : subscription?.plan_type === "advocate" ? 25 : 100
    : 0;

  // Simulated metrics combined with real user profile details
  const displayUser = {
    name: profile?.full_name || authUser?.email?.split("@")[0] || "Member",
    email: authUser?.email || "user@example.com",
    tier: currentTier,
    joinedDate: authUser?.created_at 
      ? `Joined ${new Date(authUser.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
      : "Joined Jan 2026",
    score: 145,
    streak: 5,
    rank: "#284",
    monthlyContribution: monthlyContribution,
    totalContributed: (status === "active" || status === "cancelled") ? monthlyContribution : 0
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

  const handleTriggerLoading = () => {
    setIsSimulatingLoading(true);
    setTimeout(() => {
      setIsSimulatingLoading(false);
    }, 2000);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20">
          <LoadingState message="Loading dashboard session..." />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Diagnostic Console Bar */}
          <div className="mb-6 p-4 bg-secondary/20 border border-border/80 rounded-sm flex flex-wrap gap-4 items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Design System Diagnostics
            </span>
            <div className="flex gap-3">
              <Button 
                onClick={handleTriggerLoading} 
                variant="goldOutline" 
                size="xs" 
                className="text-[10px] uppercase font-bold"
              >
                Simulate Loading (2s)
              </Button>
              <Button 
                onClick={() => setIsSimulatingEmpty(!isSimulatingEmpty)} 
                variant={isSimulatingEmpty ? "default" : "outline"} 
                size="xs" 
                className="text-[10px] uppercase font-bold"
              >
                {isSimulatingEmpty ? "Show Data" : "Simulate Empty State"}
              </Button>
            </div>
          </div>

          {/* Header Banner */}
          <Card className="p-8 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-2xl font-bold text-foreground">{displayUser.name}</h1>
                  <Badge variant="accent">
                    {displayUser.tier}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{displayUser.joinedDate} &bull; {displayUser.email}</p>
              </div>
            </div>

            {/* Streak & Score pill */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-sm">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500/10" />
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">Giving Streak</span>
                  <span className="text-sm font-bold text-foreground">{displayUser.streak} Weeks</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-sm">
                <Trophy className="w-4 h-4 text-accent" />
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">Giving Score</span>
                  <span className="text-sm font-bold text-foreground">{displayUser.score} pts</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Loading Simulation Panel */}
          {isSimulatingLoading ? (
            <Card className="py-20">
              <LoadingState message="Connecting to secure giving gateway..." />
            </Card>
          ) : isSimulatingEmpty ? (
            <Card className="py-16 px-6">
              <EmptyState 
                title="No Giving History Logged" 
                description="Initiate your first contribution subscription to begin recording audited receipts, calculating scores, and earning draw tickets."
                icon={Inbox}
                action={
                  <Button variant="accent" size="sm">
                    Activate Subscription
                  </Button>
                }
              />
            </Card>
          ) : (
            /* Grid Layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left/Main Column (8 spans) */}
              <div className="lg:col-span-8 space-y-8">
                {/* Tab Navigation */}
                <div className="flex border-b border-border gap-6 text-sm">
                  {["overview", "receipts", "draw-tickets"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-3 capitalize font-bold text-xs uppercase tracking-wider relative ${
                        activeTab === tab ? "text-accent" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.replace("-", " ")}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="activeTabUnderline"
                          className="absolute bottom-0 left-0 w-full h-[2px] bg-accent"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-8"
                  >
                    {/* Two Column Offset */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Subscription Specs */}
                      <SubscriptionWidget />

                      {/* Impact Breakdown */}
                      <Card className="p-6">
                        <h3 className="font-heading font-bold text-lg text-foreground mb-6">Real-World Outcomes</h3>
                        <ul className="space-y-4 text-xs">
                          <li className="flex justify-between items-start gap-4">
                            <span className="text-muted-foreground font-semibold">Reforestation contribution:</span>
                            <span className="text-foreground font-bold text-right">1.2 hectares protected</span>
                          </li>
                          <li className="flex justify-between items-start gap-4">
                            <span className="text-muted-foreground font-semibold">Clean water filtration:</span>
                            <span className="text-foreground font-bold text-right">240 liters daily capacity funded</span>
                          </li>
                          <li className="flex justify-between items-start gap-4">
                            <span className="text-muted-foreground font-semibold">STEM education credits:</span>
                            <span className="text-foreground font-bold text-right">4.5 module hours sponsored</span>
                          </li>
                        </ul>
                        <div className="h-[1px] bg-border/40 my-4" />
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                          Receipt log verified on-chain and cross-audited by Apex Third Party Auditors.
                        </p>
                      </Card>
                    </div>

                    {/* Quick Receipts list using Design System Table components */}
                    <Card className="overflow-hidden">
                      <CardHeader className="flex flex-row justify-between items-center bg-secondary/5 py-4 px-6 border-b border-border/60">
                        <CardTitle className="text-sm">Recent Giving Audit Trail</CardTitle>
                        <Button variant="link" size="sm" onClick={() => setActiveTab("receipts")} className="text-xs uppercase font-bold tracking-wider">
                          View All
                        </Button>
                      </CardHeader>
                      <Table>
                        <TableBody>
                          {receipts.slice(0, 3).map((txn) => (
                            <TableRow key={txn.id}>
                              <TableCell className="font-semibold py-4">
                                <span className="block text-foreground text-sm font-bold">{txn.charity}</span>
                                <span className="text-muted-foreground text-[10px] font-medium">{txn.date} &bull; {txn.id}</span>
                              </TableCell>
                              <TableCell className="font-bold text-sm text-right pr-6">
                                <div className="flex items-center justify-end gap-3.5">
                                  <span>{txn.amount}</span>
                                  <Badge variant="success">
                                    {txn.status}
                                  </Badge>
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-6">Transaction ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Charity Cause</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Audit Status</TableHead>
                            <TableHead className="text-right pr-6">Receipt File</TableHead>
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

                {/* TICKETS TAB */}
                {activeTab === "draw-tickets" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <Card className="p-6 bg-secondary/5">
                      <h3 className="font-heading font-bold text-sm text-foreground mb-2">How Draw Eligibility Works</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Every dollar you subscribe awards you points towards your Philanthropy Score. When draws are initialized, tickets are automatically distributed based on score requirements. Keep your streak active to gain multiplier bonuses.
                      </p>
                    </Card>

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
                                <span className="text-muted-foreground text-[10px] font-semibold">For draw: {ticket.drawName}</span>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="inline-flex flex-col items-end">
                                  <Badge variant="accent" className="mb-1.5">
                                    {ticket.status}
                                  </Badge>
                                  <span className="text-muted-foreground text-[10px]">Draw schedule: {ticket.date}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Right Column - Sidebar Widgets (4 spans) */}
              <div className="lg:col-span-4 space-y-8">
                {/* Score leaderboard widget */}
                <Card className="p-6">
                  <h3 className="font-heading font-bold text-sm text-foreground mb-6 flex justify-between items-center">
                    <span>Score Leaderboard</span>
                    <span className="text-xs font-normal text-muted-foreground">Your rank: {displayUser.rank}</span>
                  </h3>
                  <div className="space-y-4">
                    {[
                      { rank: "1", name: "marcus.k", points: "490 pts", active: false },
                      { rank: "2", name: "elena_r", points: "420 pts", active: false },
                      { rank: "3", name: "yuki.s", points: "380 pts", active: false },
                      { rank: "284", name: `${displayUser.name} (You)`, points: "145 pts", active: true },
                    ].map((leader, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between text-xs py-2 px-3 rounded-sm ${
                          leader.active ? "bg-accent/10 border border-accent/30 text-foreground" : "border border-transparent text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-5 font-bold ${leader.active ? "text-accent" : "text-muted-foreground/60"}`}>
                            #{leader.rank}
                          </span>
                          <span className={`font-semibold ${leader.active ? "text-foreground" : "text-muted-foreground"}`}>
                            {leader.name}
                          </span>
                        </div>
                        <span className="font-bold text-foreground">{leader.points}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-6 h-9 text-xs font-bold uppercase tracking-wider">
                    View Full Global Leaderboard
                  </Button>
                </Card>

                {/* Verified Badge */}
                <Card className="p-6 text-center">
                  <ShieldCheck className="w-10 h-10 text-accent mx-auto mb-4" />
                  <h4 className="font-heading font-bold text-sm text-foreground mb-2">Audited Philanthropist</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                    Your account status is fully audited. All transactions have matching on-chain cryptographic receipts and verified NGO intake signatures.
                  </p>
                  <span className="text-[10px] text-accent font-mono tracking-wider font-semibold">
                    SIGNATURE: 0x8F9A...B8C3
                  </span>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
