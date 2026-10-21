import { LucideIcon } from 'lucide-react';

export interface DatabaseVariable {
  key: string;               // e.g. 'nama_mahasiswa' -> inserted as {{nama_mahasiswa}}
  label: string;             // e.g. 'Nama Lengkap Mahasiswa'
  category: 'mahasiswa' | 'dosen' | 'tugas_akhir' | 'akademik' | 'kurikulum' | 'institusi';
  exampleValue: string;      // Used for live print preview
  description?: string;
}

export interface TableColumnDefinition {
  id: string;
  label: string;
  description?: string;
  defaultEnabled: boolean;
}

export interface TableDatasetDefinition {
  datasetId: string;
  label: string;
  description: string;
  availableColumns: TableColumnDefinition[];
}

export interface PlacementOption {
  id: string;
  label: string;
  page: string;
  targetRole: 'mahasiswa' | 'dosen' | 'admin' | 'all';
}

export interface DocumentModuleDefinition {
  id: string;
  name: string;
  description: string;
  badgeColor?: string;
  textVariables: DatabaseVariable[];
  tableDatasets: TableDatasetDefinition[];
  placements: PlacementOption[];
}

// ==========================================
// REGISTRI MODUL SUMBER DATA (PLUG-AND-PLAY)
// ==========================================

