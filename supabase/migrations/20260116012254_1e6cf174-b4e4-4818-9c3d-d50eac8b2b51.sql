-- Drop existing instructor policy for elearning_materials
DROP POLICY IF EXISTS "Instructors can manage their elearning_materials" ON public.elearning_materials;

-- Create new policy that also checks course_instructors
CREATE POLICY "Instructors can manage their elearning_materials"
ON public.elearning_materials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = elearning_materials.elearning_class_id
    AND (
      -- Direct instructor on the class
      ec.instructor_profile_id = auth.uid()
      OR
      -- Instructor assigned via course_instructors
      EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = elearning_materials.elearning_class_id
    AND (
      -- Direct instructor on the class
      ec.instructor_profile_id = auth.uid()
      OR
      -- Instructor assigned via course_instructors
      EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
      )
    )
  )
);

-- Also update elearning_assignments policy for consistency
DROP POLICY IF EXISTS "Instructors can manage their elearning_assignments" ON public.elearning_assignments;

CREATE POLICY "Instructors can manage their elearning_assignments"
ON public.elearning_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = elearning_assignments.elearning_class_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = elearning_assignments.elearning_class_id
    AND (
      ec.instructor_profile_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = ec.course_id
        AND ci.instructor_profile_id = auth.uid()
      )
    )
  )
);