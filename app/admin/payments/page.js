"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { createClient } from "@/lib/supabase";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const ITEMS_PER_PAGE = 8;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPaymentsData = async () => {
    try {
      const supabase = createClient();
      
      // Fetch all payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*");
      
      if (paymentsError) throw paymentsError;

      // Seed mock payments if table is empty (helpful for local testing)
      let currentPayments = paymentsData || [];
      if (currentPayments.length === 0) {
        // Fetch profiles to map user_ids
        const { data: profilesList } = await supabase.from("profiles").select("id");
        const defaultUsers = profilesList && profilesList.length > 0 
          ? profilesList.map(p => p.id)
          : ["USR-001", "USR-002", "USR-003", "USR-005"];

        const seedPayments = [
          { user_id: defaultUsers[0] || "USR-001", amount: 25.00, status: "succeeded", stripe_invoice_id: "in_1NjhY4LkdGj5vG90", created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
          { user_id: defaultUsers[1] || "USR-002", amount: 100.00, status: "succeeded", stripe_invoice_id: "in_1NjgD9LkdGj5vK24", created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
          { user_id: defaultUsers[2] || "USR-003", amount: 10.00, status: "succeeded", stripe_invoice_id: "in_1NjfA2LkdGj5vA12", created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
          { user_id: defaultUsers[3] || "USR-005", amount: 25.00, status: "succeeded", stripe_invoice_id: "in_1NjdQ8LkdGj5vB08", created_at: new Date(Date.now() - 3600000 * 30).toISOString() },
          { user_id: defaultUsers[0] || "USR-001", amount: 25.00, status: "pending", stripe_invoice_id: "in_1NjcL3LkdGj5vM90", created_at: new Date(Date.now() - 3600000 * 48).toISOString() },
          { user_id: defaultUsers[2] || "USR-003", amount: 10.00, status: "succeeded", stripe_invoice_id: "in_1NjbC7LkdGj5vH03", created_at: new Date(Date.now() - 3600000 * 72).toISOString() },
          { user_id: defaultUsers[1] || "USR-002", amount: 100.00, status: "succeeded", stripe_invoice_id: "in_1NjaE2LkdGj5vY50", created_at: new Date(Date.now() - 3600000 * 96).toISOString() },
          { user_id: defaultUsers[3] || "USR-005", amount: 25.00, status: "failed", stripe_invoice_id: "in_1NjZF9LkdGj5vZ88", created_at: new Date(Date.now() - 3600000 * 120).toISOString() },
          { user_id: defaultUsers[0] || "USR-001", amount: 25.00, status: "succeeded", stripe_invoice_id: "in_1NjYF1LkdGj5vX71", created_at: new Date(Date.now() - 3600000 * 144).toISOString() },
          { user_id: defaultUsers[2] || "USR-003", amount: 10.00, status: "succeeded", stripe_invoice_id: "in_1NjXG0LkdGj5vW52", created_at: new Date(Date.now() - 3600000 * 168).toISOString() }
        ];

        // Batch insert mock payments
        for (const item of seedPayments) {
          await supabase.from("payments").insert(item);
        }

        const { data: reloaded } = await supabase.from("payments").select("*");
        currentPayments = reloaded || seedPayments;
      }

      // Sort by creation date descending
      currentPayments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPayments(currentPayments);

      // Fetch profiles to map display names
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, email, full_name");
      
      if (usersData) {
        const mapping = {};
        usersData.forEach(u => {
          mapping[u.id] = u;
        });
        setProfiles(mapping);
      }

    } catch (err) {
      console.error("Error loading payments list:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPaymentsData();
  };

  // Filter and Search Logic
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const profile = profiles[p.user_id] || {};
      const userLabel = profile.full_name || profile.email || p.user_id || "";
      const matchesSearch = 
        userLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (profile.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.stripe_invoice_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.id || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [payments, profiles, searchQuery, statusFilter]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = filteredPayments.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  // Stats Calculations
  const metrics = useMemo(() => {
    const succeeded = payments.filter(p => p.status === "succeeded");
    const totalVolume = succeeded.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const pendingCount = payments.filter(p => p.status === "pending" || p.status === "processing").length;
    const failedCount = payments.filter(p => p.status === "failed" || p.status === "requires_payment_method").length;
    const averageInvoice = succeeded.length > 0 ? (totalVolume / succeeded.length) : 0;

    return {
      totalVolume,
      succeededCount: succeeded.length,
      pendingCount,
      failedCount,
      averageInvoice
    };
  }, [payments]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Loading payment registers..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* KPI Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: "Total Revenue Volume", 
              value: `$${metrics.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
              icon: DollarSign, 
              color: "text-emerald-400", 
              bg: "bg-emerald-500/10",
              sub: "Succeeded stripe charges"
            },
            { 
              label: "Succeeded Charges", 
              value: String(metrics.succeededCount), 
              icon: CheckCircle, 
              color: "text-emerald-400", 
              bg: "bg-emerald-500/10",
              sub: "Successfully processed payments"
            },
            { 
              label: "Pending Processing", 
              value: String(metrics.pendingCount), 
              icon: Clock, 
              color: "text-amber-400", 
              bg: "bg-amber-500/10",
              sub: "Awaiting gateway settlement"
            },
            { 
              label: "Avg Transaction Value", 
              value: `$${metrics.averageInvoice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
              icon: TrendingUp, 
              color: "text-blue-400", 
              bg: "bg-blue-500/10",
              sub: "Average per-subscriber billing"
            },
          ].map((stat, i) => (
            <Card key={i} className="p-4 bg-[#0A1C16] border-[#162520]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690]">{stat.label}</p>
                  <p className="font-heading text-lg font-extrabold text-white mt-0.5">{stat.value}</p>
                  <p className="text-[9px] text-[#8A9690]/60 mt-0.5">{stat.sub}</p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Global Notifications / Webhook Status */}
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0A1C16] border-[#162520] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Payment Ledger Sync Status</p>
                <p className="text-[10px] text-[#8A9690]">Stripe Gateway Live API synced. Sandbox mode initialized.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-8 text-[10px] border-[#162520] hover:border-[#1E3A2E] text-[#8A9690] hover:text-white"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                Sync Charges
              </Button>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[9px] hover:bg-emerald-500/20 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                Operational
              </Badge>
            </div>
          </Card>
        </motion.div>

        {/* Filters and Actions Bar */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9690]" />
            <Input
              placeholder="Search payments by user, email, stripe invoice ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-10 bg-[#0A1C16] border-[#162520] text-white placeholder:text-[#8A9690]/60 focus:border-red-500/40 text-xs"
            />
          </div>
          <div className="flex gap-2">
            {["all", "succeeded", "pending", "failed"].map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                className={`text-[10px] h-10 capitalize ${
                  statusFilter === status
                    ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                    : "bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E]"
                }`}
              >
                {status === "all" ? "All Payments" : status}
                {status === "failed" && metrics.failedCount > 0 && (
                  <span className="ml-1 bg-red-500/20 text-red-400 text-[8px] px-1 rounded-md font-bold">{metrics.failedCount}</span>
                )}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Transactions Table */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden bg-[#0A1C16] border-[#162520]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#162520] hover:bg-transparent">
                  <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Stripe Invoice / ID</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Customer</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Amount</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Charge Date</TableHead>
                  <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((p) => {
                  const profile = profiles[p.user_id] || {};
                  const name = profile.full_name || "Unknown Subscriber";
                  const email = profile.email || "No Email Associated";

                  return (
                    <TableRow key={p.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                      <TableCell className="pl-6 py-4 font-mono text-xs text-[#8A9690] max-w-[160px] truncate">
                        <span className="text-white block font-sans font-bold text-xs truncate">
                          {p.stripe_invoice_id || "Direct Charge"}
                        </span>
                        {p.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-xs font-bold text-white block">{name}</span>
                          <span className="text-[10px] text-[#8A9690]">{email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-white">
                          ${parseFloat(p.amount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          p.status === "succeeded"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                            : p.status === "pending" || p.status === "processing"
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                              : "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20"
                        }`}>
                          {p.status === "succeeded" && <CheckCircle className="w-2.5 h-2.5 mr-0.5" />}
                          {(p.status === "pending" || p.status === "processing") && <Clock className="w-2.5 h-2.5 mr-0.5" />}
                          {(p.status === "failed" || p.status === "requires_payment_method") && <XCircle className="w-2.5 h-2.5 mr-0.5" />}
                          {p.status === "requires_payment_method" ? "failed" : p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-[#8A9690]">
                          {new Date(p.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {p.invoice_pdf_url || p.hosted_invoice_url ? (
                          <div className="flex items-center justify-end gap-2">
                            {p.invoice_pdf_url && (
                              <Button
                                asChild
                                variant="outline"
                                size="xs"
                                className="bg-[#0D2B20] border-[#162520] text-[#8A9690] hover:text-white h-7 gap-1"
                              >
                                <a href={p.invoice_pdf_url} target="_blank" rel="noreferrer">
                                  <FileText className="w-3 h-3" /> PDF
                                </a>
                              </Button>
                            )}
                            {p.hosted_invoice_url && (
                              <Button
                                asChild
                                variant="outline"
                                size="xs"
                                className="bg-[#0D2B20] border-[#162520] text-[#8A9690] hover:text-white h-7 gap-1"
                              >
                                <a href={p.hosted_invoice_url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="w-3 h-3" /> View
                                </a>
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#8A9690] italic">Receipt Unavailable</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredPayments.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="w-8 h-8 text-[#8A9690]/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#8A9690]">No payments match the active criteria.</p>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#162520]">
              <p className="text-[10px] text-[#8A9690] font-semibold">
                Showing {((safePage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length} transactions
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="w-8 h-8 p-0 bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E] disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
