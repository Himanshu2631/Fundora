import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-background text-muted-foreground py-16">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand Info */}
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-lg select-none">
              F
            </div>
            <span className="font-heading font-extrabold tracking-wider text-xl text-foreground group-hover:text-accent transition-colors duration-300">
              FUNDORA
            </span>
          </Link>
          <p className="text-xs leading-relaxed max-w-xs text-muted-foreground/80">
            A premium handcrafted gamified philanthropy platform. Build your score, support verified global causes, and unlock exclusive rewards.
          </p>
        </div>

        {/* Links Column 1 */}
        <div>
          <h3 className="font-heading font-bold text-foreground text-xs uppercase tracking-widest mb-6">
            Platform
          </h3>
          <ul className="flex flex-col gap-3 text-xs font-medium">
            <li>
              <Link href="/" className="hover:text-accent transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="hover:text-accent transition-colors">
                How It Works
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="hover:text-accent transition-colors">
                Pricing Preview
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-accent transition-colors">
                Score Leaderboard
              </Link>
            </li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div>
          <h3 className="font-heading font-bold text-foreground text-xs uppercase tracking-widest mb-6">
            Legals & Trust
          </h3>
          <ul className="flex flex-col gap-3 text-xs font-medium">
            <li>
              <Link href="/privacy" className="hover:text-accent transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-accent transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/audit" className="hover:text-accent transition-colors">
                Charity Auditing
              </Link>
            </li>
            <li>
              <span className="text-muted-foreground/60 select-all">
                transparency@fundora.org
              </span>
            </li>
          </ul>
        </div>

        {/* Contact/Subscription info */}
        <div className="flex flex-col gap-4">
          <h3 className="font-heading font-bold text-foreground text-xs uppercase tracking-widest mb-2">
            Stay Updated
          </h3>
          <p className="text-xs max-w-xs leading-relaxed text-muted-foreground/80">
            Subscribe to our weekly dispatch of impact updates and upcoming draws.
          </p>
          <div className="flex gap-2 w-full max-w-sm">
            <input
              type="email"
              placeholder="Your email address"
              className="w-full h-10 px-3 bg-secondary/20 border border-border text-foreground text-xs rounded-sm focus:outline-none focus:border-accent placeholder:text-muted-foreground/55"
            />
            <Button variant="accent" size="sm" className="h-10 text-[10px] px-4 font-bold">
              Join
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 mt-16 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground/60">
        <p>© {currentYear} Fundora Technologies Inc. All rights reserved.</p>
        <p>Built with Next.js, Framer Motion, and Tailwind CSS.</p>
      </div>
    </footer>
  );
}
