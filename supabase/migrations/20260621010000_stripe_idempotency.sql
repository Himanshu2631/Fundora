-- ==========================================
-- STRIPE IDEMPOTENCY & PAYMENT MIGRATION
-- ==========================================

-- 1. Add stripe_invoice_id column to payments
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text UNIQUE;

-- 2. Create index on stripe_invoice_id
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id 
  ON public.payments(stripe_invoice_id);
