"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  CreditCard,
  Heart,
  Ticket,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trophy,
  BarChart3,
  DollarSign,
  Zap,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const STATS = [
  {
    label: "Total Users",
    value: "1,248",
    change: "+14%",
    changeLabel: "vs last month",
    icon: Users,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    label: "Monthly Revenue",
    value: "$34,920",
    change: "+8.2%",
    changeLabel: "MRR growth",
    icon: DollarSign,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  {
    label: "Active Charities",
    value: "12",
    change: "2 pending",
    changeLabel: "vetting queue",
    icon: Heart,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
  },
  {
    label: "Draw Pool",
    value: "$24,950",
    change: "4 days",
    changeLabel: "until next draw",
    icon: Ticket,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
];

const ACTIVITY_FEED = [
  { type: "user", message: "New user registered: elena.r@email.com", time: "2 min ago", icon: Users, color: "text-blue-400" },
  { type: "subscription", message: "Subscription upgrade: Scout → Advocate (marcus.k)", time: "18 min ago", icon: ArrowUpRight, color: "text-emerald-400" },
  { type: "draw", message: "Draw entry auto-generated for 42 eligible users", time: "1 hr ago", icon: Ticket, color: "text-amber-400" },
  { type: "charity", message: "Charity vetting completed: Eco Shelter Solutions", time: "2 hrs ago", icon: CheckCircle, color: "text-emerald-400" },
  { type: "claim", message: "Winner claim submitted: FND-884-92K (Patagonia Retreat)", time: "3 hrs ago", icon: Trophy, color: "text-rose-400" },
  { type: "system", message: "Stripe webhook sync completed — 100% health", time: "4 hrs ago", icon: Zap, color: "text-purple-400" },
];

const SYSTEM_HEALTH = [
  { name: "Database", status: "operational", uptime: "99.98%" },
  { name: "Auth Service", status: "operational", uptime: "99.99%" },
  { name: "Stripe Billing", status: "operational", uptime: "99.95%" },
  { name: "Draw Engine", status: "operational", uptime: "100%" },
];

const QUICK_ACTIONS = [
  { label: "Manage Users", href: "/admin/users", icon: Users, desc: "View all registered members" },
  { label: "Review Claims", href: "/admin/winners", icon: Trophy, desc: "Pending winner verifications" },
  { label: "Trigger Draw", href: "/admin/draws", icon: Ticket, desc: "Execute monthly draw protocol" },
  { label: "View Analytics", href: "/admin/analytics", icon: BarChart3, desc: "Revenue and growth metrics" },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-8"
      >
        {/* ── KPI Cards ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <Card key={i} className="p-5 bg-[#0A1C16] border-[#162520] hover:border-[#1E3A2E] transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} ${stat.borderColor} border flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9690] mb-1">{stat.label}</p>
              <p className="font-heading text-2xl font-extrabold text-white">{stat.value}</p>
              <p className="text-[10px] text-[#8A9690] mt-1">{stat.changeLabel}</p>
            </Card>
          ))}
        </motion.div>

        {/* ── Main Grid ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Activity Feed */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-[#0A1C16] border-[#162520]">
              <CardHeader className="pb-4 border-b border-[#162520]">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-400" />
                      Live Activity Feed
                    </CardTitle>
                    <CardDescription className="text-[11px] text-[#8A9690] mt-0.5">
                      Real-time platform events and notifications.
                    </CardDescription>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[9px] hover:bg-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="space-y-1">
                  {ACTIVITY_FEED.map((event, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#0D2B20]/40 transition-colors group/item">
                      <div className={`w-8 h-8 rounded-xl bg-[#0D2B20] border border-[#162520] flex items-center justify-center shrink-0 group-hover/item:border-[#1E3A2E]`}>
                        <event.icon className={`w-3.5 h-3.5 ${event.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/90 font-medium leading-relaxed">{event.message}</p>
                        <p className="text-[10px] text-[#8A9690] mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {event.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-[#0A1C16] border-[#162520]">
              <CardHeader className="pb-4 border-b border-[#162520]">
                <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <Link key={action.href} href={action.href}>
                      <div className="p-4 bg-[#0D2B20]/30 border border-[#162520] rounded-xl hover:border-red-500/25 hover:bg-[#0D2B20]/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group/action cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <action.icon className="w-4 h-4 text-[#8A9690] group-hover/action:text-red-400 transition-colors" />
                          <ArrowRight className="w-3.5 h-3.5 text-[#8A9690]/40 group-hover/action:text-red-400 transition-colors" />
                        </div>
                        <p className="text-xs font-bold text-white mb-0.5">{action.label}</p>
                        <p className="text-[10px] text-[#8A9690]">{action.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: System Health + Revenue Summary */}
          <div className="lg:col-span-5 space-y-6">
            {/* System Health */}
            <Card className="bg-[#0A1C16] border-[#162520]">
              <CardHeader className="pb-4 border-b border-[#162520]">
                <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  System Health
                </CardTitle>
                <CardDescription className="text-[11px] text-[#8A9690] mt-0.5">
                  All services operational.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="space-y-3">
                  {SYSTEM_HEALTH.map((service) => (
                    <div key={service.name} className="flex items-center justify-between p-3 bg-[#0D2B20]/30 border border-[#162520] rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-white">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#8A9690] font-mono">{service.uptime}</span>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[8px] py-0 px-1.5 hover:bg-emerald-500/20">
                          Healthy
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card className="bg-[#0A1C16] border-[#162520]">
              <CardHeader className="pb-4 border-b border-[#162520]">
                <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {[
                  { tier: "Legacy Builder", price: "$100/mo", users: 174, revenue: "$17,400", pct: 49.8, color: "bg-amber-500" },
                  { tier: "Global Advocate", price: "$25/mo", users: 482, revenue: "$12,050", pct: 34.5, color: "bg-emerald-500" },
                  { tier: "Eco Scout", price: "$10/mo", users: 542, revenue: "$5,420", pct: 15.5, color: "bg-blue-500" },
                ].map((tier) => (
                  <div key={tier.tier} className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-white">{tier.tier}</span>
                        <span className="text-[#8A9690] ml-1.5">({tier.price})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">{tier.revenue}</span>
                        <span className="text-[#8A9690] ml-1.5">· {tier.users} users</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#0D2B20] rounded-full overflow-hidden">
                      <div className={`h-full ${tier.color} rounded-full`} style={{ width: `${tier.pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-[#162520] flex justify-between items-center text-xs">
                  <span className="font-bold text-[#8A9690]">Total MRR</span>
                  <span className="font-heading font-extrabold text-lg text-white">$34,870</span>
                </div>
              </CardContent>
            </Card>

            {/* Platform Summary */}
            <Card className="bg-[#0A1C16] border-[#162520] p-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Conversion Rate", value: "12.4%", icon: TrendingUp },
                  { label: "Churn Rate", value: "2.1%", icon: AlertTriangle },
                  { label: "Avg Score", value: "284 pts", icon: Trophy },
                  { label: "Active Draws", value: "2", icon: Ticket },
                ].map((metric) => (
                  <div key={metric.label} className="p-3 bg-[#0D2B20]/30 border border-[#162520] rounded-xl text-center">
                    <metric.icon className="w-3.5 h-3.5 text-[#8A9690] mx-auto mb-1.5" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690]">{metric.label}</p>
                    <p className="font-heading text-sm font-extrabold text-white mt-0.5">{metric.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </motion.div>
      </motion.div>
    </div>
  );
}
