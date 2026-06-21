-- ==========================================
-- ADD STRIPE SYNC FIELDS TO SUBSCRIPTIONS
-- ==========================================

ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS customer_id text;

-- Create indexes for the new columns to support efficient queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_name 
  ON public.subscriptions(plan_name);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id 
  ON public.subscriptions(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id 
  ON public.subscriptions(customer_id);
