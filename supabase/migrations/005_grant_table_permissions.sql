-- ==============================================================================
-- 005_grant_table_permissions.sql
-- Grant necessary PostgreSQL table permissions to anon, authenticated, and service_role
-- ==============================================================================
-- In PostgreSQL / Supabase, Row Level Security (RLS) policies only take effect
-- AFTER roles are granted table-level access. Without standard table GRANTs,
-- PostgreSQL returns 42501 (permission denied) before RLS policies are evaluated.
-- ==============================================================================

-- 1. Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant table and sequence privileges
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 4. Re-affirm RLS policies on public.messes
ALTER TABLE public.messes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to read messes" ON public.messes;
DROP POLICY IF EXISTS "Allow public read access to active messes" ON public.messes;
CREATE POLICY "Allow public read access to active messes"
ON public.messes FOR SELECT
TO anon, authenticated
USING (is_active = true);
