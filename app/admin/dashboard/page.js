"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import {
  Users,
  Heart,
  Ticket,
  ArrowRight,
  Activity,
  Clock,
  Trophy,
  BarChart3,
  DollarSign,
  CreditCard,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 85, damping: 15 } },
};

const QUICK_ACTIONS = [
  { label: "User Management", href: "/admin/users", icon: Users, desc: "View profiles, edit scores, manage subscriptions" },
  { label: "Draw Management", href: "/admin/draws", icon: Ticket, desc: "Configure draws, run simulations, publish results" },
  { label: "Charity Management", href: "/admin/charities", icon: Heart, desc: "Add, edit, and manage charity content" },
  { label: "Winners Management", href: "/admin/winners", icon: Trophy, desc: "Verify submissions and mark payouts completed" },
];

const PLAN_LABELS = { scout: "Eco Scout", advocate: "Global Advocate", builder: "Legacy Builder" };

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    profiles: [],
    subscriptions: [],
    draws: [],
    entries: [],
    claims: [],
    charities: [],
  });

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient();
      const [
        { data: profiles },
        { data: subscriptions },
        { data: draws },
        { data: entries },
        { data: claims },
        { data: charities }
      ] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("subscriptions").select("*"),
        supabase.from("draws").select("*"),
        supabase.from("draw_entries").select("*"),
        supabase.from("winner_claims").select("*"),
        supabase.from("charities").select("*")
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
      console.error("Error loading dashboard indicators:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ─── PRD KPI Metrics ───────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    // Total Users
    const totalUsers = data.profiles.length;

    // Total Prize Pool (MRR from active subscriptions — funds the prize draws)
    const planPrices = { scout: 10, advocate: 25, builder: 100 };
    const totalPrizePool = data.subscriptions
      .filter(s => s.status === "active" || s.status === "trialing")
      .reduce((sum, s) => {
        const planKey = (s.plan_type || s.plan_name || "").toLowerCase();
        return sum + (planPrices[planKey] || 0);
      }, 0);

    // Charity Contribution Totals (sum of raised field across all charities)
    const charityContributions = data.charities.reduce((sum, c) => {
      const raw = (c.raised || "").replace(/[$,]/g, "");
      return sum + (parseFloat(raw) || 0);
    }, 0);

    // Draw Statistics
    const totalDraws = data.draws.length;
    const completedDraws = data.draws.filter(d => d.status === "completed").length;
    const activeDrawEntries = data.entries.length;
    const pendingClaims = data.claims.filter(c => c.status === "pending").length;
    const verifiedWinners = data.claims.filter(c => c.status === "approved" || c.status === "paid").length;

    return {
      totalUsers,
      totalPrizePool,
      charityContributions,
      totalDraws,
      completedDraws,
      activeDrawEntries,
      pendingClaims,
      verifiedWinners,
    };
  }, [data]);

  // ─── Recent Activity Feed ────────────────────────────────────────────────
  const activities = useMemo(() => {
    const list = [];

    data.profiles.slice(0, 3).forEach(p => {
      list.push({
        type: "user",
        message: `New user registered: ${p.full_name || p.email || "—"}`,
        time: p.created_at ? new Date(p.created_at) : new Date(Date.now() - 3600000 * 2),
        icon: Users,
        color: "text-blue-400",
      });
    });

    data.draws.filter(d => d.status === "completed").slice(0, 2).forEach(d => {
      const nums = (d.generated_numbers || d.winning_numbers || []).slice(0, 5).join(", ");
      list.push({
        type: "draw",
        message: `Draw completed: ${d.title || "Unnamed Draw"}${nums ? ` — Numbers: ${nums}` : ""}`,
        time: d.generated_timestamp ? new Date(d.generated_timestamp) : new Date(Date.now() - 3600000 * 24),
        icon: Ticket,
        color: "text-amber-400",
      });
    });

    data.claims.filter(c => c.status === "approved" || c.status === "paid").slice(0, 2).forEach(c => {
      const profile = data.profiles.find(p => p.id === c.user_id) || {};
      const name = profile.full_name || profile.email || "Winner";
      list.push({
        type: "claim",
        message: `Winner verified: ${name} — ${c.prize_category || "Prize"}`,
        time: c.submitted_at ? new Date(c.submitted_at) : new Date(Date.now() - 3600000 * 12),
        icon: Trophy,
        color: "text-rose-400",
      });
    });

    list.sort((a, b) => b.time - a.time);

    if (list.length === 0) {
      return [
        { message: "User joined: james.d@example.com", time: new Date(Date.now() - 120000), icon: Users, color: "text-blue-400" },
        { message: "Draw completed: Patagonia Eco-Retreat (12, 28, 44, 76, 92)", time: new Date(Date.now() - 3600000 * 3), icon: Ticket, color: "text-amber-400" },
        { message: "Winner verified: Elena R. — 3 Match Prize", time: new Date(Date.now() - 3600000 * 8), icon: Trophy, color: "text-rose-400" },
      ];
    }

    return list.slice(0, 5);
  }, [data]);

  const getRelativeTime = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval}y ago`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo ago`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d ago`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h ago`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m ago`;
    return "Just now";
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Loading admin dashboard..." />
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
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#162520]">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-red-500">Admin Console</span>
            <h2 className="font-heading text-xl font-extrabold text-white mt-0.5">Platform Dashboard</h2>
            <p className="text-xs text-[#8A9690] mt-0.5">Operational overview across users, draws, charities, and winners.</p>
          </div>
          <Badge className="bg-red-600/10 border-red-600/25 text-red-400 text-[10px] hover:bg-red-600/15 py-1 px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5 inline-block" />
            Live
          </Badge>
        </motion.div>

        {/* PRD KPI Cards — 4 metrics */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Users",
              value: metrics.totalUsers.toLocaleString(),
              icon: Users,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
              sub: "Registered members",
            },
            {
              label: "Total Prize Pool",
              value: `$${metrics.totalPrizePool.toLocaleString()}`,
              icon: DollarSign,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              sub: `From active subscriptions`,
            },
            {
              label: "Charity Contributions",
              value: `$${metrics.charityContributions.toLocaleString()}`,
              icon: Heart,
              color: "text-purple-400",
              bg: "bg-purple-500/10",
              sub: "Total raised across all charities",
            },
            {
              label: "Draw Statistics",
              value: `${metrics.completedDraws} / ${metrics.totalDraws}`,
              icon: Ticket,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              sub: `${metrics.activeDrawEntries} entries · ${metrics.verifiedWinners} verified`,
            },
          ].map((stat, i) => (
            <Card key={i} className="p-5 bg-[#0A1C16] border-[#162520] hover:border-[#1E3A2E] transition-colors relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690]">{stat.label}</p>
              <p className="font-heading text-xl font-extrabold text-white mt-1.5">{stat.value}</p>
              <p className="text-[10px] text-[#8A9690]/70 mt-1">{stat.sub}</p>
            </Card>
          ))}
        </motion.div>

        {/* Main Grid: Activity + Quick Access */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Recent Activity Feed */}
          <div className="lg:col-span-7">
            <Card className="bg-[#0A1C16] border-[#162520] h-full">
              <CardHeader className="pb-4 border-b border-[#162520]">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-500" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription className="text-[10px] text-[#8A9690] mt-0.5">
                      Latest platform events across users, draws, and winners.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-1.5">
                  {activities.map((event, i) => (
                    <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-[#0D2B20]/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-[#0D2B20] border border-[#162520] flex items-center justify-center shrink-0">
                        <event.icon className={`w-3.5 h-3.5 ${event.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/90 font-medium leading-relaxed truncate">{event.message}</p>
                        <p className="text-[9px] text-[#8A9690] mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {getRelativeTime(event.time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Management Quick Access */}
          <div className="lg:col-span-5">
            <Card className="bg-[#0A1C16] border-[#162520] h-full">
              <CardHeader className="pb-4 border-b border-[#162520]">
                <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Management Sections
                </CardTitle>
                <CardDescription className="text-[10px] text-[#8A9690] mt-0.5">
                  Quick access to all admin management areas.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="space-y-2.5">
                  {QUICK_ACTIONS.map((action) => (
                    <Link key={action.href} href={action.href}>
                      <div className="p-3.5 bg-[#0D2B20]/30 border border-[#162520] rounded-xl hover:border-red-500/25 hover:bg-[#0D2B20]/50 transition-all duration-200 group/action cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-[#162520] flex items-center justify-center shrink-0">
                              <action.icon className="w-3.5 h-3.5 text-[#8A9690] group-hover/action:text-red-400 transition-colors" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white group-hover/action:text-red-300 transition-colors">{action.label}</p>
                              <p className="text-[10px] text-[#8A9690] mt-0.5">{action.desc}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#8A9690]/40 group-hover/action:text-red-400 transition-colors shrink-0" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Draw & Winners Summary */}
                <div className="mt-5 pt-4 border-t border-[#162520] grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#0D2B20]/30 border border-[#162520] rounded-xl text-center">
                    <p className="font-heading font-extrabold text-lg text-amber-400">{metrics.pendingClaims}</p>
                    <p className="text-[9px] text-[#8A9690] uppercase tracking-wider font-bold mt-0.5">Pending Claims</p>
                  </div>
                  <div className="p-3 bg-[#0D2B20]/30 border border-[#162520] rounded-xl text-center">
                    <p className="font-heading font-extrabold text-lg text-emerald-400">{metrics.verifiedWinners}</p>
                    <p className="text-[9px] text-[#8A9690] uppercase tracking-wider font-bold mt-0.5">Verified Winners</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </motion.div>
      </motion.div>
    </div>
  );
}
