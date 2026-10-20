import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentTableColumnConfig {
  id: string;
  label: string;
  enabled: boolean;
}

export interface DocumentSignatureConfig {
  id: string;
  role_label: string;
  enabled: boolean;
  use_digital_signature: boolean; // true = pakai signature_url / paraf_url; false = ruang kosong tanda tangan basah
}

export interface SingleDocumentTemplate {
  code: string;
  name: string;
  document_title: string;
  document_subtitle: string;
  show_kop: boolean;
  show_student_info: boolean;
  rules_note_enabled: boolean;
  rules_note_title: string;
  rules_note_text: string;
  columns: DocumentTableColumnConfig[];
  signatures: DocumentSignatureConfig[];
}

export type AllDocumentTemplatesMap = Record<string, SingleDocumentTemplate>;

export const defaultDocumentTemplates: AllDocumentTemplatesMap = {
  kartu_bimbingan_ta: {
    code: 'kartu_bimbingan_ta',
    name: 'Kartu Bimbingan Tugas Akhir',
    document_title: 'KARTU KENDALI BIMBINGAN TUGAS AKHIR',
    document_subtitle: 'PROGRAM STUDI PENDIDIKAN BAHASA ARAB',
    show_kop: true,
    show_student_info: true,
    rules_note_enabled: true,
    rules_note_title: 'Ketentuan & Tata Tertib Bimbingan:',
    rules_note_text:
      '1. Mahasiswa wajib melakukan bimbingan secara berkala minimal 8 (delapan) kali sebelum mendaftar ujian sidang naskah skripsi.\n2. Mahasiswa wajib berbusana rapi, sopan, dan membawa kartu ini beserta catatan perbaikan pada setiap kali berkonsultasi.\n3. Lembar ini adalah bukti autentik kelayakan naskah untuk diajukan ke seminar hasil / sidang munaqasyah.',
    columns: [
      { id: 'no', label: 'No', enabled: true },
      { id: 'date', label: 'Hari / Tanggal', enabled: true },
      { id: 'topic', label: 'Bab / Pokok Bahasan', enabled: true },
      { id: 'notes', label: 'Catatan & Arahan Pembimbing', enabled: true },
      { id: 'advisor_name', label: 'Dosen Pembimbing', enabled: true },
      { id: 'paraf', label: 'Paraf / Validasi', enabled: true },
    ],
    signatures: [
      { id: 'student', role_label: 'Mahasiswa Bersangkutan', enabled: true, use_digital_signature: false },
      { id: 'advisor_1', role_label: 'Dosen Pembimbing I', enabled: true, use_digital_signature: true },
      { id: 'advisor_2', role_label: 'Dosen Pembimbing II', enabled: true, use_digital_signature: true },
      { id: 'kaprodi', role_label: 'Ketua Program Studi', enabled: true, use_digital_signature: true },
    ],
  },

  krs: {
    code: 'krs',
    name: 'Kartu Rencana Studi (KRS)',
    document_title: 'KARTU RENCANA STUDI (KRS)',
    document_subtitle: 'SEMESTER PERKULIAHAN AKTIF',
    show_kop: true,
    show_student_info: true,
    rules_note_enabled: true,
    rules_note_title: 'Ketentuan KRS:',
    rules_note_text:
      '1. Kartu Rencana Studi (KRS) ini merupakan bukti sah kontrak mata kuliah yang diambil mahasiswa pada semester bersangkutan.\n2. Mahasiswa wajib mematuhi seluruh beban studi yang tertera dan memenuhi batas minimal presensi kehadiran perkuliahan 75%.\n3. Dokumen ini sah setelah ditandatangani oleh Dosen Pembimbing Akademik (DPA).',
    columns: [
      { id: 'no', label: 'No', enabled: true },
      { id: 'code', label: 'Kode MK', enabled: true },
      { id: 'name', label: 'Nama Mata Kuliah', enabled: true },
      { id: 'sks', label: 'SKS', enabled: true },
      { id: 'class_group', label: 'Kelas / Rombel', enabled: true },
      { id: 'lecturer', label: 'Dosen Pengampu', enabled: true },
      { id: 'schedule', label: 'Jadwal Kuliah', enabled: false },
    ],
    signatures: [
      { id: 'student', role_label: 'Mahasiswa', enabled: true, use_digital_signature: false },
      { id: 'dpa', role_label: 'Dosen Pembimbing Akademik (DPA)', enabled: true, use_digital_signature: true },
      { id: 'kaprodi', role_label: 'Ketua Program Studi', enabled: true, use_digital_signature: true },
    ],
  },

  kartu_bimbingan_dpa: {
    code: 'kartu_bimbingan_dpa',
    name: 'Kartu Bimbingan Akademik (DPA)',
    document_title: 'KARTU BIMBINGAN AKADEMIK MAHASISWA',
    document_subtitle: 'CATATAN KONSULTASI PERWALIAN STUDI',
    show_kop: true,
    show_student_info: true,
    rules_note_enabled: true,
    rules_note_title: 'Petunjuk Konsultasi Perwalian:',
    rules_note_text:
      '1. Konsultasi bimbingan akademik dengan DPA dilaksanakan minimal 3 (tiga) kali dalam setiap semester (Awal Semester, Tengah Semester, dan Akhir Semester).\n2. Membahas perkembangan capaian IPK, pemilihan rencana studi, kendala pembelajaran, dan penguatan karakter akademik.',
    columns: [
      { id: 'no', label: 'No', enabled: true },
      { id: 'date', label: 'Tanggal Konsultasi', enabled: true },
      { id: 'topic', label: 'Topik / Masalah Konsultasi', enabled: true },
      { id: 'media', label: 'Media Bimbingan', enabled: true },
      { id: 'advisor_feedback', label: 'Arahan & Saran DPA', enabled: true },
      { id: 'paraf', label: 'Paraf DPA', enabled: true },
    ],
    signatures: [
      { id: 'student', role_label: 'Mahasiswa', enabled: true, use_digital_signature: false },
      { id: 'dpa', role_label: 'Dosen Pembimbing Akademik', enabled: true, use_digital_signature: true },
    ],
  },
};

