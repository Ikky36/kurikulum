import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentLayoutSettings {
  // Ukuran Kertas
  paper_size: 'A4' | 'F4';
  orientation: 'portrait' | 'landscape';

  // Margin (dalam milimeter)
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;

  // Kop Surat (Header)
  header_mode: 'text' | 'image' | 'none';
  header_image_url: string;
  header_image_full_bleed?: boolean;   // true: menempel penuh ke tepi kertas (edge-to-edge), false: di dalam margin
  header_image_height_mode?: 'auto' | 'custom'; // 'auto' (rasio asli) vs 'custom' (tinggi mm presisi)
  header_image_height_mm?: number;     // tinggi dalam mm jika custom (default: 35)
  header_logo_left_url: string;
  header_logo_right_url: string;
  institution_line_1: string; // misal: YAYASAN WAKAF PONDOK MODERN GONTOR
  institution_line_2: string; // misal: UNIVERSITAS DARUSSALAM GONTOR
  faculty_name: string;       // misal: FAKULTAS TARBIYAH
  program_name: string;       // misal: PROGRAM STUDI PENDIDIKAN BAHASA ARAB
  address_line: string;       // misal: Jl. Raya Siman Km. 6, Ponorogo, Jawa Timur 63471
  contact_line: string;       // misal: Telp: (0352) 483762 | Email: pba@unida.gontor.ac.id | Web: unida.gontor.ac.id

  // Footer
  footer_enabled: boolean;
  footer_mode: 'text' | 'image';
  footer_text: string;
  footer_image_url: string;
  footer_image_full_bleed?: boolean;   // true: menempel penuh ke batas tepi kertas (0 margin bawah/kiri/kanan), false: di dalam margin
  footer_image_height_mode?: 'auto' | 'custom'; // 'auto' (rasio asli) vs 'custom' (tinggi mm presisi)
  footer_image_height_mm?: number;     // tinggi dalam mm jika custom (default: 20)
  show_page_number: boolean;           // switch aktifkan watermark/keterangan dokumen sah
  footer_watermark_text?: string;      // misal: 'Dokumen Sah Akademik' atau custom

  // Kota & Default Penandatangan
  default_city: string;
  show_signature_date?: boolean;       // tampilkan tanggal di atas tanda tangan (default: true)
  date_source?: 'last_signature' | 'today'; // mekanisme tanggal: mengikuti pengesahan terakhir (default) atau hari ini
  kaprodi_profile_id?: string;
  kaprodi_name: string;
  kaprodi_nidn: string;
  kaprodi_signature_url?: string;
  dekan_profile_id?: string;
  dekan_name: string;
  dekan_nidn: string;
  dekan_signature_url?: string;

  // QR Code & Verifikasi Keabsahan Dokumen
  qr_code_enabled?: boolean;
  qr_code_position?: 'signature_side' | 'footer';
  qr_code_size?: 'small' | 'medium';
  qr_code_show_label?: boolean;

  // Kontrol Tampilan Halaman Verifikasi Publik (Saat QR Code discan)
  qr_verify_show_badge?: boolean;
  qr_verify_show_doc_number?: boolean;
  qr_verify_show_student_name?: boolean;
  qr_verify_show_student_nim?: boolean;
  qr_verify_show_student_prodi?: boolean;
  qr_verify_show_topic_title?: boolean;
  qr_verify_show_signers?: boolean;
  qr_verify_show_timestamps?: boolean;
  qr_verify_show_activity_summary?: boolean;
  qr_verify_show_legal_note?: boolean;
  qr_verify_custom_footer_message?: string;
  qr_verify_header_line_1?: string;
  qr_verify_header_line_2?: string;
  qr_verify_header_subtitle?: string;
  qr_verify_activity_badge_text?: string;
  qr_verify_badge_verified_title?: string;
  qr_verify_badge_verified_label?: string;
  qr_verify_badge_verified_desc?: string;
}

