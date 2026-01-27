-- Drop existing instructor policy for elearning_sessions
DROP POLICY IF EXISTS "Instructors can manage their elearning_sessions" ON public.elearning_sessions;

-- Create updated policy that includes assigned instructors from course_instructors
CREATE POLICY "Instructors can manage their elearning_sessions" ON public.elearning_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = elearning_sessions.elearning_class_id
    AND (
      -- Is the class creator/instructor
      ec.instructor_profile_id = auth.uid()
      OR
      -- Is assigned to the course via course_instructors (with matching class_group or null for all groups)
      EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
);