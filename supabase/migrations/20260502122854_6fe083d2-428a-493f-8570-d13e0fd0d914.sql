
-- 1) PROFILES: drop public SELECT, require auth
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2) Prevent role self-escalation on profiles update
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

-- 3) GRADES: remove public read
DROP POLICY IF EXISTS "Anyone can view grades for statistics" ON public.grades;

-- 4) ENROLLMENTS: remove public read, require auth
DROP POLICY IF EXISTS "Anyone can view enrollments" ON public.enrollments;
CREATE POLICY "Authenticated users can view enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (true);

-- 5) DOCUMENT_ANNOTATIONS: require auth for select
DROP POLICY IF EXISTS "Users can view annotations on accessible content" ON public.document_annotations;
CREATE POLICY "Authenticated users can view annotations"
ON public.document_annotations
FOR SELECT
TO authenticated
USING (true);

-- 6) APP_SETTINGS: hide sensitive keys; allow safe keys publicly for branding
DROP POLICY IF EXISTS "Anyone can view app_settings" ON public.app_settings;
CREATE POLICY "Public can view non-sensitive app_settings"
ON public.app_settings
FOR SELECT
USING (setting_key NOT IN ('ai_api_key'));

-- Admin policy "Only admins can manage app_settings" (ALL) already grants admin full access including SELECT of all keys.

-- 7) PLO_PROFIL_LULUSAN: restrict writes to admins/sub-admins
DROP POLICY IF EXISTS "Authenticated users can insert plo_profil_lulusan" ON public.plo_profil_lulusan;
DROP POLICY IF EXISTS "Authenticated users can update plo_profil_lulusan" ON public.plo_profil_lulusan;
DROP POLICY IF EXISTS "Authenticated users can delete plo_profil_lulusan" ON public.plo_profil_lulusan;

CREATE POLICY "Admins can insert plo_profil_lulusan"
ON public.plo_profil_lulusan
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'sub_admin'::app_role)
);

CREATE POLICY "Admins can update plo_profil_lulusan"
ON public.plo_profil_lulusan
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'sub_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'sub_admin'::app_role)
);

CREATE POLICY "Admins can delete plo_profil_lulusan"
ON public.plo_profil_lulusan
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'sub_admin'::app_role)
);

-- 8) Harden handle_new_user trigger to never trust client-supplied role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    'mahasiswa'::app_role
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'mahasiswa'::app_role);

  RETURN NEW;
END;
$function$;
