"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCw,
  Loader2,
  Zap,
  RefreshCw,
  Ban,
  Play,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const PLAN_LABELS = { scout: "Eco Scout", advocate: "Global Advocate", builder: "Legacy Builder" };
const PLAN_PRICES = { scout: "$10/mo", advocate: "$25/mo", builder: "$100/mo" };

const generateSubscriptions = () => [
  { id: "SUB-001", user: "Marcus Klein", email: "marcus.k@email.com", plan: "advocate", status: "active", startDate: "2025-11-18", renewalDate: "2026-07-18", amount: "$25.00" },
  { id: "SUB-002", user: "Elena Rodriguez", email: "elena.r@email.com", plan: "builder", status: "active", startDate: "2025-12-05", renewalDate: "2026-07-05", amount: "$100.00" },
  { id: "SUB-003", user: "Yuki Shimizu", email: "yuki.s@email.com", plan: "scout", status: "active", startDate: "2026-01-14", renewalDate: "2026-07-14", amount: "$10.00" },
  { id: "SUB-004", user: "Hiroshi Tanaka", email: "hiroshi.t@email.com", plan: "advocate", status: "active", startDate: "2026-02-20", renewalDate: "2026-07-20", amount: "$25.00" },
  { id: "SUB-005", user: "Sarah Chen", email: "sarah.c@email.com", plan: "scout", status: "expiring", startDate: "2026-03-10", renewalDate: "2026-06-24", amount: "$10.00" },
  { id: "SUB-006", user: "Maya Patel", email: "maya.p@email.com", plan: "advocate", status: "active", startDate: "2026-03-28", renewalDate: "2026-07-28", amount: "$25.00" },
  { id: "SUB-007", user: "David Okafor", email: "david.o@email.com", plan: "scout", status: "cancelled", startDate: "2026-01-05", renewalDate: null, amount: "$10.00" },
  { id: "SUB-008", user: "Amara Diallo", email: "amara.d@email.com", plan: "builder", status: "active", startDate: "2025-11-30", renewalDate: "2026-07-30", amount: "$100.00" },
  { id: "SUB-009", user: "Liam O'Brien", email: "liam.o@email.com", plan: "advocate", status: "active", startDate: "2026-01-22", renewalDate: "2026-07-22", amount: "$25.00" },
  { id: "SUB-010", user: "Nina Petrov", email: "nina.p@email.com", plan: "scout", status: "expiring", startDate: "2026-05-10", renewalDate: "2026-06-25", amount: "$10.00" },
  { id: "SUB-011", user: "James Whitfield", email: "james.w@email.com", plan: "builder", status: "cancelled", startDate: "2025-12-18", renewalDate: null, amount: "$100.00" },
  { id: "SUB-012", user: "Aiko Yamamoto", email: "aiko.y@email.com", plan: "advocate", status: "active", startDate: "2026-02-14", renewalDate: "2026-07-14", amount: "$25.00" },
  { id: "SUB-013", user: "Fatima Al-Hassan", email: "fatima.a@email.com", plan: "scout", status: "active", startDate: "2026-03-02", renewalDate: "2026-07-02", amount: "$10.00" },
  { id: "SUB-014", user: "Lucas Ferreira", email: "lucas.f@email.com", plan: "scout", status: "cancelled", startDate: "2026-04-05", renewalDate: null, amount: "$10.00" },
  { id: "SUB-015", user: "Carlos Mendez", email: "carlos.m@email.com", plan: "advocate", status: "expiring", startDate: "2026-04-15", renewalDate: "2026-06-23", amount: "$25.00" },
];

const ITEMS_PER_PAGE = 8;

