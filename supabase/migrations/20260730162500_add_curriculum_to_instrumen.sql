ALTER TABLE public.instrumen_penilaian 
ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.curricula(id) ON DELETE CASCADE;
