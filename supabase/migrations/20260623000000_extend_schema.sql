-- ==========================================
-- EXTEND SCHEMA FOR FULL FEATURE SUPPORT
-- ==========================================

-- 1. Extend draws table with missing columns
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS prize text,
  ADD COLUMN IF NOT EXISTS prize_value numeric(12, 2),
  ADD COLUMN IF NOT EXISTS min_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sponsor text DEFAULT 'Fundora Foundation',
  ADD COLUMN IF NOT EXISTS draw_date date,
  ADD COLUMN IF NOT EXISTS generated_numbers integer[],
  ADD COLUMN IF NOT EXISTS generated_timestamp timestamp with time zone,
  ADD COLUMN IF NOT EXISTS draw_month integer;

-- Backfill draw_date from month string where possible
UPDATE public.draws
  SET draw_date = (month || '-01')::date
  WHERE draw_date IS NULL AND month IS NOT NULL AND month ~ '^\d{4}-\d{2}$';

-- Backfill draw_month from month string
UPDATE public.draws
  SET draw_month = CAST(split_part(month, '-', 2) AS integer)
  WHERE draw_month IS NULL AND month IS NOT NULL AND month ~ '^\d{4}-\d{2}$';

-- 2. Extend charities table with missing columns
ALTER TABLE public.charities
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS impact text DEFAULT '',
  ADD COLUMN IF NOT EXISTS why_matters text DEFAULT '',
  ADD COLUMN IF NOT EXISTS auditor_score text DEFAULT '',
  ADD COLUMN IF NOT EXISTS spending_ratio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS raised text DEFAULT '$0';

-- 3. Create user_charity_selections table if not exists
CREATE TABLE IF NOT EXISTS public.user_charity_selections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  charity_id uuid REFERENCES public.charities(id) ON DELETE CASCADE NOT NULL,
  contribution_percentage integer NOT NULL DEFAULT 10 CHECK (contribution_percentage >= 10 AND contribution_percentage <= 100),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_charity UNIQUE (user_id, charity_id)
);

-- Enable RLS for user_charity_selections
ALTER TABLE public.user_charity_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own charity selections"
  ON public.user_charity_selections FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own charity selections"
  ON public.user_charity_selections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins have full access on charity selections"
  ON public.user_charity_selections FOR ALL USING (public.is_admin(auth.uid()));

-- Indexes for user_charity_selections
CREATE INDEX IF NOT EXISTS idx_user_charity_selections_user_id ON public.user_charity_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_charity_selections_charity_id ON public.user_charity_selections(charity_id);

-- 4. Add winner_claims as alias for winner_submissions (backward compat)
--    We keep winner_submissions as the real table and rename it.
--    First check if winner_claims already exists as a table or view.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'winner_claims'
  ) THEN
    -- Create winner_claims as alias view if winner_submissions exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'winner_submissions'
    ) THEN
      EXECUTE 'CREATE VIEW public.winner_claims AS SELECT * FROM public.winner_submissions';
    END IF;
  END IF;
END $$;

-- 5. Extend winner_submissions with extra tracking columns used in code
ALTER TABLE public.winner_submissions
  ADD COLUMN IF NOT EXISTS entry_id uuid REFERENCES public.draw_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS match_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prize_category text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS prize text,
  ADD COLUMN IF NOT EXISTS draw_title text;

-- 6. Extend draw_entries with tracking columns
ALTER TABLE public.draw_entries
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS numbers integer[];

-- 7. Add indexes
CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_draw_date ON public.draws(draw_date);

-- 8. Extend payments with stripe_price_id
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS amount_cents integer;
