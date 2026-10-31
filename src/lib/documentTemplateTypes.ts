import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentTableColumnConfig {
  id: string;
  label: string;
  enabled: boolean;
  is_custom?: boolean;
}

export interface DocumentSignatureConfig {
  id: string;
  role_type?: 'kaprodi' | 'dekan' | 'advisor_1' | 'advisor_2' | 'dpa' | 'student' | 'custom';
  role_label: string;
  enabled: boolean;
  use_digital_signature: boolean; // true = pakai signature_url / paraf_url; false = ruang kosong tanda tangan basah
  signer_status?: 'menyetujui' | 'mengetahui' | 'pemohon';
  custom_name?: string;
  custom_id_number?: string; // NIDN / NUPTK / NIM
}

export interface DocumentStudentBioFieldConfig {
  key: string;        // Variable key in database, e.g. 'nama_mahasiswa', 'nim', 'program_studi', 'judul_tugas_akhir'
  label: string;      // Label displayed, e.g. 'Nama Mahasiswa', 'NIM'
}

export const defaultStudentBioFields: DocumentStudentBioFieldConfig[] = [
  { key: 'nama_mahasiswa', label: 'Nama Mahasiswa' },
  { key: 'nim', label: 'NIM' },
  { key: 'program_studi', label: 'Program Studi' },
  { key: 'tahun_angkatan', label: 'Tahun Masuk / Angkatan' },
];

export interface SingleDocumentTemplate {
  code: string;
  name: string;
  orientation?: 'portrait' | 'landscape'; // Orientasi format cetak dokumen (diatur oleh Admin)
  data_source_module?: string; // 'tugas_akhir' | 'akademik' | 'hasil_studi' | 'kurikulum' dll
  document_title: string;
  document_subtitle: string;
  show_kop: boolean;
  show_footer?: boolean; // Toggle footer resmi dokumen
  show_student_info: boolean;
  student_bio_fields?: DocumentStudentBioFieldConfig[]; // Konfigurasi item biodata yang dipilih dari database

  // Pilihan Jenis Konten: 'all' (Teks & Tabel) | 'text_only' (Hanya Teks Editor) | 'table_only' (Hanya Tabel Builder)
  content_mode?: 'all' | 'text_only' | 'table_only';

  // Teks Narasi / Surat Keterangan (dengan variabel {{nama_mahasiswa}}, dll.)
  body_text_enabled?: boolean;
  body_text_template?: string;

  // Tabel Data Berulang
  table_enabled?: boolean;
  table_dataset_id?: string;
  columns: DocumentTableColumnConfig[];

  // Sub-Bab Catatan / Tata Tertib
  rules_note_enabled: boolean;
  rules_note_title: string;
  rules_note_text: string;

  // Pengesahan (Signatures)
  signatures: DocumentSignatureConfig[];
  show_signature_date?: boolean; // tampilkan kota & tanggal di atas kolom tanda tangan (default: true)
  date_source?: 'last_signature' | 'today'; // mekanisme tanggal: mengikuti pengesahan terakhir atau hari ini

  // Posisi Jarak Blok Tanda Tangan: 'normal' (~2.5 cm setelah konten) | 'compact' (~1.5 cm) | 'spacious' (~4 cm) | 'bottom' (dasar lembar)
  signature_spacing?: 'compact' | 'normal' | 'spacious' | 'bottom';
  // Tata letak pengesahan tunggal jika hanya ada 1 tanda tangan: 'left' | 'center' | 'right' (default: 'center')
  single_signature_align?: 'left' | 'center' | 'right';
  // Jenis Huruf Dokumen (misal: 'Times New Roman' | 'Arial' | 'Calibri' | 'inherit')
  font_family?: string;
  // Kustomisasi Margin Khusus Dokumen Ini (opsional override)
  custom_margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };

  // Tembusan (Carbon Copy / CC)
  copies_enabled?: boolean;
  copies_list?: string[];

  // Penempatan Tombol Cetak di Aplikasi
  placement_targets?: string[];
}

export function getSignatureSpacingClass(spacing?: 'compact' | 'normal' | 'spacious' | 'bottom'): string {
  switch (spacing) {
    case 'compact':
      return 'mt-4 sm:mt-5';
    case 'spacious':
      return 'mt-12 sm:mt-16';
    case 'bottom':
      return 'mt-auto pt-6';
    case 'normal':
    default:
      return 'mt-8 sm:mt-10'; // ~2.5 cm mengalir wajar beberapa cm setelah konten terakhir
  }
}

