# Fundora — Gamified Philanthropy & Exclusive Reward Draws

> A member-driven platform where your passion for golf fuels global change. Subscribe to a giving plan, log Stableford rounds to earn a Giving Score, and enter exclusive monthly prize draws — while 100% of your subscription flows to audited, vetted charities.

---

## Overview

Fundora bridges the gap between competitive sport and meaningful philanthropy. Golfers subscribe to one of three giving tiers, each routing funds directly to verified global causes — environmental conservation, clean water access, education, and healthcare. As members log their rounds, they accumulate a Giving Score that determines eligibility and ticket weight for monthly prize draws. Winners are determined by lottery-style number matching, with the entire process tracked transparently through a real-time admin dashboard.

This is a full-stack SaaS platform built for real-world deployment, featuring Stripe-powered subscription billing, Supabase as the backend, transactional email via Resend, and a polished dark-mode UI crafted with Next.js 16 and Framer Motion.

---

## Screenshots

> _A visual walkthrough of the platform's core surfaces._

### 🏠 Homepage — Hero & Live Platform Stats
The homepage dynamically pulls live stats from Supabase: active member count, total contributions, rounds submitted, and the current reward pool. The hero CTA routes authenticated users directly to their dashboard.

### 📊 User Dashboard — Overview
A personalised command centre showing the member's subscription status, Giving Score, recent activity, and contribution breakdown across their allocated charities.

### 🎟️ Draws Dashboard — Active Draw & Ticket Entries
Displays the current monthly draw, the member's automatically generated lottery tickets, and their eligibility checklist (active tier + logged rounds + charity allocation). Shows ticket numbers, win history, and a claim submission panel for matched entries.

### 🏆 Leaderboard & Score Tracker
Members see their rank among all platform participants, broken down by Giving Score. Encourages competitive engagement with the charity mission.

### ⚙️ Admin Dashboard — Draw Management
Admins can create draws with custom titles, prize descriptions, minimum score thresholds, sponsor attribution, and draw dates. Once live, the draw is immediately visible to all eligible users.

### 👥 Admin — User & Subscription Management
A full CRM-style view of all registered members, their subscription plan, payment status, score history, and charity allocations.

---

## Key Features

### For Members (Users)

| Feature | Description |
|---|---|
| **Tiered Subscriptions** | Three giving plans — Eco Scout ($10/mo), Global Advocate ($25/mo), Legacy Builder ($100/mo) — each routing 100% of funds to verified charities |
| **Giving Score System** | Members earn points based on their tier, Stableford rounds logged, and activity streaks |
| **Automatic Draw Entry** | Eligible members are automatically entered into the active monthly draw — no manual opt-in required |
| **Lottery Ticket Display** | Each draw entry generates unique lottery numbers displayed in the member's dashboard |
| **Win Claim Portal** | Members matching 3+ numbers can submit a screenshot verification link to initiate prize claims |
| **Past Draw History** | Full archive of completed draws with winning numbers and personal entry records |
| **Charity Allocation** | Members split their contribution across supported causes using a percentage-based allocation tool |
| **Billing Management** | Stripe-powered portal for plan upgrades, payment history, and cancellation |

### For Admins

| Feature | Description |
|---|---|
| **Draw Creation** | Create draws with title, prize description, draw date, minimum score threshold, and sponsor branding |
| **Real-time User Sync** | Newly created draws appear instantly in all user dashboards without requiring a page reload |
| **Claim Review Panel** | Admins approve or reject submitted prize claims with a single action |
| **Draw Completion** | Trigger draw completion, which generates winning numbers and notifies eligible users via email |
| **Platform Analytics** | Live member counts, total contributions, rounds submitted, and charity performance metrics |
| **User Management** | View all profiles, subscription tiers, score history, and payment records |
| **Charity Management** | Add and manage verified charities with auditor scores and impact descriptions |

---

## How It Works

### The Member Journey

1. **Sign Up** — Create an account and verify your email address.
2. **Choose a Tier** — Subscribe to Eco Scout, Global Advocate, or Legacy Builder via Stripe Checkout.
3. **Log Your Rounds** — Submit Stableford scores from your rounds. Each round logged builds your Giving Score.
4. **Set Charity Allocations** — Decide how your subscription is split across the supported causes.
5. **Earn Eligibility** — Once you have an active subscription, at least one logged round, and at least one charity allocation, you're automatically eligible for the active draw.
6. **Get Your Tickets** — Eligible members are automatically entered with unique lottery ticket numbers.
7. **Check Results** — When the draw closes, your ticket numbers are compared against the drawn winning numbers.
8. **Claim Your Prize** — Match 3 or more numbers? Submit a screenshot receipt via the claim portal. Admins review and approve.

