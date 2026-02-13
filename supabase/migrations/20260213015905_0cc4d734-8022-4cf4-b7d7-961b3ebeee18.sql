
CREATE OR REPLACE FUNCTION public.get_import_source_classes(p_course_id uuid, p_exclude_class_id uuid)
 RETURNS TABLE(id uuid, title text, course_id uuid, class_group_id uuid, instructor_profile_id uuid, created_at timestamp with time zone, class_group_name text, instructor_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND (
      -- Admin/sub_admin can access all classes
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'sub_admin')
      )
      OR
      (
        -- Dosen must teach this course
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'dosen'
        )
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
      )
    )
  ORDER BY ec.created_at DESC
$function$;
