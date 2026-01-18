-- Add semester column to class_groups
ALTER TABLE public.class_groups
ADD COLUMN semester VARCHAR(20);

-- Copy existing semester data from linked courses (if any)
UPDATE public.class_groups cg
SET semester = c.semester
FROM public.courses c
WHERE cg.course_id = c.id AND c.semester IS NOT NULL;

COMMENT ON COLUMN public.class_groups.semester IS 'Semester for this class group';