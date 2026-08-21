-- ==============================================================================
-- SMART MESS MANAGEMENT & AUTOMATION SYSTEM — COMPLETE DATABASE SETUP & SEED
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor to set up:
-- 1. Tables (messes, user_roles, students, mess_credentials)
-- 2. Row Level Security (RLS) policies
-- 3. Trigger functions for field protection
-- 4. Storage bucket for private student photos
-- 5. Initial seed for the 10 university messes
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. MESSES TABLE
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

-- 3. STUDENTS TABLE (Consolidated canonical Student ID, Year 1-5, Semester 1-2)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    photo_url TEXT,
    hostel VARCHAR(100) NOT NULL,
    course VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 5),
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 2),
    assigned_mess_id UUID NOT NULL REFERENCES public.messes(id) ON UPDATE CASCADE,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    is_profile_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_assigned_mess ON public.students(assigned_mess_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);

-- 4. MESS CREDENTIALS TABLE
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

-- 5. UPDATED_AT TRIGGERS
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

DROP TRIGGER IF EXISTS set_students_updated_at ON public.students;
CREATE TRIGGER set_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_mess_credentials_updated_at ON public.mess_credentials;
CREATE TRIGGER set_mess_credentials_updated_at
BEFORE UPDATE ON public.mess_credentials
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. ROW LEVEL SECURITY
ALTER TABLE public.messes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mess_credentials ENABLE ROW LEVEL SECURITY;

-- Messes RLS: Allow public/authenticated to read active messes
DROP POLICY IF EXISTS "Allow authenticated users to read messes" ON public.messes;
DROP POLICY IF EXISTS "Allow public read access to active messes" ON public.messes;
CREATE POLICY "Allow public read access to active messes"
ON public.messes FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Allow admins to insert messes" ON public.messes;
CREATE POLICY "Allow admins to insert messes"
ON public.messes FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to update messes" ON public.messes;
CREATE POLICY "Allow admins to update messes"
ON public.messes FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to delete messes" ON public.messes;
CREATE POLICY "Allow admins to delete messes"
ON public.messes FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- User Roles RLS
DROP POLICY IF EXISTS "Users can view own roles or admins view all" ON public.user_roles;
CREATE POLICY "Users can view own roles or admins view all"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

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

-- 7. STORAGE BUCKET: student-photos
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

-- 8. SEED THE 10 INITIAL MESSES
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
