-- Add enrollment_year column to profiles for student enrollment year (angkatan)
ALTER TABLE public.profiles
ADD COLUMN enrollment_year integer;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.profiles.enrollment_year IS 'Tahun angkatan mahasiswa (e.g., 2024)';

-- Create class_groups table for managing classes
CREATE TABLE public.class_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for class_groups
CREATE POLICY "Anyone can view class groups"
ON public.class_groups
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage class groups"
ON public.class_groups
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Add trigger for updated_at
CREATE TRIGGER update_class_groups_updated_at
BEFORE UPDATE ON public.class_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();