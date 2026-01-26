-- Drop existing unique constraint that only checks course_id and instructor_profile_id
ALTER TABLE public.course_instructors 
DROP CONSTRAINT IF EXISTS course_instructors_course_id_instructor_profile_id_key;

-- Add new unique constraint that includes class_group_id
-- This allows same instructor to be assigned to same course but different classes
ALTER TABLE public.course_instructors 
ADD CONSTRAINT course_instructors_unique_assignment 
UNIQUE(course_id, instructor_profile_id, class_group_id);