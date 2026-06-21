"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Trophy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Eye,
  Users,
  Award,
  Loader2,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const INITIAL_CLAIMS = [
  { id: "CLM-001", user: "hiroshi.t@email.com", draw: "Patagonia Eco-Retreat", ticket: "FND-884-92K", category: "5 Match", matches: 5, screenshot: "https://imgur.com/ticket-884.png", submitted: "2026-06-20", status: "pending" },
  { id: "CLM-002", user: "marcus.k@email.com", draw: "Solar Tech Bundle", ticket: "FND-712-X4B", category: "4 Match", matches: 4, screenshot: "https://imgur.com/ticket-712.png", submitted: "2026-05-30", status: "approved" },
  { id: "CLM-003", user: "elena.r@email.com", draw: "Solar Tech Bundle", ticket: "FND-556-P8M", category: "3 Match", matches: 3, screenshot: "https://imgur.com/ticket-556.png", submitted: "2026-05-29", status: "paid" },
  { id: "CLM-004", user: "yuki.s@email.com", draw: "Reforestation Journey", ticket: "FND-401-K2R", category: "3 Match", matches: 3, screenshot: "https://imgur.com/ticket-401.png", submitted: "2026-04-28", status: "rejected" },
  { id: "CLM-005", user: "sarah.c@email.com", draw: "Patagonia Eco-Retreat", ticket: "FND-195-Q7T", category: "4 Match", matches: 4, screenshot: "https://imgur.com/ticket-195.png", submitted: "2026-06-21", status: "pending" },
];

const STATUS_STYLES = {
  pending: { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20", icon: Clock },
  approved: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20", icon: CheckCircle },
  paid: { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20", icon: DollarSign },
  rejected: { badge: "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20", icon: XCircle },
};

export default function AdminWinnersPage() {
  const [claims, setClaims] = useState(INITIAL_CLAIMS);
  const [statusFilter, setStatusFilter] = useState("all");
  const [processing, setProcessing] = useState({});

  const handleReview = (claimId, newStatus) => {
    setProcessing(prev => ({ ...prev, [claimId]: true }));
    setTimeout(() => {
      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: newStatus } : c));
      setProcessing(prev => ({ ...prev, [claimId]: false }));
    }, 800);
  };

  const filtered = statusFilter === "all"
    ? claims
    : claims.filter(c => c.status === statusFilter);

  const pendingCount = claims.filter(c => c.status === "pending").length;
  const approvedCount = claims.filter(c => c.status === "approved").length;
  const paidCount = claims.filter(c => c.status === "paid").length;

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
            { label: "Total Claims", value: String(claims.length), icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Pending Review", value: String(pendingCount), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Approved", value: String(approvedCount), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Disbursed", value: String(paidCount), icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10" },
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

        {/* Filter Tabs */}
        <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "paid", "rejected"].map((status) => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={`text-[10px] h-8 capitalize ${
                statusFilter === status
                  ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                  : "bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E]"
              }`}
            >
              {status === "all" ? "All Claims" : status}
              {status === "pending" && pendingCount > 0 && (
                <span className="ml-1 bg-amber-500/20 text-amber-400 text-[8px] px-1 py-0 rounded-sm font-bold">{pendingCount}</span>
              )}
            </Button>
          ))}
        </motion.div>

        {/* Claims Table */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden bg-[#0A1C16] border-[#162520]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#162520] hover:bg-transparent">
                  <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Claim</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">User</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Draw</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Category</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Evidence</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((claim) => {
                  const statusStyle = STATUS_STYLES[claim.status];
                  const StatusIcon = statusStyle.icon;
                  return (
                    <TableRow key={claim.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div>
                          <span className="text-xs font-bold text-white font-mono block">{claim.id}</span>
                          <span className="text-[10px] text-[#8A9690]">Ticket: {claim.ticket}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-white font-semibold">{claim.user}</TableCell>
                      <TableCell className="text-xs text-[#8A9690]">{claim.draw}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          claim.matches === 5 ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20" :
                          claim.matches === 4 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20" :
                          "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20"
                        }`}>
                          <Award className="w-2.5 h-2.5 mr-0.5" /> {claim.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <a
                          href={claim.screenshot}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-red-400 hover:underline inline-flex items-center gap-0.5"
                        >
                          View Screenshot <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${statusStyle.badge}`}>
                          <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {claim.status === "pending" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleReview(claim.id, "approved")}
                              disabled={processing[claim.id]}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 text-[9px] font-bold h-7 px-2.5"
                              size="xs"
                            >
                              {processing[claim.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
                            </Button>
                            <Button
                              onClick={() => handleReview(claim.id, "rejected")}
                              disabled={processing[claim.id]}
                              className="bg-red-600 hover:bg-red-500 text-white border-0 text-[9px] font-bold h-7 px-2.5"
                              size="xs"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {claim.status === "approved" && (
                          <Button
                            onClick={() => handleReview(claim.id, "paid")}
                            disabled={processing[claim.id]}
                            className="bg-blue-600 hover:bg-blue-500 text-white border-0 text-[9px] font-bold h-7 px-2.5"
                            size="xs"
                          >
                            {processing[claim.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : "Mark Paid"}
                          </Button>
                        )}
                        {(claim.status === "paid" || claim.status === "rejected") && (
                          <Badge className="bg-[#0D2B20] text-[#8A9690] border-[#162520] text-[9px] hover:bg-[#0D2B20]">
                            Finalized
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="w-8 h-8 text-[#8A9690]/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#8A9690]">No claims match the selected filter.</p>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
