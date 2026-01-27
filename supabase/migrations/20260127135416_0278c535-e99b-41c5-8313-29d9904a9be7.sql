
-- Add policy for students to view submissions of classmates for leaderboard
CREATE POLICY "Students can view submissions of classmates in same class"
ON public.elearning_submissions
FOR SELECT
USING (
  -- Student is enrolled in the same class as the assignment
  EXISTS (
    SELECT 1
    FROM elearning_assignments ea
    JOIN elearning_classes ec ON ec.id = ea.elearning_class_id
    JOIN class_students cs ON cs.class_group_id = ec.class_group_id
    WHERE ea.id = elearning_submissions.assignment_id
    AND cs.student_profile_id = auth.uid()
  )
);
