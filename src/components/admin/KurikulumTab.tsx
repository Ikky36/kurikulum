import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Target, BookOpen, Link2, Users, Download, Upload, UserPlus, UserMinus } from 'lucide-react';
import { PLO, Course, CoursePLO, ClassGroup, Profile, Curriculum, ClassStudent } from '@/lib/types';
import * as XLSX from 'xlsx';

export function KurikulumTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // PLO state
  const [showPloDialog, setShowPloDialog] = useState(false);
  const [editingPlo, setEditingPlo] = useState<PLO | null>(null);
  const [ploCode, setPloCode] = useState('');
  const [ploDescription, setPloDescription] = useState('');

  // Course state
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseSemester, setCourseSemester] = useState('');
  const [courseCurriculumId, setCourseCurriculumId] = useState('');
  const [coursePassingScore, setCoursePassingScore] = useState('60');
  const [selectedPlos, setSelectedPlos] = useState<string[]>([]);

  // Link PLO dialog state
  const [showLinkPloDialog, setShowLinkPloDialog] = useState(false);
  const [selectedCourseForLink, setSelectedCourseForLink] = useState<Course | null>(null);
  const [linkingPlos, setLinkingPlos] = useState<string[]>([]);

  // Class state
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [selectedClassForManage, setSelectedClassForManage] = useState<ClassGroup | null>(null);
  const [showManageStudentsDialog, setShowManageStudentsDialog] = useState(false);

  // Fetch PLOs
  const { data: plos } = useQuery({
    queryKey: ['plos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plos')
        .select('*')
        .order('code');
      if (error) throw error;
      return data as PLO[];
    },
  });

  // Fetch Courses with curriculum
  const { data: courses } = useQuery({
    queryKey: ['admin-courses-kurikulum'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code');
      if (error) throw error;
      return data as Course[];
    },
  });

  // Fetch Course-PLO relationships
  const { data: coursePlos } = useQuery({
    queryKey: ['course-plos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_plos')
        .select('*, plos:plo_id(*)');
      if (error) throw error;
      return data.map(cp => ({
        ...cp,
        plo: cp.plos as unknown as PLO
      })) as CoursePLO[];
    },
  });

  // Fetch Class Groups
  const { data: classGroups, refetch: refetchClasses } = useQuery({
    queryKey: ['class-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_groups')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as ClassGroup[];
    },
  });

  // Fetch Students (mahasiswa only)
  const { data: students, refetch: refetchStudents } = useQuery({
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

  // Fetch class_students relationships
  const { data: classStudents, refetch: refetchClassStudents } = useQuery({
    queryKey: ['class-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_students')
        .select('*');
      if (error) throw error;
      return data as ClassStudent[];
    },
  });

  // Fetch curricula from settings
  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: async () => {
      const { data, error } = await supabase.from('curricula').select('*').order('name');
      if (error) throw error;
      return data as Curriculum[];
    },
  });

  // PLO mutations
  const createPloMutation = useMutation({
    mutationFn: async (plo: { code: string; description: string }) => {
      const { error } = await supabase.from('plos').insert([plo]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plos'] });
      toast({ title: 'Berhasil', description: 'CPL/PLO berhasil ditambahkan' });
      resetPloForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updatePloMutation = useMutation({
    mutationFn: async ({ id, ...plo }: Partial<PLO> & { id: string }) => {
      const { error } = await supabase.from('plos').update(plo).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plos'] });
      toast({ title: 'Berhasil', description: 'CPL/PLO berhasil diperbarui' });
      resetPloForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deletePloMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plos'] });
      queryClient.invalidateQueries({ queryKey: ['course-plos'] });
      toast({ title: 'Berhasil', description: 'CPL/PLO berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Course mutations
  const createCourseMutation = useMutation({
    mutationFn: async ({ plos: ploIds, ...course }: { code: string; name: string; semester?: string; passing_score?: number; curriculum_id?: string; plos: string[] }) => {
      const { data, error } = await supabase.from('courses').insert([course]).select().single();
      if (error) throw error;
      
      // Link PLOs to course
      if (ploIds.length > 0) {
        const coursePloData = ploIds.map(ploId => ({
          course_id: data.id,
          plo_id: ploId
        }));
        const { error: linkError } = await supabase.from('course_plos').insert(coursePloData);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses-kurikulum'] });
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-plos'] });
      toast({ title: 'Berhasil', description: 'Mata kuliah berhasil ditambahkan' });
      resetCourseForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, ...course }: Partial<Course> & { id: string }) => {
      const { error } = await supabase.from('courses').update(course).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses-kurikulum'] });
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast({ title: 'Berhasil', description: 'Mata kuliah berhasil diperbarui' });
      resetCourseForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses-kurikulum'] });
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-plos'] });
      toast({ title: 'Berhasil', description: 'Mata kuliah berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Course-PLO link mutations
  const updateCoursePlosMutation = useMutation({
    mutationFn: async ({ courseId, ploIds }: { courseId: string; ploIds: string[] }) => {
      // Remove existing links
      const { error: deleteError } = await supabase
        .from('course_plos')
        .delete()
        .eq('course_id', courseId);
      if (deleteError) throw deleteError;
      
      // Add new links
      if (ploIds.length > 0) {
        const coursePloData = ploIds.map(ploId => ({
          course_id: courseId,
          plo_id: ploId
        }));
        const { error: insertError } = await supabase.from('course_plos').insert(coursePloData);
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-plos'] });
      toast({ title: 'Berhasil', description: 'CPL/PLO mata kuliah berhasil diperbarui' });
      setShowLinkPloDialog(false);
      setSelectedCourseForLink(null);
      setLinkingPlos([]);
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Class mutations
  const createClassMutation = useMutation({
    mutationFn: async (classData: { name: string; description?: string }) => {
      const { error } = await supabase.from('class_groups').insert([classData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-groups'] });
      toast({ title: 'Berhasil', description: 'Kelas berhasil ditambahkan' });
      resetClassForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, ...classData }: Partial<ClassGroup> & { id: string }) => {
      const { error } = await supabase.from('class_groups').update(classData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-groups'] });
      toast({ title: 'Berhasil', description: 'Kelas berhasil diperbarui' });
      resetClassForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('class_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-groups'] });
      toast({ title: 'Berhasil', description: 'Kelas berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Class student mutations
  const addStudentToClassMutation = useMutation({
    mutationFn: async ({ classGroupId, studentId }: { classGroupId: string; studentId: string }) => {
      const { error } = await supabase.from('class_students').insert([{ class_group_id: classGroupId, student_profile_id: studentId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-students'] });
      toast({ title: 'Berhasil', description: 'Mahasiswa berhasil ditambahkan ke kelas' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const removeStudentFromClassMutation = useMutation({
    mutationFn: async ({ classGroupId, studentId }: { classGroupId: string; studentId: string }) => {
      const { error } = await supabase.from('class_students').delete().eq('class_group_id', classGroupId).eq('student_profile_id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-students'] });
      toast({ title: 'Berhasil', description: 'Mahasiswa berhasil dihapus dari kelas' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const resetPloForm = () => {
    setPloCode('');
    setPloDescription('');
    setEditingPlo(null);
    setShowPloDialog(false);
  };

  const resetCourseForm = () => {
    setCourseCode('');
    setCourseName('');
    setCourseSemester('');
    setCourseCurriculumId('');
    setCoursePassingScore('60');
    setSelectedPlos([]);
    setEditingCourse(null);
    setShowCourseDialog(false);
  };

  const resetClassForm = () => {
    setClassName('');
    setClassDescription('');
    setEditingClass(null);
    setShowClassDialog(false);
  };

  const openEditClass = (classItem: ClassGroup) => {
    setEditingClass(classItem);
    setClassName(classItem.name);
    setClassDescription(classItem.description || '');
    setShowClassDialog(true);
  };

  const handleSaveClass = () => {
    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass.id, name: className, description: classDescription || undefined });
    } else {
      createClassMutation.mutate({ name: className, description: classDescription || undefined });
    }
  };

  // Get students in a class
  const getStudentsInClass = (classGroupId: string) => {
    const studentIds = classStudents?.filter(cs => cs.class_group_id === classGroupId).map(cs => cs.student_profile_id) || [];
    return students?.filter(s => studentIds.includes(s.id)) || [];
  };

  // Get students not in a class
  const getStudentsNotInClass = (classGroupId: string) => {
    const studentIds = classStudents?.filter(cs => cs.class_group_id === classGroupId).map(cs => cs.student_profile_id) || [];
    return students?.filter(s => !studentIds.includes(s.id)) || [];
  };

  // Export students of a class
  const handleExportClassStudents = (classGroup: ClassGroup) => {
    const classStudentList = getStudentsInClass(classGroup.id);
    if (classStudentList.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada mahasiswa di kelas ini' });
      return;
    }

    const exportData = classStudentList.map((s, index) => ({
      No: index + 1,
      NIM: s.nim || '',
      'Nama Lengkap': s.full_name,
      Email: s.email,
      Angkatan: s.enrollment_year || '',
      'Program Studi': s.program || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mahasiswa');
    XLSX.writeFile(wb, `Mahasiswa_Kelas_${classGroup.name}.xlsx`);
    toast({ title: 'Berhasil', description: `Data mahasiswa kelas ${classGroup.name} berhasil diekspor` });
  };

  // Import students to a class
  const handleImportClassStudents = async (e: React.ChangeEvent<HTMLInputElement>, classGroup: ClassGroup) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        let addedCount = 0;
        for (const row of data) {
          const nim = row['NIM']?.toString();
          if (!nim) continue;

          // Find student by NIM
          const student = students?.find(s => s.nim === nim);
          if (!student) continue;

          // Check if already in class
          const alreadyInClass = classStudents?.some(cs => cs.class_group_id === classGroup.id && cs.student_profile_id === student.id);
          if (alreadyInClass) continue;

          // Add to class
          const { error } = await supabase.from('class_students').insert([{ class_group_id: classGroup.id, student_profile_id: student.id }]);
          if (!error) addedCount++;
        }

        toast({ title: 'Berhasil', description: `${addedCount} mahasiswa berhasil ditambahkan ke kelas ${classGroup.name}` });
        refetchClassStudents();
      } catch (error: any) {
        toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const openEditPlo = (plo: PLO) => {
    setEditingPlo(plo);
    setPloCode(plo.code);
    setPloDescription(plo.description);
    setShowPloDialog(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseCode(course.code);
    setCourseName(course.name);
    setCourseSemester(course.semester || '');
    setCourseCurriculumId(course.curriculum_id || '');
    setCoursePassingScore(course.passing_score.toString());
    setShowCourseDialog(true);
  };

  const openLinkPloDialog = (course: Course) => {
    const existingPlos = coursePlos?.filter(cp => cp.course_id === course.id).map(cp => cp.plo_id) || [];
    setSelectedCourseForLink(course);
    setLinkingPlos(existingPlos);
    setShowLinkPloDialog(true);
  };

  const handleSavePlo = () => {
    if (editingPlo) {
      updatePloMutation.mutate({ id: editingPlo.id, code: ploCode, description: ploDescription });
    } else {
      createPloMutation.mutate({ code: ploCode, description: ploDescription });
    }
  };

  const handleSaveCourse = () => {
    const courseData = {
      code: courseCode,
      name: courseName,
      semester: courseSemester || undefined,
      curriculum_id: courseCurriculumId || undefined,
      passing_score: parseInt(coursePassingScore) || 60,
    };

    if (editingCourse) {
      updateCourseMutation.mutate({ ...courseData, id: editingCourse.id });
    } else {
      createCourseMutation.mutate({ ...courseData, plos: selectedPlos });
    }
  };

  const getCoursePloList = (courseId: string) => {
    return coursePlos?.filter(cp => cp.course_id === courseId) || [];
  };

  const getCurriculumName = (curriculumId?: string | null) => {
    if (!curriculumId) return null;
    return curricula?.find(c => c.id === curriculumId)?.name;
  };

  const semesterOptions = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="plo" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plo" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            CPL/PLO
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Mata Kuliah
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Kelas
          </TabsTrigger>
        </TabsList>

        {/* PLO Tab */}
        <TabsContent value="plo">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>CPL/PLO (Program Learning Outcomes)</CardTitle>
                  <CardDescription>Kelola Capaian Pembelajaran Lulusan</CardDescription>
                </div>
                <Dialog open={showPloDialog} onOpenChange={(open) => { if (!open) resetPloForm(); setShowPloDialog(open); }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah CPL
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingPlo ? 'Edit CPL/PLO' : 'Tambah CPL/PLO Baru'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Kode CPL</Label>
                        <Input 
                          value={ploCode} 
                          onChange={(e) => setPloCode(e.target.value)} 
                          placeholder="Contoh: CPL-1" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Deskripsi</Label>
                        <Textarea 
                          value={ploDescription} 
                          onChange={(e) => setPloDescription(e.target.value)} 
                          placeholder="Deskripsi capaian pembelajaran..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSavePlo} disabled={!ploCode || !ploDescription}>
                        {editingPlo ? 'Simpan' : 'Tambah'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">No</TableHead>
                    <TableHead className="w-32">Kode</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="w-24">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plos?.map((plo, index) => (
                    <TableRow key={plo.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{plo.code}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{plo.description}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditPlo(plo)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => deletePloMutation.mutate(plo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!plos || plos.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Belum ada CPL/PLO. Klik "Tambah CPL" untuk menambahkan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mata Kuliah</CardTitle>
                  <CardDescription>Kelola mata kuliah dan hubungkan dengan CPL/PLO</CardDescription>
                </div>
                <Dialog open={showCourseDialog} onOpenChange={(open) => { if (!open) resetCourseForm(); setShowCourseDialog(open); }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Mata Kuliah
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingCourse ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah Baru'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Kode</Label>
                          <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="PBA101" />
                        </div>
                        <div className="space-y-2">
                          <Label>Semester</Label>
                          <Select value={courseSemester} onValueChange={setCourseSemester}>
                            <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>
                              {semesterOptions.map(sem => (
                                <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Nama Mata Kuliah</Label>
                        <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Nama mata kuliah" />
                      </div>
                      <div className="space-y-2">
                        <Label>Kurikulum</Label>
                        <Select value={courseCurriculumId} onValueChange={setCourseCurriculumId}>
                          <SelectTrigger><SelectValue placeholder="Pilih kurikulum" /></SelectTrigger>
                          <SelectContent>
                            {curricula?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                            {(!curricula || curricula.length === 0) && (
                              <SelectItem value="" disabled>Belum ada kurikulum. Buat di Pengaturan.</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Passing Score</Label>
                        <Input type="number" min="0" max="100" value={coursePassingScore} onChange={(e) => setCoursePassingScore(e.target.value)} />
                      </div>
                      {!editingCourse && plos && plos.length > 0 && (
                        <div className="space-y-2">
                          <Label>CPL/PLO Terkait</Label>
                          <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                            {plos.map((plo) => (
                              <div key={plo.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`plo-${plo.id}`}
                                  checked={selectedPlos.includes(plo.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPlos([...selectedPlos, plo.id]);
                                    } else {
                                      setSelectedPlos(selectedPlos.filter(id => id !== plo.id));
                                    }
                                  }}
                                />
                                <label htmlFor={`plo-${plo.id}`} className="text-sm cursor-pointer">
                                  <span className="font-mono font-medium">{plo.code}</span> - {plo.description}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveCourse} disabled={!courseCode || !courseName}>
                        {editingCourse ? 'Simpan' : 'Tambah'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">No</TableHead>
                    <TableHead className="w-28">Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kurikulum</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>CPL/PLO Terkait</TableHead>
                    <TableHead className="w-32">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses?.map((course, index) => {
                    const linkedPlos = getCoursePloList(course.id);
                    const curriculumName = getCurriculumName(course.curriculum_id);
                    return (
                      <TableRow key={course.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">{course.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{course.name}</TableCell>
                        <TableCell>
                          {curriculumName ? (
                            <Badge variant="outline">{curriculumName}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{course.semester || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {linkedPlos.length > 0 ? (
                              linkedPlos.map(cp => (
                                <Badge key={cp.id} variant="outline" className="text-xs">
                                  {cp.plo?.code}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">Belum ada</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openLinkPloDialog(course)} title="Hubungkan CPL">
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditCourse(course)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteCourseMutation.mutate(course.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!courses || courses.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Belum ada mata kuliah. Klik "Tambah Mata Kuliah" untuk menambahkan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kelola Kelas</CardTitle>
                  <CardDescription>Buat kelas dan kelola mahasiswa tiap kelas</CardDescription>
                </div>
                <Dialog open={showClassDialog} onOpenChange={(open) => { if (!open) resetClassForm(); setShowClassDialog(open); }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Kelas
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nama Kelas</Label>
                        <Input 
                          value={className} 
                          onChange={(e) => setClassName(e.target.value)} 
                          placeholder="Contoh: A, B, C, atau 2024-A" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Deskripsi (opsional)</Label>
                        <Textarea 
                          value={classDescription} 
                          onChange={(e) => setClassDescription(e.target.value)} 
                          placeholder="Deskripsi kelas..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveClass} disabled={!className}>
                        {editingClass ? 'Simpan' : 'Tambah'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama Kelas</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Jumlah Mahasiswa</TableHead>
                    <TableHead className="w-56">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classGroups?.map((classItem, index) => {
                    const studentCount = getStudentsInClass(classItem.id).length;
                    return (
                      <TableRow key={classItem.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{classItem.name}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{classItem.description || '-'}</TableCell>
                        <TableCell>{studentCount} mahasiswa</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setSelectedClassForManage(classItem);
                                setShowManageStudentsDialog(true);
                              }}
                              title="Kelola mahasiswa"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleExportClassStudents(classItem)}
                              title="Export mahasiswa"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <label>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                asChild
                                title="Import mahasiswa"
                              >
                                <span>
                                  <Upload className="h-4 w-4" />
                                </span>
                              </Button>
                              <input
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(e) => handleImportClassStudents(e, classItem)}
                              />
                            </label>
                            <Button variant="ghost" size="icon" onClick={() => openEditClass(classItem)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteClassMutation.mutate(classItem.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!classGroups || classGroups.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Belum ada kelas. Klik "Tambah Kelas" untuk menambahkan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Link PLO Dialog */}
      <Dialog open={showLinkPloDialog} onOpenChange={setShowLinkPloDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hubungkan CPL/PLO ke {selectedCourseForLink?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
              {plos?.map((plo) => (
                <div key={plo.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`link-plo-${plo.id}`}
                    checked={linkingPlos.includes(plo.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setLinkingPlos([...linkingPlos, plo.id]);
                      } else {
                        setLinkingPlos(linkingPlos.filter(id => id !== plo.id));
                      }
                    }}
                  />
                  <label htmlFor={`link-plo-${plo.id}`} className="text-sm cursor-pointer flex-1">
                    <span className="font-mono font-medium">{plo.code}</span> - {plo.description}
                  </label>
                </div>
              ))}
              {(!plos || plos.length === 0) && (
                <p className="text-muted-foreground text-center py-4">
                  Belum ada CPL/PLO. Tambahkan CPL/PLO terlebih dahulu.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkPloDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={() => selectedCourseForLink && updateCoursePlosMutation.mutate({ 
                courseId: selectedCourseForLink.id, 
                ploIds: linkingPlos 
              })}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Students Dialog */}
      <Dialog open={showManageStudentsDialog} onOpenChange={setShowManageStudentsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Kelola Mahasiswa Kelas {selectedClassForManage?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
            {/* Students in class */}
            <div className="flex flex-col">
              <h4 className="font-medium mb-2">Mahasiswa di Kelas</h4>
              <div className="border rounded-lg p-2 flex-1 overflow-y-auto max-h-[300px] space-y-1">
                {selectedClassForManage && getStudentsInClass(selectedClassForManage.id).map(student => (
                  <div key={student.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                    <div className="text-sm">
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-muted-foreground text-xs">{student.nim}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => removeStudentFromClassMutation.mutate({ classGroupId: selectedClassForManage.id, studentId: student.id })}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {selectedClassForManage && getStudentsInClass(selectedClassForManage.id).length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">Belum ada mahasiswa</p>
                )}
              </div>
            </div>
            
            {/* Students not in class */}
            <div className="flex flex-col">
              <h4 className="font-medium mb-2">Mahasiswa Tersedia</h4>
              <div className="border rounded-lg p-2 flex-1 overflow-y-auto max-h-[300px] space-y-1">
                {selectedClassForManage && getStudentsNotInClass(selectedClassForManage.id).map(student => (
                  <div key={student.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                    <div className="text-sm">
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-muted-foreground text-xs">{student.nim}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-primary hover:text-primary h-8 w-8"
                      onClick={() => addStudentToClassMutation.mutate({ classGroupId: selectedClassForManage.id, studentId: student.id })}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {selectedClassForManage && getStudentsNotInClass(selectedClassForManage.id).length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">Semua mahasiswa sudah di kelas</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageStudentsDialog(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
