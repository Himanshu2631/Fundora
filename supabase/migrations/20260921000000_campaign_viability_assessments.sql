-- ============================================================
-- SQL MIGRATION: CREATE CAMPAIGN VIABILITY ASSESSMENTS TABLE
-- Stores Explainable AI viability predictions from FastAPI ML service
-- ============================================================

-- 1. Create Table: campaign_viability_assessments
CREATE TABLE IF NOT EXISTS public.campaign_viability_assessments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.charities(id) ON DELETE CASCADE NOT NULL,
  risk_probability numeric(5, 4) NOT NULL CHECK (risk_probability >= 0.0 AND risk_probability <= 1.0),
  viability_score integer NOT NULL CHECK (viability_score >= 0 AND viability_score <= 100),
  risk_level text NOT NULL CHECK (risk_level IN ('LOW RISK', 'MEDIUM RISK', 'HIGH RISK')),
  prediction_horizon_hours integer NOT NULL DEFAULT 48,
  model_name text NOT NULL DEFAULT 'Random Forest Champion',
  model_type text DEFAULT 'RandomForestClassifier',
  n_features integer NOT NULL DEFAULT 56,
  calibration text NOT NULL DEFAULT 'Platt Scaling (Sigmoid)',
  base_rate_risk numeric(5, 4) NOT NULL DEFAULT 0.4996,
  top_risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_supporting_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  detailed_risk_factors jsonb DEFAULT '[]'::jsonb,
  detailed_supporting_factors jsonb DEFAULT '[]'::jsonb,
  research_disclaimer text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row-Level Security
ALTER TABLE public.campaign_viability_assessments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Assessments are readable by all users (matching public charity visibility)
CREATE POLICY "Assessments are viewable by everyone"
  ON public.campaign_viability_assessments FOR SELECT USING (true);

-- Only Admins and service-role (server-side trusted processes) have full management rights
CREATE POLICY "Admins have full access on assessments"
  ON public.campaign_viability_assessments FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_viability_assessments_campaign_id
  ON public.campaign_viability_assessments(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_viability_assessments_created_at
  ON public.campaign_viability_assessments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_viability_assessments_risk_level
  ON public.campaign_viability_assessments(risk_level);

-- 5. Auto-updated_at Trigger
CREATE TRIGGER update_campaign_viability_assessments_updated_at
  BEFORE UPDATE ON public.campaign_viability_assessments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
