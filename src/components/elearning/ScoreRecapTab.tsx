import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useElearningAssignments } from '@/hooks/useElearningMaterials';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ScoreRecapTabProps {
  classId: string;
}

export function ScoreRecapTab({ classId }: ScoreRecapTabProps) {
  const { profile } = useAuth();
  const isMahasiswa = profile?.role === 'mahasiswa';
  
  const { data: assignments, isLoading: loadingAssignments } = useElearningAssignments(classId);
  const validAssignments = assignments?.filter(a => a.is_published) || [];

  // 1. Get class_group_id
  const { data: elearningClass } = useQuery({
    queryKey: ['elearning-class', classId],
    queryFn: async () => {
      const { data, error } = await supabase.from('elearning_classes').select('class_group_id').eq('id', classId).maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // 2. Get Students (for Dosen)
  const { data: students } = useQuery({
    queryKey: ['class-students', elearningClass?.class_group_id],
    queryFn: async () => {
      if (!elearningClass?.class_group_id) return [];
      const { data, error } = await supabase
        .from('class_students')
        .select('student_profile_id, profiles:student_profile_id(full_name, nim)')
        .eq('class_group_id', elearningClass.class_group_id);
      if (error) throw error;
      return data;
    },
    enabled: !isMahasiswa && !!elearningClass?.class_group_id
  });

  // 3. Get Submissions
  const { data: submissions, isLoading: loadingSubmissions } = useQuery({
    queryKey: ['class-submissions', classId, isMahasiswa ? profile?.id : 'all'],
    queryFn: async () => {
      const assignmentIds = validAssignments.map(a => a.id);
      if (assignmentIds.length === 0) return [];
      
      let query = supabase.from('elearning_submissions').select('student_profile_id, assignment_id, score').in('assignment_id', assignmentIds);
      
      if (isMahasiswa) {
        query = query.eq('student_profile_id', profile?.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: validAssignments.length > 0
  });

  if (loadingAssignments || loadingSubmissions) {
    return <div className="p-8 text-center animate-pulse">Memuat rekapitulasi...</div>;
  }

  if (validAssignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Belum ada tugas/kuis yang dipublikasikan di kelas ini.
        </CardContent>
      </Card>
    );
  }

  // Calculate scores
  const getStudentBestScores = (studentId: string) => {
    const studentSubmissions = submissions?.filter(s => s.student_profile_id === studentId) || [];
    const bestScores: Record<string, number> = {};
    
    studentSubmissions.forEach(sub => {
      if (sub.score !== null && sub.score !== undefined) {
        if (!bestScores[sub.assignment_id] || sub.score > bestScores[sub.assignment_id]) {
          bestScores[sub.assignment_id] = sub.score;
        }
      }
    });
    
    const totalScore = Object.values(bestScores).reduce((sum, score) => sum + score, 0);
    const averageScore = validAssignments.length > 0 ? totalScore / validAssignments.length : 0;
    const maxPossibleScore = validAssignments.length * 100;
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    
    const completedAssignmentsCount = Object.keys(bestScores).length;
    const completionPercentage = validAssignments.length > 0 ? (completedAssignmentsCount / validAssignments.length) * 100 : 0;
    
    return { bestScores, totalScore, averageScore, maxPossibleScore, percentage, completionPercentage };
  };

  const exportToCSV = () => {
    if (!students) return;
    
    const headers = ['NIM', 'Nama Mahasiswa', ...validAssignments.map(a => `"${(a as any).assignment_code || a.title}"`), 'Rata-Rata', 'Persentase Nilai (%)', 'Persentase Ketuntasan (%)'];
    
    const rows = students.map(s => {
      const prof = s.profiles as any;
      const { bestScores, averageScore, percentage, completionPercentage } = getStudentBestScores(s.student_profile_id);
      
      const assignmentScores = validAssignments.map(a => bestScores[a.id] !== undefined ? bestScores[a.id] : 0);
      
      return [
        prof?.nim || '-',
        `"${prof?.full_name || '-'}"`,
        ...assignmentScores,
        averageScore.toFixed(2),
        percentage.toFixed(2),
        completionPercentage.toFixed(2)
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Nilai_Kelas.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isMahasiswa) {
    const myStats = getStudentBestScores(profile!.id);
    
    return (
      <div className="space-y-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Ringkasan Nilai Anda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Rata-Rata Pencapaian</span>
                  <span className="font-bold text-primary">{myStats.averageScore.toFixed(1)} / 100</span>
                </div>
                <Progress value={myStats.percentage} className="h-3" />
                <div className="text-right text-xs font-medium text-muted-foreground">
                  {myStats.percentage.toFixed(1)}% dari total keseluruhan
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Rincian Per Tugas/Quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tugas / Quiz</TableHead>
                  <TableHead className="text-right">Nilai (Maks 100)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validAssignments.map(assignment => {
                  const score = myStats.bestScores[assignment.id];
                  const titleText = (assignment as any).assignment_code || assignment.title;
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium" title={assignment.title}>{titleText}</TableCell>
                      <TableCell className="text-right">
                        {score !== undefined ? (
                          <span className="font-bold text-primary">{score}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Buku Nilai Kelas (Gradebook)</CardTitle>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Nama Mahasiswa</TableHead>
              {validAssignments.map(assignment => {
                const headerText = (assignment as any).assignment_code || assignment.title;
                return (
                  <TableHead key={assignment.id} className="text-center min-w-[120px] align-bottom pb-3">
                    <div className="max-w-[150px] line-clamp-3 whitespace-normal break-words mx-auto" title={assignment.title}>
                      {headerText}
                    </div>
                  </TableHead>
                );
              })}
              <TableHead className="text-center font-bold">Rata-Rata</TableHead>
              <TableHead className="text-center font-bold min-w-[100px]">Persentase Nilai</TableHead>
              <TableHead className="text-center font-bold min-w-[100px]">Persentase Ketuntasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students?.map(student => {
              const prof = student.profiles as any;
              const stats = getStudentBestScores(student.student_profile_id);
              
              return (
                <TableRow key={student.student_profile_id}>
                  <TableCell>
                    <div className="font-medium">{prof?.full_name || 'Tanpa Nama'}</div>
                    <div className="text-xs text-muted-foreground">{prof?.nim || '-'}</div>
                  </TableCell>
                  {validAssignments.map(assignment => {
                    const score = stats.bestScores[assignment.id];
                    return (
                      <TableCell key={assignment.id} className="text-center">
                        {score !== undefined ? score : '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold bg-primary/5">
                    {stats.averageScore.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-center font-bold bg-primary/5 text-primary">
                    {stats.percentage.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center font-bold bg-primary/5 text-emerald-600">
                    {stats.completionPercentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              );
            })}
            
            {(!students || students.length === 0) && (
              <TableRow>
                <TableCell colSpan={validAssignments.length + 4} className="text-center py-8 text-muted-foreground">
                  Belum ada mahasiswa di kelas ini.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
