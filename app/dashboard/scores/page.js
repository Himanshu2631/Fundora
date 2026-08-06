"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { useImpactScores, IMPACT_ACTIONS } from "@/hooks/useImpactScores";
import { useAuth } from "@/hooks/useAuth";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import {
  Trophy,
  Flame,
  TrendingUp,
  Calendar,
  PlusCircle,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronRight,
  Loader2,
  Activity,
  Award,
  Heart,
  UserCheck,
  Share2,
  Users,
  Shield,
  Zap,
  PieChart
} from "lucide-react";

export default function ScoresPage() {
  const { user } = useAuth();
  let {
    impactScores: scores,
    totalImpactScore,
    loading,
    error,
    awardActionPoints,
    lastNotification,
    recordImpactEvent,
    updateImpactScore: updateScore,
    deleteImpactScore: deleteScore
  } = useImpactScores();
  scores = scores || [];
  const { rank: leaderboardRank } = useLeaderboard();

  const actionList = Object.values(IMPACT_ACTIONS || {});

  // Form States
  const [selectedAction, setSelectedAction] = useState(actionList[0]?.code || "donate_100");
  const [scoreInput, setScoreInput] = useState(actionList[0]?.points || 10);
  const [descriptionInput, setDescriptionInput] = useState(actionList[0]?.description || "Donated ₹100 to a cause");
  const [dateInput, setDateInput] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState(null);

  // Edit Modal States
  const [editingScore, _setEditingScore] = useState(null);
  const [editScoreValue, setEditScoreValue] = useState(10);
  const [editScoreDate, setEditScoreDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete Modal States
  const [deletingScore, _setDeletingScore] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!dateInput) {
      setDateInput(new Date().toISOString().split("T")[0]);
    }
  }, [dateInput]);

  const handleActionChange = (code) => {
    setSelectedAction(code);
    const matched = actionList.find(a => a.code === code);
    if (matched) {
      setScoreInput(matched.points);
      setDescriptionInput(matched.description);
    }
  };

  const setEditingScore = (val) => {
    if (val) _setDeletingScore(null);
    _setEditingScore(val);
  };

  const setDeletingScore = (val) => {
    if (val) _setEditingScore(null);
    _setDeletingScore(val);
  };

  const totalPoints = totalImpactScore !== undefined ? totalImpactScore : scores.reduce((sum, s) => sum + (parseInt(s.score, 10) || 0), 0);
  const averageScore = scores.length > 0 ? (totalPoints / scores.length).toFixed(1) : "0.0";
  const streak = 5;
  const rank = leaderboardRank;

  // Category Breakdown Calculations
  const categoryBreakdown = useMemo(() => {
    const breakdown = {
      donations: 0,
      memberships: 0,
      volunteering: 0,
      invitations: 0,
      sharing: 0,
      profile: 0,
      other: 0,
    };

    scores.forEach((s) => {
      const act = (s.action || "").toLowerCase();
      const pts = parseInt(s.score, 10) || 0;

      if (act.includes("donate") || act.includes("charity")) {
        breakdown.donations += pts;
      } else if (act.includes("membership") || act.includes("subscribe")) {
        breakdown.memberships += pts;
      } else if (act.includes("volunteer")) {
        breakdown.volunteering += pts;
      } else if (act.includes("invite") || act.includes("friend")) {
        breakdown.invitations += pts;
      } else if (act.includes("share")) {
        breakdown.sharing += pts;
      } else if (act.includes("profile")) {
        breakdown.profile += pts;
      } else {
        breakdown.other += pts;
      }
    });

    return breakdown;
  }, [scores]);

  // History with Running Total
  const historyWithRunningTotal = useMemo(() => {
    if (!scores || scores.length === 0) return [];
    
    // Sort chronological (oldest first) to compute running sum
    const sortedChronological = [...scores].sort((a, b) => {
      const timeA = new Date(a.created_at || a.score_date).getTime();
      const timeB = new Date(b.created_at || b.score_date).getTime();
      return timeA - timeB;
    });

    let running = 0;
    const withTotalMap = new Map();

    sortedChronological.forEach((item) => {
      running += parseInt(item.score, 10) || 0;
      withTotalMap.set(item.id, running);
    });

    // Return in reverse chronological order (newest first)
    return scores.map((item) => ({
      ...item,
      runningTotal: withTotalMap.get(item.id) || item.score
    }));
  }, [scores]);

  const isAddScoreInvalid = isNaN(scoreInput) || scoreInput < 1;
  const isAddDisabled = isAddScoreInvalid || addLoading;

  const isEditScoreInvalid = isNaN(editScoreValue) || editScoreValue < 1;
  const isEditDisabled = isEditScoreInvalid || editLoading;

  // Handle Record Impact Event
  const handleAddScore = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);

    if (isAddDisabled) return;

    setAddLoading(true);
    try {
      await recordImpactEvent({
        action: selectedAction,
        points: scoreInput,
        description: descriptionInput,
        scoreDate: dateInput
      });
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 4000);
      setDateInput(new Date().toISOString().split("T")[0]);
    } catch (err) {
      setAddError(err.message || "Failed to record impact score.");
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (scoreObj) => {
    setEditingScore(scoreObj);
    setEditScoreValue(scoreObj.score);
    setEditScoreDate(scoreObj.score_date);
    setEditDescription(scoreObj.description || "");
    setEditError(null);
    setEditSuccess(false);
  };

  // Handle Edit Score
  const handleEditScore = async (e) => {
    e.preventDefault();
    setEditError(null);
    setEditSuccess(false);

    if (isEditDisabled) return;

    setEditLoading(true);
    try {
      await updateScore(editingScore.id, {
        score: editScoreValue,
        score_date: editScoreDate,
        description: editDescription
      });
      setEditSuccess(true);
      setTimeout(() => {
        setEditSuccess(false);
        setEditingScore(null);
      }, 1000);
    } catch (err) {
      setEditError(err.message || "Failed to update score.");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Score
  const handleDeleteScore = async () => {
    if (!deletingScore) return;
    setDeleteLoading(true);
    try {
      await deleteScore(deletingScore.id);
      setDeletingScore(null);
    } catch (err) {
      console.error("Failed to delete score:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getScoreBadgeColor = (scoreNum) => {
    if (scoreNum >= 30) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
    if (scoreNum >= 10) return "border-amber-500/20 bg-amber-500/10 text-amber-500";
    return "border-accent/20 bg-accent/10 text-accent";
  };

  const getScoreCircleColor = (scoreNum) => {
    if (scoreNum >= 30) return "from-emerald-500 to-teal-500 text-white shadow-emerald-500/20";
    if (scoreNum >= 10) return "from-amber-500 to-orange-500 text-white shadow-amber-500/20";
    return "from-[#C4A054] to-yellow-600 text-white shadow-yellow-500/20";
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  if (loading && scores.length === 0) {
    return (
      <div className="p-6 md:p-8 space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-secondary/30 rounded-xl" />
          <div className="h-7 w-64 bg-secondary/20 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 bg-secondary/15 rounded-xl" />
          <div className="h-24 bg-secondary/15 rounded-xl" />
          <div className="h-24 bg-secondary/15 rounded-xl" />
          <div className="h-24 bg-secondary/15 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 14 }}
      >
        <span className="text-[10px] uppercase tracking-widest font-bold text-accent">
          Impact Score Dashboard
        </span>
        <h2 className="font-heading text-xl font-extrabold text-foreground mt-1">
          Your Cumulative Community Impact & Analytics
        </h2>
      </motion.div>

      {/* Global Error Banner */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Hero Prominent Impact Score + Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 80, damping: 14 }}
        className="grid grid-cols-1 md:grid-cols-12 gap-4"
      >
        {/* Prominent Current Impact Score Banner */}
        <Card className="md:col-span-6 p-6 bg-gradient-to-br from-[#0B221A] via-card to-card border-accent/30 flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1.5 z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Current Impact Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl sm:text-5xl font-black text-white tracking-tight">
                {totalPoints}
              </span>
              <span className="text-sm font-bold text-accent">pts</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Calculated automatically from all verified community actions
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
            <Award className="w-9 h-9" />
          </div>
        </Card>

        {/* Secondary Stat Widgets */}
        <div className="md:col-span-6 grid grid-cols-3 gap-3">
          <Card className="p-4 flex flex-col justify-between hover:border-accent/30 transition-all">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Total Actions</span>
            <div className="mt-2">
              <p className="font-heading text-xl font-extrabold text-foreground">{scores.length}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Logged events</p>
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between hover:border-accent/30 transition-all">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avg / Action</span>
            <div className="mt-2">
              <p className="font-heading text-xl font-extrabold text-foreground">{averageScore}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Points rating</p>
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between hover:border-accent/30 transition-all">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Global Rank</span>
            <div className="mt-2">
              <p className="font-heading text-xl font-extrabold text-accent">{rank}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Impact standing</p>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Impact Breakdown Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, type: "spring", stiffness: 80, damping: 14 }}
      >
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-accent" />
              <h3 className="font-heading font-bold text-sm text-foreground">Impact Breakdown by Action</h3>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category Distribution</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Donations", pts: categoryBreakdown.donations, icon: Heart, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
              { label: "Memberships", pts: categoryBreakdown.memberships, icon: Shield, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
              { label: "Volunteering", pts: categoryBreakdown.volunteering, icon: Zap, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
              { label: "Invitations", pts: categoryBreakdown.invitations, icon: Users, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
              { label: "Sharing", pts: categoryBreakdown.sharing, icon: Share2, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
              { label: "Profile", pts: categoryBreakdown.profile, icon: UserCheck, color: "text-accent bg-accent/10 border-accent/20" },
            ].map((cat, idx) => (
              <div key={idx} className={`p-3 border rounded-xl flex flex-col justify-between ${cat.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider">{cat.label}</span>
                  <cat.icon className="w-3.5 h-3.5" />
                </div>
                <div className="mt-3">
                  <p className="font-heading text-lg font-extrabold">{cat.pts} <span className="text-[10px] font-normal">pts</span></p>
                  <p className="text-[8.5px] opacity-80 mt-0.5">
                    {totalPoints > 0 ? `${((cat.pts / totalPoints) * 100).toFixed(0)}% of total` : "0% of total"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Quick Action Triggers Row */}
      <div className="flex flex-wrap gap-2 p-3.5 bg-secondary/10 border border-border/40 rounded-xl items-center justify-between text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" /> Quick Action Rewards:
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => awardActionPoints("invite_friend")}
            className="h-7 text-[10px] font-bold border-accent/30 text-accent hover:bg-accent/10"
          >
            Invite Friend (+20 pts)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => awardActionPoints("donate_emergency")}
            className="h-7 text-[10px] font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            Donate Emergency Relief (+25 pts)
          </Button>
        </div>
      </div>

      {/* Split Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Record Event Form Card */}
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 80, damping: 14 }}
          className="lg:col-span-5"
        >
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-border/40">
              <PlusCircle className="w-4 h-4 text-accent" />
              <h3 className="font-heading font-bold text-sm text-foreground">Record Impact Action</h3>
            </div>

            {/* Notification Alerts */}
            {lastNotification && (
              <Alert variant="success" className="animate-in fade-in slide-in-from-top-2 border-accent/40 bg-accent/10">
                <Sparkles className="w-4 h-4 text-accent" />
                <AlertTitle>Impact Points Awarded</AlertTitle>
                <AlertDescription>
                  {lastNotification.message}
                </AlertDescription>
              </Alert>
            )}

            {addSuccess && !lastNotification && (
              <Alert variant="success" className="animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>Impact Event Recorded</AlertTitle>
                <AlertDescription>Your action has been logged and points awarded!</AlertDescription>
              </Alert>
            )}

            {addError && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Validation Alert</AlertTitle>
                <AlertDescription>{addError}</AlertDescription>
              </Alert>
            )}

            {/* Add Form */}
            <form onSubmit={handleAddScore} className="space-y-4">
              {/* Action Selector */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Action
                </label>
                <select
                  value={selectedAction}
                  disabled={addLoading}
                  onChange={(e) => handleActionChange(e.target.value)}
                  className="w-full h-10 px-3 bg-secondary/15 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent cursor-pointer"
                >
                  {actionList.map((action) => (
                    <option key={action.code} value={action.code} className="bg-background text-foreground">
                      {action.label} (+{action.points} pts)
                    </option>
                  ))}
                  <option value="custom" className="bg-background text-foreground">Custom Impact Action</option>
                </select>
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Event Description
                </label>
                <input
                  type="text"
                  value={descriptionInput}
                  disabled={addLoading}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Enter details of your impact action..."
                  className="w-full h-10 px-3 bg-secondary/15 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              {/* Points Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Points Awarded
                  </label>
                  <span className="text-xs font-bold text-accent px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-xl">
                    +{scoreInput} pts
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={scoreInput}
                  disabled={addLoading}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setScoreInput(val);
                  }}
                  className="w-full h-9 px-3 bg-secondary/15 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              {/* Date Input */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Event Date
                </label>
                <input
                  type="date"
                  value={dateInput}
                  disabled={addLoading}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full h-10 px-3 bg-secondary/15 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent cursor-pointer"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="accent"
                  disabled={isAddDisabled}
                  className="w-full font-bold text-xs uppercase tracking-wider h-10"
                >
                  {addLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording Event...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1.5" /> Record Impact Action (+{scoreInput} pts)
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Right Column: Impact History Section */}
        <motion.div
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 80, damping: 14 }}
          className="lg:col-span-7 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-heading font-bold text-sm text-foreground">Impact History ({historyWithRunningTotal.length})</h3>
            <span className="text-[10px] text-muted-foreground font-semibold">Action • Points • Date • Running Total</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {historyWithRunningTotal.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="p-10 flex flex-col items-center justify-center text-center gap-4 border-dashed bg-secondary/5">
                    <Award className="w-8 h-8 text-muted-foreground/30" />
                    <div>
                      <h4 className="font-heading font-bold text-xs text-foreground uppercase tracking-widest">No Impact History Found</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                        Your Impact Score starts at 0. Perform or record community actions to build your history!
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                historyWithRunningTotal.map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", duration: 0.3 }}
                  >
                    <Card className="p-4 flex items-center justify-between gap-4 hover:border-accent/30 transition-all group bg-card">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center font-heading font-extrabold text-sm shadow-md transition-transform group-hover:scale-105 shrink-0 ${getScoreCircleColor(s.score)}`}>
                          +{s.score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">
                              {s.description || s.action || "Impact Event"}
                            </span>
                            <Badge className={`text-[8px] font-bold px-1.5 py-0.5 ${getScoreBadgeColor(s.score)}`}>
                              +{s.score} pts
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-accent" />
                              {formatDate(s.score_date || s.created_at)}
                            </span>
                            <span className="text-[10px] font-semibold text-accent/90 bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                              Running Total: {s.runningTotal} pts
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(s)}
                          className="h-8 w-8 hover:bg-secondary/20 text-muted-foreground hover:text-foreground"
                          title="Edit event"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingScore(s)}
                          className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Edit Score Modal */}
      <Modal
        isOpen={Boolean(editingScore)}
        onClose={() => setEditingScore(null)}
        title="Edit Impact Event"
      >
        {editingScore && (
          <form onSubmit={handleEditScore} className="space-y-4 pt-2">
            {editSuccess && (
              <Alert variant="success">
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>Event Updated</AlertTitle>
                <AlertDescription>Impact event updated successfully!</AlertDescription>
              </Alert>
            )}

            {editError && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <input
                type="text"
                value={editDescription}
                disabled={editLoading}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full h-10 px-3 bg-secondary/15 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Points Awarded
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={editScoreValue}
                disabled={editLoading}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setEditScoreValue(val);
                }}
                className="w-full h-10 px-3 bg-secondary/15 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Event Date
              </label>
              <input
                type="date"
                value={editScoreDate}
                disabled={editLoading}
                onChange={(e) => setEditScoreDate(e.target.value)}
                className="w-full h-10 px-3 bg-secondary/15 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingScore(null)}
                disabled={editLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={isEditDisabled}
                className="text-xs font-bold uppercase tracking-wider"
              >
                {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingScore)}
        onClose={() => setDeletingScore(null)}
        title="Confirm Event Deletion"
      >
        {deletingScore && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove this impact event of{" "}
              <strong className="text-foreground">+{deletingScore.score} pts</strong> recorded on{" "}
              <strong>{formatDate(deletingScore.score_date || deletingScore.created_at)}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeletingScore(null)}
                disabled={deleteLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteScore}
                disabled={deleteLoading}
                className="text-xs font-bold uppercase tracking-wider"
              >
                {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete Event"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
