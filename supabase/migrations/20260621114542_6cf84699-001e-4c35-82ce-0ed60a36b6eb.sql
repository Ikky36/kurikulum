-- Allow sub_admin to manage all elearning_submissions (reset attempts in any class)
DROP POLICY IF EXISTS "Admins can manage elearning_submissions" ON public.elearning_submissions;

CREATE POLICY "Admins and sub_admins can manage elearning_submissions"
ON public.elearning_submissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin'));