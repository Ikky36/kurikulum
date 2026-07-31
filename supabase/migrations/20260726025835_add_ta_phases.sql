-- Create ta_master_phases table
CREATE TABLE IF NOT EXISTS public.ta_master_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ta_type_id UUID NOT NULL REFERENCES public.ta_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_num INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add current_phase_id to ta_submissions
ALTER TABLE public.ta_submissions
ADD COLUMN current_phase_id UUID REFERENCES public.ta_master_phases(id) ON DELETE SET NULL;

-- Add phase_id to ta_milestones (sub-targets)
ALTER TABLE public.ta_milestones
ADD COLUMN phase_id UUID REFERENCES public.ta_master_phases(id) ON DELETE CASCADE;

-- Create ta_phase_approvals table
CREATE TABLE IF NOT EXISTS public.ta_phase_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.ta_submissions(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES public.ta_master_phases(id) ON DELETE CASCADE,
    dosen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, phase_id, dosen_id)
);

-- RLS for ta_master_phases
ALTER TABLE public.ta_master_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on ta_master_phases" 
ON public.ta_master_phases FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated full access on ta_master_phases" 
ON public.ta_master_phases FOR ALL 
USING (auth.role() = 'authenticated');

-- RLS for ta_phase_approvals
ALTER TABLE public.ta_phase_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on ta_phase_approvals" 
ON public.ta_phase_approvals FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated full access on ta_phase_approvals" 
ON public.ta_phase_approvals FOR ALL 
USING (auth.role() = 'authenticated');
