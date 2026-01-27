-- Drop the old instructor policy
DROP POLICY IF EXISTS "Instructors can view and grade submissions for their assignment" ON public.elearning_submissions;

-- Create a new policy that includes course instructors
CREATE POLICY "Instructors can view and grade submissions for their assignments"
ON public.elearning_submissions
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM elearning_assignments ea
    JOIN elearning_classes ec ON ec.id = ea.elearning_class_id
    LEFT JOIN course_instructors ci ON ci.course_id = ec.course_id 
      AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
    WHERE ea.id = elearning_submissions.assignment_id
      AND (
        ec.instructor_profile_id = auth.uid()
        OR ci.instructor_profile_id = auth.uid()
      )
  )
);