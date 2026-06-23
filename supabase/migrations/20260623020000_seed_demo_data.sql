-- ============================================================
-- SEED DATA FOR DRAWS AND CHARITIES
-- ============================================================

-- Seed sample draws (so dashboard shows real data)
INSERT INTO public.draws (month, title, prize, prize_value, min_score, sponsor, draw_date, status)
VALUES
  ('2026-06', 'Patagonia Eco-Retreat', '7-night luxury eco-retreat for 2', 24950, 50, 'Apex Corp Sustainability Fund', '2026-06-30', 'upcoming'),
  ('2026-07', 'Custom Electric Cruiser', 'Limited-edition electric bicycle', 3500, 120, 'GreenRide Initiative', '2026-07-31', 'upcoming'),
  ('2026-08', 'STEM Fellowship Retreat', '3-day tech innovation summit pass', 5000, 200, 'Empower Global Edu', '2026-08-31', 'upcoming')
ON CONFLICT DO NOTHING;

-- Seed sample charities
INSERT INTO public.charities (name, description, image_url, featured, category, impact, why_matters, auditor_score, spending_ratio, raised)
VALUES
  ('Acres of Green', 'Dedicated to restoring local woodland ecosystems, planting native broadleaf species, and protecting wildlife corridors from commercial fragmentation.', '/acres_of_green.png', true, 'Environment', '7,400+ hectares of ancient forests protected this quarter.', 'Healthy woodlands act as natural carbon sinks, buffer regional temperature rises, regulate hydrological cycles, and preserve native biodiversity crucial to the local biosphere.', '9.8', '96.4%', '$145,300'),
  ('Apex Water Initiative', 'Engineering and installing long-lasting gravity-fed clean water systems, piping, and localized sand filters for remote mountain settlements.', '/apex_water.png', false, 'Clean Water', 'Direct access filtration installed for 12,000 villagers.', 'Direct clean water access eliminates heavy waterborne pathogens, decreases child mortality rates, and enables girls to spend their days in schools instead of walking miles to carry river water.', '9.9', '98.1%', '$98,400'),
  ('Empower Global Edu', 'Onboarding and mentoring local educators to launch coding clubs, STEM circles, and advanced physics workshops for girls in developing rural centers.', '/empower_edu.png', false, 'Education', 'Coding and engineering fellowships for 340 women in STEM.', 'STEM education is the single most effective social mobility vehicle, giving girls in resource-constrained communities high-demand logical and coding skills to secure high-paying technical careers.', '9.7', '95.5%', '$112,000'),
  ('BioGen Health Corps', 'Equipping mobile clinical vans with state-of-the-art diagnostics and basic medical supplies to deliver pediatric checkups and vaccine clinics to low-income populations.', '/biogen_health.png', false, 'Healthcare', 'Mobile clinic deployments to 8 underserved regions.', 'Mobile clinic deployment provides preventative diagnostic healthcare to regions with zero medical facilities, catching severe illnesses early and preventing catastrophic emergency hospital debt.', '9.5', '94.2%', '$67,200')
ON CONFLICT DO NOTHING;
