-- Add SKS (credit hours) column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sks INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.courses.sks IS 'Satuan Kredit Semester (Credit Hours)';