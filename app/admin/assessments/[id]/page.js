"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Activity,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Calendar,
  Layers,
  Cpu,
  RefreshCw,
  Sparkles,
  Info,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  HelpCircle,
  Target,
  FileText,
} from "lucide-react";

const RISK_CONFIG = {
  "LOW RISK": {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
    banner: "from-emerald-950/40 via-[#0A1C16] to-[#0A1C16] border-emerald-500/30",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    progressBar: "bg-emerald-500",
    icon: ShieldCheck,
    label: "Low Risk",
    summary: "High probability of campaign funding target attainment based on 48h telemetry.",
  },
  "MEDIUM RISK": {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
    banner: "from-amber-950/40 via-[#0A1C16] to-[#0A1C16] border-amber-500/30",
    dot: "bg-amber-400",
    text: "text-amber-400",
    progressBar: "bg-amber-500",
    icon: AlertTriangle,
    label: "Medium Risk",
    summary: "Moderate velocity observed. Close monitoring recommended as campaign progresses.",
  },
  "HIGH RISK": {
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/20",
    banner: "from-rose-950/40 via-[#0A1C16] to-[#0A1C16] border-rose-500/30",
    dot: "bg-rose-400",
    text: "text-rose-400",
    progressBar: "bg-rose-500",
    icon: ShieldAlert,
    label: "High Risk",
    summary: "Telemetry indicates low early momentum relative to campaign target horizon.",
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 85, damping: 15 },
  },
};

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
      timeZoneName: "short",
    });
  } catch {
    return "—";
  }
}

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function AssessmentDetailPage({ params: paramsProp }) {
  const routerParams = useParams();
  // Support both unwrapped prop, promise prop, or hook
  const rawParams = paramsProp ? (typeof paramsProp.then === "function" ? use(paramsProp) : paramsProp) : routerParams;
  const assessmentId = rawParams?.id;

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const fetchAssessmentDetail = useCallback(async () => {
    if (!assessmentId) return;

    try {
      setLoading(true);
      setError(null);
      setNotFound(false);

      const res = await fetch(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (res.status === 404) {
        setNotFound(true);
        setAssessment(null);
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || `Failed to load assessment (HTTP ${res.status})`);
      }

      const payload = await res.json();
      if (payload?.success && payload?.data) {
        setAssessment(payload.data);
      } else {
        throw new Error("Invalid response format received from assessment service.");
      }
    } catch (err) {
      console.error("[Assessment Detail Fetch Error]:", err);
      setError(err.message || "An unexpected error occurred while loading this assessment.");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchAssessmentDetail();
  }, [fetchAssessmentDetail]);

  const handleCopyId = (idToCopy) => {
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ─── Loading Skeleton State ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top bar skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-9 w-40 bg-[#162520] rounded-md animate-pulse" />
          <div className="h-9 w-28 bg-[#162520] rounded-md animate-pulse" />
        </div>

        {/* Campaign overview banner skeleton */}
        <Card className="bg-[#0A1C16] border-[#162520] p-6 space-y-4 animate-pulse">
          <div className="h-4 w-32 bg-[#162520] rounded" />
          <div className="h-8 w-2/3 bg-[#162520] rounded" />
          <div className="flex gap-4">
            <div className="h-5 w-24 bg-[#162520] rounded-full" />
            <div className="h-5 w-36 bg-[#162520] rounded-full" />
          </div>
        </Card>

        {/* Primary metrics grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-[#0A1C16] border-[#162520] p-5 space-y-3 animate-pulse">
              <div className="h-4 w-24 bg-[#162520] rounded" />
              <div className="h-8 w-32 bg-[#162520] rounded" />
              <div className="h-3 w-40 bg-[#162520] rounded" />
            </Card>
          ))}
        </div>

        {/* Factor breakdown skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#0A1C16] border-[#162520] p-6 space-y-4 animate-pulse">
            <div className="h-6 w-44 bg-[#162520] rounded" />
            <div className="space-y-2">
              <div className="h-12 bg-[#162520] rounded" />
              <div className="h-12 bg-[#162520] rounded" />
              <div className="h-12 bg-[#162520] rounded" />
            </div>
          </Card>
          <Card className="bg-[#0A1C16] border-[#162520] p-6 space-y-4 animate-pulse">
            <div className="h-6 w-44 bg-[#162520] rounded" />
            <div className="space-y-2">
              <div className="h-12 bg-[#162520] rounded" />
              <div className="h-12 bg-[#162520] rounded" />
              <div className="h-12 bg-[#162520] rounded" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ─── 404 Not Found State ────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto my-12 text-center">
        <Card className="bg-[#0A1C16] border-[#162520] p-8 sm:p-10 space-y-5">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-heading">Assessment Not Found</h2>
            <p className="text-xs text-[#8A9690] leading-relaxed max-w-md mx-auto">
              The requested campaign viability assessment ID <code className="text-emerald-400 bg-[#162520] px-1.5 py-0.5 rounded text-[11px] font-mono">{assessmentId}</code> does not exist or has been archived.
            </p>
          </div>
          <div className="pt-2">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4">
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Return to Admin Dashboard
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────
  if (error || !assessment) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto my-12 text-center">
        <Card className="bg-[#0A1C16] border-[#162520] p-8 sm:p-10 space-y-5">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-heading">Unable to Load Assessment</h2>
            <p className="text-xs text-rose-400/90 leading-relaxed max-w-md mx-auto">
              {error || "An unexpected error occurred while retrieving this assessment record."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAssessmentDetail}
              className="bg-[#0D2B20] border-[#162520] text-emerald-400 hover:bg-emerald-500/10 text-xs h-9 px-4 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4">
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Normal View Rendering ──────────────────────────────────────────────────
  const riskMeta = RISK_CONFIG[assessment.risk_level] || RISK_CONFIG["MEDIUM RISK"];
  const RiskIcon = riskMeta.icon;

  const campaign = assessment.campaign;
  const campaignName = campaign?.name || `Campaign #${assessment.campaign_id?.slice(0, 8) || "N/A"}`;
  const campaignCategory = campaign?.category || "General";
  const campaignCreatedAt = campaign?.created_at;

  const viabilityScore = Number(assessment.viability_score);
  const riskProbability = Number(assessment.risk_probability);
  const baseRateRisk = Number(assessment.base_rate_risk ?? 0.4996);

  const supportingFactors = Array.isArray(assessment.top_supporting_factors) ? assessment.top_supporting_factors : [];
  const riskFactors = Array.isArray(assessment.top_risk_factors) ? assessment.top_risk_factors : [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto"
    >
      {/* ── Top Navigation Bar ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="bg-[#0A1C16] border-[#162520] text-[#8A9690] hover:text-white hover:bg-[#162520] text-xs h-8 px-3"
          >
            <Link href="/admin/dashboard" className="flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#8A9690]">
            <Link href="/admin/dashboard" className="hover:text-emerald-400 transition-colors">
              Admin
            </Link>
            <span>/</span>
            <Link href="/admin/dashboard" className="hover:text-emerald-400 transition-colors">
              Viability
            </Link>
            <span>/</span>
            <span className="text-white truncate max-w-[140px]">{assessment.id.slice(0, 8)}...</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAssessmentDetail}
            className="bg-[#0A1C16] border-[#162520] text-[#8A9690] hover:text-white hover:bg-[#162520] text-xs h-8 px-3 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </Button>

          {campaign && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="bg-[#0D2B20] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs h-8 px-3"
            >
              <Link href="/admin/charities" className="flex items-center gap-1.5">
                <span>View in Charities</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Campaign Context & Overview Banner ── */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-[#0A1C16] via-[#0A1C16] to-[#0D2B20]/40 border-[#162520] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/25 text-emerald-400 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                    {campaignCategory}
                  </Badge>
                  <span className="text-[11px] text-[#8A9690] flex items-center gap-1 font-mono">
                    ID: {assessment.campaign_id}
                    <button
                      type="button"
                      onClick={() => handleCopyId(assessment.campaign_id)}
                      className="text-[#8A9690] hover:text-white transition-colors"
                      title="Copy Campaign ID"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight">
                  {campaignName}
                </h1>

                {campaign?.description && (
                  <p className="text-xs text-[#8A9690] line-clamp-2 max-w-3xl leading-relaxed">
                    {campaign.description}
                  </p>
                )}
              </div>

              {/* Assessment Type Badge */}
              <div className="shrink-0 flex flex-col sm:items-end gap-1.5">
                <div className="flex items-center gap-1.5 text-xs text-white/90 bg-[#162520]/80 border border-[#1E3A2E] rounded-md px-3 py-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-medium capitalize">{assessment.assessment_type?.replace(/_/g, " ") || "Initial 48h Assessment"}</span>
                </div>
                <p className="text-[10px] text-[#8A9690] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#8A9690]/70" />
                  {campaignCreatedAt ? `Launched ${formatRelativeTime(campaignCreatedAt)}` : "Campaign Telemetry Evaluated"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Primary Assessment Result (Key Metrics Grid) ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Viability Score Card */}
        <Card className="bg-[#0A1C16] border-[#162520] hover:border-emerald-500/20 transition-all relative overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#8A9690]">
              <span className="uppercase tracking-wider font-semibold text-[10px]">Viability Score</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white font-heading tracking-tight">
                  {Number.isFinite(viabilityScore) ? viabilityScore : "—"}
                </span>
                <span className="text-xs text-[#8A9690] font-medium">/ 100</span>
              </div>

              {/* Progress bar visual */}
              <div className="w-full h-1.5 bg-[#162520] rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full ${riskMeta.progressBar} transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(0, viabilityScore))}%` }}
                />
              </div>
            </div>

            <p className="text-[10px] text-[#8A9690] leading-tight">
              Stored composite score measuring expected funding attainment momentum.
            </p>
          </CardContent>
        </Card>

        {/* Risk Probability Card */}
        <Card className="bg-[#0A1C16] border-[#162520] hover:border-emerald-500/20 transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#8A9690]">
              <span className="uppercase tracking-wider font-semibold text-[10px]">Risk Probability</span>
              <Target className="w-4 h-4 text-amber-400" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white font-heading tracking-tight">
                  {Number.isFinite(riskProbability)
                    ? `${(riskProbability * 100).toFixed(1)}%`
                    : "—"}
                </span>
              </div>
              <p className="text-[10px] text-[#8A9690] pt-1">
                Calibrated estimated risk of failing to reach funding goal.
              </p>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-[#8A9690]/80">
              <span>Benchmark baseline:</span>
              <span className="font-semibold text-white/80">{(baseRateRisk * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Risk Level Card */}
        <Card className="bg-[#0A1C16] border-[#162520] hover:border-emerald-500/20 transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#8A9690]">
              <span className="uppercase tracking-wider font-semibold text-[10px]">Risk Level</span>
              <RiskIcon className={`w-4 h-4 ${riskMeta.text}`} />
            </div>

            <div className="pt-1">
              <Badge
                variant="outline"
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${riskMeta.badge}`}
              >
                <span className={`w-2 h-2 rounded-full ${riskMeta.dot} animate-pulse`} />
                <span>{assessment.risk_level || "UNKNOWN"}</span>
              </Badge>
            </div>

            <p className="text-[10px] text-[#8A9690] leading-tight">
              {riskMeta.summary}
            </p>
          </CardContent>
        </Card>

        {/* Horizon & Assessment Date Card */}
        <Card className="bg-[#0A1C16] border-[#162520] hover:border-emerald-500/20 transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#8A9690]">
              <span className="uppercase tracking-wider font-semibold text-[10px]">Prediction Horizon</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <span className="text-3xl font-extrabold text-white font-heading tracking-tight">
                {assessment.prediction_horizon_hours || 48}
                <span className="text-sm font-normal text-[#8A9690] ml-1">hours</span>
              </span>
            </div>

            <div className="space-y-0.5 text-[10px]">
              <p className="text-white/90 font-medium">
                {formatTimestamp(assessment.created_at)}
              </p>
              <p className="text-[#8A9690]/70">
                {formatRelativeTime(assessment.created_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Explanation & Model Factors Section ── */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-base font-bold text-white font-heading flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Model Factors Associated with Assessment
            </h2>
            <p className="text-xs text-[#8A9690] leading-relaxed mt-0.5">
              Identified by the machine learning classifier from early campaign dynamics. These factors correlate with historical funding patterns.
            </p>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto bg-[#162520] border-[#1E3A2E] text-[#8A9690] text-[10px]">
            Statistical Signals
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supporting Factors Panel */}
          <Card className="bg-[#0A1C16] border-[#162520] flex flex-col">
            <CardHeader className="pb-3 border-b border-[#162520]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-white">Supporting Factors</CardTitle>
                    <CardDescription className="text-[11px] text-[#8A9690]">
                      Telemetry indicators positively associated with campaign viability
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                  {supportingFactors.length} {supportingFactors.length === 1 ? "factor" : "factors"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 flex-1">
              {supportingFactors.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#8A9690]/30 mx-auto" />
                  <p className="text-xs text-white/80 font-medium">No major supporting factors recorded</p>
                  <p className="text-[11px] text-[#8A9690] max-w-xs mx-auto">
                    No primary positive indicators met the significance threshold in the 48-hour evaluation window.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {supportingFactors.map((factor, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-lg bg-[#060C0A]/60 border border-emerald-500/15 hover:border-emerald-500/30 transition-colors flex items-start gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="text-xs text-white/95 font-medium leading-snug">
                          {typeof factor === "string" ? factor : factor?.feature || JSON.stringify(factor)}
                        </p>
                        {factor?.impact && (
                          <p className="text-[10px] text-emerald-400/80 font-mono">
                            Relative signal weight: +{Number(factor.impact).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Risk Factors Panel */}
          <Card className="bg-[#0A1C16] border-[#162520] flex flex-col">
            <CardHeader className="pb-3 border-b border-[#162520]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-white">Risk Factors</CardTitle>
                    <CardDescription className="text-[11px] text-[#8A9690]">
                      Telemetry indicators associated with reduced funding probability
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                  {riskFactors.length} {riskFactors.length === 1 ? "factor" : "factors"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 flex-1">
              {riskFactors.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-400/30 mx-auto" />
                  <p className="text-xs text-white/80 font-medium">No elevated risk factors detected</p>
                  <p className="text-[11px] text-[#8A9690] max-w-xs mx-auto">
                    The model did not observe strong negative risk indicators during the 48-hour evaluation window.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {riskFactors.map((factor, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-lg bg-[#060C0A]/60 border border-amber-500/15 hover:border-amber-500/30 transition-colors flex items-start gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="text-xs text-white/95 font-medium leading-snug">
                          {typeof factor === "string" ? factor : factor?.feature || JSON.stringify(factor)}
                        </p>
                        {factor?.impact && (
                          <p className="text-[10px] text-amber-400/80 font-mono">
                            Relative risk weight: +{Number(factor.impact).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Technical Model Information & Base-Rate Context ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Base-rate Reference Card */}
        <Card className="bg-[#0A1C16] border-[#162520] lg:col-span-1">
          <CardHeader className="pb-3 border-b border-[#162520]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <CardTitle className="text-sm font-bold text-white">Reference Risk Rate</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-[#8A9690]">
              Benchmark baseline across observed training population
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="p-4 rounded-lg bg-[#060C0A]/60 border border-[#162520] space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#8A9690]">Population Baseline</span>
                <span className="text-xl font-bold text-white font-mono">
                  {Number.isFinite(baseRateRisk) ? `${(baseRateRisk * 100).toFixed(2)}%` : "49.96%"}
                </span>
              </div>
              <div className="w-full h-1 bg-[#162520] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#8A9690]/60 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, baseRateRisk * 100))}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-[#8A9690] leading-relaxed">
              The benchmark rate represents the historical baseline risk across evaluated campaign cohorts. It serves as an uncalibrated population prior for relative model comparison.
            </p>
          </CardContent>
        </Card>

        {/* Technical Model Metadata Card */}
        <Card className="bg-[#0A1C16] border-[#162520] lg:col-span-2">
          <CardHeader className="pb-3 border-b border-[#162520]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <CardTitle className="text-sm font-bold text-white">Model Specification & Provenance</CardTitle>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono">
                {assessment.model_type || "RandomForest"}
              </Badge>
            </div>
            <CardDescription className="text-[11px] text-[#8A9690]">
              Auditable machine learning system metadata and calibration method
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-[#060C0A]/60 border border-[#162520] space-y-1">
                <span className="text-[10px] text-[#8A9690] uppercase font-semibold">Model Name</span>
                <p className="text-xs font-medium text-white truncate" title={assessment.model_name}>
                  {assessment.model_name || "Random Forest Champion"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060C0A]/60 border border-[#162520] space-y-1">
                <span className="text-[10px] text-[#8A9690] uppercase font-semibold">Architecture</span>
                <p className="text-xs font-medium text-white truncate" title={assessment.model_type}>
                  {assessment.model_type || "RandomForestClassifier"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060C0A]/60 border border-[#162520] space-y-1">
                <span className="text-[10px] text-[#8A9690] uppercase font-semibold">Engineered Features</span>
                <p className="text-xs font-medium text-white">
                  {assessment.n_features || 56} Telemetry Features
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#060C0A]/60 border border-[#162520] space-y-1">
                <span className="text-[10px] text-[#8A9690] uppercase font-semibold">Probability Calibration</span>
                <p className="text-xs font-medium text-white truncate" title={assessment.calibration}>
                  {assessment.calibration || "Platt Scaling (Sigmoid)"}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#162520] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#8A9690]">
              <span className="font-mono truncate">Assessment ID: {assessment.id}</span>
              <button
                type="button"
                onClick={() => handleCopyId(assessment.id)}
                className="hover:text-emerald-400 flex items-center gap-1 transition-colors self-start sm:self-auto"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId ? "Copied" : "Copy Assessment ID"}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Research & Ethical Disclaimer Banner ── */}
      <motion.div variants={itemVariants}>
        <div className="p-4 rounded-lg bg-[#0A1C16] border border-[#162520] flex items-start gap-3 text-[#8A9690]">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <p className="text-white/90 font-medium">Advisory Decision Support Notice</p>
            <p>
              {assessment.research_disclaimer ||
                "Funding viability assessments are statistical estimates generated by machine learning models to assist administrative platform monitoring. They estimate funding probability based on early momentum signals and do not evaluate campaign legitimacy, creator trustworthiness, or guarantee campaign outcomes."}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
