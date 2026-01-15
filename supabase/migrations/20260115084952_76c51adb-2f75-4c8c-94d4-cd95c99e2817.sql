-- Drop existing restrictive policies for elearning_quiz_questions
DROP POLICY IF EXISTS "Admins can manage quiz_questions" ON public.elearning_quiz_questions;
DROP POLICY IF EXISTS "Instructors can manage their quiz_questions" ON public.elearning_quiz_questions;

-- Create comprehensive policy for admin and sub_admin
CREATE POLICY "Admin and sub_admin can manage all quiz_questions"
ON public.elearning_quiz_questions
FOR ALL
USING (
  get_user_role(auth.uid()) IN ('admin', 'sub_admin')
)
WITH CHECK (
  get_user_role(auth.uid()) IN ('admin', 'sub_admin')
);

-- Policy for instructors (class creator or assigned via course_instructors)
CREATE POLICY "Instructors can manage their quiz_questions"
ON public.elearning_quiz_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM elearning_assignments ea
    JOIN elearning_classes ec ON ec.id = ea.elearning_class_id
    WHERE ea.id = elearning_quiz_questions.assignment_id
    AND (
      -- Class creator
      ec.instructor_profile_id = auth.uid()
      OR
      -- Assigned instructor via course_instructors (specific class or null = all classes)
      EXISTS (
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
    SELECT 1 FROM elearning_assignments ea
    JOIN elearning_classes ec ON ec.id = ea.elearning_class_id
    WHERE ea.id = elearning_quiz_questions.assignment_id
    AND (
      -- Class creator
      ec.instructor_profile_id = auth.uid()
      OR
      -- Assigned instructor via course_instructors
      EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
        AND (ci.class_group_id IS NULL OR ci.class_group_id = ec.class_group_id)
      )
    )
  )
);