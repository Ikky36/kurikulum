-- Add code column to programs table
ALTER TABLE public.programs ADD COLUMN code TEXT;

-- Add gender column to profiles table
ALTER TABLE public.profiles ADD COLUMN gender TEXT CHECK (gender IN ('pria', 'wanita'));