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
  Heart,
  Plus,
  Eye,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  Shield,
  Globe,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const CHARITIES = [
  { id: "CH-01", name: "Acres of Green", category: "Environment", status: "Active", auditorScore: "9.8", spendingRatio: "96.4%", allocations: 248, totalFunded: "$12,400" },
  { id: "CH-02", name: "Apex Water Initiative", category: "Clean Water", status: "Active", auditorScore: "9.9", spendingRatio: "98.1%", allocations: 312, totalFunded: "$18,200" },
  { id: "CH-03", name: "Empower Global Edu", category: "Education", status: "Active", auditorScore: "9.7", spendingRatio: "95.5%", allocations: 186, totalFunded: "$8,900" },
  { id: "CH-04", name: "BioGen Health Corps", category: "Healthcare", status: "Active", auditorScore: "9.5", spendingRatio: "94.2%", allocations: 142, totalFunded: "$7,100" },
  { id: "CH-05", name: "Eco Shelter Solutions", category: "Housing", status: "Pending Vetting", auditorScore: "—", spendingRatio: "—", allocations: 0, totalFunded: "$0" },
  { id: "CH-06", name: "Marine Conservation Trust", category: "Ocean", status: "Pending Vetting", auditorScore: "—", spendingRatio: "—", allocations: 0, totalFunded: "$0" },
];

const CATEGORIES = ["All", "Environment", "Clean Water", "Education", "Healthcare", "Housing", "Ocean"];

export default function AdminCharitiesPage() {
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filtered = categoryFilter === "All"
    ? CHARITIES
    : CHARITIES.filter((c) => c.category === categoryFilter);

  const activeCount = CHARITIES.filter(c => c.status === "Active").length;
  const pendingCount = CHARITIES.filter(c => c.status === "Pending Vetting").length;

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
            { label: "Total Charities", value: String(CHARITIES.length), icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10" },
            { label: "Active", value: String(activeCount), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Pending Vetting", value: String(pendingCount), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Total Funded", value: "$46,600", icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
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

        {/* Filter & Actions Bar */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant="outline"
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className={`text-[10px] h-8 ${
                  categoryFilter === cat
                    ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                    : "bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E]"
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>
          <Button
            className="bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-bold h-9 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Onboard Charity
          </Button>
        </motion.div>

        {/* Charities Table */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden bg-[#0A1C16] border-[#162520]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#162520] hover:bg-transparent">
                  <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Charity</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Category</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Auditor Score</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Spending Ratio</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Allocations</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((charity) => (
                  <TableRow key={charity.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                          <Heart className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{charity.name}</span>
                          <span className="text-[10px] text-[#8A9690] font-mono">{charity.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-[#0D2B20] text-[#8A9690] border-[#162520] text-[9px] hover:bg-[#0D2B20]">
                        <Globe className="w-2.5 h-2.5 mr-0.5" /> {charity.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {charity.auditorScore !== "—" ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-bold text-white">{charity.auditorScore}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#8A9690] italic">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {charity.spendingRatio !== "—" ? (
                        <span className="text-xs font-semibold text-emerald-400">{charity.spendingRatio}</span>
                      ) : (
                        <span className="text-xs text-[#8A9690] italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-white">{charity.allocations}</span>
                      <span className="text-[10px] text-[#8A9690] ml-1">users</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] ${
                        charity.status === "Active"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                      }`}>
                        {charity.status === "Active" ? <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> : <Clock className="w-2.5 h-2.5 mr-0.5" />}
                        {charity.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button className="w-7 h-7 rounded-sm flex items-center justify-center text-[#8A9690] hover:text-white hover:bg-[#0D2B20] transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-sm flex items-center justify-center text-[#8A9690] hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-sm flex items-center justify-center text-[#8A9690] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </motion.div>

        {/* Audit Integrity Note */}
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0A1C16] border-[#162520] p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">Audit Integrity Protocol</p>
                <p className="text-[10px] text-[#8A9690] mt-0.5">All charities undergo third-party financial and impact auditing before activation. Spending ratios are verified quarterly.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