const COLOR_MAP = {
  scout: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", bar: "bg-blue-500" },
  advocate: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", bar: "bg-emerald-500" },
  builder: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", bar: "bg-amber-500" },
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState(generateSubscriptions);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState({});
  const [actionFeedback, setActionFeedback] = useState(null);

  // ── Filtering ──
  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchesSearch =
        s.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesPlan = planFilter === "all" || s.plan === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [subscriptions, searchQuery, statusFilter, planFilter]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  // ── Admin Actions ──
  const showFeedback = (message) => {
    setActionFeedback({ message });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleCancel = (subId) => {
    setActionLoading((prev) => ({ ...prev, [subId]: "cancel" }));
    setTimeout(() => {
      setSubscriptions((prev) => prev.map((s) => s.id === subId ? { ...s, status: "cancelled", renewalDate: null } : s));
      setActionLoading((prev) => ({ ...prev, [subId]: null }));
      showFeedback(`Subscription ${subId} has been cancelled.`);
    }, 600);
  };

  const handleRenew = (subId) => {
    setActionLoading((prev) => ({ ...prev, [subId]: "renew" }));
    setTimeout(() => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const dateStr = futureDate.toISOString().split("T")[0];
      setSubscriptions((prev) => prev.map((s) => s.id === subId ? { ...s, status: "active", renewalDate: dateStr } : s));
      setActionLoading((prev) => ({ ...prev, [subId]: null }));
      showFeedback(`Subscription ${subId} has been renewed.`);
    }, 600);
  };

  const handleUpgrade = (subId) => {
    setActionLoading((prev) => ({ ...prev, [subId]: "upgrade" }));
    setTimeout(() => {
      setSubscriptions((prev) => prev.map((s) => {
        if (s.id !== subId) return s;
        const nextPlan = s.plan === "scout" ? "advocate" : s.plan === "advocate" ? "builder" : "builder";
        return { ...s, plan: nextPlan, amount: nextPlan === "advocate" ? "$25.00" : nextPlan === "builder" ? "$100.00" : s.amount, status: "active" };
      }));
      setActionLoading((prev) => ({ ...prev, [subId]: null }));
      showFeedback(`Subscription ${subId} has been upgraded.`);
    }, 600);
  };

  // ── Stats ──
  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const expiringCount = subscriptions.filter((s) => s.status === "expiring").length;
  const cancelledCount = subscriptions.filter((s) => s.status === "cancelled").length;
  const totalMRR = subscriptions
    .filter((s) => s.status === "active" || s.status === "expiring")
    .reduce((sum, s) => sum + parseFloat(s.amount.replace("$", "")), 0);

  // Tier breakdown
  const tierStats = ["scout", "advocate", "builder"].map((plan) => {
    const items = subscriptions.filter((s) => s.plan === plan && (s.status === "active" || s.status === "expiring"));
    const revenue = items.reduce((sum, s) => sum + parseFloat(s.amount.replace("$", "")), 0);
    return { plan, count: items.length, revenue };
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* ── Revenue Overview ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total MRR", value: `$${totalMRR.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Active Plans", value: String(activeCount), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Expiring Soon", value: String(expiringCount), icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Cancelled", value: String(cancelledCount), icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
          ].map((stat, i) => (
            <Card key={i} className="p-4 bg-[#0A1C16] border-[#162520]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-sm ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690]">{stat.label}</p>
                  <p className="font-heading text-lg font-extrabold text-white">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* ── Tier Breakdown Cards ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tierStats.map((tier) => {
            const c = COLOR_MAP[tier.plan];
            return (
              <Card key={tier.plan} className="bg-[#0A1C16] border-[#162520] overflow-hidden">
                <div className={`h-[3px] ${c.bar}`} />
                <CardContent className="p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className={`font-heading text-sm font-extrabold ${c.text}`}>{PLAN_LABELS[tier.plan]}</h3>
                    <span className="text-[10px] font-bold text-white bg-[#0D2B20] px-2 py-0.5 rounded-sm border border-[#162520]">
                      {PLAN_PRICES[tier.plan]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-2.5 rounded-sm ${c.bg} border ${c.border} text-center`}>
                      <p className="text-[9px] font-bold uppercase text-[#8A9690]">Users</p>
                      <p className="font-heading text-lg font-extrabold text-white">{tier.count}</p>
                    </div>
                    <div className={`p-2.5 rounded-sm ${c.bg} border ${c.border} text-center`}>
                      <p className="text-[9px] font-bold uppercase text-[#8A9690]">Revenue</p>
                      <p className="font-heading text-lg font-extrabold text-white">${tier.revenue.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* ── Action Feedback ── */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Alert className="bg-emerald-500/10 border-emerald-500/25">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <AlertTitle className="text-xs font-bold text-white">Action Completed</AlertTitle>
                <AlertDescription className="text-[11px] text-[#8A9690]">{actionFeedback.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search & Filters ── */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9690]" />
            <Input
              placeholder="Search by user name, email, or subscription ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-10 bg-[#0A1C16] border-[#162520] text-white placeholder:text-[#8A9690]/60 focus:border-red-500/40 text-xs"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Status Filters */}
            {["all", "active", "expiring", "cancelled"].map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange(setStatusFilter)(status)}
                className={`text-[10px] h-10 capitalize ${
                  statusFilter === status
                    ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                    : "bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E]"
                }`}
              >
                {status === "all" ? "All Status" : status}
                {status === "expiring" && expiringCount > 0 && (
                  <span className="ml-1 bg-amber-500/20 text-amber-400 text-[8px] px-1 rounded-sm font-bold">{expiringCount}</span>
                )}
              </Button>
            ))}
            <div className="w-px bg-[#162520] hidden md:block" />
            {/* Plan Filters */}
            {["all", "scout", "advocate", "builder"].map((plan) => (
              <Button
                key={`plan-${plan}`}
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange(setPlanFilter)(plan)}
                className={`text-[10px] h-10 capitalize ${
                  planFilter === plan
                    ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                    : "bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E]"
                }`}
              >
                {plan === "all" ? "All Plans" : PLAN_LABELS[plan]}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* ── Subscriptions Table ── */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden bg-[#0A1C16] border-[#162520]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#162520] hover:bg-transparent">
                  <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Subscriber</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Plan</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Amount</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Renewal</TableHead>
                  <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((sub) => {
                  const planColor = COLOR_MAP[sub.plan];
                  return (
                    <TableRow key={sub.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div>
                          <span className="text-xs font-bold text-white block">{sub.user}</span>
                          <span className="text-[10px] text-[#8A9690]">{sub.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${planColor.bg} ${planColor.text} ${planColor.border} hover:${planColor.bg}`}>
                          {PLAN_LABELS[sub.plan]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-white">{sub.amount}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          sub.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                            : sub.status === "expiring"
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                              : "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20"
                        }`}>
                          {sub.status === "active" && <CheckCircle className="w-2.5 h-2.5 mr-0.5" />}
                          {sub.status === "expiring" && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                          {sub.status === "cancelled" && <XCircle className="w-2.5 h-2.5 mr-0.5" />}
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.renewalDate ? (
                          <span className="text-xs text-[#8A9690] flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(sub.renewalDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#8A9690] italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Upgrade (not for builders or cancelled) */}
                          {sub.plan !== "builder" && sub.status !== "cancelled" && (
                            <Button
                              onClick={() => handleUpgrade(sub.id)}
                              disabled={!!actionLoading[sub.id]}
                              className="bg-amber-600/15 hover:bg-amber-600/25 text-amber-400 border border-amber-600/25 text-[9px] font-bold h-7 px-2 gap-1"
                              size="xs"
                            >
                              {actionLoading[sub.id] === "upgrade" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <><ArrowUpRight className="w-3 h-3" /> Upgrade</>
                              )}
                            </Button>
                          )}
                          {/* Cancel (active/expiring only) */}
                          {(sub.status === "active" || sub.status === "expiring") && (
                            <Button
                              onClick={() => handleCancel(sub.id)}
                              disabled={!!actionLoading[sub.id]}
                              className="bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-600/25 text-[9px] font-bold h-7 px-2 gap-1"
                              size="xs"
                            >
                              {actionLoading[sub.id] === "cancel" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <><Ban className="w-3 h-3" /> Cancel</>
                              )}
                            </Button>
                          )}
                          {/* Renew (cancelled/expiring only) */}
                          {(sub.status === "cancelled" || sub.status === "expiring") && (
                            <Button
                              onClick={() => handleRenew(sub.id)}
                              disabled={!!actionLoading[sub.id]}
                              className="bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-600/25 text-[9px] font-bold h-7 px-2 gap-1"
                              size="xs"
                            >
                              {actionLoading[sub.id] === "renew" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <><RefreshCw className="w-3 h-3" /> Renew</>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {paginated.length === 0 && (
              <div className="text-center py-12">
                <CreditCard className="w-8 h-8 text-[#8A9690]/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#8A9690]">No subscriptions match your search criteria.</p>
              </div>
            )}

            {/* ── Pagination ── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#162520]">
              <p className="text-[10px] text-[#8A9690] font-semibold">
                Showing {((safePage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} subscriptions
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="w-8 h-8 p-0 bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E] disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 p-0 text-[10px] font-bold ${
                      page === safePage
                        ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                        : "bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E]"
                    }`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="w-8 h-8 p-0 bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E] disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Stripe Integration Status ── */}
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
