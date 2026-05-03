ALTER TABLE public.bahan_kajian_kelompok 
  ADD COLUMN IF NOT EXISTS courses_data jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.bahan_kajian_kelompok 
  ALTER COLUMN bahan_kajian DROP NOT NULL;