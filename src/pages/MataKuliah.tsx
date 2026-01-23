import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useCoursesWithStats } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, ChevronRight, Lock, Plus, Pencil, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Curriculum } from '@/lib/types';
import { toast } from 'sonner';
import { TableSortHeader, SortConfig, sortData } from '@/components/ui/table-sort-header';

export default function MataKuliah() {
  const { data: courses, isLoading, error, refetch } = useCoursesWithStats();
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const isGuest = !user;
  
  // Permission checks
  const canEdit = hasAnyRole(['admin', 'sub_admin', 'dosen']);
  
  // Filter states
  const [codeFilter, setCodeFilter] = useState('all');
  const [curriculumFilter, setCurriculumFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [instructorFilter, setInstructorFilter] = useState('all');
  const [isGenapSemester, setIsGenapSemester] = useState(false); // false = ganjil, true = genap
  
  // Sort state
  const [courseSort, setCourseSort] = useState<SortConfig | null>(null);
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{ course: any; isNew: boolean } | null>(null);
  const [formData, setFormData] = useState<{ code: string; name: string; semester: string; curriculum_id: string; passing_score: string; sks: string }>({
    code: '', name: '', semester: '', curriculum_id: '', passing_score: '60', sks: '0'
  });

  // Fetch curricula for filter and display
  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: async () => {
      const { data, error } = await supabase.from('curricula').select('*').order('name');
      if (error) throw error;
      return data as Curriculum[];
    },
  });

  // Semester options
  const semesterOptions = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

  // Save course mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editDialog) return;
      const { isNew, course } = editDialog;
      const dataToSave = {
        code: formData.code,
        name: formData.name,
        semester: formData.semester || null,
        curriculum_id: formData.curriculum_id || null,
        passing_score: parseInt(formData.passing_score) || 60,
        sks: parseInt(formData.sks) || 0,
      };

      if (isNew) {
        const { error } = await supabase.from('courses').insert(dataToSave);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').update(dataToSave).eq('id', course.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success(editDialog?.isNew ? 'Mata kuliah berhasil ditambahkan' : 'Mata kuliah berhasil diperbarui');
      setEditDialog(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error('Gagal menyimpan: ' + error.message);
    },
  });

  // Delete course mutation
  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Mata kuliah berhasil dihapus');
      refetch();
    },
    onError: (error: any) => {
      toast.error('Gagal menghapus: ' + error.message);
    },
  });

  const openEditDialog = (course: any | null, isNew: boolean) => {
    if (course) {
      setFormData({
        code: course.code || '',
        name: course.name || '',
        semester: course.semester || '',
        curriculum_id: course.curriculum_id || '',
        passing_score: course.passing_score?.toString() || '60',
        sks: course.sks?.toString() || '0',
      });
    } else {
      setFormData({ code: '', name: '', semester: '', curriculum_id: '', passing_score: '60', sks: '0' });
    }
    setEditDialog({ course, isNew });
  };

  const handleDelete = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Yakin ingin menghapus mata kuliah ini?')) {
      deleteMutation.mutate(courseId);
    }
  };

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

  // Helper to determine if semester is genap (even) or ganjil (odd)
  const isSemesterGenap = (semester: string | null | undefined) => {
    if (!semester) return null;
    const match = semester.match(/\d+/);
    if (!match) return null;
    const num = parseInt(match[0]);
    return num % 2 === 0; // even = genap
  };

  // Filtered and sorted courses
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    
    let result = courses.filter(course => {
      // Apply genap/ganjil filter
      const semesterIsGenap = isSemesterGenap(course.semester);
      if (semesterIsGenap !== null && semesterIsGenap !== isGenapSemester) return false;
      
      if (codeFilter !== 'all' && course.code !== codeFilter) return false;
      if (curriculumFilter !== 'all' && course.curriculum_id !== curriculumFilter) return false;
      if (semesterFilter !== 'all' && course.semester !== semesterFilter) return false;
      if (instructorFilter !== 'all' && !course.instructors.some(i => i.full_name === instructorFilter)) return false;
      return true;
    });
    
    // Apply sorting
    return sortData(result, courseSort, (item, key) => {
      switch (key) {
        case 'code': return item.code;
        case 'name': return item.name;
        case 'curriculum': return getCurriculumName(item.curriculum_id);
        case 'instructor': return item.instructors[0]?.full_name || null;
        case 'students': return item.total_students;
        case 'average': return item.average_score;
        case 'semester': return item.semester;
        case 'sks': return (item as any).sks ?? 0;
        default: return null;
      }
    });
  }, [courses, codeFilter, curriculumFilter, semesterFilter, instructorFilter, courseSort, curricula, isGenapSemester]);

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
        <TableCell className="text-center">
          <span className="font-medium">{(course as any).sks ?? 0}</span>
        </TableCell>
        {canEdit && (
          <TableCell>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog(course, false);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => handleDelete(course.id, e)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        )}
        <TableCell>
          {isGuest ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Link to={`/mata-kuliah/${course.id}`} onClick={(e) => e.stopPropagation()}>
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
      <div className="container py-8 lg:py-12 px-4 sm:px-6 lg:px-10 xl:px-16">
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
            <CardHeader className="flex flex-row items-center justify-between border-b flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <CardTitle className="text-lg">Daftar Mata Kuliah</CardTitle>
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
                  <Label 
                    htmlFor="semester-switch" 
                    className={cn(
                      "text-sm font-medium cursor-pointer transition-colors",
                      !isGenapSemester ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    Ganjil
                  </Label>
                  <Switch
                    id="semester-switch"
                    checked={isGenapSemester}
                    onCheckedChange={setIsGenapSemester}
                  />
                  <Label 
                    htmlFor="semester-switch" 
                    className={cn(
                      "text-sm font-medium cursor-pointer transition-colors",
                      isGenapSemester ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    Genap
                  </Label>
                </div>
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => openEditDialog(null, true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              )}
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="w-12 font-semibold text-primary-foreground">No</TableHead>
                    <TableHead className="font-semibold text-primary-foreground">
                      <TableSortHeader
                        sortKey="code"
                        currentSort={courseSort}
                        onSort={setCourseSort}
                        sortType="text"
                        filterOptions={filterOptions.codes}
                        filterValue={codeFilter}
                        onFilterChange={setCodeFilter}
                        filterPlaceholder="Filter kode..."
                      >
                        Kode
                      </TableSortHeader>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground">
                      <TableSortHeader
                        sortKey="name"
                        currentSort={courseSort}
                        onSort={setCourseSort}
                        sortType="text"
                      >
                        Mata Kuliah
                      </TableSortHeader>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground">
                      <TableSortHeader
                        sortKey="curriculum"
                        currentSort={courseSort}
                        onSort={setCourseSort}
                        sortType="text"
                        filterOptions={curricula?.map(c => c.name) || []}
                        filterValue={curriculumFilter === 'all' ? 'all' : curricula?.find(c => c.id === curriculumFilter)?.name || 'all'}
                        onFilterChange={(val) => {
                          if (val === 'all') {
                            setCurriculumFilter('all');
                          } else {
                            const found = curricula?.find(c => c.name === val);
                            setCurriculumFilter(found?.id || 'all');
                          }
                        }}
                        filterPlaceholder="Filter kurikulum..."
                      >
                        Kurikulum
                      </TableSortHeader>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground">
                      <TableSortHeader
                        sortKey="instructor"
                        currentSort={courseSort}
                        onSort={setCourseSort}
                        sortType="text"
                        filterOptions={filterOptions.instructors}
                        filterValue={instructorFilter}
                        onFilterChange={setInstructorFilter}
                        filterPlaceholder="Filter dosen..."
                      >
                        Dosen Pengajar
                      </TableSortHeader>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground text-center">
                      <TableSortHeader
                        sortKey="students"
                        currentSort={courseSort}
                        onSort={setCourseSort}
                        sortType="number"
                      >
                        Mahasiswa
                      </TableSortHeader>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground text-center">
                      <TableSortHeader
                        sortKey="average"
                        currentSort={courseSort}
                        onSort={setCourseSort}
                        sortType="number"
                      >
                        Rata-rata
                      </TableSortHeader>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground">
                      <TableSortHeader
                        sortKey="semester"
                        currentSort={courseSort}
                        onSort={setCourseSort}
                        sortType="text"
                        filterOptions={filterOptions.semesters}
                        filterValue={semesterFilter}
                        onFilterChange={setSemesterFilter}
                        filterPlaceholder="Filter semester..."
                      >
                        Semester
                      </TableSortHeader>
                    </TableHead>
                    <TableHead className="font-semibold text-primary-foreground text-center">
                      <TableSortHeader
                        sortKey="sks"
                        currentSort={courseSort}
                        onSort={setCourseSort}
                        sortType="number"
                      >
                        SKS
                      </TableSortHeader>
                    </TableHead>
                    {canEdit && <TableHead className="font-semibold text-primary-foreground w-24">Aksi</TableHead>}
                    <TableHead className="text-primary-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course, i) => renderCourseRow(course, i))}
                  {filteredCourses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 11 : 10} className="text-center py-8 text-muted-foreground">
                        Tidak ada mata kuliah yang sesuai filter
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Edit Dialog */}
        {editDialog && (
          <Dialog open onOpenChange={() => setEditDialog(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editDialog.isNew ? 'Tambah' : 'Edit'} Mata Kuliah</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Kode Mata Kuliah</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: MK001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nama Mata Kuliah</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Nahwu 1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kurikulum</label>
                  <Select value={formData.curriculum_id} onValueChange={(v) => setFormData({ ...formData, curriculum_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kurikulum..." />
                    </SelectTrigger>
                    <SelectContent>
                      {curricula?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Semester</label>
                  <Select value={formData.semester} onValueChange={(v) => setFormData({ ...formData, semester: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih semester..." />
                    </SelectTrigger>
                    <SelectContent>
                      {semesterOptions.map(sem => (
                        <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">SKS</label>
                    <Input
                      type="number"
                      value={formData.sks}
                      onChange={(e) => setFormData({ ...formData, sks: e.target.value })}
                      placeholder="0"
                      min={0}
                      max={24}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nilai Kelulusan (%)</label>
                    <Input
                      type="number"
                      value={formData.passing_score}
                      onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
                      placeholder="60"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialog(null)}>Batal</Button>
                <Button 
                  onClick={() => saveMutation.mutate()} 
                  disabled={!formData.code || !formData.name || saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}