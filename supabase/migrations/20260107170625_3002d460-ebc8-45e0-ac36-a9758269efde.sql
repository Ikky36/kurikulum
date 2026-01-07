-- Add prerequisite fields to materials table
ALTER TABLE public.elearning_materials 
ADD COLUMN IF NOT EXISTS prerequisite_material_id UUID REFERENCES public.elearning_materials(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS prerequisite_assignment_id UUID REFERENCES public.elearning_assignments(id) ON DELETE SET NULL;

-- Add prerequisite fields to assignments table  
ALTER TABLE public.elearning_assignments
ADD COLUMN IF NOT EXISTS prerequisite_material_id UUID REFERENCES public.elearning_materials(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS prerequisite_assignment_id UUID REFERENCES public.elearning_assignments(id) ON DELETE SET NULL;

-- Add indexes for prerequisites
CREATE INDEX IF NOT EXISTS idx_materials_prereq_material ON public.elearning_materials(prerequisite_material_id);
CREATE INDEX IF NOT EXISTS idx_materials_prereq_assignment ON public.elearning_materials(prerequisite_assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_prereq_material ON public.elearning_assignments(prerequisite_material_id);
CREATE INDEX IF NOT EXISTS idx_assignments_prereq_assignment ON public.elearning_assignments(prerequisite_assignment_id);

-- Create material progress tracking table
CREATE TABLE IF NOT EXISTS public.elearning_material_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.elearning_materials(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(material_id, student_profile_id)
);

-- Enable RLS on material progress
ALTER TABLE public.elearning_material_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for material progress
CREATE POLICY "Students can view their own progress"
ON public.elearning_material_progress
FOR SELECT
USING (auth.uid() = student_profile_id);

CREATE POLICY "Students can insert their own progress"
ON public.elearning_material_progress
FOR INSERT
WITH CHECK (auth.uid() = student_profile_id);

CREATE POLICY "Students can update their own progress"
ON public.elearning_material_progress
FOR UPDATE
USING (auth.uid() = student_profile_id);

CREATE POLICY "Instructors can view all progress"
ON public.elearning_material_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'dosen')
  )
);

-- Enable realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.elearning_material_progress;