
-- Drop the broad SELECT policy on elearning_classes that lets lecturers see all same-course classes
DROP POLICY IF EXISTS "Dosen can view classes of same course they teach" ON elearning_classes;

-- Create a SECURITY DEFINER function to get importable classes
-- This bypasses RLS so lecturers can see source classes for import
-- without having general browse access to other classes
CREATE OR REPLACE FUNCTION public.get_import_source_classes(
  p_course_id uuid,
  p_exclude_class_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  course_id uuid,
  class_group_id uuid,
  instructor_profile_id uuid,
  created_at timestamptz,
  class_group_name text,
  instructor_name text
)
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
    -- Verify the calling user is a dosen who teaches this course
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'dosen'
    )
    AND EXISTS (
      SELECT 1 FROM elearning_classes ec2
      WHERE ec2.course_id = p_course_id
        AND ec2.instructor_profile_id = auth.uid()
    )
  ORDER BY ec.created_at DESC
$$;
