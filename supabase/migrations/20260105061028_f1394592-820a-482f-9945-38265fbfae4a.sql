-- Create junction table for course and profil_lulusan
CREATE TABLE IF NOT EXISTS public.course_profil_lulusan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  profil_lulusan_id UUID NOT NULL REFERENCES public.profil_lulusan(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, profil_lulusan_id)
);

-- Enable RLS
ALTER TABLE public.course_profil_lulusan ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view course_profil_lulusan" ON public.course_profil_lulusan
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage course_profil_lulusan" ON public.course_profil_lulusan
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);