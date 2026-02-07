import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, FileText, BarChart3, Scale, ArrowLeft, LogIn } from 'lucide-react';
import { ElearningKelas } from '@/components/elearning/ElearningKelas';
import { ElearningPresensi } from '@/components/elearning/ElearningPresensi';
import { ElearningMateri } from '@/components/elearning/ElearningMateri';
import { Button } from '@/components/ui/button';

interface SelectedClassInfo {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  classGroupName: string;
}

export default function ELearning() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState<SelectedClassInfo | null>(null);


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

  const handleEnterClass = (classInfo: SelectedClassInfo) => {
    setSelectedClass(classInfo);
  };

  const handleBackToClassList = () => {
    setSelectedClass(null);
  };

  return (
    <Layout>
      <div className="space-y-8 px-4 sm:px-6 lg:px-10 xl:px-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            {selectedClass ? (
              <>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBackToClassList}
                    className="h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">{selectedClass.title}</h1>
                    <p className="text-muted-foreground">
                      {selectedClass.courseName} • {selectedClass.classGroupName}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-display font-bold text-foreground">E-Learning</h1>
                <p className="text-muted-foreground">
                  Kelola kelas, presensi, dan materi pembelajaran
                </p>
              </>
            )}
          </div>
          {canViewRecap && !selectedClass && (
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


        {/* Content */}
        {selectedClass ? (
          // Class Detail View with Tabs
          <Tabs defaultValue="materi" className="w-full">
            <TabsList className={`grid w-full max-w-lg h-12 ${canViewPresensi ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {canViewPresensi && (
                <TabsTrigger value="presensi" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Presensi</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="materi" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Materi</span>
              </TabsTrigger>
              <TabsTrigger value="tugas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Tugas & Quiz</span>
              </TabsTrigger>
              <TabsTrigger value="rubrik" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Scale className="h-4 w-4" />
                <span className="hidden sm:inline">Rubrik</span>
              </TabsTrigger>
            </TabsList>

            {canViewPresensi && (
              <TabsContent value="presensi" className="mt-8">
                <ElearningPresensi selectedClassId={selectedClass.id} />
              </TabsContent>
            )}

            <TabsContent value="materi" className="mt-8">
              <ElearningMateri 
                selectedClassId={selectedClass.id} 
                courseId={selectedClass.courseId}
                tabView="materials"
              />
            </TabsContent>

            <TabsContent value="tugas" className="mt-8">
              <ElearningMateri 
                selectedClassId={selectedClass.id} 
                courseId={selectedClass.courseId}
                tabView="assignments"
              />
            </TabsContent>

            <TabsContent value="rubrik" className="mt-8">
              <ElearningMateri 
                selectedClassId={selectedClass.id} 
                courseId={selectedClass.courseId}
                tabView="rubrics"
              />
            </TabsContent>
          </Tabs>
        ) : (
          // Class List View
          <ElearningKelas onEnterClass={handleEnterClass} />
        )}
      </div>
    </Layout>
  );
}
