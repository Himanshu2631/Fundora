-- ============================================================
-- ADD NOTIFICATIONS, EMAIL PREFERENCES AND TIMESTAMPS
-- ============================================================

-- 1. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add updated_at to existing tables and attach triggers
-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- scores
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_scores_updated_at ON public.scores;
CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- charities
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_charities_updated_at ON public.charities;
CREATE TRIGGER update_charities_updated_at
  BEFORE UPDATE ON public.charities
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- user_charity_selections
ALTER TABLE public.user_charity_selections ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_user_charity_selections_updated_at ON public.user_charity_selections;
CREATE TRIGGER update_user_charity_selections_updated_at
  BEFORE UPDATE ON public.user_charity_selections
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- draws
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_draws_updated_at ON public.draws;
CREATE TRIGGER update_draws_updated_at
  BEFORE UPDATE ON public.draws
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- draw_entries
ALTER TABLE public.draw_entries ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_draw_entries_updated_at ON public.draw_entries;
CREATE TRIGGER update_draw_entries_updated_at
  BEFORE UPDATE ON public.draw_entries
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- winner_submissions
ALTER TABLE public.winner_submissions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_winner_submissions_updated_at ON public.winner_submissions;
CREATE TRIGGER update_winner_submissions_updated_at
  BEFORE UPDATE ON public.winner_submissions
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- 3. Create Table: notifications
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

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access on notifications"
  ON public.notifications FOR ALL USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Trigger for notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- 4. Create Table: email_preferences
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  system_updates boolean DEFAULT true NOT NULL,
  draw_results boolean DEFAULT true NOT NULL,
  winner_alerts boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for email_preferences
CREATE POLICY "Users can view their own email preferences"
  ON public.email_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own email preferences"
  ON public.email_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins have full access on email preferences"
  ON public.email_preferences FOR ALL USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON public.email_preferences(user_id);

-- Trigger for email_preferences
DROP TRIGGER IF EXISTS update_email_preferences_updated_at ON public.email_preferences;
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
