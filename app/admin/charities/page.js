"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { useCharities } from "@/hooks/useCharities";
import { createCharity, updateCharity, deleteCharity } from "@/services/charityService";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Heart,
  Plus,
  Eye,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  Shield,
  Globe,
  AlertTriangle,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

const CATEGORIES = ["All", "Environment", "Clean Water", "Education", "Healthcare", "Housing", "Ocean"];

export default function AdminCharitiesPage() {
  const { charities, loading, error, refresh } = useCharities();
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Form states
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "Environment",
    description: "",
    image_url: "",
    impact: "",
    auditor_score: "",
    spending_ratio: "",
    featured: false,
    status: "Active",
  });

  // Details view state
  const [isDetailsOpen, _setIsDetailsOpen] = useState(false);
  const [detailsCharity, setDetailsCharity] = useState(null);

  const setIsModalOpen = (val) => {
    if (val) _setIsDetailsOpen(false);
    _setIsModalOpen(val);
  };

  const setIsDetailsOpen = (val) => {
    if (val) _setIsModalOpen(false);
    _setIsDetailsOpen(val);
  };

  const handleOpenAdd = () => {
    setModalMode("add");
    setSelectedCharity(null);
    setFormData({
      name: "",
      category: "Environment",
      description: "",
      image_url: "",
      impact: "",
      auditor_score: "",
      spending_ratio: "",
      featured: false,
      status: "Active",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (charity) => {
    setModalMode("edit");
    setSelectedCharity(charity);
    setFormData({
      name: charity.name || "",
      category: charity.category || "Environment",
      description: charity.description || "",
      image_url: charity.image_url || "",
      impact: charity.impact || "",
      auditor_score: charity.auditor_score || charity.auditorScore || "",
      spending_ratio: charity.spending_ratio || charity.spendingRatio || "",
      featured: charity.featured === true || charity.featured === "true",
      status: charity.status || "Active",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenDetails = (charity) => {
    setDetailsCharity(charity);
    setIsDetailsOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Charity name is required.");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Description is required.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      if (modalMode === "add") {
        await createCharity(formData);
      } else {
        await updateCharity(selectedCharity.id, formData);
      }
      setIsModalOpen(false);
      refresh();
    } catch (err) {
      console.error("Failed to save charity:", err);
      setFormError(err.message || "An error occurred while saving the charity.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFeature = async (charity) => {
    try {
      const isFeatured = !(charity.featured === true || charity.featured === "true");
      await updateCharity(charity.id, { featured: isFeatured });
      refresh();
    } catch (err) {
      console.error("Failed to toggle feature status:", err);
      alert("Error toggling feature status.");
    }
  };

  const handleDelete = async (charity) => {
    if (confirm(`Are you sure you want to remove the charity "${charity.name}"?`)) {
      try {
        await deleteCharity(charity.id);
        refresh();
      } catch (err) {
        console.error("Failed to delete charity:", err);
        alert(err.message || "Error deleting charity.");
      }
    }
  };

  if (loading && charities.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Loading charities catalog..." />
      </div>
    );
  }

  const filtered = categoryFilter === "All"
    ? charities
    : charities.filter((c) => c.category === categoryFilter);

  const activeCount = charities.filter(c => c.status === "Active" || !c.status).length;
  const pendingCount = charities.filter(c => c.status === "Pending Vetting").length;
  const featuredCount = charities.filter(c => c.featured === true || c.featured === "true").length;

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
            { label: "Total Charities", value: String(charities.length), icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10" },
            { label: "Active", value: String(activeCount), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Pending Vetting", value: String(pendingCount), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Featured Causes", value: String(featuredCount), icon: Star, color: "text-amber-400", bg: "bg-amber-500/10" },
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

        {/* Filter & Actions Bar */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant="outline"
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className={`text-[10px] h-8 ${
                  categoryFilter === cat
                    ? "bg-red-600 hover:bg-red-500 text-white border-red-600"
                    : "bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E]"
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>
          <Button
            onClick={handleOpenAdd}
            className="bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-bold h-9 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Onboard Charity
          </Button>
        </motion.div>

        {/* Global Error Display */}
        {error && (
          <motion.div variants={itemVariants}>
            <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center gap-3 text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        {/* Charities Table */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden bg-[#0A1C16] border-[#162520]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#162520] hover:bg-transparent">
                  <TableHead className="pl-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Charity</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Category</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Auditor Score</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Spending Ratio</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Featured</TableHead>
                  <TableHead className="text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-right pr-6 text-[#8A9690] text-[10px] uppercase tracking-widest font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((charity) => {
                  const isFeatured = charity.featured === true || charity.featured === "true";
                  const audScore = charity.auditor_score || charity.auditorScore || "—";
                  const spendRatio = charity.spending_ratio || charity.spendingRatio || "—";
                  const isPendingVetting = charity.status === "Pending Vetting";

                  return (
                    <TableRow key={charity.id} className="border-[#162520] hover:bg-[#0D2B20]/30 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                            <Heart className="w-3.5 h-3.5 text-rose-400" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">{charity.name}</span>
                            <span className="text-[9px] text-[#8A9690] font-mono">{charity.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-[#0D2B20] text-[#8A9690] border-[#162520] text-[9px] hover:bg-[#0D2B20]">
                          <Globe className="w-2.5 h-2.5 mr-0.5" /> {charity.category || "General"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {audScore !== "—" ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-bold text-white">{audScore}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#8A9690] italic">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {spendRatio !== "—" ? (
                          <span className="text-xs font-semibold text-emerald-400">{spendRatio}</span>
                        ) : (
                          <span className="text-xs text-[#8A9690] italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleFeature(charity)}
                          className={`p-1.5 rounded-xl border transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] ${
                            isFeatured
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                              : "bg-transparent border-transparent text-[#8A9690] hover:text-white"
                          }`}
                          title={isFeatured ? "Featured Cause" : "Feature Charity"}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFeatured ? "fill-amber-400" : ""}`} />
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          isPendingVetting
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                        }`}>
                          {isPendingVetting ? <Clock className="w-2.5 h-2.5 mr-0.5" /> : <CheckCircle className="w-2.5 h-2.5 mr-0.5" />}
                          {charity.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetails(charity)}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-[#8A9690] hover:text-white hover:bg-[#0D2B20] hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(charity)}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-[#8A9690] hover:text-amber-400 hover:bg-amber-500/10 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(charity)}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-[#8A9690] hover:text-red-400 hover:bg-red-500/10 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-[#8A9690] text-xs">
                No charities found matching the criteria.
              </div>
            )}
          </Card>
        </motion.div>

        {/* Audit Integrity Note */}
        <motion.div variants={itemVariants}>
          <Card className="bg-[#0A1C16] border-[#162520] p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">Audit Integrity Protocol</p>
                <p className="text-[10px] text-[#8A9690] mt-0.5">All charities undergo third-party financial and impact auditing before activation. Spending ratios are verified quarterly.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Onboard / Edit Charity Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === "add" ? "Onboard New Charity" : "Edit Charity Details"}
        className="max-w-xl bg-[#070D0B] border-[#162520] text-white"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="name"
              label="Charity Name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Acres of Green"
              required
              className="bg-[#0A1C16] border-[#162520]"
            />
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full h-11 px-3 bg-[#0A1C16] border border-[#162520] text-white text-sm rounded-xl focus:outline-none focus:border-red-500 transition-colors"
              >
                {CATEGORIES.filter(cat => cat !== "All").map(cat => (
                  <option key={cat} value={cat} className="bg-[#070D0B]">{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed explanation of the charity's mission and operations..."
              required
              rows={4}
              className="w-full p-3 bg-[#0A1C16] border border-[#162520] text-white text-sm rounded-xl focus:outline-none focus:border-red-500 transition-colors placeholder:text-muted-foreground/45"
            />
          </div>

          <Input
            name="image_url"
            label="Image URL"
            value={formData.image_url}
            onChange={handleInputChange}
            placeholder="e.g. /acres_of_green.png or https://example.com/logo.png"
            className="bg-[#0A1C16] border-[#162520]"
          />

          <Input
            name="impact"
            label="Impact Statement"
            value={formData.impact}
            onChange={handleInputChange}
            placeholder="e.g. 7,400+ hectares of forest protected this quarter"
            className="bg-[#0A1C16] border-[#162520]"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="auditor_score"
              label="Auditor Score (0.0 - 10.0)"
              value={formData.auditor_score}
              onChange={handleInputChange}
              placeholder="e.g. 9.8"
              className="bg-[#0A1C16] border-[#162520]"
            />
            <Input
              name="spending_ratio"
              label="Spending Ratio"
              value={formData.spending_ratio}
              onChange={handleInputChange}
              placeholder="e.g. 96.4%"
              className="bg-[#0A1C16] border-[#162520]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="flex items-center gap-2 pt-2">
              <input
                id="featured"
                name="featured"
                type="checkbox"
                checked={formData.featured}
                onChange={handleInputChange}
                className="w-4 h-4 bg-[#0A1C16] border-[#162520] rounded-md accent-red-600 focus:ring-0"
              />
              <label htmlFor="featured" className="text-xs text-white font-semibold cursor-pointer">
                Feature on main dashboard
              </label>
            </div>
            
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block">
                Verification Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full h-10 px-3 bg-[#0A1C16] border border-[#162520] text-white text-xs rounded-xl focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="Active" className="bg-[#070D0B]">Active</option>
                <option value="Pending Vetting" className="bg-[#070D0B]">Pending Vetting</option>
              </select>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-[#162520]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="bg-transparent border-[#162520] text-[#8A9690] hover:text-white hover:border-[#1E3A2E] text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-bold h-9"
            >
              {submitting ? "Saving..." : modalMode === "add" ? "Onboard Charity" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Charity Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={detailsCharity?.name}
        className="max-w-lg bg-[#070D0B] border-[#162520] text-white"
      >
        {detailsCharity && (
          <div className="space-y-5 text-sm">
            <div className="aspect-video w-full rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center overflow-hidden">
              {detailsCharity.image_url ? (
                <img
                  src={detailsCharity.image_url}
                  alt={detailsCharity.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <Heart className="w-12 h-12 text-rose-500/20" />
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <span className="text-[10px] text-[#8A9690] uppercase font-bold tracking-wider block">Description</span>
                <p className="text-white text-xs leading-relaxed mt-1">{detailsCharity.description}</p>
              </div>

              {detailsCharity.impact && (
                <div>
                  <span className="text-[10px] text-[#8A9690] uppercase font-bold tracking-wider block">Impact Statement</span>
                  <p className="text-emerald-400 text-xs font-semibold leading-relaxed mt-1">{detailsCharity.impact}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#162520]">
                <div>
                  <span className="text-[9px] text-[#8A9690] uppercase tracking-wider block">Auditor Score</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {detailsCharity.auditor_score || detailsCharity.auditorScore || "Pending"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8A9690] uppercase tracking-wider block">Spending Ratio</span>
                  <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                    {detailsCharity.spending_ratio || detailsCharity.spendingRatio || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#162520]">
              <Button
                onClick={() => setIsDetailsOpen(false)}
                className="bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-bold h-9"
              >
                Close View
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
