import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTableRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Camera, Loader2, Upload, Download, Save, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Navigate } from 'react-router-dom';
import { Course, Profile, Grade } from '@/lib/types';
import * as XLSX from 'xlsx';

export default function DashboardDosen() {
  const { user, profile, role, refreshProfile, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enable realtime for dosen dashboard
  useMultiTableRealtimeSubscription([
    { table: 'grades', queryKeys: [['course-grades'], ['grades']] },
    { table: 'enrollments', queryKeys: [['course-enrollments-dosen']] },
    { table: 'course_instructors', queryKeys: [['dosen-courses', user?.id || '']] },
  ], !!user?.id);
  
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [nip, setNip] = useState(profile?.nip || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Fetch assigned courses
  const { data: assignedCourses } = useQuery({
    queryKey: ['dosen-courses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_instructors')
        .select(`*, courses:course_id (*)`)
        .eq('instructor_profile_id', user?.id);
      if (error) throw error;
      return data.map(d => d.courses as unknown as Course).filter(Boolean);
    },
    enabled: !!user?.id,
  });

  // Fetch enrollments for selected course
  const { data: enrollments } = useQuery({
    queryKey: ['course-enrollments-dosen', selectedCourseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`*, profiles:student_profile_id (*)`)
        .eq('course_id', selectedCourseId);
      if (error) throw error;
      return data.map(d => ({ ...d, student: d.profiles as unknown as Profile }));
    },
    enabled: !!selectedCourseId,
  });

  // Fetch grades for selected course
  const { data: grades, refetch: refetchGrades } = useQuery({
    queryKey: ['course-grades-dosen', selectedCourseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grades')
        .select(`*, profiles:student_profile_id (*)`)
        .eq('course_id', selectedCourseId);
      if (error) throw error;
      return data.map(d => ({ ...d, student: d.profiles as unknown as Profile }));
    },
    enabled: !!selectedCourseId,
  });

  // Fetch all students for import validation
  const { data: allStudents } = useQuery({
    queryKey: ['all-students-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mahasiswa');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch all courses for import validation
  const { data: allCourses } = useQuery({
    queryKey: ['all-courses-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) throw error;
      return data as Course[];
    },
  });

  const updateGradeMutation = useMutation({
    mutationFn: async ({ studentId, score }: { studentId: string; score: number }) => {
      const existingGrade = grades?.find(g => g.student_profile_id === studentId);
      
      if (existingGrade) {
        const { error } = await supabase
          .from('grades')
          .update({ 
            final_score: score, 
            updated_by_profile_id: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingGrade.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grades')
          .insert({ 
            course_id: selectedCourseId, 
            student_profile_id: studentId, 
            final_score: score,
            updated_by_profile_id: user?.id
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-grades-dosen', selectedCourseId] });
      toast({ title: 'Berhasil', description: 'Nilai berhasil disimpan' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal menyimpan nilai', description: error.message, variant: 'destructive' });
    },
  });

  if (loading) {
    return <Layout><div className="container py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></Layout>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role && role !== 'dosen' && role !== 'admin') {
    return <Navigate to={`/dashboard/${role}`} replace />;
  }

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, nip: nip, gender: gender || null })
      .eq('id', user.id);

    setSaving(false);
    
    if (error) {
      toast({ title: 'Gagal menyimpan', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Berhasil', description: 'Profil berhasil diperbarui' });
      refreshProfile();
      setEditMode(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Gagal upload', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ photo_url: urlData.publicUrl })
      .eq('id', user.id);

    setUploading(false);

    if (updateError) {
      toast({ title: 'Gagal update profil', description: updateError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Berhasil', description: 'Foto profil berhasil diperbarui' });
      refreshProfile();
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['course_code', 'student_nim', 'student_name', 'final_score', 'notes'],
      ['PBA101', '12345678', 'Nama Mahasiswa', '85', 'Catatan opsional'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_nilai.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const errors: string[] = [];
      const validData: any[] = [];

      data.forEach((row: any, idx) => {
        const rowNum = idx + 2;
        
        // Validate course_code
        const course = allCourses?.find(c => c.code === row.course_code);
        if (!course) {
          errors.push(`Baris ${rowNum}: Kode mata kuliah "${row.course_code}" tidak ditemukan`);
          return;
        }

        // Check if dosen is assigned to this course
        const isAssigned = assignedCourses?.some(c => c.code === row.course_code);
        if (!isAssigned && role !== 'admin') {
          errors.push(`Baris ${rowNum}: Anda tidak ditugaskan untuk mata kuliah "${row.course_code}"`);
          return;
        }

        // Validate student_nim
        const student = allStudents?.find(s => s.nim === row.student_nim);
        if (!student) {
          errors.push(`Baris ${rowNum}: NIM "${row.student_nim}" tidak ditemukan`);
          return;
        }

        // Validate final_score
        const score = parseInt(row.final_score);
        if (isNaN(score) || score < 0 || score > 100) {
          errors.push(`Baris ${rowNum}: Nilai "${row.final_score}" tidak valid (harus 0-100)`);
          return;
        }

        validData.push({
          course_id: course.id,
          course_code: row.course_code,
          student_profile_id: student.id,
          student_nim: row.student_nim,
          student_name: student.full_name,
          final_score: score,
          notes: row.notes || null,
        });
      });

      setImportPreview(validData);
      setImportErrors(errors);
      setShowImportDialog(true);
    };
    reader.readAsBinaryString(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of importPreview) {
      const { error } = await supabase
        .from('grades')
        .upsert({
          course_id: item.course_id,
          student_profile_id: item.student_profile_id,
          final_score: item.final_score,
          notes: item.notes,
          updated_by_profile_id: user?.id,
        }, { onConflict: 'course_id,student_profile_id' });

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setShowImportDialog(false);
    setImportPreview([]);
    setImportErrors([]);
    refetchGrades();
    queryClient.invalidateQueries({ queryKey: ['courses-with-stats'] });
    
    const skippedCount = importErrors.length;
    if (successCount > 0) {
      const message = skippedCount > 0 
        ? `${successCount} nilai berhasil diimport, ${skippedCount} baris dilewati karena tidak valid${errorCount > 0 ? `, ${errorCount} gagal tersimpan` : ''}`
        : `${successCount} nilai berhasil diimport${errorCount > 0 ? `, ${errorCount} gagal` : ''}`;
      toast({ title: 'Import Selesai', description: message });
    } else {
      toast({ title: 'Import gagal', description: 'Tidak ada data yang berhasil diimport', variant: 'destructive' });
    }
  };

  const getStudentGrade = (studentId: string) => {
    return grades?.find(g => g.student_profile_id === studentId)?.final_score;
  };

  const selectedCourse = assignedCourses?.find(c => c.id === selectedCourseId);

  return (
    <Layout>
      <div className="container py-8 lg:py-12 px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2">
            Dashboard Dosen
          </h1>
          <p className="text-muted-foreground">
            Selamat datang, {profile?.full_name}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4 mb-8">
          {/* Profile Card */}
          <Card className="animate-slide-up">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Profil Saya</CardTitle>
                <Button 
                  variant={editMode ? 'secondary' : 'outline'} 
                  size="sm"
                  onClick={() => {
                    if (editMode) {
                      setFullName(profile?.full_name || '');
                      setNip(profile?.nip || '');
                      setGender(profile?.gender || '');
                    }
                    setEditMode(!editMode);
                  }}
                >
                  {editMode ? 'Batal' : 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative">
                  <Avatar className="h-20 w-20 ring-4 ring-primary/20 mb-2">
                    <AvatarImage src={profile?.photo_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {profile?.full_name?.charAt(0) || 'D'}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute -bottom-1 -right-1 cursor-pointer">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors">
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                </div>
                {!editMode && (
                  <>
                    <h3 className="font-bold text-lg mt-2">{profile?.full_name}</h3>
                    <Badge variant="secondary" className="mt-2">Dosen</Badge>
                  </>
                )}
              </div>
              
              {editMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nama Lengkap</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>NIDN/NIDK</Label>
                    <Input value={nip} onChange={(e) => setNip(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih gender..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pria">Pria</SelectItem>
                        <SelectItem value="wanita">Wanita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveProfile} className="w-full" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {profile?.nip && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>NIDN/NIDK: {profile.nip}</span>
                    </div>
                  )}
                  {profile?.gender && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">Gender: {profile.gender}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{profile?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{assignedCourses?.length || 0} Mata Kuliah</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grade Management Card */}
          <Card className="lg:col-span-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle className="text-lg">Kelola Nilai Mahasiswa</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <label>
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Excel/CSV
                      </span>
                    </Button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                    />
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label className="mb-2 block">Pilih Mata Kuliah</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Pilih mata kuliah..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedCourses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCourseId && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="w-12 text-primary-foreground">No</TableHead>
                        <TableHead className="text-primary-foreground">Nama Mahasiswa</TableHead>
                        <TableHead className="text-primary-foreground">NIM</TableHead>
                        <TableHead className="w-32 text-primary-foreground">Nilai (0-100)</TableHead>
                        <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments?.map((enrollment, index) => {
                        const currentGrade = getStudentGrade(enrollment.student?.id || '');
                        return (
                          <GradeRow 
                            key={enrollment.id} 
                            student={enrollment.student!} 
                            currentGrade={currentGrade}
                            passingScore={selectedCourse?.passing_score || 60}
                            onSave={(score) => updateGradeMutation.mutate({ studentId: enrollment.student!.id, score })}
                            isSaving={updateGradeMutation.isPending}
                            rowNumber={index + 1}
                          />
                        );
                      })}
                      {(!enrollments || enrollments.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Belum ada mahasiswa terdaftar pada mata kuliah ini
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview Import Nilai</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Data yang valid akan tetap diimport meskipun ada beberapa baris yang error.
              </p>
            </DialogHeader>
            
            {importErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-destructive mb-2">Error ({importErrors.length})</h4>
                <ul className="text-sm text-destructive space-y-1">
                  {importErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {importErrors.length > 5 && (
                    <li>...dan {importErrors.length - 5} error lainnya</li>
                  )}
                </ul>
              </div>
            )}

            {importPreview.length > 0 && (
              <>
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-success">
                    {importPreview.length} data valid siap diimport
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="w-12 text-primary-foreground">No</TableHead>
                      <TableHead className="text-primary-foreground">Kode MK</TableHead>
                      <TableHead className="text-primary-foreground">NIM</TableHead>
                      <TableHead className="text-primary-foreground">Nama</TableHead>
                      <TableHead className="text-primary-foreground">Nilai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.slice(0, 10).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-center">{i + 1}</TableCell>
                        <TableCell>{item.course_code}</TableCell>
                        <TableCell>{item.student_nim}</TableCell>
                        <TableCell>{item.student_name}</TableCell>
                        <TableCell>{item.final_score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importPreview.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ...dan {importPreview.length - 10} data lainnya
                  </p>
                )}
                <Button onClick={handleImport} className="w-full mt-4">
                  Import {importPreview.length} Nilai
                </Button>
              </>
            )}

            {importPreview.length === 0 && importErrors.length > 0 && (
              <p className="text-center text-muted-foreground py-4">
                Tidak ada data valid untuk diimport
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function GradeRow({ 
  student, 
  currentGrade, 
  passingScore,
  onSave, 
  isSaving,
  rowNumber
}: { 
  student: Profile; 
  currentGrade?: number;
  passingScore: number;
  onSave: (score: number) => void;
  isSaving: boolean;
  rowNumber: number;
}) {
  const [score, setScore] = useState(currentGrade?.toString() || '');
  const [hasChanged, setHasChanged] = useState(false);

  const handleChange = (value: string) => {
    setScore(value);
    setHasChanged(value !== (currentGrade?.toString() || ''));
  };

  const handleSave = () => {
    const numScore = parseInt(score);
    if (!isNaN(numScore) && numScore >= 0 && numScore <= 100) {
      onSave(numScore);
      setHasChanged(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="text-center">{rowNumber}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={student.photo_url || undefined} />
            <AvatarFallback className="text-xs">{student.full_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{student.full_name}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{student.nim || '-'}</TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          max="100"
          value={score}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "w-24",
            currentGrade !== undefined && (
              currentGrade >= passingScore ? "border-success" : "border-destructive"
            )
          )}
        />
      </TableCell>
      <TableCell>
        <Button 
          size="sm" 
          onClick={handleSave} 
          disabled={!hasChanged || isSaving}
          variant={hasChanged ? 'default' : 'outline'}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </TableCell>
    </TableRow>
  );
}
