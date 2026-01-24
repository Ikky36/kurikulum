-- Add is_active column to curricula table
ALTER TABLE public.curricula ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for faster filtering
CREATE INDEX idx_curricula_is_active ON public.curricula(is_active);