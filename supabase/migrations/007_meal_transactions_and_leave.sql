-- ==============================================================================
-- 007_meal_transactions_and_leave.sql
-- V1.2: Continuous QR Meal Scanning & Transaction Recording Architecture
-- ==============================================================================

-- 1. Add is_on_leave column to students table if not present (Check 4 for eligibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'is_on_leave'
    ) THEN
        ALTER TABLE public.students ADD COLUMN is_on_leave BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 2. Create meal_transactions table for recording finalized meal attempts
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

-- Partial Unique Index: A student can have at most ONE APPROVED transaction for a specific meal_type on a specific meal_date
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_approved_meal_per_day
ON public.meal_transactions (student_id, meal_type, meal_date)
WHERE status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_meal_transactions_student_id ON public.meal_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_meal_transactions_mess_id ON public.meal_transactions(mess_id);
CREATE INDEX IF NOT EXISTS idx_meal_transactions_date_meal ON public.meal_transactions(meal_date, meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_transactions_status ON public.meal_transactions(status);

-- 3. Table Permissions for PostgREST API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.meal_transactions TO anon, authenticated, service_role;

-- 4. Row Level Security on meal_transactions
ALTER TABLE public.meal_transactions ENABLE ROW LEVEL SECURITY;

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
