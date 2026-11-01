-- Migration: 20261101103000_create_ta_external_examiners.sql
-- Description: Master data dosen tamu / penguji eksternal dengan tanda tangan digital permanen & izin storage evaluasi_ta

-- 1. Buat Tabel Master Dosen Tamu / Penguji Eksternal
CREATE TABLE IF NOT EXISTS public.ta_external_examiners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  nip TEXT,
  institution TEXT,
  phone TEXT,
  email TEXT,
  signature_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pencarian nama
CREATE INDEX IF NOT EXISTS idx_ta_ext_examiners_name ON public.ta_external_examiners(name);

-- Aktifkan RLS
ALTER TABLE public.ta_external_examiners ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: Siapapun (termasuk akses link tanpa login) dapat membaca dan menyimpan tanda tangan
DROP POLICY IF EXISTS "Allow select ta_external_examiners" ON public.ta_external_examiners;
CREATE POLICY "Allow select ta_external_examiners" ON public.ta_external_examiners
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow insert ta_external_examiners" ON public.ta_external_examiners;
CREATE POLICY "Allow insert ta_external_examiners" ON public.ta_external_examiners
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update ta_external_examiners" ON public.ta_external_examiners;
CREATE POLICY "Allow update ta_external_examiners" ON public.ta_external_examiners
  FOR UPDATE TO public USING (true);

-- 2. Migrasikan data dosen tamu yang sudah pernah ada di ta_examiners
INSERT INTO public.ta_external_examiners (name, nip, institution, signature_url)
SELECT DISTINCT ON (TRIM(examiner_name))
  TRIM(examiner_name),
  TRIM(examiner_nip),
  TRIM(examiner_institution),
  signature_url
FROM public.ta_examiners
WHERE examiner_type = 'external' 
  AND examiner_name IS NOT NULL 
  AND TRIM(examiner_name) <> ''
ON CONFLICT (name) DO UPDATE SET
  signature_url = COALESCE(EXCLUDED.signature_url, public.ta_external_examiners.signature_url),
  updated_at = now();

-- Migrasikan data ketua sidang eksternal yang sudah pernah ada
INSERT INTO public.ta_external_examiners (name, nip, institution, signature_url)
SELECT DISTINCT ON (TRIM(chairperson_name))
  TRIM(chairperson_name),
  TRIM(chairperson_nip),
  TRIM(chairperson_institution),
  chairperson_signature_url
FROM public.ta_seminars
WHERE chairperson_type = 'external' 
  AND chairperson_name IS NOT NULL 
  AND TRIM(chairperson_name) <> ''
ON CONFLICT (name) DO UPDATE SET
  signature_url = COALESCE(EXCLUDED.signature_url, public.ta_external_examiners.signature_url),
  updated_at = now();

-- 3. Kebijakan Izin Supabase Storage untuk folder evaluasi_ta
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public upload to evaluasi_ta in avatars" ON storage.objects;
CREATE POLICY "Allow public upload to evaluasi_ta in avatars"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] IN ('evaluasi_ta', 'signatures')
);

DROP POLICY IF EXISTS "Allow public update in evaluasi_ta in avatars" ON storage.objects;
CREATE POLICY "Allow public update in evaluasi_ta in avatars"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] IN ('evaluasi_ta', 'signatures')
);

DROP POLICY IF EXISTS "Allow public read in evaluasi_ta in avatars" ON storage.objects;
CREATE POLICY "Allow public read in evaluasi_ta in avatars"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
);
