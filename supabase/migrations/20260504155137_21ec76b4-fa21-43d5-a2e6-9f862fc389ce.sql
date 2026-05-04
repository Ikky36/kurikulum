
-- Fix class_students public exposure
DROP POLICY IF EXISTS "Anyone can view class_students" ON public.class_students;

CREATE POLICY "Students can view their own class membership"
ON public.class_students FOR SELECT
TO authenticated
USING (
  student_profile_id = auth.uid()
  OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role, 'dosen'::app_role])
);

-- Fix document_annotations over-broad SELECT
DROP POLICY IF EXISTS "Authenticated users can view annotations" ON public.document_annotations;

CREATE POLICY "Scoped read of document annotations"
ON public.document_annotations FOR SELECT
TO authenticated
USING (
  author_profile_id = auth.uid()
  OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
  OR (
    submission_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM elearning_submissions es
      WHERE es.id = document_annotations.submission_id
      AND (
        es.student_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM elearning_assignments ea
          JOIN elearning_classes ec ON ec.id = ea.elearning_class_id
          WHERE ea.id = es.assignment_id
          AND (
            ec.instructor_profile_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM course_instructors ci
              WHERE ci.course_id = ec.course_id AND ci.instructor_profile_id = auth.uid()
            )
          )
        )
      )
    )
  )
  OR (
    material_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM elearning_materials em
      JOIN elearning_classes ec ON ec.id = em.elearning_class_id
      WHERE em.id = document_annotations.material_id
      AND (
        ec.instructor_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM course_instructors ci
          WHERE ci.course_id = ec.course_id AND ci.instructor_profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM class_students cs
          WHERE cs.class_group_id = ec.class_group_id AND cs.student_profile_id = auth.uid()
        )
      )
    )
  )
);

-- Fix enrollments over-broad SELECT
DROP POLICY IF EXISTS "Authenticated users can view enrollments" ON public.enrollments;

CREATE POLICY "Scoped read of enrollments"
ON public.enrollments FOR SELECT
TO authenticated
USING (
  student_profile_id = auth.uid()
  OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
  OR is_course_instructor(auth.uid(), course_id)
);

-- Fix elearning_submissions student cross-read
DROP POLICY IF EXISTS "Students can view submissions of classmates in same class" ON public.elearning_submissions;

-- Fix video_comments public SELECT
DROP POLICY IF EXISTS "Users can view video comments on accessible content" ON public.video_comments;

CREATE POLICY "Authenticated users can view video comments"
ON public.video_comments FOR SELECT
TO authenticated
USING (
  author_profile_id = auth.uid()
  OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
  OR (
    submission_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM elearning_submissions es
      WHERE es.id = video_comments.submission_id
      AND (
        es.student_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM elearning_assignments ea
          JOIN elearning_classes ec ON ec.id = ea.elearning_class_id
          WHERE ea.id = es.assignment_id
          AND (
            ec.instructor_profile_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM course_instructors ci
              WHERE ci.course_id = ec.course_id AND ci.instructor_profile_id = auth.uid()
            )
          )
        )
      )
    )
  )
  OR (
    material_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM elearning_materials em
      JOIN elearning_classes ec ON ec.id = em.elearning_class_id
      WHERE em.id = video_comments.material_id
      AND (
        ec.instructor_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM course_instructors ci
          WHERE ci.course_id = ec.course_id AND ci.instructor_profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM class_students cs
          WHERE cs.class_group_id = ec.class_group_id AND cs.student_profile_id = auth.uid()
        )
      )
    )
  )
);

-- Fix quiz correct_answer cross-instructor exposure: restrict to owning class instructors only
DROP POLICY IF EXISTS "Dosen can view quiz questions of same course they teach" ON public.elearning_quiz_questions;

CREATE POLICY "Owning class instructors can view quiz questions"
ON public.elearning_quiz_questions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM elearning_assignments ea
    JOIN elearning_classes ec ON ec.id = ea.elearning_class_id
    WHERE ea.id = elearning_quiz_questions.assignment_id
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
