import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Plus, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile, Course } from '@/lib/types';

export function ManageClassTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState('');
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');

  // Fetch all students
  const { data: allStudents } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mahasiswa')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch all courses
  const { data: courses } = useQuery({
    queryKey: ['courses-for-enrollment'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('code');
      if (error) throw error;
      return data as Course[];
    },
  });

  // Fetch enrollments
  const { data: enrollments, refetch: refetchEnrollments } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`*, profiles:student_profile_id (*), courses:course_id (*)`);
      if (error) throw error;
      return data.map(d => ({
        ...d,
        student: d.profiles as unknown as Profile,
        course: d.courses as unknown as Course,
      }));
    },
  });

  // Get unique years for filter
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allStudents?.forEach(s => {
      if (s.enrollment_year) years.add(s.enrollment_year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allStudents]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return allStudents?.filter(s => {
      if (yearFilter !== 'all' && s.enrollment_year?.toString() !== yearFilter) return false;
      if (genderFilter !== 'all' && (s as any).gender !== genderFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = s.full_name?.toLowerCase().includes(query);
        const matchesNim = s.nim?.toLowerCase().includes(query);
        return matchesName || matchesNim;
      }
      return true;
    }) || [];
  }, [allStudents, yearFilter, genderFilter, searchQuery]);

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async ({ courseId, studentIds }: { courseId: string; studentIds: string[] }) => {
      // Get existing enrollments for this course
      const { data: existing } = await supabase
        .from('enrollments')
        .select('student_profile_id')
        .eq('course_id', courseId);
      
      const existingIds = existing?.map(e => e.student_profile_id) || [];
      const newStudentIds = studentIds.filter(id => !existingIds.includes(id));
      
      if (newStudentIds.length === 0) {
        throw new Error('Semua mahasiswa yang dipilih sudah terdaftar di mata kuliah ini');
      }

      const insertData = newStudentIds.map(id => ({
        course_id: courseId,
        student_profile_id: id,
      }));
      
      const { error } = await supabase.from('enrollments').insert(insertData);
      if (error) throw error;
      
      return newStudentIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['all-enrollments'] });
      toast({ title: 'Berhasil', description: `${count} mahasiswa berhasil didaftarkan` });
      setShowEnrollDialog(false);
      setSelectedStudents([]);
      setSelectedCourseForEnroll('');
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Unenroll mutation
  const unenrollMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-enrollments'] });
      toast({ title: 'Berhasil', description: 'Mahasiswa berhasil dikeluarkan dari kelas' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectByYear = (year: number) => {
    const studentsInYear = allStudents?.filter(s => s.enrollment_year === year).map(s => s.id) || [];
    setSelectedStudents(prev => {
      const newSelection = new Set(prev);
      studentsInYear.forEach(id => newSelection.add(id));
      return Array.from(newSelection);
    });
  };

  const handleSelectByGender = (gender: string) => {
    const studentsByGender = allStudents?.filter(s => (s as any).gender === gender).map(s => s.id) || [];
    setSelectedStudents(prev => {
      const newSelection = new Set(prev);
      studentsByGender.forEach(id => newSelection.add(id));
      return Array.from(newSelection);
    });
  };

  const handleEnroll = () => {
    if (!selectedCourseForEnroll || selectedStudents.length === 0) return;
    enrollMutation.mutate({ courseId: selectedCourseForEnroll, studentIds: selectedStudents });
  };

  return (
    <div className="space-y-6">
      {/* Selection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Kelola Mahasiswa Kelas
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => setShowEnrollDialog(true)}
              disabled={selectedStudents.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Daftarkan ke Kelas ({selectedStudents.length})
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nama atau NIM..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Angkatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Angkatan</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Gender</SelectItem>
                <SelectItem value="pria">Pria</SelectItem>
                <SelectItem value="wanita">Wanita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-muted-foreground self-center mr-2">Pilih berdasarkan:</span>
            {availableYears.slice(0, 5).map(year => (
              <Button 
                key={year} 
                variant="outline" 
                size="sm"
                onClick={() => handleSelectByYear(year)}
              >
                Angkatan {year}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => handleSelectByGender('pria')}>
              Pria
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSelectByGender('wanita')}>
              Wanita
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="w-12 text-primary-foreground">
                  <Checkbox 
                    checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-primary-foreground">Nama</TableHead>
                <TableHead className="text-primary-foreground">NIM</TableHead>
                <TableHead className="text-primary-foreground">Gender</TableHead>
                <TableHead className="text-primary-foreground">Angkatan</TableHead>
                <TableHead className="text-primary-foreground">Program</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.slice(0, 50).map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudents([...selectedStudents, student.id]);
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.photo_url || undefined} />
                        <AvatarFallback>{student.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{student.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{student.nim || '-'}</TableCell>
                  <TableCell className="capitalize">{(student as any).gender || '-'}</TableCell>
                  <TableCell>{student.enrollment_year || '-'}</TableCell>
                  <TableCell>{student.program || '-'}</TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Tidak ada mahasiswa yang sesuai filter
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filteredStudents.length > 50 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Menampilkan 50 dari {filteredStudents.length} mahasiswa. Gunakan filter untuk mempersempit.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daftarkan Mahasiswa ke Kelas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedStudents.length} mahasiswa dipilih
            </p>
            <div className="space-y-2">
              <Label>Pilih Mata Kuliah</Label>
              <Select value={selectedCourseForEnroll} onValueChange={setSelectedCourseForEnroll}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata kuliah..." />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleEnroll} 
              disabled={!selectedCourseForEnroll || enrollMutation.isPending}
            >
              Daftarkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Current Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pendaftaran Kelas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="w-12 text-primary-foreground">No</TableHead>
                <TableHead className="text-primary-foreground">Mahasiswa</TableHead>
                <TableHead className="text-primary-foreground">NIM</TableHead>
                <TableHead className="text-primary-foreground">Mata Kuliah</TableHead>
                <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments?.slice(0, 50).map((enrollment, index) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={enrollment.student?.photo_url || undefined} />
                        <AvatarFallback>{enrollment.student?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{enrollment.student?.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{enrollment.student?.nim || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono mr-2">{enrollment.course?.code}</Badge>
                    {enrollment.course?.name}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => unenrollMutation.mutate(enrollment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!enrollments || enrollments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Belum ada pendaftaran kelas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {enrollments && enrollments.length > 50 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Menampilkan 50 dari {enrollments.length} pendaftaran
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
