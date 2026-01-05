import { useParams, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useStudent, useStudentGrades } from '@/hooks/useStudents';
import { useCourses, useCourseAssessments } from '@/hooks/useCourses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { ArrowLeft, Mail, User, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function StudentGrades() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data: student, isLoading: studentLoading } = useStudent(studentId!);
  const { data: grades, isLoading: gradesLoading } = useStudentGrades(studentId!);
  const { data: courses } = useCourses();
  
  // Fetch instrumen penilaian for predikat
  const { data: instrumenList } = useQuery({
    queryKey: ['instrumen-penilaian'],
    queryFn: async () => {
      const { data, error } = await supabase.from('instrumen_penilaian').select('*').order('rentang_min');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all assessment scores for this student
  const { data: studentAssessmentScores } = useQuery({
    queryKey: ['student-assessment-scores', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_assessment_scores')
        .select('*, assessments(id, course_id)')
        .eq('student_profile_id', studentId!);
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  // Function to get predikat based on score
  const getPredikat = (score: number | null) => {
    if (score === null || !instrumenList || instrumenList.length === 0) {
      return null;
    }
    const instrumen = instrumenList.find(
      i => score >= i.rentang_min && score <= i.rentang_max
    );
    return instrumen ? { predikat: instrumen.predikat, color: instrumen.color } : null;
  };

  // Calculate average score for each course from assessment scores
  const gradesWithCalculatedScore = useMemo((): Array<{
    id: string;
    course_id: string;
    course: { name: string; code: string; passing_score: number } | null;
    calculated_score: number | null;
  }> => {
    if (!grades || !studentAssessmentScores) return [];
    
    return grades.map(grade => {
      // Get all assessment scores for this course
      const courseScores = studentAssessmentScores.filter(
        s => s.assessments?.course_id === grade.course_id
      );
      
      // Calculate average of all assessment scores
      const totalScores = courseScores.reduce((sum, s) => sum + s.score, 0);
      const avgScore = courseScores.length > 0 ? totalScores / courseScores.length : null;
      
      return {
        id: grade.id,
        course_id: grade.course_id,
        course: grade.course ? {
          name: grade.course.name,
          code: grade.course.code,
          passing_score: grade.course.passing_score,
        } : null,
        calculated_score: avgScore,
      };
    });
  }, [grades, studentAssessmentScores]);

  const isLoading = studentLoading || gradesLoading;

  // Calculate average using calculated scores
  const gradesWithScores = gradesWithCalculatedScore.filter(g => g.calculated_score !== null);
  const averageScore = gradesWithScores.length > 0
    ? gradesWithScores.reduce((sum, g) => sum + (g.calculated_score ?? 0), 0) / gradesWithScores.length
    : 0;

  // Prepare chart data using calculated scores
  const chartData = gradesWithCalculatedScore.map(g => ({
    name: g.course?.name?.split(' ')[0] || 'Unknown',
    fullName: g.course?.name || 'Unknown',
    code: g.course?.code || '',
    score: g.calculated_score ?? 0,
    passingScore: g.course?.passing_score || 60,
    isPassing: (g.calculated_score ?? 0) >= (g.course?.passing_score || 60),
  }));

  // Radar chart data
  const radarData = chartData.map(d => ({
    subject: d.name,
    score: d.score,
    fullMark: 100,
  }));

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="container py-8">
          <Card className="p-8 text-center">
            <p className="text-destructive">Mahasiswa tidak ditemukan</p>
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
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <h1 className="font-display text-3xl font-bold lg:text-4xl">
            Nilai Mahasiswa
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Student Profile Card */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="text-lg">Profil Mahasiswa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20 mb-4">
                  <AvatarImage src={student.photo_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {student.full_name?.charAt(0) || 'M'}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-xl">{student.full_name}</h3>
                <Badge variant="secondary" className="mt-2">Mahasiswa</Badge>
              </div>
              
              <div className="space-y-3">
                {student.nim && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">NIM:</span>
                    <span className="font-mono font-medium">{student.nim}</span>
                  </div>
                )}
                {student.program && (
                  <div className="flex items-center gap-3 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Prodi:</span>
                    <span className="font-medium">{student.program}</span>
                  </div>
                )}
                {student.class_group && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Kelas:</span>
                    <span className="font-medium">{student.class_group}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{student.email}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-2">Rata-rata Nilai</p>
                <div className="flex items-center gap-3">
                  <Progress 
                    value={averageScore} 
                    className={cn(
                      "flex-1 h-3",
                      averageScore >= 60 ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
                    )}
                  />
                  <span className={cn(
                    "font-bold text-xl",
                    averageScore >= 60 ? "text-success" : "text-destructive"
                  )}>
                    {averageScore.toFixed(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Card */}
          <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">Visualisasi Nilai</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="bar" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                  <TabsTrigger value="radar">Radar Chart</TabsTrigger>
                </TabsList>
                
                <TabsContent value="bar">
                  {chartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-popover border rounded-lg p-3 shadow-lg">
                                    <p className="font-semibold">{data.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{data.code}</p>
                                    <p className={cn(
                                      "font-bold mt-1",
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
                </TabsContent>

                <TabsContent value="radar">
                  {radarData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid className="stroke-muted" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Radar
                            name="Nilai"
                            dataKey="score"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Belum ada data nilai
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Grades Table */}
        <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Nilai Mahasiswa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="w-12 text-primary-foreground font-semibold">No</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Kode</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Mata Kuliah</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Nilai Akhir</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Predikat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradesWithCalculatedScore && gradesWithCalculatedScore.length > 0 ? (
                    gradesWithCalculatedScore.map((grade, index) => {
                      const score = grade.calculated_score;
                      const predikatData = getPredikat(score);
                      return (
                        <TableRow key={grade.id} className="hover:bg-muted/30">
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              {grade.course?.code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link 
                              to={`/mata-kuliah/${grade.course_id}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {grade.course?.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            {score !== null ? (
                              <div className="flex items-center justify-center gap-2">
                                <Progress 
                                  value={score} 
                                  className="w-16 h-2 [&>div]:bg-primary"
                                />
                                <span className="font-bold">
                                  {score.toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {predikatData ? (
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
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Belum ada nilai
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
