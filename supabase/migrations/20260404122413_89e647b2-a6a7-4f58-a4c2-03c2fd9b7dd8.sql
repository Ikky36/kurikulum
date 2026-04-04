
-- VMTS UPPS Visi
CREATE TABLE public.vmts_upps_visi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visi TEXT NOT NULL,
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.vmts_upps_visi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vmts_upps_visi" ON public.vmts_upps_visi FOR SELECT USING (true);
CREATE POLICY "Admins can manage vmts_upps_visi" ON public.vmts_upps_visi FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- VMTS UPPS Misi
CREATE TABLE public.vmts_upps_misi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  misi TEXT NOT NULL,
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.vmts_upps_misi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vmts_upps_misi" ON public.vmts_upps_misi FOR SELECT USING (true);
CREATE POLICY "Admins can manage vmts_upps_misi" ON public.vmts_upps_misi FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- VMTS UPPS Tujuan
CREATE TABLE public.vmts_upps_tujuan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  tujuan TEXT NOT NULL,
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.vmts_upps_tujuan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vmts_upps_tujuan" ON public.vmts_upps_tujuan FOR SELECT USING (true);
CREATE POLICY "Admins can manage vmts_upps_tujuan" ON public.vmts_upps_tujuan FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- VMTS UPPS Strategi
CREATE TABLE public.vmts_upps_strategi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  strategi TEXT NOT NULL,
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.vmts_upps_strategi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vmts_upps_strategi" ON public.vmts_upps_strategi FOR SELECT USING (true);
CREATE POLICY "Admins can manage vmts_upps_strategi" ON public.vmts_upps_strategi FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);
