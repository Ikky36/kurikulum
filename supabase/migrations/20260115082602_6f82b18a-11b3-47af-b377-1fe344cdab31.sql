-- Drop existing admin policy and recreate with sub_admin access
DROP POLICY IF EXISTS "Admins can manage elearning_classes" ON public.elearning_classes;

CREATE POLICY "Admins and sub_admins can manage elearning_classes"
ON public.elearning_classes
FOR ALL
USING (get_user_role(auth.uid()) IN ('admin', 'sub_admin'))
WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'sub_admin'));

-- Also add policy for dosen assigned to course via course_instructors
CREATE POLICY "Assigned dosen can manage elearning_classes"
ON public.elearning_classes
FOR ALL
USING (
  get_user_role(auth.uid()) = 'dosen' AND 
  EXISTS (
    SELECT 1 FROM course_instructors ci
    WHERE ci.course_id = elearning_classes.course_id
    AND ci.instructor_profile_id = auth.uid()
    AND (ci.class_group_id IS NULL OR ci.class_group_id = elearning_classes.class_group_id)
  )
)
WITH CHECK (
  get_user_role(auth.uid()) = 'dosen' AND 
  EXISTS (
    SELECT 1 FROM course_instructors ci
    WHERE ci.course_id = elearning_classes.course_id
    AND ci.instructor_profile_id = auth.uid()
    AND (ci.class_group_id IS NULL OR ci.class_group_id = elearning_classes.class_group_id)
  )
);