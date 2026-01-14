import { useEffect } from 'react';
import { useAppSettings } from './useAppSettings';

export function useDocumentTitle() {
  const { data: settings } = useAppSettings();

  useEffect(() => {
    if (settings) {
      const title = settings.app_title 
        ? `${settings.app_name} - ${settings.app_title}`
        : settings.app_name;
      document.title = title;
    }
  }, [settings]);
}
