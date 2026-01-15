-- Create rubrics table for assessment rubrics/portfolios
CREATE TABLE public.assessment_rubrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elearning_class_id UUID NOT NULL REFERENCES public.elearning_classes(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.elearning_assignments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rubric criteria table
CREATE TABLE public.rubric_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rubric_id UUID NOT NULL REFERENCES public.assessment_rubrics(id) ON DELETE CASCADE,
  criterion_name TEXT NOT NULL,
  description TEXT,
  max_score NUMERIC NOT NULL DEFAULT 100,
  weight_percentage NUMERIC NOT NULL DEFAULT 100,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rubric levels table (performance levels for each criterion)
CREATE TABLE public.rubric_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criteria_id UUID NOT NULL REFERENCES public.rubric_criteria(id) ON DELETE CASCADE,
  level_name TEXT NOT NULL,
  description TEXT,
  score_range_min NUMERIC NOT NULL DEFAULT 0,
  score_range_max NUMERIC NOT NULL DEFAULT 100,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student rubric scores table
CREATE TABLE public.student_rubric_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rubric_id UUID NOT NULL REFERENCES public.assessment_rubrics(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.rubric_criteria(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  score NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  graded_by_profile_id UUID REFERENCES public.profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rubric_id, criteria_id, student_profile_id)
);

-- Enable RLS
ALTER TABLE public.assessment_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_rubric_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_rubrics
CREATE POLICY "Admin and sub_admin can manage all rubrics"
ON public.assessment_rubrics
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

CREATE POLICY "Instructors can manage their rubrics"
ON public.assessment_rubrics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = assessment_rubrics.elearning_class_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = assessment_rubrics.elearning_class_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
);

CREATE POLICY "Students can view rubrics for their classes"
ON public.assessment_rubrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    JOIN class_students cs ON cs.class_group_id = ec.class_group_id
    WHERE ec.id = assessment_rubrics.elearning_class_id
    AND cs.student_profile_id = auth.uid()
  )
);

-- RLS Policies for rubric_criteria
CREATE POLICY "Admin and sub_admin can manage all criteria"
ON public.rubric_criteria
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

CREATE POLICY "Instructors can manage criteria for their rubrics"
ON public.rubric_criteria
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assessment_rubrics ar
    JOIN elearning_classes ec ON ec.id = ar.elearning_class_id
    WHERE ar.id = rubric_criteria.rubric_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessment_rubrics ar
    JOIN elearning_classes ec ON ec.id = ar.elearning_class_id
    WHERE ar.id = rubric_criteria.rubric_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
);

CREATE POLICY "Anyone can view criteria"
ON public.rubric_criteria
FOR SELECT
USING (true);

-- RLS Policies for rubric_levels
CREATE POLICY "Admin and sub_admin can manage all levels"
ON public.rubric_levels
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

CREATE POLICY "Instructors can manage levels for their criteria"
ON public.rubric_levels
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM rubric_criteria rc
    JOIN assessment_rubrics ar ON ar.id = rc.rubric_id
    JOIN elearning_classes ec ON ec.id = ar.elearning_class_id
    WHERE rc.id = rubric_levels.criteria_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rubric_criteria rc
    JOIN assessment_rubrics ar ON ar.id = rc.rubric_id
    JOIN elearning_classes ec ON ec.id = ar.elearning_class_id
    WHERE rc.id = rubric_levels.criteria_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
);

CREATE POLICY "Anyone can view levels"
ON public.rubric_levels
FOR SELECT
USING (true);

-- RLS Policies for student_rubric_scores
CREATE POLICY "Admin and sub_admin can manage all scores"
ON public.student_rubric_scores
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

CREATE POLICY "Instructors can manage scores for their rubrics"
ON public.student_rubric_scores
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assessment_rubrics ar
    JOIN elearning_classes ec ON ec.id = ar.elearning_class_id
    WHERE ar.id = student_rubric_scores.rubric_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessment_rubrics ar
    JOIN elearning_classes ec ON ec.id = ar.elearning_class_id
    WHERE ar.id = student_rubric_scores.rubric_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
);

CREATE POLICY "Students can view their own scores"
ON public.student_rubric_scores
FOR SELECT
USING (student_profile_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_assessment_rubrics_updated_at
BEFORE UPDATE ON public.assessment_rubrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rubric_criteria_updated_at
BEFORE UPDATE ON public.rubric_criteria
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rubric_levels_updated_at
BEFORE UPDATE ON public.rubric_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_rubric_scores_updated_at
BEFORE UPDATE ON public.student_rubric_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();