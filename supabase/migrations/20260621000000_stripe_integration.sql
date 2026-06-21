-- ==========================================
-- STRIPE INTEGRATION DATABASE SCHEMA
-- ==========================================

-- 1. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_price_id text NOT NULL UNIQUE,
  plan_name text NOT NULL CHECK (plan_name IN ('scout', 'advocate', 'builder')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Select Policy
CREATE POLICY "Subscription plans are viewable by authenticated users" 
  ON public.subscription_plans FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Subscription plans are viewable by everyone" 
  ON public.subscription_plans FOR SELECT USING (true);

-- Insert Default Plan Seeds
INSERT INTO public.subscription_plans (stripe_price_id, plan_name, billing_cycle, amount)
VALUES
  ('price_scout_monthly', 'scout', 'monthly', 10.00),
  ('price_scout_yearly', 'scout', 'yearly', 96.00),
  ('price_advocate_monthly', 'advocate', 'monthly', 25.00),
  ('price_advocate_yearly', 'advocate', 'yearly', 240.00),
  ('price_builder_monthly', 'builder', 'monthly', 100.00),
  ('price_builder_yearly', 'builder', 'yearly', 960.00)
ON CONFLICT (stripe_price_id) DO NOTHING;

-- 2. Add Stripe Customer column to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- 3. Add Stripe Columns to subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text REFERENCES public.subscription_plans(stripe_price_id) ON DELETE SET NULL;

-- 4. Re-define subscriptions status check constraint
-- Drop any check constraints on the status column first
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.subscriptions'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.subscriptions DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Add updated check constraint to include all Stripe states
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'));
