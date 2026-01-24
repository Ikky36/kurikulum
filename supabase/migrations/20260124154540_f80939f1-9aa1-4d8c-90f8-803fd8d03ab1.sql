-- Add curriculum_id to all curriculum-related tables
-- This allows each curriculum to have its own set of VMTS, PL, CPL, BK data

-- VMTS PT tables
ALTER TABLE public.vmts_pt_visi 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

ALTER TABLE public.vmts_pt_misi 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

ALTER TABLE public.vmts_pt_tujuan 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

ALTER TABLE public.vmts_pt_strategi 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

-- VMTS PS tables
ALTER TABLE public.vmts_ps_visi 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

ALTER TABLE public.vmts_ps_misi 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

ALTER TABLE public.vmts_ps_tujuan 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

ALTER TABLE public.vmts_ps_strategi 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

-- Profil Lulusan
ALTER TABLE public.profil_lulusan 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

-- PLOs (CPL)
ALTER TABLE public.plos 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

-- Bahan Kajian Kelompok
ALTER TABLE public.bahan_kajian_kelompok 
ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX idx_vmts_pt_visi_curriculum ON public.vmts_pt_visi(curriculum_id);
CREATE INDEX idx_vmts_pt_misi_curriculum ON public.vmts_pt_misi(curriculum_id);
CREATE INDEX idx_vmts_pt_tujuan_curriculum ON public.vmts_pt_tujuan(curriculum_id);
CREATE INDEX idx_vmts_pt_strategi_curriculum ON public.vmts_pt_strategi(curriculum_id);
CREATE INDEX idx_vmts_ps_visi_curriculum ON public.vmts_ps_visi(curriculum_id);
CREATE INDEX idx_vmts_ps_misi_curriculum ON public.vmts_ps_misi(curriculum_id);
CREATE INDEX idx_vmts_ps_tujuan_curriculum ON public.vmts_ps_tujuan(curriculum_id);
CREATE INDEX idx_vmts_ps_strategi_curriculum ON public.vmts_ps_strategi(curriculum_id);
CREATE INDEX idx_profil_lulusan_curriculum ON public.profil_lulusan(curriculum_id);
CREATE INDEX idx_plos_curriculum ON public.plos(curriculum_id);
CREATE INDEX idx_bahan_kajian_kelompok_curriculum ON public.bahan_kajian_kelompok(curriculum_id);