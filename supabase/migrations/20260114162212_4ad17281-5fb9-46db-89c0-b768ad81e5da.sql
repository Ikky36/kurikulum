-- Create sistem_kuliah table for different study systems
CREATE TABLE public.sistem_kuliah (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sistem_kuliah ENABLE ROW LEVEL SECURITY;

-- Anyone can view sistem_kuliah
CREATE POLICY "Anyone can view sistem_kuliah" 
ON public.sistem_kuliah 
FOR SELECT 
USING (true);

-- Only admins can manage sistem_kuliah
CREATE POLICY "Admins can manage sistem_kuliah" 
ON public.sistem_kuliah 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Add sistem_kuliah_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN sistem_kuliah_id UUID REFERENCES public.sistem_kuliah(id);

-- Create index for better performance
CREATE INDEX idx_profiles_sistem_kuliah ON public.profiles(sistem_kuliah_id);

-- Create update trigger for sistem_kuliah
CREATE TRIGGER update_sistem_kuliah_updated_at
BEFORE UPDATE ON public.sistem_kuliah
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();