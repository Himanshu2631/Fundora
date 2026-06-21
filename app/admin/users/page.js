"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Filter,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Calendar,
  MoreHorizontal,
  Eye,
  UserCog,
  TrendingUp,
  UserPlus,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const MOCK_USERS = [
  { id: "USR-001", name: "Marcus Klein", email: "marcus.k@email.com", role: "user", plan: "advocate", score: 490, joinedAt: "2025-11-18", status: "active" },
  { id: "USR-002", name: "Elena Rodriguez", email: "elena.r@email.com", role: "user", plan: "builder", score: 420, joinedAt: "2025-12-05", status: "active" },
  { id: "USR-003", name: "Yuki Shimizu", email: "yuki.s@email.com", role: "user", plan: "scout", score: 380, joinedAt: "2026-01-14", status: "active" },
  { id: "USR-004", name: "Admin Fundora", email: "admin@fundora.io", role: "admin", plan: "builder", score: 1200, joinedAt: "2025-10-01", status: "active" },
  { id: "USR-005", name: "Hiroshi Tanaka", email: "hiroshi.t@email.com", role: "user", plan: "advocate", score: 310, joinedAt: "2026-02-20", status: "active" },
  { id: "USR-006", name: "Sarah Chen", email: "sarah.c@email.com", role: "user", plan: "scout", score: 180, joinedAt: "2026-03-10", status: "active" },
  { id: "USR-007", name: "David Okafor", email: "david.o@email.com", role: "user", plan: null, score: 0, joinedAt: "2026-04-22", status: "inactive" },
  { id: "USR-008", name: "Maya Patel", email: "maya.p@email.com", role: "user", plan: "advocate", score: 275, joinedAt: "2026-03-28", status: "active" },
];

const PLAN_LABELS = { scout: "Eco Scout", advocate: "Global Advocate", builder: "Legacy Builder" };
const PLAN_COLORS = { scout: "outline", advocate: "accent", builder: "default" };

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = MOCK_USERS.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Quick Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: "1,248", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Active Members", value: "1,198", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Admins", value: "3", icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10" },
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

        {/* Search & Filters */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9690]" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-[#0A1C16] border-[#162520] text-white placeholder:text-[#8A9690]/60 focus:border-red-500/40 text-xs"
            />
          </div>
          <div className="flex gap-2">
            {["all", "user", "admin"].map((role) => (
              <Button
                key={role}
                variant={roleFilter === role ? "default" : "outline"}
                size="sm"
                onClick={() => setRoleFilter(role)}
                className={`text-xs capitalize h-10 ${
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

        {/* Users Table */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden bg-[#0A1C16] border-[#162520]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#162520] hover:bg-transparent">
                  <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">User</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Role</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Plan</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Score</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Joined</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0D2B20] border border-[#162520] flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{user.name}</span>
                          <span className="text-[10px] text-[#8A9690] flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5" /> {user.email}
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
                        <Badge className="bg-[#0D2B20] text-[#8A9690] border-[#162520] text-[9px] hover:bg-[#0D2B20]">
                          User
                        </Badge>
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
                      <span className="text-xs font-bold text-white font-mono">{user.score}</span>
                      <span className="text-[10px] text-[#8A9690] ml-0.5">pts</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-[#8A9690] flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(user.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] ${
                        user.status === "active"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                          : "bg-[#0D2B20] text-[#8A9690] border-[#162520] hover:bg-[#0D2B20]"
                      }`}>
                        {user.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />}
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button className="w-7 h-7 rounded-sm flex items-center justify-center text-[#8A9690] hover:text-white hover:bg-[#0D2B20] transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-sm flex items-center justify-center text-[#8A9690] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <UserCog className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-8 h-8 text-[#8A9690]/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#8A9690]">No users match your search criteria.</p>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
