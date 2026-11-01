import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SETTING_KEY_TA_RUBRICS = 'ta_rubrics_config';

export interface TaRubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // Persentase bobot (misal: 25 untuk 25%)
  max_score: number; // Default 100
  order_index?: number;
}

export interface TaRubricConfig {
  id: 'sempro' | 'sidang';
  title: string;
  description: string;
  min_passing_score: number; // Nilai batas minimal kelulusan (0 - 100)
  criteria: TaRubricCriterion[];
  updated_at?: string;
}

export type AllTaRubricsConfig = Record<'sempro' | 'sidang', TaRubricConfig>;

// Standard default rubrics for STITMA
export const defaultTaRubrics: AllTaRubricsConfig = {
  sempro: {
    id: 'sempro',
    title: 'Rubrik Penilaian Seminar Proposal Skripsi',
    description: 'Rubrik evaluasi kesiapan naskah proposal tugas akhir, kajian teoritis, dan ketepatan metodologi penelitian mahasiswa.',
    min_passing_score: 65,
    criteria: [
      {
        id: 'sempro_crit_1',
        name: 'Latar Belakang & Perumusan Masalah',
        description: 'Kejelasan urgensi penelitian, orisinalitas/kebaruan ide, ketajaman perumusan masalah, dan tujuan penelitian yang terukur.',
        weight: 25,
        max_score: 100,
        order_index: 1,
      },
      {
        id: 'sempro_crit_2',
        name: 'Kajian Pustaka & Kerangka Teoritik',
        description: 'Relevansi dan kemutakhiran literatur (jurnal bereputasi 5-10 tahun terakhir), kedalaman sintesis teori, dan kerangka berpikir logis.',
        weight: 25,
        max_score: 100,
        order_index: 2,
      },
      {
        id: 'sempro_crit_3',
        name: 'Metodologi Penelitian & Instrumen',
        description: 'Ketepatan pemilihan metode, rancangan populasi/sampel/subjek, keabsahan instrumen pengumpulan data, dan teknik analisis data.',
        weight: 30,
        max_score: 100,
        order_index: 3,
      },
      {
        id: 'sempro_crit_4',
        name: 'Penguasaan Materi & Presentasi Ilmiah',
        description: 'Kelancaran penyampaian presentasi, kemampuan argumentasi ilmiah dalam menjawab pertanyaan dewan penguji, dan etika akademik.',
        weight: 20,
        max_score: 100,
        order_index: 4,
      },
    ],
  },
  sidang: {
    id: 'sidang',
    title: 'Rubrik Penilaian Sidang Munaqasyah Tugas Akhir',
    description: 'Rubrik evaluasi komprehensif naskah akhir skripsi, kedalaman temuan hasil riset, argumentasi ilmiah, dan sikap akademisi.',
    min_passing_score: 70,
    criteria: [
      {
        id: 'sidang_crit_1',
        name: 'Kualitas Naskah & Sistematika Penulisan',
        description: 'Kepatuhan format terhadap Pedoman Penulisan Skripsi STITMA, koherensi antar bab, ketepatan sitasi (Mendeley/Zotero), dan bahasa baku.',
        weight: 25,
        max_score: 100,
        order_index: 1,
      },
      {
        id: 'sidang_crit_2',
        name: 'Kedalaman Hasil & Pembahasan Penelitian',
        description: 'Validitas dan keabsahan temuan data, ketajaman analisis hasil pembahasan, keterkaitan dengan teori rujukan, dan signifikansi temuan.',
        weight: 35,
        max_score: 100,
        order_index: 2,
      },
      {
        id: 'sidang_crit_3',
        name: 'Penguasaan Materi Skripsi & Daya Nalar',
        description: 'Kemampuan mempertahankan dalil skripsi secara objektif, penguasaan teori dan metodologi pendukung, serta kematangan penalaran ilmiah.',
        weight: 25,
        max_score: 100,
        order_index: 3,
      },
      {
        id: 'sidang_crit_4',
        name: 'Teknik Presentasi & Sikap Akademik',
        description: 'Kualitas slide presentasi, kejelasan tutur kata, kesantunan dalam berdiskusi, kejujuran ilmiah, dan sikap selama persidangan.',
        weight: 15,
        max_score: 100,
        order_index: 4,
      },
    ],
  },
};

