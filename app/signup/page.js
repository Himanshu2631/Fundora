"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedTier, setSelectedTier] = useState("advocate");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const { signUp } = useAuth();

  const tiers = [
    {
      id: "scout",
      name: "Eco Scout",
      price: "$10/mo",
      score: "+10 Giving Score",
      description: "Focuses on climate stabilization and local reforestation initiatives.",
    },
    {
      id: "advocate",
      name: "Global Advocate",
      price: "$25/mo",
      score: "+30 Giving Score",
      description: "Focuses on clean water filtration and primary children healthcare.",
    },
    {
      id: "builder",
      name: "Legacy Builder",
      price: "$100/mo",
      score: "+150 Giving Score",
      description: "Direct allocation to emergency responses and STEM fellowships.",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await signUp(name, email, password);
      setSuccessMsg("Registration initiated! Please check your email to verify your address.");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Back button */}
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors z-20 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to home
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 w-full">
        {/* Left Editorial Panel */}
        <div className="hidden lg:flex lg:col-span-5 bg-card border-r border-border p-16 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1d18_1px,transparent_1px),linear-gradient(to_bottom,#0c1d18_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-35 -z-10" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-lg select-none">
              F
            </div>
            <span className="font-heading font-extrabold tracking-wider text-xl text-foreground">
              FUNDORA
            </span>
          </div>

          <div className="flex flex-col gap-6">
            <div className="self-start">
              <Badge variant="accent" className="gap-1.5 px-3 py-1">
                <Sparkles className="w-3.5 h-3.5" /> Ecosystem Signup
              </Badge>
            </div>
            <blockquote className="font-heading text-2xl font-bold leading-relaxed text-foreground">
              &ldquo;Join a cohort of modern philanthropists automating real-world charity work with structural transparency.&rdquo;
            </blockquote>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="w-4 h-4 rounded-full bg-accent/15 flex items-center justify-center text-accent border border-accent/20">
                  <Check className="w-2.5 h-2.5" />
                </div>
                100% Tax-deductible receipts emailed instantly
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="w-4 h-4 rounded-full bg-accent/15 flex items-center justify-center text-accent border border-accent/20">
                  <Check className="w-2.5 h-2.5" />
                </div>
                Verify your impact logs in real-time
              </div>
            </div>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex justify-between">
            <span>© Fundora Technologies Inc.</span>
            <span>Audited Platform</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 flex items-center justify-center p-8 sm:p-12 md:p-20 overflow-y-auto bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-xl py-12"
          >
            <h2 className="font-heading text-3xl font-extrabold text-foreground mb-2">Create Account</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-8">
              Join Fundora to initiate impact subscriptions, accumulate points, and qualify for reward draws.
            </p>

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Registration Error</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert variant="success">
                  <Check className="w-4 h-4" />
                  <AlertTitle>Account Registered</AlertTitle>
                  <AlertDescription>{successMsg}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <Input
                required
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />

              {/* Email */}
              <Input
                required
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />

              {/* Password */}
              <Input
                required
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              {/* Subscription Tier Picker (Unique Handcrafted UI) */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block">
                  Select Giving Tier
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {tiers.map((tier) => (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className={`border p-4 rounded-xl cursor-pointer select-none transition-all duration-300 ${
                        selectedTier === tier.id
                          ? "bg-accent/5 border-accent shadow-sm"
                          : "bg-card border-border hover:border-muted-foreground/45"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-heading font-bold text-sm text-foreground">{tier.name}</span>
                        {selectedTier === tier.id && (
                          <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-[#060C0A]">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-accent mb-2">{tier.price} &bull; {tier.score}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{tier.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                variant="accent"
                className="w-full h-11"
              >
                {isLoading ? "Creating Account..." : "Create Account & Subscribe"}
              </Button>
            </form>

            <p className="text-xs sm:text-sm text-center text-muted-foreground mt-8">
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline font-bold">
                Sign In
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
