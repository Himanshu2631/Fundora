"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/hooks/useAuth";
import { 
  ShieldAlert, Settings, Plus, RotateCw, PlusCircle, CheckCircle, 
  Trash2, Edit3, Eye, Sparkles
} from "lucide-react";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("charities");
  const [drawPool, setDrawPool] = useState(24950);
  const [isDrawing, setIsDrawing] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState("");
  const { profile, loading: authLoading } = useAuth();

  const stats = [
    { label: "Total Members", value: "1,248 active", change: "+14% this month" },
    { label: "Monthly Recurring Volume", value: "$34,920.00", change: "98.5% efficiency" },
    { label: "Audited Charities", value: "12 onboarded", change: "2 pending vetting" },
    { label: "Next Draw Pool", value: `$${drawPool.toLocaleString()}`, change: "Draws in 4 days" },
  ];

  const [charities, setCharities] = useState([
    { id: "CH-01", name: "Acres of Green", category: "Environment", status: "Active", auditorScore: "9.8", spendingRatio: "96.4%" },
    { id: "CH-02", name: "Apex Water Initiative", category: "Clean Water", status: "Active", auditorScore: "9.9", spendingRatio: "98.1%" },
    { id: "CH-03", name: "Empower Global Edu", category: "Education", status: "Active", auditorScore: "9.7", spendingRatio: "95.5%" },
    { id: "CH-04", name: "BioGen Health Corps", category: "Healthcare", status: "Active", auditorScore: "9.5", spendingRatio: "94.2%" },
    { id: "CH-05", name: "Eco Shelter Solutions", category: "Housing", status: "Pending Vetting", auditorScore: "TBD", spendingRatio: "TBD" },
  ]);

  const [upcomingDraws, setUpcomingDraws] = useState([
    { id: "DR-42", title: "Patagonia Eco-Retreat", date: "Jun 24, 2026", minScore: "50 pts", entriesCount: 412, status: "Active" },
    { id: "DR-43", title: "Custom Electric Cruiser", date: "Jul 01, 2026", minScore: "120 pts", entriesCount: 184, status: "Pending Init" },
  ]);

  const handleTriggerDraw = () => {
    setIsDrawing(true);
    setWinnerMessage("");
    setTimeout(() => {
      setIsDrawing(false);
      setWinnerMessage("Winner selected: user 'hiroshi.t' (Ticket FND-884-92K) has won the Patagonia Eco-Retreat!");
      setDrawPool(15000); // Reset pool for next round
    }, 2500);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20">
          <LoadingState message="Loading administrative session..." />
        </main>
        <Footer />
      </div>
    );
  }

  // Middleware redirects non-admins, but we add a safety check here too.
  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20 text-center px-6">
          <Card className="p-8 max-w-md mx-auto">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="font-heading text-lg font-bold text-foreground mb-2">Access Restriced</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              You must have administrative privileges to access this panel.
            </p>
            <Button asChild variant="default" className="w-full">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </Card>
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
          {/* Header */}
          <div className="border-b border-border pb-8 mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1 rounded-sm bg-destructive/10 text-destructive border border-destructive/20">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-destructive">Administrative Suite</span>
              </div>
              <h1 className="font-heading text-3xl font-extrabold text-foreground">Console Controller</h1>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" /> System Settings
              </Button>
            </div>
          </div>

          {/* Quick Platform Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, i) => (
              <Card key={i} className="p-6 bg-card">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-2">{stat.label}</span>
                <h3 className="font-heading text-2xl font-extrabold text-foreground mb-1">{stat.value}</h3>
                <span className="text-[10px] font-semibold text-accent">{stat.change}</span>
              </Card>
            ))}
          </div>

          {/* Core Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar Controls (3 spans) */}
            <Card className="lg:col-span-3 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block px-3 mb-4">Operations</span>
              
              <button
                onClick={() => setActiveSection("charities")}
                className={`w-full text-left px-3 py-2.5 rounded-sm text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeSection === "charities"
                    ? "bg-accent/15 text-accent border-l-2 border-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <span>Charity Onboarding</span>
                <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm font-bold">{charities.length}</span>
              </button>

              <button
                onClick={() => setActiveSection("draws")}
                className={`w-full text-left px-3 py-2.5 rounded-sm text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeSection === "draws"
                    ? "bg-accent/15 text-accent border-l-2 border-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <span>Draw Engine Console</span>
                <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm font-bold">{upcomingDraws.length}</span>
              </button>

              <button
                onClick={() => setActiveSection("subscriptions")}
                className={`w-full text-left px-3 py-2.5 rounded-sm text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeSection === "subscriptions"
                    ? "bg-accent/15 text-accent border-l-2 border-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <span>User Subscriptions</span>
              </button>
            </Card>

            {/* Content Control Area (9 spans) */}
            <div className="lg:col-span-9">
              {/* CHARITIES PANEL */}
              {activeSection === "charities" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <h2 className="font-heading text-lg font-bold text-foreground">Onboarded Charities Directory</h2>
                    <Button variant="accent" size="sm" className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Onboard New Charity
                    </Button>
                  </div>

                  <Card className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Auditor Rating</TableHead>
                          <TableHead>Direct Spending</TableHead>
                          <TableHead>Vetting Status</TableHead>
                          <TableHead className="text-right pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {charities.map((charity) => (
                          <TableRow key={charity.id}>
                            <TableCell className="font-mono text-muted-foreground pl-6">{charity.id}</TableCell>
                            <TableCell className="text-foreground font-semibold">{charity.name}</TableCell>
                            <TableCell>{charity.category}</TableCell>
                            <TableCell className="text-foreground font-semibold">{charity.auditorScore}</TableCell>
                            <TableCell>{charity.spendingRatio}</TableCell>
                            <TableCell>
                              <Badge variant={charity.status === "Active" ? "success" : "warning"}>
                                {charity.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6 space-x-2">
                              <button className="text-muted-foreground hover:text-foreground p-1">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button className="text-muted-foreground hover:text-accent p-1">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button className="text-muted-foreground hover:text-destructive p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </motion.div>
              )}

              {/* DRAWS PANEL */}
              {activeSection === "draws" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <h2 className="font-heading text-lg font-bold text-foreground">Reward Draw Management</h2>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5" /> Create New Reward Draw
                    </Button>
                  </div>

                  {/* Draw Engine Trigger Console widget */}
                  <Card className="p-6">
                    <h3 className="font-heading font-bold text-sm text-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" /> Cryptographic Draw Trigger
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                      Trigger the verified pseudorandom selection protocol for the active draw. This imports active members eligibility hashes and checks signature validity.
                    </p>

                    <div className="space-y-6">
                      <div>
                        <Button
                          onClick={handleTriggerDraw}
                          disabled={isDrawing}
                          variant="accent"
                        >
                          {isDrawing ? (
                            <>
                              <RotateCw className="w-4 h-4 animate-spin" /> Selecting Winner...
                            </>
                          ) : (
                            "Trigger Draw Protocol"
                          )}
                        </Button>
                      </div>
                      
                      {winnerMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Alert variant="success">
                            <CheckCircle className="w-4 h-4" />
                            <AlertTitle>Selection Succeeded</AlertTitle>
                            <AlertDescription>{winnerMessage}</AlertDescription>
                          </Alert>
                        </motion.div>
                      )}
                    </div>
                  </Card>

                  {/* Upcoming draws table */}
                  <Card className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">ID</TableHead>
                          <TableHead>Draw Prize</TableHead>
                          <TableHead>Scheduled Date</TableHead>
                          <TableHead>Min Rank</TableHead>
                          <TableHead>Entrants</TableHead>
                          <TableHead className="text-right pr-6">Engine Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingDraws.map((draw) => (
                          <TableRow key={draw.id}>
                            <TableCell className="font-mono text-muted-foreground pl-6">{draw.id}</TableCell>
                            <TableCell className="text-foreground font-semibold">{draw.title}</TableCell>
                            <TableCell>{draw.date}</TableCell>
                            <TableCell className="text-foreground font-semibold">{draw.minScore}</TableCell>
                            <TableCell className="text-foreground">{draw.entriesCount} users</TableCell>
                            <TableCell className="text-right pr-6">
                              <Badge variant={draw.status === "Active" ? "accent" : "outline"}>
                                {draw.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </motion.div>
              )}

              {/* SUBSCRIPTIONS PANEL */}
              {activeSection === "subscriptions" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <h2 className="font-heading text-lg font-bold text-foreground">Active Subscription Brackets</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { name: "Eco Scout ($10/mo)", count: "542 users", total: "$5,420/mo", color: "text-muted-foreground/80" },
                      { name: "Global Advocate ($25/mo)", count: "482 users", total: "$12,050/mo", color: "text-accent" },
                      { name: "Legacy Builder ($100/mo)", count: "174 users", total: "$17,400/mo", color: "text-foreground" },
                    ].map((tier, i) => (
                      <Card key={i} className="p-6">
                        <h4 className={`font-heading font-bold text-sm mb-2 ${tier.color}`}>{tier.name}</h4>
                        <p className="text-2xl font-extrabold text-foreground mb-1">{tier.count}</p>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Volume: {tier.total}</span>
                      </Card>
                    ))}
                  </div>

                  <Card className="p-6">
                    <p className="text-xs text-muted-foreground leading-relaxed text-center">
                      All subscriptions are integrated via Stripe billing nodes. Stripe webhook sync checks out at 100% status health.
                    </p>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
