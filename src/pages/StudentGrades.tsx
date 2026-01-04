import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useStudent, useStudentGrades } from '@/hooks/useStudents';
import { useCourses } from '@/hooks/useCourses';
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
import { ArrowLeft, Mail, User, BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function StudentGrades() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data: student, isLoading: studentLoading } = useStudent(studentId!);
  const { data: grades, isLoading: gradesLoading } = useStudentGrades(studentId!);
  const { data: courses } = useCourses();

  const isLoading = studentLoading || gradesLoading;

  // Calculate average
  const averageScore = grades && grades.length > 0
    ? grades.reduce((sum, g) => sum + g.final_score, 0) / grades.length
    : 0;

  // Prepare chart data
  const chartData = grades?.map(g => ({
    name: g.course?.name?.split(' ')[0] || 'Unknown',
    fullName: g.course?.name || 'Unknown',
    code: g.course?.code || '',
    score: g.final_score,
    passingScore: g.course?.passing_score || 60,
    isPassing: g.final_score >= (g.course?.passing_score || 60),
  })) || [];

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
            <CardTitle className="text-lg">Detail Nilai Per Mata Kuliah</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="w-12 text-primary-foreground font-semibold">No</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Kode</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Mata Kuliah</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Passing Score</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Nilai Akhir</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades && grades.length > 0 ? (
                    grades.map((grade, index) => (
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
                          {grade.course?.passing_score || 60}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress 
                              value={grade.final_score} 
                              className={cn(
                                "w-16 h-2",
                                grade.final_score >= (grade.course?.passing_score || 60) 
                                  ? "[&>div]:bg-success" 
                                  : "[&>div]:bg-destructive"
                              )}
                            />
                            <span className={cn(
                              "font-bold",
                              grade.final_score >= (grade.course?.passing_score || 60) 
                                ? "text-success" 
                                : "text-destructive"
                            )}>
                              {grade.final_score}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {grade.final_score >= (grade.course?.passing_score || 60) ? (
                            <Badge className="bg-success/10 text-success border-success/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Lulus
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                              <XCircle className="h-3 w-3 mr-1" />
                              Belum Lulus
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
