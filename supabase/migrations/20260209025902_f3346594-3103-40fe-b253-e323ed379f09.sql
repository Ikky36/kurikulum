
-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Dosen can view classes of same course they teach" ON elearning_classes;

-- Create a security definer function to check if user is instructor of any class in a course
CREATE OR REPLACE FUNCTION public.is_class_instructor_of_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM elearning_classes
    WHERE course_id = _course_id
    AND instructor_profile_id = _user_id
  )
$$;

-- Re-create the policy using the security definer function (no recursion)
CREATE POLICY "Dosen can view classes of same course they teach"
ON elearning_classes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  is_class_instructor_of_course(auth.uid(), elearning_classes.course_id)
);

-- Also fix the materials policy to use the function (it references elearning_classes twice via subquery, which is fine but let's be consistent)
DROP POLICY IF EXISTS "Dosen can view materials of same course they teach" ON elearning_materials;
CREATE POLICY "Dosen can view materials of same course they teach"
ON elearning_materials
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = elearning_materials.elearning_class_id
    AND is_class_instructor_of_course(auth.uid(), ec.course_id)
  )
);

-- Fix assignments policy similarly
DROP POLICY IF EXISTS "Dosen can view assignments of same course they teach" ON elearning_assignments;
CREATE POLICY "Dosen can view assignments of same course they teach"
ON elearning_assignments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = elearning_assignments.elearning_class_id
    AND is_class_instructor_of_course(auth.uid(), ec.course_id)
  )
);

-- Fix quiz questions policy similarly
DROP POLICY IF EXISTS "Dosen can view quiz questions of same course they teach" ON elearning_quiz_questions;
CREATE POLICY "Dosen can view quiz questions of same course they teach"
ON elearning_quiz_questions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  EXISTS (
    SELECT 1 FROM elearning_assignments ea
    JOIN elearning_classes ec ON ec.id = ea.elearning_class_id
    WHERE ea.id = elearning_quiz_questions.assignment_id
    AND is_class_instructor_of_course(auth.uid(), ec.course_id)
  )
);