export const DOCUMENT_DATA_SOURCE_MODULES: Record<string, DocumentModuleDefinition> = {
  // 1. MODUL TUGAS AKHIR & SKRIPSI
  tugas_akhir: {
    id: 'tugas_akhir',
    name: 'Modul Tugas Akhir & Skripsi',
    description: 'Data bimbingan, dosen pembimbing, penguji, dan judul tugas akhir mahasiswa.',
    textVariables: [
      { key: 'nama_mahasiswa', label: 'Nama Mahasiswa', category: 'mahasiswa', exampleValue: 'Ahmad Fauzi Mubarak' },
      { key: 'nim', label: 'NIM Mahasiswa', category: 'mahasiswa', exampleValue: '4220261109' },
      { key: 'program_studi', label: 'Program Studi', category: 'mahasiswa', exampleValue: 'Pendidikan Bahasa Arab' },
      { key: 'fakultas', label: 'Fakultas', category: 'mahasiswa', exampleValue: 'Fakultas Tarbiyah' },
      { key: 'tahun_angkatan', label: 'Tahun Masuk / Angkatan', category: 'mahasiswa', exampleValue: '2023' },
      
      { key: 'judul_tugas_akhir', label: 'Judul Tugas Akhir / Skripsi', category: 'tugas_akhir', exampleValue: 'Efektivitas Media Pembelajaran Interaktif Berbasis AI dalam Pembelajaran Nahwu' },
      { key: 'tanggal_pengajuan_ta', label: 'Tanggal Pengajuan TA', category: 'tugas_akhir', exampleValue: '12 Januari 2026' },
      { key: 'status_tugas_akhir', label: 'Status Tugas Akhir', category: 'tugas_akhir', exampleValue: 'Aktif Bimbingan' },
      { key: 'total_pertemuan_bimbingan', label: 'Total Bimbingan Selesai', category: 'tugas_akhir', exampleValue: '8 Kali' },

      { key: 'nama_pembimbing_1', label: 'Nama Dosen Pembimbing I', category: 'dosen', exampleValue: 'Dr. H. Ahmad Hidayat, M.A.' },
      { key: 'nidn_pembimbing_1', label: 'NIDN Pembimbing I', category: 'dosen', exampleValue: '0712057801' },
      { key: 'nama_pembimbing_2', label: 'Nama Dosen Pembimbing II', category: 'dosen', exampleValue: 'Ust. Zulkifli Hayad, M.Pd.' },
      { key: 'nidn_pembimbing_2', label: 'NIDN Pembimbing II', category: 'dosen', exampleValue: '0728098902' },

      { key: 'tanggal_cetak', label: 'Tanggal Cetak (Otomatis Hari Ini)', category: 'institusi', exampleValue: '21 Oktober 2026' },
      { key: 'kota_institusi', label: 'Kota Kampus', category: 'institusi', exampleValue: 'Ponorogo' },
      { key: 'nama_kampus', label: 'Nama Perguruan Tinggi', category: 'institusi', exampleValue: 'STIT Madani Yogyakarta' },
      { key: 'nama_kaprodi', label: 'Nama Ketua Program Studi', category: 'institusi', exampleValue: 'Dr. M. Ridwan, M.Pd.I' },
      { key: 'nidn_kaprodi', label: 'NIDN Kaprodi', category: 'institusi', exampleValue: '0715088203' },
      { key: 'nama_dekan', label: 'Nama Dekan', category: 'institusi', exampleValue: 'Prof. Dr. KH. Syamsuddin, M.Ag.' },
      { key: 'nidn_dekan', label: 'NIDN Dekan', category: 'institusi', exampleValue: '0702046501' },
    ],
    tableDatasets: [
      {
        datasetId: 'riwayat_bimbingan_ta',
        label: 'Tabel Riwayat Konsultasi Bimbingan',
        description: 'Daftar pertemuan bimbingan tugas akhir dengan catatan dan paraf dosen.',
        availableColumns: [
          { id: 'no', label: 'No', defaultEnabled: true },
          { id: 'date', label: 'Hari / Tanggal', defaultEnabled: true },
          { id: 'topic', label: 'Bab / Pokok Bahasan', defaultEnabled: true },
          { id: 'notes', label: 'Catatan & Arahan Pembimbing', defaultEnabled: true },
          { id: 'advisor_name', label: 'Dosen Pembimbing', defaultEnabled: true },
          { id: 'paraf', label: 'Paraf Pembimbing', defaultEnabled: true },
        ],
      },
    ],
    placements: [
      { id: 'mahasiswa_tugas_akhir', label: 'Halaman Tugas Akhir Mahasiswa', page: '/tugas-akhir', targetRole: 'mahasiswa' },
      { id: 'dosen_bimbingan_ta', label: 'Halaman Bimbingan Skripsi Dosen', page: '/dosen/bimbingan-ta', targetRole: 'dosen' },
      { id: 'admin_tugas_akhir', label: 'Halaman Kelola Tugas Akhir Admin', page: '/admin/tugas-akhir', targetRole: 'admin' },
    ],
  },

  // 2. MODUL AKADEMIK (KRS & KHS)
  akademik: {
    id: 'akademik',
    name: 'Modul Akademik (KRS & Perkuliahan)',
    description: 'Data kontrak kuliah (KRS), beban SKS, semester berjalan, dan Dosen Pembimbing Akademik.',
    textVariables: [
      { key: 'nama_mahasiswa', label: 'Nama Mahasiswa', category: 'mahasiswa', exampleValue: 'Fatimah Az-Zahra' },
      { key: 'nim', label: 'NIM Mahasiswa', category: 'mahasiswa', exampleValue: '4220261188' },
      { key: 'program_studi', label: 'Program Studi', category: 'mahasiswa', exampleValue: 'Pendidikan Bahasa Arab' },
      { key: 'tahun_angkatan', label: 'Tahun Angkatan', category: 'mahasiswa', exampleValue: '2023' },
      { key: 'semester_aktif', label: 'Semester Berjalan', category: 'akademik', exampleValue: 'Semester Ganjil V' },
      { key: 'tahun_akademik', label: 'Tahun Akademik', category: 'akademik', exampleValue: '2026/2027' },
      { key: 'total_sks_semester', label: 'Total SKS Semester Ini', category: 'akademik', exampleValue: '22 SKS' },
      { key: 'ipk_terakhir', label: 'IPK Terakhir', category: 'akademik', exampleValue: '3.82' },

      { key: 'nama_dpa', label: 'Nama Dosen Pembimbing Akademik (DPA)', category: 'dosen', exampleValue: 'Drs. H. Mulyono, M.Pd.' },
      { key: 'nidn_dpa', label: 'NIDN DPA', category: 'dosen', exampleValue: '0711037502' },

      { key: 'tanggal_cetak', label: 'Tanggal Cetak (Otomatis Hari Ini)', category: 'institusi', exampleValue: '21 Oktober 2026' },
      { key: 'nama_kampus', label: 'Nama Perguruan Tinggi', category: 'institusi', exampleValue: 'STIT Madani Yogyakarta' },
      { key: 'nama_kaprodi', label: 'Nama Kaprodi', category: 'institusi', exampleValue: 'Dr. M. Ridwan, M.Pd.I' },
      { key: 'nidn_kaprodi', label: 'NIDN Kaprodi', category: 'institusi', exampleValue: '0715088203' },
    ],
    tableDatasets: [
      {
        datasetId: 'daftar_mata_kuliah_krs',
        label: 'Tabel Kontrak Mata Kuliah (KRS)',
        description: 'Daftar mata kuliah yang dikontrak mahasiswa pada semester aktif.',
        availableColumns: [
          { id: 'no', label: 'No', defaultEnabled: true },
          { id: 'code', label: 'Kode MK', defaultEnabled: true },
          { id: 'name', label: 'Nama Mata Kuliah', defaultEnabled: true },
          { id: 'sks', label: 'SKS', defaultEnabled: true },
          { id: 'class_group', label: 'Kelas / Rombel', defaultEnabled: true },
          { id: 'lecturer', label: 'Dosen Pengampu', defaultEnabled: true },
          { id: 'schedule', label: 'Jadwal Hari & Jam', defaultEnabled: false },
          { id: 'room', label: 'Ruang Kuliah', defaultEnabled: false },
        ],
      },
    ],
    placements: [
      { id: 'mahasiswa_krs', label: 'Halaman KRS Mahasiswa', page: '/krs', targetRole: 'mahasiswa' },
      { id: 'dosen_perwalian_dpa', label: 'Halaman Perwalian DPA Dosen', page: '/dosen/perwalian', targetRole: 'dosen' },
      { id: 'admin_akademik', label: 'Halaman Akademik Admin', page: '/admin/krs', targetRole: 'admin' },
    ],
  },

  // 3. MODUL HASIL STUDI & TRANSKRIP (KHS)
  hasil_studi: {
    id: 'hasil_studi',
    name: 'Modul Hasil Studi & Nilai (KHS)',
    description: 'Data nilai perkuliahan, indeks prestasi semester (IPS), dan indeks prestasi kumulatif (IPK).',
    textVariables: [
      { key: 'nama_mahasiswa', label: 'Nama Mahasiswa', category: 'mahasiswa', exampleValue: 'Muhammad Farhan' },
      { key: 'nim', label: 'NIM Mahasiswa', category: 'mahasiswa', exampleValue: '4220261102' },
      { key: 'program_studi', label: 'Program Studi', category: 'mahasiswa', exampleValue: 'Pendidikan Bahasa Arab' },
      { key: 'semester_angka', label: 'Semester', category: 'akademik', exampleValue: '4 (Empat)' },
      { key: 'tahun_akademik', label: 'Tahun Akademik', category: 'akademik', exampleValue: '2026/2027 Ganjil' },
      { key: 'ips', label: 'Indeks Prestasi Semester (IPS)', category: 'akademik', exampleValue: '3.75' },
      { key: 'ipk', label: 'Indeks Prestasi Kumulatif (IPK)', category: 'akademik', exampleValue: '3.80' },
      { key: 'total_sks_lulus', label: 'Total SKS Lulus', category: 'akademik', exampleValue: '88 SKS' },
      { key: 'nama_dpa', label: 'Nama Dosen PA', category: 'dosen', exampleValue: 'Drs. H. Mulyono, M.Pd.' },
      { key: 'nidn_dpa', label: 'NIDN Dosen PA', category: 'dosen', exampleValue: '0711037502' },
      { key: 'tanggal_cetak', label: 'Tanggal Cetak', category: 'institusi', exampleValue: '21 Oktober 2026' },
      { key: 'nama_kaprodi', label: 'Nama Kaprodi', category: 'institusi', exampleValue: 'Dr. M. Ridwan, M.Pd.I' },
    ],
    tableDatasets: [
      {
        datasetId: 'tabel_nilai_khs',
        label: 'Tabel Rincian Nilai Mata Kuliah',
        description: 'Daftar nilai mata kuliah semester lengkap dengan bobot dan grade.',
        availableColumns: [
          { id: 'no', label: 'No', defaultEnabled: true },
          { id: 'code', label: 'Kode MK', defaultEnabled: true },
          { id: 'name', label: 'Mata Kuliah', defaultEnabled: true },
          { id: 'sks', label: 'SKS', defaultEnabled: true },
          { id: 'grade', label: 'Nilai Huruf', defaultEnabled: true },
          { id: 'score_number', label: 'Nilai Angka (Indeks)', defaultEnabled: true },
          { id: 'bobot', label: 'Mutu (SKS x Indeks)', defaultEnabled: true },
        ],
      },
    ],
    placements: [
      { id: 'mahasiswa_khs', label: 'Halaman KHS / Nilai Mahasiswa', page: '/khs', targetRole: 'mahasiswa' },
      { id: 'dosen_nilai', label: 'Halaman Input Nilai Dosen', page: '/dosen/nilai', targetRole: 'dosen' },
      { id: 'admin_nilai', label: 'Halaman Nilai Admin', page: '/admin/nilai', targetRole: 'admin' },
    ],
  },

  // 4. MODUL KURIKULUM & CPL
  kurikulum: {
    id: 'kurikulum',
    name: 'Modul Kurikulum & Capaian (OBE)',
    description: 'Data profil lulusan, capaian pembelajaran lulusan (CPL), dan struktur mata kuliah.',
    textVariables: [
      { key: 'nama_kurikulum', label: 'Nama Dokumen Kurikulum', category: 'kurikulum', exampleValue: 'Kurikulum OBE PBA STITMA 2026' },
      { key: 'tahun_berlaku', label: 'Tahun Mulai Berlaku', category: 'kurikulum', exampleValue: '2026 - 2030' },
      { key: 'program_studi', label: 'Program Studi', category: 'kurikulum', exampleValue: 'Pendidikan Bahasa Arab' },
      { key: 'total_sks_kurikulum', label: 'Total SKS Kurikulum', category: 'kurikulum', exampleValue: '144 SKS' },
      { key: 'nama_kaprodi', label: 'Ketua Tim Pengembang / Kaprodi', category: 'institusi', exampleValue: 'Dr. M. Ridwan, M.Pd.I' },
      { key: 'tanggal_penetapan', label: 'Tanggal Penetapan SK', category: 'institusi', exampleValue: '1 Agustus 2026' },
    ],
    tableDatasets: [
      {
        datasetId: 'tabel_struktur_matakuliah',
        label: 'Tabel Sebaran Mata Kuliah Per Semester',
        description: 'Daftar seluruh mata kuliah yang ditawarkan dalam kurikulum.',
        availableColumns: [
          { id: 'no', label: 'No', defaultEnabled: true },
          { id: 'code', label: 'Kode MK', defaultEnabled: true },
          { id: 'name', label: 'Nama Mata Kuliah', defaultEnabled: true },
          { id: 'semester', label: 'Semester', defaultEnabled: true },
          { id: 'sks', label: 'SKS', defaultEnabled: true },
          { id: 'category', label: 'Kelompok MK (Wajib/Pilihan)', defaultEnabled: true },
        ],
      },
    ],
    placements: [
      { id: 'admin_kurikulum', label: 'Halaman Kurikulum Admin', page: '/kurikulum', targetRole: 'admin' },
      { id: 'dosen_kurikulum', label: 'Halaman Referensi Kurikulum Dosen', page: '/kurikulum', targetRole: 'dosen' },
    ],
  },
};

