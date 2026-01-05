-- Add color column to instrumen_penilaian table
ALTER TABLE public.instrumen_penilaian
ADD COLUMN color text DEFAULT NULL;