-- 1. Master Data
CREATE TABLE IF NOT EXISTS public.ta_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ta_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id UUID REFERENCES public.ta_types(id) ON DELETE CASCADE,
    min_semester INTEGER NOT NULL DEFAULT 7,
    required_course_ids UUID[] DEFAULT '{}',
    max_bad_grades_count INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ta_seminar_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('sempro', 'sidang')),
    name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Pengajuan
CREATE TABLE IF NOT EXISTS public.ta_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type_id UUID REFERENCES public.ta_types(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_link TEXT,
    comments TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'revision', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ta_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.ta_submissions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_link TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bimbingan & Dospem
CREATE TABLE IF NOT EXISTS public.ta_advisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.ta_submissions(id) ON DELETE CASCADE,
    dosen_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Pembimbing 1' CHECK (role IN ('Pembimbing 1', 'Pembimbing 2')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ta_consultation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.ta_submissions(id) ON DELETE CASCADE,
    dosen_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    problem TEXT NOT NULL,
    solution TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ta_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.ta_submissions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Seminar & Sidang
CREATE TABLE IF NOT EXISTS public.ta_seminars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.ta_submissions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sempro', 'sidang')),
    schedule_date TIMESTAMP WITH TIME ZONE,
    room TEXT,
    chairperson_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ta_seminar_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seminar_id UUID REFERENCES public.ta_seminars(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    requirements_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ta_examiners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seminar_id UUID REFERENCES public.ta_seminars(id) ON DELETE CASCADE,
    dosen_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Penguji 1' CHECK (role IN ('Penguji 1', 'Penguji 2', 'Penguji 3')),
    score NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Enable for all new tables)
ALTER TABLE public.ta_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_seminar_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_advisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_consultation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_seminars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_seminar_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ta_examiners ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users on config tables
CREATE POLICY "Allow public read on ta_types" ON public.ta_types FOR SELECT USING (true);
CREATE POLICY "Allow public read on ta_settings" ON public.ta_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read on ta_seminar_requirements" ON public.ta_seminar_requirements FOR SELECT USING (true);

-- Allow all for authenticated
CREATE POLICY "Allow authenticated full access on ta_types" ON public.ta_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_settings" ON public.ta_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_seminar_requirements" ON public.ta_seminar_requirements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_submissions" ON public.ta_submissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_revisions" ON public.ta_revisions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_advisors" ON public.ta_advisors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_consultation_logs" ON public.ta_consultation_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_milestones" ON public.ta_milestones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_seminars" ON public.ta_seminars FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_seminar_registrations" ON public.ta_seminar_registrations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on ta_examiners" ON public.ta_examiners FOR ALL USING (auth.role() = 'authenticated');
