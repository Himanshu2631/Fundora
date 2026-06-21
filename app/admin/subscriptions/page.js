"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ShieldCheck,
  Calendar,
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

const TIERS = [
  {
    name: "Eco Scout",
    price: "$10/mo",
    users: 542,
    revenue: "$5,420",
    pct: 45.3,
    growth: "+12%",
    color: "blue",
    description: "Entry-level tier for eco-conscious golfers",
  },
  {
    name: "Global Advocate",
    price: "$25/mo",
    users: 482,
    revenue: "$12,050",
    pct: 40.2,
    growth: "+8%",
    color: "emerald",
    description: "Mid-tier with enhanced draw multipliers",
  },
  {
    name: "Legacy Builder",
    price: "$100/mo",
    users: 174,
    revenue: "$17,400",
    pct: 14.5,
    growth: "+22%",
    color: "amber",
    description: "Premium tier with maximum impact and rewards",
  },
];

const RECENT_EVENTS = [
  { id: "EVT-001", user: "marcus.k@email.com", action: "Upgraded", from: "Eco Scout", to: "Global Advocate", date: "Jun 21, 2026", amount: "+$15.00" },
  { id: "EVT-002", user: "elena.r@email.com", action: "Renewed", from: "Legacy Builder", to: "Legacy Builder", date: "Jun 20, 2026", amount: "$100.00" },
  { id: "EVT-003", user: "sarah.c@email.com", action: "Subscribed", from: "—", to: "Eco Scout", date: "Jun 19, 2026", amount: "$10.00" },
  { id: "EVT-004", user: "david.o@email.com", action: "Cancelled", from: "Eco Scout", to: "—", date: "Jun 18, 2026", amount: "-$10.00" },
  { id: "EVT-005", user: "maya.p@email.com", action: "Renewed", from: "Global Advocate", to: "Global Advocate", date: "Jun 17, 2026", amount: "$25.00" },
];

const COLOR_MAP = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", bar: "bg-blue-500" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", bar: "bg-emerald-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", bar: "bg-amber-500" },
};

export default function AdminSubscriptionsPage() {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Revenue Overview */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total MRR", value: "$34,870", change: "+8.2%", up: true, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Total Subscribers", value: "1,198", change: "+14%", up: true, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Avg Revenue/User", value: "$29.11", change: "+3.4%", up: true, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Churn Rate", value: "2.1%", change: "-0.4%", up: false, icon: ArrowDownRight, color: "text-rose-400", bg: "bg-rose-500/10" },
          ].map((stat, i) => (
            <Card key={i} className="p-4 bg-[#0A1C16] border-[#162520]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-sm ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690]">{stat.label}</p>
                  <p className="font-heading text-lg font-extrabold text-white">{stat.value}</p>
                  <p className={`text-[10px] font-semibold flex items-center gap-0.5 ${stat.up ? "text-emerald-400" : "text-emerald-400"}`}>
                    {stat.up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {stat.change}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Tier Breakdown Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const c = COLOR_MAP[tier.color];
            return (
              <Card key={tier.name} className="bg-[#0A1C16] border-[#162520] overflow-hidden">
                <div className={`h-[3px] ${c.bar}`} />
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-heading text-sm font-extrabold ${c.text}`}>{tier.name}</h3>
                      <p className="text-[10px] text-[#8A9690] mt-0.5">{tier.description}</p>
                    </div>
                    <span className="text-xs font-bold text-white bg-[#0D2B20] px-2 py-1 rounded-sm border border-[#162520]">
                      {tier.price}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-sm ${c.bg} border ${c.border}`}>
                      <p className="text-[9px] font-bold uppercase text-[#8A9690]">Users</p>
                      <p className="font-heading text-xl font-extrabold text-white">{tier.users}</p>
                    </div>
                    <div className={`p-3 rounded-sm ${c.bg} border ${c.border}`}>
                      <p className="text-[9px] font-bold uppercase text-[#8A9690]">Revenue</p>
                      <p className="font-heading text-xl font-extrabold text-white">{tier.revenue}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#8A9690] font-semibold">Share of total</span>
                      <span className="text-white font-bold">{tier.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#0D2B20] rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${tier.pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                    <TrendingUp className="w-3 h-3" /> {tier.growth} this month
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Recent Subscription Events */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden bg-[#0A1C16] border-[#162520]">
            <CardHeader className="pb-4 border-b border-[#162520]">
              <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Recent Subscription Events
              </CardTitle>
              <CardDescription className="text-[11px] text-[#8A9690] mt-0.5">
                Latest subscription changes, renewals, and cancellations.
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="border-[#162520] hover:bg-transparent">
                  <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Event ID</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">User</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Action</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Transition</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Date</TableHead>
                  <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_EVENTS.map((event) => (
                  <TableRow key={event.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                    <TableCell className="pl-6 font-mono text-[11px] text-[#8A9690]">{event.id}</TableCell>
                    <TableCell className="text-xs text-white font-semibold">{event.user}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] ${
                        event.action === "Upgraded" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20" :
                        event.action === "Cancelled" ? "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20" :
                        event.action === "Subscribed" ? "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20" :
                        "bg-[#0D2B20] text-[#8A9690] border-[#162520] hover:bg-[#0D2B20]"
                      }`}>
                        {event.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#8A9690]">
                      {event.from} → {event.to}
                    </TableCell>
                    <TableCell className="text-xs text-[#8A9690] flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> {event.date}
                    </TableCell>
                    <TableCell className={`text-right pr-6 text-xs font-bold ${
                      event.amount.startsWith("-") ? "text-red-400" : "text-emerald-400"
                    }`}>
                      {event.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </motion.div>

        {/* Stripe Integration Status */}
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0A1C16] border-[#162520] p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">Stripe Billing Integration</p>
                <p className="text-[10px] text-[#8A9690] mt-0.5">All webhook endpoints synced. Last ping: 2 minutes ago.</p>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                100% Health
              </Badge>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
