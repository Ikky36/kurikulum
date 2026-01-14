import { useState, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Users, Download, Upload, UserPlus, UserMinus, Search, Check, CheckCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ClassGroup, Profile, ClassStudent } from '@/lib/types';
import * as XLSX from 'xlsx';

type SistemKuliah = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export function KurikulumTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Class state
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [selectedClassForManage, setSelectedClassForManage] = useState<ClassGroup | null>(null);
  const [showManageStudentsDialog, setShowManageStudentsDialog] = useState(false);
  
  // Filter state for manage students
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [sistemKuliahFilter, setSistemKuliahFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

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

  // Fetch Sistem Kuliah
  const { data: sistemKuliahList } = useQuery({
    queryKey: ['sistem-kuliah'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistem_kuliah')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as SistemKuliah[];
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

  // Get available years from students
  const availableYears = [...new Set(students?.map(s => s.enrollment_year).filter(Boolean) || [])].sort((a, b) => (b || 0) - (a || 0));

  // Filter students not in class based on filters
  const getFilteredStudentsNotInClass = (classGroupId: string) => {
    let filtered = getStudentsNotInClass(classGroupId);
    
    if (yearFilter !== 'all') {
      filtered = filtered.filter(s => s.enrollment_year?.toString() === yearFilter);
    }
    if (genderFilter !== 'all') {
      filtered = filtered.filter(s => s.gender === genderFilter);
    }
    if (sistemKuliahFilter !== 'all') {
      filtered = filtered.filter(s => s.sistem_kuliah_id === sistemKuliahFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.full_name.toLowerCase().includes(query) || 
        s.nim?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  // Select all filtered students
  const selectAllFiltered = (classGroupId: string) => {
    const filteredStudents = getFilteredStudentsNotInClass(classGroupId);
    setSelectedStudents(filteredStudents.map(s => s.id));
  };

  // Add multiple students to class
  const addMultipleStudentsToClassMutation = useMutation({
    mutationFn: async ({ classGroupId, studentIds }: { classGroupId: string; studentIds: string[] }) => {
      const insertData = studentIds.map(studentId => ({ class_group_id: classGroupId, student_profile_id: studentId }));
      const { error } = await supabase.from('class_students').insert(insertData);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-students'] });
      toast({ title: 'Berhasil', description: `${variables.studentIds.length} mahasiswa berhasil ditambahkan ke kelas` });
      setSelectedStudents([]);
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Select students by year
  const selectByYear = (year: number, classGroupId: string) => {
    const studentsToSelect = getStudentsNotInClass(classGroupId).filter(s => s.enrollment_year === year);
    setSelectedStudents(studentsToSelect.map(s => s.id));
  };

  // Select students by gender
  const selectByGender = (gender: string, classGroupId: string) => {
    const studentsToSelect = getStudentsNotInClass(classGroupId).filter(s => s.gender === gender);
    setSelectedStudents(studentsToSelect.map(s => s.id));
  };

  // Toggle individual student selection
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Reset filters when dialog closes
  const resetManageDialog = () => {
    setYearFilter('all');
    setGenderFilter('all');
    setSistemKuliahFilter('all');
    setSearchQuery('');
    setSelectedStudents([]);
    setShowManageStudentsDialog(false);
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

  return (
    <div className="space-y-6">
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
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="w-12 text-primary-foreground">No</TableHead>
                <TableHead className="text-primary-foreground">Nama Kelas</TableHead>
                <TableHead className="text-primary-foreground">Deskripsi</TableHead>
                <TableHead className="text-primary-foreground">Jumlah Mahasiswa</TableHead>
                <TableHead className="w-56 text-primary-foreground">Aksi</TableHead>
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

      {/* Manage Students Dialog */}
      <Dialog open={showManageStudentsDialog} onOpenChange={(open) => { if (!open) resetManageDialog(); else setShowManageStudentsDialog(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Kelola Mahasiswa Kelas {selectedClassForManage?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
            {/* Students in class */}
            <div className="flex flex-col">
              <h4 className="font-medium mb-2">Mahasiswa di Kelas ({selectedClassForManage ? getStudentsInClass(selectedClassForManage.id).length : 0})</h4>
              <div className="border rounded-lg p-2 flex-1 overflow-y-auto max-h-[400px] space-y-1">
                {selectedClassForManage && getStudentsInClass(selectedClassForManage.id).map(student => (
                  <div key={student.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                    <div className="text-sm">
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-muted-foreground text-xs">{student.nim} • {student.enrollment_year || '-'} • {student.gender || '-'}</p>
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
              
              {/* Filters */}
              <div className="space-y-2 mb-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau NIM..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Angkatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Angkatan</SelectItem>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year!.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Gender</SelectItem>
                      <SelectItem value="pria">Pria</SelectItem>
                      <SelectItem value="wanita">Wanita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sistem Kuliah Filter */}
                {sistemKuliahList && sistemKuliahList.length > 0 && (
                  <Select value={sistemKuliahFilter} onValueChange={setSistemKuliahFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sistem Kuliah" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Sistem Kuliah</SelectItem>
                      {sistemKuliahList.map(sk => (
                        <SelectItem key={sk.id} value={sk.id}>{sk.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {/* Bulk selection buttons */}
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-xs text-muted-foreground mr-1">Pilih:</span>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-6 text-xs px-2 gap-1"
                    onClick={() => selectedClassForManage && selectAllFiltered(selectedClassForManage.id)}
                  >
                    <CheckCheck className="h-3 w-3" />
                    Semua
                  </Button>
                  {availableYears.slice(0, 3).map(year => (
                    <Button 
                      key={year} 
                      variant="outline" 
                      size="sm" 
                      className="h-6 text-xs px-2"
                      onClick={() => selectedClassForManage && selectByYear(year!, selectedClassForManage.id)}
                    >
                      {year}
                    </Button>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-xs px-2"
                    onClick={() => selectedClassForManage && selectByGender('pria', selectedClassForManage.id)}
                  >
                    Pria
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-xs px-2"
                    onClick={() => selectedClassForManage && selectByGender('wanita', selectedClassForManage.id)}
                  >
                    Wanita
                  </Button>
                  {selectedStudents.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs px-2 text-destructive"
                      onClick={() => setSelectedStudents([])}
                    >
                      Batal ({selectedStudents.length})
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Add selected button */}
              {selectedStudents.length > 0 && selectedClassForManage && (
                <Button 
                  size="sm" 
                  className="mb-2"
                  onClick={() => addMultipleStudentsToClassMutation.mutate({ classGroupId: selectedClassForManage.id, studentIds: selectedStudents })}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Tambahkan {selectedStudents.length} Mahasiswa
                </Button>
              )}
              
              <div className="border rounded-lg p-2 flex-1 overflow-y-auto max-h-[300px] space-y-1">
                {selectedClassForManage && getFilteredStudentsNotInClass(selectedClassForManage.id).map(student => (
                  <div key={student.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => toggleStudentSelection(student.id)}
                    />
                    <div className="text-sm flex-1">
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-muted-foreground text-xs">{student.nim} • {student.enrollment_year || '-'} • {student.gender || '-'}</p>
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
                {selectedClassForManage && getFilteredStudentsNotInClass(selectedClassForManage.id).length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">Tidak ada mahasiswa yang cocok</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetManageDialog}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
