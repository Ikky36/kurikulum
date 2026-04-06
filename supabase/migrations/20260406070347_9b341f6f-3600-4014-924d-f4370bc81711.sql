
-- Create academic_years table
CREATE TABLE public.academic_years (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view academic_years" ON public.academic_years FOR SELECT USING (true);
CREATE POLICY "Admins can manage academic_years" ON public.academic_years FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON public.academic_years
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create semesters table
CREATE TABLE public.semesters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view semesters" ON public.semesters FOR SELECT USING (true);
CREATE POLICY "Admins can manage semesters" ON public.semesters FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON public.semesters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create curriculum_academic_years join table
CREATE TABLE public.curriculum_academic_years (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_id uuid NOT NULL REFERENCES public.curricula(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(curriculum_id, academic_year_id)
);

ALTER TABLE public.curriculum_academic_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view curriculum_academic_years" ON public.curriculum_academic_years FOR SELECT USING (true);
CREATE POLICY "Admins can manage curriculum_academic_years" ON public.curriculum_academic_years FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Add academic_year_id to elearning_classes
ALTER TABLE public.elearning_classes ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id);

-- Add academic_year_id to course_instructors
ALTER TABLE public.course_instructors ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id);
