import { Layout } from '@/components/layout/Layout';
import { CourseScoreCard } from '@/components/charts/CourseScoreCard';
import { PLOAchievementChart } from '@/components/charts/PLOAchievementChart';
import { useCoursesWithStats } from '@/hooks/useCourses';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAllStudents } from '@/hooks/useStudents';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, BookOpen, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Index() {
  const { data: courses, isLoading, error } = useCoursesWithStats();
  const { data: settings } = useAppSettings();
  const { data: allStudents } = useAllStudents();

  const appTitle = settings?.app_title || 'Student Achievement Tracker';
  const appTagline = settings?.app_tagline || 'Pantau dan kelola nilai mahasiswa Program Bahasa Arab dengan mudah. Visualisasi data yang jelas untuk hasil pembelajaran yang lebih baik.';
  const logoUrl = settings?.logo_url;

  const totalStudents = allStudents?.length || 0;
  
  // Calculate total weighted average across all courses
  const totalEnrollments = courses?.reduce((sum, c) => sum + c.total_students, 0) || 0;
  const totalWeightedSum = courses?.reduce((sum, c) => sum + (c.average_score * c.total_students), 0) || 0;
  const averageAllCourses = totalEnrollments > 0 ? totalWeightedSum / totalEnrollments : 0;

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

        {/* Stats Section */}
        <section className="container -mt-8 relative z-10">
          <div className="flex justify-center">
            <div className="grid gap-4 sm:grid-cols-3 max-w-3xl w-full">
              {[
                { icon: BookOpen, label: 'Mata Kuliah', value: courses?.length || 0, color: 'text-primary', tooltip: 'Total mata kuliah yang tersedia' },
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
          <PLOAchievementChart />
        </section>

        {/* Courses Grid */}
        <section className="container py-8 lg:py-12">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold lg:text-3xl mb-2">
              Performa Mata Kuliah
            </h2>
            <p className="text-muted-foreground">
              Lihat performa setiap mata kuliah
            </p>
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
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {courses?.map((course, i) => (
                <CourseScoreCard key={course.id} course={course} delay={i * 100} />
              ))}
            </div>
          )}
        </section>
      </Layout>
    </TooltipProvider>
  );
}
