"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { useDraws } from "@/hooks/useDraws";
import { createClient } from "@/lib/supabase";
import { getWinners } from "@/services/drawService";
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
  Award,
  Eye,
  Gift,
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

export default function AdminDrawsPage() {
  const { draws, loading, error, addNewDraw, completeDraw, changeDrawStatus, refresh } = useDraws();
  
  // Custom states for stats & results
  const [allEntries, setAllEntries] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [winnersByDraw, setWinnersByDraw] = useState({});
  const [loadingExtra, setLoadingExtra] = useState(true);

  // Modals state
  const [isCreateOpen, _setIsCreateOpen] = useState(false);
  const [isResultsOpen, _setIsResultsOpen] = useState(false);
  const [resultsDraw, setResultsDraw] = useState(null);

  const setIsCreateOpen = (val) => {
    if (val) _setIsResultsOpen(false);
    _setIsCreateOpen(val);
  };

  const setIsResultsOpen = (val) => {
    if (val) _setIsCreateOpen(false);
    _setIsResultsOpen(val);
  };
  
  const [actionLoading, setActionLoading] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    prize: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    draw_date: "",
    min_score: "50",
    sponsor: "",
  });

  const fetchExtraData = async () => {
    try {
      const supabase = createClient();
      
      // Fetch all entries for stats
      const { data: entries } = await supabase.from("draw_entries").select("*");
      setAllEntries(entries || []);

      // Fetch user profiles to display names
      const { data: users } = await supabase.from("profiles").select("id, email, full_name");
      if (users) {
        const mapping = {};
        users.forEach(u => {
          mapping[u.id] = u;
        });
        setProfiles(mapping);
      }
    } catch (err) {
      console.error("Error loading admin draw stats:", err);
    } finally {
      setLoadingExtra(false);
    }
  };

  useEffect(() => {
    fetchExtraData();
  }, [draws]);

  // Fetch winners for completed draws
  useEffect(() => {
    const loadWinners = async () => {
      const completed = draws.filter(d => d.status === "completed");
      for (const d of completed) {
        if (!winnersByDraw[d.id]) {
          try {
            const list = await getWinners(d.id);
            setWinnersByDraw(prev => ({ ...prev, [d.id]: list }));
          } catch (err) {
            console.error("Error loading winners for draw", d.id, err);
          }
        }
      }
    };
    if (draws.length > 0) {
      loadWinners();
    }
  }, [draws, winnersByDraw]);

  const handleCreateOpen = () => {
    setFormData({
      title: "",
      prize: "",
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      draw_date: "",
      min_score: "50",
      sponsor: "",
    });
    setErrorMsg("");
    setSuccessMsg("");
    setIsCreateOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.prize.trim() || !formData.draw_date) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    setActionLoading(prev => ({ ...prev, create: true }));
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        title: formData.title,
        prize: formData.prize,
        month: parseInt(formData.month, 10),
        year: parseInt(formData.year, 10),
        draw_date: formData.draw_date,
        min_score: parseInt(formData.min_score, 10),
        sponsor: formData.sponsor || "Fundora Platform",
        status: "upcoming"
      };

      await addNewDraw(payload);
      setIsCreateOpen(false);
      setSuccessMsg(`Draw "${payload.title}" created successfully.`);
      refresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to create draw.");
    } finally {
      setActionLoading(prev => ({ ...prev, create: false }));
    }
  };

  const handleStartDraw = async (drawId, title) => {
    setActionLoading(prev => ({ ...prev, [drawId]: true }));
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await changeDrawStatus(drawId, "active");
      setSuccessMsg(`Draw "${title}" has been started and is now active.`);
      refresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to start draw.");
    } finally {
      setActionLoading(prev => ({ ...prev, [drawId]: false }));
    }
  };

  const handleExecuteDraw = async (drawId, title) => {
    setActionLoading(prev => ({ ...prev, [drawId]: true }));
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const completed = await completeDraw(drawId);
      setSuccessMsg(`Draw "${title}" completed successfully. Winning numbers generated!`);
      // Update local winners for this draw
      const list = await getWinners(drawId);
      setWinnersByDraw(prev => ({ ...prev, [drawId]: list }));
      refresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to complete draw.");
    } finally {
      setActionLoading(prev => ({ ...prev, [drawId]: false }));
    }
  };

  const handleViewResults = (draw) => {
    setResultsDraw(draw);
    setIsResultsOpen(true);
  };

  if ((loading || loadingExtra) && draws.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Loading draw registers..." />
      </div>
    );
  }

  const activeCount = draws.filter(d => d.status === "active").length;
  const upcomingCount = draws.filter(d => d.status === "upcoming").length;
  const completedCount = draws.filter(d => d.status === "completed").length;
  const totalEntries = allEntries.length;

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
            { label: "Total Generated Entries", value: totalEntries.toLocaleString(), icon: Users, color: "text-rose-400", bg: "bg-rose-500/10" },
          ].map((stat, i) => (
            <Card key={i} className="p-4 bg-[#0A1C16] border-[#162520]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
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

        {/* Global Notifications */}
        {successMsg && (
          <motion.div variants={itemVariants}>
            <Alert className="bg-emerald-500/10 border-emerald-500/25 text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <AlertTitle className="text-xs font-bold text-white">Action Success</AlertTitle>
              <AlertDescription className="text-[11px] text-[#8A9690] mt-0.5">
                {successMsg}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Operation Failed</AlertTitle>
              <AlertDescription className="text-[11px] mt-0.5">
                {errorMsg}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {error && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Synchronization Error</AlertTitle>
              <AlertDescription className="text-[11px] mt-0.5">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Actions Bar */}
        <motion.div variants={itemVariants} className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Ticket className="w-4 h-4 text-red-400" />
            Prize Draws Dashboard
          </h3>
          <Button
            onClick={handleCreateOpen}
            className="bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-bold h-9 gap-1.5"
          >
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
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Participants</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Winners</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draws.map((draw) => {
                  const drawEntries = allEntries.filter(e => e.draw_id === draw.id);
                  const ticketCount = drawEntries.length;
                  const uniqueUsersCount = new Set(drawEntries.map(e => e.user_id)).size;
                  
                  const isCompleted = draw.status === "completed";
                  const isActive = draw.status === "active";
                  const isUpcoming = draw.status === "upcoming";

                  const winnersCount = winnersByDraw[draw.id]?.length || 0;

                  return (
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
                          {new Date(draw.draw_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-white">{draw.min_score}</span>
                        <span className="text-[10px] text-[#8A9690] ml-0.5">pts</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-xs font-bold text-white block">{uniqueUsersCount}</span>
                          <span className="text-[9px] text-[#8A9690]">{ticketCount} tickets</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCompleted ? (
                          <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/15">
                            <Trophy className="w-2.5 h-2.5 mr-0.5" /> {winnersCount} winners
                          </Badge>
                        ) : (
                          <span className="text-xs text-[#8A9690] italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20" :
                          isUpcoming ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20" :
                          "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20"
                        }`}>
                          {isActive && <Play className="w-2.5 h-2.5 mr-0.5" />}
                          {isUpcoming && <Clock className="w-2.5 h-2.5 mr-0.5" />}
                          {isCompleted && <CheckCircle className="w-2.5 h-2.5 mr-0.5" />}
                          {draw.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {isUpcoming && (
                            <Button
                              onClick={() => handleStartDraw(draw.id, draw.title)}
                              disabled={actionLoading[draw.id]}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 text-[10px] font-bold h-7 gap-1 px-3"
                              size="xs"
                            >
                              {actionLoading[draw.id] ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <><Play className="w-2.5 h-2.5" /> Start Draw</>
                              )}
                            </Button>
                          )}

                          {isActive && (
                            <Button
                              onClick={() => handleExecuteDraw(draw.id, draw.title)}
                              disabled={actionLoading[draw.id]}
                              className="bg-red-600 hover:bg-red-500 text-white border-0 text-[10px] font-bold h-7 gap-1 px-3"
                              size="xs"
                            >
                              {actionLoading[draw.id] ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> Executing...</>
                              ) : (
                                <><Sparkles className="w-2.5 h-2.5" /> Execute Draw</>
                              )}
                            </Button>
                          )}

                          {isCompleted && (
                            <Button
                              onClick={() => handleViewResults(draw)}
                              className="bg-[#0D2B20] hover:bg-[#163D2E] text-white border border-[#162520] text-[10px] font-bold h-7 gap-1 px-3"
                              size="xs"
                            >
                              <Eye className="w-2.5 h-2.5" /> View Results
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {draws.length === 0 && (
              <div className="p-8 text-center text-[#8A9690] text-xs">
                No prize draws registered.
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>

      {/* Create Draw Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule New Prize Draw"
        className="max-w-md bg-[#070D0B] border-[#162520] text-white"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            name="title"
            label="Draw Title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g. Patagonia Eco-Retreat"
            required
            className="bg-[#0A1C16] border-[#162520]"
          />

          <Input
            name="prize"
            label="Prize Details"
            value={formData.prize}
            onChange={handleInputChange}
            placeholder="e.g. 7-night luxury eco-retreat stay for 2"
            required
            className="bg-[#0A1C16] border-[#162520]"
          />

          <Input
            name="sponsor"
            label="Sponsor"
            value={formData.sponsor}
            onChange={handleInputChange}
            placeholder="e.g. Apex Corp Sustainability Fund"
            className="bg-[#0A1C16] border-[#162520]"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block">
                Target Month
              </label>
              <select
                name="month"
                value={formData.month}
                onChange={handleInputChange}
                className="w-full h-11 px-3 bg-[#0A1C16] border border-[#162520] text-white text-sm rounded-xl focus:outline-none focus:border-red-500 transition-colors"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m} className="bg-[#070D0B]">
                    {new Date(2026, m - 1).toLocaleString(undefined, { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block">
                Target Year
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                className="w-full h-11 px-3 bg-[#0A1C16] border border-[#162520] text-white text-sm rounded-xl focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="2026" className="bg-[#070D0B]">2026</option>
                <option value="2027" className="bg-[#070D0B]">2027</option>
                <option value="2028" className="bg-[#070D0B]">2028</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="draw_date"
              label="Draw Date"
              type="date"
              value={formData.draw_date}
              onChange={handleInputChange}
              required
              className="bg-[#0A1C16] border-[#162520] text-white select-none block"
            />
            <Input
              name="min_score"
              label="Min Giving Score"
              type="number"
              value={formData.min_score}
              onChange={handleInputChange}
              placeholder="50"
              required
              min="0"
              className="bg-[#0A1C16] border-[#162520]"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-[#162520]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E] text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading.create}
              className="bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-bold h-9"
            >
              {actionLoading.create ? "Scheduling..." : "Schedule Draw"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Draw Results Modal */}
      <Modal
        isOpen={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
        title="Draw Outcome Results"
        className="max-w-xl bg-[#070D0B] border-[#162520] text-white"
      >
        {resultsDraw && (
          <div className="space-y-6 text-sm">
            <div className="pb-4 border-b border-[#162520]">
              <h4 className="text-base font-bold text-white">{resultsDraw.title}</h4>
              <p className="text-xs text-[#8A9690] mt-0.5">Sponsor: {resultsDraw.sponsor} · Drawn: {new Date(resultsDraw.draw_date).toLocaleDateString()}</p>
            </div>

            {/* Generated numbers */}
            <div className="space-y-2">
              <span className="text-[10px] text-[#8A9690] uppercase font-bold tracking-wider block">Generated Winning Numbers</span>
              <div className="flex gap-2">
                {(resultsDraw.generated_numbers || []).map((num, i) => (
                  <span
                    key={i}
                    className="w-10 h-10 rounded-full bg-[#0D2B20] border border-[#162520] text-sm font-bold flex items-center justify-center text-emerald-400"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>

            {/* Winning tickets pool (raffle) */}
            <div className="space-y-2">
              <span className="text-[10px] text-[#8A9690] uppercase font-bold tracking-wider block">Winning Ticket Numbers</span>
              <div className="flex flex-wrap gap-2">
                {(resultsDraw.winning_numbers || []).map((ticket, i) => (
                  <Badge key={i} className="bg-red-600/10 border-red-600/25 text-red-400 font-mono text-xs hover:bg-red-600/15 py-1 px-2.5">
                    {ticket}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Winners breakdown list */}
            <div className="space-y-2.5">
              <span className="text-[10px] text-[#8A9690] uppercase font-bold tracking-wider block">Identified Winners Pool</span>
              <div className="border border-[#162520] rounded-2xl overflow-hidden bg-[#0A1C16]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#162520] hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase font-bold text-[#8A9690] pl-4">Participant</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-[#8A9690]">Ticket Number</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-[#8A9690]">Matches</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-[#8A9690] pr-4 text-right">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(winnersByDraw[resultsDraw.id] || []).map((win, idx) => {
                      const profile = profiles[win.user_id];
                      const name = profile ? (profile.full_name || profile.email) : `User (${win.user_id.substring(0, 8)})`;

                      return (
                        <TableRow key={idx} className="border-[#162520] hover:bg-transparent">
                          <TableCell className="pl-4 py-2.5 text-xs text-white font-medium">{name}</TableCell>
                          <TableCell className="py-2.5 font-mono text-xs text-red-400">{win.ticket_number}</TableCell>
                          <TableCell className="py-2.5 text-xs text-white font-bold">{win.match_count} / 5</TableCell>
                          <TableCell className="pr-4 py-2.5 text-xs text-right text-emerald-400 font-semibold">{win.prize_category}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {(!winnersByDraw[resultsDraw.id] || winnersByDraw[resultsDraw.id].length === 0) && (
                  <div className="p-6 text-center text-[#8A9690] text-xs">
                    No tickets met the matching criteria (matches &gt;= 3) in this pool.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#162520]">
              <Button
                onClick={() => setIsResultsOpen(false)}
                className="bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-bold h-9"
              >
                Close Results
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
