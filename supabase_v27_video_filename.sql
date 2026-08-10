-- v27: Add filename column to exercise_videos table
-- This is required for the video upload feature to work correctly (managing deletions).

ALTER TABLE public.exercise_videos ADD COLUMN IF NOT EXISTS filename TEXT;
