-- ==============================================================================
-- 008_transaction_verification_method.sql
-- V1.3: Transaction Reliability & Verification Method Tracking (QR vs MANUAL)
-- ==============================================================================

-- 1. Add verification_method column to meal_transactions if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'meal_transactions' AND column_name = 'verification_method'
    ) THEN
        ALTER TABLE public.meal_transactions 
        ADD COLUMN verification_method VARCHAR(20) NOT NULL DEFAULT 'QR' 
        CHECK (verification_method IN ('QR', 'MANUAL'));
    END IF;
END $$;

-- 2. Index for filtering and auditing by verification method
CREATE INDEX IF NOT EXISTS idx_meal_transactions_verification_method 
ON public.meal_transactions(verification_method);
