-- Create storage bucket for material section files
INSERT INTO storage.buckets (id, name, public)
VALUES ('material-files', 'material-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload material files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'material-files');

-- Allow anyone to view material files (public bucket)
CREATE POLICY "Anyone can view material files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'material-files');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete material files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'material-files');