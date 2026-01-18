-- Add course_id to class_groups table to link classes with courses (and their semester)
ALTER TABLE public.class_groups 
ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_class_groups_course_id ON public.class_groups(course_id);

-- Comment to explain the relationship
COMMENT ON COLUMN public.class_groups.course_id IS 'Links this class to a specific course and its semester';