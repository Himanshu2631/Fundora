-- ============================================================
-- FUNDORA COMPLETE DATABASE SETUP
-- Run this entire file in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pnxtsqhqicewxcpciwbg/sql/new
-- ============================================================


-- ==========================================
-- STEP 1: Helper Trigger & Definer Functions
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- STEP 2: Core Tables
-- ==========================================

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
  stripe_customer_id text,
  pref_system_updates boolean NOT NULL DEFAULT TRUE,
  pref_draw_results boolean NOT NULL DEFAULT TRUE,
  pref_winner_alerts boolean NOT NULL DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('scout', 'advocate', 'builder')),
  status text NOT NULL,
  renewal_date timestamp with time zone NOT NULL,
  stripe_subscription_id text,
  stripe_price_id text,
  plan_name text,
  subscription_id text,
  customer_id text,
  card_brand text,
  card_last4 text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'))
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- scores
CREATE TABLE IF NOT EXISTS public.scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score integer NOT NULL DEFAULT 0,
  score_date date NOT NULL DEFAULT current_date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- charities
CREATE TABLE IF NOT EXISTS public.charities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  image_url text,
  featured boolean DEFAULT false NOT NULL,
  category text DEFAULT 'General',
  impact text DEFAULT '',
  why_matters text DEFAULT '',
  auditor_score text DEFAULT '',
  spending_ratio text DEFAULT '',
  raised text DEFAULT '$0',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;

-- user_charity_selections
CREATE TABLE IF NOT EXISTS public.user_charity_selections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  charity_id uuid REFERENCES public.charities(id) ON DELETE CASCADE NOT NULL,
  contribution_percentage integer NOT NULL DEFAULT 10 CHECK (contribution_percentage >= 10 AND contribution_percentage <= 100),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_charity UNIQUE (user_id, charity_id)
);
ALTER TABLE public.user_charity_selections ENABLE ROW LEVEL SECURITY;

-- draws
CREATE TABLE IF NOT EXISTS public.draws (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month text NOT NULL,
  title text,
  prize text,
  prize_value numeric(12, 2),
  min_score integer DEFAULT 0,
  sponsor text DEFAULT 'Fundora Foundation',
  draw_date date,
  draw_month integer,
  winning_numbers integer[],
  generated_numbers integer[],
  generated_timestamp timestamp with time zone,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'drawn', 'cancelled')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;

-- draw_entries
CREATE TABLE IF NOT EXISTS public.draw_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  draw_id uuid REFERENCES public.draws(id) ON DELETE CASCADE NOT NULL,
  ticket_number text,
  numbers integer[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_draw UNIQUE (user_id, draw_id)
);
ALTER TABLE public.draw_entries ENABLE ROW LEVEL SECURITY;

-- winner_submissions
CREATE TABLE IF NOT EXISTS public.winner_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  draw_id uuid REFERENCES public.draws(id) ON DELETE CASCADE NOT NULL,
  entry_id uuid REFERENCES public.draw_entries(id) ON DELETE SET NULL,
  ticket_number text,
  match_count integer DEFAULT 0,
  prize_category text,
  prize text,
  draw_title text,
  screenshot_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.winner_submissions ENABLE ROW LEVEL SECURITY;

-- payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
  stripe_invoice_id text UNIQUE,
  stripe_price_id text,
  amount_cents integer,
  invoice_pdf_url text,
  hosted_invoice_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_price_id text NOT NULL UNIQUE,
  plan_name text NOT NULL CHECK (plan_name IN ('scout', 'advocate', 'builder')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- email_preferences
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  system_updates boolean DEFAULT true NOT NULL,
  draw_results boolean DEFAULT true NOT NULL,
  winner_alerts boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- STEP 3: RLS Policies
-- ==========================================

-- profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access on profiles"
  ON public.profiles FOR ALL USING (public.is_admin(auth.uid()));

-- subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins have full access on subscriptions"
  ON public.subscriptions FOR ALL USING (public.is_admin(auth.uid()));

-- scores
CREATE POLICY "Scores are viewable by authenticated users"
  ON public.scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage their own scores"
  ON public.scores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins have full access on scores"
  ON public.scores FOR ALL USING (public.is_admin(auth.uid()));

-- charities
CREATE POLICY "Charities are viewable by everyone"
  ON public.charities FOR SELECT USING (true);
CREATE POLICY "Admins have full access on charities"
  ON public.charities FOR ALL USING (public.is_admin(auth.uid()));

-- user_charity_selections
CREATE POLICY "Users can view their own charity selections"
  ON public.user_charity_selections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own charity selections"
  ON public.user_charity_selections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins have full access on charity selections"
  ON public.user_charity_selections FOR ALL USING (public.is_admin(auth.uid()));

-- draws
CREATE POLICY "Draws are viewable by authenticated users"
  ON public.draws FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access on draws"
  ON public.draws FOR ALL USING (public.is_admin(auth.uid()));

-- draw_entries
CREATE POLICY "Users can view their own draw entries"
  ON public.draw_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can register themselves for a draw"
  ON public.draw_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins have full access on draw entries"
  ON public.draw_entries FOR ALL USING (public.is_admin(auth.uid()));

-- winner_submissions
CREATE POLICY "Users can view their own winner submissions"
  ON public.winner_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own winner submissions"
  ON public.winner_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins have full access on winner submissions"
  ON public.winner_submissions FOR ALL USING (public.is_admin(auth.uid()));

-- payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins have full access on payments"
  ON public.payments FOR ALL USING (public.is_admin(auth.uid()));

-- subscription_plans
CREATE POLICY "Subscription plans are viewable by everyone"
  ON public.subscription_plans FOR SELECT USING (true);

-- notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins have full access on notifications"
  ON public.notifications FOR ALL USING (public.is_admin(auth.uid()));

-- email_preferences
CREATE POLICY "Users can view their own email preferences"
  ON public.email_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own email preferences"
  ON public.email_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins have full access on email preferences"
  ON public.email_preferences FOR ALL USING (public.is_admin(auth.uid()));


-- ==========================================
-- STEP 4: Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON public.scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_sort ON public.scores(score DESC, score_date DESC);
CREATE INDEX IF NOT EXISTS idx_charities_featured ON public.charities(featured);
CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_draw_date ON public.draws(draw_date);
CREATE INDEX IF NOT EXISTS idx_draw_entries_user_id ON public.draw_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id ON public.draw_entries(draw_id);
CREATE INDEX IF NOT EXISTS idx_winner_submissions_user_id ON public.winner_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_winner_submissions_draw_id ON public.winner_submissions(draw_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS idx_user_charity_selections_user_id ON public.user_charity_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON public.email_preferences(user_id);


-- ==========================================
-- STEP 5: Triggers for Auto-updated_at and Profile Sync
-- ==========================================

-- Auto-updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_charities_updated_at BEFORE UPDATE ON public.charities FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_user_charity_selections_updated_at BEFORE UPDATE ON public.user_charity_selections FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_draws_updated_at BEFORE UPDATE ON public.draws FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_draw_entries_updated_at BEFORE UPDATE ON public.draw_entries FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_winner_submissions_updated_at BEFORE UPDATE ON public.winner_submissions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON public.email_preferences FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Profile and default settings Sync Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.email_preferences (user_id, system_updates, draw_results, winner_alerts)
  VALUES (NEW.id, true, true, true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- STEP 6: Seed subscription plans
-- ==========================================
INSERT INTO public.subscription_plans (stripe_price_id, plan_name, billing_cycle, amount)
VALUES
  ('price_scout_monthly', 'scout', 'monthly', 10.00),
  ('price_scout_yearly', 'scout', 'yearly', 96.00),
  ('price_advocate_monthly', 'advocate', 'monthly', 25.00),
  ('price_advocate_yearly', 'advocate', 'yearly', 240.00),
  ('price_builder_monthly', 'builder', 'monthly', 100.00),
  ('price_builder_yearly', 'builder', 'yearly', 960.00)
ON CONFLICT (stripe_price_id) DO NOTHING;


-- ==========================================
-- STEP 7: Seed sample draws (so dashboard shows real data)
-- ==========================================
INSERT INTO public.draws (month, title, prize, prize_value, min_score, sponsor, draw_date, status)
VALUES
  ('2026-06', 'Patagonia Eco-Retreat', '7-night luxury eco-retreat for 2', 24950, 50, 'Apex Corp Sustainability Fund', '2026-06-30', 'upcoming'),
  ('2026-07', 'Custom Electric Cruiser', 'Limited-edition electric bicycle', 3500, 120, 'GreenRide Initiative', '2026-07-31', 'upcoming'),
  ('2026-08', 'STEM Fellowship Retreat', '3-day tech innovation summit pass', 5000, 200, 'Empower Global Edu', '2026-08-31', 'upcoming')
ON CONFLICT DO NOTHING;


-- ==========================================
-- STEP 8: Seed sample charities
-- ==========================================
INSERT INTO public.charities (name, description, image_url, featured, category, impact, why_matters, auditor_score, spending_ratio, raised)
VALUES
  ('Acres of Green', 'Dedicated to restoring local woodland ecosystems, planting native broadleaf species, and protecting wildlife corridors from commercial fragmentation.', '/acres_of_green.png', true, 'Environment', '7,400+ hectares of ancient forests protected this quarter.', 'Healthy woodlands act as natural carbon sinks, buffer regional temperature rises, regulate hydrological cycles, and preserve native biodiversity crucial to the local biosphere.', '9.8', '96.4%', '$145,300'),
  ('Apex Water Initiative', 'Engineering and installing long-lasting gravity-fed clean water systems, piping, and localized sand filters for remote mountain settlements.', '/apex_water.png', false, 'Clean Water', 'Direct access filtration installed for 12,000 villagers.', 'Direct clean water access eliminates heavy waterborne pathogens, decreases child mortality rates, and enables girls to spend their days in schools instead of walking miles to carry river water.', '9.9', '98.1%', '$98,400'),
  ('Empower Global Edu', 'Onboarding and mentoring local educators to launch coding clubs, STEM circles, and advanced physics workshops for girls in developing rural centers.', '/empower_edu.png', false, 'Education', 'Coding and engineering fellowships for 340 women in STEM.', 'STEM education is the single most effective social mobility vehicle, giving girls in resource-constrained communities high-demand logical and coding skills to secure high-paying technical careers.', '9.7', '95.5%', '$112,000'),
  ('BioGen Health Corps', 'Equipping mobile clinical vans with state-of-the-art diagnostics and basic medical supplies to deliver pediatric checkups and vaccine clinics to low-income populations.', '/biogen_health.png', false, 'Healthcare', 'Mobile clinic deployments to 8 underserved regions.', 'Mobile clinic deployment provides preventative diagnostic healthcare to regions with zero medical facilities, catching severe illnesses early and preventing catastrophic emergency hospital debt.', '9.5', '94.2%', '$67,200')
ON CONFLICT DO NOTHING;


-- ==========================================
-- STEP 9: Backfill profiles & email preferences for existing auth users
-- ==========================================
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  'user'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.email_preferences (user_id, system_updates, draw_results, winner_alerts)
SELECT
  u.id,
  true,
  true,
  true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.email_preferences ep WHERE ep.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- Also create a winner_claims view for compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'winner_claims'
  ) THEN
    CREATE VIEW public.winner_claims AS SELECT * FROM public.winner_submissions;
  END IF;
END $$;
