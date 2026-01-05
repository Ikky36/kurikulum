-- Add teknik (Teknik Penilaian) column to assessments table
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS teknik TEXT[] DEFAULT '{}';

-- Add indikator column to assessments (stores selected indikator from linked LLOs)
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS indikator TEXT[] DEFAULT '{}';