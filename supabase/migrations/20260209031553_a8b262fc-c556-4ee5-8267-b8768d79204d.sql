
-- Create a SECURITY DEFINER function to check if a user teaches the same course as a given class
-- This bypasses RLS on elearning_classes so it can be used in policies on other tables
CREATE OR REPLACE FUNCTION public.is_dosen_of_same_course_as_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM elearning_classes target_class
    JOIN elearning_classes user_class ON user_class.course_id = target_class.course_id
    WHERE target_class.id = _class_id
    AND user_class.instructor_profile_id = _user_id
  )
$$;

-- Fix elearning_materials policy to use the new SECURITY DEFINER function
DROP POLICY IF EXISTS "Dosen can view materials of same course they teach" ON elearning_materials;
CREATE POLICY "Dosen can view materials of same course they teach" 
ON elearning_materials FOR SELECT
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  public.is_dosen_of_same_course_as_class(auth.uid(), elearning_class_id)
);

-- Fix elearning_assignments policy to use the new SECURITY DEFINER function
DROP POLICY IF EXISTS "Dosen can view assignments of same course they teach" ON elearning_assignments;
CREATE POLICY "Dosen can view assignments of same course they teach" 
ON elearning_assignments FOR SELECT
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  public.is_dosen_of_same_course_as_class(auth.uid(), elearning_class_id)
);

-- Fix elearning_quiz_questions policy to use a SECURITY DEFINER approach
DROP POLICY IF EXISTS "Dosen can view quiz questions of same course they teach" ON elearning_quiz_questions;
CREATE POLICY "Dosen can view quiz questions of same course they teach" 
ON elearning_quiz_questions FOR SELECT
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  EXISTS (
    SELECT 1 FROM elearning_assignments ea
    WHERE ea.id = elearning_quiz_questions.assignment_id
    AND public.is_dosen_of_same_course_as_class(auth.uid(), ea.elearning_class_id)
  )
);
