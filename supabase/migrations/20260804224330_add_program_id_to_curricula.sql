-- Add program_id to curricula table
ALTER TABLE public.curricula
ADD COLUMN program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

-- Also add program_id to profiles if we want to strict link users to programs
-- But for now, we rely on the discussion that profiles.program (string) will just be matched or we can add program_id to profiles as well.
ALTER TABLE public.profiles
ADD COLUMN program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

-- Update RLS or policies if necessary (assuming they use program_id now)
