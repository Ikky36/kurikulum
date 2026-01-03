-- Create curricula table
CREATE TABLE public.curricula (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create programs (prodi) table
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_settings table for theme customization
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add curriculum_id to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.curricula(id);

-- Enable RLS on new tables
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for curricula
CREATE POLICY "Anyone can view curricula" ON public.curricula FOR SELECT USING (true);
CREATE POLICY "Admins can manage curricula" ON public.curricula FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'sub_admin'));

-- RLS policies for programs
CREATE POLICY "Anyone can view programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Admins can manage programs" ON public.programs FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'sub_admin'));

-- RLS policies for app_settings
CREATE POLICY "Anyone can view app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can manage app_settings" ON public.app_settings FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Triggers for updated_at
CREATE TRIGGER update_curricula_updated_at BEFORE UPDATE ON public.curricula FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create class_students junction table to assign students to classes
CREATE TABLE public.class_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_group_id UUID NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_group_id, student_profile_id)
);

ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view class_students" ON public.class_students FOR SELECT USING (true);
CREATE POLICY "Admins can manage class_students" ON public.class_students FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'sub_admin'));

-- Insert default settings
INSERT INTO public.app_settings (setting_key, setting_value) VALUES 
  ('app_name', 'Student Achievement Tracker PBA'),
  ('logo_url', NULL),
  ('primary_color', '221.2 83.2% 53.3%'),
  ('secondary_color', '210 40% 96.1%')
ON CONFLICT (setting_key) DO NOTHING;