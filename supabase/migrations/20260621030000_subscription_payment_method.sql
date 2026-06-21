-- ==========================================
-- ADD CARD DETAILS TO SUBSCRIPTIONS
-- ==========================================

ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS card_brand text,
  ADD COLUMN IF NOT EXISTS card_last4 text;
