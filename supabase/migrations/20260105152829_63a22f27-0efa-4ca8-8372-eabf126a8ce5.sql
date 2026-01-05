-- Add pertemuan column to assessments table
ALTER TABLE public.assessments
ADD COLUMN pertemuan text NULL;

-- Create table for assessment instrument (grading scale)
CREATE TABLE public.instrumen_penilaian (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rentang_min integer NOT NULL,
  rentang_max integer NOT NULL,
  predikat text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rentang_valid CHECK (rentang_max >= rentang_min)
);

-- Enable RLS
ALTER TABLE public.instrumen_penilaian ENABLE ROW LEVEL SECURITY;

-- Anyone can view instrumen_penilaian
CREATE POLICY "Anyone can view instrumen_penilaian"
ON public.instrumen_penilaian
FOR SELECT
USING (true);

-- Only admins can manage instrumen_penilaian
CREATE POLICY "Admins can manage instrumen_penilaian"
ON public.instrumen_penilaian
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Create trigger for updated_at
CREATE TRIGGER update_instrumen_penilaian_updated_at
BEFORE UPDATE ON public.instrumen_penilaian
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();