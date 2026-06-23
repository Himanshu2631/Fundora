-- ============================================================
-- SQL MIGRATION: CREATE DRAW PARTICIPATION TABLE
-- ============================================================

-- Create Table: draw_participation
CREATE TABLE IF NOT EXISTS public.draw_participation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  draw_id uuid REFERENCES public.draws(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('participating', 'not_interested')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_draw_participation UNIQUE (user_id, draw_id)
);

-- Enable RLS
ALTER TABLE public.draw_participation ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own participation"
  ON public.draw_participation FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own participation"
  ON public.draw_participation FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins have full access on participation"
  ON public.draw_participation FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_draw_participation_user_id ON public.draw_participation(user_id);
CREATE INDEX IF NOT EXISTS idx_draw_participation_draw_id ON public.draw_participation(draw_id);
