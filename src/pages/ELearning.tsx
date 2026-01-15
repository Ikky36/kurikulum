import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, FileText, BarChart3 } from 'lucide-react';
import { ElearningKelas } from '@/components/elearning/ElearningKelas';
import { ElearningPresensi } from '@/components/elearning/ElearningPresensi';
import { ElearningMateri } from '@/components/elearning/ElearningMateri';
import { Button } from '@/components/ui/button';

export default function ELearning() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();

  const canViewRecap = profile?.role === 'admin' || profile?.role === 'sub_admin' || profile?.role === 'dosen';
  const canViewPresensi = profile?.role === 'admin' || profile?.role === 'sub_admin' || profile?.role === 'dosen';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-bold text-foreground">E-Learning</h1>
            <p className="text-muted-foreground">
              Kelola kelas, presensi, dan materi pembelajaran
            </p>
          </div>
          {canViewRecap && (
            <Button 
              variant="outline" 
              className="gap-2 w-fit"
              onClick={() => navigate('/e-learning/recap')}
            >
              <BarChart3 className="h-4 w-4" />
              Lihat Rekapitulasi
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="kelas" className="w-full">
          <TabsList className={`grid w-full max-w-md h-12 ${canViewPresensi ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="kelas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Kelas</span>
            </TabsTrigger>
            {canViewPresensi && (
              <TabsTrigger value="presensi" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Presensi</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="materi" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Materi</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kelas" className="mt-8">
            <ElearningKelas />
          </TabsContent>

          {canViewPresensi && (
            <TabsContent value="presensi" className="mt-8">
              <ElearningPresensi />
            </TabsContent>
          )}

          <TabsContent value="materi" className="mt-8">
            <ElearningMateri />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
