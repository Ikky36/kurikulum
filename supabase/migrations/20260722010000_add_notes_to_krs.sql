-- Add notes column to krs table to store rejection reasons from admin
ALTER TABLE public.krs ADD COLUMN IF NOT EXISTS notes text;
