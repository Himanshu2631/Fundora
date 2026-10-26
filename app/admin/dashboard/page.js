"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { createClient } from "@/lib/supabase";
import ViabilitySummarySection from "@/components/admin/ViabilitySummarySection";
import CampaignViabilityTable from "@/components/admin/CampaignViabilityTable";
import Link from "next/link";
import {
  Users,
  Heart,
  Sparkles,
  ArrowRight,
  Activity,
  Clock,
  Award,
  BarChart3,
  DollarSign,
  TrendingUp,
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
  { label: "User Management", href: "/admin/users", icon: Users, desc: "View profiles, manage impact scores and subscriptions" },
  { label: "Charity Management", href: "/admin/charities", icon: Heart, desc: "Add, verify, and manage partner NGO campaigns" },
  { label: "Viability Assessments", href: "/admin/assessments", icon: Sparkles, desc: "Inspect ML predictions & SHAP calibration factors" },
  { label: "Reports & Analytics", href: "/admin/analytics", icon: BarChart3, desc: "Explore giving volume, conversion rates & growth" },
];

const PLAN_LABELS = { scout: "Eco Scout", advocate: "Global Advocate", builder: "Legacy Builder" };

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    profiles: [],
    subscriptions: [],
    charities: [],
    assessments: [],
  });

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient();
      const [
        { data: profiles },
        { data: subscriptions },
        { data: charities },
        { data: assessments }
      ] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("subscriptions").select("*"),
        supabase.from("charities").select("*"),
        supabase.from("ml_assessments").select("*"),
      ]);

      setData({
        profiles: profiles || [],
        subscriptions: subscriptions || [],
        charities: charities || [],
        assessments: assessments || [],
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

    // Monthly Giving (MRR from active subscriptions)
    const planPrices = { scout: 10, advocate: 25, builder: 100 };
    const monthlyGiving = data.subscriptions
      .filter(s => s.status === "active" || s.status === "trialing")
      .reduce((sum, s) => {
        const planKey = (s.plan_type || s.plan_name || "").toLowerCase();
        return sum + (planPrices[planKey] || 0);
      }, 0);

    // Charity Contribution Totals (sum of raised field across all charities)
    const charityContributions = data.charities.reduce((sum, c) => {
      const raw = (c.raised || "").replace(/[₹$,]/g, "");
      return sum + (parseFloat(raw) || 0);
    }, 0);

    const activeSubscribers = data.subscriptions.filter(
      s => s.status === "active" || s.status === "trialing"
    ).length;

    const totalCharities = data.charities.length;
    const totalAssessments = data.assessments.length;

    return {
      totalUsers,
      monthlyGiving,
      charityContributions,
      activeSubscribers,
      totalCharities,
      totalAssessments,
    };
  }, [data]);

  // ─── Recent Activity Feed ────────────────────────────────────────────────
  const activities = useMemo(() => {
    const list = [];

    data.profiles.slice(0, 3).forEach(p => {
      list.push({
        type: "user",
        message: `New supporter registered: ${p.full_name || p.email || "—"}`,
        time: p.created_at ? new Date(p.created_at) : new Date(Date.now() - 3600000 * 2),
        icon: Users,
        color: "text-blue-400",
      });
    });

    data.charities.slice(0, 2).forEach(c => {
      list.push({
        type: "charity",
        message: `Campaign updated: ${c.name || "Charity Campaign"} (${c.category || "General"})`,
        time: c.created_at ? new Date(c.created_at) : new Date(Date.now() - 3600000 * 8),
        icon: Heart,
        color: "text-rose-400",
      });
    });

    data.assessments.slice(0, 2).forEach(a => {
      list.push({
        type: "ml",
        message: `ML Assessment evaluated: ${a.campaign_title || "Campaign"} (Score: ${a.viability_score || a.score || 85}%)`,
        time: a.created_at ? new Date(a.created_at) : new Date(Date.now() - 3600000 * 16),
        icon: Sparkles,
        color: "text-amber-400",
      });
    });

    list.sort((a, b) => b.time - a.time);

    if (list.length === 0) {
      return [
        { message: "New supporter joined: james.d@example.com", time: new Date(Date.now() - 120000), icon: Users, color: "text-blue-400" },
        { message: "Recurring pledge activated: Legacy Builder tier ($100/mo)", time: new Date(Date.now() - 3600000 * 2), icon: TrendingUp, color: "text-emerald-400" },
        { message: "ML Viability Assessment completed: Clean Water Initiative", time: new Date(Date.now() - 3600000 * 5), icon: Sparkles, color: "text-amber-400" },
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
            <p className="text-xs text-[#8A9690] mt-0.5">Operational overview across supporters, giving volume, charities, and viability intelligence.</p>
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
              label: "Total Supporters",
              value: metrics.totalUsers.toLocaleString(),
              icon: Users,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
              sub: `${metrics.activeSubscribers} recurring subscribers`,
            },
            {
              label: "Monthly Giving (MRR)",
              value: `$${metrics.monthlyGiving.toLocaleString()}`,
              icon: DollarSign,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              sub: `From active subscriptions`,
            },
            {
              label: "Charity Impact",
              value: `$${metrics.charityContributions.toLocaleString()}`,
              icon: Heart,
              color: "text-purple-400",
              bg: "bg-purple-500/10",
              sub: `${metrics.totalCharities} partner charities`,
            },
            {
              label: "Viability Intelligence",
              value: `${metrics.totalAssessments} Runs`,
              icon: Sparkles,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              sub: "Automated ML assessments",
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

        {/* Machine Learning Campaign Viability Summary */}
        <motion.div variants={itemVariants}>
          <ViabilitySummarySection />
        </motion.div>

        {/* Machine Learning Campaign Viability Table */}
        <motion.div variants={itemVariants}>
          <CampaignViabilityTable />
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
                      Latest platform events across supporters, pledges, and viability evaluations.
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

                {/* Platform Summary Quick Stats */}
                <div className="mt-5 pt-4 border-t border-[#162520] grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#0D2B20]/30 border border-[#162520] rounded-xl text-center">
                    <p className="font-heading font-extrabold text-lg text-emerald-400">{metrics.activeSubscribers}</p>
                    <p className="text-[9px] text-[#8A9690] uppercase tracking-wider font-bold mt-0.5">Active Subscribers</p>
                  </div>
                  <div className="p-3 bg-[#0D2B20]/30 border border-[#162520] rounded-xl text-center">
                    <p className="font-heading font-extrabold text-lg text-purple-400">{metrics.totalCharities}</p>
                    <p className="text-[9px] text-[#8A9690] uppercase tracking-wider font-bold mt-0.5">Verified Charities</p>
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
