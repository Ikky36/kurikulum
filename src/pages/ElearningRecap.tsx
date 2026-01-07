import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, BookOpen, ClipboardCheck, CheckCircle, XCircle, 
  Clock, TrendingUp, Download, BarChart3 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useElearningClasses, type ElearningClass } from '@/hooks/useElearning';

type ClassWithRelations = ElearningClass & {
  class_group: { id: string; name: string } | null;
  course: { id: string; name: string; code: string } | null;
  instructor: { id: string; full_name: string; photo_url: string | null } | null;
};

export default function ElearningRecap() {
  const { user, profile, loading } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: classes, isLoading: loadingClasses } = useElearningClasses();

  const isAdmin = profile?.role === 'admin';
  const isDosen = profile?.role === 'dosen';
  const typedClasses = (classes || []) as ClassWithRelations[];
  const myClasses = typedClasses.filter(
    (c) => isAdmin || c.instructor_profile_id === profile?.id
  );
  const selectedClass = myClasses.find(c => c.id === selectedClassId);

  // Fetch attendance recap
  const { data: attendanceRecap } = useQuery({
    queryKey: ['attendance-recap', selectedClassId],
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from('elearning_sessions')
        .select('id, session_number, title, session_date')
        .eq('elearning_class_id', selectedClassId)
        .order('session_number');

      if (!sessions?.length) return { sessions: [], students: [], attendance: {} };

      const { data: attendance } = await supabase
        .from('elearning_attendance')
        .select('*, student:profiles!elearning_attendance_student_profile_id_fkey(*)')
        .in('elearning_session_id', sessions.map(s => s.id));

      const { data: classStudents } = await supabase
        .from('class_students')
        .select('*, student:profiles!class_students_student_profile_id_fkey(*)')
        .eq('class_group_id', selectedClass?.class_group_id || '');

      const attendanceMap: Record<string, Record<string, string>> = {};
      attendance?.forEach(a => {
        if (!attendanceMap[a.student_profile_id]) attendanceMap[a.student_profile_id] = {};
        attendanceMap[a.student_profile_id][a.elearning_session_id] = a.status;
      });

      return {
        sessions,
        students: classStudents?.map(cs => cs.student) || [],
        attendance: attendanceMap,
      };
    },
    enabled: !!selectedClassId && !!selectedClass?.class_group_id,
  });

  // Fetch material progress
  const { data: materialProgress } = useQuery({
    queryKey: ['material-progress', selectedClassId],
    queryFn: async () => {
      const { data: materials } = await supabase
        .from('elearning_materials')
        .select('id, title, order_index')
        .eq('elearning_class_id', selectedClassId)
        .eq('is_published', true)
        .order('order_index');

      const { data: progress } = await supabase
        .from('elearning_material_progress')
        .select('*, student:profiles!elearning_material_progress_student_profile_id_fkey(*)')
        .in('material_id', materials?.map(m => m.id) || []);

      const { data: classStudents } = await supabase
        .from('class_students')
        .select('*, student:profiles!class_students_student_profile_id_fkey(*)')
        .eq('class_group_id', selectedClass?.class_group_id || '');

      const progressMap: Record<string, Record<string, number>> = {};
      progress?.forEach(p => {
        if (!progressMap[p.student_profile_id]) progressMap[p.student_profile_id] = {};
        progressMap[p.student_profile_id][p.material_id] = p.progress_percentage;
      });

      return {
        materials: materials || [],
        students: classStudents?.map(cs => cs.student) || [],
        progress: progressMap,
      };
    },
    enabled: !!selectedClassId && !!selectedClass?.class_group_id,
  });

  // Fetch assignment/quiz submissions
  const { data: assignmentRecap } = useQuery({
    queryKey: ['assignment-recap', selectedClassId],
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from('elearning_assignments')
        .select('id, title, assignment_type')
        .eq('elearning_class_id', selectedClassId)
        .eq('is_published', true);

      const { data: submissions } = await supabase
        .from('elearning_submissions')
        .select('*, student:profiles!elearning_submissions_student_profile_id_fkey(*)')
        .in('assignment_id', assignments?.map(a => a.id) || []);

      const { data: classStudents } = await supabase
        .from('class_students')
        .select('*, student:profiles!class_students_student_profile_id_fkey(*)')
        .eq('class_group_id', selectedClass?.class_group_id || '');

      const submissionMap: Record<string, Record<string, any>> = {};
      submissions?.forEach(s => {
        if (!submissionMap[s.student_profile_id]) submissionMap[s.student_profile_id] = {};
        const existing = submissionMap[s.student_profile_id][s.assignment_id];
        if (!existing || (s.score && s.score > existing.score)) {
          submissionMap[s.student_profile_id][s.assignment_id] = {
            score: s.score,
            submitted_at: s.submitted_at,
            attempts: s.attempt_number,
          };
        }
      });

      return {
        assignments: assignments || [],
        students: classStudents?.map(cs => cs.student) || [],
        submissions: submissionMap,
      };
    },
    enabled: !!selectedClassId && !!selectedClass?.class_group_id,
  });

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

  const getAttendanceStatus = (status: string) => {
    switch (status) {
      case 'hadir': return <Badge className="bg-green-500">H</Badge>;
      case 'sakit': return <Badge className="bg-yellow-500">S</Badge>;
      case 'izin': return <Badge className="bg-blue-500">I</Badge>;
      case 'alpha': return <Badge className="bg-red-500">A</Badge>;
      default: return <Badge variant="outline">-</Badge>;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const calculateAttendanceStats = () => {
    if (!attendanceRecap?.students?.length || !attendanceRecap.sessions?.length) {
      return { avgAttendance: 0, totalSessions: 0, totalStudents: 0 };
    }

    let totalPresent = 0;
    let totalPossible = attendanceRecap.students.length * attendanceRecap.sessions.length;

    attendanceRecap.students.forEach((student: any) => {
      attendanceRecap.sessions.forEach((session: any) => {
        if (attendanceRecap.attendance[student.id]?.[session.id] === 'hadir') {
          totalPresent++;
        }
      });
    });

    return {
      avgAttendance: Math.round((totalPresent / totalPossible) * 100),
      totalSessions: attendanceRecap.sessions.length,
      totalStudents: attendanceRecap.students.length,
    };
  };

  const stats = calculateAttendanceStats();

  return (
    <Layout>
      <div className="space-y-8 p-2 md:p-0">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Rekapitulasi E-Learning
            </h1>
            <p className="text-muted-foreground mt-1">
              Pantau kehadiran, progres materi, dan penyelesaian tugas
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* Class Selector */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Pilih Kelas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Pilih kelas untuk melihat rekap..." />
              </SelectTrigger>
              <SelectContent>
                {myClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.title} - {cls.class_group?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedClassId && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalStudents}</p>
                      <p className="text-sm text-muted-foreground">Mahasiswa</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.avgAttendance}%</p>
                      <p className="text-sm text-muted-foreground">Kehadiran</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-full">
                      <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{materialProgress?.materials?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Materi</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-full">
                      <ClipboardCheck className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{assignmentRecap?.assignments?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Tugas/Quiz</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="attendance" className="space-y-6">
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="attendance" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Kehadiran</span>
                </TabsTrigger>
                <TabsTrigger value="materials" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Materi</span>
                </TabsTrigger>
                <TabsTrigger value="assignments" className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Tugas/Quiz</span>
                </TabsTrigger>
              </TabsList>

              {/* Attendance Tab */}
              <TabsContent value="attendance">
                <Card>
                  <CardHeader>
                    <CardTitle>Rekapitulasi Kehadiran</CardTitle>
                    <CardDescription>
                      {attendanceRecap?.sessions?.length || 0} sesi, {attendanceRecap?.students?.length || 0} mahasiswa
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-card">Nama</TableHead>
                            {attendanceRecap?.sessions?.map((session: any) => (
                              <TableHead key={session.id} className="text-center min-w-[50px]">
                                P{session.session_number}
                              </TableHead>
                            ))}
                            <TableHead className="text-center">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceRecap?.students?.map((student: any) => {
                            const sessions = attendanceRecap.sessions || [];
                            const present = sessions.filter(
                              (s: any) => attendanceRecap.attendance[student.id]?.[s.id] === 'hadir'
                            ).length;
                            const percentage = sessions.length 
                              ? Math.round((present / sessions.length) * 100) 
                              : 0;

                            return (
                              <TableRow key={student.id}>
                                <TableCell className="sticky left-0 bg-card font-medium">
                                  {student.full_name}
                                </TableCell>
                                {sessions.map((session: any) => (
                                  <TableCell key={session.id} className="text-center">
                                    {getAttendanceStatus(attendanceRecap.attendance[student.id]?.[session.id])}
                                  </TableCell>
                                ))}
                                <TableCell className="text-center">
                                  <Badge variant={percentage >= 80 ? 'default' : percentage >= 50 ? 'secondary' : 'destructive'}>
                                    {percentage}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Materials Tab */}
              <TabsContent value="materials">
                <Card>
                  <CardHeader>
                    <CardTitle>Progres Materi Pembelajaran</CardTitle>
                    <CardDescription>
                      {materialProgress?.materials?.length || 0} materi tersedia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-card">Nama</TableHead>
                            {materialProgress?.materials?.map((material: any) => (
                              <TableHead key={material.id} className="text-center min-w-[100px]">
                                {material.title.substring(0, 15)}...
                              </TableHead>
                            ))}
                            <TableHead className="text-center">Rata-rata</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materialProgress?.students?.map((student: any) => {
                            const materials = materialProgress.materials || [];
                            const progresses = materials.map(
                              (m: any) => materialProgress.progress[student.id]?.[m.id] || 0
                            );
                            const avgProgress = progresses.length 
                              ? Math.round(progresses.reduce((a: number, b: number) => a + b, 0) / progresses.length)
                              : 0;

                            return (
                              <TableRow key={student.id}>
                                <TableCell className="sticky left-0 bg-card font-medium">
                                  {student.full_name}
                                </TableCell>
                                {materials.map((material: any) => {
                                  const prog = materialProgress.progress[student.id]?.[material.id] || 0;
                                  return (
                                    <TableCell key={material.id} className="text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <Progress value={prog} className="w-16 h-2" />
                                        <span className="text-xs text-muted-foreground">{prog}%</span>
                                      </div>
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center">
                                  <Badge className={getProgressColor(avgProgress)}>
                                    {avgProgress}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments">
                <Card>
                  <CardHeader>
                    <CardTitle>Penyelesaian Tugas & Quiz</CardTitle>
                    <CardDescription>
                      {assignmentRecap?.assignments?.length || 0} tugas/quiz
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-card">Nama</TableHead>
                            {assignmentRecap?.assignments?.map((assignment: any) => (
                              <TableHead key={assignment.id} className="text-center min-w-[100px]">
                                <div className="flex flex-col items-center gap-1">
                                  <span>{assignment.title.substring(0, 12)}...</span>
                                  <Badge variant="outline" className="text-xs">
                                    {assignment.assignment_type === 'quiz' ? 'Quiz' : 'Tugas'}
                                  </Badge>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-center">Rata-rata</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignmentRecap?.students?.map((student: any) => {
                            const assignments = assignmentRecap.assignments || [];
                            const scores = assignments
                              .map((a: any) => assignmentRecap.submissions[student.id]?.[a.id]?.score)
                              .filter((s: any) => s !== undefined);
                            const avgScore = scores.length 
                              ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
                              : 0;

                            return (
                              <TableRow key={student.id}>
                                <TableCell className="sticky left-0 bg-card font-medium">
                                  {student.full_name}
                                </TableCell>
                                {assignments.map((assignment: any) => {
                                  const submission = assignmentRecap.submissions[student.id]?.[assignment.id];
                                  return (
                                    <TableCell key={assignment.id} className="text-center">
                                      {submission ? (
                                        <Badge variant={submission.score >= 70 ? 'default' : 'secondary'}>
                                          {submission.score}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-muted-foreground">
                                          -
                                        </Badge>
                                      )}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center">
                                  <Badge className={getProgressColor(avgScore)}>
                                    {avgScore}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {!selectedClassId && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center text-lg">
                Pilih kelas untuk melihat rekapitulasi
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
