-- ==============================================================================
-- 004_consolidate_student_id.sql
-- Consolidate student identity into single canonical Student ID & Update semester bounds
-- ==============================================================================

-- 1. Update students table: Replace university_id and registration_no with student_id
DO $$
BEGIN
    -- Check if student_id column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'student_id'
    ) THEN
        -- Add student_id column
        ALTER TABLE public.students ADD COLUMN student_id VARCHAR(50);
        
        -- Migrate data if university_id exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'university_id'
        ) THEN
            UPDATE public.students SET student_id = university_id WHERE student_id IS NULL;
        END IF;

        -- Make student_id NOT NULL and UNIQUE
        ALTER TABLE public.students ALTER COLUMN student_id SET NOT NULL;
        ALTER TABLE public.students ADD CONSTRAINT students_student_id_unique UNIQUE (student_id);
    END IF;

    -- Drop obsolete columns if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'university_id'
    ) THEN
        ALTER TABLE public.students DROP COLUMN university_id CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'registration_no'
    ) THEN
        ALTER TABLE public.students DROP COLUMN registration_no CASCADE;
    END IF;
END $$;

-- 2. Update semester check constraint to enforce Semester 1 or Semester 2 (within Year of Study)
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_semester_check;
ALTER TABLE public.students ADD CONSTRAINT students_semester_check CHECK (semester >= 1 AND semester <= 2);

-- 3. Update indexes
DROP INDEX IF EXISTS idx_students_university_id;
DROP INDEX IF EXISTS idx_students_registration_no;
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);

-- 4. Ensure public and authenticated read access to active messes for onboarding and registration
ALTER TABLE public.messes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to read messes" ON public.messes;
DROP POLICY IF EXISTS "Allow public read access to active messes" ON public.messes;
CREATE POLICY "Allow public read access to active messes"
ON public.messes FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 5. Ensure student-photos bucket exists in storage.buckets
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
