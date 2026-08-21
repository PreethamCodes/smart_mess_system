-- ==============================================================================
-- 006_hostel_mess_mapping.sql
-- Automatic Hostel -> Mess Assignment Architecture & 12 Mess Support
-- ==============================================================================

-- 1. Ensure Mess 1 through Mess 12 exist and are active
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
    ('Mess 10', true),
    ('Mess 11', true),
    ('Mess 12', true)
ON CONFLICT (name) DO UPDATE 
SET is_active = true,
    updated_at = now();

-- 2. Add gender column to students table if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'gender'
    ) THEN
        ALTER TABLE public.students ADD COLUMN gender VARCHAR(10) CHECK (gender IN ('Male', 'Female'));
    END IF;
END $$;

-- 3. Create authoritative hostel_mess_mapping table
CREATE TABLE IF NOT EXISTS public.hostel_mess_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_name VARCHAR(50) NOT NULL UNIQUE,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
    mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hostel_mess_mapping_hostel_name ON public.hostel_mess_mapping(hostel_name);
CREATE INDEX IF NOT EXISTS idx_hostel_mess_mapping_gender ON public.hostel_mess_mapping(gender);
CREATE INDEX IF NOT EXISTS idx_hostel_mess_mapping_mess_id ON public.hostel_mess_mapping(mess_id);

-- 4. Trigger for updated_at
DROP TRIGGER IF EXISTS set_hostel_mess_mapping_updated_at ON public.hostel_mess_mapping;
CREATE TRIGGER set_hostel_mess_mapping_updated_at
BEFORE UPDATE ON public.hostel_mess_mapping
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Seed the Authoritative 24 Hostel -> Mess Mappings (2 hostels per mess)
-- Male Hostels (MH - A through MH - M -> Mess 1 through Mess 7)
INSERT INTO public.hostel_mess_mapping (hostel_name, gender, mess_id)
VALUES
    ('MH - A', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 1')),
    ('MH - B', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 1')),
    ('MH - C', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 2')),
    ('MH - D', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 2')),
    ('MH - E(ANN)', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 3')),
    ('MH - E(NRS)', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 3')),
    ('MH - F', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 4')),
    ('MH - G', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 4')),
    ('MH - H', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 5')),
    ('MH - I', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 5')),
    ('MH - J', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 6')),
    ('MH - K', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 6')),
    ('MH - L', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 7')),
    ('MH - M', 'Male', (SELECT id FROM public.messes WHERE name = 'Mess 7')),

-- Female Hostels (LH - 1 through LH - 10 -> Mess 8 through Mess 12)
    ('LH - 1', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 8')),
    ('LH - 2', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 8')),
    ('LH - 3', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 9')),
    ('LH - 4', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 9')),
    ('LH - 5', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 10')),
    ('LH - 6', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 10')),
    ('LH - 7', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 11')),
    ('LH - 8', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 11')),
    ('LH - 9', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 12')),
    ('LH - 10', 'Female', (SELECT id FROM public.messes WHERE name = 'Mess 12'))
ON CONFLICT (hostel_name) DO UPDATE
SET mess_id = EXCLUDED.mess_id,
    gender = EXCLUDED.gender,
    updated_at = now();

-- 6. Table permissions for PostgREST roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.hostel_mess_mapping TO anon, authenticated, service_role;
GRANT ALL ON public.messes TO anon, authenticated, service_role;
GRANT ALL ON public.students TO anon, authenticated, service_role;

-- 7. Row Level Security on hostel_mess_mapping
ALTER TABLE public.hostel_mess_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to hostel mess mapping" ON public.hostel_mess_mapping;
CREATE POLICY "Allow public read access to hostel mess mapping"
ON public.hostel_mess_mapping FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admins to modify hostel mess mapping" ON public.hostel_mess_mapping;
CREATE POLICY "Allow admins to modify hostel mess mapping"
ON public.hostel_mess_mapping FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
