import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, BookMarked, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLO, CLO, LLO } from '@/lib/types';

interface LearningAchievementStatsProps {
  courseId: string;
}

interface CLOWithPLOs extends CLO {
  linkedPlos: { plo: PLO; weight: number }[];
}

interface LLOWithStats extends LLO {
  averageAchievement: number;
}

interface CLOWithStats extends CLO {
  linkedPlos: { plo: PLO; weight: number }[];
  llos: LLOWithStats[];
  achievementPercentage: number;
  totalWeight: number;
}

interface PLOWithStats extends PLO {
  linkedCLOs: { clo: CLO; weight: number }[];
  achievementPercentage: number;
}

export function LearningAchievementStats({ courseId }: LearningAchievementStatsProps) {
  // Fetch Course PLOs
  const { data: coursePlos } = useQuery({
    queryKey: ['course-plos', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_plos')
        .select('*, plos:plo_id(*)')
        .eq('course_id', courseId);
      if (error) throw error;
      return data.map(cp => cp.plos as unknown as PLO);
    },
  });

  // Fetch CLOs
  const { data: clos } = useQuery({
    queryKey: ['clos', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clos')
        .select('*')
        .eq('course_id', courseId)
        .order('code');
      if (error) throw error;
      return data as CLO[];
    },
  });

  // Fetch CLO-PLO relationships
  const { data: cloPlos } = useQuery({
    queryKey: ['clo-plos', courseId],
    queryFn: async () => {
      if (!clos || clos.length === 0) return [];
      const { data, error } = await supabase
        .from('clo_plos')
        .select('*, plos:plo_id(*)')
        .in('clo_id', clos.map(c => c.id));
      if (error) throw error;
      return data;
    },
    enabled: !!clos && clos.length > 0,
  });

  // Fetch LLOs
  const { data: llos } = useQuery({
    queryKey: ['llos', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llos')
        .select('*, clos:clo_id(*)')
        .order('code');
      if (error) throw error;
      const cloIds = clos?.map(c => c.id) || [];
      return data.filter(llo => cloIds.includes(llo.clo_id)).map(llo => ({
        ...llo,
        clo: llo.clos as unknown as CLO
      })) as LLO[];
    },
    enabled: !!clos,
  });

  // Fetch assessments with LLO links
  const { data: assessments } = useQuery({
    queryKey: ['assessments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('course_id', courseId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch assessment-LLO links
  const { data: assessmentLlos } = useQuery({
    queryKey: ['assessment-llos', courseId],
    queryFn: async () => {
      if (!assessments || assessments.length === 0) return [];
      const { data, error } = await supabase
        .from('assessment_llos')
        .select('*')
        .in('assessment_id', assessments.map(a => a.id));
      if (error) throw error;
      return data;
    },
    enabled: !!assessments && assessments.length > 0,
  });

  // Fetch enrollments for student count
  const { data: enrollments } = useQuery({
    queryKey: ['course-enrollments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('student_profile_id')
        .eq('course_id', courseId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all assessment scores for this course
  const { data: assessmentScores } = useQuery({
    queryKey: ['course-assessment-scores-stats', courseId],
    queryFn: async () => {
      if (!assessments || assessments.length === 0) return [];
      const { data, error } = await supabase
        .from('student_assessment_scores')
        .select('*')
        .in('assessment_id', assessments.map(a => a.id));
      if (error) throw error;
      return data;
    },
    enabled: !!assessments && assessments.length > 0,
  });

  // Calculate LLO achievement percentages
  // LLO achievement = average of student scores for assessments linked to this LLO
  const lloStats: LLOWithStats[] = (llos || []).map(llo => {
    const linkedAssessmentIds = assessmentLlos
      ?.filter(al => al.llo_id === llo.id)
      .map(al => al.assessment_id) || [];
    
    if (linkedAssessmentIds.length === 0) {
      return { ...llo, averageAchievement: 0 };
    }

    const studentIds = enrollments?.map(e => e.student_profile_id) || [];
    if (studentIds.length === 0) {
      return { ...llo, averageAchievement: 0 };
    }

    let totalAchievement = 0;
    let studentCount = 0;

    studentIds.forEach(studentId => {
      const studentScores = assessmentScores?.filter(
        s => linkedAssessmentIds.includes(s.assessment_id) && s.student_profile_id === studentId
      ) || [];
      
      if (studentScores.length > 0) {
        const avgScore = studentScores.reduce((sum, s) => sum + Number(s.score), 0) / studentScores.length;
        totalAchievement += avgScore;
        studentCount++;
      }
    });

    const averageAchievement = studentCount > 0 ? totalAchievement / studentCount : 0;
    return { ...llo, averageAchievement };
  });

  // Calculate CLO achievement percentages
  // CLO achievement = weighted average of its LLO achievements based on LLO weights
  const cloStats: CLOWithStats[] = (clos || []).map(clo => {
    const cloLlos = lloStats.filter(l => l.clo_id === clo.id);
    const totalWeight = cloLlos.reduce((sum, l) => sum + l.weight_percentage, 0);
    
    let weightedSum = 0;
    cloLlos.forEach(llo => {
      if (totalWeight > 0) {
        weightedSum += (llo.averageAchievement * llo.weight_percentage) / 100;
      }
    });

    const achievementPercentage = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

    // Get linked PLOs with weights
    const linkedPlos = cloPlos
      ?.filter(cp => cp.clo_id === clo.id)
      .map(cp => ({
        plo: cp.plos as unknown as PLO,
        weight: Number(cp.weight_percentage) || 0
      })) || [];

    return {
      ...clo,
      llos: cloLlos,
      linkedPlos,
      achievementPercentage,
      totalWeight,
    };
  });

  // Calculate PLO achievement percentages
  // PLO achievement = weighted average of CLO achievements based on CLO weights linked to this PLO
  const ploStats: PLOWithStats[] = (coursePlos || []).map(plo => {
    // Get all CLOs linked to this PLO
    const linkedCLOs = cloPlos
      ?.filter(cp => cp.plo_id === plo.id)
      .map(cp => {
        const cloStat = cloStats.find(c => c.id === cp.clo_id);
        return {
          clo: cloStat as CLO,
          weight: Number(cp.weight_percentage) || 0,
          achievement: cloStat?.achievementPercentage || 0
        };
      })
      .filter(item => item.clo) || [];

    const totalWeight = linkedCLOs.reduce((sum, item) => sum + item.weight, 0);
    let weightedSum = 0;
    linkedCLOs.forEach(item => {
      if (totalWeight > 0) {
        weightedSum += (item.achievement * item.weight) / 100;
      }
    });

    const achievementPercentage = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

    return {
      ...plo,
      linkedCLOs: linkedCLOs.map(item => ({ clo: item.clo, weight: item.weight })),
      achievementPercentage,
    };
  });

  return (
    <div className="space-y-6">
      {/* PLO Statistics */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Statistik CPL/PLO
          </CardTitle>
          <CardDescription>
            Capaian Pembelajaran Lulusan berdasarkan rata-rata capaian CPMK terkait
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ploStats.length > 0 ? (
            <div className="space-y-4">
              {ploStats.map((plo) => (
                <div key={plo.id} className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="font-mono shrink-0">{plo.code}</Badge>
                      <p className="text-sm text-muted-foreground">{plo.description}</p>
                    </div>
                    <span className={cn(
                      "text-lg font-bold shrink-0",
                      plo.achievementPercentage >= 60 ? "text-success" : "text-destructive"
                    )}>
                      {plo.achievementPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={plo.achievementPercentage} 
                    className={cn(
                      "h-3",
                      plo.achievementPercentage >= 60 ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
                    )}
                  />
                  {plo.linkedCLOs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {plo.linkedCLOs.map((item) => (
                        <Badge key={item.clo.id} variant="outline" className="text-xs">
                          {item.clo.code} ({item.weight}%)
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Belum ada CPL/PLO terkait
            </p>
          )}
        </CardContent>
      </Card>

      {/* CLO Statistics */}
      <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            Statistik CPMK/CLO
          </CardTitle>
          <CardDescription>
            Capaian Pembelajaran Mata Kuliah berdasarkan rata-rata capaian SUB-CPMK
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cloStats.length > 0 ? (
            <div className="space-y-4">
              {cloStats.map((clo) => (
                <div key={clo.id} className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="font-mono">{clo.code}</Badge>
                        {clo.linkedPlos.length > 0 && (
                          <div className="flex gap-1">
                            {clo.linkedPlos.map((lp) => (
                              <Badge key={lp.plo.id} variant="outline" className="text-xs">
                                {lp.plo.code} ({lp.weight}%)
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{clo.description}</p>
                    </div>
                    <span className={cn(
                      "text-lg font-bold shrink-0",
                      clo.achievementPercentage >= 60 ? "text-success" : "text-destructive"
                    )}>
                      {clo.achievementPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={clo.achievementPercentage} 
                    className={cn(
                      "h-2",
                      clo.achievementPercentage >= 60 ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {clo.llos.length} SUB-CPMK • Total bobot: {clo.totalWeight.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Belum ada CPMK/CLO
            </p>
          )}
        </CardContent>
      </Card>

      {/* LLO Statistics */}
      <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Statistik SUB-CPMK/LLO
          </CardTitle>
          <CardDescription>
            Rata-rata capaian mahasiswa pada setiap SUB-CPMK
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lloStats.length > 0 ? (
            <div className="space-y-3">
              {lloStats.map((llo) => (
                <div key={llo.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="font-mono shrink-0">{llo.code}</Badge>
                    <span className="text-sm truncate">{llo.description}</span>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{llo.weight_percentage}%</Badge>
                  <div className="flex items-center gap-2 shrink-0 w-32">
                    <Progress 
                      value={llo.averageAchievement} 
                      className={cn(
                        "h-2 flex-1",
                        llo.averageAchievement >= 60 ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
                      )}
                    />
                    <span className={cn(
                      "font-bold text-sm w-12 text-right",
                      llo.averageAchievement >= 60 ? "text-success" : "text-destructive"
                    )}>
                      {llo.averageAchievement.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Belum ada SUB-CPMK/LLO
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}