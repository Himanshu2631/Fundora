"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { useScores } from "@/hooks/useScores";
import { useAuth } from "@/hooks/useAuth";
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
  Activity
} from "lucide-react";

export default function ScoresPage() {
  const { user } = useAuth();
  const { scores, loading, error, addScore, updateScore, deleteScore } = useScores();

  // Add Form States
  const [scoreInput, setScoreInput] = useState(36);
  const [dateInput, setDateInput] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState(null);

  // Edit Modal States
  const [editingScore, setEditingScore] = useState(null); // score object being edited
  const [editScoreValue, setEditScoreValue] = useState(36);
  const [editScoreDate, setEditScoreDate] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete Modal States
  const [deletingScore, setDeletingScore] = useState(null); // score object being deleted
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Initialize date input to today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDateInput(today);
  }, []);

  // Compute stats
  const totalPoints = scores.reduce((sum, s) => sum + s.score, 0);
  const averageScore = scores.length > 0 ? (totalPoints / scores.length).toFixed(1) : "0.0";
  const streak = 5; // Static streak mapping
  const rank = 284; // Static rank mapping

  // Real-time validations
  const isAddDuplicateDate = scores.some(s => s.score_date === dateInput);
  const isAddScoreInvalid = scoreInput < 1 || scoreInput > 45;
  const isAddDisabled = isAddDuplicateDate || isAddScoreInvalid || addLoading;

  const isEditDuplicateDate = scores.some(
    s => s.score_date === editScoreDate && s.id !== editingScore?.id
  );
  const isEditScoreInvalid = editScoreValue < 1 || editScoreValue > 45;
  const isEditDisabled = isEditDuplicateDate || isEditScoreInvalid || editLoading;

  // Handle Add Score
  const handleAddScore = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);

    if (isAddDisabled) return;

    setAddLoading(true);
    try {
      await addScore(scoreInput, dateInput);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 4000);
      // Reset inputs
      setScoreInput(36);
      setDateInput(new Date().toISOString().split("T")[0]);
    } catch (err) {
      setAddError(err.message || "Failed to add score.");
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (scoreObj) => {
    setEditingScore(scoreObj);
    setEditScoreValue(scoreObj.score);
    setEditScoreDate(scoreObj.score_date);
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
        score_date: editScoreDate
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

  // Get score style classes (emerald for high, amber for moderate, red for low)
  const getScoreBadgeColor = (scoreNum) => {
    if (scoreNum >= 36) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
    if (scoreNum >= 18) return "border-amber-500/20 bg-amber-500/10 text-amber-500";
    return "border-destructive/20 bg-destructive/10 text-destructive";
  };

  const getScoreCircleColor = (scoreNum) => {
    if (scoreNum >= 36) return "from-emerald-500 to-teal-500 text-white shadow-emerald-500/20";
    if (scoreNum >= 18) return "from-amber-500 to-orange-500 text-white shadow-amber-500/20";
    return "from-destructive to-red-500 text-white shadow-red-500/20";
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-secondary/15 rounded-xl" />
          <div className="h-24 bg-secondary/15 rounded-xl" />
          <div className="h-24 bg-secondary/15 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 h-[340px] bg-secondary/15 rounded-xl" />
          <div className="lg:col-span-7 h-[340px] bg-secondary/15 rounded-xl" />
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
          Score Centre
        </span>
        <h2 className="font-heading text-lg font-extrabold text-foreground mt-1">
          Your Golf Scores & Giving Impact
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

      {/* Stats Cards Row */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 80, damping: 14 }}
        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
      >
        {[
          { label: "Total Points", value: `${totalPoints} pts`, icon: Trophy, accent: true, sub: "Sum of latest 5 scores" },
          { label: "Average Score", value: `${averageScore}`, icon: Activity, accent: false, sub: "Stableford rating" },
          { label: "Active Streak", value: `${streak} wk`, icon: Flame, accent: false, sub: "Play consistency" },
          { label: "Global Rank", value: `#${rank}`, icon: TrendingUp, accent: false, sub: "Fundora leaderboard" },
        ].map((stat, i) => (
          <Card key={i} className="p-5 hover:border-accent/30 transition-all flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.accent ? "text-accent" : "text-muted-foreground/50"}`} />
            </div>
            <div className="mt-4">
              <p className={`font-heading text-2xl font-extrabold ${stat.accent ? "text-accent" : "text-foreground"}`}>{stat.value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{stat.sub}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Split Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Card */}
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 80, damping: 14 }}
          className="lg:col-span-5"
        >
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-border/40">
              <PlusCircle className="w-4 h-4 text-accent" />
              <h3 className="font-heading font-bold text-sm text-foreground">Record Golf Score</h3>
            </div>

            {/* Notification Alerts */}
            {addSuccess && (
              <Alert variant="success" className="animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>Score Recorded</AlertTitle>
                <AlertDescription>Your golf score has been saved. Impact points updated!</AlertDescription>
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
              {/* Score Input & Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Stableford Score (1 - 45)
                  </label>
                  <span className="text-xs font-bold text-accent px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-xl">
                    {scoreInput} pts
                  </span>
                </div>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="1"
                    max="45"
                    value={scoreInput}
                    disabled={addLoading}
                    onChange={(e) => setScoreInput(parseInt(e.target.value, 10))}
                    className="flex-1 accent-accent cursor-pointer bg-secondary h-1.5 rounded-full"
                  />
                  <input
                    type="number"
                    min="1"
                    max="45"
                    value={scoreInput}
                    disabled={addLoading}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setScoreInput(val);
                    }}
                    className="w-16 h-8 px-2 bg-secondary/15 border border-border rounded-xl text-center text-xs font-bold text-foreground focus:outline-none focus:border-accent"
                  />
                </div>
                {isAddScoreInvalid && (
                  <p className="text-[10px] text-destructive font-semibold">
                    Score must be an integer between 1 and 45.
                  </p>
                )}
              </div>

              {/* Date Input */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Score Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateInput}
                    disabled={addLoading}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full h-10 px-3 bg-secondary/15 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent transition-colors cursor-pointer"
                  />
                </div>
                {isAddDuplicateDate && (
                  <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> A score entry already exists for this date.
                  </p>
                )}
              </div>

              {/* Capacity warning */}
              {scores.length >= 5 && (
                <div className="p-3 bg-secondary/10 border border-border/30 rounded-xl text-[10px] text-muted-foreground flex gap-2">
                  <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    You have 5 score records. Submitting this score will delete your oldest score record from{" "}
                    <strong>{formatDate(scores[scores.length - 1].score_date)}</strong>.
                  </p>
                </div>
              )}

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="accent"
                  disabled={isAddDisabled}
                  className="w-full text-xs font-bold uppercase tracking-wider h-10"
                >
                  {addLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Score...
                    </>
                  ) : (
                    <>
                      Record Score <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Right Column: Score list */}
        <motion.div
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 80, damping: 14 }}
          className="lg:col-span-7 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-heading font-bold text-sm text-foreground">Score Registry ({scores.length}/5)</h3>
            <span className="text-[10px] text-muted-foreground font-semibold">Ordered: Newest Date first</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {scores.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="p-10 flex flex-col items-center justify-center text-center gap-4 border-dashed bg-secondary/5">
                    <Trophy className="w-8 h-8 text-muted-foreground/30" />
                    <div>
                      <h4 className="font-heading font-bold text-xs text-foreground uppercase tracking-widest">No Scores Found</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                        You have not recorded any golf scores yet. Enter your stableford score using the form to populate your stats.
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                scores.map((s, idx) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", duration: 0.3 }}
                  >
                    <Card className="p-4 flex items-center justify-between gap-4 hover:border-accent/30 transition-all group bg-card">
                      <div className="flex items-center gap-4">
                        {/* Score Performance Glowing Circle */}
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center font-heading font-extrabold text-lg shadow-md transition-transform group-hover:scale-105 ${getScoreCircleColor(s.score)}`}>
                          {s.score}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-foreground">Stableford Score</span>
                            <Badge className={`text-[8px] font-bold px-1.5 py-0.5 ${getScoreBadgeColor(s.score)}`}>
                              {s.score >= 36 ? "Excellent" : s.score >= 18 ? "Standard" : "Low"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-accent" />
                            <span className="font-medium">{formatDate(s.score_date)}</span>
                            {idx === scores.length - 1 && scores.length === 5 && (
                              <span className="text-[9px] text-destructive/80 font-bold ml-1 uppercase">Oldest</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => openEditModal(s)}
                          variant="outline"
                          size="icon-sm"
                          className="hover:border-accent/40 text-muted-foreground hover:text-accent"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => setDeletingScore(s)}
                          variant="destructive"
                          size="icon-sm"
                          className="hover:bg-destructive/20"
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
        isOpen={editingScore !== null}
        onClose={() => setEditingScore(null)}
        title="Edit Score Entry"
      >
        <form onSubmit={handleEditScore} className="space-y-5">
          {/* Edit status alerts */}
          {editSuccess && (
            <Alert variant="success">
              <CheckCircle2 className="w-4 h-4" />
              <AlertTitle>Score Updated</AlertTitle>
              <AlertDescription>Your score updates have been successfully saved.</AlertDescription>
            </Alert>
          )}

          {editError && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Validation Alert</AlertTitle>
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          )}

          {/* Edit score range */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Stableford Score (1 - 45)
              </label>
              <span className="text-xs font-bold text-accent px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-xl">
                {editScoreValue} pts
              </span>
            </div>
            <div className="flex gap-4 items-center">
              <input
                type="range"
                min="1"
                max="45"
                value={editScoreValue}
                disabled={editLoading}
                onChange={(e) => setEditScoreValue(parseInt(e.target.value, 10))}
                className="flex-1 accent-accent cursor-pointer bg-secondary h-1.5 rounded-full"
              />
              <input
                type="number"
                min="1"
                max="45"
                value={editScoreValue}
                disabled={editLoading}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setEditScoreValue(val);
                }}
                className="w-16 h-8 px-2 bg-secondary/15 border border-border rounded-xl text-center text-xs font-bold text-foreground focus:outline-none focus:border-accent"
              />
            </div>
            {isEditScoreInvalid && (
              <p className="text-[10px] text-destructive font-semibold">
                Score must be an integer between 1 and 45.
              </p>
            )}
          </div>

          {/* Edit Date */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Score Date
            </label>
            <input
              type="date"
              value={editScoreDate}
              disabled={editLoading}
              onChange={(e) => setEditScoreDate(e.target.value)}
              className="w-full h-10 px-3 bg-secondary/15 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent cursor-pointer"
            />
            {isEditDuplicateDate && (
              <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> A score entry already exists for this date.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border/40">
            <Button
              type="button"
              onClick={() => setEditingScore(null)}
              variant="outline"
              disabled={editLoading}
              className="flex-1 text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={isEditDisabled}
              className="flex-1 text-xs font-bold uppercase tracking-wider"
            >
              {editLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingScore !== null}
        onClose={() => setDeletingScore(null)}
        title="Delete Score Entry?"
      >
        <div className="space-y-4">
          <div className="flex gap-3 bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-destructive">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <h4 className="font-heading font-bold text-sm leading-none mb-1">Confirm Deletion</h4>
              <p className="text-xs opacity-90 leading-relaxed">
                Deleting this record will permanently remove this score from your history. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="p-3 bg-secondary/10 border border-border/40 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Score:</span>
              <span className="font-bold text-foreground">{deletingScore?.score} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Date:</span>
              <span className="font-bold text-foreground">
                {deletingScore && formatDate(deletingScore.score_date)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border/40">
            <Button
              onClick={() => setDeletingScore(null)}
              variant="outline"
              disabled={deleteLoading}
              className="flex-1 text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteScore}
              variant="destructive"
              disabled={deleteLoading}
              className="flex-1 text-xs font-bold uppercase tracking-wider"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                </>
              ) : (
                "Confirm Delete"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
