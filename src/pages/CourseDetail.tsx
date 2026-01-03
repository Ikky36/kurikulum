import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useCourse, useCourseInstructors, useCourseGrades, useCourseEnrollments, useCourseAssessments, useCourseAssessmentScores } from '@/hooks/useCourses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Mail, User, CheckCircle2, XCircle, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CourseLearningOutcomes } from '@/components/course/CourseLearningOutcomes';
import { AssessmentScoreImportExport } from '@/components/course/AssessmentScoreImportExport';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
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

  const [editingCell, setEditingCell] = useState<{ studentId: string; assessmentId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = role === 'admin' || role === 'dosen';

  const isLoading = courseLoading || instructorsLoading || gradesLoading;

  // Calculate total weight from all assessments
  const totalWeight = assessments?.reduce((sum, a) => sum + (a.weight || 0), 0) || 0;

  // Prepare chart data
  const chartData = grades?.map(g => ({
    name: g.student?.full_name?.split(' ')[0] || 'Unknown',
    fullName: g.student?.full_name || 'Unknown',
    score: g.final_score,
    isPassing: g.final_score >= (course?.passing_score || 60),
  })) || [];

  // Get students with grades for table
  const studentsWithGrades = enrollments?.map(e => {
    const grade = grades?.find(g => g.student_profile_id === e.student_profile_id);
    
    // Build assessment scores map for this student
    const studentAssessmentScores: Record<string, number | null> = {};
    let weightedSum = 0;
    let totalWeightWithScores = 0;

    assessments?.forEach(assessment => {
      const score = assessmentScores?.find(
        s => s.assessment_id === assessment.id && s.student_profile_id === e.student_profile_id
      );
      const scoreValue = score?.score ?? null;
      studentAssessmentScores[assessment.id] = scoreValue;
      
      if (scoreValue !== null) {
        const weight = assessment.weight || 0;
        weightedSum += (scoreValue / 100) * weight;
        totalWeightWithScores += weight;
      }
    });

    // Calculate achievement percentage: weighted sum / total weight * 100
    const achievementPercentage = totalWeight > 0 
      ? (weightedSum / totalWeight) * 100 
      : null;
    
    return {
      ...e.student,
      grade: grade?.final_score,
      isPassing: achievementPercentage !== null ? achievementPercentage >= (course?.passing_score || 60) : null,
      assessmentScores: studentAssessmentScores,
      achievementPercentage,
    };
  }) || [];

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
          <p className="text-muted-foreground mt-2">
            Semester {course.semester} • Passing Score: {course.passing_score}%
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ikhtisar & Mahasiswa
            </TabsTrigger>
            <TabsTrigger value="learning-outcomes" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Capaian Pembelajaran
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Instructor Card */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="text-lg">Dosen Pengajar</CardTitle>
                </CardHeader>
                <CardContent>
                  {instructors && instructors.length > 0 ? (
                    <div className="space-y-4">
                      {instructors.map((instructor) => (
                        <div key={instructor.id} className="flex items-start gap-4">
                          <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                            <AvatarImage src={instructor.photo_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                              {instructor.full_name?.charAt(0) || 'D'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{instructor.full_name}</p>
                            {instructor.nip && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                NIP: {instructor.nip}
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
                  ) : (
                    <p className="text-muted-foreground">Belum ada dosen yang ditugaskan</p>
                  )}
                </CardContent>
              </Card>

              {/* Chart Card */}
              <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">Distribusi Nilai Mahasiswa</CardTitle>
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
                                      Nilai: {data.score}
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
                    students={enrollments?.map(e => ({
                      id: e.student?.id || '',
                      full_name: e.student?.full_name || '',
                      nim: e.student?.nim || null,
                    })) || []}
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
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold">Nama</TableHead>
                        <TableHead className="font-semibold">NIM</TableHead>
                        <TableHead className="font-semibold">Kelas</TableHead>
                        {/* Dynamic assessment columns with weight */}
                        {assessments && assessments.length > 0 && assessments.map(assessment => (
                          <TableHead key={assessment.id} className="font-semibold text-center min-w-[80px]">
                            <div className="flex flex-col items-center">
                              <span>{assessment.code}</span>
                              <span className="text-xs text-muted-foreground font-normal">
                                ({assessment.weight || 0}%)
                              </span>
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="font-semibold text-center">Capaian</TableHead>
                        <TableHead className="font-semibold text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsWithGrades.length > 0 ? (
                        studentsWithGrades.map((student) => (
                          <TableRow key={student?.id} className="hover:bg-muted/30">
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
                                <span className="font-medium">{student?.full_name}</span>
                              </Link>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {student?.nim || '-'}
                            </TableCell>
                            <TableCell>{student?.class_group || '-'}</TableCell>
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
                              {student?.isPassing !== null ? (
                                student.isPassing ? (
                                  <Badge className="bg-success/10 text-success border-success/20">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Lulus
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Belum Lulus
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="outline">Belum dinilai</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5 + (assessments?.length || 0)} className="text-center py-8 text-muted-foreground">
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
        </Tabs>
      </div>
    </Layout>
  );
}
