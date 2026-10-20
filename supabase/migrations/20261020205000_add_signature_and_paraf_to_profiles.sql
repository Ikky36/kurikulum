-- Add signature_url and paraf_url columns to profiles table for digital signature & paraf
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paraf_url TEXT;

COMMENT ON COLUMN public.profiles.signature_url IS 'URL to digital signature image of lecturer/staff';
COMMENT ON COLUMN public.profiles.paraf_url IS 'URL to digital initials/paraf image of lecturer/staff';
