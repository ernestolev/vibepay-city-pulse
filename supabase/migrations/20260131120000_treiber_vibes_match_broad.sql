-- Path simulator: proximity uses vibes_match ∩ Mia's context; widen demo bakery so common vibe/time presets still match.
update public.merchants
set vibes_match = array['morning', 'cold', 'evening', 'night', 'sunny', 'rainy', 'event']::text[]
where id = 'baeckerei-treiber';
