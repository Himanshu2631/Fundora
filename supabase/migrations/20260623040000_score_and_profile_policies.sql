-- ============================================================
-- SQL MIGRATION: ADD RLS POLICIES FOR SCORES & PROFILES
-- ============================================================

-- 1. Profiles: Allow users to self-insert their own profile record if missing
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Scores: Clean up and recreate all policies on public.scores
DROP POLICY IF EXISTS "Scores are viewable by authenticated users" ON public.scores;
DROP POLICY IF EXISTS "Users can manage their own scores" ON public.scores;
DROP POLICY IF EXISTS "Users can insert their own scores" ON public.scores;
DROP POLICY IF EXISTS "Users can update their own scores" ON public.scores;
DROP POLICY IF EXISTS "Users can delete their own scores" ON public.scores;
DROP POLICY IF EXISTS "Admins have full access on scores" ON public.scores;

-- Ensure RLS is active
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Allow authenticated users to view all scores (needed for leaderboards/dashboards)
CREATE POLICY "Scores are viewable by authenticated users"
  ON public.scores FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT policy: Allow authenticated users to insert only their own scores
CREATE POLICY "Users can insert their own scores"
  ON public.scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Allow authenticated users to update only their own scores
CREATE POLICY "Users can update their own scores"
  ON public.scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: Allow authenticated users to delete only their own scores
CREATE POLICY "Users can delete their own scores"
  ON public.scores FOR DELETE
  USING (auth.uid() = user_id);

-- Admin policy: Allow admins full access on scores
CREATE POLICY "Admins have full access on scores"
  ON public.scores FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
