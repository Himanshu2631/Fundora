"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  History,
  Calendar,
} from "lucide-react";

const RISK_CONFIG = {
  "LOW RISK": {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    progressBar: "bg-emerald-500",
    icon: ShieldCheck,
    label: "Low Risk",
    summary: "Lower estimated underfunding risk based on initial 48h momentum.",
  },
  "MEDIUM RISK": {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
    text: "text-amber-400",
    progressBar: "bg-amber-500",
    icon: AlertTriangle,
    label: "Medium Risk",
    summary: "Moderate estimated underfunding risk based on initial 48h momentum.",
  },
  "HIGH RISK": {
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    dot: "bg-rose-400",
    text: "text-rose-400",
    progressBar: "bg-rose-500",
    icon: ShieldAlert,
    label: "High Risk",
    summary: "Elevated estimated underfunding risk based on initial 48h momentum.",
  },
};

/**
 * Helper to check if a campaign was created within the last 48 hours.
 */
function isPre48Hours(createdAt) {
  if (!createdAt) return false;
  try {
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    const elapsedMs = Date.now() - createdTime;
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    return elapsedMs < fortyEightHoursMs;
  } catch {
    return false;
  }
}

/**
 * Formats internal factor names into clean, readable user-facing labels.
 */
function formatFactorLabel(factor) {
  if (!factor) return "";
  const rawText = typeof factor === "string" ? factor : factor?.feature || JSON.stringify(factor);

  // If already a human sentence, return as-is
  if (rawText.includes(" ")) return rawText;

  // Map snake_case keys to clean labels
  const labelMap = {
    early_donations_count: "Initial contribution count",
    early_donations: "Initial donation volume",
    early_velocity: "Early donation velocity",
    goal: "Campaign target goal",
    verified_charity: "Verified organization profile",
    narrative_length: "Campaign story detail",
    category_velocity: "Category benchmark momentum",
  };

  return labelMap[rawText] || rawText.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formats an ISO timestamp into a consistent, readable local format.
 */
function formatTimestamp(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Formats technical assessment type into a clean, human-readable label.
 */
function formatAssessmentType(type) {
  if (type === "initial_48h") return "Initial 48h";
  if (type === "reassessment") return "Reassessment";
  if (type === "manual") return "Manual Review";
  return "Evaluation";
}

/**
 * User-facing Early Funding Viability component with transparency explanations
 * and chronological assessment history.
 *
 * @param {Object} props
 * @param {string} props.charityId - Campaign / charity UUID.
 * @param {string} [props.createdAt] - Campaign launch timestamp.
 * @param {boolean} [props.compact=false] - Compact rendering mode for card summaries.
 */
export default function EarlyViabilitySection({ charityId, createdAt, compact = false }) {
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [sortAscending, setSortAscending] = useState(false);

  const fetchViability = useCallback(async () => {
    if (!charityId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);

      const res = await fetch(`/api/campaigns/${encodeURIComponent(charityId)}/viability?history=true`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const payload = await res.json();
      if (payload?.success) {
        setAssessment(payload.data || null);
        setHistory(Array.isArray(payload.history) ? payload.history : []);
      } else {
        setAssessment(null);
        setHistory([]);
      }
    } catch {
      setError(true);
      setAssessment(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [charityId]);

  useEffect(() => {
    fetchViability();
  }, [fetchViability]);

  // ─── Loading Skeleton ──────────────────────────────────────────────────────
  if (loading) {
    if (compact) {
      return (
        <div className="h-5 w-28 bg-secondary/30 rounded-full animate-pulse inline-block" />
      );
    }
    return (
      <div className="bg-secondary/15 border border-border/40 p-4 rounded-xl space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-secondary/40 rounded" />
          <div className="h-4 w-20 bg-secondary/40 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 bg-secondary/30 rounded-lg" />
          <div className="h-12 bg-secondary/30 rounded-lg" />
          <div className="h-12 bg-secondary/30 rounded-lg" />
        </div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────
  if (error) {
    if (compact) return null;
    return (
      <div className="bg-secondary/10 border border-border/30 p-3 rounded-xl flex items-center gap-2.5 text-muted-foreground text-[10.5px]">
        <Info className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
        <span>Early funding viability data is currently unavailable.</span>
      </div>
    );
  }

  // ─── Pre-48 Hours State (< 48h elapsed) ────────────────────────────────────
  const pre48 = isPre48Hours(createdAt);
  if (!assessment && pre48) {
    if (compact) {
      return (
        <Badge
          variant="outline"
          className="text-[8px] py-0.5 px-2 bg-secondary/20 border-border/40 text-muted-foreground font-normal inline-flex items-center gap-1"
        >
          <Clock className="w-2.5 h-2.5 text-accent" />
          <span>48h Evaluation Window</span>
        </Badge>
      );
    }
    return (
      <div className="bg-secondary/15 border border-border/40 p-3.5 rounded-xl space-y-1.5">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-bold text-foreground font-heading">Early Funding Viability</span>
          <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-accent/10 text-accent border-accent/20 font-medium ml-auto">
            Initial Window
          </Badge>
        </div>
        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
          Early funding viability will be available after the campaign has accumulated 48 hours of activity.
        </p>
      </div>
    );
  }

  // ─── Missing Assessment State (≥ 48h elapsed but no assessment stored) ──────
  if (!assessment) {
    if (compact) return null;
    return (
      <div className="bg-secondary/15 border border-border/40 p-3.5 rounded-xl space-y-1.5">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground font-heading">Early Funding Viability</span>
        </div>
        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
          Early funding viability assessment is currently unavailable.
        </p>
      </div>
    );
  }

  // ─── Failed Assessment State ──────────────────────────────────────────────
  if (assessment.status === "failed") {
    if (compact) {
      return (
        <Badge
          variant="outline"
          className="text-[8.5px] py-0.5 px-2 font-semibold border bg-rose-500/10 text-rose-400 border-rose-500/20 inline-flex items-center gap-1"
        >
          <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
          <span>Evaluation Incomplete</span>
        </Badge>
      );
    }
    return (
      <div className="bg-secondary/15 border border-border/40 p-3.5 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs font-bold text-foreground font-heading">Early Funding Viability</span>
          </div>
          <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold uppercase">
            Failed
          </Badge>
        </div>
        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
          The early funding viability assessment could not be completed for this campaign. Reassessment will be attempted during the next evaluation cycle.
        </p>
      </div>
    );
  }

  // ─── Assessment Available State ───────────────────────────────────────────
  const riskMeta = RISK_CONFIG[assessment.risk_level] || RISK_CONFIG["MEDIUM RISK"];
  const RiskIcon = riskMeta.icon;

  const viabilityScore = Number(assessment.viability_score);
  const riskProbability = Number(assessment.risk_probability);
  const supportingFactors = Array.isArray(assessment.top_supporting_factors) ? assessment.top_supporting_factors : [];
  const riskFactors = Array.isArray(assessment.top_risk_factors) ? assessment.top_risk_factors : [];

  // Sort chronological history based on user selection with deterministic tie-breaking by id
  const sortedHistory = [...history].sort((a, b) => {
    const tA = new Date(a.created_at).getTime() || 0;
    const tB = new Date(b.created_at).getTime() || 0;
    if (tA !== tB) {
      return sortAscending ? tA - tB : tB - tA;
    }
    const idA = String(a.id || "");
    const idB = String(b.id || "");
    return sortAscending ? idA.localeCompare(idB) : idB.localeCompare(idA);
  });

  // Resolve single latest assessment ID deterministically
  const latestAssessmentRecord = assessment || (history.length > 0 ? [...history].sort((a, b) => {
    const tA = new Date(a.created_at).getTime() || 0;
    const tB = new Date(b.created_at).getTime() || 0;
    if (tA !== tB) return tB - tA;
    return String(b.id || "").localeCompare(String(a.id || ""));
  })[0] : null);

  const latestAssessmentId = latestAssessmentRecord?.id || null;

  // Compact rendering (for card badges/pills)
  if (compact) {
    return (
      <Badge
        variant="outline"
        className={`text-[8.5px] py-0.5 px-2 font-semibold border ${riskMeta.badge} inline-flex items-center gap-1`}
        title={`Early Viability Score: ${viabilityScore}/100 (${riskMeta.label})`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${riskMeta.dot}`} />
        <span>Viability: {viabilityScore}/100</span>
        <span className="opacity-75">• {riskMeta.label}</span>
      </Badge>
    );
  }

  // Full section rendering with transparency disclosure and assessment history
  return (
    <div className="bg-secondary/15 border border-border/50 p-4 rounded-xl space-y-3.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border/30 pb-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <h4 className="text-xs font-bold text-foreground font-heading tracking-tight">
              Early Funding Viability
            </h4>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Estimated from campaign information and activity during the first 48 hours.
          </p>
        </div>

        <Badge
          variant="outline"
          className={`text-[9px] py-0.5 px-2 font-bold uppercase tracking-wider border shrink-0 ${riskMeta.badge} inline-flex items-center gap-1`}
        >
          <RiskIcon className="w-3 h-3" />
          <span>{assessment.risk_level}</span>
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Viability Score */}
        <div className="bg-background/60 p-2.5 rounded-lg border border-border/40 space-y-1">
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">
            Viability Score
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-foreground font-heading">
              {Number.isFinite(viabilityScore) ? viabilityScore : "—"}
            </span>
            <span className="text-[9px] text-muted-foreground">/ 100</span>
          </div>
          <div className="w-full h-1 bg-secondary/40 rounded-full overflow-hidden">
            <div
              className={`h-full ${riskMeta.progressBar}`}
              style={{ width: `${Math.min(100, Math.max(0, viabilityScore))}%` }}
            />
          </div>
        </div>

        {/* Risk Probability */}
        <div className="bg-background/60 p-2.5 rounded-lg border border-border/40 space-y-1">
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">
            Risk Probability
          </span>
          <div className="text-base font-black text-foreground font-heading">
            {Number.isFinite(riskProbability)
              ? `${(riskProbability * 100).toFixed(1)}%`
              : "—"}
          </div>
          <span className="text-[8.5px] text-muted-foreground block leading-none">
            Underfunding Risk
          </span>
        </div>

        {/* Evaluation Horizon */}
        <div className="bg-background/60 p-2.5 rounded-lg border border-border/40 space-y-1">
          <span className="text-[9px] uppercase font-bold text-muted-foreground block">
            Prediction Horizon
          </span>
          <div className="text-base font-black text-foreground font-heading">
            {assessment.prediction_horizon_hours || 48}
            <span className="text-[10px] font-normal text-muted-foreground ml-0.5">hrs</span>
          </div>
          <span className="text-[8.5px] text-muted-foreground block leading-none">
            Initial Telemetry
          </span>
        </div>
      </div>

      {/* Assessment Factors (Top SHAP factors for latest assessment) */}
      {(supportingFactors.length > 0 || riskFactors.length > 0) && (
        <div className="space-y-2 pt-1 border-t border-border/20">
          <span className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Latest assessment factors
          </span>

          <div className="space-y-1.5">
            {/* Supporting Factors */}
            {supportingFactors.length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] text-emerald-400/90 font-medium block">
                  Factors associated with stronger estimated funding viability:
                </span>
                {supportingFactors.slice(0, 2).map((factor, idx) => (
                  <div
                    key={`sup-${idx}`}
                    className="flex items-start gap-1.5 text-[10px] text-foreground/90 bg-emerald-500/5 border border-emerald-500/15 px-2 py-1 rounded-md"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{formatFactorLabel(factor)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Risk Factors */}
            {riskFactors.length > 0 && (
              <div className="space-y-1 pt-0.5">
                <span className="text-[9px] text-amber-400/90 font-medium block">
                  Factors associated with higher estimated underfunding risk:
                </span>
                {riskFactors.slice(0, 2).map((factor, idx) => (
                  <div
                    key={`risk-${idx}`}
                    className="flex items-start gap-1.5 text-[10px] text-foreground/90 bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded-md"
                  >
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{formatFactorLabel(factor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Assessment History Section ───────────────────────────────────── */}
      <div className="pt-2 border-t border-border/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            aria-expanded={showHistory}
            className="flex items-center gap-1.5 text-xs font-bold text-foreground font-heading hover:text-accent transition-colors focus:outline-none"
          >
            <History className="w-3.5 h-3.5 text-accent" />
            <span>Assessment History</span>
            {history.length > 0 && (
              <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-secondary/30 text-muted-foreground border-border/40 font-mono">
                {history.length}
              </Badge>
            )}
            {showHistory ? <ChevronUp className="w-3 h-3 text-muted-foreground ml-1" /> : <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />}
          </button>

          {showHistory && history.length > 1 && (
            <button
              type="button"
              onClick={() => setSortAscending((prev) => !prev)}
              className="text-[9px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-secondary/20 transition-colors focus:outline-none"
              title="Toggle chronological sort order"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>{sortAscending ? "Oldest First" : "Newest First"}</span>
            </button>
          )}
        </div>

        {showHistory && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-background/50 border border-border/30 text-center text-[10px] text-muted-foreground">
                No previous assessment records found for this campaign.
              </div>
            ) : (
              <div className="space-y-1.5">
                {sortedHistory.map((rec) => {
                  const isLatest = Boolean(rec.id && rec.id === latestAssessmentId);
                  const isFailed = rec.status === "failed";
                  const recMeta = RISK_CONFIG[rec.risk_level] || RISK_CONFIG["MEDIUM RISK"];
                  const recScore = Number(rec.viability_score);
                  const recProb = Number(rec.risk_probability);
                  const isExpanded = expandedRecordId === rec.id;
                  const recSupporting = Array.isArray(rec.top_supporting_factors) ? rec.top_supporting_factors : [];
                  const recRisk = Array.isArray(rec.top_risk_factors) ? rec.top_risk_factors : [];
                  const hasFactors = !isFailed && (recSupporting.length > 0 || recRisk.length > 0);

                  return (
                    <div
                      key={rec.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        isLatest
                          ? "bg-background/80 border-accent/30 shadow-xs"
                          : "bg-background/50 border-border/30 hover:border-border/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Badges & Timestamp */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isLatest && (
                            <Badge
                              variant="outline"
                              className="text-[8px] py-0 px-1.5 bg-accent/15 text-accent border-accent/40 font-bold tracking-wider uppercase"
                            >
                              Latest
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[8px] py-0 px-1.5 bg-secondary/30 text-muted-foreground border-border/30 font-medium"
                          >
                            {formatAssessmentType(rec.assessment_type)}
                          </Badge>
                          <span className="text-[9.5px] text-muted-foreground font-mono flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 opacity-70" />
                            {formatTimestamp(rec.created_at)}
                          </span>
                        </div>

                        {/* Status / Risk Level Badge */}
                        {isFailed ? (
                          <Badge
                            variant="outline"
                            className="text-[8px] py-0 px-1.5 font-bold uppercase tracking-wider shrink-0 bg-rose-500/15 text-rose-400 border-rose-500/30"
                          >
                            <AlertCircle className="w-2.5 h-2.5 mr-1" />
                            Failed
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-[8px] py-0 px-1.5 font-bold uppercase tracking-wider shrink-0 ${recMeta.badge}`}
                          >
                            <span className={`w-1 h-1 rounded-full mr-1 ${recMeta.dot}`} />
                            {rec.risk_level}
                          </Badge>
                        )}
                      </div>

                      {/* Metrics Summary or Failure Notice */}
                      {isFailed ? (
                        <div className="pt-1.5 mt-1 border-t border-border/15 text-[10px] text-muted-foreground italic">
                          Assessment attempt was not completed.
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border/15 text-[10px]">
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-[8.5px] text-muted-foreground uppercase mr-1">Score:</span>
                              <span className="font-bold text-foreground font-heading">
                                {Number.isFinite(recScore) ? recScore : "—"}/100
                              </span>
                            </div>
                            <div>
                              <span className="text-[8.5px] text-muted-foreground uppercase mr-1">Underfunding Risk:</span>
                              <span className="font-bold text-foreground font-heading">
                                {Number.isFinite(recProb) ? `${(recProb * 100).toFixed(1)}%` : "—"}
                              </span>
                            </div>
                            {rec.prediction_horizon_hours && (
                              <div className="hidden sm:block text-muted-foreground text-[8.5px]">
                                <span>Horizon: {rec.prediction_horizon_hours}h</span>
                              </div>
                            )}
                          </div>

                          {/* Per-Assessment Factors Toggle */}
                          {hasFactors && (
                            <button
                              type="button"
                              onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                              aria-expanded={isExpanded}
                              className="text-[9px] text-accent hover:text-accent/80 font-medium flex items-center gap-0.5 focus:outline-none transition-colors"
                            >
                              <span>{isExpanded ? "Hide factors" : "View factors"}</span>
                              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Granular Factors strictly isolated for this specific record */}
                      {isExpanded && hasFactors && (
                        <div className="mt-2 pt-2 border-t border-border/20 space-y-1.5 text-[9.5px]">
                          {recSupporting.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[8.5px] text-emerald-400 font-medium block">
                                Supporting Factors:
                              </span>
                              {recSupporting.map((f, i) => (
                                <div
                                  key={`hist-sup-${i}`}
                                  className="flex items-start gap-1 text-foreground/85 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 text-[9px]"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{formatFactorLabel(f)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {recRisk.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <span className="text-[8.5px] text-amber-400 font-medium block">
                                Risk Factors:
                              </span>
                              {recRisk.map((f, i) => (
                                <div
                                  key={`hist-risk-${i}`}
                                  className="flex items-start gap-1 text-foreground/85 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 text-[9px]"
                                >
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-400 shrink-0 mt-0.5" />
                                  <span>{formatFactorLabel(f)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Collapsible Transparency & Explanation Section ──────────────── */}
      <div className="pt-1 border-t border-border/20">
        <button
          type="button"
          onClick={() => setShowExplanation((prev) => !prev)}
          aria-expanded={showExplanation}
          className="w-full flex items-center justify-between text-[10px] text-accent hover:text-accent/80 font-medium py-1 focus:outline-none transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3 h-3" />
            <span>How this assessment works</span>
          </span>
          {showExplanation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showExplanation && (
          <div className="mt-2 p-2.5 rounded-lg bg-background/70 border border-border/30 space-y-2 text-[9.5px] text-muted-foreground leading-relaxed">
            <p>
              This assessment estimates early funding viability using information available during the campaign&apos;s first 48 hours, including campaign details and early activity. It is an analytical estimate, not a guarantee of campaign performance.
            </p>
            <div className="space-y-1 pt-1 border-t border-border/20">
              <p>
                <strong className="text-foreground">Viability Score:</strong> Indicates the model&apos;s estimated funding outlook on a 0–100 scale.
              </p>
              <p>
                <strong className="text-foreground">Risk Probability:</strong> Represents the model&apos;s estimated probability of the campaign remaining underfunded at the prediction horizon.
              </p>
              <p>
                <strong className="text-foreground">Risk Level:</strong> Summarizes the model&apos;s estimated underfunding risk ({riskMeta.summary}).
              </p>
              <p>
                <strong className="text-foreground">Prediction Horizon:</strong> 48 hours. The assessment uses information available during the first 48 hours of campaign activity.
              </p>
              {assessment.base_rate_risk && (
                <p>
                  <strong className="text-foreground">Reference Baseline:</strong> The dataset&apos;s observed benchmark underfunding rate ({(assessment.base_rate_risk * 100).toFixed(1)}%) used as a model reference.
                </p>
              )}
            </div>
            <p className="italic pt-1 border-t border-border/20 text-[8.5px] text-muted-foreground/80">
              Developed as part of Sahayata&apos;s research system for early funding viability assessment.
            </p>
          </div>
        )}
      </div>

      {/* Neutral Advisory Notice */}
      <p className="text-[9px] text-muted-foreground leading-relaxed italic border-t border-border/20 pt-1">
        Notice: Based on campaign activity during the first 48 hours. This statistical prediction is for decision-support and does not guarantee campaign outcomes.
      </p>
    </div>
  );
}
