"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2,
  AlertTriangle,
  Award,
  Eye,
  Gift,
  ExternalLink,
  ShieldCheck,
  User,
  Activity,
  FileText,
  DollarSign,
  XCircle,
  X,
  ArrowRight,
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 85, damping: 15 } },
};

const STATUS_STYLES = {
  pending: { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20", icon: Clock },
  approved: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20", icon: CheckCircle },
  paid: { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20", icon: DollarSign },
  rejected: { badge: "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20", icon: XCircle },
};

export default function AdminDrawsPage() {
  const {
    draws,
    loading: drawsLoading,
    error: drawsError,
    addNewDraw,
    completeDraw,
    changeDrawStatus,
    refresh: refreshDraws,
    claims,
    loading: claimsLoading,
    error: claimsError,
    fetchAllClaims,
    reviewClaim
  } = useDraws();

  // Custom states for stats & results
  const [allEntries, setAllEntries] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [winnersByDraw, setWinnersByDraw] = useState({});
  const [loadingExtra, setLoadingExtra] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [resultsDraw, setResultsDraw] = useState(null);

  // Winner claim review state
  const [statusFilter, setStatusFilter] = useState("all");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

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
      const { data: users } = await supabase.from("profiles").select("*");
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
    fetchAllClaims();
  }, [draws, fetchAllClaims]);

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

  // Get active or next draw for the Current Draw Console
  const currentDraw = useMemo(() => {
    const active = draws.find(d => d.status === "active");
    if (active) return active;
    const upcoming = draws.filter(d => d.status === "upcoming").sort((a, b) => new Date(a.draw_date) - new Date(b.draw_date));
    return upcoming[0] || null;
  }, [draws]);

  // Current draw entries statistics
  const currentDrawStats = useMemo(() => {
    if (!currentDraw) return null;
    const drawEntries = allEntries.filter(e => e.draw_id === currentDraw.id);
    const ticketCount = drawEntries.length;
    const uniqueUsersCount = new Set(drawEntries.map(e => e.user_id)).size;

    return {
      ticketCount,
      uniqueUsersCount
    };
  }, [currentDraw, allEntries]);

  // Match statistics for completed draws
  const matchStats = useMemo(() => {
    const stats = { match3: 0, match4: 0, match5: 0 };
    claims.forEach(c => {
      if (c.status === "approved" || c.status === "paid") {
        if (c.match_count === 3) stats.match3 += 1;
        else if (c.match_count === 4) stats.match4 += 1;
        else if (c.match_count === 5) stats.match5 += 1;
      }
    });
    return stats;
  }, [claims]);

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
      setSuccessMsg(`Draw "${payload.title}" scheduled successfully.`);
      refreshDraws();
    } catch (err) {
      setErrorMsg(err.message || "Failed to schedule draw.");
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
      refreshDraws();
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
      const list = await getWinners(drawId);
      setWinnersByDraw(prev => ({ ...prev, [drawId]: list }));
      refreshDraws();
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

  // Winner Claim Review Modal triggers
  const handleOpenReview = (claim) => {
    setSelectedClaim(claim);
    setAdminNotes("");
    setIsReviewOpen(true);
  };

  const handleClaimReviewAction = async (claimId, status) => {
    setActionSubmitting(true);
    try {
      const notes = adminNotes.trim() || `Verified and set to ${status} by Admin.`;
      await reviewClaim(claimId, status, notes);
      await fetchAllClaims();
      setIsReviewOpen(false);
      setSuccessMsg(`Winner claim status updated to ${status}.`);
    } catch (err) {
      setErrorMsg(err.message || "Failed to update claim.");
    } finally {
      setActionSubmitting(false);
    }
  };

  // Map winner claims data for displaying table
  const resolvedClaims = useMemo(() => {
    return claims.map(claim => {
      const profile = profiles[claim.user_id];
      const draw = draws.find(d => d.id === claim.draw_id);
      const entry = allEntries.find(e => e.id === claim.entry_id);

      return {
        ...claim,
        userName: profile ? (profile.full_name || profile.email) : `User (${claim.user_id.substring(0, 8)})`,
        userEmail: profile?.email || "Unknown Email",
        drawTitle: draw ? draw.title : "Unknown Draw",
        drawSponsor: draw ? draw.sponsor : "Fundora Platform",
        drawWinningNumbers: draw ? (draw.generated_numbers || []) : [],
        ticketNumbers: entry ? (entry.numbers || []) : [],
        ticketCode: claim.ticket_number || entry?.ticket_number || "FND-TICKET",
      };
    });
  }, [claims, profiles, draws, allEntries]);

  const filteredClaims = useMemo(() => {
    return statusFilter === "all"
      ? resolvedClaims
      : resolvedClaims.filter(c => c.status === statusFilter);
  }, [resolvedClaims, statusFilter]);

  const pendingClaimsCount = claims.filter(c => c.status === "pending").length;
  const activeCount = draws.filter(d => d.status === "active").length;
  const upcomingCount = draws.filter(d => d.status === "upcoming").length;
  const completedCount = draws.filter(d => d.status === "completed").length;

  if ((drawsLoading || claimsLoading || loadingExtra) && draws.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Connecting draw command center variables..." />
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
        {/* Top Control Room KPIs */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Active draws", value: String(activeCount), icon: Play, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Upcoming draws", value: String(upcomingCount), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Completed Draws", value: String(completedCount), icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Verification Queue", value: String(pendingClaimsCount), icon: Trophy, color: "text-rose-400", bg: "bg-rose-500/10" },
            { label: "Draw Tickets Pool", value: allEntries.length.toLocaleString(), icon: Users, color: "text-[#8A9690]", bg: "bg-white/5" },
          ].map((stat, i) => (
            <Card key={i} className="p-4 bg-[#0A1C16] border-[#162520]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#8A9690]">{stat.label}</p>
                  <p className="font-heading text-lg font-extrabold text-white mt-0.5">{stat.value}</p>
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
              <AlertTitle className="text-xs font-bold text-white">Action Completed</AlertTitle>
              <AlertDescription className="text-[11px] text-[#8A9690] mt-0.5">{successMsg}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {(errorMsg || drawsError || claimsError) && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>System Warning</AlertTitle>
              <AlertDescription className="text-[11px] mt-0.5">{errorMsg || drawsError || claimsError}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Control Room Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Area: Current Console, Draw History, Winner Queue */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. CURRENT ACTIVE DRAW CONSOLE */}
            <motion.div variants={itemVariants}>
              <Card className="bg-[#0A1C16] border-[#162520] overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-600/10 to-transparent pointer-events-none" />
                
                <CardHeader className="pb-4 border-b border-[#162520]">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] uppercase tracking-widest font-extrabold text-red-500">Live Status Console</span>
                      <CardTitle className="text-sm font-extrabold text-white mt-0.5 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Current Reward Draw
                      </CardTitle>
                    </div>
                    {currentDraw ? (
                      <Badge className={`text-[9px] uppercase font-bold ${
                        currentDraw.status === "active" 
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 animate-pulse" 
                          : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                      }`}>
                        {currentDraw.status}
                      </Badge>
                    ) : (
                      <Badge className="bg-[#070D0B] text-[#8A9690] border-[#162520] text-[9px]">Inactive</Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-5">
                  {currentDraw ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-[#8A9690] font-bold uppercase tracking-wide block">Draw Details</span>
                          <h4 className="text-sm font-bold text-white leading-snug">{currentDraw.title}</h4>
                          <p className="text-[11px] text-[#8A9690]">{currentDraw.prize}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs border-b border-[#162520]/60 pb-1.5">
                            <span className="text-[#8A9690] font-semibold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Target Date</span>
                            <span className="text-white font-bold">{new Date(currentDraw.draw_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-b border-[#162520]/60 pb-1.5">
                            <span className="text-[#8A9690] font-semibold flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Sponsor</span>
                            <span className="text-white font-bold">{currentDraw.sponsor}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-b border-[#162520]/60 pb-1.5">
                            <span className="text-[#8A9690] font-semibold flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Min Score</span>
                            <span className="text-white font-bold">{currentDraw.min_score} pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Statistics pool */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#0D2B20]/20 border border-[#162520] rounded-xl">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A9690]">Registered Users</p>
                          <p className="font-heading text-base font-extrabold text-white mt-0.5">{currentDrawStats?.uniqueUsersCount}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A9690]">Generated Tickets</p>
                          <p className="font-heading text-base font-extrabold text-white mt-0.5">{currentDrawStats?.ticketCount} tickets</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 text-left sm:text-right flex items-center sm:justify-end gap-1.5">
                          {currentDraw.status === "upcoming" && (
                            <Button
                              onClick={() => handleStartDraw(currentDraw.id, currentDraw.title)}
                              disabled={actionLoading[currentDraw.id]}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0 text-xs h-9 gap-1.5 px-4"
                            >
                              {actionLoading[currentDraw.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <><Play className="w-3.5 h-3.5" /> Open Draw</>
                              )}
                            </Button>
                          )}
                          {currentDraw.status === "active" && (
                            <Button
                              onClick={() => handleExecuteDraw(currentDraw.id, currentDraw.title)}
                              disabled={actionLoading[currentDraw.id]}
                              className="bg-red-600 hover:bg-red-500 text-white font-bold border-0 text-xs h-9 gap-1.5 px-4 animate-bounce hover:animate-none"
                            >
                              {actionLoading[currentDraw.id] ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Executing...</>
                              ) : (
                                <><Sparkles className="w-3.5 h-3.5" /> Execute Draw</>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-[#8A9690]">
                      No active or upcoming draws. Create a new draw from the panel actions.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* 2. ALL DRAWS HISTORY REGISTRY */}
            <motion.div variants={itemVariants}>
              <Card className="bg-[#0A1C16] border-[#162520]">
                <CardHeader className="pb-4 border-b border-[#162520] flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-red-500" />
                      Prize Draws registry
                    </CardTitle>
                  </div>
                  <Button
                    onClick={handleCreateOpen}
                    className="bg-red-600 hover:bg-red-500 text-white border-0 text-[10px] font-bold h-7 gap-1 px-2.5"
                    size="xs"
                  >
                    <Plus className="w-3 h-3" /> Create Draw
                  </Button>
                </CardHeader>
                
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#162520] hover:bg-transparent">
                        <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Draw Title</TableHead>
                        <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Schedule</TableHead>
                        <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Participants</TableHead>
                        <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                        <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draws.map((draw) => {
                        const drawEntries = allEntries.filter(e => e.draw_id === draw.id);
                        const ticketCount = drawEntries.length;
                        const uniqueCount = new Set(drawEntries.map(e => e.user_id)).size;
                        const isCompleted = draw.status === "completed";
                        const isActive = draw.status === "active";
                        const isUpcoming = draw.status === "upcoming";

                        return (
                          <TableRow key={draw.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                            <TableCell className="pl-6 py-3.5">
                              <div>
                                <span className="text-xs font-bold text-white block">{draw.title}</span>
                                <span className="text-[10px] text-[#8A9690]">{draw.sponsor}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-[#8A9690] flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {new Date(draw.draw_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-bold text-white block">{uniqueCount} users</span>
                              <span className="text-[9px] text-[#8A9690]">{ticketCount} tickets</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[8px] ${
                                isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20" :
                                isUpcoming ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20" :
                                "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20"
                              }`}>
                                {draw.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              {isCompleted ? (
                                <Button
                                  onClick={() => handleViewResults(draw)}
                                  className="bg-[#0D2B20] hover:bg-[#163D2E] text-white border border-[#162520] text-[9px] font-bold h-6 gap-1 px-2.5"
                                  size="xs"
                                >
                                  <Eye className="w-2.5 h-2.5" /> Outcome
                                </Button>
                              ) : isUpcoming ? (
                                <Button
                                  onClick={() => handleStartDraw(draw.id, draw.title)}
                                  disabled={actionLoading[draw.id]}
                                  className="bg-emerald-600/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold h-6 gap-1 px-2.5"
                                  size="xs"
                                >
                                  {actionLoading[draw.id] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Start"}
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleExecuteDraw(draw.id, draw.title)}
                                  disabled={actionLoading[draw.id]}
                                  className="bg-red-600/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 text-[9px] font-bold h-6 gap-1 px-2.5"
                                  size="xs"
                                >
                                  {actionLoading[draw.id] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Execute"}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>

            {/* 3. WINNER VERIFICATION QUEUE */}
            <motion.div variants={itemVariants}>
              <Card className="bg-[#0A1C16] border-[#162520]">
                <CardHeader className="pb-4 border-b border-[#162520] flex flex-col gap-3">
                  <div className="flex justify-between items-center w-full">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-red-500" />
                      Winner Verification Queue
                    </CardTitle>
                    <Badge className="bg-red-600/10 border-red-600/20 text-red-400 text-[9px]">
                      {pendingClaimsCount} pending
                    </Badge>
                  </div>
                  
                  {/* Status Filters */}
                  <div className="flex gap-1.5 flex-wrap">
                    {["all", "pending", "approved", "paid", "rejected"].map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="xs"
                        onClick={() => setStatusFilter(status)}
                        className={`text-[9px] h-7 px-2.5 capitalize ${
                          statusFilter === status
                            ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                            : "bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E]"
                        }`}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#162520] hover:bg-transparent">
                        <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Winner</TableHead>
                        <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Draw Title</TableHead>
                        <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Matches</TableHead>
                        <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Evidence</TableHead>
                        <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                        <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClaims.map((claim) => {
                        const style = STATUS_STYLES[claim.status] || STATUS_STYLES.pending;
                        const StatusIcon = style.icon;

                        return (
                          <TableRow key={claim.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                            <TableCell className="pl-6 py-3">
                              <div>
                                <span className="text-xs font-bold text-white block">{claim.userName}</span>
                                <span className="text-[9px] text-[#8A9690] font-mono">{claim.ticketCode}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-[#8A9690] max-w-[130px] truncate" title={claim.drawTitle}>
                              {claim.drawTitle}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-white font-bold">{claim.match_count} / 5</span>
                              <span className="text-[9px] text-[#8A9690] block">{claim.prize_category}</span>
                            </TableCell>
                            <TableCell>
                              {claim.screenshot_url ? (
                                <a
                                  href={claim.screenshot_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-red-400 hover:underline inline-flex items-center gap-0.5 font-bold"
                                >
                                  View <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : (
                                <span className="text-[9px] text-[#8A9690] italic">No Proof</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[8px] ${style.badge} whitespace-nowrap`}>
                                <StatusIcon className="w-2 h-2 mr-0.5" />
                                {claim.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                onClick={() => handleOpenReview(claim)}
                                className="bg-[#0D2B20] hover:bg-[#163D2E] text-white border border-[#162520] text-[9px] font-bold h-6 gap-1 px-2.5"
                                size="xs"
                              >
                                <Eye className="w-2.5 h-2.5" /> Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredClaims.length === 0 && (
                    <div className="text-center py-8 text-xs text-[#8A9690]">
                      No claims found matching filters in queue.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

          </div>

          {/* Side Area: Control Room Statistics, Vetting Checklist */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Command Center Match statistics */}
            <motion.div variants={itemVariants}>
              <Card className="bg-[#0A1C16] border-[#162520]">
                <CardHeader className="pb-3 border-b border-[#162520]">
                  <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Match Statistics Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {[
                    { label: "5 Matches (Jackpots)", value: matchStats.match5, pct: 100, color: "bg-amber-500", text: "text-amber-400" },
                    { label: "4 Matches (Tier 2)", value: matchStats.match4, pct: 75, color: "bg-emerald-500", text: "text-emerald-400" },
                    { label: "3 Matches (Tier 3)", value: matchStats.match3, pct: 45, color: "bg-blue-500", text: "text-blue-400" },
                  ].map((stat, i) => (
                    <div key={i} className="space-y-1.5 p-2 bg-[#0D2B20]/30 border border-[#162520] rounded-xl">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{stat.label}</span>
                        <span className={`font-semibold ${stat.text}`}>{stat.value} wins</span>
                      </div>
                      <div className="h-1 bg-[#070D0B] rounded-full overflow-hidden">
                        <div className={`h-full ${stat.color}`} style={{ width: stat.value > 0 ? `${stat.pct}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Vetting Checklist */}
            <motion.div variants={itemVariants}>
              <Card className="bg-[#0A1C16] border-[#162520]">
                <CardHeader className="pb-3 border-b border-[#162520]">
                  <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Review Protocol Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 text-xs text-[#8A9690] space-y-2.5">
                  <div className="flex gap-2 items-start">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Cross-reference claimant ticket numbers vs the draw generated numbers.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Inspect screenshot proof link quality to check for cropping or anomalies.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Disburse reward payouts inside Stripe dashboard manually before marking as paid.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Always input bank / Stripe payment transaction IDs inside review notes.</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>

        </div>
      </motion.div>

      {/* ─── MODALS ─── */}

      {/* 1. Schedule New Draw Modal */}
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

      {/* 2. View Draw Results Modal */}
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

      {/* 3. Review Winner Claim Modal */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Verify Winner Payout Submission"
        className="max-w-2xl bg-[#070D0B] border-[#162520] text-white"
      >
        {selectedClaim && (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-[#162520]">
              {/* Profile Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#8A9690] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-red-400" />
                  Winner Profile
                </h4>
                <div>
                  <span className="text-sm font-bold text-white block">{selectedClaim.userName}</span>
                  <span className="text-xs text-[#8A9690] font-mono block">{selectedClaim.userEmail}</span>
                  <span className="text-[10px] text-[#8A9690] block">ID: {selectedClaim.user_id}</span>
                </div>
                <h4 className="text-xs font-bold text-[#8A9690] uppercase tracking-wider flex items-center gap-1.5 pt-2">
                  <Gift className="w-3.5 h-3.5 text-red-400" />
                  Draw Specifications
                </h4>
                <div className="space-y-0.5 text-xs">
                  <div><strong className="text-[#8A9690]">Draw:</strong> {selectedClaim.drawTitle}</div>
                  <div><strong className="text-[#8A9690]">Sponsor:</strong> {selectedClaim.drawSponsor}</div>
                  <div><strong className="text-[#8A9690]">Submitted:</strong> {new Date(selectedClaim.submitted_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Match Audit details */}
              <div className="space-y-3 p-4 bg-[#0A1C16] border border-[#162520] rounded-2xl">
                <h4 className="text-xs font-bold text-[#8A9690] uppercase tracking-wider">Ticket Numbers Audit</h4>
                <div>
                  <span className="text-[9px] text-[#8A9690] font-bold uppercase block mb-1">User Numbers</span>
                  <div className="flex gap-1 flex-wrap">
                    {selectedClaim.ticketNumbers.map((num, i) => {
                      const isMatch = selectedClaim.drawWinningNumbers.includes(num);
                      return (
                        <span
                          key={i}
                          className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center border ${
                            isMatch ? "bg-red-600/10 border-red-500/30 text-red-400" : "bg-[#070D0B] border-[#162520] text-[#8A9690]"
                          }`}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-[#8A9690] font-bold uppercase block mb-1">Winning Numbers</span>
                  <div className="flex gap-1 flex-wrap">
                    {selectedClaim.drawWinningNumbers.map((num, i) => (
                      <span key={i} className="w-7 h-7 rounded-lg bg-[#070D0B] border border-[#162520] font-mono font-bold text-xs flex items-center justify-center text-white">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-2 flex justify-between items-center text-xs border-t border-[#162520]">
                  <span className="text-[#8A9690] font-semibold">Match Outcome:</span>
                  <Badge variant="accent" className="font-bold">
                    {selectedClaim.prize_category || `${selectedClaim.match_count} Match`}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Proof screenshot + status history */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-[10px] text-[#8A9690] uppercase font-bold tracking-wider block">Uploaded Proof</span>
                <div className="w-full aspect-video border border-[#162520] bg-secondary/5 rounded-2xl overflow-hidden flex items-center justify-center relative group">
                  {selectedClaim.screenshot_url ? (
                    <>
                      <img src={selectedClaim.screenshot_url} alt="Proof" className="w-full h-full object-cover" />
                      <a href={selectedClaim.screenshot_url} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 bg-[#070D0B]/80 p-1 px-2 rounded-lg border border-[#162520] text-[9px] flex items-center gap-1">
                        Open Image <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </>
                  ) : (
                    <FileText className="w-8 h-8 text-[#8A9690]/30" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] text-[#8A9690] uppercase font-bold tracking-wider block">Status Transition Logs</span>
                <div className="space-y-3 relative pl-3.5 before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-px before:bg-[#162520] max-h-[150px] overflow-y-auto">
                  {(selectedClaim.status_history || [
                    { status: "pending", timestamp: selectedClaim.created_at || selectedClaim.submitted_at, notes: "Claim submitted by user." }
                  ]).map((log, idx) => {
                    return (
                      <div key={idx} className="relative text-xs space-y-0.5">
                        <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-red-600" />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white capitalize">{log.status}</span>
                          <span className="text-[8px] text-[#8A9690] font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-[#8A9690]">{log.notes}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Admin notes textarea */}
            <div className="space-y-2 pt-2 border-t border-[#162520]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9690] block">Notes / Comments</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter payout confirmation details or reason for rejection..."
                rows={3}
                disabled={selectedClaim.status === "paid" || selectedClaim.status === "rejected" || actionSubmitting}
                className="w-full p-3 bg-[#0A1C16] border border-[#162520] text-white text-xs rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Modal foot actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[#162520]">
              <Button variant="outline" onClick={() => setIsReviewOpen(false)} disabled={actionSubmitting} className="bg-transparent border-[#162520] text-xs h-9">
                Close Panel
              </Button>
              {selectedClaim.status === "pending" && (
                <>
                  <Button onClick={() => handleClaimReviewAction(selectedClaim.id, "rejected")} disabled={actionSubmitting} className="bg-red-600 hover:bg-red-500 text-xs font-bold h-9">
                    Reject Claim
                  </Button>
                  <Button onClick={() => handleClaimReviewAction(selectedClaim.id, "approved")} disabled={actionSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold h-9">
                    Approve Claim
                  </Button>
                </>
              )}
              {selectedClaim.status === "approved" && (
                <Button onClick={() => handleClaimReviewAction(selectedClaim.id, "paid")} disabled={actionSubmitting} className="bg-blue-600 hover:bg-blue-500 text-xs font-bold h-9">
                  Mark Paid (Disburse)
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
