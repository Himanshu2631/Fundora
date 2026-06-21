-- ==========================================
-- ADD INVOICE LINKS TO PAYMENTS TABLE
-- ==========================================

-- Add invoice link columns
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS invoice_pdf_url text,
  ADD COLUMN IF NOT EXISTS hosted_invoice_url text;
