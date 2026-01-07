import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { BookOpen, ClipboardList, FileText } from 'lucide-react';
import { ElearningKelas } from '@/components/elearning/ElearningKelas';
import { ElearningPresensi } from '@/components/elearning/ElearningPresensi';
import { ElearningMateri } from '@/components/elearning/ElearningMateri';

export default function ELearning() {
  const { user, loading } = useAuth();

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-foreground">E-Learning</h1>
          <p className="text-muted-foreground">
            Kelola kelas, presensi, dan materi pembelajaran
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="kelas" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="kelas" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Kelas</span>
            </TabsTrigger>
            <TabsTrigger value="presensi" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Presensi</span>
            </TabsTrigger>
            <TabsTrigger value="materi" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Materi</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kelas" className="mt-6">
            <ElearningKelas />
          </TabsContent>

          <TabsContent value="presensi" className="mt-6">
            <ElearningPresensi />
          </TabsContent>

          <TabsContent value="materi" className="mt-6">
            <ElearningMateri />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
