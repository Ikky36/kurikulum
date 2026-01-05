-- Add class_group_id to course_instructors table to link instructor assignments to specific classes
ALTER TABLE public.course_instructors 
ADD COLUMN class_group_id uuid REFERENCES public.class_groups(id) ON DELETE SET NULL;