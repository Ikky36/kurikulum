import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t bg-card py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 Student Achievement Tracker PBA. Semua hak dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
