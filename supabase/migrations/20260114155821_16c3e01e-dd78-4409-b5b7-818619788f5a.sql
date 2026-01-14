-- Add policy to allow anyone (including guests) to view grades for public statistics
CREATE POLICY "Anyone can view grades for statistics" 
ON public.grades 
FOR SELECT 
USING (true);