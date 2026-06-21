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
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Calendar,
  Eye,
  UserCog,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  Ban,
  RotateCw,
  Loader2,
  CheckCircle,
  Trophy,
  Ticket,
  Heart,
  CreditCard,
  ArrowRight,
  Clock,
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

const generateUsers = () => [
  { id: "USR-001", name: "Marcus Klein", email: "marcus.k@email.com", role: "user", plan: "advocate", score: 490, joinedAt: "2025-11-18", status: "active", scores: 5, charities: 2, tickets: 3 },
  { id: "USR-002", name: "Elena Rodriguez", email: "elena.r@email.com", role: "user", plan: "builder", score: 420, joinedAt: "2025-12-05", status: "active", scores: 4, charities: 3, tickets: 5 },
  { id: "USR-003", name: "Yuki Shimizu", email: "yuki.s@email.com", role: "user", plan: "scout", score: 380, joinedAt: "2026-01-14", status: "active", scores: 5, charities: 1, tickets: 1 },
  { id: "USR-004", name: "Admin Fundora", email: "admin@fundora.io", role: "admin", plan: "builder", score: 1200, joinedAt: "2025-10-01", status: "active", scores: 5, charities: 4, tickets: 8 },
  { id: "USR-005", name: "Hiroshi Tanaka", email: "hiroshi.t@email.com", role: "user", plan: "advocate", score: 310, joinedAt: "2026-02-20", status: "active", scores: 3, charities: 2, tickets: 2 },
  { id: "USR-006", name: "Sarah Chen", email: "sarah.c@email.com", role: "user", plan: "scout", score: 180, joinedAt: "2026-03-10", status: "active", scores: 2, charities: 1, tickets: 1 },
  { id: "USR-007", name: "David Okafor", email: "david.o@email.com", role: "user", plan: null, score: 0, joinedAt: "2026-04-22", status: "inactive", scores: 0, charities: 0, tickets: 0 },
  { id: "USR-008", name: "Maya Patel", email: "maya.p@email.com", role: "user", plan: "advocate", score: 275, joinedAt: "2026-03-28", status: "active", scores: 3, charities: 2, tickets: 2 },
  { id: "USR-009", name: "Lucas Ferreira", email: "lucas.f@email.com", role: "user", plan: "scout", score: 140, joinedAt: "2026-04-05", status: "suspended", scores: 1, charities: 0, tickets: 0 },
  { id: "USR-010", name: "Amara Diallo", email: "amara.d@email.com", role: "user", plan: "builder", score: 520, joinedAt: "2025-11-30", status: "active", scores: 5, charities: 3, tickets: 6 },
  { id: "USR-011", name: "Liam O'Brien", email: "liam.o@email.com", role: "user", plan: "advocate", score: 340, joinedAt: "2026-01-22", status: "active", scores: 4, charities: 2, tickets: 3 },
  { id: "USR-012", name: "Nina Petrov", email: "nina.p@email.com", role: "user", plan: "scout", score: 95, joinedAt: "2026-05-10", status: "active", scores: 1, charities: 1, tickets: 1 },
  { id: "USR-013", name: "Carlos Mendez", email: "carlos.m@email.com", role: "user", plan: null, score: 0, joinedAt: "2026-05-28", status: "inactive", scores: 0, charities: 0, tickets: 0 },
  { id: "USR-014", name: "Aiko Yamamoto", email: "aiko.y@email.com", role: "user", plan: "advocate", score: 260, joinedAt: "2026-02-14", status: "active", scores: 3, charities: 1, tickets: 2 },
  { id: "USR-015", name: "James Whitfield", email: "james.w@email.com", role: "user", plan: "builder", score: 480, joinedAt: "2025-12-18", status: "suspended", scores: 5, charities: 2, tickets: 4 },
  { id: "USR-016", name: "Fatima Al-Hassan", email: "fatima.a@email.com", role: "user", plan: "scout", score: 210, joinedAt: "2026-03-02", status: "active", scores: 2, charities: 1, tickets: 1 },
];

const ITEMS_PER_PAGE = 8;

