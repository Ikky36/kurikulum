import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { BookOpen, ClipboardList, FileText, BarChart3, Scale, ArrowLeft, LogIn, Info } from 'lucide-react';
import { ElearningKelas } from '@/components/elearning/ElearningKelas';
import { ElearningPresensi } from '@/components/elearning/ElearningPresensi';
import { ElearningMateri } from '@/components/elearning/ElearningMateri';
import { ElearningImportExport } from '@/components/elearning/ElearningImportExport';

import { ScoreRecapTab } from '@/components/elearning/ScoreRecapTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface SelectedClassInfo {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  classGroupName: string;
  isActive?: boolean;
}

export default function ELearning() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const classIdParam = searchParams.get('class');
  const tabParam = searchParams.get('tab');

  const [selectedClass, setSelectedClass] = useState<SelectedClassInfo | null>(null);
  const [activeTab, setActiveTab] = useState(tabParam || 'materi');

  const canViewRecap = profile?.role === 'admin' || profile?.role === 'sub_admin' || profile?.role === 'dosen';
  const canViewPresensi = profile?.role === 'admin' || profile?.role === 'sub_admin' || profile?.role === 'dosen';

  // Handle navigation state from URL params or quiz completion
  useEffect(() => {
    const classIdToLoad = classIdParam || (location.state as any)?.classId;
    if (classIdToLoad && (!selectedClass || selectedClass.id !== classIdToLoad)) {
      // Fetch class info and auto-select
      const fetchClass = async () => {
        const { data } = await supabase
          .from('elearning_classes')
          .select('id, title, course_id, courses(name), class_group_id, class_groups(name)')
          .eq('id', classIdToLoad)
          .single();
        if (data) {
          setSelectedClass({
            id: data.id,
            title: data.title,
            courseId: data.course_id,
            courseName: (data.courses as any)?.name || '',
            classGroupName: (data.class_groups as any)?.name || '',
          });
          const tabToLoad = tabParam || (location.state as any)?.tab;
          if (tabToLoad) {
            setActiveTab(tabToLoad);
          }
        }
      };
      fetchClass();
      if ((location.state as any)?.classId) {
        // If it came from location state (quiz completion), move it to search params
        setSearchParams({ class: classIdToLoad, tab: (location.state as any)?.tab || 'materi' }, { replace: true });
        window.history.replaceState({}, '');
      }
    }
  }, [classIdParam, tabParam, location.state, selectedClass?.id, setSearchParams]);


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
    setActiveTab('materi');
    setSearchParams({ class: classInfo.id, tab: 'materi' });
  };

  const handleBackToClassList = () => {
    setSelectedClass(null);
    setActiveTab('materi');
    setSearchParams({}); // Clear params
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (selectedClass) {
      setSearchParams({ class: selectedClass.id, tab: val });
    }
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
                <div className="mt-4 sm:mt-0 flex gap-2 justify-end">
                  <ElearningImportExport classId={selectedClass.id} isActive={selectedClass.isActive} />
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
        </div>

        {selectedClass?.isActive === false && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Mode Arsip</AlertTitle>
            <AlertDescription>
              Kelas ini berada dalam kurikulum yang sudah dinonaktifkan. Anda dalam mode Read-Only.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 space-y-4">
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
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className={`grid w-full max-w-2xl h-12 ${canViewPresensi ? 'grid-cols-5' : 'grid-cols-4'}`}>
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
              <TabsTrigger value="rekap" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Rekap Skor</span>
              </TabsTrigger>
              <TabsTrigger value="rubrik" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Scale className="h-4 w-4" />
                <span className="hidden sm:inline">Rubrik</span>
              </TabsTrigger>
            </TabsList>

            {canViewPresensi && (
              <TabsContent value="presensi" className="mt-8">
                <ElearningPresensi 
                  selectedClassId={selectedClass.id} 
                  isActive={selectedClass.isActive} 
                />
              </TabsContent>
            )}

            <TabsContent value="materi" className="mt-8">
              <ElearningMateri 
                selectedClassId={selectedClass.id} 
                courseId={selectedClass.courseId}
                tabView="materials"
                isActive={selectedClass.isActive}
              />
            </TabsContent>

            <TabsContent value="tugas" className="mt-8">
              <ElearningMateri 
                selectedClassId={selectedClass.id} 
                courseId={selectedClass.courseId}
                tabView="assignments"
                isActive={selectedClass.isActive}
              />
            </TabsContent>

            <TabsContent value="rekap" className="mt-8">
              <ScoreRecapTab classId={selectedClass.id} />
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
