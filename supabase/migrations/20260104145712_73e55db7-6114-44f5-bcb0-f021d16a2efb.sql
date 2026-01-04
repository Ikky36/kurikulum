-- Add new columns to llos table for additional SUB-CPMK/LLO data
-- These fields can have multiple values, so using JSONB arrays
ALTER TABLE public.llos 
ADD COLUMN IF NOT EXISTS bahan_kajian text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS indikator text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metode text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS referensi text[] DEFAULT '{}';