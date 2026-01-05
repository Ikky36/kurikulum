import { Navbar } from './Navbar';
import { useAppSettings } from '@/hooks/useAppSettings';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { data: settings } = useAppSettings();
  
  const footerText = settings?.footer_text || '© 2024 Student Achievement Tracker PBA. Semua hak dilindungi.';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t bg-card py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>{footerText}</p>
        </div>
      </footer>
    </div>
  );
}