export type AllDocumentTemplatesMap = Record<string, SingleDocumentTemplate>;

export const defaultDocumentTemplates: AllDocumentTemplatesMap = {
  kartu_bimbingan_ta: {
    code: 'kartu_bimbingan_ta',
    name: 'Kartu Bimbingan Tugas Akhir',
    orientation: 'portrait',
    data_source_module: 'tugas_akhir',
    document_title: 'KARTU KENDALI BIMBINGAN TUGAS AKHIR',
    document_subtitle: 'PROGRAM STUDI PENDIDIKAN BAHASA ARAB',
    show_kop: true,
    show_footer: true,
    show_student_info: true,
    student_bio_fields: [
      { key: 'nama_mahasiswa', label: 'Nama Mahasiswa' },
      { key: 'nim', label: 'NIM' },
      { key: 'program_studi', label: 'Program Studi' },
      { key: 'tahun_angkatan', label: 'Tahun Masuk / Angkatan' },
    ],
    content_mode: 'all',
    body_text_enabled: false,
    body_text_template: 'Dengan ini menerangkan bahwa mahasiswa bernama {{nama_mahasiswa}} NIM {{nim}} telah melaksanakan kegiatan bimbingan skripsi dengan judul: "{{judul_tugas_akhir}}" di bawah bimbingan {{nama_pembimbing_1}}.',
    table_enabled: true,
    table_dataset_id: 'riwayat_bimbingan_ta',
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
      { id: 'student', role_label: 'Mahasiswa Bersangkutan', enabled: true, use_digital_signature: false, signer_status: 'pemohon' },
      { id: 'advisor_1', role_label: 'Dosen Pembimbing I', enabled: true, use_digital_signature: true, signer_status: 'menyetujui' },
      { id: 'advisor_2', role_label: 'Dosen Pembimbing II', enabled: true, use_digital_signature: true, signer_status: 'menyetujui' },
      { id: 'kaprodi', role_label: 'Ketua Program Studi', enabled: true, use_digital_signature: true, signer_status: 'mengetahui' },
    ],
    copies_enabled: false,
    copies_list: ['Dekan Fakultas Tarbiyah', 'Ketua Program Studi PBA', 'Arsip BAAK'],
    placement_targets: ['mahasiswa_tugas_akhir', 'dosen_bimbingan_ta', 'admin_tugas_akhir'],
  },

  krs: {
    code: 'krs',
    name: 'Kartu Rencana Studi (KRS)',
    orientation: 'portrait',
    data_source_module: 'akademik',
    document_title: 'KARTU RENCANA STUDI (KRS)',
    document_subtitle: 'SEMESTER PERKULIAHAN AKTIF',
    show_kop: true,
    show_footer: true,
    show_student_info: true,
    student_bio_fields: [
      { key: 'nama_mahasiswa', label: 'Nama Mahasiswa' },
      { key: 'nim', label: 'NIM' },
      { key: 'program_studi', label: 'Program Studi' },
      { key: 'tahun_angkatan', label: 'Tahun Masuk / Angkatan' },
    ],
    content_mode: 'all',
    body_text_enabled: false,
    body_text_template: 'Berdasarkan data akademik semester berjalan, mahasiswa {{nama_mahasiswa}} (NIM: {{nim}}) telah resmi mengontrak mata kuliah berikut dengan persetujuan Dosen Pembimbing Akademik.',
    table_enabled: true,
    table_dataset_id: 'daftar_mata_kuliah_krs',
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
      { id: 'student', role_label: 'Mahasiswa', enabled: true, use_digital_signature: false, signer_status: 'pemohon' },
      { id: 'dpa', role_label: 'Dosen Pembimbing Akademik (DPA)', enabled: true, use_digital_signature: true, signer_status: 'menyetujui' },
      { id: 'kaprodi', role_label: 'Ketua Program Studi', enabled: true, use_digital_signature: true, signer_status: 'mengetahui' },
    ],
    copies_enabled: false,
    copies_list: ['Mahasiswa Bersangkutan', 'Dosen Pembimbing Akademik', 'Arsip BAAK'],
    placement_targets: ['mahasiswa_krs', 'dosen_perwalian_dpa', 'admin_akademik'],
  },

  kartu_bimbingan_dpa: {
    code: 'kartu_bimbingan_dpa',
    name: 'Kartu Bimbingan Akademik (DPA)',
    orientation: 'portrait',
    data_source_module: 'akademik',
    document_title: 'KARTU BIMBINGAN AKADEMIK MAHASISWA',
    document_subtitle: 'CATATAN KONSULTASI PERWALIAN STUDI',
    show_kop: true,
    show_footer: true,
    show_student_info: true,
    student_bio_fields: [
      { key: 'nama_mahasiswa', label: 'Nama Mahasiswa' },
      { key: 'nim', label: 'NIM' },
      { key: 'program_studi', label: 'Program Studi' },
      { key: 'tahun_angkatan', label: 'Tahun Masuk / Angkatan' },
    ],
    content_mode: 'all',
    body_text_enabled: false,
    body_text_template: 'Lembar kartu perwalian akademik bagi mahasiswa {{nama_mahasiswa}} (NIM {{nim}}) bersama Dosen Pembimbing Akademik {{nama_dpa}}.',
    table_enabled: true,
    table_dataset_id: 'daftar_mata_kuliah_krs',
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
      { id: 'student', role_label: 'Mahasiswa', enabled: true, use_digital_signature: false, signer_status: 'pemohon' },
      { id: 'dpa', role_label: 'Dosen Pembimbing Akademik', enabled: true, use_digital_signature: true, signer_status: 'menyetujui' },
    ],
    copies_enabled: false,
    copies_list: ['Ketua Program Studi', 'Arsip DPA'],
    placement_targets: ['mahasiswa_krs', 'dosen_perwalian_dpa'],
  },

  surat_pengesahan_proposal: {
    code: 'surat_pengesahan_proposal',
    name: 'Surat Pengesahan Proposal (Nota Dinas)',
    orientation: 'portrait',
    data_source_module: 'tugas_akhir',
    document_title: 'NOTA DINAS',
    document_subtitle: '',
    show_kop: false,
    show_footer: false,
    show_student_info: false,
    content_mode: 'text_only',
    body_text_enabled: true,
    body_text_template: `<div style="display: flex; justify-content: flex-end; margin-bottom: 1.25rem; font-size: 13px;">
  <span>{{kota_institusi}}, {{tanggal_cetak}}</span>
</div>

<div style="margin-bottom: 1.5rem; line-height: 1.6; font-size: 13px;">
  <div>Lamp : -</div>
  <div>Hal : Proposal Skripsi Sdri. {{nama_mahasiswa}}</div>
</div>

<div style="margin-bottom: 1.5rem; line-height: 1.5; font-size: 13px;">
  <div>Kepada Yth.</div>
  <div style="font-weight: 700;">Ketua {{nama_kampus}}</div>
  <div>Di tempat</div>
</div>

<div style="margin-bottom: 1rem; font-style: italic; font-size: 13px;">
  Assalamu'alaikum Warahmatullahi Wabarakatuh
</div>

<div style="text-indent: 2.5rem; text-align: justify; margin-bottom: 1rem; line-height: 1.7; font-size: 13px;">
  Setelah membaca, meneliti, dan memberikan bimbingan, perbaikan dan penyempurnaan terhadap proposal skripsi saudari:
</div>

<table style="margin: 0.5rem 0 1rem 2.5rem; border-collapse: collapse; line-height: 1.8; font-size: 13px;">
  <tbody>
    <tr>
      <td style="width: 85px; vertical-align: top;">Nama</td>
      <td style="width: 15px; text-align: center; vertical-align: top;">:</td>
      <td style="font-weight: 600; vertical-align: top;">{{nama_mahasiswa}}</td>
    </tr>
    <tr>
      <td style="vertical-align: top;">NIM</td>
      <td style="text-align: center; vertical-align: top;">:</td>
      <td style="vertical-align: top;">{{nim}}</td>
    </tr>
    <tr>
      <td style="vertical-align: top;">Prodi</td>
      <td style="text-align: center; vertical-align: top;">:</td>
      <td style="vertical-align: top;">{{program_studi}}</td>
    </tr>
    <tr>
      <td style="vertical-align: top;">Judul</td>
      <td style="text-align: center; vertical-align: top;">:</td>
      <td style="vertical-align: top; font-style: italic;">"{{judul_tugas_akhir}}".</td>
    </tr>
  </tbody>
</table>

<div style="text-align: justify; margin-bottom: 1rem; line-height: 1.7; font-size: 13px;">
  Kami berpendapat bahwa proposal skripsi tersebut telah memenuhi syarat dan layak untuk diajukan dalam seminar proposal skripsi.
</div>

<div style="margin-top: 1rem; font-style: italic; font-size: 13px;">
  Wassalamu'alaikum Warahmatullahi Wabarakatuh
</div>`,
    table_enabled: false,
    rules_note_enabled: false,
    rules_note_title: '',
    rules_note_text: '',
    columns: [],
    show_signature_date: false,
    signature_spacing: 'normal',
    single_signature_align: 'right',
    font_family: 'Times New Roman',
    signatures: [
      {
        id: 'advisor_1',
        role_type: 'advisor_1',
        role_label: 'Dosen Pembimbing',
        enabled: true,
        use_digital_signature: true,
        signer_status: 'menyetujui',
      },
    ],
    copies_enabled: false,
    copies_list: [],
    placement_targets: ['mahasiswa_tugas_akhir', 'dosen_bimbingan_ta', 'admin_tugas_akhir'],
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
          const deletedCodes: string[] = (parsed as any)._deleted_codes || [];

          // Mulai dari default template yang belum dihapus oleh Admin
          const merged: AllDocumentTemplatesMap = {};
          for (const key of Object.keys(defaultDocumentTemplates)) {
            if (!deletedCodes.includes(key)) {
              merged[key] = { ...defaultDocumentTemplates[key] };
            }
          }

          // Gabungkan dengan template yang tersimpan di database
          for (const key of Object.keys(parsed)) {
            if (key === '_deleted_codes') continue;
            if (deletedCodes.includes(key)) continue;

            // Normalisasi kode legacy kartu bimbingan: lipat 'kartu_bimbingan_tugas_akhir' ke canonical 'kartu_bimbingan_ta'
            if (key === 'kartu_bimbingan_tugas_akhir') {
              if (!deletedCodes.includes('kartu_bimbingan_ta')) {
                const legacyTa = parsed[key];
                merged['kartu_bimbingan_ta'] = {
                  ...(merged['kartu_bimbingan_ta'] || defaultDocumentTemplates.kartu_bimbingan_ta),
                  ...legacyTa,
                  code: 'kartu_bimbingan_ta',
                  name: legacyTa.name || 'Kartu Bimbingan Tugas Akhir',
                };
              }
              continue; // Hindari duplikasi key di merged
            }

            // Jika template surat_pengesahan_proposal di database masih memakai template generik awal
            if (
              key === 'surat_pengesahan_proposal' &&
              (parsed[key]?.body_text_template?.includes('Dengan ini menerangkan bahwa mahasiswa') || parsed[key]?.document_title === 'SURAT PENGESAHAN PROPOSAL')
            ) {
              merged[key] = { ...defaultDocumentTemplates.surat_pengesahan_proposal, ...parsed[key], document_title: 'NOTA DINAS', show_kop: false, show_footer: false, show_student_info: false, content_mode: 'text_only', table_enabled: false, show_signature_date: false, body_text_template: defaultDocumentTemplates.surat_pengesahan_proposal.body_text_template };
              continue;
            }

            if (merged[key]) {
              merged[key] = {
                ...merged[key],
                ...parsed[key],
                columns: parsed[key].columns || merged[key].columns,
                signatures: parsed[key].signatures || merged[key].signatures,
                single_signature_align: parsed[key].single_signature_align || merged[key].single_signature_align,
                font_family: parsed[key].font_family || merged[key].font_family,
                custom_margins: parsed[key].custom_margins || merged[key].custom_margins,
              };
            } else {
              merged[key] = parsed[key];
            }
          }



          Object.defineProperty(merged, '_deleted_codes', {
            value: deletedCodes,
            enumerable: false,
            writable: true,
            configurable: true,
          });
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
      const deletedCodes = (updatedMap as any)._deleted_codes || [];
      const jsonValue = JSON.stringify({ ...updatedMap, _deleted_codes: deletedCodes });
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

  const getTemplate = (code: string, fallbackModule?: string): SingleDocumentTemplate => {
    const map = query.data || defaultDocumentTemplates;
    const canonicalCode = code === 'kartu_bimbingan_tugas_akhir' ? 'kartu_bimbingan_ta' : code;

    // 1. Cocokkan kode langsung jika ada di template aktif
    if (map[canonicalCode]) return map[canonicalCode];
    if (map[code]) return map[code];

    // 2. Jika mencari template tugas akhir / bimbingan skripsi
    if (code === 'kartu_bimbingan_ta' || code === 'kartu_bimbingan_tugas_akhir') {
      if (map['kartu_bimbingan_ta']) return map['kartu_bimbingan_ta'];
      if (map['kartu_bimbingan_tugas_akhir']) return map['kartu_bimbingan_tugas_akhir'];
    }
    if (
      fallbackModule === 'tugas_akhir' ||
      code.includes('tugas_akhir') ||
      code.includes('bimbingan_ta')
    ) {
      const taTemplate = Object.values(map).find(
        (t) =>
          t.code === 'kartu_bimbingan_tugas_akhir' ||
          t.code === 'kartu_bimbingan_ta' ||
          t.placement_targets?.includes('mahasiswa_tugas_akhir') ||
          t.data_source_module === 'tugas_akhir' ||
          t.code.includes('tugas_akhir') ||
          t.code.includes('bimbingan_ta')
      );
      if (taTemplate) return taTemplate;
    }

    // 3. Jika mencari template KRS
    if (code === 'krs' || fallbackModule === 'akademik') {
      const krsTemplate = Object.values(map).find(
        (t) =>
          t.code === 'krs' ||
          t.placement_targets?.includes('mahasiswa_krs') ||
          t.code.includes('krs')
      );
      if (krsTemplate) return krsTemplate;
    }

    // 4. Jika mencari template DPA
    if (code === 'kartu_bimbingan_dpa') {
      const dpaTemplate = Object.values(map).find(
        (t) =>
          t.code === 'kartu_bimbingan_dpa' ||
          t.placement_targets?.includes('dosen_perwalian_dpa') ||
          t.code.includes('dpa')
      );
      if (dpaTemplate) return dpaTemplate;
    }

    // 5. Fallback ke default sistem bawaan jika belum terhapus
    if (defaultDocumentTemplates[code]) {
      return defaultDocumentTemplates[code];
    }

    const available = Object.values(map);
    return available[0] || defaultDocumentTemplates.kartu_bimbingan_ta;
  };

  const updateSingleTemplate = (code: string, updated: SingleDocumentTemplate) => {
    const canonicalCode = code === 'kartu_bimbingan_tugas_akhir' ? 'kartu_bimbingan_ta' : code;
    const currentMap = { ...(query.data || defaultDocumentTemplates) };
    const deletedCodes: string[] = [...((currentMap as any)._deleted_codes || [])].filter(
      (c) => c !== canonicalCode && c !== code
    );
    if (canonicalCode === 'kartu_bimbingan_ta') {
      delete currentMap['kartu_bimbingan_tugas_akhir'];
    }
    const newMap: AllDocumentTemplatesMap = {
      ...currentMap,
      [canonicalCode]: { ...updated, code: canonicalCode },
    };
    Object.defineProperty(newMap, '_deleted_codes', {
      value: deletedCodes,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    mutation.mutate(newMap);
  };

  const createNewTemplate = (code: string, newTemplate: SingleDocumentTemplate) => {
    const canonicalCode = code === 'kartu_bimbingan_tugas_akhir' ? 'kartu_bimbingan_ta' : code;
    const currentMap = { ...(query.data || defaultDocumentTemplates) };
    const deletedCodes: string[] = [...((currentMap as any)._deleted_codes || [])].filter(
      (c) => c !== canonicalCode && c !== code
    );
    const newMap: AllDocumentTemplatesMap = {
      ...currentMap,
      [canonicalCode]: { ...newTemplate, code: canonicalCode },
    };
    Object.defineProperty(newMap, '_deleted_codes', {
      value: deletedCodes,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    mutation.mutate(newMap);
  };

  const deleteTemplate = (code: string) => {
    const currentMap = { ...(query.data || defaultDocumentTemplates) };
    const deletedCodes: string[] = [...((currentMap as any)._deleted_codes || [])];
    const codesToDelete =
      code === 'kartu_bimbingan_ta' || code === 'kartu_bimbingan_tugas_akhir'
        ? ['kartu_bimbingan_ta', 'kartu_bimbingan_tugas_akhir']
        : [code];

    for (const c of codesToDelete) {
      if (!deletedCodes.includes(c)) {
        deletedCodes.push(c);
      }
      delete currentMap[c];
    }
    Object.defineProperty(currentMap, '_deleted_codes', {
      value: deletedCodes,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    mutation.mutate(currentMap);
  };

  return {
    templatesMap: query.data || defaultDocumentTemplates,
    isLoading: query.isLoading,
    getTemplate,
    updateSingleTemplate,
    createNewTemplate,
    deleteTemplate,
    saveAllTemplates: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