// Item detail nilai per kriteria yang tersimpan di kolom JSONB `scores_detail`
export interface TaExaminerScoreItem {
  criterion_id: string;
  criterion_name: string;
  weight: number;
  max_score: number;
  raw_score: number;
  weighted_score: number;
}

// Payload penilaian lengkap dari penguji
export interface TaExaminerAssessmentPayload {
  examiner_id: string;
  seminar_id: string;
  examiner_type: 'internal' | 'external';
  examiner_name: string;
  examiner_nip?: string;
  examiner_institution?: string;
  role: string;
  scores_detail: TaExaminerScoreItem[];
  final_score: number;
  revision_notes: string;
  signature_url: string;
  signed_at: string;
  access_token?: string;
}

// Helper: Hitung total bobot kriteria (%)
export function calculateRubricTotalWeight(criteria: TaRubricCriterion[]): number {
  return criteria.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
}

// Helper: Hitung skor tertimbang penguji berdasarkan input skor mentah
export function calculateExaminerScore(
  criteria: TaRubricCriterion[],
  rawScores: Record<string, number>
): {
  finalScore: number;
  details: TaExaminerScoreItem[];
  isComplete: boolean;
} {
  let totalWeightedScore = 0;
  let isComplete = true;

  const details: TaExaminerScoreItem[] = criteria.map((crit) => {
    const rawVal = rawScores[crit.id];
    const raw = typeof rawVal === 'number' && !isNaN(rawVal) ? Math.min(100, Math.max(0, rawVal)) : 0;
    if (rawVal === undefined || rawVal === null || isNaN(rawVal)) {
      isComplete = false;
    }
    const weighted = Math.round((raw * (crit.weight / 100)) * 100) / 100;
    totalWeightedScore += weighted;

    return {
      criterion_id: crit.id,
      criterion_name: crit.name,
      weight: crit.weight,
      max_score: crit.max_score || 100,
      raw_score: raw,
      weighted_score: weighted,
    };
  });

  const finalScore = Math.round(totalWeightedScore * 100) / 100;

  return {
    finalScore,
    details,
    isComplete,
  };
}

// Helper: Menentukan Predikat Huruf & Keterangan Kelulusan berdasarkan nilai angka
export function determineGradeFromScore(
  score: number,
  minPassingScore: number = 65
): {
  grade: string;
  isPass: boolean;
  statusLabel: string;
  badgeClass: string;
  arabicLabel: string;
} {
  const isPass = score >= minPassingScore;

  if (score >= 85) {
    return {
      grade: 'A',
      isPass: true,
      statusLabel: 'Lulus dengan Sangat Memuaskan',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400',
      arabicLabel: 'ممتاز (Mumtaz)',
    };
  }
  if (score >= 80) {
    return {
      grade: 'A-',
      isPass: true,
      statusLabel: 'Lulus dengan Sangat Baik',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400',
      arabicLabel: 'جيد جدا مرتفع',
    };
  }
  if (score >= 75) {
    return {
      grade: 'B+',
      isPass: true,
      statusLabel: 'Lulus dengan Baik Sekali',
      badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-400',
      arabicLabel: 'جيد جدا (Jayyid Jiddan)',
    };
  }
  if (score >= 70) {
    return {
      grade: 'B',
      isPass: isPass,
      statusLabel: isPass ? 'Lulus dengan Baik' : 'Belum Memenuhi Batas Kelulusan',
      badgeClass: isPass
        ? 'bg-blue-500/10 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-400'
        : 'bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400',
      arabicLabel: 'جيد (Jayyid)',
    };
  }
  if (score >= 65) {
    return {
      grade: 'B-',
      isPass: isPass,
      statusLabel: isPass ? 'Lulus Cukup Baik' : 'Belum Memenuhi Batas Kelulusan',
      badgeClass: isPass
        ? 'bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400'
        : 'bg-rose-500/10 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400',
      arabicLabel: 'مقبول مرتفع',
    };
  }
  if (score >= 60) {
    return {
      grade: 'C+',
      isPass: isPass,
      statusLabel: isPass ? 'Lulus Cukup' : 'Tidak Lulus',
      badgeClass: isPass
        ? 'bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400'
        : 'bg-rose-500/10 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400',
      arabicLabel: 'مقبول (Maqbul)',
    };
  }

  return {
    grade: 'D',
    isPass: false,
    statusLabel: 'Tidak Lulus / Mengulang Sidang',
    badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400',
    arabicLabel: 'راسب (Rasib)',
  };
}

