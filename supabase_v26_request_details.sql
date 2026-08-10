-- v26: Add details column to coaching_requests for extended form data
ALTER TABLE public.coaching_requests ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::JSONB;

-- Update RLS if needed (usually existing policies cover updates/inserts to new columns if they are broad)
-- Existing policies: "Users insert requests" -> INSERT WITH CHECK (auth.uid() = user_id)
-- This covers all columns.

-- Optional: Add index on details if we query inside JSON (unlikely for now)
