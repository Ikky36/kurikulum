-- Add passing_score column to curriculum_academic_years
ALTER TABLE public.curriculum_academic_years
ADD COLUMN IF NOT EXISTS passing_score INTEGER NOT NULL DEFAULT 60;
