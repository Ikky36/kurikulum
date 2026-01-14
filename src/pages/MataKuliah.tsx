import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useCoursesWithStats } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Curriculum } from '@/lib/types';

export default function MataKuliah() {
  const { data: courses, isLoading, error } = useCoursesWithStats();
  const { user } = useAuth();
  const isGuest = !user;
  
  // Filter states
  const [codeFilter, setCodeFilter] = useState('all');
  const [curriculumFilter, setCurriculumFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [instructorFilter, setInstructorFilter] = useState('all');

  // Fetch curricula for filter and display
  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: async () => {
      const { data, error } = await supabase.from('curricula').select('*').order('name');
      if (error) throw error;
      return data as Curriculum[];
    },
  });

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    const codes = new Set<string>();
    const semesters = new Set<string>();
    const instructorNames = new Set<string>();
    
    courses?.forEach(course => {
      codes.add(course.code);
      if (course.semester) semesters.add(course.semester);
      course.instructors.forEach(i => {
        if (i.full_name) instructorNames.add(i.full_name);
      });
    });
    
    return {
      codes: Array.from(codes).sort(),
      semesters: Array.from(semesters).sort(),
      instructors: Array.from(instructorNames).sort(),
    };
  }, [courses]);

  // Get curriculum name helper
  const getCurriculumName = (curriculumId?: string | null) => {
    if (!curriculumId) return null;
    return curricula?.find(c => c.id === curriculumId)?.name || null;
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    
    return courses.filter(course => {
      if (codeFilter !== 'all' && course.code !== codeFilter) return false;
      if (curriculumFilter !== 'all' && course.curriculum_id !== curriculumFilter) return false;
      if (semesterFilter !== 'all' && course.semester !== semesterFilter) return false;
      if (instructorFilter !== 'all' && !course.instructors.some(i => i.full_name === instructorFilter)) return false;
      return true;
    });
  }, [courses, codeFilter, curriculumFilter, semesterFilter, instructorFilter]);

  const renderCourseRow = (course: typeof filteredCourses[0], i: number) => {
    const rowContent = (
      <>
        <TableCell className="text-center">{i + 1}</TableCell>
        <TableCell>
          <Badge variant="secondary" className="font-mono">
            {course.code}
          </Badge>
        </TableCell>
        <TableCell>
          <span className={cn(
            "font-medium",
            !isGuest && "hover:text-primary transition-colors"
          )}>
            {course.name}
          </span>
        </TableCell>
        <TableCell>
          {getCurriculumName(course.curriculum_id) ? (
            <Badge variant="outline">{getCurriculumName(course.curriculum_id)}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </TableCell>
        <TableCell>
          {course.instructors.length > 0 ? (
            <div className="flex flex-col gap-2">
              {Array.from(
                new Map(course.instructors.map(i => [i.full_name, i])).values()
              ).map((instructor, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={instructor?.photo_url || undefined} />
                    <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                      {instructor?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{instructor?.full_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Belum ditugaskan</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{course.total_students}</span>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className={cn(
              "h-4 w-4",
              course.average_score >= course.passing_score ? "text-success" : "text-destructive"
            )} />
            <span className={cn(
              "font-bold",
              course.average_score >= course.passing_score ? "text-success" : "text-destructive"
            )}>
              {course.average_score.toFixed(1)}%
            </span>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">{course.semester || '-'}</Badge>
        </TableCell>
        <TableCell>
          {isGuest ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Link to={`/mata-kuliah/${course.id}`}>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          )}
        </TableCell>
      </>
    );

    if (isGuest) {
      return (
        <TableRow 
          key={course.id} 
          className="transition-colors"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {rowContent}
        </TableRow>
      );
    }

    return (
      <TableRow 
        key={course.id} 
        className="group cursor-pointer hover:bg-muted/30 transition-colors"
        style={{ animationDelay: `${i * 50}ms` }}
        onClick={() => window.location.href = `/mata-kuliah/${course.id}`}
      >
        {rowContent}
      </TableRow>
    );
  };

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2">
            Daftar Mata Kuliah
          </h1>
          <p className="text-muted-foreground text-lg">
            Program Bahasa Arab - {courses?.length || 0} Mata Kuliah
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-0">
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive">Gagal memuat data mata kuliah</p>
          </Card>
        ) : (
          <Card className="overflow-hidden animate-slide-up">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="w-12 font-semibold text-primary-foreground">No</TableHead>
                    <TableHead className="font-semibold text-primary-foreground">
                      <Select value={codeFilter} onValueChange={setCodeFilter}>
                        <SelectTrigger className="w-auto border-0 bg-transparent text-primary-foreground h-auto p-0 gap-1 font-semibold hover:opacity-80 [&>svg]:text-primary-foreground">
                          <SelectValue placeholder="Kode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Kode</SelectItem>
                          {filterOptions.codes.map(code => (
                            <SelectItem key={code} value={code}>{code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground">Mata Kuliah</TableHead>
                    <TableHead className="font-semibold text-primary-foreground">
                      <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
                        <SelectTrigger className="w-auto border-0 bg-transparent text-primary-foreground h-auto p-0 gap-1 font-semibold hover:opacity-80 [&>svg]:text-primary-foreground">
                          <SelectValue placeholder="Kurikulum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Kurikulum</SelectItem>
                          {curricula?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground">
                      <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                        <SelectTrigger className="w-auto border-0 bg-transparent text-primary-foreground h-auto p-0 gap-1 font-semibold hover:opacity-80 [&>svg]:text-primary-foreground">
                          <SelectValue placeholder="Dosen Pengajar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Dosen</SelectItem>
                          {filterOptions.instructors.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground text-center">Mahasiswa</TableHead>
                    <TableHead className="font-semibold text-primary-foreground text-center">Rata-rata</TableHead>
                    <TableHead className="font-semibold text-primary-foreground">
                      <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                        <SelectTrigger className="w-auto border-0 bg-transparent text-primary-foreground h-auto p-0 gap-1 font-semibold hover:opacity-80 [&>svg]:text-primary-foreground mx-auto">
                          <SelectValue placeholder="Semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semester</SelectItem>
                          {filterOptions.semesters.map(sem => (
                            <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="text-primary-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course, i) => renderCourseRow(course, i))}
                  {filteredCourses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Tidak ada mata kuliah yang sesuai filter
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}