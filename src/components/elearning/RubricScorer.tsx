import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRubricScores, useBatchUpsertRubricScores } from '@/hooks/useRubrics';
import { useClassStudents } from '@/hooks/useElearning';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Save, User } from 'lucide-react';

interface RubricScorerProps {
  rubric: {
    id: string;
    title: string;
    criteria?: Array<{
      id: string;
      criterion_name: string;
      max_score: number;
      weight_percentage: number;
      levels?: Array<{
        id: string;
        level_name: string;
        score_range_min: number;
        score_range_max: number;
      }>;
    }>;
  };
  classId: string;
}

export function RubricScorer({ rubric, classId }: RubricScorerProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { data: existingScores, isLoading: scoresLoading } = useRubricScores(rubric.id);
  const batchUpsertScores = useBatchUpsertRubricScores();

  // Get class group id first
  const { data: classData } = useQuery({
    queryKey: ['elearning-class', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_classes')
        .select('class_group_id')
        .eq('id', classId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: students, isLoading: studentsLoading } = useClassStudents(classData?.class_group_id || '');

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [scores, setScores] = useState<Record<string, { score: number; notes: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize scores when student is selected
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    
    // Load existing scores for this student
    const studentScores: Record<string, { score: number; notes: string }> = {};
    rubric.criteria?.forEach(c => {
      const existingScore = existingScores?.find(
        s => s.criteria_id === c.id && s.student_profile_id === studentId
      );
      studentScores[c.id] = {
        score: existingScore?.score || 0,
        notes: existingScore?.notes || '',
      };
    });
    setScores(studentScores);
  };

  const handleScoreChange = (criteriaId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: { ...prev[criteriaId], score },
    }));
  };

  const handleNotesChange = (criteriaId: string, notes: string) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: { ...prev[criteriaId], notes },
    }));
  };

  const handleSave = async () => {
    if (!selectedStudentId || !profile?.id) return;

    setIsSaving(true);
    try {
      const scoresToUpsert = Object.entries(scores).map(([criteriaId, data]) => ({
        rubric_id: rubric.id,
        criteria_id: criteriaId,
        student_profile_id: selectedStudentId,
        score: data.score,
        notes: data.notes || null,
        graded_by_profile_id: profile.id,
      }));

      await batchUpsertScores.mutateAsync(scoresToUpsert);
      toast({ title: 'Sukses', description: 'Nilai berhasil disimpan' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan nilai', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total score
  const calculateTotalScore = () => {
    if (!rubric.criteria) return 0;
    let totalWeightedScore = 0;
    let totalWeight = 0;

    rubric.criteria.forEach(c => {
      const score = scores[c.id]?.score || 0;
      const weight = c.weight_percentage;
      totalWeightedScore += (score / c.max_score) * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  };

  if (studentsLoading || scoresLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Pilih Mahasiswa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedStudentId} onValueChange={handleStudentSelect}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Pilih mahasiswa untuk dinilai..." />
            </SelectTrigger>
            <SelectContent>
              {students?.map((s) => (
                <SelectItem key={s.student_profile_id} value={s.student_profile_id}>
                  {(s as any).student?.full_name} ({(s as any).student?.nim || '-'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Scoring Table */}
      {selectedStudentId && rubric.criteria && rubric.criteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Penilaian Kriteria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Kriteria</TableHead>
                  <TableHead className="w-[15%]">Bobot</TableHead>
                  <TableHead className="w-[20%]">Skor</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rubric.criteria.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{c.criterion_name}</div>
                        {c.levels && c.levels.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {c.levels.map(l => `${l.level_name}: ${l.score_range_min}-${l.score_range_max}`).join(' | ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{c.weight_percentage}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={c.max_score}
                          value={scores[c.id]?.score || 0}
                          onChange={(e) => handleScoreChange(c.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">/ {c.max_score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={scores[c.id]?.notes || ''}
                        onChange={(e) => handleNotesChange(c.id, e.target.value)}
                        placeholder="Catatan..."
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Total Score */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-lg font-semibold">
                Total Nilai: <span className="text-primary">{calculateTotalScore().toFixed(1)}</span>
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? 'Menyimpan...' : 'Simpan Nilai'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Students Scores Overview */}
      {!selectedStudentId && existingScores && existingScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Nilai</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mahasiswa</TableHead>
                  {rubric.criteria?.map(c => (
                    <TableHead key={c.id}>{c.criterion_name}</TableHead>
                  ))}
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Group scores by student */}
                {Array.from(new Set(existingScores.map(s => s.student_profile_id))).map(studentId => {
                  const studentScores = existingScores.filter(s => s.student_profile_id === studentId);
                  const student = studentScores[0]?.student;
                  
                  let totalWeightedScore = 0;
                  let totalWeight = 0;
                  
                  return (
                    <TableRow key={studentId}>
                      <TableCell>{(student as any)?.full_name || 'Unknown'}</TableCell>
                      {rubric.criteria?.map(c => {
                        const score = studentScores.find(s => s.criteria_id === c.id)?.score || 0;
                        totalWeightedScore += (Number(score) / c.max_score) * c.weight_percentage;
                        totalWeight += c.weight_percentage;
                        return (
                          <TableCell key={c.id}>{score}</TableCell>
                        );
                      })}
                      <TableCell className="font-semibold">
                        {totalWeight > 0 ? ((totalWeightedScore / totalWeight) * 100).toFixed(1) : 0}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
