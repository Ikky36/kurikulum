-- VMTS Perguruan Tinggi tables
CREATE TABLE public.vmts_pt_visi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visi text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vmts_pt_misi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  misi text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vmts_pt_tujuan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  tujuan text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vmts_pt_strategi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  strategi text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- VMTS Program Studi tables
CREATE TABLE public.vmts_ps_visi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visi text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vmts_ps_misi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  misi text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vmts_ps_tujuan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  tujuan text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vmts_ps_strategi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  strategi text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profil Lulusan table
CREATE TABLE public.profil_lulusan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  profil text NOT NULL,
  deskripsi text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bahan Kajian table (grouped)
CREATE TABLE public.bahan_kajian_kelompok (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelompok text NOT NULL,
  bahan_kajian text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add profil_lulusan_id to PLOs table
ALTER TABLE public.plos ADD COLUMN profil_lulusan_id uuid REFERENCES public.profil_lulusan(id) ON DELETE SET NULL;

-- Enable RLS on all new tables
ALTER TABLE public.vmts_pt_visi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vmts_pt_misi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vmts_pt_tujuan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vmts_pt_strategi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vmts_ps_visi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vmts_ps_misi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vmts_ps_tujuan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vmts_ps_strategi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_lulusan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bahan_kajian_kelompok ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Anyone can view
CREATE POLICY "Anyone can view vmts_pt_visi" ON public.vmts_pt_visi FOR SELECT USING (true);
CREATE POLICY "Anyone can view vmts_pt_misi" ON public.vmts_pt_misi FOR SELECT USING (true);
CREATE POLICY "Anyone can view vmts_pt_tujuan" ON public.vmts_pt_tujuan FOR SELECT USING (true);
CREATE POLICY "Anyone can view vmts_pt_strategi" ON public.vmts_pt_strategi FOR SELECT USING (true);
CREATE POLICY "Anyone can view vmts_ps_visi" ON public.vmts_ps_visi FOR SELECT USING (true);
CREATE POLICY "Anyone can view vmts_ps_misi" ON public.vmts_ps_misi FOR SELECT USING (true);
CREATE POLICY "Anyone can view vmts_ps_tujuan" ON public.vmts_ps_tujuan FOR SELECT USING (true);
CREATE POLICY "Anyone can view vmts_ps_strategi" ON public.vmts_ps_strategi FOR SELECT USING (true);
CREATE POLICY "Anyone can view profil_lulusan" ON public.profil_lulusan FOR SELECT USING (true);
CREATE POLICY "Anyone can view bahan_kajian_kelompok" ON public.bahan_kajian_kelompok FOR SELECT USING (true);

-- RLS Policies - Admins can manage
CREATE POLICY "Admins can manage vmts_pt_visi" ON public.vmts_pt_visi FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage vmts_pt_misi" ON public.vmts_pt_misi FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage vmts_pt_tujuan" ON public.vmts_pt_tujuan FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage vmts_pt_strategi" ON public.vmts_pt_strategi FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage vmts_ps_visi" ON public.vmts_ps_visi FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage vmts_ps_misi" ON public.vmts_ps_misi FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage vmts_ps_tujuan" ON public.vmts_ps_tujuan FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage vmts_ps_strategi" ON public.vmts_ps_strategi FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage profil_lulusan" ON public.profil_lulusan FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage bahan_kajian_kelompok" ON public.bahan_kajian_kelompok FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Triggers for updated_at
CREATE TRIGGER update_vmts_pt_visi_updated_at BEFORE UPDATE ON public.vmts_pt_visi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vmts_pt_misi_updated_at BEFORE UPDATE ON public.vmts_pt_misi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vmts_pt_tujuan_updated_at BEFORE UPDATE ON public.vmts_pt_tujuan FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vmts_pt_strategi_updated_at BEFORE UPDATE ON public.vmts_pt_strategi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vmts_ps_visi_updated_at BEFORE UPDATE ON public.vmts_ps_visi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vmts_ps_misi_updated_at BEFORE UPDATE ON public.vmts_ps_misi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vmts_ps_tujuan_updated_at BEFORE UPDATE ON public.vmts_ps_tujuan FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vmts_ps_strategi_updated_at BEFORE UPDATE ON public.vmts_ps_strategi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profil_lulusan_updated_at BEFORE UPDATE ON public.profil_lulusan FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bahan_kajian_kelompok_updated_at BEFORE UPDATE ON public.bahan_kajian_kelompok FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();