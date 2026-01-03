-- Create PLO (Program Learning Outcomes / CPL) table
CREATE TABLE public.plos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course_plos junction table (many-to-many between courses and PLOs)
CREATE TABLE public.course_plos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  plo_id UUID NOT NULL REFERENCES public.plos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, plo_id)
);

-- Create CLO (Course Learning Outcomes / CPMK) table
CREATE TABLE public.clos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, code)
);

-- Create LLO (Lesson Learning Outcomes / SUB-CPMK) table
CREATE TABLE public.llos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clo_id UUID NOT NULL REFERENCES public.clos(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  weight_percentage DECIMAL(5,2) NOT NULL CHECK (weight_percentage > 0 AND weight_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessments (Tugas/Quiz) table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, code)
);

-- Create assessment_llos junction table (many-to-many between assessments and LLOs)
CREATE TABLE public.assessment_llos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  llo_id UUID NOT NULL REFERENCES public.llos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, llo_id)
);

-- Enable RLS on all tables
ALTER TABLE public.plos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_plos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_llos ENABLE ROW LEVEL SECURITY;

-- PLOs policies
CREATE POLICY "Anyone can view PLOs" ON public.plos FOR SELECT USING (true);
CREATE POLICY "Admins can manage PLOs" ON public.plos FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Course PLOs policies
CREATE POLICY "Anyone can view course PLOs" ON public.course_plos FOR SELECT USING (true);
CREATE POLICY "Admins can manage course PLOs" ON public.course_plos FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- CLOs policies
CREATE POLICY "Anyone can view CLOs" ON public.clos FOR SELECT USING (true);
CREATE POLICY "Admins can manage CLOs" ON public.clos FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Instructors can manage their course CLOs" ON public.clos FOR ALL USING (is_course_instructor(auth.uid(), course_id));

-- LLOs policies
CREATE POLICY "Anyone can view LLOs" ON public.llos FOR SELECT USING (true);
CREATE POLICY "Admins can manage LLOs" ON public.llos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clos WHERE clos.id = llos.clo_id AND get_user_role(auth.uid()) = 'admin')
);
CREATE POLICY "Instructors can manage their course LLOs" ON public.llos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clos WHERE clos.id = llos.clo_id AND is_course_instructor(auth.uid(), clos.course_id))
);

-- Assessments policies
CREATE POLICY "Anyone can view assessments" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Admins can manage assessments" ON public.assessments FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Instructors can manage their course assessments" ON public.assessments FOR ALL USING (is_course_instructor(auth.uid(), course_id));

-- Assessment LLOs policies
CREATE POLICY "Anyone can view assessment LLOs" ON public.assessment_llos FOR SELECT USING (true);
CREATE POLICY "Admins can manage assessment LLOs" ON public.assessment_llos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.assessments WHERE assessments.id = assessment_llos.assessment_id AND get_user_role(auth.uid()) = 'admin')
);
CREATE POLICY "Instructors can manage their course assessment LLOs" ON public.assessment_llos FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE assessments.id = assessment_llos.assessment_id 
    AND is_course_instructor(auth.uid(), assessments.course_id)
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_plos_updated_at BEFORE UPDATE ON public.plos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clos_updated_at BEFORE UPDATE ON public.clos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_llos_updated_at BEFORE UPDATE ON public.llos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();