// ==========================================
// UTILITY FUNCTIONS & VARIABLE PARSERS
// ==========================================

export function getAllDataSourceModules(): DocumentModuleDefinition[] {
  return Object.values(DOCUMENT_DATA_SOURCE_MODULES);
}

export function getDataSourceModuleById(moduleId: string): DocumentModuleDefinition {
  return DOCUMENT_DATA_SOURCE_MODULES[moduleId] || DOCUMENT_DATA_SOURCE_MODULES.tugas_akhir;
}

/**
 * Menggantikan tag {{nama_variabel}} pada template dengan nilai asli / dummy
 */
export function interpolateVariables(templateText: string, dataContext: Record<string, any>): string {
  if (!templateText) return '';
  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return dataContext[key] !== undefined ? String(dataContext[key]) : `{{${key}}}`;
  });
}

/**
 * Menyusun data dummy lengkap untuk pratinjau live di layar Admin
 */
export function getDummyContextForModule(moduleId: string, customSettings?: any): Record<string, string> {
  const mod = getDataSourceModuleById(moduleId);
  const context: Record<string, string> = {};

  // Isi dari database variables
  mod.textVariables.forEach((v) => {
    context[v.key] = v.exampleValue;
  });

  // Tambahkan fallback global jika ada di customSettings (nama kampus, dekan, kaprodi)
  if (customSettings) {
    if (customSettings.institution_line_2) context.nama_kampus = customSettings.institution_line_2;
    if (customSettings.faculty_name) context.fakultas = customSettings.faculty_name;
    if (customSettings.kaprodi_name) context.nama_kaprodi = customSettings.kaprodi_name;
    if (customSettings.kaprodi_nidn) context.nidn_kaprodi = customSettings.kaprodi_nidn;
    if (customSettings.dekan_name) context.nama_dekan = customSettings.dekan_name;
    if (customSettings.dekan_nidn) context.nidn_dekan = customSettings.dekan_nidn;
    if (customSettings.default_city) context.kota_institusi = customSettings.default_city;
  }

  return context;
}
