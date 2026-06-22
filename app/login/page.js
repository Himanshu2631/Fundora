"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  User,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLES = [
  {
    id: "visitor",
    label: "Public Visitor",
    icon: Globe,
    accentColor: "emerald",
    badge: "No Account Needed",
    headline: "Explore Fundora",
    description: "Discover the platform concept, support charities, and learn draw mechanics.",
    features: [
      "Explore platform concept",
      "Browse charities",
      "Learn draw mechanics",
    ],
    cta: "Explore Platform",
    ctaHref: "/",
    isLink: true,
    gradient: "from-emerald-500/[0.03] to-emerald-500/[0.08]",
    border: "border-emerald-500/15 hover:border-emerald-500/45 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] hover:bg-emerald-500/[0.06]",
    activeBorder: "border-emerald-500/60",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ctaStyle: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.15)] bg-emerald-500/[0.08]",
  },
  {
    id: "subscriber",
    label: "Registered Subscriber",
    icon: User,
    accentColor: "accent",
    badge: "Member Access",
    headline: "Member Sign In",
    description: "Manage your golf membership, log scorecards, and enter premium reward draws.",
    features: [
      "Manage membership",
      "Submit scores",
      "Participate in draws",
      "Track rewards",
    ],
    cta: "Sign In",
    ctaHref: "/register-subscriber/login",
    isLink: true,
    gradient: "from-[#C4A054]/[0.03] to-[#C4A054]/[0.08]",
    border: "border-[#C4A054]/15 hover:border-[#C4A054]/45 hover:shadow-[0_0_30px_rgba(196,160,84,0.08)] hover:bg-[#C4A054]/[0.06]",
    activeBorder: "border-[#C4A054]/70",
    iconBg: "bg-[#C4A054]/10",
    iconColor: "text-[#C4A054]",
    badgeBg: "bg-[#C4A054]/10 text-[#C4A054] border-[#C4A054]/20",
    ctaStyle: "bg-[#C4A054] text-[#060C0A] hover:bg-[#C4A054]/90 font-extrabold",
    glow: "shadow-[0_0_40px_rgba(196,160,84,0.18)] bg-[#C4A054]/[0.08]",
  },
  {
    id: "admin",
    label: "Administrator",
    icon: ShieldAlert,
    accentColor: "red",
    badge: "Restricted Access",
    headline: "Admin Console",
    description: "Administrative dashboard for managing users, draws, payouts, and system analytics.",
    features: [
      "Manage users",
      "Configure draws",
      "Verify winners",
      "Access analytics",
    ],
    cta: "Admin Sign In",
    ctaHref: "/admin-login",
    isLink: true,
    gradient: "from-red-500/[0.03] to-red-500/[0.08]",
    border: "border-red-500/15 hover:border-red-500/45 hover:shadow-[0_0_30px_rgba(239,68,68,0.08)] hover:bg-red-500/[0.06]",
    activeBorder: "border-red-500/60",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    badgeBg: "bg-red-500/10 text-red-400 border-red-500/20",
    ctaStyle: "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50",
    glow: "shadow-[0_0_40px_rgba(239,68,68,0.15)] bg-red-500/[0.08]",
  },
];

// ─── Animations ───────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 16 } },
};

const formVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 18 } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.2 } },
};

// ─── Card Wrapper for HTML Semantics and Equal Heights ──────────────────────
function CardWrapper({ role, children }) {
  const cardClassName = `relative w-full h-full text-left p-6 rounded-2xl border bg-[#0A1C16]/40 backdrop-blur-sm bg-gradient-to-br ${role.gradient} transition-[border-color,background-color,box-shadow] duration-300 cursor-pointer group overflow-hidden shadow-xl flex flex-col justify-between ${role.border}`;

  return (
    <Link href={role.ctaHref} className="block h-full w-full">
      <motion.div
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.98 }}
        className={cardClassName}
      >
        {children}
      </motion.div>
    </Link>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  return (
    <div className="min-h-screen bg-[#060C0A] flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-1/4 w-[400px] h-[400px] rounded-full bg-[#C4A054]/[0.03] blur-[150px] pointer-events-none" />

      {/* ── Top Header (Unified) ── */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04] shrink-0 z-10 max-w-7xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-xl bg-[#C4A054] flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-sm select-none">
            F
          </div>
          <span className="font-heading font-extrabold tracking-wider text-base text-white group-hover:text-[#C4A054] transition-colors duration-300">
            FUNDORA
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A9690] hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to home
        </Link>
      </header>

      {/* ── Page Content Wrapper ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-12 md:py-20 max-w-6xl w-full mx-auto z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full space-y-10 sm:space-y-16"
        >
          {/* ── Premium Hero Introduction Section ── */}
          <motion.div variants={itemVariants} className="text-center space-y-6 max-w-4xl mx-auto">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 bg-[#C4A054]/10 border border-[#C4A054]/20 rounded-full px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C4A054] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C4A054]">
                Introducing Fundora
              </span>
            </div>

            {/* Giant Title Stack */}
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] md:leading-[1.05]">
              <span className="block hover:text-[#C4A054] transition-colors duration-300">Fund Your Impact.</span>
              <span className="block hover:text-[#C4A054] transition-colors duration-300">Track Your Performance.</span>
              <span className="block text-[#C4A054]">Unlock Monthly Rewards.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-[#8A9690] max-w-2xl mx-auto leading-relaxed font-medium">
              Fundora combines golf performance tracking, verified charity contributions, and monthly reward draws into a single membership platform.
            </p>
          </motion.div>

          {/* Divider */}
          <div className="w-full max-w-xs mx-auto border-t border-white/[0.06]" />

          {/* ── Portal Area / Role Cards Section ── */}
          <div className="space-y-12">
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto items-stretch"
            >
              {ROLES.map((role) => {
                const Icon = role.icon;

                return (
                  <CardWrapper
                    key={role.id}
                    role={role}
                  >
                    {/* Content Top */}
                    <div className="flex-1 flex flex-col w-full">
                      {/* Icon & Badge */}
                      <div className="flex items-start justify-between mb-5 w-full">
                        <div className={`w-11 h-11 rounded-xl ${role.iconBg} border border-white/[0.06] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                          <Icon className={`w-5.5 h-5.5 ${role.iconColor}`} />
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${role.badgeBg}`}>
                          {role.badge}
                        </span>
                      </div>

                      {/* Title & desc */}
                      <h3 className="font-heading text-sm font-extrabold text-white mb-1.5 tracking-wide">
                        {role.label}
                      </h3>
                      <p className="text-[11px] text-[#8A9690] leading-relaxed mb-5">
                        {role.description}
                      </p>

                      {/* Features list */}
                      <ul className="space-y-2 mb-6">
                        {role.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-[10px] text-[#8A9690]">
                            <span className={`w-1 h-1 rounded-full shrink-0 ${role.iconColor} opacity-70`} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <div className="mt-auto w-full">
                      <div
                        className={`w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200 ${role.ctaStyle}`}
                      >
                        {role.cta}
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" />
                      </div>
                    </div>
                  </CardWrapper>
                );
              })}
            </motion.div>
          </div>

          {/* Footer note */}
          <motion.p
            variants={itemVariants}
            className="text-center text-[10px] text-[#8A9690]/50 mt-12"
          >
            © 2026 Fundora Technologies Inc. · v1.0.0 Stable ·{" "}
            <Link href="/" className="hover:text-[#8A9690] transition-colors">
              Privacy Policy
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
