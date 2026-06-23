-- ============================================================
-- SQL MIGRATION: FIX DRAW CONSTRAINTS & PARTICIPATION RLS
-- ============================================================

-- 1. Drop unique constraint on draw_entries to allow multiple tickets per user
ALTER TABLE public.draw_entries DROP CONSTRAINT IF EXISTS unique_user_draw;

-- 2. Drop the old draws status check constraint and add a new one allowing active and completed
ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS draws_status_check;
ALTER TABLE public.draws ADD CONSTRAINT draws_status_check CHECK (status IN ('upcoming', 'active', 'drawn', 'completed', 'cancelled'));

-- 3. Add RLS Delete Policy for draw_entries to allow users to leave a draw
CREATE POLICY "Users can unregister themselves from a draw"
  ON public.draw_entries
  FOR DELETE
  USING (auth.uid() = user_id);
