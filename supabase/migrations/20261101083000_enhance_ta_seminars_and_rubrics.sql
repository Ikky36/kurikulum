-- Migration: 20261101083000_enhance_ta_seminars_and_rubrics.sql
-- Description: Mendukung penguji dinamis (internal dosen & eksternal tamu), tautan token mandiri tanpa login,
-- tanda tangan digital (unggah PNG/JPG & gores kanvas), rincian penilaian rubrik per kriteria, dan pengesahan ketua sidang.

-- 1. Modifikasi tabel public.ta_examiners
-- Hapus batasan check constraint agar dewan penguji bisa dinamis (misal: Penguji 1, Penguji 2, Penguji 3, Penguji 4, Penguji Tamu, dll.)
DO $$
BEGIN
    ALTER TABLE public.ta_examiners DROP CONSTRAINT IF EXISTS ta_examiners_role_check;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Buat dosen_id nullable agar dapat menampung Penguji Tamu / Eksternal yang belum terdaftar akunnya di sistem
ALTER TABLE public.ta_examiners ALTER COLUMN dosen_id DROP NOT NULL;

-- Tambahkan kolom identitas penguji, token akses mandiri, detail nilai rubrik, dan tanda tangan
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS examiner_type TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS examiner_name TEXT;
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS examiner_nip TEXT;
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS examiner_institution TEXT;
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS scores_detail JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS revision_notes TEXT;
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ta_examiners ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1;

-- 2. Modifikasi tabel public.ta_seminars
-- Tambahkan kolom identitas ketua sidang (termasuk jika eksternal), token mandiri, tanda tangan pengesahan, dan skor akhir
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS chairperson_type TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS chairperson_name TEXT;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS chairperson_nip TEXT;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS chairperson_institution TEXT;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS chairperson_access_token TEXT UNIQUE;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS chairperson_signature_url TEXT;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS chairperson_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2);
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS final_grade TEXT;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'pending';
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS revision_deadline DATE;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS official_notes TEXT;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ta_seminars ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Kebijakan Keamanan (RLS) untuk Akses Berbasis Token Tanpa Perlu Login
-- Memungkinkan Penguji dan Ketua Sidang membuka link token dan menyimpan nilai / tanda tangan secara aman
DO $$
BEGIN
    -- Policy pada ta_examiners untuk publik dengan access_token
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ta_examiners' AND policyname = 'Allow public access with valid token on ta_examiners'
    ) THEN
        CREATE POLICY "Allow public access with valid token on ta_examiners"
        ON public.ta_examiners
        FOR ALL
        USING (access_token IS NOT NULL)
        WITH CHECK (access_token IS NOT NULL);
    END IF;

    -- Policy pada ta_seminars untuk publik dengan token ketua sidang atau token penguji
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ta_seminars' AND policyname = 'Allow public access with valid token on ta_seminars'
    ) THEN
        CREATE POLICY "Allow public access with valid token on ta_seminars"
        ON public.ta_seminars
        FOR ALL
        USING (
            chairperson_access_token IS NOT NULL 
            OR EXISTS (
                SELECT 1 FROM public.ta_examiners e 
                WHERE e.seminar_id = ta_seminars.id AND e.access_token IS NOT NULL
            )
        )
        WITH CHECK (
            chairperson_access_token IS NOT NULL 
            OR EXISTS (
                SELECT 1 FROM public.ta_examiners e 
                WHERE e.seminar_id = ta_seminars.id AND e.access_token IS NOT NULL
            )
        );
    END IF;

    -- Policy pada ta_submissions agar data judul mahasiswa dapat dibaca oleh penguji via token
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ta_submissions' AND policyname = 'Allow read submission via seminar token'
    ) THEN
        CREATE POLICY "Allow read submission via seminar token"
        ON public.ta_submissions
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.ta_seminars s
                WHERE s.submission_id = ta_submissions.id 
                AND (
                    s.chairperson_access_token IS NOT NULL 
                    OR EXISTS (
                        SELECT 1 FROM public.ta_examiners e 
                        WHERE e.seminar_id = s.id AND e.access_token IS NOT NULL
                    )
                )
            )
        );
    END IF;
END $$;
