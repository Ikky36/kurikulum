import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Camera, Loader2, Plus, Trash2, UserCog, BookOpen, Users, GraduationCap } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Course, Profile, AppRole } from '@/lib/types';

export default function DashboardAdmin() {
  const { user, profile, role, refreshProfile, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Course management state
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseSemester, setCourseSemester] = useState('');
  const [coursePassingScore, setCoursePassingScore] = useState('60');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Assignment state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCourseForAssign, setSelectedCourseForAssign] = useState('');
  const [selectedDosenForAssign, setSelectedDosenForAssign] = useState('');

  // Role management state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('mahasiswa');

  // Fetch all courses
  const { data: courses, refetch: refetchCourses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('code');
      if (error) throw error;
      return data as Course[];
    },
  });

  // Fetch all users
  const { data: allUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch all instructors (dosen)
  const { data: allDosen } = useQuery({
    queryKey: ['admin-dosen'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'dosen').order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch all course instructors
  const { data: courseInstructors, refetch: refetchInstructors } = useQuery({
    queryKey: ['admin-course-instructors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_instructors')
        .select(`*, courses:course_id (*), profiles:instructor_profile_id (*)`);
      if (error) throw error;
      return data.map(d => ({
        ...d,
        course: d.courses as unknown as Course,
        instructor: d.profiles as unknown as Profile,
      }));
    },
  });

  // Course mutations
  const createCourseMutation = useMutation({
    mutationFn: async (course: { code: string; name: string; semester?: string; passing_score?: number }) => {
      const { error } = await supabase.from('courses').insert([course]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast({ title: 'Berhasil', description: 'Mata kuliah berhasil dibuat' });
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
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast({ title: 'Berhasil', description: 'Mata kuliah berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Assignment mutations
  const assignInstructorMutation = useMutation({
    mutationFn: async ({ courseId, instructorId }: { courseId: string; instructorId: string }) => {
      const { error } = await supabase
        .from('course_instructors')
        .insert({ course_id: courseId, instructor_profile_id: instructorId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-instructors'] });
      toast({ title: 'Berhasil', description: 'Dosen berhasil ditugaskan' });
      setShowAssignDialog(false);
      setSelectedCourseForAssign('');
      setSelectedDosenForAssign('');
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const removeInstructorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('course_instructors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-instructors'] });
      toast({ title: 'Berhasil', description: 'Penugasan dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      if (profileError) throw profileError;

      // Update user_roles table
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Berhasil', description: 'Role berhasil diperbarui' });
      setShowRoleDialog(false);
      setSelectedUserForRole(null);
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  if (loading) {
    return <Layout><div className="container py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></Layout>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role && role !== 'admin') {
    return <Navigate to={`/dashboard/${role}`} replace />;
  }

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
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

  const resetCourseForm = () => {
    setCourseCode('');
    setCourseName('');
    setCourseSemester('');
    setCoursePassingScore('60');
    setEditingCourse(null);
    setShowCourseDialog(false);
  };

  const handleSaveCourse = () => {
    const courseData = {
      code: courseCode,
      name: courseName,
      semester: courseSemester,
      passing_score: parseInt(coursePassingScore) || 60,
    };

    if (editingCourse) {
      updateCourseMutation.mutate({ ...courseData, id: editingCourse.id });
    } else {
      createCourseMutation.mutate(courseData);
    }
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseCode(course.code);
    setCourseName(course.name);
    setCourseSemester(course.semester || '');
    setCoursePassingScore(course.passing_score.toString());
    setShowCourseDialog(true);
  };

  const stats = {
    totalUsers: allUsers?.length || 0,
    totalStudents: allUsers?.filter(u => u.role === 'mahasiswa').length || 0,
    totalDosen: allUsers?.filter(u => u.role === 'dosen').length || 0,
    totalCourses: courses?.length || 0,
  };

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2">
            Dashboard Admin
          </h1>
          <p className="text-muted-foreground">
            Kelola mata kuliah, penugasan dosen, dan role pengguna
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { icon: Users, label: 'Total Pengguna', value: stats.totalUsers },
            { icon: GraduationCap, label: 'Mahasiswa', value: stats.totalStudents },
            { icon: User, label: 'Dosen', value: stats.totalDosen },
            { icon: BookOpen, label: 'Mata Kuliah', value: stats.totalCourses },
          ].map((stat, i) => (
            <Card key={stat.label} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold font-display">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courses">Mata Kuliah</TabsTrigger>
            <TabsTrigger value="assignments">Penugasan Dosen</TabsTrigger>
            <TabsTrigger value="roles">Kelola Role</TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Daftar Mata Kuliah</CardTitle>
                  <Dialog open={showCourseDialog} onOpenChange={(open) => { if (!open) resetCourseForm(); setShowCourseDialog(open); }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingCourse ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Kode</Label>
                          <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="PBA101" />
                        </div>
                        <div className="space-y-2">
                          <Label>Nama</Label>
                          <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Nama mata kuliah" />
                        </div>
                        <div className="space-y-2">
                          <Label>Semester</Label>
                          <Select value={courseSemester} onValueChange={setCourseSemester}>
                            <SelectTrigger><SelectValue placeholder="Pilih semester" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Ganjil">Ganjil</SelectItem>
                              <SelectItem value="Genap">Genap</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Passing Score</Label>
                          <Input type="number" min="0" max="100" value={coursePassingScore} onChange={(e) => setCoursePassingScore(e.target.value)} />
                        </div>
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
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Passing Score</TableHead>
                      <TableHead className="w-24">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses?.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell><Badge variant="secondary" className="font-mono">{course.code}</Badge></TableCell>
                        <TableCell className="font-medium">{course.name}</TableCell>
                        <TableCell>{course.semester || '-'}</TableCell>
                        <TableCell>{course.passing_score}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditCourse(course)}>
                              <UserCog className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteCourseMutation.mutate(course.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Penugasan Dosen</CardTitle>
                  <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Tugaskan
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tugaskan Dosen ke Mata Kuliah</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Mata Kuliah</Label>
                          <Select value={selectedCourseForAssign} onValueChange={setSelectedCourseForAssign}>
                            <SelectTrigger><SelectValue placeholder="Pilih mata kuliah" /></SelectTrigger>
                            <SelectContent>
                              {courses?.map((course) => (
                                <SelectItem key={course.id} value={course.id}>{course.code} - {course.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Dosen</Label>
                          <Select value={selectedDosenForAssign} onValueChange={setSelectedDosenForAssign}>
                            <SelectTrigger><SelectValue placeholder="Pilih dosen" /></SelectTrigger>
                            <SelectContent>
                              {allDosen?.map((dosen) => (
                                <SelectItem key={dosen.id} value={dosen.id}>{dosen.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => assignInstructorMutation.mutate({ courseId: selectedCourseForAssign, instructorId: selectedDosenForAssign })} disabled={!selectedCourseForAssign || !selectedDosenForAssign}>
                          Tugaskan
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
                      <TableHead>Mata Kuliah</TableHead>
                      <TableHead>Dosen</TableHead>
                      <TableHead className="w-24">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseInstructors?.map((ci) => (
                      <TableRow key={ci.id}>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono mr-2">{ci.course?.code}</Badge>
                          {ci.course?.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={ci.instructor?.photo_url || undefined} />
                              <AvatarFallback>{ci.instructor?.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {ci.instructor?.full_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => removeInstructorMutation.mutate(ci.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!courseInstructors || courseInstructors.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Belum ada penugasan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle>Kelola Role Pengguna</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-24">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.photo_url || undefined} />
                              <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : u.role === 'dosen' ? 'secondary' : 'outline'} className="capitalize">
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedUserForRole(u);
                              setNewRole(u.role);
                              setShowRoleDialog(true);
                            }}
                            disabled={u.id === user?.id}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Role Dialog */}
            <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ubah Role: {selectedUserForRole?.full_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Role Baru</Label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                        <SelectItem value="dosen">Dosen</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => selectedUserForRole && updateRoleMutation.mutate({ userId: selectedUserForRole.id, role: newRole })}>
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
