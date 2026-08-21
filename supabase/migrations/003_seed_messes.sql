-- ==============================================================================
-- 003_seed_messes.sql
-- Seed the 10 initial university messes (Mess 1 to Mess 10)
-- ==============================================================================

INSERT INTO public.messes (name, is_active)
VALUES
    ('Mess 1', true),
    ('Mess 2', true),
    ('Mess 3', true),
    ('Mess 4', true),
    ('Mess 5', true),
    ('Mess 6', true),
    ('Mess 7', true),
    ('Mess 8', true),
    ('Mess 9', true),
    ('Mess 10', true)
ON CONFLICT (name) DO UPDATE 
SET is_active = EXCLUDED.is_active,
    updated_at = now();
