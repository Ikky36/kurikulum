-- Allow admins and sub_admins to upload, update, and delete app assets and document assets (header banners, logos, footers) in avatars bucket
DROP POLICY IF EXISTS "Admins can upload app assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update app assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete app assets" ON storage.objects;

CREATE POLICY "Admins can upload app and doc assets" ON storage.objects
FOR INSERT TO public
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] IN ('app', 'documents')
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
    )
  )
);

CREATE POLICY "Admins can update app and doc assets" ON storage.objects
FOR UPDATE TO public
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] IN ('app', 'documents')
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
    )
  )
);

CREATE POLICY "Admins can delete app and doc assets" ON storage.objects
FOR DELETE TO public
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] IN ('app', 'documents')
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
    )
  )
);
