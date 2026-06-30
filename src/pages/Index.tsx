import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { CourseScoreCard } from '@/components/charts/CourseScoreCard';
import { PLOAchievementChart } from '@/components/charts/PLOAchievementChart';
import { DashboardScoreRecap } from '@/components/dashboard/DashboardScoreRecap';
import { useCoursesWithStats } from '@/hooks/useCourses';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAllStudents } from '@/hooks/useStudents';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, BookOpen, Users, TrendingUp, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function Index() {
  const { data: courses, isLoading, error } = useCoursesWithStats();
  const { data: settings } = useAppSettings();
  const { data: allStudents } = useAllStudents();
  const [curriculumFilter, setCurriculumFilter] = useState<string>('all');
  const [academicYearIds, setAcademicYearIds] = useState<string[]>([]);
  const [ayPopoverOpen, setAyPopoverOpen] = useState(false);

  const { data: curricula } = useQuery({
    queryKey: ['curricula-for-index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curricula')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch ALL academic years (active + inactive) for the home page filter
  const { data: academicYears } = useQuery({
    queryKey: ['academic-years-all-for-index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('id, name, is_active')
        .order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // When academic years selected, find course IDs linked via elearning_classes
  const { data: ayCourseIds } = useQuery({
    queryKey: ['courses-by-academic-year', academicYearIds],
    queryFn: async () => {
      if (academicYearIds.length === 0) return null;
      const { data, error } = await supabase
        .from('elearning_classes')
        .select('course_id')
        .in('academic_year_id', academicYearIds);
      if (error) throw error;
      return new Set((data || []).map(c => c.course_id));
    },
    enabled: academicYearIds.length > 0,
  });

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    let result = courses;
    if (curriculumFilter === 'none') {
      result = result.filter(c => !c.curriculum_id);
    } else if (curriculumFilter !== 'all') {
      result = result.filter(c => c.curriculum_id === curriculumFilter);
    }
    if (academicYearIds.length > 0 && ayCourseIds) {
      result = result.filter(c => ayCourseIds.has(c.id));
    }
    return result;
  }, [courses, curriculumFilter, academicYearIds, ayCourseIds]);

  const appTitle = settings?.app_title || 'Student Achievement Tracker';
  const appTagline = settings?.app_tagline || 'Pantau dan kelola nilai mahasiswa Program Bahasa Arab dengan mudah. Visualisasi data yang jelas untuk hasil pembelajaran yang lebih baik.';
  const logoUrl = settings?.logo_url;

  const totalStudents = allStudents?.length || 0;
  
  const totalEnrollments = filteredCourses.reduce((sum, c) => sum + c.total_students, 0);
  const totalWeightedSum = filteredCourses.reduce((sum, c) => sum + (c.average_score * c.total_students), 0);
  const averageAllCourses = totalEnrollments > 0 ? totalWeightedSum / totalEnrollments : 0;

  const toggleAy = (id: string) => {
    setAcademicYearIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const ayLabel = academicYearIds.length === 0
    ? 'Semua Tahun Akademik'
    : academicYearIds.length === 1
      ? academicYears?.find(a => a.id === academicYearIds[0])?.name || '1 dipilih'
      : `${academicYearIds.length} dipilih`;

  return (
    <TooltipProvider>
      <Layout>
        {/* Hero Section */}
        <section className="relative overflow-hidden gradient-hero py-16 lg:py-24">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="container relative">
            <div className="max-w-3xl animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground backdrop-blur-sm mb-6">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-5 w-5 object-cover rounded" />
                ) : (
                  <GraduationCap className="h-4 w-4" />
                )}
                <span>Program Bahasa Arab</span>
              </div>
              <h1 className="font-display text-4xl font-bold text-primary-foreground lg:text-5xl xl:text-6xl mb-4">
                {appTitle}
              </h1>
              <p className="text-lg text-primary-foreground/80 lg:text-xl max-w-2xl">
                {appTagline}
              </p>
            </div>
          </div>
        </section>

        {/* Filters Row: Kurikulum + Tahun Akademik */}
        <section className="container -mt-8 relative z-10 mb-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
              <SelectTrigger className="w-[220px] bg-background shadow-sm">
                <SelectValue placeholder="Semua Kurikulum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kurikulum</SelectItem>
                {curricula?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                <SelectItem value="none">Tanpa Kurikulum</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={ayPopoverOpen} onOpenChange={setAyPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-between bg-background shadow-sm font-normal">
                  <span className="truncate">{ayLabel}</span>
                  {academicYearIds.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{academicYearIds.length}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="end">
                <div className="max-h-64 overflow-y-auto p-1">
                  {(academicYears || []).length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">Belum ada tahun akademik</div>
                  )}
                  {academicYears?.map(ay => {
                    const checked = academicYearIds.includes(ay.id);
                    return (
                      <button
                        key={ay.id}
                        type="button"
                        onClick={() => toggleAy(ay.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded px-2 py-2 text-sm hover:bg-accent",
                          checked && "bg-accent"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border",
                            checked ? "bg-primary border-primary text-primary-foreground" : "border-input"
                          )}>
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          {ay.name}
                        </span>
                        {!ay.is_active && (
                          <Badge variant="outline" className="text-[10px]">Non-aktif</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
                {academicYearIds.length > 0 && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setAcademicYearIds([])}
                    >
                      <X className="h-3 w-3 mr-1" /> Reset
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container relative z-10">
          <div className="flex justify-center">
            <div className="grid gap-4 sm:grid-cols-3 max-w-3xl w-full">
              {[
                { icon: BookOpen, label: 'Mata Kuliah', value: filteredCourses.length, color: 'text-primary', tooltip: curriculumFilter === 'all' ? 'Total mata kuliah yang tersedia' : 'Total mata kuliah berdasarkan filter kurikulum' },
                { icon: Users, label: 'Total Mahasiswa', value: totalStudents, color: 'text-secondary-foreground', tooltip: 'Total seluruh mahasiswa' },
                { icon: TrendingUp, label: 'Rata-rata Nilai', value: averageAllCourses.toFixed(1), color: 'text-success', tooltip: 'Rata-rata nilai akhir dari semua mahasiswa' },
              ].map((stat, i) => (
                <Tooltip key={stat.label}>
                  <TooltipTrigger asChild>
                    <Card className="animate-slide-up cursor-help" style={{ animationDelay: `${i * 100}ms` }}>
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                          <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-bold font-display">{stat.value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{stat.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </section>

        {/* PLO Achievement Chart */}
        <section className="container py-8">
          <PLOAchievementChart curriculumFilter={curriculumFilter} />
        </section>

        {/* Courses Grid */}
        <section className="container py-8 lg:py-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold lg:text-3xl mb-2">
                Performa Mata Kuliah
              </h2>
              <p className="text-muted-foreground">
                Lihat performa setiap mata kuliah
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-2 w-full" />
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="p-8 text-center">
              <p className="text-destructive">Gagal memuat data mata kuliah</p>
            </Card>
          ) : filteredCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Tidak ada mata kuliah untuk filter yang dipilih</p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {filteredCourses.map((course, i) => (
                <CourseScoreCard key={course.id} course={course} delay={i * 100} />
              ))}
            </div>
          )}
        </section>

        {/* Laporan Rekap Skor Kelas (E-Learning) */}
        <section className="container py-8 border-t">
          <DashboardScoreRecap />
        </section>
      </Layout>
    </TooltipProvider>
  );
}
