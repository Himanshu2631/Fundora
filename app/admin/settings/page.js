"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Shield,
  Zap,
  Globe,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
  Activity,
  Server,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 85, damping: 15 } },
};

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("platform");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);

  // Platform state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [drawEngine, setDrawEngine] = useState("random");

  // Security state
  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("1h");
  const [adminIpWhitelist, setAdminIpWhitelist] = useState("");

  // Integrations state
  const [stripeSecret, setStripeSecret] = useState("sk_test_51Ng...90K");
  const [resendToken, setResendToken] = useState("re_3hk...A9L");
  const [webhookSecret, setWebhookSecret] = useState("whsec_5Xj...24P");

  const handleSave = () => {
    setSaveLoading(true);
    setSaveFeedback(null);
    setTimeout(() => {
      setSaveLoading(false);
      setSaveFeedback({ type: "success", text: "Settings saved and applied to runtime environment." });
      setTimeout(() => setSaveFeedback(null), 4000);
    }, 800);
  };

  const tabs = [
    { id: "platform", name: "Platform Config", icon: Globe },
    { id: "security", name: "Security & Access", icon: Shield },
    { id: "integrations", name: "Integrations", icon: Zap },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Header Summary */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xs font-bold text-[#8A9690] uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4 text-red-500" />
              Console Parameters
            </h3>
            <p className="text-[10px] text-[#8A9690] mt-0.5">Control global platform overrides and third-party gateways.</p>
          </div>
          
          <div className="flex gap-2">
            <Badge className="bg-[#0A1C16] border-[#162520] text-emerald-400 py-1 flex gap-1.5 items-center">
              <Server className="w-3 h-3 text-emerald-400" />
              Runtime: Node.js 20.x
            </Badge>
            <Badge className="bg-[#0A1C16] border-[#162520] text-[#8A9690] py-1">
              v1.4.2-beta
            </Badge>
          </div>
        </motion.div>

        {/* Saved Alert Banner */}
        <AnimatePresence>
          {saveFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">{saveFeedback.text}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Vertical Tabs Sidebar */}
          <div className="md:col-span-1 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-red-600/15 border border-red-600/20 text-red-400 font-bold"
                    : "text-[#8A9690] hover:text-white hover:bg-[#0D2B20]/40 border border-transparent"
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.name}
              </button>
            ))}
          </div>

          {/* Configuration Form Card */}
          <div className="md:col-span-3 space-y-6">
            <Card className="bg-[#0A1C16] border-[#162520]">
              <CardContent className="p-6">
                {/* ─── PLATFORM TAB ─── */}
                {activeTab === "platform" && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-heading text-sm font-bold text-white mb-1">Global Platform Settings</h4>
                      <p className="text-[11px] text-[#8A9690]">Adjust operational modes and participant accessibility controls.</p>
                    </div>

                    <hr className="border-[#162520]" />

                    <div className="space-y-4">
                      {/* Maintenance mode */}
                      <div className="flex items-center justify-between p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl hover:border-red-500/10 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-white">Maintenance Mode</p>
                          <p className="text-[10px] text-[#8A9690] mt-0.5">Restrict client app requests and display a maintenance screen.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMaintenanceMode(!maintenanceMode)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                            maintenanceMode ? "bg-red-600" : "bg-[#162520]"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                            maintenanceMode ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Registration lock */}
                      <div className="flex items-center justify-between p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl hover:border-red-500/10 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-white">Public Account Registration</p>
                          <p className="text-[10px] text-[#8A9690] mt-0.5">Allow guest users to create new profiles and sign up.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRegistrationOpen(!registrationOpen)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                            registrationOpen ? "bg-emerald-600" : "bg-[#162520]"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                            registrationOpen ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Live Mode Toggle */}
                      <div className="flex items-center justify-between p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl hover:border-red-500/10 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-white">Stripe Live Production</p>
                          <p className="text-[10px] text-[#8A9690] mt-0.5">Enable real credit card processing instead of testing cards.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLiveMode(!liveMode)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                            liveMode ? "bg-red-600" : "bg-[#162520]"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                            liveMode ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Default Draw Mode Select */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl gap-3">
                        <div>
                          <p className="text-xs font-bold text-white">Default Draw Engine</p>
                          <p className="text-[10px] text-[#8A9690] mt-0.5">Set the active selection engine used to calculate winners.</p>
                        </div>
                        <select
                          value={drawEngine}
                          onChange={(e) => setDrawEngine(e.target.value)}
                          className="px-3 py-1.5 bg-[#0A1C16] border border-[#162520] text-white text-xs rounded-lg focus:outline-none focus:border-red-500/40 w-44"
                        >
                          <option value="random">Random Draw</option>
                          <option value="algorithm">Algorithm-Powered</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── SECURITY TAB ─── */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-heading text-sm font-bold text-white mb-1">Security & Access Management</h4>
                      <p className="text-[11px] text-[#8A9690]">Strengthen authentication thresholds and restricted network ranges.</p>
                    </div>

                    <hr className="border-[#162520]" />

                    <div className="space-y-4">
                      {/* MFA Enforcement */}
                      <div className="flex items-center justify-between p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-white">Enforce Multi-Factor Auth (MFA)</p>
                          <p className="text-[10px] text-[#8A9690] mt-0.5">Require all administrative roles to secure access via authenticator app TOTP.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMfaEnforced(!mfaEnforced)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                            mfaEnforced ? "bg-red-600" : "bg-[#162520]"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                            mfaEnforced ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Session duration */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl gap-3">
                        <div>
                          <p className="text-xs font-bold text-white">Session Inactivity Timeout</p>
                          <p className="text-[10px] text-[#8A9690] mt-0.5">Automatically sign out users after a specified time frame.</p>
                        </div>
                        <select
                          value={sessionTimeout}
                          onChange={(e) => setSessionTimeout(e.target.value)}
                          className="px-3 py-1.5 bg-[#0A1C16] border border-[#162520] text-white text-xs rounded-lg focus:outline-none focus:border-red-500/40 w-32"
                        >
                          <option value="15m">15 Minutes</option>
                          <option value="30m">30 Minutes</option>
                          <option value="1h">1 Hour</option>
                          <option value="24h">24 Hours</option>
                        </select>
                      </div>

                      {/* IP whitelisting */}
                      <div className="p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl space-y-2">
                        <p className="text-xs font-bold text-white">Admin IP Range Whitelist</p>
                        <p className="text-[10px] text-[#8A9690] mb-2">Permit administrative panel access only to specified comma-separated IP strings.</p>
                        <Input
                          placeholder="e.g. 192.168.1.1, 10.0.4.15 (Leave empty to disable)"
                          value={adminIpWhitelist}
                          onChange={(e) => setAdminIpWhitelist(e.target.value)}
                          className="bg-[#0A1C16] border-[#162520] text-white placeholder:text-[#8A9690]/40 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── INTEGRATIONS TAB ─── */}
                {activeTab === "integrations" && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-heading text-sm font-bold text-white mb-1">API Integrations & Keys</h4>
                      <p className="text-[11px] text-[#8A9690]">Configure payment processor gateway codes and mail credentials.</p>
                    </div>

                    <hr className="border-[#162520]" />

                    <div className="space-y-4">
                      {/* Stripe Secret Key */}
                      <div className="p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl space-y-1.5">
                        <label className="text-xs font-bold text-white block">Stripe Secret API Key</label>
                        <Input
                          type="password"
                          value={stripeSecret}
                          onChange={(e) => setStripeSecret(e.target.value)}
                          className="bg-[#0A1C16] border-[#162520] text-white text-xs font-mono"
                        />
                        <p className="text-[9px] text-[#8A9690]">Do not share secret keys. Enforce vault variables inside production envs.</p>
                      </div>

                      {/* Resend Token */}
                      <div className="p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl space-y-1.5">
                        <label className="text-xs font-bold text-white block">Resend Email API Token</label>
                        <Input
                          type="password"
                          value={resendToken}
                          onChange={(e) => setResendToken(e.target.value)}
                          className="bg-[#0A1C16] border-[#162520] text-white text-xs font-mono"
                        />
                      </div>

                      {/* Webhook Secret */}
                      <div className="p-3.5 bg-[#0D2B20]/20 border border-[#162520] rounded-xl space-y-1.5">
                        <label className="text-xs font-bold text-white block">Stripe Webhook Signing Secret</label>
                        <Input
                          type="password"
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                          className="bg-[#0A1C16] border-[#162520] text-white text-xs font-mono"
                        />
                      </div>

                      {/* Health card info */}
                      <div className="p-3.5 bg-[#0A1C16] border border-[#162520] rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold text-white">Stripe Webhook Health</span>
                        </div>
                        <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] hover:bg-emerald-500/15">
                          100% Synced
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Bar */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveLoading}
                className="bg-red-600 hover:bg-red-500 text-white font-bold border-0 text-xs h-9 gap-1.5"
              >
                {saveLoading ? (
                  "Applying Settings..."
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
