-- Drop old policies that use get_user_role
DROP POLICY IF EXISTS "Assigned dosen can manage elearning_classes" ON public.elearning_classes;

-- Create new policy using has_role function for multi-role support
CREATE POLICY "Assigned dosen can manage elearning_classes"
ON public.elearning_classes
FOR ALL
USING (
  has_role(auth.uid(), 'dosen') AND (
    EXISTS (
      SELECT 1 FROM course_instructors ci
      WHERE ci.course_id = elearning_classes.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = elearning_classes.class_group_id)
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'dosen') AND (
    EXISTS (
      SELECT 1 FROM course_instructors ci
      WHERE ci.course_id = elearning_classes.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = elearning_classes.class_group_id)
    )
  )
);