import { useParams, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useCourse, useCourseInstructors, useCourseGrades, useCourseEnrollments, useCourseAssessments, useCourseAssessmentScores } from '@/hooks/useCourses';
import { useMultiTableRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Mail, User, CheckCircle2, XCircle, Users, Target, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CourseLearningOutcomes } from '@/components/course/CourseLearningOutcomes';
import { SemesterBadge } from '@/components/ui/semester-badge';
import { LearningAchievementStats } from '@/components/course/LearningAchievementStats';
import { AssessmentScoreImportExport } from '@/components/course/AssessmentScoreImportExport';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: course, isLoading: courseLoading } = useCourse(courseId!);
  const { data: instructors, isLoading: instructorsLoading } = useCourseInstructors(courseId!);
  const { data: grades, isLoading: gradesLoading } = useCourseGrades(courseId!);
  const { data: enrollments } = useCourseEnrollments(courseId!);
  const { data: assessments } = useCourseAssessments(courseId!);
  const { data: assessmentScores, refetch: refetchScores } = useCourseAssessmentScores(courseId!);

  // Enable realtime for course-specific data
  useMultiTableRealtimeSubscription(
    courseId
      ? [
          { table: 'grades', queryKeys: [['course-grades', courseId], ['grades']] },
          { table: 'student_assessment_scores', queryKeys: [['course-assessment-scores', courseId], ['assessment-scores']] },
          { table: 'enrollments', queryKeys: [['course-enrollments', courseId]] },
          { table: 'class_students', queryKeys: [['course-enrollments', courseId], ['class-students']] },
          { table: 'class_groups', queryKeys: [['course-enrollments', courseId], ['class-groups']] },
          { table: 'assessments', queryKeys: [['course-assessments', courseId]] },
          { table: 'clos', queryKeys: [['course-clos', courseId]] },
          { table: 'llos', queryKeys: [['clo-llos']] },
        ]
      : [],
    !!courseId
  );
  
  // Fetch instrumen penilaian for grading
  const { data: instrumenList } = useQuery({
    queryKey: ['instrumen-penilaian'],
    queryFn: async () => {
      const { data, error } = await supabase.from('instrumen_penilaian').select('*').order('rentang_min');
      if (error) throw error;
      return data;
    },
  });

  const [editingCell, setEditingCell] = useState<{ studentId: string; assessmentId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Sorting and filtering state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');

  // Check if dosen is assigned to this course
  const isInstructor = role === 'dosen' && instructors?.some(
    (instructor: any) => instructor.id === user?.id || instructor.instructor_profile_id === user?.id
  );
  const hasBasePermission = role === 'admin' || role === 'sub_admin' || isInstructor;
  const canEdit = hasBasePermission && (course?.is_active ?? true); // If course is inactive, it's read-only

  const isLoading = courseLoading || instructorsLoading || gradesLoading;

  // Calculate total weight from all assessments
  const totalWeight = assessments?.reduce((sum, a) => sum + (a.weight || 0), 0) || 0;

  // Get students with grades for table
  const studentsWithGrades = useMemo(() => {
    return enrollments?.map(e => {
      const grade = grades?.find(g => g.student_profile_id === e.student_profile_id);
      
      // Build assessment scores map for this student
      const studentAssessmentScores: Record<string, number | null> = {};
      let weightedSum = 0;
      let totalScoresSum = 0;
      let assessmentCount = 0;

      assessments?.forEach(assessment => {
        const score = assessmentScores?.find(
          s => s.assessment_id === assessment.id && s.student_profile_id === e.student_profile_id
        );
        const scoreValue = score?.score ?? null;
        studentAssessmentScores[assessment.id] = scoreValue;
        
        if (scoreValue !== null) {
          const weight = assessment.weight || 0;
          weightedSum += (scoreValue / 100) * weight;
          totalScoresSum += scoreValue;
          assessmentCount++;
        }
      });

      // Calculate achievement percentage: weighted sum / total weight * 100
      const achievementPercentage = totalWeight > 0 
        ? (weightedSum / totalWeight) * 100 
        : null;
      
      // Calculate Poin: average of all assessment scores
      const poin = assessmentCount > 0 ? totalScoresSum / assessmentCount : null;
      
      // Get class_group from enrollment data (may come from class_students)
      const classGroupName = (e as any).class_group_name || e.student?.class_group;
      
      return {
        ...e.student,
        class_group: classGroupName,
        class_group_id: (e as any).class_group_id,
        grade: grade?.final_score,
        isPassing: achievementPercentage !== null ? achievementPercentage >= (course?.passing_score || 60) : null,
        assessmentScores: studentAssessmentScores,
        achievementPercentage,
        poin,
      };
    }) || [];
  }, [enrollments, grades, assessments, assessmentScores, totalWeight, course?.passing_score]);

  // Function to get predikat based on average score (poin)
  const getPredikat = (poin: number | null) => {
    if (poin === null || !instrumenList || instrumenList.length === 0) {
      return null;
    }
    const instrumen = instrumenList.find(
      i => poin >= i.rentang_min && poin <= i.rentang_max
    );
    return instrumen ? { predikat: instrumen.predikat, color: instrumen.color } : null;
  };

  // Get unique class groups and enrollment years for filter
  const classGroups = useMemo(() => {
    const groups = new Set<string>();
    studentsWithGrades.forEach(s => {
      if (s?.class_group) groups.add(s.class_group);
    });
    return Array.from(groups).sort();
  }, [studentsWithGrades]);

  const enrollmentYears = useMemo(() => {
    const years = new Set<number>();
    studentsWithGrades.forEach(s => {
      if (s?.enrollment_year) years.add(s.enrollment_year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [studentsWithGrades]);

  // Filtered and sorted students
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...studentsWithGrades];
    
    // Apply class filter
    if (classFilter !== 'all') {
      result = result.filter(s => s?.class_group === classFilter);
    }

    // Apply year filter
    if (yearFilter !== 'all') {
      result = result.filter(s => s?.enrollment_year?.toString() === yearFilter);
    }

    // Apply gender filter
    if (genderFilter !== 'all') {
      result = result.filter(s => (s as any)?.gender === genderFilter);
    }
    
    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        let valA: string | number | null = null;
        let valB: string | number | null = null;
        
        switch (sortColumn) {
          case 'name':
            valA = a?.full_name?.toLowerCase() || '';
            valB = b?.full_name?.toLowerCase() || '';
            break;
          case 'nim':
            valA = a?.nim || '';
            valB = b?.nim || '';
            break;
          case 'achievement':
            valA = a?.achievementPercentage ?? -1;
            valB = b?.achievementPercentage ?? -1;
            break;
          case 'poin':
            valA = (a as any)?.poin ?? -1;
            valB = (b as any)?.poin ?? -1;
            break;
          default:
            // Assessment column sorting
            if (sortColumn.startsWith('assessment_')) {
              const assessmentId = sortColumn.replace('assessment_', '');
              valA = a?.assessmentScores?.[assessmentId] ?? -1;
              valB = b?.assessmentScores?.[assessmentId] ?? -1;
            }
        }
        
        if (valA === null || valB === null) return 0;
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        
        return sortDirection === 'asc' 
          ? (valA as number) - (valB as number) 
          : (valB as number) - (valA as number);
      });
    }
    
    return result;
  }, [studentsWithGrades, classFilter, yearFilter, genderFilter, sortColumn, sortDirection]);

  // Toggle sort handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Render sort icon
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Prepare chart data based on achievement percentage
  const chartData = studentsWithGrades
    .filter(s => s.achievementPercentage !== null)
    .map(s => ({
      name: s.full_name?.split(' ')[0] || 'Unknown',
      fullName: s.full_name || 'Unknown',
      score: s.achievementPercentage || 0,
      isPassing: (s.achievementPercentage || 0) >= (course?.passing_score || 60),
    }));

  const handleStartEdit = (studentId: string, assessmentId: string, currentScore: number | null) => {
    if (!canEdit) return;
    setEditingCell({ studentId, assessmentId });
    setEditValue(currentScore !== null ? String(currentScore) : '');
  };

  const handleSaveScore = async () => {
    if (!editingCell || !user) return;
    
    const score = editValue === '' ? null : parseFloat(editValue);
    if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
      toast.error('Nilai harus antara 0-100');
      return;
    }

    setIsSaving(true);
    try {
      const existingScore = assessmentScores?.find(
        s => s.assessment_id === editingCell.assessmentId && s.student_profile_id === editingCell.studentId
      );

      if (score === null) {
        // Delete if exists
        if (existingScore) {
          const { error } = await supabase
            .from('student_assessment_scores')
            .delete()
            .eq('id', existingScore.id);
          if (error) throw error;
        }
      } else if (existingScore) {
        // Update existing
        const { error } = await supabase
          .from('student_assessment_scores')
          .update({ 
            score, 
            updated_by_profile_id: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingScore.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('student_assessment_scores')
          .insert({
            assessment_id: editingCell.assessmentId,
            student_profile_id: editingCell.studentId,
            score,
            updated_by_profile_id: user.id,
          });
        if (error) throw error;
      }

      await refetchScores();
      queryClient.invalidateQueries({ queryKey: ['course-assessment-scores', courseId] });
      toast.success('Nilai berhasil disimpan');
    } catch (error: any) {
      toast.error('Gagal menyimpan nilai: ' + error.message);
    } finally {
      setIsSaving(false);
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveScore();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48 lg:col-span-2" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="container py-8">
          <Card className="p-8 text-center">
            <p className="text-destructive">Mata kuliah tidak ditemukan</p>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Link to="/mata-kuliah">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="secondary" className="text-base font-mono">
              {course.code}
            </Badge>
            <h1 className="font-display text-3xl font-bold lg:text-4xl">
              {course.name}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground mt-2">
            <span>Semester {course.semester}</span>
            {(course as any).sks !== undefined && (course as any).sks > 0 && (
              <>
                <span>•</span>
                <span>{(course as any).sks} SKS</span>
              </>
            )}
          </div>
        </div>

        {course.is_active === false && (
          <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20 text-destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Mode Arsip</AlertTitle>
            <AlertDescription>
              Mata kuliah ini berada dalam kurikulum yang sudah dinonaktifkan. Anda dalam mode Read-Only.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ikhtisar & Mahasiswa
            </TabsTrigger>
            <TabsTrigger value="learning-outcomes" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Rencana Pembelajaran
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistik Capaian
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Instructor Card */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="text-lg">Info Mata Kuliah</CardTitle>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>Semester: {course.semester || '-'}</span>
                    {(course as any).sks !== undefined && (
                      <span>SKS: {(course as any).sks}</span>
                    )}
                    <span>KKM: {course.passing_score}%</span>
                  </div>
                  {classFilter !== 'all' && (
                    <p className="text-sm text-muted-foreground">Kelas: {classFilter}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Filter instructors based on class filter
                    const filteredInstructors = instructors?.filter((instructor: any) => {
                      if (classFilter === 'all') return true;
                      // Show instructors that are assigned to this class or have no class assignment
                      return instructor.classGroupName === classFilter || instructor.classGroupId === null;
                    }) || [];
                    
                    // Deduplicate by instructor id
                    const uniqueInstructors = filteredInstructors.reduce((acc: any[], curr: any) => {
                      if (!acc.find(i => i.id === curr.id)) {
                        acc.push(curr);
                      }
                      return acc;
                    }, []);

                    if (uniqueInstructors.length > 0) {
                      return (
                        <div className="space-y-4">
                          {uniqueInstructors.map((instructor: any) => (
                            <div key={instructor.id} className="flex items-start gap-4">
                              <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                                <AvatarImage src={instructor.photo_url || undefined} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                                  {instructor.full_name?.charAt(0) || 'D'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{instructor.full_name}</p>
                                {instructor.classGroupName && (
                                  <p className="text-xs text-muted-foreground">Kelas: {instructor.classGroupName}</p>
                                )}
                                {instructor.nip && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    NIDN/NIDK: {instructor.nip}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3" />
                                  {instructor.email}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return <p className="text-muted-foreground">Belum ada dosen yang ditugaskan</p>;
                  })()}
                </CardContent>
              </Card>

              {/* Chart Card */}
              <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">Distribusi Capaian Mahasiswa</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }} 
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            tick={{ fontSize: 12 }} 
                            className="text-muted-foreground"
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-popover border rounded-lg p-3 shadow-lg">
                                    <p className="font-semibold">{data.fullName}</p>
                                    <p className={cn(
                                      "font-bold",
                                      data.isPassing ? "text-success" : "text-destructive"
                                    )}>
                                      Capaian: {data.score.toFixed(1)}%
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.isPassing ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Belum ada data nilai
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Students Table */}
            <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Daftar Mahasiswa</CardTitle>
                {canEdit && assessments && assessments.length > 0 && (
                  <AssessmentScoreImportExport
                    courseId={courseId!}
                    courseName={course?.name || ''}
                    assessments={assessments.map(a => ({
                      id: a.id,
                      code: a.code,
                      name: a.name,
                      weight: a.weight || 0,
                    }))}
                    students={studentsWithGrades.map(s => ({
                      id: s?.id || '',
                      full_name: s?.full_name || '',
                      nim: s?.nim || null,
                      enrollment_year: s?.enrollment_year || null,
                      class_group: s?.class_group || null,
                      email: s?.email || null,
                    }))}
                    existingScores={assessmentScores?.map(s => ({
                      assessment_id: s.assessment_id,
                      student_profile_id: s.student_profile_id,
                      score: Number(s.score),
                    })) || []}
                  />
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="w-12 font-semibold text-primary-foreground">No</TableHead>
                        <TableHead className="font-semibold text-primary-foreground">
                          <button 
                            onClick={() => handleSort('name')}
                            className="flex items-center justify-center w-full hover:opacity-80"
                          >
                            Nama
                            {renderSortIcon('name')}
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold text-primary-foreground">
                          <Select value={genderFilter} onValueChange={setGenderFilter}>
                            <SelectTrigger className="w-auto border-0 bg-transparent text-primary-foreground h-auto p-0 gap-1 font-semibold hover:opacity-80 [&>svg]:text-primary-foreground mx-auto">
                              <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Gender</SelectItem>
                              <SelectItem value="pria">Pria</SelectItem>
                              <SelectItem value="wanita">Wanita</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableHead>
                        <TableHead className="font-semibold text-primary-foreground">
                          <button 
                            onClick={() => handleSort('nim')}
                            className="flex items-center justify-center w-full hover:opacity-80"
                          >
                            NIM
                            {renderSortIcon('nim')}
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold text-primary-foreground">
                          <Select value={yearFilter} onValueChange={setYearFilter}>
                            <SelectTrigger className="w-auto border-0 bg-transparent text-primary-foreground h-auto p-0 gap-1 font-semibold hover:opacity-80 [&>svg]:text-primary-foreground mx-auto">
                              <SelectValue placeholder="Angkatan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Angkatan</SelectItem>
                              {enrollmentYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableHead>
                        <TableHead className="font-semibold text-primary-foreground">
                          <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger className="w-auto border-0 bg-transparent text-primary-foreground h-auto p-0 gap-1 font-semibold hover:opacity-80 [&>svg]:text-primary-foreground mx-auto">
                              <SelectValue placeholder="Kelas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Kelas</SelectItem>
                              {classGroups.map(group => (
                                <SelectItem key={group} value={group}>{group}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableHead>
                        {/* Dynamic assessment columns with weight */}
                        {assessments && assessments.length > 0 && assessments.map(assessment => (
                          <TableHead key={assessment.id} className="font-semibold min-w-[80px] text-primary-foreground">
                            <button 
                              onClick={() => handleSort(`assessment_${assessment.id}`)}
                              className="flex flex-col items-center w-full hover:opacity-80"
                            >
                              <div className="flex items-center">
                                <span>{assessment.code}</span>
                                {renderSortIcon(`assessment_${assessment.id}`)}
                              </div>
                              <span className="text-xs text-primary-foreground/70 font-normal">
                                ({assessment.weight || 0}%)
                              </span>
                            </button>
                          </TableHead>
                        ))}
                        <TableHead className="font-semibold text-primary-foreground">
                          <button 
                            onClick={() => handleSort('achievement')}
                            className="flex items-center justify-center w-full hover:opacity-80"
                          >
                            Capaian
                            {renderSortIcon('achievement')}
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold text-primary-foreground">
                          <button 
                            onClick={() => handleSort('poin')}
                            className="flex items-center justify-center w-full hover:opacity-80"
                          >
                            Poin
                            {renderSortIcon('poin')}
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold text-primary-foreground">Predikat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedStudents.length > 0 ? (
                        filteredAndSortedStudents.map((student, index) => (
                          <TableRow key={student?.id} className="hover:bg-muted/30">
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell>
                              <Link 
                                to={`/nilai-mahasiswa/${student?.id}`}
                                className="flex items-center gap-3 hover:text-primary transition-colors"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={student?.photo_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {student?.full_name?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{student?.full_name}</span>
                                  {student?.enrollment_year && (
                                    <SemesterBadge enrollmentYear={student.enrollment_year} variant="secondary" />
                                  )}
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell className="text-center capitalize">
                              {(student as any)?.gender || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-center">
                              {student?.nim || '-'}
                            </TableCell>
                            <TableCell className="text-center">{student?.enrollment_year || '-'}</TableCell>
                            <TableCell className="text-center">{student?.class_group || '-'}</TableCell>
                            {/* Assessment score cells */}
                            {assessments && assessments.length > 0 && assessments.map(assessment => {
                              const score = student?.assessmentScores?.[assessment.id];
                              const isEditing = editingCell?.studentId === student?.id && editingCell?.assessmentId === assessment.id;
                              
                              return (
                                <TableCell key={assessment.id} className="text-center p-1">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={handleSaveScore}
                                      onKeyDown={handleKeyDown}
                                      disabled={isSaving}
                                      className="w-16 h-8 text-center mx-auto"
                                      autoFocus
                                    />
                                  ) : (
                                    <button
                                      onClick={() => handleStartEdit(student?.id || '', assessment.id, score ?? null)}
                                      className={cn(
                                        "w-full h-8 flex items-center justify-center rounded transition-colors",
                                        canEdit && "hover:bg-muted cursor-pointer",
                                        !canEdit && "cursor-default"
                                      )}
                                      disabled={!canEdit}
                                    >
                                      {score !== null && score !== undefined ? (
                                        <span className={cn(
                                          "font-medium",
                                          score >= (course?.passing_score || 60) ? "text-success" : "text-destructive"
                                        )}>
                                          {score}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </button>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">
                              {student?.achievementPercentage !== undefined && student?.achievementPercentage !== null ? (
                                <div className="flex items-center justify-center gap-2">
                                  <Progress 
                                    value={student.achievementPercentage} 
                                    className={cn(
                                      "w-16 h-2",
                                      student.isPassing ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
                                    )}
                                  />
                                  <span className={cn(
                                    "font-bold",
                                    student.isPassing ? "text-success" : "text-destructive"
                                  )}>
                                    {student.achievementPercentage.toFixed(1)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {(student as any)?.poin !== null && (student as any)?.poin !== undefined ? (
                                <span className="font-bold">
                                  {(student as any).poin.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {(student as any)?.poin !== null && (student as any)?.poin !== undefined ? (
                                (() => {
                                  const predikatData = getPredikat((student as any).poin);
                                  return predikatData ? (
                                    <Badge 
                                      style={{ 
                                        backgroundColor: predikatData.color || undefined,
                                        color: predikatData.color ? '#fff' : undefined
                                      }}
                                    >
                                      {predikatData.predikat}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">-</Badge>
                                  );
                                })()
                              ) : (
                                <Badge variant="outline">Belum dinilai</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8 + (assessments?.length || 0)} className="text-center py-8 text-muted-foreground">
                            Belum ada mahasiswa terdaftar
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Outcomes Tab */}
          <TabsContent value="learning-outcomes">
            <CourseLearningOutcomes courseId={courseId!} canEdit={canEdit} />
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            <LearningAchievementStats courseId={courseId!} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
