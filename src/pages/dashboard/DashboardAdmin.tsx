import { useState, useMemo } from 'react';
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
import { User, Mail, Camera, Loader2, Plus, Trash2, UserCog, BookOpen, Users, GraduationCap, Pencil, Search, Filter, Target, Eye, EyeOff, Settings } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Course, Profile, AppRole, Program } from '@/lib/types';
import { UserImportExport } from '@/components/admin/UserImportExport';
import { UserPagination } from '@/components/admin/UserPagination';
import { KurikulumTab } from '@/components/admin/KurikulumTab';

export default function DashboardAdmin() {
  const { user, profile, role, refreshProfile, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Assignment state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCourseForAssign, setSelectedCourseForAssign] = useState('');
  const [selectedDosenForAssign, setSelectedDosenForAssign] = useState<string[]>([]);

  // Role management state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('mahasiswa');

  // User account management state
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPasswordConfirm, setUserPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [userRole, setUserRole] = useState<'mahasiswa' | 'dosen' | 'admin' | 'sub_admin'>('mahasiswa');
  const [userNim, setUserNim] = useState('');
  const [userNip, setUserNip] = useState('');
  const [userProgram, setUserProgram] = useState('');
  const [userEnrollmentYear, setUserEnrollmentYear] = useState('');
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  
  // Filter and search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'mahasiswa' | 'dosen' | 'admin' | 'sub_admin'>('all');
  
  // Pagination state
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

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

  // Fetch programs from settings
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data as Program[];
    },
  });

  // Assignment mutations
  const assignInstructorMutation = useMutation({
    mutationFn: async ({ courseId, instructorIds }: { courseId: string; instructorIds: string[] }) => {
      // Insert multiple instructors
      const insertData = instructorIds.map(id => ({
        course_id: courseId,
        instructor_profile_id: id,
      }));
      const { error } = await supabase.from('course_instructors').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-instructors'] });
      toast({ title: 'Berhasil', description: 'Dosen berhasil ditugaskan' });
      setShowAssignDialog(false);
      setSelectedCourseForAssign('');
      setSelectedDosenForAssign([]);
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
      queryClient.invalidateQueries({ queryKey: ['admin-dosen'] });
      toast({ title: 'Berhasil', description: 'Role berhasil diperbarui' });
      setShowRoleDialog(false);
      setSelectedUserForRole(null);
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // User account mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      full_name: string;
      email: string;
      password: string;
      role: 'mahasiswa' | 'dosen' | 'admin' | 'sub_admin';
      nim?: string;
      nip?: string;
      program?: string;
      enrollment_year?: number;
    }) => {
      // Use edge function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: userData,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dosen'] });
      toast({ title: 'Berhasil', description: 'Akun berhasil dibuat' });
      resetUserForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, password, ...userData }: Partial<Profile> & { id: string; password?: string }) => {
      // Update profile data
      const { error } = await supabase.from('profiles').update(userData).eq('id', id);
      if (error) throw error;
      
      // If password is provided, update via edge function
      if (password) {
        const { data, error: pwError } = await supabase.functions.invoke('admin-update-password', {
          body: { userId: id, password },
        });
        if (pwError) throw pwError;
        if (data?.error) throw new Error(data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dosen'] });
      toast({ title: 'Berhasil', description: 'Akun berhasil diperbarui' });
      resetUserForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete from user_roles first
      const { error: roleError } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (roleError) throw roleError;
      
      // Delete from profiles
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dosen'] });
      toast({ title: 'Berhasil', description: 'Akun berhasil dihapus' });
      setShowDeleteUserDialog(false);
      setUserToDelete(null);
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

  if (role && role !== 'admin' && role !== 'sub_admin') {
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

  const resetUserForm = () => {
    setUserFullName('');
    setUserEmail('');
    setUserPassword('');
    setUserPasswordConfirm('');
    setShowPassword(false);
    setShowPasswordConfirm(false);
    setUserRole('mahasiswa');
    setUserNim('');
    setUserNip('');
    setUserProgram('');
    setUserEnrollmentYear('');
    setEditingUser(null);
    setShowUserDialog(false);
  };

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return allUsers?.filter(u => {
      // Exclude current user if they're admin
      if (u.id === user?.id) return false;
      
      // Apply role filter
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      
      // Apply search filter
      if (userSearchQuery) {
        const query = userSearchQuery.toLowerCase();
        const matchesName = u.full_name?.toLowerCase().includes(query);
        const matchesEmail = u.email?.toLowerCase().includes(query);
        const matchesNim = u.nim?.toLowerCase().includes(query);
        const matchesNip = u.nip?.toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesNim || matchesNip;
      }
      
      return true;
    }) || [];
  }, [allUsers, userRoleFilter, userSearchQuery, user?.id]);

  // Paginated users
  const totalUserPages = Math.ceil(filteredUsers.length / userPageSize);
  const paginatedUsers = useMemo(() => {
    const start = (userCurrentPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userCurrentPage, userPageSize]);

  // Reset page when filter changes
  const handleUserSearchChange = (query: string) => {
    setUserSearchQuery(query);
    setUserCurrentPage(1);
  };

  const handleUserRoleFilterChange = (filter: 'all' | 'mahasiswa' | 'dosen' | 'admin' | 'sub_admin') => {
    setUserRoleFilter(filter);
    setUserCurrentPage(1);
  };

  const handleUserPageSizeChange = (size: number) => {
    setUserPageSize(size);
    setUserCurrentPage(1);
  };

  const handleSaveUser = () => {
    // Validate password confirmation
    if (userPassword && userPassword !== userPasswordConfirm) {
      toast({ title: 'Gagal', description: 'Password dan konfirmasi password tidak cocok', variant: 'destructive' });
      return;
    }

    if (editingUser) {
      // For update, password is optional
      const updateData: any = {
        full_name: userFullName,
        email: userEmail,
        role: userRole,
        nim: userRole === 'mahasiswa' ? userNim : null,
        nip: userRole === 'dosen' ? userNip : null,
        program: userRole === 'mahasiswa' ? userProgram : null,
        enrollment_year: userRole === 'mahasiswa' && userEnrollmentYear ? parseInt(userEnrollmentYear) : null,
        id: editingUser.id,
      };
      if (userPassword) {
        updateData.password = userPassword;
      }
      updateUserMutation.mutate(updateData);
    } else {
      // For create, password is required
      createUserMutation.mutate({
        full_name: userFullName,
        email: userEmail,
        password: userPassword,
        role: userRole,
        nim: userRole === 'mahasiswa' ? userNim : undefined,
        nip: userRole === 'dosen' ? userNip : undefined,
        program: userRole === 'mahasiswa' ? userProgram : undefined,
        enrollment_year: userRole === 'mahasiswa' && userEnrollmentYear ? parseInt(userEnrollmentYear) : undefined,
      });
    }
  };

  const openEditUser = (userProfile: Profile) => {
    setEditingUser(userProfile);
    setUserFullName(userProfile.full_name);
    setUserEmail(userProfile.email);
    setUserRole(userProfile.role as 'mahasiswa' | 'dosen' | 'admin' | 'sub_admin');
    setUserNim(userProfile.nim || '');
    setUserNip(userProfile.nip || '');
    setUserProgram(userProfile.program || '');
    setUserEnrollmentYear(userProfile.enrollment_year?.toString() || '');
    setShowUserDialog(true);
  };

  // Get available dosen for assignment (exclude already assigned to selected course)
  const getAvailableDosenForCourse = (courseId: string) => {
    const assignedIds = courseInstructors
      ?.filter(ci => ci.course?.id === courseId)
      .map(ci => ci.instructor?.id) || [];
    return allDosen?.filter(d => !assignedIds.includes(d.id)) || [];
  };

  const stats = {
    totalUsers: allUsers?.length || 0,
    totalStudents: allUsers?.filter(u => u.role === 'mahasiswa').length || 0,
    totalDosen: allUsers?.filter(u => u.role === 'dosen').length || 0,
    totalCourses: courses?.length || 0,
  };

  // Role options based on current user's role
  const getRoleOptions = () => {
    const options = [
      { value: 'mahasiswa', label: 'Mahasiswa' },
      { value: 'dosen', label: 'Dosen' },
    ];
    // Only admin can create admin and sub_admin accounts
    if (role === 'admin') {
      options.push({ value: 'sub_admin', label: 'Sub-Admin' });
      options.push({ value: 'admin', label: 'Admin' });
    }
    return options;
  };

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        <div className="mb-8 animate-fade-in flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2">
              Dashboard Admin
            </h1>
            <p className="text-muted-foreground">
              Kelola kurikulum, akun pengguna, dan penugasan dosen
            </p>
          </div>
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Pengaturan
            </Button>
          </Link>
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

        <Tabs defaultValue="kelas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="kelas" className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Kelas</span>
            </TabsTrigger>
            <TabsTrigger value="accounts">Kelola Akun</TabsTrigger>
            <TabsTrigger value="assignments">Penugasan</TabsTrigger>
            <TabsTrigger value="roles">Role</TabsTrigger>
          </TabsList>

          {/* Kelas Tab */}
          <TabsContent value="kelas">
            <KurikulumTab />
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Kelola Akun Pengguna</CardTitle>
                    <Dialog open={showUserDialog} onOpenChange={(open) => { if (!open) resetUserForm(); setShowUserDialog(open); }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Tambah Akun
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{editingUser ? 'Edit Akun' : 'Tambah Akun Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Tipe Akun</Label>
                            <Select value={userRole} onValueChange={(v) => setUserRole(v as any)} disabled={!!editingUser}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {getRoleOptions().map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Nama Lengkap</Label>
                            <Input value={userFullName} onChange={(e) => setUserFullName(e.target.value)} placeholder="Nama lengkap" />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="email@example.com" disabled={!!editingUser} />
                          </div>
                          <div className="space-y-2">
                            <Label>{editingUser ? 'Password Baru (opsional)' : 'Password'}</Label>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                value={userPassword} 
                                onChange={(e) => setUserPassword(e.target.value)} 
                                placeholder={editingUser ? 'Kosongkan jika tidak ingin mengubah' : 'Masukkan password'}
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>{editingUser ? 'Konfirmasi Password Baru' : 'Konfirmasi Password'}</Label>
                            <div className="relative">
                              <Input 
                                type={showPasswordConfirm ? "text" : "password"}
                                value={userPasswordConfirm} 
                                onChange={(e) => setUserPasswordConfirm(e.target.value)} 
                                placeholder="Masukkan ulang password"
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          {userRole === 'mahasiswa' && (
                            <>
                              <div className="space-y-2">
                                <Label>NIM</Label>
                                <Input value={userNim} onChange={(e) => setUserNim(e.target.value)} placeholder="Nomor Induk Mahasiswa" />
                              </div>
                              <div className="space-y-2">
                                <Label>Angkatan</Label>
                                <Input 
                                  type="number" 
                                  value={userEnrollmentYear} 
                                  onChange={(e) => setUserEnrollmentYear(e.target.value)} 
                                  placeholder="Contoh: 2024"
                                  min="2000"
                                  max="2099"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Program Studi</Label>
                                <Select value={userProgram} onValueChange={setUserProgram}>
                                  <SelectTrigger><SelectValue placeholder="Pilih program studi" /></SelectTrigger>
                                  <SelectContent>
                                    {programs?.map(p => (
                                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                    ))}
                                    {(!programs || programs.length === 0) && (
                                      <SelectItem value="" disabled>Belum ada prodi. Buat di Pengaturan.</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                          {userRole === 'dosen' && (
                            <div className="space-y-2">
                              <Label>NIDN/NIDK</Label>
                              <Input value={userNip} onChange={(e) => setUserNip(e.target.value)} placeholder="Nomor Induk Dosen Nasional/Khusus" />
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={handleSaveUser} 
                            disabled={!userFullName || !userEmail || (!editingUser && !userPassword) || (userPassword && userPassword !== userPasswordConfirm)}
                          >
                            {editingUser ? 'Simpan' : 'Tambah'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* Import/Export buttons */}
                  <UserImportExport 
                    users={allUsers || []} 
                    onImportSuccess={() => {
                      refetchUsers();
                      queryClient.invalidateQueries({ queryKey: ['admin-dosen'] });
                    }} 
                  />
                  
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Cari nama, email, NIM, atau NIDN..." 
                        value={userSearchQuery}
                        onChange={(e) => handleUserSearchChange(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={userRoleFilter} onValueChange={(v) => handleUserRoleFilterChange(v as any)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Role</SelectItem>
                        <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                        <SelectItem value="dosen">Dosen</SelectItem>
                        <SelectItem value="sub_admin">Sub-Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="w-12 text-primary-foreground">No</TableHead>
                      <TableHead className="text-primary-foreground">Nama</TableHead>
                      <TableHead className="text-primary-foreground">Email</TableHead>
                      <TableHead className="text-primary-foreground">Role</TableHead>
                      <TableHead className="text-primary-foreground">NIM/NIDN</TableHead>
                      <TableHead className="text-primary-foreground">Angkatan</TableHead>
                      <TableHead className="text-primary-foreground">Program</TableHead>
                      <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((u, index) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-center">{(userCurrentPage - 1) * userPageSize + index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.photo_url || undefined} />
                              <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : u.role === 'sub_admin' ? 'default' : u.role === 'dosen' ? 'secondary' : 'outline'} className="capitalize">
                            {u.role === 'sub_admin' ? 'Sub-Admin' : u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.role === 'mahasiswa' ? u.nim : u.nip || '-'}</TableCell>
                        <TableCell>{u.role === 'mahasiswa' ? (u.enrollment_year || '-') : '-'}</TableCell>
                        <TableCell>{u.role === 'mahasiswa' ? (u.program || '-') : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditUser(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setUserToDelete(u);
                                setShowDeleteUserDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {userSearchQuery || userRoleFilter !== 'all' 
                            ? 'Tidak ada akun yang sesuai dengan filter' 
                            : 'Belum ada akun pengguna'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                {/* Pagination */}
                <UserPagination
                  currentPage={userCurrentPage}
                  totalPages={totalUserPages}
                  pageSize={userPageSize}
                  totalItems={filteredUsers.length}
                  onPageChange={setUserCurrentPage}
                  onPageSizeChange={handleUserPageSizeChange}
                />
              </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Konfirmasi Hapus Akun</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground">
                  Apakah Anda yakin ingin menghapus akun <span className="font-semibold text-foreground">{userToDelete?.full_name}</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteUserDialog(false)}>
                    Batal
                  </Button>
                  <Button variant="destructive" onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}>
                    Hapus
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                          <Select value={selectedCourseForAssign} onValueChange={(v) => { setSelectedCourseForAssign(v); setSelectedDosenForAssign([]); }}>
                            <SelectTrigger><SelectValue placeholder="Pilih mata kuliah" /></SelectTrigger>
                            <SelectContent>
                              {courses?.map((course) => (
                                <SelectItem key={course.id} value={course.id}>{course.code} - {course.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Dosen (dapat memilih lebih dari satu)</Label>
                          <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                            {selectedCourseForAssign ? (
                              getAvailableDosenForCourse(selectedCourseForAssign).map(dosen => (
                                <label key={dosen.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedDosenForAssign.includes(dosen.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedDosenForAssign([...selectedDosenForAssign, dosen.id]);
                                      } else {
                                        setSelectedDosenForAssign(selectedDosenForAssign.filter(id => id !== dosen.id));
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span>{dosen.full_name}</span>
                                </label>
                              ))
                            ) : (
                              <p className="text-muted-foreground text-sm">Pilih mata kuliah terlebih dahulu</p>
                            )}
                            {selectedCourseForAssign && getAvailableDosenForCourse(selectedCourseForAssign).length === 0 && (
                              <p className="text-muted-foreground text-sm">Semua dosen sudah ditugaskan ke mata kuliah ini</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={() => assignInstructorMutation.mutate({ courseId: selectedCourseForAssign, instructorIds: selectedDosenForAssign })} 
                          disabled={!selectedCourseForAssign || selectedDosenForAssign.length === 0}
                        >
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
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="w-12 text-primary-foreground">No</TableHead>
                      <TableHead className="text-primary-foreground">Mata Kuliah</TableHead>
                      <TableHead className="text-primary-foreground">Dosen</TableHead>
                      <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseInstructors?.map((ci, index) => (
                      <TableRow key={ci.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
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
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="w-12 text-primary-foreground">No</TableHead>
                      <TableHead className="text-primary-foreground">Nama</TableHead>
                      <TableHead className="text-primary-foreground">Email</TableHead>
                      <TableHead className="text-primary-foreground">Role</TableHead>
                      <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers?.filter(u => u.id !== user?.id).map((u, index) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
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
                          <Badge variant={u.role === 'admin' || u.role === 'sub_admin' ? 'default' : u.role === 'dosen' ? 'secondary' : 'outline'} className="capitalize">
                            {u.role === 'sub_admin' ? 'Sub-Admin' : u.role}
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
                        {role === 'admin' && (
                          <>
                            <SelectItem value="sub_admin">Sub-Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </>
                        )}
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
