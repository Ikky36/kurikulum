-- Drop existing policy for admins to manage course instructors
DROP POLICY IF EXISTS "Admins can manage course instructors" ON public.course_instructors;

-- Create new policy that allows both admin and sub_admin to manage course instructors
CREATE POLICY "Admins and sub_admins can manage course instructors" 
ON public.course_instructors 
FOR ALL 
USING (get_user_role(auth.uid()) IN ('admin', 'sub_admin'))
WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'sub_admin'));