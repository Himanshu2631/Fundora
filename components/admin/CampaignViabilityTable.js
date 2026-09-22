"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const RISK_BADGES = {
  "LOW RISK": {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20",
    dot: "bg-emerald-400",
    icon: ShieldCheck,
  },
  "MEDIUM RISK": {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20",
    dot: "bg-amber-400",
    icon: AlertTriangle,
  },
  "HIGH RISK": {
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/25 hover:bg-rose-500/20",
    dot: "bg-rose-400",
    icon: ShieldAlert,
  },
};

export default function CampaignViabilityTable({ onSelectAssessment }) {
  const [assessments, setAssessments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & sorting states
  const [riskFilter, setRiskFilter] = useState("all");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "10");
      params.set("sortOrder", sortOrder);

      if (riskFilter && riskFilter !== "all") {
        params.set("riskLevel", riskFilter);
      }

      if (campaignSearch.trim()) {
        params.set("campaignId", campaignSearch.trim());
      }

      const res = await fetch(`/api/admin/assessments?${params.toString()}`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load viability assessments (Status ${res.status})`);
      }

      const payload = await res.json();
      if (payload?.success && Array.isArray(payload?.data)) {
        setAssessments(payload.data);
        if (payload.pagination) {
          setPagination(payload.pagination);
        }
      } else {
        throw new Error(payload?.error || "Invalid response format from assessment service");
      }
    } catch (err) {
      console.error("[CampaignViabilityTable Error]:", err.message);
      setError("Unable to load campaign viability assessments.");
    } finally {
      setLoading(false);
    }
  }, [page, riskFilter, campaignSearch, sortOrder]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleRiskChange = (newRisk) => {
    setRiskFilter(newRisk);
    setPage(1);
  };

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleClearFilters = () => {
    setRiskFilter("all");
    setCampaignSearch("");
    setSortOrder("desc");
    setPage(1);
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return "—";
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

  const formatScoreBadge = (score) => {
    const num = Number(score);
    if (isNaN(num)) return "—";

    let color = "text-rose-400 bg-rose-500/10 border-rose-500/20";
    if (num >= 70) {
      color = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    } else if (num >= 40) {
      color = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${color}`}>
        {num} / 100
      </span>
    );
  };

  const isFiltered = riskFilter !== "all" || campaignSearch.trim() !== "";

  return (
    <Card className="bg-[#0A1C16] border-[#162520] overflow-hidden">
      {/* Header & Controls */}
      <CardHeader className="p-5 border-b border-[#162520] space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
                Campaign Viability Assessments
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-[#8A9690] mt-1">
              Automated 48-hour machine learning funding viability predictions and risk levels.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSortToggle}
              className="h-8 text-xs bg-[#0D2B20] border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E] flex items-center gap-1.5"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortOrder === "desc" ? "Newest First" : "Oldest First"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAssessments}
              disabled={loading}
              className="h-8 text-xs bg-[#0D2B20] border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E] flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Risk Level Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9690] mr-1 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" />
              Risk:
            </span>
            {[
              { label: "All", value: "all" },
              { label: "Low Risk", value: "LOW RISK" },
              { label: "Medium Risk", value: "MEDIUM RISK" },
              { label: "High Risk", value: "HIGH RISK" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleRiskChange(tab.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  riskFilter === tab.value
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-[#0D2B20]/40 text-[#8A9690] hover:text-white hover:bg-[#0D2B20]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Campaign Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#8A9690] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Filter by Campaign ID..."
              value={campaignSearch}
              onChange={(e) => setCampaignSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-[#0D2B20]/50 border-[#162520] text-white placeholder:text-[#8A9690]/60 focus-visible:ring-emerald-500/30"
            />
          </form>
        </div>
      </CardHeader>

      {/* Table Content */}
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs text-[#8A9690]">Loading viability assessments...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-xs font-medium text-white/90">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAssessments}
              className="h-8 text-xs bg-[#0D2B20] border-red-500/20 text-red-300 hover:bg-red-500/10"
            >
              Retry Loading
            </Button>
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-[#8A9690]/40 mx-auto" />
            <p className="text-xs font-semibold text-white">
              {isFiltered
                ? "No assessments match the selected filters."
                : "No campaign viability assessments found."}
            </p>
            <p className="text-[11px] text-[#8A9690] max-w-sm mx-auto">
              {isFiltered
                ? "Try clearing the risk filter or campaign ID search to view all records."
                : "Automated 48-hour viability assessments will appear here once candidate campaigns are evaluated."}
            </p>
            {isFiltered && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs bg-[#0D2B20] border-[#162520] text-emerald-400 hover:bg-emerald-500/10 mt-2"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#162520] hover:bg-transparent">
                  <TableHead className="text-[#8A9690] text-[10px] uppercase font-bold py-3 pl-5">Campaign</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase font-bold py-3 text-center">Viability Score</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase font-bold py-3">Risk Level</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase font-bold py-3 text-right">Risk Probability</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase font-bold py-3 text-center">Horizon</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase font-bold py-3">Model</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase font-bold py-3">Assessed Date</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase font-bold py-3 pr-5 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#162520]">
                {assessments.map((item) => {
                  const riskCfg = RISK_BADGES[item.risk_level] || RISK_BADGES["MEDIUM RISK"];
                  const RiskIcon = riskCfg.icon;

                  return (
                    <TableRow key={item.id} className="border-[#162520] hover:bg-[#0D2B20]/40 transition-colors">
                      {/* Campaign Column */}
                      <TableCell className="py-3.5 pl-5">
                        <div className="space-y-0.5 max-w-[220px]">
                          <p className="text-xs font-bold text-white truncate" title={item.campaign_title || "Campaign unavailable"}>
                            {item.campaign_title || "Campaign unavailable"}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#8A9690]">
                            <span>{item.campaign_category || "General"}</span>
                            <span>•</span>
                            <span className="font-mono text-[9px] text-[#8A9690]/70">
                              {item.campaign_id ? String(item.campaign_id).slice(0, 8) : "—"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Viability Score Column */}
                      <TableCell className="py-3.5 text-center">
                        {formatScoreBadge(item.viability_score)}
                      </TableCell>

                      {/* Risk Level Column */}
                      <TableCell className="py-3.5">
                        <Badge className={`text-[10px] px-2 py-0.5 border ${riskCfg.badge} flex items-center gap-1.5 w-fit`}>
                          <RiskIcon className="w-3 h-3" />
                          {item.risk_level}
                        </Badge>
                      </TableCell>

                      {/* Risk Probability Column */}
                      <TableCell className="py-3.5 text-right font-mono text-xs font-semibold text-white/90">
                        {typeof item.risk_probability === "number"
                          ? `${(item.risk_probability * 100).toFixed(1)}%`
                          : "—"}
                      </TableCell>

                      {/* Prediction Horizon Column */}
                      <TableCell className="py-3.5 text-center">
                        <span className="text-[11px] font-medium text-[#8A9690] bg-[#0D2B20]/60 px-2 py-0.5 rounded border border-[#162520]">
                          {item.prediction_horizon_hours || 48}h
                        </span>
                      </TableCell>

                      {/* Model Version Column */}
                      <TableCell className="py-3.5">
                        <span className="text-[11px] text-[#8A9690] truncate max-w-[120px] block" title={item.model_name}>
                          {item.model_name || "RF Champion"}
                        </span>
                      </TableCell>

                      {/* Assessed Date Column */}
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <p className="text-xs text-white/90 font-medium flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-[#8A9690]" />
                            {formatRelativeTime(item.created_at)}
                          </p>
                          <p className="text-[9px] text-[#8A9690]/70">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </p>
                        </div>
                      </TableCell>

                      {/* Action Column */}
                      <TableCell className="py-3.5 pr-5 text-right">
                        {onSelectAssessment ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectAssessment(item)}
                            className="h-7 px-2.5 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-1 ml-auto"
                          >
                            <Eye className="w-3 h-3" />
                            View Details
                          </Button>
                        ) : (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-1 ml-auto"
                          >
                            <Link href={`/admin/assessments/${item.id}`}>
                              <Eye className="w-3 h-3" />
                              View Details
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Pagination Controls Footer */}
      {!loading && !error && assessments.length > 0 && (
        <div className="p-4 border-t border-[#162520] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8A9690]">
          <div>
            Showing <span className="text-white font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{" "}
            <span className="text-white font-medium">
              {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}
            </span>{" "}
            of <span className="text-white font-medium">{pagination.totalCount}</span> assessments
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPreviousPage || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs bg-[#0D2B20] border-[#162520] text-[#8A9690] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Previous
            </Button>

            <span className="px-2 text-xs font-semibold text-white">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage || loading}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="h-8 text-xs bg-[#0D2B20] border-[#162520] text-[#8A9690] hover:text-white disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
