"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { useDraws } from "@/hooks/useDraws";
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
  AlertTriangle,
  Gift,
  Calendar,
  MessageSquare,
  FileText,
  User,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const STATUS_STYLES = {
  pending: { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20", icon: Clock },
  approved: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20", icon: CheckCircle },
  paid: { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20", icon: DollarSign },
  rejected: { badge: "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20", icon: XCircle },
};

export default function AdminWinnersPage() {
  const { claims, loading: claimsLoading, error: claimsError, fetchAllClaims, reviewClaim } = useDraws();
  
  // Extra data hooks mapping
  const [draws, setDraws] = useState([]);
  const [entries, setEntries] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loadingExtra, setLoadingExtra] = useState(true);

  // Filter & Review states
  const [statusFilter, setStatusFilter] = useState("all");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchExtraData = async () => {
    try {
      const supabase = createClient();

      // Fetch draws
      const { data: drawsList } = await supabase.from("draws").select("*");
      setDraws(drawsList || []);

      // Fetch draw entries to compare ticket numbers
      const { data: entriesList } = await supabase.from("draw_entries").select("*");
      setEntries(entriesList || []);

      // Fetch user profiles to resolve names
      const { data: usersList } = await supabase.from("profiles").select("*");
      if (usersList) {
        const mapping = {};
        usersList.forEach(u => {
          mapping[u.id] = u;
        });
        setProfiles(mapping);
      }
    } catch (err) {
      console.error("Error loading extra winners mapping data:", err);
    } finally {
      setLoadingExtra(false);
    }
  };

  useEffect(() => {
    fetchAllClaims();
    fetchExtraData();
  }, [fetchAllClaims]);

  const handleOpenReview = (claim) => {
    setSelectedClaim(claim);
    setAdminNotes("");
    setIsReviewOpen(true);
  };

  const handleAction = async (claimId, status) => {
    setSubmitting(true);
    try {
      const notes = adminNotes.trim() || `Verified and set to ${status} by Admin.`;
      await reviewClaim(claimId, status, notes);
      
      // Update local claims cache
      await fetchAllClaims();
      
      // Close modal
      setIsReviewOpen(false);
    } catch (err) {
      alert(err.message || "Failed to update claim.");
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedClaims = claims.map(claim => {
    const profile = profiles[claim.user_id];
    const draw = draws.find(d => d.id === claim.draw_id);
    const entry = entries.find(e => e.id === claim.entry_id);

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

  const filtered = statusFilter === "all"
    ? resolvedClaims
    : resolvedClaims.filter(c => c.status === statusFilter);

  const pendingCount = claims.filter(c => c.status === "pending").length;
  const approvedCount = claims.filter(c => c.status === "approved").length;
  const paidCount = claims.filter(c => c.status === "paid").length;

  if ((claimsLoading || loadingExtra) && claims.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Fetching winner claims..." />
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
        {/* Quick Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Claims", value: String(claims.length), icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Pending Review", value: String(pendingCount), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Approved Winners", value: String(approvedCount), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Disbursed / Paid", value: String(paidCount), icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10" },
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

        {/* Global errors */}
        {claimsError && (
          <motion.div variants={itemVariants}>
            <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-sm flex items-center gap-3 text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>{claimsError}</span>
            </div>
          </motion.div>
        )}

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
                <span className="ml-1 bg-amber-500/20 text-amber-400 text-[8px] px-1 py-0.5 rounded-sm font-bold">{pendingCount}</span>
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
                  <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Claim ID</TableHead>
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
                  const statusStyle = STATUS_STYLES[claim.status] || STATUS_STYLES.pending;
                  const StatusIcon = statusStyle.icon;

                  return (
                    <TableRow key={claim.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div>
                          <span className="text-xs font-bold text-white font-mono block">{claim.id}</span>
                          <span className="text-[10px] text-[#8A9690]">Ticket: {claim.ticketCode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-white font-semibold">
                        <div>
                          <span className="block">{claim.userName}</span>
                          <span className="text-[9px] text-[#8A9690] font-mono">{claim.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#8A9690]">{claim.drawTitle}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          claim.match_count === 5 ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20" :
                          claim.match_count === 4 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20" :
                          "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20"
                        }`}>
                          <Award className="w-2.5 h-2.5 mr-0.5" /> {claim.prize_category || `${claim.match_count} Match`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {claim.screenshot_url ? (
                          <a
                            href={claim.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-red-400 hover:underline inline-flex items-center gap-0.5 font-bold"
                          >
                            View Evidence <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-[#8A9690] italic">No URL</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${statusStyle.badge}`}>
                          <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          onClick={() => handleOpenReview(claim)}
                          className="bg-[#0D2B20] hover:bg-[#163D2E] text-white border border-[#162520] text-[10px] font-bold h-7 gap-1 px-3"
                          size="xs"
                        >
                          <Eye className="w-2.5 h-2.5" /> Review Claim
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="w-8 h-8 text-[#8A9690]/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#8A9690]">No winner claims registered.</p>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>

      {/* Detailed Review Claim Modal */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Verify Winner Payout Submission"
        className="max-w-2xl bg-[#070D0B] border-[#162520] text-white"
      >
        {selectedClaim && (
          <div className="space-y-6 text-sm">
            
            {/* Split Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-[#162520]">
              {/* Participant & Draw info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#8A9690] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-red-400" />
                  Winner Profile
                </h4>
                <div className="space-y-1">
                  <span className="text-sm font-bold text-white block">{selectedClaim.userName}</span>
                  <span className="text-xs text-[#8A9690] font-mono block">{selectedClaim.userEmail}</span>
                  <span className="text-[10px] text-[#8A9690] block">User ID: {selectedClaim.user_id}</span>
                </div>

                <h4 className="text-xs font-bold text-[#8A9690] uppercase tracking-wider flex items-center gap-1.5 pt-2">
                  <Gift className="w-3.5 h-3.5 text-red-400" />
                  Draw Specifications
                </h4>
                <div className="space-y-0.5 text-xs text-white">
                  <div><strong className="text-[#8A9690]">Draw:</strong> {selectedClaim.drawTitle}</div>
                  <div><strong className="text-[#8A9690]">Sponsor:</strong> {selectedClaim.drawSponsor}</div>
                  <div><strong className="text-[#8A9690]">Submitted:</strong> {new Date(selectedClaim.submitted_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Match Numbers Visual comparison */}
              <div className="space-y-3 p-4 bg-[#0A1C16] border border-[#162520] rounded-sm">
                <h4 className="text-xs font-bold text-[#8A9690] uppercase tracking-wider">
                  Ticket Numbers Audit
                </h4>
                <div>
                  <span className="text-[9px] text-[#8A9690] font-bold uppercase block mb-1">User Ticket Numbers</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedClaim.ticketNumbers.map((num, i) => {
                      const isMatch = selectedClaim.drawWinningNumbers.includes(num);
                      return (
                        <span
                          key={i}
                          className={`w-7 h-7 rounded-sm font-mono font-bold text-xs flex items-center justify-center border ${
                            isMatch
                              ? "bg-red-600/10 border-red-500/30 text-red-400"
                              : "bg-[#070D0B] border-[#162520] text-[#8A9690]"
                          }`}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-[#8A9690] font-bold uppercase block mb-1">Draw Winning Numbers</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedClaim.drawWinningNumbers.map((num, i) => (
                      <span
                        key={i}
                        className="w-7 h-7 rounded-sm bg-[#070D0B] border border-[#162520] font-mono font-bold text-xs flex items-center justify-center text-white"
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs border-t border-[#162520]">
                  <span className="text-[#8A9690] font-semibold">Match Outcome:</span>
                  <Badge variant="accent" className="font-bold">
                    {selectedClaim.prize_category || `${selectedClaim.match_count} Match`} ({selectedClaim.match_count} Matches)
                  </Badge>
                </div>
              </div>
            </div>

            {/* Evidence screenshot preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Evidence Screenshot */}
              <div className="space-y-2">
                <span className="text-[10px] text-[#8A9690] uppercase font-bold tracking-wider block">Uploaded Proof</span>
                <div className="w-full aspect-video border border-[#162520] bg-secondary/5 rounded-sm overflow-hidden flex items-center justify-center relative group">
                  {selectedClaim.screenshot_url ? (
                    <>
                      <img
                        src={selectedClaim.screenshot_url}
                        alt="Winner Claims Screenshot Proof"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <a
                        href={selectedClaim.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 bg-[#070D0B]/85 hover:bg-[#070D0B] text-white p-1 rounded-sm border border-[#162520] text-[10px] flex items-center gap-1 font-bold"
                      >
                        Open Full Image <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  ) : (
                    <FileText className="w-8 h-8 text-[#8A9690]/30" />
                  )}
                </div>
              </div>

              {/* Status transition history tracking logs */}
              <div className="space-y-3">
                <span className="text-[10px] text-[#8A9690] uppercase font-bold tracking-wider block">Status Transition Logs</span>
                <div className="space-y-3 relative pl-3.5 before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-px before:bg-[#162520] max-h-[170px] overflow-y-auto">
                  {(selectedClaim.status_history || [
                    { status: "pending", timestamp: selectedClaim.created_at || selectedClaim.submitted_at, notes: "Claim submitted by user." }
                  ]).map((log, idx) => {
                    const statusStyle = STATUS_STYLES[log.status] || STATUS_STYLES.pending;
                    return (
                      <div key={idx} className="relative text-xs space-y-0.5">
                        <span className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-[#0A1C16] border border-[#162520] flex items-center justify-center">
                          <span className="w-1 h-1 rounded-full bg-red-500" />
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white capitalize">{log.status}</span>
                          <span className="text-[9px] text-[#8A9690] font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-[#8A9690] leading-relaxed">{log.notes}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Action comment form */}
            <div className="space-y-2 pt-4 border-t border-[#162520]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9690] block">
                Verification Comments / Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  selectedClaim.status === "pending"
                    ? "Enter reasons for approval or details of rejection..."
                    : selectedClaim.status === "approved"
                      ? "Enter banking/disbursement reference details..."
                      : "Comments locked. Claim is finalized."
                }
                rows={3}
                disabled={selectedClaim.status === "paid" || selectedClaim.status === "rejected" || submitting}
                className="w-full p-3 bg-[#0A1C16] border border-[#162520] text-white text-xs rounded-sm focus:outline-none focus:border-red-500 transition-colors placeholder:text-muted-foreground/35"
              />
            </div>

            {/* Modal foot actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[#162520]">
              <Button
                variant="outline"
                onClick={() => setIsReviewOpen(false)}
                disabled={submitting}
                className="bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E] text-xs h-9"
              >
                Close Panel
              </Button>

              {selectedClaim.status === "pending" && (
                <>
                  <Button
                    onClick={() => handleAction(selectedClaim.id, "rejected")}
                    disabled={submitting}
                    className="bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-bold h-9"
                  >
                    Reject Claim
                  </Button>
                  <Button
                    onClick={() => handleAction(selectedClaim.id, "approved")}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 text-xs font-bold h-9"
                  >
                    Approve Claim
                  </Button>
                </>
              )}

              {selectedClaim.status === "approved" && (
                <Button
                  onClick={() => handleAction(selectedClaim.id, "paid")}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white border-0 text-xs font-bold h-9"
                >
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
