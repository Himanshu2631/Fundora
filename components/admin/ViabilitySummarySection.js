"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Clock,
  TrendingUp,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export default function ViabilitySummarySection() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchViabilitySummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/assessments/summary", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load assessment summary (Status ${res.status})`);
      }

      const payload = await res.json();
      if (payload?.success && payload?.data) {
        setSummary(payload.data);
      } else {
        throw new Error(payload?.error || "Invalid response format");
      }
    } catch (err) {
      console.error("[ViabilitySummarySection Error]:", err.message);
      setError("Unable to load viability assessment summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViabilitySummary();
  }, []);

  const formatRelativeTime = (isoString) => {
    if (!isoString) return "No assessments";
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const seconds = Math.floor(diffMs / 1000);
      if (seconds < 60) return "Just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "—";
    }
  };

  // Loading skeleton state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Campaign Viability Overview
            </h3>
            <p className="text-[10px] text-[#8A9690] mt-0.5">
              48-hour automated machine learning viability assessment statistics.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 bg-[#0A1C16] border-[#162520] animate-pulse">
              <div className="h-3 w-16 bg-[#162520] rounded mb-3" />
              <div className="h-6 w-12 bg-[#162520] rounded mb-2" />
              <div className="h-2.5 w-20 bg-[#162520] rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-5 bg-[#0A1C16] border-red-500/20 text-center">
        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <p className="text-xs font-semibold text-white/90">{error}</p>
          <button
            onClick={fetchViabilitySummary}
            className="text-[10px] text-red-400 hover:text-red-300 underline flex items-center gap-1 mt-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry loading
          </button>
        </div>
      </Card>
    );
  }

  // Empty state
  if (!summary || !summary.hasAssessments || summary.totalAssessed === 0) {
    return (
      <Card className="p-6 bg-[#0A1C16] border-[#162520]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-heading text-xs font-bold text-white uppercase tracking-wider">
                Campaign Viability Assessments
              </h3>
              <p className="text-xs text-[#8A9690] mt-1 leading-relaxed">
                No campaign viability assessments yet. Automated 48-hour assessments will appear here once candidate campaigns reach the maturity cutoff.
              </p>
            </div>
          </div>
          <Badge className="bg-[#162520] text-[#8A9690] border-[#1E3A2E] text-[10px] px-3 py-1 shrink-0">
            Awaiting 48h Maturity
          </Badge>
        </div>
      </Card>
    );
  }

  // Populated state cards
  const STAT_CARDS = [
    {
      label: "Total Assessed",
      value: summary.totalAssessed.toLocaleString(),
      sub: "48h campaigns evaluated",
      icon: Activity,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Average Viability",
      value: summary.averageViabilityScore !== null ? `${summary.averageViabilityScore}/100` : "—",
      sub: "Mean funding viability score",
      icon: TrendingUp,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
    },
    {
      label: "Low Risk",
      value: summary.lowRiskCount.toLocaleString(),
      sub: "High viability likelihood",
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Medium Risk",
      value: summary.mediumRiskCount.toLocaleString(),
      sub: "Moderate viability signals",
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "High Risk",
      value: summary.highRiskCount.toLocaleString(),
      sub: "Low early velocity signals",
      icon: ShieldAlert,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
    },
    {
      label: "Last Assessment",
      value: formatRelativeTime(summary.lastAssessmentTimestamp),
      sub: summary.lastAssessmentTimestamp
        ? new Date(summary.lastAssessmentTimestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "No evaluations yet",
      icon: Clock,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between pb-1">
        <div>
          <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Machine Learning Viability Intelligence
          </span>
          <h3 className="font-heading text-sm font-extrabold text-white mt-0.5">
            Campaign Viability Overview
          </h3>
        </div>
        <Badge className="bg-emerald-500/10 border-emerald-500/25 text-emerald-400 text-[10px] py-0.5 px-2.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          48-Hour Pipeline Active
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map((stat, idx) => (
          <Card
            key={idx}
            className="p-4 bg-[#0A1C16] border-[#162520] hover:border-[#1E3A2E] transition-all relative overflow-hidden group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className={`w-7 h-7 rounded-lg ${stat.bg} ${stat.border} border flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A9690] truncate">
                {stat.label}
              </p>
              <p className="font-heading text-lg font-extrabold text-white mt-1">
                {stat.value}
              </p>
            </div>
            <p className="text-[9px] text-[#8A9690]/70 mt-2 truncate">
              {stat.sub}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
