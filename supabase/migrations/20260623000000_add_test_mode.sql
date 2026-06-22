-- Add is_test_mode column to elearning_submissions
ALTER TABLE public.elearning_submissions
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT false;

-- Create an explicit policy to guarantee Dosen/Admin can manage their test submissions
DROP POLICY IF EXISTS "Allow test submissions for authorized roles" ON public.elearning_submissions;

CREATE POLICY "Allow test submissions for authorized roles"
ON public.elearning_submissions
FOR ALL
USING (
  is_test_mode = true AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'sub_admin') OR 
    public.has_role(auth.uid(), 'dosen')
  )
)
WITH CHECK (
  is_test_mode = true AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'sub_admin') OR 
    public.has_role(auth.uid(), 'dosen')
  )
);