// Hook React Query untuk mengelola Rubrik Penilaian Sempro & Sidang TA
export function useTaRubricsConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ta-rubrics-config'],
    queryFn: async (): Promise<AllTaRubricsConfig> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', SETTING_KEY_TA_RUBRICS)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching ta_rubrics_config, using default:', error);
        return defaultTaRubrics;
      }

      if (data?.setting_value) {
        try {
          const parsed = JSON.parse(data.setting_value);
          return {
            sempro: {
              ...defaultTaRubrics.sempro,
              ...(parsed.sempro || {}),
              criteria: parsed.sempro?.criteria || defaultTaRubrics.sempro.criteria,
            },
            sidang: {
              ...defaultTaRubrics.sidang,
              ...(parsed.sidang || {}),
              criteria: parsed.sidang?.criteria || defaultTaRubrics.sidang.criteria,
            },
          };
        } catch (e) {
          console.error('Failed to parse ta_rubrics_config JSON:', e);
        }
      }

      return defaultTaRubrics;
    },
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: async (updatedConfig: AllTaRubricsConfig) => {
      const jsonValue = JSON.stringify(updatedConfig);
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { setting_key: SETTING_KEY_TA_RUBRICS, setting_value: jsonValue },
          { onConflict: 'setting_key' }
        );
      if (error) throw error;
      return updatedConfig;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['ta-rubrics-config'], data);
      queryClient.invalidateQueries({ queryKey: ['ta-rubrics-config'] });
      toast.success('Konfigurasi rubrik penilaian berhasil disimpan!');
    },
    onError: (err: any) => {
      toast.error('Gagal menyimpan rubrik penilaian: ' + err.message);
    },
  });

  const getRubric = (type: 'sempro' | 'sidang'): TaRubricConfig => {
    const config = query.data || defaultTaRubrics;
    return config[type] || defaultTaRubrics[type];
  };

  const updateRubricCriteria = async (type: 'sempro' | 'sidang', criteria: TaRubricCriterion[]) => {
    const current = query.data || defaultTaRubrics;
    const updated: AllTaRubricsConfig = {
      ...current,
      [type]: {
        ...current[type],
        criteria,
        updated_at: new Date().toISOString(),
      },
    };
    return mutation.mutateAsync(updated);
  };

  const updatePassingScore = async (type: 'sempro' | 'sidang', min_passing_score: number) => {
    const current = query.data || defaultTaRubrics;
    const updated: AllTaRubricsConfig = {
      ...current,
      [type]: {
        ...current[type],
        min_passing_score,
        updated_at: new Date().toISOString(),
      },
    };
    return mutation.mutateAsync(updated);
  };

  const resetToDefault = async (target?: 'sempro' | 'sidang' | 'all') => {
    const current = query.data || defaultTaRubrics;
    let updated: AllTaRubricsConfig;
    if (target === 'sempro') {
      updated = { ...current, sempro: { ...defaultTaRubrics.sempro, updated_at: new Date().toISOString() } };
    } else if (target === 'sidang') {
      updated = { ...current, sidang: { ...defaultTaRubrics.sidang, updated_at: new Date().toISOString() } };
    } else {
      updated = { ...defaultTaRubrics };
    }
    return mutation.mutateAsync(updated);
  };

  return {
    rubrics: query.data || defaultTaRubrics,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    getRubric,
    saveRubrics: mutation.mutateAsync,
    updateRubricCriteria,
    updatePassingScore,
    resetToDefault,
  };
}
