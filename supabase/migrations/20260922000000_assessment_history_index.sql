-- ==========================================
-- CAMPAIGN VIABILITY ASSESSMENT HISTORY & STATUS MIGRATION
-- Adds composite index for efficient multi-assessment chronological queries,
-- and supports assessment status and model_version fields.
-- ==========================================

-- 1. Add status column with check constraint (completed, failed, pending)
ALTER TABLE public.campaign_viability_assessments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
  CHECK (status IN ('completed', 'failed', 'pending'));

-- 2. Add model_version column
ALTER TABLE public.campaign_viability_assessments
  ADD COLUMN IF NOT EXISTS model_version text DEFAULT '1.0.0';

-- 3. Create composite index on campaign_id and created_at DESC for history queries
CREATE INDEX IF NOT EXISTS idx_campaign_viability_assessments_campaign_history
  ON public.campaign_viability_assessments (campaign_id, created_at DESC);

