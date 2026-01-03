-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (get_user_role(auth.uid()) = 'admin'::app_role);