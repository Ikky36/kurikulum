-- Add is_active column to courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add is_active column to class_groups
ALTER TABLE public.class_groups
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