export default function AdminUsersPage() {
  const [users, setUsers] = useState(generateUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [actionFeedback, setActionFeedback] = useState(null);

  // ── Filtering ──
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  // ── Actions ──
  const handleSuspend = (userId) => {
    setActionLoading((prev) => ({ ...prev, [userId]: "suspend" }));
    setTimeout(() => {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "suspended" } : u));
      setActionLoading((prev) => ({ ...prev, [userId]: null }));
      setActionFeedback({ type: "success", message: `User ${userId} has been suspended.` });
      if (selectedUser?.id === userId) setSelectedUser((prev) => ({ ...prev, status: "suspended" }));
      setTimeout(() => setActionFeedback(null), 4000);
    }, 600);
  };

  const handleReactivate = (userId) => {
    setActionLoading((prev) => ({ ...prev, [userId]: "reactivate" }));
    setTimeout(() => {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "active" } : u));
      setActionLoading((prev) => ({ ...prev, [userId]: null }));
      setActionFeedback({ type: "success", message: `User ${userId} has been reactivated.` });
      if (selectedUser?.id === userId) setSelectedUser((prev) => ({ ...prev, status: "active" }));
      setTimeout(() => setActionFeedback(null), 4000);
    }, 600);
  };

  // ── Stats ──
  const activeCount = users.filter((u) => u.status === "active").length;
  const suspendedCount = users.filter((u) => u.status === "suspended").length;
  const inactiveCount = users.filter((u) => u.status === "inactive").length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* ── Quick Stats ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: String(users.length), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Active", value: String(activeCount), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Suspended", value: String(suspendedCount), icon: Ban, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "New This Month", value: "+47", icon: UserPlus, color: "text-amber-400", bg: "bg-amber-500/10" },
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

        {/* ── Action Feedback Alert ── */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
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
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-10 bg-[#0A1C16] border-[#162520] text-white placeholder:text-[#8A9690]/60 focus:border-red-500/40 text-xs"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Status Filters */}
            {["all", "active", "suspended", "inactive"].map((status) => (
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
              </Button>
            ))}
            {/* Role Divider + Filter */}
            <div className="w-px bg-[#162520] hidden md:block" />
            {["all", "user", "admin"].map((role) => (
              <Button
                key={`role-${role}`}
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange(setRoleFilter)(role)}
                className={`text-[10px] h-10 capitalize ${
                  roleFilter === role
                    ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                    : "bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E]"
                }`}
              >
                {role === "all" ? "All Roles" : role}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* ── Main Layout: Table + Detail Panel ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Users Table */}
          <div className={selectedUser ? "lg:col-span-7" : "lg:col-span-12"}>
            <Card className="overflow-hidden bg-[#0A1C16] border-[#162520]">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#162520] hover:bg-transparent">
                    <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">User</TableHead>
                    <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Role</TableHead>
                    <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Plan</TableHead>
                    <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                    <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Joined</TableHead>
                    <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((user) => (
                    <TableRow
                      key={user.id}
                      className={`border-[#162520] transition-colors cursor-pointer ${
                        selectedUser?.id === user.id
                          ? "bg-red-600/8 hover:bg-red-600/12"
                          : "hover:bg-[#0D2B20]/30"
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ${
                            user.status === "suspended"
                              ? "bg-red-600/10 border-red-600/20 text-red-400"
                              : user.status === "inactive"
                                ? "bg-[#0D2B20] border-[#162520] text-[#8A9690]"
                                : "bg-[#0D2B20] border-[#162520] text-white"
                          }`}>
                            {user.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{user.name}</span>
                            <span className="text-[10px] text-[#8A9690] flex items-center gap-1 truncate">
                              <Mail className="w-2.5 h-2.5 shrink-0" /> {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge className="bg-red-600/15 text-red-400 border-red-600/25 text-[9px] hover:bg-red-600/20">
                            <ShieldAlert className="w-2.5 h-2.5 mr-0.5" /> Admin
                          </Badge>
                        ) : (
                          <Badge className="bg-[#0D2B20] text-[#8A9690] border-[#162520] text-[9px] hover:bg-[#0D2B20]">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.plan ? (
                          <span className="text-xs font-semibold text-white">{PLAN_LABELS[user.plan]}</span>
                        ) : (
                          <span className="text-xs text-[#8A9690] italic">No plan</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          user.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                            : user.status === "suspended"
                              ? "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20"
                              : "bg-[#0D2B20] text-[#8A9690] border-[#162520] hover:bg-[#0D2B20]"
                        }`}>
                          {user.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />}
                          {user.status === "suspended" && <Ban className="w-2.5 h-2.5 mr-0.5" />}
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-[#8A9690] flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(user.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="w-7 h-7 rounded-sm flex items-center justify-center text-[#8A9690] hover:text-white hover:bg-[#0D2B20] transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {user.status === "active" && user.role !== "admin" && (
                            <button
                              onClick={() => handleSuspend(user.id)}
                              disabled={actionLoading[user.id] === "suspend"}
                              className="w-7 h-7 rounded-sm flex items-center justify-center text-[#8A9690] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                              title="Suspend User"
                            >
                              {actionLoading[user.id] === "suspend" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Ban className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          {user.status === "suspended" && (
                            <button
                              onClick={() => handleReactivate(user.id)}
                              disabled={actionLoading[user.id] === "reactivate"}
                              className="w-7 h-7 rounded-sm flex items-center justify-center text-[#8A9690] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                              title="Reactivate User"
                            >
                              {actionLoading[user.id] === "reactivate" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {paginated.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-8 h-8 text-[#8A9690]/30 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#8A9690]">No users match your search criteria.</p>
                </div>
              )}

              {/* ── Pagination Controls ── */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#162520]">
                <p className="text-[10px] text-[#8A9690] font-semibold">
                  Showing {((safePage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} users
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
          </div>

          {/* ── User Detail Panel (Sidebar) ── */}
          <AnimatePresence>
            {selectedUser && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: "spring", stiffness: 200, damping: 22 }}
                className="lg:col-span-5"
              >
                <Card className="bg-[#0A1C16] border-[#162520] overflow-hidden">
                  {/* Detail Header */}
                  <div className="p-5 border-b border-[#162520] flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-base font-bold uppercase ${
                        selectedUser.status === "suspended"
                          ? "bg-red-600/10 border-red-600/30 text-red-400"
                          : selectedUser.status === "inactive"
                            ? "bg-[#0D2B20] border-[#162520] text-[#8A9690]"
                            : "bg-[#0D2B20] border-emerald-500/30 text-white"
                      }`}>
                        {selectedUser.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-white">{selectedUser.name}</h3>
                        <p className="text-[10px] text-[#8A9690] flex items-center gap-1 mt-0.5">
                          <Mail className="w-2.5 h-2.5" /> {selectedUser.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge className={`text-[8px] py-0 px-1.5 ${
                            selectedUser.status === "active"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                              : selectedUser.status === "suspended"
                                ? "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20"
                                : "bg-[#0D2B20] text-[#8A9690] border-[#162520] hover:bg-[#0D2B20]"
                          }`}>
                            {selectedUser.status}
                          </Badge>
                          {selectedUser.role === "admin" && (
                            <Badge className="bg-red-600/15 text-red-400 border-red-600/25 text-[8px] py-0 px-1.5 hover:bg-red-600/20">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="w-7 h-7 rounded-sm flex items-center justify-center text-[#8A9690] hover:text-white hover:bg-[#0D2B20] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <CardContent className="p-5 space-y-5">
                    {/* User Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Giving Score", value: `${selectedUser.score} pts`, icon: Trophy, color: "text-amber-400" },
                        { label: "Golf Scores", value: `${selectedUser.scores} / 5`, icon: Trophy, color: "text-blue-400" },
                        { label: "Charities", value: String(selectedUser.charities), icon: Heart, color: "text-rose-400" },
                        { label: "Draw Tickets", value: String(selectedUser.tickets), icon: Ticket, color: "text-emerald-400" },
                      ].map((metric) => (
                        <div key={metric.label} className="p-3 bg-[#0D2B20]/30 border border-[#162520] rounded-sm text-center">
                          <metric.icon className={`w-3.5 h-3.5 ${metric.color} mx-auto mb-1`} />
                          <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690]">{metric.label}</p>
                          <p className="font-heading text-sm font-extrabold text-white mt-0.5">{metric.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Detail Row Items */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs py-2 border-b border-[#162520]/60">
                        <span className="text-[#8A9690] font-semibold flex items-center gap-1.5">
                          <Mail className="w-3 h-3" /> Email
                        </span>
                        <span className="text-white font-bold">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-2 border-b border-[#162520]/60">
                        <span className="text-[#8A9690] font-semibold flex items-center gap-1.5">
                          <CreditCard className="w-3 h-3" /> Subscription
                        </span>
                        <span className="text-white font-bold">{selectedUser.plan ? PLAN_LABELS[selectedUser.plan] : "No Plan"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-2 border-b border-[#162520]/60">
                        <span className="text-[#8A9690] font-semibold flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> Joined
                        </span>
                        <span className="text-white font-bold">
                          {new Date(selectedUser.joinedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-2 border-b border-[#162520]/60">
                        <span className="text-[#8A9690] font-semibold flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3" /> User ID
                        </span>
                        <span className="text-white font-bold font-mono text-[11px]">{selectedUser.id}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {selectedUser.role !== "admin" && (
                      <div className="space-y-2 pt-2">
                        {selectedUser.status === "active" && (
                          <Button
                            onClick={() => handleSuspend(selectedUser.id)}
                            disabled={actionLoading[selectedUser.id] === "suspend"}
                            className="w-full bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-600/25 text-xs font-bold h-9 gap-1.5"
                          >
                            {actionLoading[selectedUser.id] === "suspend" ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                            ) : (
                              <><Ban className="w-3.5 h-3.5" /> Suspend User</>
                            )}
                          </Button>
                        )}
                        {selectedUser.status === "suspended" && (
                          <Button
                            onClick={() => handleReactivate(selectedUser.id)}
                            disabled={actionLoading[selectedUser.id] === "reactivate"}
                            className="w-full bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-600/25 text-xs font-bold h-9 gap-1.5"
                          >
                            {actionLoading[selectedUser.id] === "reactivate" ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                            ) : (
                              <><RotateCw className="w-3.5 h-3.5" /> Reactivate User</>
                            )}
                          </Button>
                        )}
                        {selectedUser.status === "inactive" && (
                          <div className="text-center py-3 text-[10px] text-[#8A9690] bg-[#0D2B20]/20 border border-[#162520] rounded-sm">
                            <Clock className="w-4 h-4 mx-auto mb-1 text-[#8A9690]/50" />
                            User has no active subscription. No admin actions available.
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
