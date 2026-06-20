"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Heart, ShieldCheck, Globe, ExternalLink } from "lucide-react";
import Link from "next/link";

const CHARITIES = [
  {
    id: "CH-01",
    name: "Acres of Green",
    category: "Environment",
    impact: "7,400+ hectares of ancient forests protected this quarter.",
    auditorScore: "9.8",
    spendingRatio: "96.4%",
    raised: "$145,300 raised",
    featured: true,
  },
  {
    id: "CH-02",
    name: "Apex Water Initiative",
    category: "Clean Water",
    impact: "Direct access filtration installed for 12,000 villagers.",
    auditorScore: "9.9",
    spendingRatio: "98.1%",
    raised: "$98,400 raised",
    featured: false,
  },
  {
    id: "CH-03",
    name: "Empower Global Edu",
    category: "Education",
    impact: "Coding and engineering fellowships for 340 women in STEM.",
    auditorScore: "9.7",
    spendingRatio: "95.5%",
    raised: "$112,000 raised",
    featured: false,
  },
  {
    id: "CH-04",
    name: "BioGen Health Corps",
    category: "Healthcare",
    impact: "Mobile clinic deployments to 8 underserved regions.",
    auditorScore: "9.5",
    spendingRatio: "94.2%",
    raised: "$67,200 raised",
    featured: false,
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 14 } },
};

export default function CharityPage() {
  return (
    <div className="p-6 md:p-8 space-y-8">
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        <motion.div variants={itemVariants}>
          <span className="text-[10px] uppercase tracking-widest font-bold text-accent">
            Charity Directory
          </span>
          <h2 className="font-heading text-lg font-extrabold text-foreground mt-1 mb-1">
            Audited partner causes
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            All listed charities are independently vetted with verified spending ratios and outcome tracking.
          </p>
        </motion.div>

        {/* Trust signals */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-4 mb-8">
          {[
            { icon: ShieldCheck, text: "Third-party audited" },
            { icon: Globe, text: "4 continents covered" },
            { icon: ShieldCheck, text: "98.2% avg fund efficiency" },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              <badge.icon className="w-3 h-3 text-accent" />
              {badge.text}
            </div>
          ))}
        </motion.div>

        {/* Charity cards */}
        <div className="space-y-4">
          {CHARITIES.map((charity, i) => (
            <motion.div key={charity.id} variants={itemVariants}>
              <Card className="p-6 hover:border-accent/30 transition-all duration-300 group bg-background">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="accent">{charity.category}</Badge>
                      {charity.featured && (
                        <Badge variant="outline" className="text-[9px]">Featured</Badge>
                      )}
                    </div>
                    <h3 className="font-heading text-base font-bold text-foreground group-hover:text-accent transition-colors mb-2">
                      {charity.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{charity.impact}</p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="flex sm:flex-col gap-3 sm:gap-1 items-center sm:items-end">
                      <span className="text-xs font-bold text-foreground">
                        Auditor: {charity.auditorScore}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Spending: {charity.spendingRatio}
                      </span>
                      <span className="text-[10px] text-accent font-semibold">{charity.raised}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/60 font-mono">ID: {charity.id}</span>
                  <button className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors">
                    View Report <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Pending vetting notice */}
        <motion.div variants={itemVariants}>
          <EmptyState
            title="More Causes Being Vetted"
            description="We are currently evaluating 2 additional organisations: Eco Shelter Solutions (Housing) and MediGrid Africa (Healthcare). Expect onboarding Q3 2026."
            icon={Heart}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
