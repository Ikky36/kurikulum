-- Drop the foreign key constraint to auth.users to allow dummy data
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;