-- Allow sub_admin to view user_roles (needed to list all dosen for assignment dialog)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins and sub_admins can view all roles"
ON public.user_roles
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- Allow sub_admin to update any profile (so sub_admin can fully manage users)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins and sub_admins can update any profile"
ON public.profiles
FOR UPDATE
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- Allow sub_admin to manage enrollments
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins and sub_admins can manage enrollments"
ON public.enrollments
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));
