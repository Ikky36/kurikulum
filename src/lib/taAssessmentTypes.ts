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
  category?: 'A' | 'B'; // 'A': Penilaian Dokumen, 'B': Penilaian Ujian Lisan
  category_name?: string; // 'PENILAIAN DOKUMEN' | 'PENILAIAN UJIAN LISAN'
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
    title: 'Format Penilaian Seminar Proposal',
    description: 'Format penilaian seminar proposal mencakup pendahuluan, tinjauan pustaka, metodologi penelitian, lisan, dan umum.',
    min_passing_score: 66,
    criteria: [
      {
        id: 'sempro_crit_1',
        name: 'PENDAHULUAN',
        description: '- Ketajaman Perumusan Masalah\n- Kesesuaian Tujuan Penelitian dengan Masalah Penelitian\n- Manfaat Penelitian',
        weight: 20,
        max_score: 100,
        order_index: 1,
      },
      {
        id: 'sempro_crit_2',
        name: 'TINJAUAN PUSTAKA',
        description: '- Relevansi dengan Masalah Penelitian\n- Cara Mengutip\n- Kemutakhiran Sumber Pustaka\n- Cara Penyusunan Daftar Pustaka',
        weight: 20,
        max_score: 100,
        order_index: 2,
      },
      {
        id: 'sempro_crit_3',
        name: 'METODOLOGI PENELITIAN',
        description: '- Kesesuaian Rancangan dengan Masalah Penelitian\n- Ketepatan Instrumen Penelitian\n- Ketepatan Metode Analisis Data',
        weight: 30,
        max_score: 100,
        order_index: 3,
      },
      {
        id: 'sempro_crit_4',
        name: 'LISAN',
        description: '- Pemahaman Materi dan Kelancaran Presentasi\n- Ketepatan dan Pemahaman Jawaban',
        weight: 15,
        max_score: 100,
        order_index: 4,
      },
      {
        id: 'sempro_crit_5',
        name: 'UMUM',
        description: '- Sistematika Proposal\n- Keterbacaan\n- Penggunaan Bahasa',
        weight: 15,
        max_score: 100,
        order_index: 5,
      },
    ],
  },
  sidang: {
    id: 'sidang',
    title: 'Format Penilaian Sidang Tugas Akhir',
    description: 'Format penilaian dokumen naskah skripsi dan ujian lisan sidang munaqasyah tugas akhir.',
    min_passing_score: 66,
    criteria: [
      // Kategori A: Penilaian Dokumen (7 Kriteria)
      {
        id: 'sidang_a1',
        name: 'Pemilihan dan perumusan masalah',
        description: 'Kejelasan urgensi, orisinalitas, dan ketajaman perumusan masalah penelitian.',
        weight: 7.14,
        max_score: 100,
        order_index: 1,
        category: 'A',
        category_name: 'PENILAIAN DOKUMEN',
      },
      {
        id: 'sidang_a2',
        name: 'Penggunaan bahasa',
        description: 'Tata bahasa baku, keterbacaan, kebakuan istilah, dan kepatuhan pedoman penulisan karya ilmiah.',
        weight: 7.14,
        max_score: 100,
        order_index: 2,
        category: 'A',
        category_name: 'PENILAIAN DOKUMEN',
      },
      {
        id: 'sidang_a3',
        name: 'Keterkaitan studi kepustakaan dengan masalah',
        description: 'Relevansi telaah pustaka dan kerangka berpikir teoritik terhadap pokok permasalahan.',
        weight: 7.14,
        max_score: 100,
        order_index: 3,
        category: 'A',
        category_name: 'PENILAIAN DOKUMEN',
      },
      {
        id: 'sidang_a4',
        name: 'Kemutakhiran dan relevansi sumber acuan',
        description: 'Kualitas dan kemutakhiran rujukan primer (jurnal bereputasi & literatur otoritatif).',
        weight: 7.14,
        max_score: 100,
        order_index: 4,
        category: 'A',
        category_name: 'PENILAIAN DOKUMEN',
      },
      {
        id: 'sidang_a5',
        name: 'Ketepatan penyajian sosial',
        description: 'Ketepatan penyajian data temuan, konteks sosial penelitian, dan analisis pembahasan.',
        weight: 7.14,
        max_score: 100,
        order_index: 5,
        category: 'A',
        category_name: 'PENILAIAN DOKUMEN',
      },
      {
        id: 'sidang_a6',
        name: 'Keaslian',
        description: 'Integritas akademik, orisinalitas karya, dan bebas plagiarisme.',
        weight: 7.15,
        max_score: 100,
        order_index: 6,
        category: 'A',
        category_name: 'PENILAIAN DOKUMEN',
      },
      {
        id: 'sidang_a7',
        name: 'Kesimpulan manfaat',
        description: 'Ketepatan penarikan kesimpulan dan kontribusi manfaat teoritis serta praktis.',
        weight: 7.15,
        max_score: 100,
        order_index: 7,
        category: 'A',
        category_name: 'PENILAIAN DOKUMEN',
      },

      // Kategori B: Penilaian Ujian Lisan (6 Kriteria)
      {
        id: 'sidang_b1',
        name: 'Kemampuan mengungkap / menguraikan pendapat',
        description: 'Kemampuan artikulasi ilmiah dan kejelasan dalam menguraikan argumen.',
        weight: 8.33,
        max_score: 100,
        order_index: 8,
        category: 'B',
        category_name: 'PENILAIAN UJIAN LISAN',
      },
      {
        id: 'sidang_b2',
        name: 'Teknik presentasi',
        description: 'Kerapian media presentasi, alokasi waktu, dan ketepatan penyampaian poin inti.',
        weight: 8.33,
        max_score: 100,
        order_index: 9,
        category: 'B',
        category_name: 'PENILAIAN UJIAN LISAN',
      },
      {
        id: 'sidang_b3',
        name: 'Keterbukaan terhadap pernyataan / saran penguji',
        description: 'Sikap santun, daya kritis, dan penerimaan terhadap masukan dewan penguji.',
        weight: 8.33,
        max_score: 100,
        order_index: 10,
        category: 'B',
        category_name: 'PENILAIAN UJIAN LISAN',
      },
      {
        id: 'sidang_b4',
        name: 'Penguasaan materi',
        description: 'Kedalaman pemahaman teori, konsep, dan metodologi yang diterapkan pada skripsi.',
        weight: 8.33,
        max_score: 100,
        order_index: 11,
        category: 'B',
        category_name: 'PENILAIAN UJIAN LISAN',
      },
      {
        id: 'sidang_b5',
        name: 'Kebenaran / ketetapan jawaban',
        description: 'Ketepatan logika, akurasi fakta, dan ketajaman dalil dalam merespons pertanyaan.',
        weight: 8.34,
        max_score: 100,
        order_index: 12,
        category: 'B',
        category_name: 'PENILAIAN UJIAN LISAN',
      },
      {
        id: 'sidang_b6',
        name: 'Penampilan umum',
        description: 'Kerapian busana formal persidangan, etika akademik, dan sikap selama persidangan.',
        weight: 8.34,
        max_score: 100,
        order_index: 13,
        category: 'B',
        category_name: 'PENILAIAN UJIAN LISAN',
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
  rawScores: Record<string, number | any>
): {
  finalScore: number;
  details: TaExaminerScoreItem[];
  isComplete: boolean;
  avgA?: number;
  avgB?: number;
} {
  let totalWeightedScore = 0;
  let isComplete = true;

  const hasCategories = criteria.some((c) => c.category === 'A') && criteria.some((c) => c.category === 'B');
  let sumScoreA = 0;
  let countA = 0;
  let sumScoreB = 0;
  let countB = 0;

  const details: TaExaminerScoreItem[] = criteria.map((crit) => {
    const rawVal = rawScores[crit.id];
    const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
    const raw = !isNaN(numVal) ? Math.min(100, Math.max(0, numVal)) : 0;
    if (rawVal === undefined || rawVal === null || rawVal === '' || isNaN(numVal)) {
      isComplete = false;
    }
    const weighted = Math.round((raw * (crit.weight / 100)) * 100) / 100;
    totalWeightedScore += weighted;

    if (crit.category === 'A') {
      sumScoreA += raw;
      countA++;
    } else if (crit.category === 'B') {
      sumScoreB += raw;
      countB++;
    }

    return {
      criterion_id: crit.id,
      criterion_name: crit.name,
      weight: crit.weight,
      max_score: crit.max_score || 100,
      raw_score: raw,
      weighted_score: weighted,
    };
  });

  let finalScore = Math.round(totalWeightedScore * 100) / 100;
  let avgA: number | undefined;
  let avgB: number | undefined;

  if (hasCategories && countA > 0 && countB > 0) {
    avgA = Math.round((sumScoreA / countA) * 100) / 100;
    avgB = Math.round((sumScoreB / countB) * 100) / 100;
    finalScore = Math.round(((avgA + avgB) / 2) * 100) / 100;
  }

  return {
    finalScore,
    details,
    isComplete,
    avgA,
    avgB,
  };
}

// Helper: Menentukan Predikat Huruf & Keterangan Kelulusan berdasarkan nilai angka resmi
export function determineGradeFromScore(
  score: number,
  minPassingScore: number = 66
): {
  grade: string;
  isPass: boolean;
  statusLabel: string;
  badgeClass: string;
  arabicLabel: string;
} {
  const isPass = score >= minPassingScore;

  if (score >= 91) {
    return {
      grade: 'A',
      isPass: true,
      statusLabel: 'Lulus dengan Sangat Memuaskan (Mumtaz)',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400',
      arabicLabel: 'ممتاز (Mumtaz)',
    };
  }
  if (score >= 81) {
    return {
      grade: 'A-',
      isPass: true,
      statusLabel: 'Lulus dengan Sangat Baik',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400',
      arabicLabel: 'جيد جدا مرتفع',
    };
  }
  if (score >= 71) {
    return {
      grade: 'B+',
      isPass: true,
      statusLabel: 'Lulus dengan Baik Sekali',
      badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-400',
      arabicLabel: 'جيد جدا (Jayyid Jiddan)',
    };
  }
  if (score >= 66) {
    return {
      grade: 'B',
      isPass: true,
      statusLabel: 'Lulus dengan Baik',
      badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-400',
      arabicLabel: 'جيد (Jayyid)',
    };
  }
  if (score >= 61) {
    return {
      grade: 'C+',
      isPass: isPass,
      statusLabel: isPass ? 'Lulus Cukup' : 'Belum Memenuhi Batas Kelulusan',
      badgeClass: isPass
        ? 'bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400'
        : 'bg-rose-500/10 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400',
      arabicLabel: 'مقبول (Maqbul)',
    };
  }
  if (score >= 46) {
    return {
      grade: 'D',
      isPass: false,
      statusLabel: 'Kurang / Mengulang Ujian',
      badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400',
      arabicLabel: 'راسب (D)',
    };
  }

  return {
    grade: 'E',
    isPass: false,
    statusLabel: 'Gagal / Mengulang Ujian',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/30',
    arabicLabel: 'راسب (E)',
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
          const semproCriteria =
            parsed.sempro?.criteria &&
            parsed.sempro.criteria.length === 5 &&
            parsed.sempro.criteria[0]?.name === 'PENDAHULUAN'
              ? parsed.sempro.criteria
              : defaultTaRubrics.sempro.criteria;

          return {
            sempro: {
              ...defaultTaRubrics.sempro,
              ...(parsed.sempro || {}),
              criteria: semproCriteria,
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

// Helper: Generate token unik untuk penguji atau ketua sidang
export function generateAssessmentToken(prefix: 'ex' | 'ch' = 'ex'): string {
  const randPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 24)
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
  return `${prefix}_${randPart}`;
}

// Helper: Membangun URL tautan evaluasi penguji atau ketua sidang
export function getAssessmentUrl(role: 'penguji' | 'ketua-sidang', token: string): string {
  if (!token) return '';
  if (typeof window === 'undefined') return `/evaluasi-ta/${role}?token=${encodeURIComponent(token)}`;
  const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
  return `${origin}/evaluasi-ta/${role}?token=${encodeURIComponent(token.trim())}`;
}

// Helper: Membangun pesan WhatsApp rapi untuk Penguji
export function buildExaminerWhatsAppMessage(params: {
  examinerName: string;
  examinerRole: string;
  studentName: string;
  studentNim: string;
  studentProdi?: string;
  taTitle: string;
  seminarType: 'sempro' | 'sidang';
  scheduleDate?: string | null;
  room?: string | null;
  token: string;
}): string {
  const phaseLabel = params.seminarType === 'sempro' ? 'Seminar Proposal Skripsi' : 'Sidang Munaqasyah Skripsi';
  const evaluationUrl = getAssessmentUrl('penguji', params.token);

  let dateStr = 'Belum ditentukan';
  let timeStr = '-';
  if (params.scheduleDate) {
    const d = new Date(params.scheduleDate);
    dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  }

  return `*UNDANGAN & TAUTAN PENILAIAN ${phaseLabel.toUpperCase()}*
_STITMA Yogyakarta_

Kepada Yth.
*${params.examinerName}*
Bertindak sebagai: *${params.examinerRole}*

Dengan hormat, kami memohon kesediaan Bapak/Ibu untuk menguji pada agenda ujian mahasiswa berikut:

👤 *Mahasiswa:* ${params.studentName} (${params.studentNim})
📚 *Program Studi:* ${params.studentProdi || 'Pendidikan Bahasa Arab'}
📝 *Judul Tugas Akhir:*
"${params.taTitle}"

🗓️ *Hari/Tanggal:* ${dateStr}
⏰ *Pukul:* ${timeStr}
📍 *Ruangan:* ${params.room || 'Ruang Sidang STITMA'}

Silakan membuka tautan evaluasi berikut untuk mengisi nilai rubrik dan membubuhkan tanda tangan secara langsung tanpa perlu login:
👉 ${evaluationUrl}

Atas perhatian, bimbingan, dan kerja samanya, kami ucapkan terima kasih.
_Panitia Ujian Tugas Akhir STITMA Yogyakarta_`;
}

// Helper: Membangun pesan WhatsApp rapi untuk Ketua Sidang
export function buildChairpersonWhatsAppMessage(params: {
  chairpersonName: string;
  studentName: string;
  studentNim: string;
  studentProdi?: string;
  taTitle: string;
  seminarType: 'sempro' | 'sidang';
  scheduleDate?: string | null;
  room?: string | null;
  token: string;
}): string {
  const phaseLabel = params.seminarType === 'sempro' ? 'Seminar Proposal Skripsi' : 'Sidang Munaqasyah Skripsi';
  const chairpersonUrl = getAssessmentUrl('ketua-sidang', params.token);

  let dateStr = 'Belum ditentukan';
  let timeStr = '-';
  if (params.scheduleDate) {
    const d = new Date(params.scheduleDate);
    dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  }

  return `*UNDANGAN & PENGESAHAN KETUA SIDANG - ${phaseLabel.toUpperCase()}*
_STITMA Yogyakarta_

Kepada Yth.
*${params.chairpersonName}*
Bertindak sebagai: *Ketua Sidang*

Dengan hormat, kami mengundang Bapak/Ibu untuk memimpin jalannya agenda ${phaseLabel} mahasiswa berikut:

👤 *Mahasiswa:* ${params.studentName} (${params.studentNim})
📚 *Program Studi:* ${params.studentProdi || 'Pendidikan Bahasa Arab'}
📝 *Judul Tugas Akhir:*
"${params.taTitle}"

🗓️ *Hari/Tanggal:* ${dateStr}
⏰ *Pukul:* ${timeStr}
📍 *Ruangan:* ${params.room || 'Ruang Sidang STITMA'}

Melalui tautan di bawah ini, Bapak/Ibu dapat memantau perolehan skor dari dewan penguji secara real-time, menetapkan status kelulusan, dan mengesahkan Berita Acara tanpa perlu login:
👉 ${chairpersonUrl}

Atas kesediaan dan kerja samanya, kami ucapkan terima kasih.
_Panitia Ujian Tugas Akhir STITMA Yogyakarta_`;
}

