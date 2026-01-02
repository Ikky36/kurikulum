import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useCoursesWithStats } from '@/hooks/useCourses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MataKuliah() {
  const { data: courses, isLoading, error } = useCoursesWithStats();

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2">
            Daftar Mata Kuliah
          </h1>
          <p className="text-muted-foreground text-lg">
            Program Bahasa Arab - 5 Mata Kuliah Utama
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
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Kode</TableHead>
                    <TableHead className="font-semibold">Nama Mata Kuliah</TableHead>
                    <TableHead className="font-semibold">Dosen Pengajar</TableHead>
                    <TableHead className="font-semibold text-center">Mahasiswa</TableHead>
                    <TableHead className="font-semibold text-center">Rata-rata</TableHead>
                    <TableHead className="font-semibold text-center">Semester</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses?.map((course, i) => (
                    <TableRow 
                      key={course.id} 
                      className="group cursor-pointer hover:bg-muted/30 transition-colors"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {course.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={`/mata-kuliah/${course.id}`} className="font-medium hover:text-primary transition-colors">
                          {course.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {course.instructors.length > 0 ? (
                            <>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={course.instructors[0]?.photo_url || undefined} />
                                <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                                  {course.instructors[0]?.full_name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{course.instructors[0]?.full_name}</span>
                              {course.instructors.length > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  +{course.instructors.length - 1}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">Belum ditugaskan</span>
                          )}
                        </div>
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
                        <Link to={`/mata-kuliah/${course.id}`}>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
