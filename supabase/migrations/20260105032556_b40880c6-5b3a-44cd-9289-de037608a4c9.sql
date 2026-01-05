-- Create junction table for many-to-many relationship between plos and profil_lulusan
CREATE TABLE public.plo_profil_lulusan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plo_id UUID NOT NULL REFERENCES public.plos(id) ON DELETE CASCADE,
  profil_lulusan_id UUID NOT NULL REFERENCES public.profil_lulusan(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plo_id, profil_lulusan_id)
);

-- Migrate existing data from plos.profil_lulusan_id to the new junction table
INSERT INTO public.plo_profil_lulusan (plo_id, profil_lulusan_id)
SELECT id, profil_lulusan_id FROM public.plos WHERE profil_lulusan_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.plo_profil_lulusan ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view plo_profil_lulusan"
ON public.plo_profil_lulusan FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert plo_profil_lulusan"
ON public.plo_profil_lulusan FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update plo_profil_lulusan"
ON public.plo_profil_lulusan FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete plo_profil_lulusan"
ON public.plo_profil_lulusan FOR DELETE USING (auth.role() = 'authenticated');