export const defaultDocumentSettings: DocumentLayoutSettings = {
  paper_size: 'A4',
  orientation: 'portrait',

  margin_top: 20,
  margin_bottom: 20,
  margin_left: 25,
  margin_right: 20,

  header_mode: 'text',
  header_image_url: '',
  header_image_full_bleed: true,
  header_image_height_mode: 'custom',
  header_image_height_mm: 35,
  header_logo_left_url: '',
  header_logo_right_url: '',
  institution_line_1: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
  institution_line_2: 'UNIVERSITAS DARUSSALAM GONTOR',
  faculty_name: 'FAKULTAS TARBIYAH',
  program_name: 'PROGRAM STUDI PENDIDIKAN BAHASA ARAB',
  address_line: 'Jl. Raya Siman Km. 6, Siman, Demangan, Ponorogo, Jawa Timur 63471',
  contact_line: 'Telp. (0352) 483762 | Email: pba@unida.gontor.ac.id | Web: unida.gontor.ac.id',

  footer_enabled: true,
  footer_mode: 'text',
  footer_text: 'Dokumen ini diterbitkan secara sah melalui Sistem Informasi Akademik dan dapat diverifikasi keasliannya.',
  footer_image_url: '',
  footer_image_full_bleed: true,
  footer_image_height_mode: 'custom',
  footer_image_height_mm: 20,
  show_page_number: true,
  footer_watermark_text: 'Dokumen Sah Akademik',

  default_city: 'Ponorogo',
  show_signature_date: true,
  date_source: 'last_signature',
  kaprodi_profile_id: '',
  kaprodi_name: '',
  kaprodi_nidn: '',
  kaprodi_signature_url: '',
  dekan_profile_id: '',
  dekan_name: '',
  dekan_nidn: '',
  dekan_signature_url: '',

  // Nilai Baku QR Code & Verifikasi Keabsahan
  qr_code_enabled: true,
  qr_code_position: 'signature_side',
  qr_code_size: 'medium',
  qr_code_show_label: true,

  qr_verify_show_badge: true,
  qr_verify_show_doc_number: true,
  qr_verify_show_student_name: true,
  qr_verify_show_student_nim: true,
  qr_verify_show_student_prodi: true,
  qr_verify_show_topic_title: true,
  qr_verify_show_signers: true,
  qr_verify_show_timestamps: true,
  qr_verify_show_activity_summary: true,
  qr_verify_show_legal_note: true,
  qr_verify_custom_footer_message: 'Dokumen ini diterbitkan secara sah melalui Sistem Informasi Akademik STIT Madani Yogyakarta dan telah diverifikasi keabsahannya.',
  qr_verify_header_line_1: 'SEKOLAH TINGGI ILMU TARBIYAH MADANI',
  qr_verify_header_line_2: 'STIT MADANI YOGYAKARTA',
  qr_verify_header_subtitle: 'Layanan Verifikasi Dokumen & Keabsahan Akademik',
  qr_verify_activity_badge_text: 'Terdaftar di SIAKAD',
  qr_verify_badge_verified_title: 'DOKUMEN RESMI TERVERIFIKASI & SAH',
  qr_verify_badge_verified_label: 'Autentik ✓',
  qr_verify_badge_verified_desc: 'Dokumen ini secara resmi tercatat dalam pangkalan data akademik dan telah dibubuhi stempel tanda tangan digital yang sah oleh pejabat berwenang.',
};

export const SETTING_KEY_DOC_LAYOUT = 'doc_layout_settings';

export function useDocumentSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['document-layout-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('setting_key', SETTING_KEY_DOC_LAYOUT)
        .maybeSingle();

      if (error) {
        console.error('Error fetching document layout settings:', error);
        return defaultDocumentSettings;
      }

      if (data?.setting_value) {
        try {
          const parsed = JSON.parse(data.setting_value);
          const merged: DocumentLayoutSettings = { ...defaultDocumentSettings, ...parsed };

          // Sinkronisasi otomatis tanda tangan digital live dari tabel profiles jika akun ditautkan
          const linkedProfileIds = [merged.kaprodi_profile_id, merged.dekan_profile_id].filter(
            (id): id is string => Boolean(id) && id !== 'manual'
          );

          if (linkedProfileIds.length > 0) {
            try {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, nip, signature_url')
                .in('id', linkedProfileIds);

              if (profiles && profiles.length > 0) {
                const kaprodiProf = profiles.find((p) => p.id === merged.kaprodi_profile_id);
                if (kaprodiProf) {
                  if (kaprodiProf.signature_url) merged.kaprodi_signature_url = kaprodiProf.signature_url;
                  if (!merged.kaprodi_name) merged.kaprodi_name = kaprodiProf.full_name || '';
                  if (!merged.kaprodi_nidn) merged.kaprodi_nidn = kaprodiProf.nip || '';
                }
                const dekanProf = profiles.find((p) => p.id === merged.dekan_profile_id);
                if (dekanProf) {
                  if (dekanProf.signature_url) merged.dekan_signature_url = dekanProf.signature_url;
                  if (!merged.dekan_name) merged.dekan_name = dekanProf.full_name || '';
                  if (!merged.dekan_nidn) merged.dekan_nidn = dekanProf.nip || '';
                }
              }
            } catch (pErr) {
              console.warn('[documentSettings] Gagal sinkronisasi live profiles penandatangan:', pErr);
            }
          }

          return merged;
        } catch (e) {
          console.error('Failed to parse doc_layout_settings JSON:', e);
        }
      }

      return defaultDocumentSettings;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newSettings: DocumentLayoutSettings) => {
      const jsonValue = JSON.stringify(newSettings);
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { setting_key: SETTING_KEY_DOC_LAYOUT, setting_value: jsonValue },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;
      return newSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['document-layout-settings'], data);
      queryClient.invalidateQueries({ queryKey: ['document-layout-settings'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      toast.success('Pengaturan dokumen & kop surat berhasil disimpan');
    },
    onError: (err: any) => {
      toast.error('Gagal menyimpan pengaturan: ' + err.message);
    },
  });

  return {
    settings: query.data || defaultDocumentSettings,
    isLoading: query.isLoading,
    updateSettings: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
