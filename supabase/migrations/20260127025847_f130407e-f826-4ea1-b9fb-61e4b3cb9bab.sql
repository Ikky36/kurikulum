-- Add sections column to elearning_materials table
-- sections will store an array of section objects with title and content
ALTER TABLE public.elearning_materials 
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN public.elearning_materials.sections IS 'Array of section objects: [{"title": "Section 1", "content": "HTML content..."}, ...]';