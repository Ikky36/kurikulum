-- Drop existing policies on elearning_attendance
DROP POLICY IF EXISTS "Admins can manage elearning_attendance" ON public.elearning_attendance;
DROP POLICY IF EXISTS "Instructors can manage attendance for their sessions" ON public.elearning_attendance;
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.elearning_attendance;

-- Create new policies using has_role function for multi-role support
-- Admins and sub_admins can manage all attendance
CREATE POLICY "Admins can manage elearning_attendance" 
ON public.elearning_attendance 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sub_admin')
);

-- Instructors can manage attendance for their sessions (either as class creator OR assigned via course_instructors)
CREATE POLICY "Instructors can manage attendance for their sessions" 
ON public.elearning_attendance 
FOR ALL 
USING (
  has_role(auth.uid(), 'dosen') AND EXISTS (
    SELECT 1 FROM elearning_sessions es
    JOIN elearning_classes ec ON ec.id = es.elearning_class_id
    WHERE es.id = elearning_attendance.elearning_session_id
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

-- Students can view their own attendance
CREATE POLICY "Students can view their own attendance" 
ON public.elearning_attendance 
FOR SELECT 
USING (student_profile_id = auth.uid());