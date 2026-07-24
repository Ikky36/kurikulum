-- Hapus tabel lama
DROP TABLE IF EXISTS public.ta_settings CASCADE;
DROP TABLE IF EXISTS public.ta_seminar_requirements CASCADE;

-- Buat tabel baru yang terpadu
CREATE TABLE IF NOT EXISTS public.ta_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('umum', 'pengajuan_judul', 'sempro', 'sidang')),
    is_general BOOLEAN NOT NULL DEFAULT true,
    type_id UUID REFERENCES public.ta_types(id) ON DELETE CASCADE,
    req_type TEXT NOT NULL CHECK (req_type IN ('document', 'course', 'min_sks', 'min_semester', 'predicate')),
    req_value JSONB DEFAULT '{}'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Enable for new table)
ALTER TABLE public.ta_requirements ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users
CREATE POLICY "Allow public read on ta_requirements" ON public.ta_requirements FOR SELECT USING (true);

-- Allow all for authenticated
CREATE POLICY "Allow authenticated full access on ta_requirements" ON public.ta_requirements FOR ALL USING (auth.role() = 'authenticated');
