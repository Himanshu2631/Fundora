"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCharities } from "@/hooks/useCharities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  Heart, 
  ShieldCheck, 
  Globe, 
  ExternalLink, 
  Search, 
  Plus, 
  Trash2, 
  Sliders, 
  Check, 
  AlertTriangle, 
  Info,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Scale
} from "lucide-react";

// Page animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.05 } 
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 80, damping: 14 } 
  },
};

export default function CharityDashboard() {
  const { 
    charities, 
    allocations, 
    loading: hookLoading, 
    error: hookError, 
    allocate, 
    removeAllocation 
  } = useCharities();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isPending, startTransition] = useTransition();

  // Allocation Modal state
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allocationPercent, setAllocationPercent] = useState(10);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  // Local component feedback notifications (e.g. general success/error)
  const [feedback, setFeedback] = useState(null);

  // Auto-clear feedback notification after 4s
  React.useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Aggregate charity details from seeded database list
  const totalAllocated = allocations.reduce((sum, item) => sum + item.contribution_percentage, 0);
  const remainingPercent = 100 - totalAllocated;

  // Categories present in the database (static categories but matching data)
  const categories = ["All", "Environment", "Clean Water", "Education", "Healthcare"];

  // Filtered Charities list for directory
  const filteredCharities = charities.filter((charity) => {
    const matchesSearch = 
      charity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      charity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      charity.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === "All" || 
      charity.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Featured Charity (Acres of Green, or first featured one)
  const featuredCharity = charities.find(c => c.featured) || charities[0];

  // Helper to open configuration modal
  const handleOpenAllocationModal = (charity) => {
    const existing = allocations.find(a => a.charity_id === charity.id);
    const existingPercent = existing ? existing.contribution_percentage : 0;
    
    // Calculate space allocated to others
    const otherAllocationsSum = allocations
      .filter(a => a.charity_id !== charity.id)
      .reduce((sum, a) => sum + a.contribution_percentage, 0);
    const maxAllowed = 100 - otherAllocationsSum;

    setSelectedCharity(charity);
    setAllocationPercent(existingPercent > 0 ? existingPercent : Math.max(10, Math.min(25, maxAllowed)));
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  // Process allocation transaction submission
  const handleSaveAllocation = async () => {
    if (!selectedCharity) return;
    setModalError(null);
    setModalSuccess(null);

    // Frontend validations before API call
    if (allocationPercent < 10) {
      setModalError("Individual charity allocation must be at least 10%.");
      return;
    }
    if (allocationPercent > 100) {
      setModalError("Individual charity allocation cannot exceed 100%.");
      return;
    }

    const otherAllocationsSum = allocations
      .filter(a => a.charity_id !== selectedCharity.id)
      .reduce((sum, a) => sum + a.contribution_percentage, 0);

    if (otherAllocationsSum + allocationPercent > 100) {
      const remainingPossible = 100 - otherAllocationsSum;
      setModalError(`Total allocations cannot exceed 100%. You have already allocated ${otherAllocationsSum}% to other causes, leaving ${remainingPossible}% available.`);
      return;
    }

    startTransition(async () => {
      try {
        await allocate(selectedCharity.id, allocationPercent);
        setModalSuccess(`Successfully allocated ${allocationPercent}% of subscription to ${selectedCharity.name}!`);
        setFeedback({
          type: "success",
          title: "Allocation Saved",
          message: `Your eco contribution to ${selectedCharity.name} has been updated to ${allocationPercent}%.`
        });
        // Wait a split second to let success state show, then close
        setTimeout(() => {
          setIsModalOpen(false);
          setSelectedCharity(null);
        }, 800);
      } catch (err) {
        setModalError(err.message || "Failed to update allocation.");
      }
    });
  };

  // Process deletion transaction
  const handleRemoveAllocation = async (charityId, charityName) => {
    if (confirm(`Are you sure you want to remove your allocation to ${charityName}?`)) {
      startTransition(async () => {
        try {
          await removeAllocation(charityId);
          setFeedback({
            type: "success",
            title: "Allocation Removed",
            message: `Removed contribution allocation for ${charityName}.`
          });
        } catch (err) {
          setFeedback({
            type: "error",
            title: "Error Removing Allocation",
            message: err.message || "Failed to remove allocation."
          });
        }
      });
    }
  };

  // Loading state when initial loading is true and charities are empty
  if (hookLoading && charities.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <LoadingState message="Retrieving audited partner causes..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-accent">
            Impact Center
          </span>
          <h2 className="font-heading text-2xl font-extrabold text-foreground mt-1 mb-1">
            Charity Allocation Control
          </h2>
          <p className="text-xs text-muted-foreground">
            Direct your monthly eco subscription funds to audited, third-party verified environmental and humanitarian causes.
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex gap-4 shrink-0 bg-card border border-border/60 p-3 rounded-sm">
          <div className="text-center px-3 border-r border-border/40">
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Causes Backed</span>
            <span className="text-sm font-bold text-foreground">{allocations.length}</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Allocated Funds</span>
            <span className={`text-sm font-bold ${totalAllocated === 100 ? "text-emerald-500" : totalAllocated > 0 ? "text-accent" : "text-muted-foreground"}`}>
              {totalAllocated}%
            </span>
          </div>
        </div>
      </div>

      {/* Trust badging section */}
      <div className="flex flex-wrap gap-4 border-y border-border/30 py-3">
        {[
          { icon: ShieldCheck, text: "Independently Audited" },
          { icon: Globe, text: "Direct Global Impact" },
          { icon: Scale, text: "94%+ Spending efficiency" },
        ].map((badge, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
            <badge.icon className="w-3.5 h-3.5 text-accent" />
            {badge.text}
          </div>
        ))}
      </div>

      {/* Notifications and errors */}
      <AnimatePresence>
        {(hookError || feedback) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            {hookError && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Synchronization Issue</AlertTitle>
                <AlertDescription>{hookError}</AlertDescription>
              </Alert>
            )}
            {feedback && (
              <Alert variant={feedback.type === "success" ? "success" : "destructive"}>
                <Check className="w-4 h-4" />
                <AlertTitle>{feedback.title}</AlertTitle>
                <AlertDescription>{feedback.message}</AlertDescription>
              </Alert>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Layout: Top Panel (Control Deck & Featured) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Allocations Control Deck (left side / span 5) */}
        <Card className="lg:col-span-5 flex flex-col justify-between border-border bg-card/45 backdrop-blur-md">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-accent" />
                  Subscription Allocations
                </CardTitle>
                <CardDescription>
                  Configure how your membership funds are distributed.
                </CardDescription>
              </div>
              <Badge variant={totalAllocated === 100 ? "success" : totalAllocated > 0 ? "warning" : "outline"}>
                {totalAllocated === 100 ? "Fully Allocated" : `${remainingPercent}% Left`}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 flex-1">
            {/* Visual Allocation Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Allocation Progress</span>
                <span className="text-foreground">{totalAllocated}% / 100%</span>
              </div>
              
              <div className="h-3 w-full bg-secondary/65 rounded-full overflow-hidden flex border border-border/40">
                {allocations.map((item, idx) => {
                  const colors = ["bg-emerald-600", "bg-accent", "bg-[#C4A054]/60", "bg-indigo-600"];
                  const colorClass = colors[idx % colors.length];
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.contribution_percentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`${colorClass} h-full border-r border-background/20`}
                      title={`${item.charity_name}: ${item.contribution_percentage}%`}
                    />
                  );
                })}
                {remainingPercent > 0 && (
                  <div className="bg-secondary/40 h-full flex-1" title={`Unallocated: ${remainingPercent}%`} />
                )}
              </div>
              
              {remainingPercent > 0 ? (
                <div className="flex items-center gap-1.5 text-[10.5px] text-amber-500 font-semibold bg-amber-500/5 p-2 rounded-sm border border-amber-500/10">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>You have {remainingPercent}% remaining. Pick a cause below to fully distribute your support.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-500 font-semibold bg-emerald-500/5 p-2 rounded-sm border border-emerald-500/10">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Your subscription is 100% active. Thank you for making a positive contribution!</span>
                </div>
              )}
            </div>

            {/* Selected Allocations List */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Active selections
              </span>

              {allocations.length === 0 ? (
                <div className="border border-dashed border-border/50 p-6 text-center rounded-sm bg-secondary/5">
                  <Heart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground/80">No Active Allocations</p>
                  <p className="text-[10.5px] text-muted-foreground mt-1">
                    Select a cause from the directory below to back verified charities.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {allocations.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 rounded-sm border border-border/40 bg-secondary/15 hover:border-accent/20 transition-all duration-200"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground line-clamp-1">
                          {item.charity_name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] py-0 px-1 border-accent/20 text-accent font-normal">
                            {item.charity_category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            Allocation: <strong className="text-foreground">{item.contribution_percentage}%</strong>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          className="h-7 text-[10px] font-bold uppercase text-accent hover:bg-accent/10 border border-accent/10"
                          onClick={() => {
                            const charityObj = charities.find(c => c.id === item.charity_id);
                            if (charityObj) handleOpenAllocationModal(charityObj);
                          }}
                        >
                          Modify
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="xs" 
                          className="h-7 size-7 p-0 flex items-center justify-center"
                          onClick={() => handleRemoveAllocation(item.charity_id, item.charity_name)}
                          disabled={isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Featured Cause Hero Showcase (right side / span 7) */}
        {featuredCharity && (
          <Card className="lg:col-span-7 overflow-hidden border-border bg-card/45 backdrop-blur-md flex flex-col md:flex-row">
            {/* Stock Image Block */}
            <div className="md:w-5/12 relative min-h-[220px] md:min-h-full">
              <img 
                src={featuredCharity.image_url} 
                alt={featuredCharity.name} 
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-card via-card/50 to-transparent md:to-transparent" />
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                <Badge variant="accent" className="backdrop-blur-md bg-accent/20">Featured Cause</Badge>
                <Badge variant="outline" className="backdrop-blur-md bg-background/50 border-emerald-500/20 text-emerald-400">
                  {featuredCharity.category}
                </Badge>
              </div>
            </div>

            {/* Description & Impact Metrics */}
            <div className="p-6 md:w-7/12 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-accent font-bold text-[10px] tracking-wider uppercase">
                  <Sparkles className="w-3 h-3" />
                  Primary Partner Spotlight
                </div>
                <h3 className="font-heading text-lg font-black text-foreground hover:text-accent transition-colors">
                  {featuredCharity.name}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {featuredCharity.description}
                </p>
                
                {/* Verified Impact Highlight */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-sm p-2 text-[11px] text-emerald-400 font-medium">
                  <strong>Quarterly Impact:</strong> {featuredCharity.impact}
                </div>
              </div>

              {/* Verified Metrics Row */}
              <div className="grid grid-cols-3 gap-2 bg-secondary/10 p-2.5 rounded-sm border border-border/30">
                <div className="text-center">
                  <span className="text-[8px] uppercase font-bold text-muted-foreground block">Auditor Rating</span>
                  <span className="text-[12.5px] font-bold text-foreground">{featuredCharity.auditor_score || featuredCharity.auditorScore}/10</span>
                </div>
                <div className="text-center border-x border-border/30">
                  <span className="text-[8px] uppercase font-bold text-muted-foreground block">Direct Spending</span>
                  <span className="text-[12.5px] font-bold text-foreground">{featuredCharity.spending_ratio || featuredCharity.spendingRatio}</span>
                </div>
                <div className="text-center">
                  <span className="text-[8px] uppercase font-bold text-muted-foreground block">Total Raised</span>
                  <span className="text-[12.5px] font-bold text-accent font-semibold">{featuredCharity.raised}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <a 
                  href="#" 
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors"
                  onClick={(e) => { e.preventDefault(); alert(`${featuredCharity.name} is a vetted ecological partner. Audit report verified by ESG Standards Org.`); }}
                >
                  Inspect Audit Report <ExternalLink className="w-3 h-3" />
                </a>
                
                {allocations.some(a => a.charity_id === featuredCharity.id) ? (
                  <Button 
                    variant="goldOutline" 
                    size="sm" 
                    onClick={() => handleOpenAllocationModal(featuredCharity)}
                  >
                    Adjust Allocation
                  </Button>
                ) : (
                  <Button 
                    variant="accent" 
                    size="sm" 
                    onClick={() => handleOpenAllocationModal(featuredCharity)}
                  >
                    Allocate Funds
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ── Charity Discovery Section ── */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Vetted Causes Directory
            </h3>
            <p className="text-xs text-muted-foreground">
              Search and filter vetted causes by category to distribute subscription percentages.
            </p>
          </div>
          
          {/* Real-time Search input */}
          <div className="w-full md:w-72 relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground/60" />
            <Input 
              placeholder="Search by name, cause or scope..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border/80"
            />
          </div>
        </div>

        {/* Category Filters Tab Slider */}
        <div className="flex flex-wrap gap-2 border-b border-border/25 pb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border rounded-sm ${
                (selectedCategory === cat) 
                  ? "bg-secondary text-secondary-foreground border-accent text-accent" 
                  : "bg-transparent text-muted-foreground border-border/40 hover:bg-secondary/20 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Directory Grid */}
        {filteredCharities.length === 0 ? (
          <EmptyState
            title="No Causes Match Your Filters"
            description="Try modifying your keyword search or select a different category tab."
            icon={Search}
            action={
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
              >
                Reset Search Filters
              </Button>
            }
          />
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredCharities.map((charity) => {
              const allocation = allocations.find(a => a.charity_id === charity.id);
              const isAllocated = !!allocation;

              return (
                <motion.div key={charity.id} variants={itemVariants}>
                  <Card className="h-full flex flex-col justify-between hover:border-accent/40 transition-all duration-300 group bg-card/60 backdrop-blur-sm relative overflow-hidden">
                    {/* Visual indicators */}
                    <div className="h-44 relative w-full overflow-hidden bg-secondary/10">
                      <img 
                        src={charity.image_url} 
                        alt={charity.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-border/30 text-foreground font-bold">
                          {charity.category}
                        </Badge>
                      </div>
                      {isAllocated && (
                        <div className="absolute top-3 right-3 bg-emerald-500 text-white font-bold p-1 rounded-full shadow-md flex items-center justify-center" title={`Active: ${allocation.contribution_percentage}%`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-heading text-sm font-bold text-foreground group-hover:text-accent transition-colors line-clamp-1">
                          {charity.name}
                        </h4>
                        <p className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-3">
                          {charity.description}
                        </p>
                      </div>

                      {/* Auditor efficiency values */}
                      <div className="grid grid-cols-2 gap-2 bg-secondary/15 p-2 rounded-sm border border-border/40 text-[10.5px]">
                        <div className="text-center border-r border-border/40">
                          <span className="text-muted-foreground block text-[8px] uppercase font-bold">Auditor score</span>
                          <span className="font-bold text-foreground">{charity.auditor_score || charity.auditorScore}/10</span>
                        </div>
                        <div className="text-center">
                          <span className="text-muted-foreground block text-[8px] uppercase font-bold">Efficiency ratio</span>
                          <span className="font-bold text-foreground">{charity.spending_ratio || charity.spendingRatio}</span>
                        </div>
                      </div>

                      {/* Info & allocate button */}
                      <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                        <span className="text-[9.5px] text-accent font-semibold">
                          {charity.raised} raised
                        </span>
                        
                        {isAllocated ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[11px] font-bold border-accent/20 text-accent bg-accent/5 hover:bg-accent/15"
                            onClick={() => handleOpenAllocationModal(charity)}
                          >
                            Update ({allocation.contribution_percentage}%)
                          </Button>
                        ) : (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 text-[11px] font-bold"
                            onClick={() => handleOpenAllocationModal(charity)}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Allocate
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Evaluation banner */}
        <motion.div variants={itemVariants} className="pt-4">
          <EmptyState
            title="More Causes Being Vetted"
            description="We are currently evaluating two additional organizations: Eco Shelter Solutions (Green Housing) and MediGrid Africa (Healthcare Networks). Expect onboarding by Q3 2026."
            icon={Heart}
          />
        </motion.div>
      </div>

      {/* ── Configure Allocation Modal ── */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { if (!isPending) setIsModalOpen(false); }} 
        title={`Configure Eco Allocation`}
        className="max-w-md"
      >
        {selectedCharity && (() => {
          // Calculate constraints
          const currentAllocation = allocations.find(a => a.charity_id === selectedCharity.id);
          const currentPercent = currentAllocation ? currentAllocation.contribution_percentage : 0;
          
          const otherAllocationsSum = allocations
            .filter(a => a.charity_id !== selectedCharity.id)
            .reduce((sum, a) => sum + a.contribution_percentage, 0);
          
          const maxAllowedPercent = 100 - otherAllocationsSum;
          const isEligible = maxAllowedPercent >= 10;

          return (
            <div className="space-y-5">
              <div className="flex items-start gap-3 bg-secondary/20 p-3 rounded-sm border border-border/40">
                <img 
                  src={selectedCharity.image_url} 
                  alt={selectedCharity.name} 
                  className="w-14 h-14 object-cover rounded-sm border border-border/40 shrink-0" 
                />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">{selectedCharity.name}</h4>
                  <Badge variant="outline" className="text-[8px] py-0 px-1 border-accent/20 text-accent font-normal">
                    {selectedCharity.category}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                    {selectedCharity.description}
                  </p>
                </div>
              </div>

              {/* Status Alert Context */}
              {modalError && (
                <Alert variant="destructive" className="py-2.5 px-3">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertTitle>Validation Constraint</AlertTitle>
                  <AlertDescription className="text-[10.5px]">{modalError}</AlertDescription>
                </Alert>
              )}
              {modalSuccess && (
                <Alert variant="success" className="py-2.5 px-3">
                  <Check className="w-4 h-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription className="text-[10.5px]">{modalSuccess}</AlertDescription>
                </Alert>
              )}

              {!isEligible ? (
                <div className="space-y-3 bg-destructive/5 p-3 rounded-sm border border-destructive/10">
                  <div className="flex gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">Allocation Limit Exceeded</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    You have already allocated <strong className="text-foreground">{otherAllocationsSum}%</strong> of your monthly funds to other causes. 
                    The minimum allocation for any individual cause is <strong className="text-foreground">10%</strong>, but you only have <strong className="text-foreground">{maxAllowedPercent}%</strong> remaining.
                  </p>
                  <p className="text-[10px] text-accent/90">
                    To back {selectedCharity.name}, please first reduce allocations to or delete other selected charities in your control deck.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Slider config */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-muted-foreground">Allocation Percentage</span>
                      <span className="font-bold text-accent text-sm bg-accent/10 px-2 py-0.5 rounded-sm border border-accent/20">
                        {allocationPercent}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => setAllocationPercent(prev => Math.max(10, prev - 5))}
                        disabled={allocationPercent <= 10 || isPending}
                        className="w-8 h-8 rounded-sm bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold text-foreground select-none disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        -
                      </button>
                      
                      <input
                        type="range"
                        min="10"
                        max={maxAllowedPercent}
                        step="5"
                        value={allocationPercent}
                        onChange={(e) => setAllocationPercent(parseInt(e.target.value, 10))}
                        disabled={isPending}
                        className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                      />

                      <button 
                        type="button"
                        onClick={() => setAllocationPercent(prev => Math.min(maxAllowedPercent, prev + 5))}
                        disabled={allocationPercent >= maxAllowedPercent || isPending}
                        className="w-8 h-8 rounded-sm bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold text-foreground select-none disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>Min: 10%</span>
                      <span>Max allowed: {maxAllowedPercent}%</span>
                    </div>
                  </div>

                  {/* Impact projection comparison */}
                  <div className="bg-secondary/15 p-3 rounded-sm border border-border/40 space-y-2 text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-[9px] text-muted-foreground block">
                      Allocation Simulation
                    </span>
                    <div className="grid grid-cols-2 gap-y-1.5">
                      <span className="text-muted-foreground">Previous for this cause:</span>
                      <span className="text-right font-semibold text-foreground">{currentPercent}%</span>
                      
                      <span className="text-muted-foreground">Allocations to other causes:</span>
                      <span className="text-right font-semibold text-foreground">{otherAllocationsSum}%</span>

                      <span className="text-muted-foreground">New project selection:</span>
                      <span className="text-right font-bold text-accent">+{allocationPercent}%</span>

                      <div className="col-span-2 border-t border-border/40 my-1" />

                      <span className="font-semibold text-foreground">Total system allocation:</span>
                      <span className={`text-right font-bold ${otherAllocationsSum + allocationPercent === 100 ? "text-emerald-500" : "text-foreground"}`}>
                        {otherAllocationsSum + allocationPercent}% / 100%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-3 border-t border-border/30">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                {isEligible && (
                  <Button 
                    variant="accent" 
                    size="sm" 
                    onClick={handleSaveAllocation}
                    disabled={isPending || allocationPercent < 10 || otherAllocationsSum + allocationPercent > 100}
                    className="flex items-center gap-1"
                  >
                    {isPending ? "Saving..." : "Save Allocation"}
                    {!isPending && <ArrowRight className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
