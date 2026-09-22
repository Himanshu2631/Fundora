-- ==========================================
-- CAMPAIGN VIABILITY ASSESSMENT IDEMPOTENCY MIGRATION
-- Ensures exactly one initial 48-hour assessment per campaign
-- while allowing future reassessments
-- ==========================================

-- 1. Add assessment_type column with default 'initial_48h'
ALTER TABLE public.campaign_viability_assessments
  ADD COLUMN IF NOT EXISTS assessment_type text NOT NULL DEFAULT 'initial_48h'
  CHECK (assessment_type IN ('initial_48h', 'reassessment', 'manual'));

-- 2. Create unique partial index for initial_48h milestone
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_campaign_initial_48h_assessment
  ON public.campaign_viability_assessments (campaign_id)
  WHERE (assessment_type = 'initial_48h');

-- 3. Create index on assessment_type
CREATE INDEX IF NOT EXISTS idx_campaign_viability_assessments_type
  ON public.campaign_viability_assessments (assessment_type);
