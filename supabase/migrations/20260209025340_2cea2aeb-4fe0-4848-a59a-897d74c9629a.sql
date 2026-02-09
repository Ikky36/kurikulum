
-- Allow dosen to READ classes of the same course they teach (for import)
CREATE POLICY "Dosen can view classes of same course they teach"
ON elearning_classes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  EXISTS (
    SELECT 1 FROM elearning_classes ec2
    WHERE ec2.course_id = elearning_classes.course_id
    AND ec2.instructor_profile_id = auth.uid()
  )
);

-- Allow dosen to READ materials from classes of same course they teach (for import)
CREATE POLICY "Dosen can view materials of same course they teach"
ON elearning_materials
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = elearning_materials.elearning_class_id
    AND EXISTS (
      SELECT 1 FROM elearning_classes ec2
      WHERE ec2.course_id = ec.course_id
      AND ec2.instructor_profile_id = auth.uid()
    )
  )
);

-- Allow dosen to READ assignments from classes of same course they teach (for import)
CREATE POLICY "Dosen can view assignments of same course they teach"
ON elearning_assignments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'dosen'::app_role) AND 
  EXISTS (
    SELECT 1 FROM elearning_classes ec
    WHERE ec.id = elearning_assignments.elearning_class_id
    AND EXISTS (
      SELECT 1 FROM elearning_classes ec2
      WHERE ec2.course_id = ec.course_id
      AND ec2.instructor_profile_id = auth.uid()
    )
  )
);

-- Allow dosen to READ quiz questions from classes of same course they teach (for import)
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
    AND EXISTS (
      SELECT 1 FROM elearning_classes ec2
      WHERE ec2.course_id = ec.course_id
      AND ec2.instructor_profile_id = auth.uid()
    )
  )
);
