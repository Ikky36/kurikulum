-- Drop the overly permissive upload and delete policies
DROP POLICY IF EXISTS "Authenticated users can upload material files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete material files" ON storage.objects;

-- Add restricted upload policy: only dosen, admin, sub_admin can upload
CREATE POLICY "Instructors and admins can upload material files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'material-files'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sub_admin')
    OR public.has_role(auth.uid(), 'dosen')
  )
);

-- Add restricted update policy
CREATE POLICY "Instructors and admins can update material files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'material-files'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sub_admin')
    OR public.has_role(auth.uid(), 'dosen')
  )
);

-- Add restricted delete policy: only dosen, admin, sub_admin can delete
CREATE POLICY "Instructors and admins can delete material files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'material-files'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sub_admin')
    OR public.has_role(auth.uid(), 'dosen')
  )
);