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
  show_page_number: boolean;

  // Kota & Default Penandatangan
  default_city: string;
  kaprodi_name: string;
  kaprodi_nidn: string;
  dekan_name: string;
  dekan_nidn: string;
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
  show_page_number: true,

  default_city: 'Ponorogo',
  kaprodi_name: '',
  kaprodi_nidn: '',
  dekan_name: '',
  dekan_nidn: '',
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
          return { ...defaultDocumentSettings, ...parsed } as DocumentLayoutSettings;
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
