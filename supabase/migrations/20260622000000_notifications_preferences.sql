-- ==========================================
-- ADD NOTIFICATION PREFERENCES TO PROFILES
-- ==========================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pref_system_updates boolean NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_draw_results boolean NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_winner_alerts boolean NOT NULL DEFAULT TRUE;
