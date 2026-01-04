-- Create table for storing role permissions
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL, -- 'sub_admin', 'dosen', 'mahasiswa', 'guest'
  permission_key TEXT NOT NULL, -- e.g., 'student_grades', 'student_list', 'learning_outcomes', 'achievement_stats'
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'connected', -- 'connected' (only related data) or 'all' (all data)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone can view permissions (needed for checking access)
CREATE POLICY "Anyone can view role_permissions" 
ON public.role_permissions 
FOR SELECT 
USING (true);

-- Only admins can manage permissions
CREATE POLICY "Admins can manage role_permissions" 
ON public.role_permissions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Insert default permissions for all roles and permission keys
INSERT INTO public.role_permissions (role, permission_key, can_view, can_edit, scope) VALUES
-- sub_admin permissions
('sub_admin', 'student_grades', true, true, 'all'),
('sub_admin', 'student_list', true, true, 'all'),
('sub_admin', 'learning_outcomes', true, true, 'all'),
('sub_admin', 'achievement_stats', true, false, 'all'),

-- dosen permissions
('dosen', 'student_grades', true, true, 'connected'),
('dosen', 'student_list', true, false, 'connected'),
('dosen', 'learning_outcomes', true, true, 'connected'),
('dosen', 'achievement_stats', true, false, 'connected'),

-- mahasiswa permissions
('mahasiswa', 'student_grades', true, false, 'connected'),
('mahasiswa', 'student_list', false, false, 'connected'),
('mahasiswa', 'learning_outcomes', true, false, 'connected'),
('mahasiswa', 'achievement_stats', true, false, 'connected'),

-- guest permissions
('guest', 'student_grades', false, false, 'connected'),
('guest', 'student_list', false, false, 'connected'),
('guest', 'learning_outcomes', false, false, 'connected'),
('guest', 'achievement_stats', false, false, 'connected');