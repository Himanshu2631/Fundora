"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "How It Works", href: "/#how-it-works" },
    { name: "Pricing", href: "/pricing" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-lg select-none">
            F
          </div>
          <span className="font-heading font-extrabold tracking-wider text-xl text-foreground group-hover:text-accent transition-colors duration-300">
            FUNDORA
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="relative text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200 py-2 group"
            >
              {link.name}
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-accent transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          {user && (
            <>
              <Link
                href="/dashboard"
                className="relative text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200 py-2 group"
              >
                Dashboard
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-accent transition-all duration-300 group-hover:w-full" />
              </Link>
              {profile?.role === "admin" && (
                <Link
                  href="/admin"
                  className="relative text-xs font-semibold uppercase tracking-wider text-accent hover:text-accent/80 transition-colors duration-200 py-2 group"
                >
                  Admin Console
                  <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-accent transition-all duration-300 group-hover:w-full" />
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {!loading && (
            user ? (
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-accent" /> {profile?.full_name || user.email}
                </span>
                <Button
                  onClick={signOut}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs font-bold uppercase"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Button
                  asChild
                  variant="accent"
                  size="sm"
                >
                  <Link href="/signup">
                    Join Fundora <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </>
            )
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-muted-foreground hover:text-foreground focus:outline-none"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden border-b border-border bg-background px-6 py-6 flex flex-col gap-6"
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {link.name}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </Link>
                {profile?.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-semibold uppercase tracking-wider text-accent hover:text-accent/80"
                  >
                    Admin Console
                  </Link>
                )}
              </>
            )}
          </div>
          <div className="h-[1px] bg-border/60" />
          <div className="flex items-center justify-between">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-accent" /> {profile?.full_name || user.email}
                </span>
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8 text-xs font-bold uppercase"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Sign In
                </Link>
                <Button
                  asChild
                  variant="accent"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <Link href="/signup">
                    Join Fundora <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}
