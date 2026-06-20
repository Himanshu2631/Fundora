"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      await signIn(email, password);
      window.location.href = "/dashboard";
    } catch (err) {
      setErrorMsg(err.message || "Failed to sign in. Please verify credentials.");
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
        {/* Left Editorial Panel (Hidden on mobile) */}
        <div className="hidden lg:flex lg:col-span-5 bg-card border-r border-border p-16 flex-col justify-between relative overflow-hidden">
          {/* Grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1d18_1px,transparent_1px),linear-gradient(to_bottom,#0c1d18_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-35 -z-10" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-lg select-none">
              F
            </div>
            <span className="font-heading font-extrabold tracking-wider text-xl text-foreground">
              FUNDORA
            </span>
          </div>

          <div className="flex flex-col gap-6">
            <div className="self-start">
              <Badge variant="accent" className="gap-1.5 px-3 py-1">
                <Sparkles className="w-3.5 h-3.5" /> Secure Console
              </Badge>
            </div>
            <blockquote className="font-heading text-2xl font-bold leading-relaxed text-foreground">
              &ldquo;The measure of life is not its duration, but its donation. Fundora puts auditability and progress metrics at the center of giving.&rdquo;
            </blockquote>
            <p className="text-xs font-semibold text-muted-foreground">— The Fundora Council for Transparent Giving</p>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex justify-between">
            <span>© Fundora Technologies Inc.</span>
            <span>v1.0.0 Stable</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 flex items-center justify-center p-8 sm:p-12 md:p-20 bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <h2 className="font-heading text-3xl font-extrabold text-foreground mb-2">Welcome Back</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-8">
              Sign in to manage your giving subscriptions, score, and draws.
            </p>

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Sign In Error</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">
                    Password
                  </label>
                  <Link href="/forgot" className="text-xs text-accent hover:underline font-semibold">
                    Forgot?
                  </Link>
                </div>
                <Input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                variant="accent"
                className="w-full h-11"
              >
                {isLoading ? "Signing In..." : "Sign In to Fundora"}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-background px-3 text-muted-foreground/80">Or alternative access</span>
              </div>
            </div>

            {/* Google OAuth placeholder */}
            <Button
              onClick={handleSubmit}
              variant="outline"
              className="w-full h-11 text-xs uppercase tracking-wider font-bold"
            >
              Continue with Google
            </Button>

            <p className="text-xs sm:text-sm text-center text-muted-foreground mt-8">
              New to Fundora?{" "}
              <Link href="/signup" className="text-accent hover:underline font-bold">
                Create an account
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
