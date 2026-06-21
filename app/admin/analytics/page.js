"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Heart,
  Ticket,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Globe,
  Zap,
  Target,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const MONTHLY_DATA = [
  { month: "Jan", users: 680, revenue: 18200, draws: 1, newUsers: 45 },
  { month: "Feb", users: 742, revenue: 20800, draws: 1, newUsers: 62 },
  { month: "Mar", users: 825, revenue: 23400, draws: 1, newUsers: 83 },
  { month: "Apr", users: 940, revenue: 27100, draws: 1, newUsers: 115 },
  { month: "May", users: 1098, revenue: 31200, draws: 1, newUsers: 158 },
  { month: "Jun", users: 1248, revenue: 34920, draws: 2, newUsers: 150 },
];

const IMPACT_METRICS = [
  { label: "Trees Planted", value: "12,480", change: "+1,240", icon: Globe, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Clean Water (L)", value: "48,000", change: "+6,200", icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Education Hours", value: "2,840", change: "+380", icon: Target, color: "text-amber-400", bg: "bg-amber-500/10" },
  { label: "Healthcare Kits", value: "890", change: "+120", icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10" },
];

export default function AdminAnalyticsPage() {
  const latestMonth = MONTHLY_DATA[MONTHLY_DATA.length - 1];
  const previousMonth = MONTHLY_DATA[MONTHLY_DATA.length - 2];
  const revenueGrowth = (((latestMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100).toFixed(1);
  const userGrowth = (((latestMonth.users - previousMonth.users) / previousMonth.users) * 100).toFixed(1);
  const maxRevenue = Math.max(...MONTHLY_DATA.map(d => d.revenue));
  const maxUsers = Math.max(...MONTHLY_DATA.map(d => d.newUsers));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Key Metrics */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: `$${(latestMonth.revenue).toLocaleString()}`, change: `+${revenueGrowth}%`, up: true, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Total Users", value: latestMonth.users.toLocaleString(), change: `+${userGrowth}%`, up: true, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Draws Completed", value: String(MONTHLY_DATA.reduce((sum, d) => sum + d.draws, 0)), change: "100% success", up: true, icon: Ticket, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Win Claims", value: "18", change: "72% approval", up: true, icon: Trophy, color: "text-rose-400", bg: "bg-rose-500/10" },
          ].map((stat, i) => (
            <Card key={i} className="p-4 bg-[#0A1C16] border-[#162520]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-sm ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690]">{stat.label}</p>
                  <p className="font-heading text-lg font-extrabold text-white">{stat.value}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" /> {stat.change}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Charts Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card className="bg-[#0A1C16] border-[#162520]">
            <CardHeader className="pb-4 border-b border-[#162520]">
              <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Monthly Revenue
              </CardTitle>
              <CardDescription className="text-[11px] text-[#8A9690] mt-0.5">
                Revenue trend over the last 6 months.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-end gap-2 h-[180px]">
                {MONTHLY_DATA.map((d) => {
                  const heightPct = (d.revenue / maxRevenue) * 100;
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[9px] font-bold text-[#8A9690]">${(d.revenue / 1000).toFixed(0)}k</span>
                      <div className="w-full flex justify-center">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${heightPct}%` }}
                          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                          className="w-full max-w-[32px] bg-emerald-500/30 border border-emerald-500/40 rounded-t-sm relative group hover:bg-emerald-500/50 transition-colors cursor-pointer"
                          style={{ minHeight: 8 }}
                        >
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emerald-500/40 to-transparent rounded-t-sm" />
                        </motion.div>
                      </div>
                      <span className="text-[10px] font-semibold text-[#8A9690]">{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* User Growth Chart */}
          <Card className="bg-[#0A1C16] border-[#162520]">
            <CardHeader className="pb-4 border-b border-[#162520]">
              <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                New User Registrations
              </CardTitle>
              <CardDescription className="text-[11px] text-[#8A9690] mt-0.5">
                Monthly new user signups.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-end gap-2 h-[180px]">
                {MONTHLY_DATA.map((d) => {
                  const heightPct = (d.newUsers / maxUsers) * 100;
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[9px] font-bold text-[#8A9690]">+{d.newUsers}</span>
                      <div className="w-full flex justify-center">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${heightPct}%` }}
                          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                          className="w-full max-w-[32px] bg-blue-500/30 border border-blue-500/40 rounded-t-sm relative group hover:bg-blue-500/50 transition-colors cursor-pointer"
                          style={{ minHeight: 8 }}
                        >
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-500/40 to-transparent rounded-t-sm" />
                        </motion.div>
                      </div>
                      <span className="text-[10px] font-semibold text-[#8A9690]">{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charity Impact Summary */}
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0A1C16] border-[#162520]">
            <CardHeader className="pb-4 border-b border-[#162520]">
              <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                Charity Impact Summary
              </CardTitle>
              <CardDescription className="text-[11px] text-[#8A9690] mt-0.5">
                Real-world outcomes from charitable contributions this quarter.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {IMPACT_METRICS.map((metric) => (
                  <div key={metric.label} className="p-4 bg-[#0D2B20]/30 border border-[#162520] rounded-sm text-center hover:border-[#1E3A2E] transition-colors">
                    <div className={`w-10 h-10 rounded-sm ${metric.bg} flex items-center justify-center mx-auto mb-3`}>
                      <metric.icon className={`w-5 h-5 ${metric.color}`} />
                    </div>
                    <p className="font-heading text-xl font-extrabold text-white">{metric.value}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690] mt-1">{metric.label}</p>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center justify-center gap-0.5">
                      <ArrowUpRight className="w-2.5 h-2.5" /> {metric.change} this month
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform Health & Engagement */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Engagement Score",
              value: "87%",
              desc: "Users actively participating in draws and charity selections",
              trend: "+4.2%",
              color: "emerald",
            },
            {
              title: "Retention Rate",
              value: "94.6%",
              desc: "Monthly subscription renewal rate across all tiers",
              trend: "+1.8%",
              color: "blue",
            },
            {
              title: "Draw Participation",
              value: "78%",
              desc: "Eligible users who entered the latest active draw",
              trend: "+6.1%",
              color: "amber",
            },
          ].map((card) => {
            const colorMap = {
              emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", bar: "bg-emerald-500" },
              blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", bar: "bg-blue-500" },
              amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", bar: "bg-amber-500" },
            };
            const c = colorMap[card.color];
            return (
              <Card key={card.title} className="bg-[#0A1C16] border-[#162520] p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9690]">{card.title}</p>
                  <Badge className={`${c.bg} ${c.text} ${c.border} text-[9px] hover:${c.bg}`}>
                    <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> {card.trend}
                  </Badge>
                </div>
                <p className={`font-heading text-3xl font-extrabold ${c.text}`}>{card.value}</p>
                <p className="text-[10px] text-[#8A9690] leading-relaxed">{card.desc}</p>
                <div className="h-1.5 bg-[#0D2B20] rounded-full overflow-hidden">
                  <div className={`h-full ${c.bar} rounded-full`} style={{ width: card.value }} />
                </div>
              </Card>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
