-- Create junction table
CREATE TABLE public.instrumen_curricula (
  instrumen_id UUID NOT NULL REFERENCES public.instrumen_penilaian(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES public.curricula(id) ON DELETE CASCADE,
  PRIMARY KEY (instrumen_id, curriculum_id)
);

-- Enable RLS
ALTER TABLE public.instrumen_curricula ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Anyone can view instrumen_curricula"
ON public.instrumen_curricula FOR SELECT
TO authenticated
USING (true);

-- Allow admins/sub_admins to modify
CREATE POLICY "Admins can insert instrumen_curricula"
ON public.instrumen_curricula FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'sub_admin')));

CREATE POLICY "Admins can update instrumen_curricula"
ON public.instrumen_curricula FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'sub_admin')));

CREATE POLICY "Admins can delete instrumen_curricula"
ON public.instrumen_curricula FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'sub_admin')));

-- Migrate existing data
INSERT INTO public.instrumen_curricula (instrumen_id, curriculum_id)
SELECT id, curriculum_id FROM public.instrumen_penilaian WHERE curriculum_id IS NOT NULL;

-- Drop the old column
ALTER TABLE public.instrumen_penilaian DROP COLUMN curriculum_id;
