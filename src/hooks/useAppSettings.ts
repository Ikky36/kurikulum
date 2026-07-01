import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AppSettings {
  app_name: string;
  app_title: string;
  app_tagline: string;
  footer_text: string;
  logo_url: string;
  primary_color: string;
  active_semester_type?: string;
  enable_tutorial?: string;
}

const defaultSettings: AppSettings = {
  app_name: 'Tracker PBA',
  app_title: 'Student Achievement Tracker',
  app_tagline: 'Pantau dan kelola nilai mahasiswa Program Bahasa Arab dengan mudah. Visualisasi data yang jelas untuk hasil pembelajaran yang lebih baik.',
  footer_text: '© 2024 Student Achievement Tracker PBA. Semua hak dilindungi.',
  logo_url: '',
  primary_color: '',
  enable_tutorial: 'true',
};

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((s: { setting_key: string; setting_value: string | null }) => {
        settingsMap[s.setting_key] = s.setting_value || '';
      });

      return {
        app_name: settingsMap['app_name'] || defaultSettings.app_name,
        app_title: settingsMap['app_title'] || defaultSettings.app_title,
        app_tagline: settingsMap['app_tagline'] || defaultSettings.app_tagline,
        footer_text: settingsMap['footer_text'] || defaultSettings.footer_text,
        logo_url: settingsMap['logo_url'] || defaultSettings.logo_url,
        primary_color: settingsMap['primary_color'] || defaultSettings.primary_color,
        active_semester_type: settingsMap['active_semester_type'] || 'all',
        enable_tutorial: settingsMap['enable_tutorial'] || defaultSettings.enable_tutorial,
      } as AppSettings;
    },
  });
}

export function useUpdateAppSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
}
