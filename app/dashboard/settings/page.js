"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  Bell,
  Shield,
  Mail,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";

const SETTING_SECTIONS = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    desc: "Update your display name and public giving profile.",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    desc: "Control email and platform notification preferences.",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    desc: "Change your password and manage active sessions.",
  },
];

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(profile?.full_name || "");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifDraw, setNotifDraw] = useState(true);
  const [notifImpact, setNotifImpact] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 14 }}
      >
        <span className="text-[10px] uppercase tracking-widest font-bold text-accent">
          Account Settings
        </span>
        <h2 className="font-heading text-lg font-extrabold text-foreground mt-1">
          Preferences & Security
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Settings sidebar ── */}
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 80, damping: 14 }}
          className="lg:col-span-3"
        >
          <Card className="p-3 space-y-1">
            {SETTING_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-semibold transition-all ${
                  activeSection === s.id
                    ? "bg-accent/12 text-accent border-l-2 border-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <s.icon className="w-3.5 h-3.5 shrink-0" />
                {s.label}
              </button>
            ))}
          </Card>
        </motion.div>

        {/* ── Settings content ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 80, damping: 14 }}
          className="lg:col-span-9"
        >
          {/* Success alert */}
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Alert variant="success">
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>Settings Saved</AlertTitle>
                <AlertDescription>Your preferences have been updated successfully.</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* PROFILE SECTION */}
          {activeSection === "profile" && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-border/40">
                <User className="w-4 h-4 text-accent" />
                <h3 className="font-heading font-bold text-sm text-foreground">Profile Details</h3>
              </div>

              {/* Avatar placeholder */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-heading font-extrabold text-xl uppercase">
                  {(profile?.full_name || user?.email || "U").charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{profile?.full_name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-1 text-[9px]">
                    {profile?.role || "user"}
                  </Badge>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-10 px-3 bg-secondary/10 border border-border rounded-sm text-xs text-foreground focus:outline-none focus:border-accent placeholder:text-muted-foreground/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full h-10 px-3 pr-10 bg-secondary/5 border border-border/50 rounded-sm text-xs text-muted-foreground cursor-not-allowed"
                    />
                    <Mail className="w-3.5 h-3.5 text-muted-foreground/40 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Email changes require verification and must be requested via support.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-end">
                <Button onClick={handleSave} variant="accent" size="sm">
                  Save Changes
                </Button>
              </div>
            </Card>
          )}

          {/* NOTIFICATIONS SECTION */}
          {activeSection === "notifications" && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-border/40">
                <Bell className="w-4 h-4 text-accent" />
                <h3 className="font-heading font-bold text-sm text-foreground">Notification Preferences</h3>
              </div>

              <div className="space-y-4">
                {[
                  {
                    id: "email",
                    label: "Email Notifications",
                    desc: "Monthly impact digests and subscription receipts.",
                    value: notifEmail,
                    onChange: setNotifEmail,
                  },
                  {
                    id: "draw",
                    label: "Draw Alerts",
                    desc: "Get notified when new draws open and when results are published.",
                    value: notifDraw,
                    onChange: setNotifDraw,
                  },
                  {
                    id: "impact",
                    label: "Impact Reports",
                    desc: "Quarterly charity outcome reports sent to your inbox.",
                    value: notifImpact,
                    onChange: setNotifImpact,
                  },
                ].map((pref) => (
                  <div key={pref.id} className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-xs font-bold text-foreground">{pref.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{pref.desc}</p>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => pref.onChange(!pref.value)}
                      className={`relative w-10 h-5.5 h-[22px] rounded-full transition-colors shrink-0 ${
                        pref.value ? "bg-accent" : "bg-border"
                      }`}
                    >
                      <motion.span
                        animate={{ x: pref.value ? 20 : 2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-end">
                <Button onClick={handleSave} variant="accent" size="sm">
                  Save Preferences
                </Button>
              </div>
            </Card>
          )}

          {/* SECURITY SECTION */}
          {activeSection === "security" && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-border/40">
                <Shield className="w-4 h-4 text-accent" />
                <h3 className="font-heading font-bold text-sm text-foreground">Security Settings</h3>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Password changes coming soon</AlertTitle>
                <AlertDescription>
                  Self-serve password reset will be available once the Supabase production environment is connected. For now, contact{" "}
                  <span className="text-accent font-semibold">security@fundora.org</span>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-border/30">
                  <div>
                    <p className="text-xs font-bold text-foreground">Password</p>
                    <p className="text-[10px] text-muted-foreground">Last changed: Unknown</p>
                  </div>
                  <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-50">
                    <Lock className="w-3.5 h-3.5" /> Change Password
                  </Button>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border/30">
                  <div>
                    <p className="text-xs font-bold text-foreground">Active Sessions</p>
                    <p className="text-[10px] text-muted-foreground">1 active session (this device)</p>
                  </div>
                  <Badge variant="success" className="gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Secure
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">Two-Factor Authentication</p>
                    <p className="text-[10px] text-muted-foreground">Not configured — coming soon</p>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">Upcoming</Badge>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
