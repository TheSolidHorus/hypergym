-- v28: Fix workout_plans table structure
-- Adds 'days' and 'duration_weeks' columns if they are missing.
-- This fixes the error: "Could not find the 'days' column of 'workout_plans' in the schema cache."

ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS days TEXT;
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS duration_weeks INT DEFAULT 4;
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS description TEXT;
