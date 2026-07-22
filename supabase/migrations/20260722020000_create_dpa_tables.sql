-- 1. Create academic_advisors table (DPA assignments)
CREATE TABLE IF NOT EXISTS public.academic_advisors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dosen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrollment_year INT NOT NULL,
  sistem_kuliah_id UUID NOT NULL REFERENCES public.sistem_kuliah(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(enrollment_year, sistem_kuliah_id) -- A specific cohort can only have one DPA
);

-- Enable RLS
ALTER TABLE public.academic_advisors ENABLE ROW LEVEL SECURITY;

-- Policies for academic_advisors
CREATE POLICY "academic_advisors_select" ON public.academic_advisors FOR SELECT USING (true);
CREATE POLICY "academic_advisors_admin_all" ON public.academic_advisors 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'sub_admin'))
  );


-- 2. Create academic_guidance_logs table (Bimbingan)
-- Status: pending, approved (scheduled), completed, rejected
CREATE TABLE IF NOT EXISTS public.academic_guidance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dosen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  media TEXT NOT NULL,
  requested_time TIMESTAMP WITH TIME ZONE,
  student_message TEXT,
  dosen_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.academic_guidance_logs ENABLE ROW LEVEL SECURITY;

-- Policies for academic_guidance_logs
CREATE POLICY "guidance_logs_select" ON public.academic_guidance_logs 
  FOR SELECT USING (
    student_id = auth.uid() OR 
    dosen_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'sub_admin'))
  );

CREATE POLICY "guidance_logs_student_insert" ON public.academic_guidance_logs 
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "guidance_logs_dosen_update" ON public.academic_guidance_logs 
  FOR UPDATE USING (
    dosen_id = auth.uid() OR 
    student_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'sub_admin'))
  );
