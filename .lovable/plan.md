## Rencana Implementasi

### 1. Migrasi Database
- Buat tabel `academic_years` (id, name, is_active)
- Buat tabel `semesters` (id, name, order_index, is_active)
- Buat tabel `curriculum_academic_years` (many-to-many antara curricula dan academic_years)
- Tambah kolom `academic_year_id` pada `elearning_classes` dan `course_instructors`

### 2. Halaman Settings
- Tambah manajemen Tahun Akademik (CRUD + toggle aktif/non-aktif)
- Tambah manajemen Semester (CRUD + toggle aktif/non-aktif)
- Tampilkan tahun akademik di tabel kurikulum dan form buat/edit kurikulum

### 3. Halaman E-Learning
- Tambah pilihan tahun akademik saat buat/edit kelas

### 4. Halaman Dashboard
- Tab Penugasan: tambah pilihan kurikulum & tahun akademik saat menugaskan dosen
- Tampilkan tahun akademik di tabel penugasan dosen + filter
- Tambah filter kurikulum di atas tabel penugasan
- Beranda: pindahkan filter kurikulum ke samping, ubah filter angkatan → filter tahun akademik (multi-select)

### 5. Halaman Kurikulum
- Tab MK: Semester diambil dari tabel semesters (bukan hardcode)
- Tambah filter semester di kolom tabel MK

### 6. Notifikasi Real-time
- Gunakan realtime subscription agar notifikasi hilang otomatis saat dikerjakan

### 7. Halaman Mata Kuliah
- Hanya tampilkan MK dengan semester yang aktif