### The Draw Lifecycle

```
Admin Creates Draw → Draw Visible to All Users → Members Accumulate Eligibility
→ Auto-Entry Generates Tickets → Draw Closes → Winning Numbers Generated
→ Matches Identified → Claims Submitted → Admin Reviews → Prize Disbursed
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | JavaScript (React 19) |
| **Database & Auth** | Supabase (PostgreSQL + Row Level Security) |
| **Payments** | Stripe (Checkout, Webhooks, Customer Portal) |
| **Email** | Resend (transactional notifications) |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **Animations** | Framer Motion |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Lucide React |
| **Hosting** | Vercel-ready |

---

## Architecture

```
app/
├── page.js                  # Public homepage with live stats
├── dashboard/               # Authenticated member area
│   ├── page.js              # Overview dashboard
│   ├── draws/               # Draw eligibility, tickets, history
│   ├── scores/              # Stableford round submission
│   ├── charity/             # Allocation management
│   ├── subscription/        # Plan & billing management
│   └── settings/            # Profile settings
├── admin/                   # Admin-only area (role-gated)
│   ├── draws/               # Create and manage draws
│   ├── users/               # Member management
│   ├── subscriptions/       # Subscription overview
│   ├── payments/            # Payment records
│   ├── charities/           # Charity management
│   ├── analytics/           # Platform metrics
│   └── winners/             # Prize claim review
└── api/
    ├── stripe/              # Webhook handler + checkout session
    ├── admin/draws/         # Draw completion & result publishing
    └── notify/              # Email notification triggers

hooks/                       # React data hooks (useDraws, useScores, useCharities, etc.)
services/                    # Supabase query layer (drawService, scoreService, etc.)
lib/                         # Supabase client, draw validation, utilities
components/                  # Shared UI components and layout wrappers
supabase/                    # SQL migrations and database setup
```

---

## Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `profiles` | Extended user data linked to Supabase Auth |
| `subscriptions` | Stripe subscription records per user |
| `scores` | Stableford round submissions per user |
| `charities` | Verified charity directory with impact data |
| `charity_allocations` | User's percentage split across charities |
| `draws` | Monthly prize draws (title, prize, status, dates) |
| `draw_entries` | Lottery tickets auto-generated per eligible member |
| `prize_claims` | Member-submitted win verification requests |

---

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- A Stripe account (test mode)
- A Resend account for email

### Setup

```bash
# Clone the repository
git clone https://github.com/Himanshu2631/Fundora.git
cd Fundora

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, RESEND_API_KEY

# Run database migrations
# Open supabase/SETUP_DATABASE.sql in your Supabase SQL editor and execute it

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL (e.g. `http://localhost:3000`) |

---

## Design Decisions

**Why automatic draw entry?**
Requiring members to manually opt into each draw creates unnecessary friction and drops participation rates. Fundora automatically enters every eligible member, ensuring the platform's core value proposition — "subscribe and start winning" — holds true without extra steps.

**Why Giving Score over flat eligibility?**
A flat "subscribed = eligible" model doesn't incentivise engagement. The Giving Score rewards consistent behaviour: logging rounds, maintaining an active tier, allocating to charities. Higher-tier plans and streaks produce larger scores, which in turn unlock draws with higher minimum thresholds (i.e., premium draws for premium givers).

**Why Supabase over a traditional backend?**
Supabase's Row Level Security allows per-user data isolation without a custom API layer for every query. Combined with its real-time capabilities, it reduces infrastructure complexity while keeping the data model transparent and auditable.

---

## Deployment

The project is optimised for Vercel deployment:

```bash
npm run build
```

Set all environment variables in your Vercel project settings. Configure your Stripe webhook endpoint to point to `https://your-domain.com/api/stripe/webhook` and whitelist the relevant events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).

---

## License

This project is private and not open for redistribution. All rights reserved.

---

_Built with Next.js, Supabase, Stripe, and a genuine belief that technology can make generosity more rewarding._
