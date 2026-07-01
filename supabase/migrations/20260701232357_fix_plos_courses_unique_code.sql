-- Drop global unique constraints on code that prevent reusing codes across curricula
ALTER TABLE public.plos DROP CONSTRAINT IF EXISTS plos_code_key;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_code_key;

-- Add curriculum-scoped unique constraints to allow the same code in different curricula
ALTER TABLE public.plos ADD CONSTRAINT plos_curriculum_code_key UNIQUE(curriculum_id, code);
ALTER TABLE public.courses ADD CONSTRAINT courses_curriculum_code_key UNIQUE(curriculum_id, code);
