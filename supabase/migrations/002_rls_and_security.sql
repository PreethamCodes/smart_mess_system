-- ==============================================================================
-- 002_rls_and_security.sql
-- Row Level Security (RLS) & Protection Policies
-- ==============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE public.messes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mess_credentials ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. MESSES POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can view active messes
CREATE POLICY "Allow authenticated users to read messes"
ON public.messes FOR SELECT
TO authenticated
USING (true);

-- Only Admins can modify messes
CREATE POLICY "Allow admins to insert messes"
ON public.messes FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Allow admins to update messes"
ON public.messes FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Allow admins to delete messes"
ON public.messes FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 2. USER ROLES POLICIES
-- ------------------------------------------------------------------------------
-- Users can view their own roles; Admins can view all roles
CREATE POLICY "Users can view own roles or admins view all"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Only Admins can insert/update/delete roles (prevents privilege escalation)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 3. STUDENTS POLICIES
-- ------------------------------------------------------------------------------
-- Students can read their own profile; Admins can read all profiles
CREATE POLICY "Students can view own profile or admins view all"
ON public.students FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Users can insert their own student record during first-login onboarding
CREATE POLICY "Users can insert own student profile"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Students can update their own profile; Admins can update any profile
CREATE POLICY "Students can update own profile or admins update all"
ON public.students FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()))
WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

-- Field protection trigger: Students cannot change assigned mess or account status once set
CREATE OR REPLACE FUNCTION public.protect_student_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If updater is not an admin, protect administrative fields
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

CREATE TRIGGER enforce_student_field_protection
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.protect_student_fields();

-- ------------------------------------------------------------------------------
-- 4. MESS CREDENTIALS POLICIES
-- ------------------------------------------------------------------------------
-- Students can read their own credentials; Admins can view all credentials
CREATE POLICY "Students can view own credentials or admins view all"
ON public.mess_credentials FOR SELECT
TO authenticated
USING (auth.uid() = student_id OR public.is_admin(auth.uid()));

-- Students can insert their own credential during generation
CREATE POLICY "Students can insert own credential"
ON public.mess_credentials FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id OR public.is_admin(auth.uid()));

-- Only Admins can update credential status (block/deactivate)
CREATE POLICY "Only admins can update credentials"
ON public.mess_credentials FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 5. STORAGE BUCKET: student-photos
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Authenticated users can upload to their own folder (auth.uid()/*)
CREATE POLICY "Users can upload their own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'student-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own photo or admins can view all photos
CREATE POLICY "Users can view their own photo or admins view all"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'student-photos' AND
    ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
);
