import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLO, CLO, LLO, Course, Curriculum } from '@/lib/types';

interface PLOAchievementData {
  plo: PLO;
  achievementPercentage: number;
  linkedCourses: { course: Course; achievement: number }[];
}

export function PLOAchievementChart() {
  const [curriculumFilter, setCurriculumFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Fetch all PLOs
  const { data: plos } = useQuery({
    queryKey: ['all-plos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plos')
        .select('*')
        .order('code');
      if (error) throw error;
      return data as PLO[];
    },
  });

  // Fetch all courses
  const { data: courses } = useQuery({
    queryKey: ['all-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code');
      if (error) throw error;
      return data as Course[];
    },
  });

  // Fetch curricula
  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: async () => {
      const { data, error } = await supabase.from('curricula').select('*').order('name');
      if (error) throw error;
      return data as Curriculum[];
    },
  });

  // Fetch all course-PLO relationships
  const { data: coursePlos } = useQuery({
    queryKey: ['all-course-plos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_plos')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all CLOs
  const { data: allClos } = useQuery({
    queryKey: ['all-clos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clos')
        .select('*');
      if (error) throw error;
      return data as CLO[];
    },
  });

  // Fetch all CLO-PLO relationships
  const { data: allCloPlos } = useQuery({
    queryKey: ['all-clo-plos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clo_plos')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all LLOs
  const { data: allLlos } = useQuery({
    queryKey: ['all-llos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llos')
        .select('*');
      if (error) throw error;
      return data as LLO[];
    },
  });

  // Fetch all assessments
  const { data: allAssessments } = useQuery({
    queryKey: ['all-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all assessment-LLO links
  const { data: allAssessmentLlos } = useQuery({
    queryKey: ['all-assessment-llos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_llos')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all enrollments with student profile for year filter
  const { data: allEnrollments } = useQuery({
    queryKey: ['all-enrollments-with-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, profiles:student_profile_id(enrollment_year)');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all assessment scores
  const { data: allScores } = useQuery({
    queryKey: ['all-assessment-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_assessment_scores')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Get unique enrollment years
  const enrollmentYears = useMemo(() => {
    const years = new Set<number>();
    allEnrollments?.forEach(e => {
      const year = (e.profiles as any)?.enrollment_year;
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allEnrollments]);

  // Filter courses by curriculum
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (curriculumFilter === 'all') return courses;
    return courses.filter(c => c.curriculum_id === curriculumFilter);
  }, [courses, curriculumFilter]);

  // Filter enrollments by year
  const filteredEnrollments = useMemo(() => {
    if (!allEnrollments) return [];
    if (yearFilter === 'all') return allEnrollments;
    return allEnrollments.filter(e => {
      const year = (e.profiles as any)?.enrollment_year;
      return year?.toString() === yearFilter;
    });
  }, [allEnrollments, yearFilter]);

  // Calculate PLO achievements across filtered courses
  const ploAchievements: PLOAchievementData[] = useMemo(() => {
    return (plos || []).map(plo => {
      // Get all courses linked to this PLO (filtered)
      const linkedCourseIds = coursePlos
        ?.filter(cp => cp.plo_id === plo.id && filteredCourses.some(c => c.id === cp.course_id))
        .map(cp => cp.course_id) || [];

      const linkedCourses: { course: Course; achievement: number }[] = [];

      linkedCourseIds.forEach(courseId => {
        const course = filteredCourses?.find(c => c.id === courseId);
        if (!course) return;

        // Get CLOs for this course that are linked to this PLO
        const courseClos = allClos?.filter(c => c.course_id === courseId) || [];
        const ploLinkedCloPlos = allCloPlos?.filter(
          cp => cp.plo_id === plo.id && courseClos.some(c => c.id === cp.clo_id)
        ) || [];

        // Calculate CLO achievements for this course
        let totalWeight = 0;
        let weightedSum = 0;

        ploLinkedCloPlos.forEach(cloPlo => {
          const clo = courseClos.find(c => c.id === cloPlo.clo_id);
          if (!clo) return;

          const cloWeight = Number(cloPlo.weight_percentage) || 0;
          totalWeight += cloWeight;

          // Calculate CLO achievement
          const cloLlos = allLlos?.filter(l => l.clo_id === clo.id) || [];
          const lloTotalWeight = cloLlos.reduce((sum, l) => sum + l.weight_percentage, 0);

          let cloWeightedSum = 0;
          cloLlos.forEach(llo => {
            // Get assessments linked to this LLO
            const linkedAssessmentIds = allAssessmentLlos
              ?.filter(al => al.llo_id === llo.id)
              .map(al => al.assessment_id) || [];

            // Get enrolled students for this course (filtered by year)
            const courseEnrollments = filteredEnrollments?.filter(e => e.course_id === courseId) || [];
            const studentIds = courseEnrollments.map(e => e.student_profile_id);

            if (studentIds.length === 0 || linkedAssessmentIds.length === 0) return;

            let lloTotal = 0;
            let lloCount = 0;

            studentIds.forEach(studentId => {
              const studentScores = allScores?.filter(
                s => linkedAssessmentIds.includes(s.assessment_id) && s.student_profile_id === studentId
              ) || [];

              if (studentScores.length > 0) {
                const avg = studentScores.reduce((sum, s) => sum + Number(s.score), 0) / studentScores.length;
                lloTotal += avg;
                lloCount++;
              }
            });

            const lloAvg = lloCount > 0 ? lloTotal / lloCount : 0;
            if (lloTotalWeight > 0) {
              cloWeightedSum += (lloAvg * llo.weight_percentage) / 100;
            }
          });

          const cloAchievement = lloTotalWeight > 0 ? (cloWeightedSum / lloTotalWeight) * 100 : 0;
          if (totalWeight > 0) {
            weightedSum += (cloAchievement * cloWeight) / 100;
          }
        });

        const courseAchievement = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
        linkedCourses.push({ course, achievement: courseAchievement });
      });

      // Calculate average PLO achievement across all linked courses
      const avgAchievement = linkedCourses.length > 0
        ? linkedCourses.reduce((sum, lc) => sum + lc.achievement, 0) / linkedCourses.length
        : 0;

      return {
        plo,
        achievementPercentage: avgAchievement,
        linkedCourses,
      };
    });
  }, [plos, coursePlos, filteredCourses, allClos, allCloPlos, allLlos, allAssessmentLlos, filteredEnrollments, allScores]);

  const chartData = ploAchievements.map(pa => ({
    code: pa.plo.code,
    achievement: pa.achievementPercentage,
    isPassing: pa.achievementPercentage >= 60,
    courses: pa.linkedCourses.map(lc => lc.course.code).join(', '),
  }));

  if (ploAchievements.length === 0) {
    return null;
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Statistik Capaian CPL/PLO
            </CardTitle>
            <CardDescription>
              Persentase capaian CPL berdasarkan rata-rata capaian pada setiap mata kuliah terkait
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Kurikulum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kurikulum</SelectItem>
                {curricula?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Angkatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Angkatan</SelectItem>
                {enrollmentYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="code" 
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
                            <p className="font-semibold">{data.code}</p>
                            <p className={cn(
                              "font-bold",
                              data.isPassing ? "text-success" : "text-destructive"
                            )}>
                              Capaian: {data.achievement.toFixed(1)}%
                            </p>
                            {data.courses && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Mata Kuliah: {data.courses}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="achievement" radius={[4, 4, 0, 0]}>
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

            <div className="space-y-3">
              {ploAchievements.map((pa) => (
                <div key={pa.plo.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border">
                  <Badge variant="secondary" className="font-mono shrink-0">{pa.plo.code}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{pa.plo.description}</p>
                    {pa.linkedCourses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pa.linkedCourses.map((lc) => (
                          <Badge key={lc.course.id} variant="outline" className="text-xs">
                            {lc.course.code}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-32">
                    <Progress 
                      value={pa.achievementPercentage} 
                      className={cn(
                        "h-2 flex-1",
                        pa.achievementPercentage >= 60 ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
                      )}
                    />
                    <span className={cn(
                      "font-bold text-sm w-12 text-right",
                      pa.achievementPercentage >= 60 ? "text-success" : "text-destructive"
                    )}>
                      {pa.achievementPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-center py-8">
            Belum ada data CPL/PLO
          </div>
        )}
      </CardContent>
    </Card>
  );
}