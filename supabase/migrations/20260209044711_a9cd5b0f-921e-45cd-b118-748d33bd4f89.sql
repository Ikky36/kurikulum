
-- Update get_import_source_classes to also check course_instructors table
CREATE OR REPLACE FUNCTION public.get_import_source_classes(p_course_id uuid, p_exclude_class_id uuid)
RETURNS TABLE(id uuid, title text, course_id uuid, class_group_id uuid, instructor_profile_id uuid, created_at timestamp with time zone, class_group_name text, instructor_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ec.id,
    ec.title,
    ec.course_id,
    ec.class_group_id,
    ec.instructor_profile_id,
    ec.created_at,
    cg.name AS class_group_name,
    p.full_name AS instructor_name
  FROM elearning_classes ec
  LEFT JOIN class_groups cg ON cg.id = ec.class_group_id
  LEFT JOIN profiles p ON p.id = ec.instructor_profile_id
  WHERE ec.course_id = p_course_id
    AND ec.id != p_exclude_class_id
    -- Verify the calling user is a dosen
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'dosen'
    )
    -- Verify the calling user teaches this course (via elearning_classes OR course_instructors)
    AND (
      EXISTS (
        SELECT 1 FROM elearning_classes ec2
        WHERE ec2.course_id = p_course_id
          AND ec2.instructor_profile_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = p_course_id
          AND ci.instructor_profile_id = auth.uid()
      )
    )
  ORDER BY ec.created_at DESC
$$;

-- Update is_dosen_of_same_course_as_class to also check course_instructors table
CREATE OR REPLACE FUNCTION public.is_dosen_of_same_course_as_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM elearning_classes target_class
    WHERE target_class.id = _class_id
    AND (
      -- Check if user is instructor of any elearning_class with the same course
      EXISTS (
        SELECT 1 FROM elearning_classes user_class 
        WHERE user_class.course_id = target_class.course_id
        AND user_class.instructor_profile_id = _user_id
      )
      OR
      -- Check if user is in course_instructors for the same course
      EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = target_class.course_id
        AND ci.instructor_profile_id = _user_id
      )
    )
  )
$$;
