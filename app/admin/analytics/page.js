"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { createClient } from "@/lib/supabase";
import {
  Users,
  DollarSign,
  Heart,
  Ticket,
  Trophy,
  TrendingUp,
  CheckCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const PLAN_PRICES = { scout: 10, advocate: 25, builder: 100 };
const PLAN_LABELS = { scout: "Eco Scout", advocate: "Global Advocate", builder: "Legacy Builder" };

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    profiles: [],
    subscriptions: [],
    draws: [],
    entries: [],
    claims: [],
    charities: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const [
          { data: profiles },
          { data: subscriptions },
          { data: draws },
          { data: entries },
          { data: claims },
          { data: charities },
        ] = await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("subscriptions").select("*"),
          supabase.from("draws").select("*"),
          supabase.from("draw_entries").select("*"),
          supabase.from("winner_claims").select("*"),
          supabase.from("charities").select("*"),
        ]);
        setData({
          profiles: profiles || [],
          subscriptions: subscriptions || [],
          draws: draws || [],
          entries: entries || [],
          claims: claims || [],
          charities: charities || [],
        });
      } catch (err) {
        console.error("Error loading reports data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const metrics = useMemo(() => {
    // Total Users
    const totalUsers = data.profiles.length;

    // Active Subscriptions
    const activeSubs = data.subscriptions.filter(
      (s) => s.status === "active" || s.status === "trialing"
    );

    // Total Prize Pool (MRR from active subscriptions)
    const totalPrizePool = activeSubs.reduce((sum, s) => {
      const key = (s.plan_type || s.plan_name || "").toLowerCase();
      return sum + (PLAN_PRICES[key] || 0);
    }, 0);

    // Charity Contribution Totals
    const charityTotal = data.charities.reduce((sum, c) => {
      const raw = (c.raised || "").replace(/[$,]/g, "");
      return sum + (parseFloat(raw) || 0);
    }, 0);

    // Draw Statistics
    const totalDraws = data.draws.length;
    const completedDraws = data.draws.filter((d) => d.status === "completed").length;
    const activeDraws = data.draws.filter((d) => d.status === "active" || d.status === "upcoming").length;
    const totalEntries = data.entries.length;
    const totalClaims = data.claims.length;
    const pendingClaims = data.claims.filter((c) => c.status === "pending").length;
    const verifiedWinners = data.claims.filter(
      (c) => c.status === "approved" || c.status === "paid"
    ).length;
    const paidOut = data.claims.filter((c) => c.status === "paid").length;

    // Plan breakdown
    const planBreakdown = ["scout", "advocate", "builder"].map((key) => {
      const count = activeSubs.filter(
        (s) => (s.plan_type || s.plan_name || "").toLowerCase() === key
      ).length;
      const revenue = count * PLAN_PRICES[key];
      return { key, label: PLAN_LABELS[key], count, revenue, price: PLAN_PRICES[key] };
    });

    return {
      totalUsers,
      activeSubscribers: activeSubs.length,
      totalPrizePool,
      charityTotal,
      totalDraws,
      completedDraws,
      activeDraws,
      totalEntries,
      totalClaims,
      pendingClaims,
      verifiedWinners,
      paidOut,
      planBreakdown,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Loading reports and analytics..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-8"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="pb-4 border-b border-[#162520]">
          <span className="text-[9px] uppercase tracking-widest font-extrabold text-red-500">
            Reports & Analytics
          </span>
          <h2 className="font-heading text-xl font-extrabold text-white mt-0.5">
            Platform Summary Report
          </h2>
          <p className="text-xs text-[#8A9690] mt-0.5">
            Total users, prize pool, charity contributions, and draw statistics.
          </p>
        </motion.div>

        {/* Section 1 — Total Users */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider">
              Total Users
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-[#0A1C16] border-[#162520]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mb-2">Registered Users</p>
              <p className="font-heading text-3xl font-extrabold text-white">{metrics.totalUsers.toLocaleString()}</p>
              <p className="text-[10px] text-blue-400 mt-1 font-semibold">Total platform accounts</p>
            </Card>
            <Card className="p-5 bg-[#0A1C16] border-[#162520]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mb-2">Active Subscribers</p>
              <p className="font-heading text-3xl font-extrabold text-white">{metrics.activeSubscribers.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-400 mt-1 font-semibold">With active giving tier</p>
            </Card>
            <Card className="p-5 bg-[#0A1C16] border-[#162520] col-span-2 sm:col-span-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mb-2">Subscription Rate</p>
              <p className="font-heading text-3xl font-extrabold text-white">
                {metrics.totalUsers > 0
                  ? `${Math.round((metrics.activeSubscribers / metrics.totalUsers) * 100)}%`
                  : "—"}
              </p>
              <p className="text-[10px] text-purple-400 mt-1 font-semibold">Users with active plan</p>
            </Card>
          </div>
        </motion.div>

        {/* Section 2 — Total Prize Pool */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider">
              Total Prize Pool
            </h3>
          </div>
          <Card className="bg-[#0A1C16] border-[#162520]">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mb-1">
                    Monthly Prize Pool (MRR from Active Subscriptions)
                  </p>
                  <p className="font-heading text-4xl font-extrabold text-emerald-400">
                    ${metrics.totalPrizePool.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#8A9690] mt-1">Generated from {metrics.activeSubscribers} active subscriber{metrics.activeSubscribers !== 1 ? "s" : ""}</p>
                </div>
                <Badge className="bg-emerald-500/10 border-emerald-500/25 text-emerald-400 text-xs py-1.5 px-4 self-start sm:self-auto">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  Monthly Recurring
                </Badge>
              </div>

              {/* Plan breakdown */}
              <div className="space-y-3 border-t border-[#162520] pt-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690]">Breakdown by Giving Tier</p>
                {metrics.planBreakdown.map((tier) => {
                  const pct = metrics.activeSubscribers > 0
                    ? Math.round((tier.count / metrics.activeSubscribers) * 100)
                    : 0;
                  const barColors = {
                    scout: "bg-blue-500",
                    advocate: "bg-emerald-500",
                    builder: "bg-amber-500",
                  };
                  return (
                    <div key={tier.key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{tier.label} (${tier.price}/mo)</span>
                        <span className="text-[#8A9690]">
                          {tier.count} subscriber{tier.count !== 1 ? "s" : ""} · <span className="text-white font-bold">${tier.revenue}/mo</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#0D2B20] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColors[tier.key]} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 3 — Charity Contribution Totals */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-purple-400" />
            <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider">
              Charity Contribution Totals
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 bg-[#0A1C16] border-[#162520]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mb-2">Total Raised</p>
              <p className="font-heading text-3xl font-extrabold text-purple-400">
                ${metrics.charityTotal.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#8A9690] mt-1">Across {data.charities.length} active partner charities</p>
            </Card>
            <Card className="p-5 bg-[#0A1C16] border-[#162520]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mb-4">Partner Charities</p>
              {data.charities.length === 0 ? (
                <p className="text-xs text-[#8A9690]">No charities registered yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.charities.slice(0, 4).map((c, i) => {
                    const raised = (c.raised || "").replace(/[$,]/g, "");
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="text-xs text-white font-semibold truncate">{c.name}</span>
                        </div>
                        <span className="text-xs font-bold text-purple-400 shrink-0 ml-2">
                          {raised ? `$${parseFloat(raised).toLocaleString()}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                  {data.charities.length > 4 && (
                    <p className="text-[10px] text-[#8A9690] pt-1">
                      +{data.charities.length - 4} more charities
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </motion.div>

        {/* Section 4 — Draw Statistics */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="w-4 h-4 text-amber-400" />
            <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider">
              Draw Statistics
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            {[
              { label: "Total Draws", value: metrics.totalDraws, color: "text-amber-400" },
              { label: "Completed", value: metrics.completedDraws, color: "text-emerald-400" },
              { label: "Active / Upcoming", value: metrics.activeDraws, color: "text-blue-400" },
              { label: "Total Entries", value: metrics.totalEntries.toLocaleString(), color: "text-white" },
              { label: "Claims Filed", value: metrics.totalClaims, color: "text-white" },
              { label: "Verified Winners", value: metrics.verifiedWinners, color: "text-rose-400" },
            ].map((stat, i) => (
              <Card key={i} className="p-4 bg-[#0A1C16] border-[#162520] text-center">
                <p className={`font-heading text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mt-1">{stat.label}</p>
              </Card>
            ))}
          </div>

          {/* Winner Claims breakdown */}
          <Card className="bg-[#0A1C16] border-[#162520]">
            <CardHeader className="pb-4 border-b border-[#162520]">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-rose-400" />
                Winner Claims Status
              </CardTitle>
              <CardDescription className="text-[10px] text-[#8A9690] mt-0.5">
                Breakdown of submitted winner claim statuses across all draws.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {data.claims.length === 0 ? (
                <p className="text-xs text-[#8A9690] text-center py-6">No winner claims submitted yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Pending Review",
                      value: metrics.pendingClaims,
                      icon: Clock,
                      color: "text-amber-400",
                      bg: "bg-amber-500/10",
                    },
                    {
                      label: "Verified / Approved",
                      value: metrics.verifiedWinners,
                      icon: CheckCircle,
                      color: "text-emerald-400",
                      bg: "bg-emerald-500/10",
                    },
                    {
                      label: "Paid Out",
                      value: metrics.paidOut,
                      icon: Trophy,
                      color: "text-rose-400",
                      bg: "bg-rose-500/10",
                    },
                    {
                      label: "Total Filed",
                      value: metrics.totalClaims,
                      icon: Ticket,
                      color: "text-blue-400",
                      bg: "bg-blue-500/10",
                    },
                  ].map((s, i) => (
                    <div key={i} className="p-4 bg-[#0D2B20]/30 border border-[#162520] rounded-xl text-center">
                      <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <p className={`font-heading text-xl font-extrabold ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Draw list */}
              {data.draws.length > 0 && (
                <div className="mt-5 border-t border-[#162520] pt-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mb-3">Draw Records</p>
                  <div className="space-y-2">
                    {data.draws.map((d, i) => {
                      const entriesCount = data.entries.filter((e) => e.draw_id === d.id).length;
                      const statusColors = {
                        completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
                        active: "bg-blue-500/15 text-blue-400 border-blue-500/25",
                        upcoming: "bg-amber-500/15 text-amber-400 border-amber-500/25",
                        draft: "bg-[#162520] text-[#8A9690] border-[#162520]",
                      };
                      const badgeClass = statusColors[d.status] || statusColors.draft;
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#0D2B20]/20 border border-[#162520] rounded-xl">
                          <div>
                            <p className="text-xs font-bold text-white">{d.title || `Draw #${i + 1}`}</p>
                            <p className="text-[10px] text-[#8A9690] mt-0.5">{entriesCount} entries</p>
                          </div>
                          <Badge className={`text-[9px] border capitalize ${badgeClass}`}>
                            {d.status || "draft"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
