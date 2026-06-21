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
  Ticket,
  Plus,
  Calendar,
  Users,
  Trophy,
  Sparkles,
  Play,
  CheckCircle,
  Clock,
  RotateCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const INITIAL_DRAWS = [
  { id: "DR-42", title: "Patagonia Eco-Retreat", prize: "Luxury eco-resort stay in Patagonia", date: "2026-06-24", minScore: 50, entries: 412, status: "active", month: 6, year: 2026, numbers: null },
  { id: "DR-43", title: "Custom Electric Cruiser", prize: "Rivian R1T Adventure Package", date: "2026-07-01", minScore: 120, entries: 184, status: "upcoming", month: 7, year: 2026, numbers: null },
  { id: "DR-41", title: "Solar Tech Bundle", prize: "Complete home solar starter kit", date: "2026-05-28", minScore: 30, entries: 358, status: "completed", month: 5, year: 2026, numbers: [7, 22, 38, 51, 84] },
  { id: "DR-40", title: "Reforestation Journey", prize: "Amazon conservation expedition", date: "2026-04-30", minScore: 60, entries: 290, status: "completed", month: 4, year: 2026, numbers: [12, 33, 47, 68, 91] },
];

export default function AdminDrawsPage() {
  const [draws, setDraws] = useState(INITIAL_DRAWS);
  const [triggeringId, setTriggeringId] = useState(null);
  const [resultMessage, setResultMessage] = useState(null);

  const handleTriggerDraw = (drawId) => {
    setTriggeringId(drawId);
    setResultMessage(null);
    // Simulate draw completion
    setTimeout(() => {
      const numbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 99) + 1);
      const unique = [...new Set(numbers)];
      while (unique.length < 5) unique.push(Math.floor(Math.random() * 99) + 1);

      setDraws(prev => prev.map(d =>
        d.id === drawId ? { ...d, status: "completed", numbers: unique.slice(0, 5) } : d
      ));
      setTriggeringId(null);
      setResultMessage({ drawId, numbers: unique.slice(0, 5) });
    }, 2000);
  };

  const activeCount = draws.filter(d => d.status === "active").length;
  const upcomingCount = draws.filter(d => d.status === "upcoming").length;
  const completedCount = draws.filter(d => d.status === "completed").length;
  const totalEntries = draws.reduce((sum, d) => sum + d.entries, 0);

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
            { label: "Active Draws", value: String(activeCount), icon: Play, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Upcoming", value: String(upcomingCount), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Completed", value: String(completedCount), icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Total Entries", value: totalEntries.toLocaleString(), icon: Users, color: "text-rose-400", bg: "bg-rose-500/10" },
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

        {/* Draw Trigger Result */}
        {resultMessage && (
          <motion.div variants={itemVariants}>
            <Alert className="bg-emerald-500/10 border-emerald-500/25 text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <AlertTitle className="text-xs font-bold text-white">Draw Completed Successfully!</AlertTitle>
              <AlertDescription className="text-[11px] text-[#8A9690] mt-0.5">
                Draw {resultMessage.drawId} winning numbers: {resultMessage.numbers.join(", ")}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Actions Bar */}
        <motion.div variants={itemVariants} className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Ticket className="w-4 h-4 text-red-400" />
            All Prize Draws
          </h3>
          <Button className="bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-bold h-9 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create New Draw
          </Button>
        </motion.div>

        {/* Draws Table */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden bg-[#0A1C16] border-[#162520]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#162520] hover:bg-transparent">
                  <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Draw</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Schedule</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Min Score</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Entries</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Numbers</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draws.map((draw) => (
                  <TableRow key={draw.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div>
                        <span className="text-xs font-bold text-white block">{draw.title}</span>
                        <span className="text-[10px] text-[#8A9690]">{draw.prize}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-[#8A9690] flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(draw.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-white">{draw.minScore}</span>
                      <span className="text-[10px] text-[#8A9690] ml-0.5">pts</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-white">{draw.entries}</span>
                      <span className="text-[10px] text-[#8A9690] ml-0.5">users</span>
                    </TableCell>
                    <TableCell>
                      {draw.numbers ? (
                        <div className="flex gap-1">
                          {draw.numbers.map((num, i) => (
                            <span key={i} className="w-6 h-6 rounded-full bg-[#0D2B20] border border-[#162520] text-[10px] font-bold font-mono flex items-center justify-center text-white">
                              {num}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8A9690] italic">Not drawn</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] ${
                        draw.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20" :
                        draw.status === "upcoming" ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20" :
                        "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20"
                      }`}>
                        {draw.status === "active" && <Play className="w-2.5 h-2.5 mr-0.5" />}
                        {draw.status === "upcoming" && <Clock className="w-2.5 h-2.5 mr-0.5" />}
                        {draw.status === "completed" && <CheckCircle className="w-2.5 h-2.5 mr-0.5" />}
                        {draw.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {draw.status === "active" && (
                        <Button
                          onClick={() => handleTriggerDraw(draw.id)}
                          disabled={triggeringId === draw.id}
                          className="bg-red-600 hover:bg-red-500 text-white border-0 text-[9px] font-bold h-7 gap-1"
                          size="xs"
                        >
                          {triggeringId === draw.id ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Drawing...</>
                          ) : (
                            <><Sparkles className="w-3 h-3" /> Execute Draw</>
                          )}
                        </Button>
                      )}
                      {draw.status === "completed" && (
                        <Badge className="bg-[#0D2B20] text-[#8A9690] border-[#162520] text-[9px] hover:bg-[#0D2B20]">
                          Finalized
                        </Badge>
                      )}
                      {draw.status === "upcoming" && (
                        <Badge className="bg-[#0D2B20] text-[#8A9690] border-[#162520] text-[9px] hover:bg-[#0D2B20]">
                          Scheduled
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
