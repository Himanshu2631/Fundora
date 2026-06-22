"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import {
  User,
  Bell,
  Shield,
  Mail,
  CheckCircle2,
  AlertCircle,
  Lock,
  LogOut,
  Calendar,
  Loader2,
  Eye,
  EyeOff
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
  const { user, profile, updateProfile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  
  // Profile Form States
  const [name, setName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState(null);
  
  // Password Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Notification Preferences States
  const [prefSystemUpdates, setPrefSystemUpdates] = useState(true);
  const [prefDrawResults, setPrefDrawResults] = useState(true);
  const [prefWinnerAlerts, setPrefWinnerAlerts] = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  // Sync profile details when loaded
  useEffect(() => {
    if (profile) {
      if (profile.full_name) {
        setName(profile.full_name);
      }
      setPrefSystemUpdates(profile.pref_system_updates !== false);
      setPrefDrawResults(profile.pref_draw_results !== false);
      setPrefWinnerAlerts(profile.pref_winner_alerts !== false);
    }
  }, [profile]);

  // Handle Profile Update
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    // Validation
    if (!name.trim()) {
      setProfileError("Display name cannot be empty.");
      return;
    }
    if (name.trim().length < 2) {
      setProfileError("Display name must be at least 2 characters.");
      return;
    }

    setProfileLoading(true);
    try {
      await updateProfile({ full_name: name.trim() });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err) {
      setProfileError(err.message || "Failed to update profile settings.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Update
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(false);

    // Validation
    if (!currentPassword) {
      setSecurityError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("New passwords do not match.");
      return;
    }

    setSecurityLoading(true);
    try {
      const supabase = createClient();
      
      // Perform local mock check if credentials are placeholder
      const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co" || !process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (isPlaceholder && typeof window !== "undefined") {
        const users = JSON.parse(localStorage.getItem("fundora-mock-users") || "[]");
        const found = users.find(u => u.id === user.id);
        if (found && found.password !== currentPassword) {
          throw new Error("Incorrect current password.");
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSecuritySuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSecuritySuccess(false), 4000);
    } catch (err) {
      setSecurityError(err.message || "Failed to update security password.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // Handle Notification Save
  const handleNotificationSave = async () => {
    setNotifSuccess(false);
    setNotifLoading(true);
    try {
      await updateProfile({
        pref_system_updates: prefSystemUpdates,
        pref_draw_results: prefDrawResults,
        pref_winner_alerts: prefWinnerAlerts
      });
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to update notification settings:", err);
    } finally {
      notifLoading && setNotifLoading(false);
      setNotifLoading(false);
    }
  };

  const formattedDate = (dateStr) => {
    if (!dateStr) return "June 2026";
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Page Header */}
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
        {/* Settings Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 80, damping: 14 }}
          className="lg:col-span-3 space-y-4"
        >
          <Card className="p-3 space-y-1">
            {SETTING_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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

          {/* Quick Logout Card */}
          <Card className="p-4 border-dashed border-destructive/20 bg-destructive/5 text-center flex flex-col gap-3">
            <p className="text-[10.5px] text-muted-foreground leading-relaxed">
              Finished managing your giving profile? Click below to securely close your active session.
            </p>
            <Button
              onClick={signOut}
              variant="destructive"
              size="sm"
              className="w-full text-xs font-bold uppercase tracking-wider gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout Session
            </Button>
          </Card>
        </motion.div>

        {/* Settings Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 80, damping: 14 }}
          className="lg:col-span-9"
        >
          <AnimatePresence mode="wait">
            {/* PROFILE SECTION */}
            {activeSection === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="p-6 space-y-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-border/40">
                    <User className="w-4 h-4 text-accent" />
                    <h3 className="font-heading font-bold text-sm text-foreground">Profile Details</h3>
                  </div>

                  {/* Profile Status alerts */}
                  {profileSuccess && (
                    <Alert variant="success" className="animate-in fade-in slide-in-from-top-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <AlertTitle>Profile Updated</AlertTitle>
                      <AlertDescription>Your display name was changed successfully.</AlertDescription>
                    </Alert>
                  )}
                  {profileError && (
                    <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="w-4 h-4" />
                      <AlertTitle>Validation Error</AlertTitle>
                      <AlertDescription>{profileError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Profile Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-secondary/10 border border-border/40 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-heading font-extrabold text-xl uppercase">
                        {(name || user?.email || "U").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{profile?.full_name || name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                        <Badge variant="outline" className="mt-1.5 text-[8.5px]">
                          {profile?.role || "user"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                      <div>
                        <span className="block font-bold text-foreground">Account Created</span>
                        <span className="text-[10.5px] block font-medium">
                          {formattedDate(profile?.created_at || user?.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Edit Name Form */}
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        disabled={profileLoading}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your display name"
                        className="w-full h-10 px-3 bg-secondary/10 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent placeholder:text-muted-foreground/50 transition-colors disabled:opacity-50"
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
                          className="w-full h-10 px-3 pr-10 bg-secondary/5 border border-border/40 rounded-xl text-xs text-muted-foreground cursor-not-allowed opacity-75"
                        />
                        <Mail className="w-3.5 h-3.5 text-muted-foreground/35 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                        Email updates are locked for verification safety. Contact support if you need to modify your registration email.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border/40 flex justify-end">
                      <Button type="submit" variant="accent" size="sm" disabled={profileLoading} className="font-bold">
                        {profileLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}

            {/* NOTIFICATIONS SECTION */}
            {activeSection === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="p-6 space-y-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-border/40">
                    <Bell className="w-4 h-4 text-accent" />
                    <h3 className="font-heading font-bold text-sm text-foreground">Notification Preferences</h3>
                  </div>

                  {notifSuccess && (
                    <Alert variant="success" className="animate-in fade-in slide-in-from-top-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <AlertTitle>Preferences Saved</AlertTitle>
                      <AlertDescription>Your notification triggers have been updated successfully.</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    {[
                      {
                        id: "system_updates",
                        label: "System Updates",
                        desc: "Get confirmations for registrations, subscription activations, renewals, upgrades, and cancellations.",
                        value: prefSystemUpdates,
                        onChange: setPrefSystemUpdates,
                      },
                      {
                        id: "draw_results",
                        label: "Draw Results",
                        desc: "Get notified when monthly prize draws are completed and outcomes are live.",
                        value: prefDrawResults,
                        onChange: setPrefDrawResults,
                      },
                      {
                        id: "winner_alerts",
                        label: "Winner Alerts",
                        desc: "Immediate email notification with next steps when your winning claim is verified and approved.",
                        value: prefWinnerAlerts,
                        onChange: setPrefWinnerAlerts,
                      },
                    ].map((pref) => (
                      <div key={pref.id} className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0">
                        <div>
                          <p className="text-xs font-bold text-foreground">{pref.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{pref.desc}</p>
                        </div>
                        {/* Custom Animated Toggle Switch */}
                        <button
                          onClick={() => pref.onChange(!pref.value)}
                          disabled={notifLoading}
                          className={`relative w-10 h-5.5 h-[22px] rounded-full transition-colors shrink-0 ${
                            pref.value ? "bg-accent" : "bg-border"
                          } disabled:opacity-50`}
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
                    <Button onClick={handleNotificationSave} variant="accent" size="sm" disabled={notifLoading}>
                      {notifLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                        </>
                      ) : (
                        "Save Preferences"
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* SECURITY SECTION */}
            {activeSection === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="p-6 space-y-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-border/40">
                    <Shield className="w-4 h-4 text-accent" />
                    <h3 className="font-heading font-bold text-sm text-foreground">Security Settings</h3>
                  </div>

                  {/* Success and Error Alerts */}
                  {securitySuccess && (
                    <Alert variant="success" className="animate-in fade-in slide-in-from-top-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <AlertTitle>Password Changed</AlertTitle>
                      <AlertDescription>Your login password was updated. Use your new password on next login.</AlertDescription>
                    </Alert>
                  )}
                  {securityError && (
                    <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="w-4 h-4" />
                      <AlertTitle>Security Warning</AlertTitle>
                      <AlertDescription>{securityError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Change Password Form */}
                  <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrent ? "text" : "password"}
                          value={currentPassword}
                          disabled={securityLoading}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-10 px-3 pr-10 bg-secondary/10 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent transition-colors disabled:opacity-50 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-1 focus:outline-none"
                        >
                          {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          value={newPassword}
                          disabled={securityLoading}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-10 px-3 pr-10 bg-secondary/10 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent transition-colors disabled:opacity-50 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-1 focus:outline-none"
                        >
                          {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                        Passwords must be at least 6 characters long and combine letters and symbols.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          disabled={securityLoading}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-10 px-3 pr-10 bg-secondary/10 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-accent transition-colors disabled:opacity-50 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-1 focus:outline-none"
                        >
                          {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/40 flex justify-end">
                      <Button type="submit" variant="accent" size="sm" disabled={securityLoading}>
                        {securityLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                          </>
                        ) : (
                          "Change Password"
                        )}
                      </Button>
                    </div>
                  </form>

                  {/* Device and MFA Logs */}
                  <div className="pt-6 border-t border-border/20 space-y-4">
                    <h4 className="font-heading font-bold text-xs text-foreground">Device Management</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between py-2 border-b border-border/20">
                        <div>
                          <p className="font-bold text-foreground">Current Session</p>
                          <p className="text-[10px] text-muted-foreground">Windows Chrome · Active now</p>
                        </div>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-bold text-foreground">Two-Factor Auth (2FA)</p>
                          <p className="text-[10px] text-muted-foreground">Add a level of verification to lock down security.</p>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground">Upcoming</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
