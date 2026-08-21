-- ==============================================================================
-- 001_initial_schema.sql
-- Smart Mess Management & Automation System - Phase 1 Schema
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. MESSES TABLE
-- Supports the 10 initial messes and future multi-mess growth
CREATE TABLE IF NOT EXISTS public.messes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USER ROLES TABLE
-- Phase 1 supports: STUDENT, ADMIN
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Index for fast role lookups
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

-- 3. STUDENTS TABLE
-- Mandatory student identity records
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    university_id VARCHAR(50) NOT NULL UNIQUE,
    registration_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    photo_url TEXT,
    hostel VARCHAR(100) NOT NULL,
    course VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 5),
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 10),
    assigned_mess_id UUID NOT NULL REFERENCES public.messes(id) ON UPDATE CASCADE,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    is_profile_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for student lookups
CREATE INDEX IF NOT EXISTS idx_students_university_id ON public.students(university_id);
CREATE INDEX IF NOT EXISTS idx_students_registration_no ON public.students(registration_no);
CREATE INDEX IF NOT EXISTS idx_students_assigned_mess ON public.students(assigned_mess_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);

-- 4. MESS CREDENTIALS TABLE (Mess Card / QR Token)
-- Extensible for QR and future NFC
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

-- 5. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_messes_updated_at
BEFORE UPDATE ON public.messes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_mess_credentials_updated_at
BEFORE UPDATE ON public.mess_credentials
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
