-- ==============================================================================
-- SMART MESS MANAGEMENT & AUTOMATION SYSTEM — COMPLETE DATABASE SETUP & SEED
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor to set up:
-- 1. Tables (messes, user_roles, hostel_mess_mapping, students, mess_credentials, meal_transactions)
-- 2. Grants for anon, authenticated, and service_role
-- 3. Row Level Security (RLS) policies
-- 4. Trigger functions for field protection
-- 5. Storage bucket for private student photos
-- 6. Initial seed for the 12 university messes and 24 hostel mappings
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. MESSES TABLE (Mess 1 through Mess 12)
CREATE TABLE IF NOT EXISTS public.messes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Helper function to check if current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = check_user_id AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. HOSTEL MESS MAPPING TABLE (Authoritative university hostel -> mess mapping)
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

-- 4. STUDENTS TABLE (Consolidated canonical Student ID, Gender, Year 1-5, Semester 1-2, Leave status)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
    photo_url TEXT,
    hostel VARCHAR(100) NOT NULL,
    course VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 5),
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 2),
    assigned_mess_id UUID NOT NULL REFERENCES public.messes(id) ON UPDATE CASCADE,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    is_on_leave BOOLEAN NOT NULL DEFAULT false,
    is_profile_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_assigned_mess ON public.students(assigned_mess_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_gender ON public.students(gender);

-- 5. MESS CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS public.mess_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    credential_type VARCHAR(20) NOT NULL DEFAULT 'QR' CHECK (credential_type IN ('QR', 'NFC')),
    qr_token VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'DEACTIVATED')),
    block_reason TEXT,
    blocked_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial UNIQUE index: Ensures at most ONE ACTIVE credential per student
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_credential_per_student 
ON public.mess_credentials (student_id) 
WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_mess_credentials_qr_token ON public.mess_credentials(qr_token);
CREATE INDEX IF NOT EXISTS idx_mess_credentials_student_id ON public.mess_credentials(student_id);
CREATE INDEX IF NOT EXISTS idx_mess_credentials_status ON public.mess_credentials(status);

-- 6. MEAL TRANSACTIONS TABLE (V1.2 Finalized Meal Approvals & Rejections)
CREATE TABLE IF NOT EXISTS public.meal_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE RESTRICT,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER')),
    meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('APPROVED', 'REJECTED')),
    rejection_reason VARCHAR(100),
    scanned_by UUID REFERENCES auth.users(id),
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial Unique Index: Prevents duplicate approved meals on the same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_approved_meal_per_day
ON public.meal_transactions (student_id, meal_type, meal_date)
WHERE status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_meal_transactions_student_id ON public.meal_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_meal_transactions_mess_id ON public.meal_transactions(mess_id);
CREATE INDEX IF NOT EXISTS idx_meal_transactions_date_meal ON public.meal_transactions(meal_date, meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_transactions_status ON public.meal_transactions(status);

-- 7. UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_messes_updated_at ON public.messes;
CREATE TRIGGER set_messes_updated_at
BEFORE UPDATE ON public.messes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_hostel_mess_mapping_updated_at ON public.hostel_mess_mapping;
CREATE TRIGGER set_hostel_mess_mapping_updated_at
BEFORE UPDATE ON public.hostel_mess_mapping
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_students_updated_at ON public.students;
CREATE TRIGGER set_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_mess_credentials_updated_at ON public.mess_credentials;
CREATE TRIGGER set_mess_credentials_updated_at
BEFORE UPDATE ON public.mess_credentials
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. GRANT TABLE PRIVILEGES TO SUPABASE API ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 9. ROW LEVEL SECURITY
ALTER TABLE public.messes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_mess_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mess_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_transactions ENABLE ROW LEVEL SECURITY;

-- Messes RLS: Allow public/authenticated to read active messes
DROP POLICY IF EXISTS "Allow authenticated users to read messes" ON public.messes;
DROP POLICY IF EXISTS "Allow public read access to active messes" ON public.messes;
CREATE POLICY "Allow public read access to active messes"
ON public.messes FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Allow admins to modify messes" ON public.messes;
CREATE POLICY "Allow admins to modify messes"
ON public.messes FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Hostel Mess Mapping RLS
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

-- User Roles RLS
DROP POLICY IF EXISTS "Users can view own roles or admins view all" ON public.user_roles;
CREATE POLICY "Users can view own roles or admins view all"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can modify roles" ON public.user_roles;
CREATE POLICY "Only admins can modify roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Students RLS
DROP POLICY IF EXISTS "Students can view own profile or admins view all" ON public.students;
CREATE POLICY "Students can view own profile or admins view all"
ON public.students FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own student profile" ON public.students;
CREATE POLICY "Users can insert own student profile"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Students can update own profile or admins update all" ON public.students;
CREATE POLICY "Students can update own profile or admins update all"
ON public.students FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()))
WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

-- Protect assigned mess & account status
CREATE OR REPLACE FUNCTION public.protect_student_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        IF OLD.is_profile_completed = true AND NEW.assigned_mess_id <> OLD.assigned_mess_id THEN
            RAISE EXCEPTION 'Students cannot modify their assigned mess. Contact an administrator.';
        END IF;
        IF OLD.account_status <> NEW.account_status THEN
            RAISE EXCEPTION 'Students cannot modify their account status.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_student_field_protection ON public.students;
CREATE TRIGGER enforce_student_field_protection
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.protect_student_fields();

-- Mess Credentials RLS
DROP POLICY IF EXISTS "Students can view own credentials or admins view all" ON public.mess_credentials;
CREATE POLICY "Students can view own credentials or admins view all"
ON public.mess_credentials FOR SELECT
TO authenticated
USING (auth.uid() = student_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Students can insert own credential" ON public.mess_credentials;
CREATE POLICY "Students can insert own credential"
ON public.mess_credentials FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can update credentials" ON public.mess_credentials;
CREATE POLICY "Only admins can update credentials"
ON public.mess_credentials FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Meal Transactions RLS
DROP POLICY IF EXISTS "Students can view own meal transactions" ON public.meal_transactions;
CREATE POLICY "Students can view own meal transactions"
ON public.meal_transactions FOR SELECT
TO authenticated
USING (auth.uid() = student_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert and manage meal transactions" ON public.meal_transactions;
CREATE POLICY "Admins can insert and manage meal transactions"
ON public.meal_transactions FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 10. STORAGE BUCKET: student-photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own photo" ON storage.objects;
CREATE POLICY "Users can upload their own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'student-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view their own photo or admins view all" ON storage.objects;
CREATE POLICY "Users can view their own photo or admins view all"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'student-photos' AND
    ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
);

-- 11. SEED THE 12 INITIAL MESSES (Mess 1 through Mess 12)
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
SET is_active = EXCLUDED.is_active,
    updated_at = now();

-- 12. SEED THE 24 HOSTEL -> MESS MAPPINGS
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