export const SETTING_KEY_DOC_TEMPLATES = 'doc_templates_config';

export function useDocumentTemplatesConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['doc-templates-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('setting_key', SETTING_KEY_DOC_TEMPLATES)
        .maybeSingle();

      if (error) {
        console.error('Error fetching doc templates config:', error);
        return defaultDocumentTemplates;
      }

      if (data?.setting_value) {
        try {
          const parsed = JSON.parse(data.setting_value) as AllDocumentTemplatesMap;
          // Merge with defaults so new documents or keys are safely guaranteed
          const merged: AllDocumentTemplatesMap = { ...defaultDocumentTemplates };
          for (const key of Object.keys(parsed)) {
            if (merged[key]) {
              merged[key] = {
                ...merged[key],
                ...parsed[key],
                columns: parsed[key].columns || merged[key].columns,
                signatures: parsed[key].signatures || merged[key].signatures,
              };
            } else {
              merged[key] = parsed[key];
            }
          }
          return merged;
        } catch (e) {
          console.error('Failed to parse doc_templates_config JSON:', e);
        }
      }

      return defaultDocumentTemplates;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updatedMap: AllDocumentTemplatesMap) => {
      const jsonValue = JSON.stringify(updatedMap);
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { setting_key: SETTING_KEY_DOC_TEMPLATES, setting_value: jsonValue },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;
      return updatedMap;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['doc-templates-config'], data);
      queryClient.invalidateQueries({ queryKey: ['doc-templates-config'] });
      toast.success('Konfigurasi template dokumen berhasil disimpan');
    },
    onError: (err: any) => {
      toast.error('Gagal menyimpan template dokumen: ' + err.message);
    },
  });

  const getTemplate = (code: string): SingleDocumentTemplate => {
    const map = query.data || defaultDocumentTemplates;
    return map[code] || defaultDocumentTemplates[code] || defaultDocumentTemplates.kartu_bimbingan_ta;
  };

  const updateSingleTemplate = (code: string, updated: SingleDocumentTemplate) => {
    const currentMap = query.data || defaultDocumentTemplates;
    const newMap: AllDocumentTemplatesMap = {
      ...currentMap,
      [code]: updated,
    };
    mutation.mutate(newMap);
  };

  return {
    templatesMap: query.data || defaultDocumentTemplates,
    isLoading: query.isLoading,
    getTemplate,
    updateSingleTemplate,
    saveAllTemplates: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
