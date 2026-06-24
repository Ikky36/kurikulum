-- Add assignment_code column to elearning_assignments
ALTER TABLE public.elearning_assignments 
ADD COLUMN IF NOT EXISTS assignment_code TEXT;

COMMENT ON COLUMN public.elearning_assignments.assignment_code IS 'Kode tugas singkat, digunakan untuk header tabel nilai';
