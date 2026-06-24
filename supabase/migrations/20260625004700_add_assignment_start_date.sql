-- Add start_date column to elearning_assignments to support countdown/start time feature
ALTER TABLE public.elearning_assignments 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.elearning_assignments.start_date IS 'Waktu mulai tugas/kuis bisa dikerjakan (null = bisa dikerjakan kapan saja setelah dipublikasikan)';
