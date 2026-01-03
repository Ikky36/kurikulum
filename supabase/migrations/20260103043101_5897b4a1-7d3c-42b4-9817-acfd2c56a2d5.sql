-- Create student_assessment_scores table for storing individual assessment scores
CREATE TABLE public.student_assessment_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  notes TEXT,
  updated_by_profile_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, student_profile_id)
);

-- Enable RLS
ALTER TABLE public.student_assessment_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Students can view their own scores
CREATE POLICY "Students can view own assessment scores" 
ON public.student_assessment_scores 
FOR SELECT 
USING (student_profile_id = auth.uid());

-- Instructors can view scores for their courses
CREATE POLICY "Instructors can view assessment scores for their courses" 
ON public.student_assessment_scores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = student_assessment_scores.assessment_id
    AND is_course_instructor(auth.uid(), a.course_id)
  )
);

-- Admins can view all scores
CREATE POLICY "Admins can view all assessment scores" 
ON public.student_assessment_scores 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Instructors can insert scores for their courses
CREATE POLICY "Instructors can insert assessment scores for their courses" 
ON public.student_assessment_scores 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = student_assessment_scores.assessment_id
    AND is_course_instructor(auth.uid(), a.course_id)
  )
  OR get_user_role(auth.uid()) = 'admin'::app_role
);

-- Instructors can update scores for their courses
CREATE POLICY "Instructors can update assessment scores for their courses" 
ON public.student_assessment_scores 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = student_assessment_scores.assessment_id
    AND is_course_instructor(auth.uid(), a.course_id)
  )
  OR get_user_role(auth.uid()) = 'admin'::app_role
);

-- Admins can delete scores
CREATE POLICY "Admins can delete assessment scores" 
ON public.student_assessment_scores 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Create trigger for updated_at
CREATE TRIGGER update_student_assessment_scores_updated_at
BEFORE UPDATE ON public.student_assessment_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();