import { useState, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Camera, Loader2, Plus, Trash2, UserCog, BookOpen, Users, GraduationCap, Pencil, Search, Filter, Target, Eye, EyeOff, Settings, CheckSquare } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Course, Profile, AppRole, Program } from '@/lib/types';
import { UserImportExport } from '@/components/admin/UserImportExport';
import { UserPagination } from '@/components/admin/UserPagination';
import { KurikulumTab } from '@/components/admin/KurikulumTab';
import { TableFilterHeader } from '@/components/ui/table-column-filter';

interface SistemKuliah {
  id: string;
  name: string;
  is_active: boolean;
}


export default function DashboardAdmin() {
  const { user, profile, role, refreshProfile, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enable realtime for admin dashboard data
  useMultiTableRealtimeSubscription([
    { table: 'profiles', queryKeys: [['admin-users'], ['admin-dosen'], ['profiles']] },
    { table: 'courses', queryKeys: [['admin-courses'], ['courses']] },
    { table: 'course_instructors', queryKeys: [['course-instructors'], ['admin-instructors']] },
    { table: 'class_groups', queryKeys: [['class-groups']] },
    { table: 'class_students', queryKeys: [['class-students']] },
  ]);
  
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Assignment state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCourseForAssign, setSelectedCourseForAssign] = useState('');
  const [selectedDosenForAssign, setSelectedDosenForAssign] = useState<string[]>([]);
  const [selectedClassForAssign, setSelectedClassForAssign] = useState('');

  // Role management state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<Profile | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<AppRole[]>([]);
  const [newRoles, setNewRoles] = useState<AppRole[]>(['mahasiswa']);

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
  const [userGender, setUserGender] = useState<'pria' | 'wanita' | ''>('');
  const [userSistemKuliah, setUserSistemKuliah] = useState('');
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  
  // Filter and search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'mahasiswa' | 'dosen' | 'admin' | 'sub_admin'>('all');
  
  // User table column filter state
  const [userNameFilter, setUserNameFilter] = useState('');
  const [userGenderFilter, setUserGenderFilter] = useState('');
  const [userEmailFilter, setUserEmailFilter] = useState('');
  const [userNimNipFilter, setUserNimNipFilter] = useState('');
  const [userAngkatanFilter, setUserAngkatanFilter] = useState('');
  const [userProgramFilter, setUserProgramFilter] = useState('');
  
  // Pagination state
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  // Assignment bulk selection state
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [showBulkDeleteAssignmentDialog, setShowBulkDeleteAssignmentDialog] = useState(false);

  // Assignment table filter state
  const [assignmentCourseFilter, setAssignmentCourseFilter] = useState('');
  const [assignmentClassFilter, setAssignmentClassFilter] = useState('');
  const [assignmentDosenFilter, setAssignmentDosenFilter] = useState('');

  // Role table filter state
  const [roleNameFilter, setRoleNameFilter] = useState('');
  const [roleEmailFilter, setRoleEmailFilter] = useState('');
  const [roleRoleFilter, setRoleRoleFilter] = useState('');

  // Fetch all courses
  const { data: courses, refetch: refetchCourses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('code');
      if (error) throw error;
      return data as Course[];
    },
  });

  // Fetch all users with their roles
  const { data: allUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      
      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase.from('user_roles').select('*');
      if (rolesError) throw rolesError;
      
      // Map roles to users
      const usersWithRoles = (profiles as Profile[]).map(p => ({
        ...p,
        roles: userRoles?.filter(r => r.user_id === p.id).map(r => r.role as AppRole) || [p.role],
      }));
      
      return usersWithRoles;
    },
  });

  // Fetch all instructors (dosen) - users who have dosen role
  const { data: allDosen } = useQuery({
    queryKey: ['admin-dosen'],
    queryFn: async () => {
      // Get all user_ids that have dosen role
      const { data: dosenRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'dosen');
      if (rolesError) throw rolesError;
      
      const dosenUserIds = dosenRoles?.map(r => r.user_id) || [];
      
      if (dosenUserIds.length === 0) {
        // Fallback to profile role if no user_roles entries
        const { data, error } = await supabase.from('profiles').select('*').eq('role', 'dosen').order('full_name');
        if (error) throw error;
        return data as Profile[];
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', dosenUserIds)
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch all course instructors with class groups
  const { data: courseInstructors, refetch: refetchInstructors } = useQuery({
    queryKey: ['admin-course-instructors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_instructors')
        .select(`*, courses:course_id (*), profiles:instructor_profile_id (*), class_groups:class_group_id (*)`);
      if (error) throw error;
      return data.map(d => ({
        ...d,
        course: d.courses as unknown as Course,
        instructor: d.profiles as unknown as Profile,
        classGroup: d.class_groups as unknown as { id: string; name: string } | null,
      }));
    },
  });

  // Fetch class groups for assignment
  const { data: classGroups } = useQuery({
    queryKey: ['class-groups-assign'],
    queryFn: async () => {
      const { data, error } = await supabase.from('class_groups').select('*').order('name');
      if (error) throw error;
      return data as { id: string; name: string; description?: string }[];
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

  // Fetch sistem kuliah
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

  // Assignment mutations
  const assignInstructorMutation = useMutation({
    mutationFn: async ({ courseId, instructorIds, classGroupId }: { courseId: string; instructorIds: string[]; classGroupId?: string }) => {
      // Insert multiple instructors
      const insertData = instructorIds.map(id => ({
        course_id: courseId,
        instructor_profile_id: id,
        class_group_id: classGroupId || null,
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
      setSelectedClassForAssign('');
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

  // Bulk delete assignments mutation
  const bulkDeleteAssignmentsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase.from('course_instructors').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-instructors'] });
      toast({ title: 'Berhasil', description: `${variables.length} penugasan berhasil dihapus` });
      setShowBulkDeleteAssignmentDialog(false);
      setSelectedAssignmentIds([]);
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Role mutation - now supports multiple roles
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      if (roles.length === 0) {
        throw new Error('Minimal harus memilih satu role');
      }
      
      // Determine primary role (highest privilege) for profiles table
      let primaryRole: AppRole = 'mahasiswa';
      if (roles.includes('admin')) primaryRole = 'admin';
      else if (roles.includes('sub_admin')) primaryRole = 'sub_admin';
      else if (roles.includes('dosen')) primaryRole = 'dosen';
      else if (roles.includes('mahasiswa')) primaryRole = 'mahasiswa';
      
      // Update profiles table with primary role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: primaryRole })
        .eq('id', userId);
      if (profileError) throw profileError;

      // Delete existing user_roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (deleteError) throw deleteError;

      // Insert all selected roles
      const rolesToInsert = roles.map(r => ({ user_id: userId, role: r }));
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(rolesToInsert);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dosen'] });
      toast({ title: 'Berhasil', description: 'Role berhasil diperbarui' });
      setShowRoleDialog(false);
      setSelectedUserForRole(null);
      setNewRoles([]);
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
      gender?: 'pria' | 'wanita';
    }) => {
      // Use edge function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: userData,
      });
      
      // Handle edge function errors - can come in different formats
      if (error) {
        // Try to parse error response body if it's a FunctionsHttpError
        try {
          const errorBody = await error.context?.json?.();
          if (errorBody?.error) {
            throw new Error(errorBody.error);
          }
        } catch {
          // If parsing fails, use the original error message
        }
        throw new Error(error.message || 'Gagal membuat akun');
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      
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

  // Bulk delete mutation - using batch function for speed
  const bulkDeleteUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      // Process in batches of 50 for optimal performance
      const batchSize = 50;
      let totalDeleted = 0;
      let totalFailed = 0;

      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const { data, error } = await supabase.functions.invoke('admin-bulk-users', {
          body: {
            action: 'delete',
            user_ids: batch,
          },
        });

        if (error) {
          totalFailed += batch.length;
        } else if (data) {
          totalDeleted += data.deleted || 0;
          totalFailed += data.failed || 0;
        }
      }

      return { deleted: totalDeleted, failed: totalFailed };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dosen'] });
      toast({ 
        title: 'Berhasil', 
        description: `${result.deleted} akun berhasil dihapus${result.failed > 0 ? `, ${result.failed} gagal` : ''}` 
      });
      setShowBulkDeleteDialog(false);
      setSelectedUserIds([]);
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Filter users based on search, role, and column filters - MUST be before early returns
  const filteredUsers = useMemo(() => {
    return allUsers?.filter(u => {
      // Exclude current user if they're admin
      if (u.id === user?.id) return false;
      
      // Apply role filter
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      
      // Apply global search filter
      if (userSearchQuery) {
        const query = userSearchQuery.toLowerCase();
        const matchesName = u.full_name?.toLowerCase().includes(query);
        const matchesEmail = u.email?.toLowerCase().includes(query);
        const matchesNim = u.nim?.toLowerCase().includes(query);
        const matchesNip = u.nip?.toLowerCase().includes(query);
        if (!(matchesName || matchesEmail || matchesNim || matchesNip)) return false;
      }
      
      // Apply column filters
      if (userNameFilter && !u.full_name?.toLowerCase().includes(userNameFilter.toLowerCase())) return false;
      if (userGenderFilter && !(u as any).gender?.toLowerCase().includes(userGenderFilter.toLowerCase())) return false;
      if (userEmailFilter && !u.email?.toLowerCase().includes(userEmailFilter.toLowerCase())) return false;
      if (userNimNipFilter) {
        const nimNipMatch = u.nim?.toLowerCase().includes(userNimNipFilter.toLowerCase()) || 
                           u.nip?.toLowerCase().includes(userNimNipFilter.toLowerCase());
        if (!nimNipMatch) return false;
      }
      if (userAngkatanFilter && u.enrollment_year?.toString() !== userAngkatanFilter) return false;
      if (userProgramFilter && !u.program?.toLowerCase().includes(userProgramFilter.toLowerCase())) return false;
      
      return true;
    }) || [];
  }, [allUsers, userRoleFilter, userSearchQuery, user?.id, userNameFilter, userGenderFilter, userEmailFilter, userNimNipFilter, userAngkatanFilter, userProgramFilter]);

  // Paginated users - MUST be before early returns
  const totalUserPages = Math.ceil(filteredUsers.length / userPageSize);
  const paginatedUsers = useMemo(() => {
    const start = (userCurrentPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userCurrentPage, userPageSize]);

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
    setUserGender('');
    setUserSistemKuliah('');
    setEditingUser(null);
    setShowUserDialog(false);
  };

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
        gender: userGender || null,
        sistem_kuliah_id: userRole === 'mahasiswa' && userSistemKuliah ? userSistemKuliah : null,
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
        gender: userGender || undefined,
        sistem_kuliah_id: userRole === 'mahasiswa' && userSistemKuliah ? userSistemKuliah : undefined,
      } as any);
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
    setUserGender(userProfile.gender || '');
    setUserSistemKuliah((userProfile as any).sistem_kuliah_id || '');
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
      <div className="container py-8 lg:py-12 px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="mb-8 animate-fade-in flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2">
              Dashboard {role === 'sub_admin' ? 'Sub-Admin' : 'Admin'}
            </h1>
            <p className="text-muted-foreground">
              Kelola kurikulum, akun pengguna, dan penugasan dosen
            </p>
          </div>
          {role === 'admin' && (
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Pengaturan
              </Button>
            </Link>
          )}
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
            <TabsTrigger value="kelas" className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Kelas</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Kelola Akun</TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Penugasan</TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Role</TabsTrigger>
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
                            <Label>Gender</Label>
                            <Select value={userGender} onValueChange={(v) => setUserGender(v as 'pria' | 'wanita' | '')}>
                              <SelectTrigger><SelectValue placeholder="Pilih gender" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pria">Pria</SelectItem>
                                <SelectItem value="wanita">Wanita</SelectItem>
                              </SelectContent>
                            </Select>
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
                                      <SelectItem value="__empty__" disabled>Belum ada prodi. Buat di Pengaturan.</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Sistem Kuliah</Label>
                                <Select value={userSistemKuliah} onValueChange={setUserSistemKuliah}>
                                  <SelectTrigger><SelectValue placeholder="Pilih sistem kuliah" /></SelectTrigger>
                                  <SelectContent>
                                    {sistemKuliahList?.map(sk => (
                                      <SelectItem key={sk.id} value={sk.id}>{sk.name}</SelectItem>
                                    ))}
                                    {(!sistemKuliahList || sistemKuliahList.length === 0) && (
                                      <SelectItem value="__empty__" disabled>Belum ada sistem kuliah. Buat di Pengaturan.</SelectItem>
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
                  <div className="flex flex-col gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Cari nama, email, NIM, atau NIDN..." 
                        value={userSearchQuery}
                        onChange={(e) => handleUserSearchChange(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {/* Role Tabs */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant={userRoleFilter === 'all' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => handleUserRoleFilterChange('all')}
                      >
                        Semua
                      </Button>
                      <Button 
                        variant={userRoleFilter === 'mahasiswa' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => handleUserRoleFilterChange('mahasiswa')}
                      >
                        Mahasiswa
                      </Button>
                      <Button 
                        variant={userRoleFilter === 'dosen' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => handleUserRoleFilterChange('dosen')}
                      >
                        Dosen
                      </Button>
                      <Button 
                        variant={userRoleFilter === 'sub_admin' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => handleUserRoleFilterChange('sub_admin')}
                      >
                        Sub-Admin
                      </Button>
                      <Button 
                        variant={userRoleFilter === 'admin' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => handleUserRoleFilterChange('admin')}
                      >
                        Admin
                      </Button>
                    </div>
                    
                    {/* Bulk Actions */}
                    {selectedUserIds.length > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Checkbox
                          checked={selectedUserIds.length === paginatedUsers.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds(paginatedUsers.map(u => u.id));
                            } else {
                              setSelectedUserIds([]);
                            }
                          }}
                        />
                        <span className="text-sm font-medium">{selectedUserIds.length} dipilih</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowBulkDeleteDialog(true)}
                          className="ml-auto gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus ({selectedUserIds.length})
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="w-10 text-primary-foreground">
                        <Checkbox
                          checked={paginatedUsers.length > 0 && selectedUserIds.length === paginatedUsers.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds(paginatedUsers.map(u => u.id));
                            } else {
                              setSelectedUserIds([]);
                            }
                          }}
                          className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                        />
                      </TableHead>
                      <TableHead className="w-12 text-primary-foreground">No</TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={userNameFilter}
                          onFilterChange={setUserNameFilter}
                          placeholder="Filter nama..."
                        >
                          Nama
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={userGenderFilter}
                          onFilterChange={setUserGenderFilter}
                          placeholder="pria/wanita..."
                        >
                          Gender
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={userEmailFilter}
                          onFilterChange={setUserEmailFilter}
                          placeholder="Filter email..."
                        >
                          Email
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">Role</TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={userNimNipFilter}
                          onFilterChange={setUserNimNipFilter}
                          placeholder="Filter NIM/NIP..."
                        >
                          NIM/NIDN/NIDK
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={userAngkatanFilter}
                          onFilterChange={setUserAngkatanFilter}
                          placeholder="Filter angkatan..."
                        >
                          Angkatan
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={userProgramFilter}
                          onFilterChange={setUserProgramFilter}
                          placeholder="Filter program..."
                        >
                          Program
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((u, index) => (
                      <TableRow key={u.id} className={selectedUserIds.includes(u.id) ? 'bg-muted/50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUserIds.includes(u.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUserIds([...selectedUserIds, u.id]);
                              } else {
                                setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                              }
                            }}
                          />
                        </TableCell>
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
                        <TableCell className="capitalize">{(u as any).gender || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(u.roles && u.roles.length > 0 ? u.roles : [u.role]).map((r) => (
                              <Badge 
                                key={r} 
                                variant={r === 'admin' || r === 'sub_admin' ? 'default' : r === 'dosen' ? 'secondary' : 'outline'} 
                                className="capitalize"
                              >
                                {r === 'sub_admin' ? 'Sub-Admin' : r}
                              </Badge>
                            ))}
                          </div>
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
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Konfirmasi Hapus Banyak Akun</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground">
                  Apakah Anda yakin ingin menghapus <span className="font-semibold text-foreground">{selectedUserIds.length} akun</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
                    Batal
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => bulkDeleteUsersMutation.mutate(selectedUserIds)}
                    disabled={bulkDeleteUsersMutation.isPending}
                  >
                    {bulkDeleteUsersMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Menghapus...
                      </>
                    ) : (
                      `Hapus ${selectedUserIds.length} Akun`
                    )}
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
                          <Label>Kelas (Opsional)</Label>
                          <Select value={selectedClassForAssign || 'none'} onValueChange={(v) => setSelectedClassForAssign(v === 'none' ? '' : v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih kelas (opsional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Tanpa Kelas</SelectItem>
                              {classGroups?.map((cg) => (
                                <SelectItem key={cg.id} value={cg.id}>{cg.name}</SelectItem>
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
                          onClick={() => assignInstructorMutation.mutate({ 
                            courseId: selectedCourseForAssign, 
                            instructorIds: selectedDosenForAssign,
                            classGroupId: selectedClassForAssign || undefined
                          })} 
                          disabled={!selectedCourseForAssign || selectedDosenForAssign.length === 0}
                        >
                          Tugaskan
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {/* Bulk Actions for assignments */}
                {selectedAssignmentIds.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mt-4">
                    <span className="text-sm font-medium">{selectedAssignmentIds.length} penugasan dipilih</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDeleteAssignmentDialog(true)}
                      className="ml-auto gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus ({selectedAssignmentIds.length})
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="w-10 text-primary-foreground">
                        <Checkbox
                          checked={(() => {
                            const allIds = (courseInstructors || []).map(ci => ci.id);
                            return allIds.length > 0 && selectedAssignmentIds.length === allIds.length;
                          })()}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAssignmentIds((courseInstructors || []).map(ci => ci.id));
                            } else {
                              setSelectedAssignmentIds([]);
                            }
                          }}
                          className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                        />
                      </TableHead>
                      <TableHead className="w-12 text-primary-foreground">No</TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={assignmentCourseFilter}
                          onFilterChange={setAssignmentCourseFilter}
                          placeholder="Filter mata kuliah..."
                        >
                          Mata Kuliah
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={assignmentClassFilter}
                          onFilterChange={setAssignmentClassFilter}
                          placeholder="Filter kelas..."
                        >
                          Kelas
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={assignmentDosenFilter}
                          onFilterChange={setAssignmentDosenFilter}
                          placeholder="Filter dosen..."
                        >
                          Dosen
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Group instructors by course + class
                      const grouped = (courseInstructors || []).reduce((acc, ci) => {
                        const key = `${ci.course_id}_${ci.class_group_id || 'none'}`;
                        if (!acc[key]) {
                          acc[key] = {
                            course: ci.course,
                            classGroup: ci.classGroup,
                            instructors: [],
                            ids: [],
                          };
                        }
                        acc[key].instructors.push(ci.instructor);
                        acc[key].ids.push(ci.id);
                        return acc;
                      }, {} as Record<string, { course: Course | null; classGroup: { id: string; name: string } | null; instructors: (Profile | null)[]; ids: string[] }>);

                      // Apply filters
                      let groupedEntries = Object.entries(grouped);
                      
                      if (assignmentCourseFilter) {
                        const query = assignmentCourseFilter.toLowerCase();
                        groupedEntries = groupedEntries.filter(([_, group]) => 
                          group.course?.name?.toLowerCase().includes(query) || 
                          group.course?.code?.toLowerCase().includes(query)
                        );
                      }
                      
                      if (assignmentClassFilter) {
                        const query = assignmentClassFilter.toLowerCase();
                        groupedEntries = groupedEntries.filter(([_, group]) => 
                          group.classGroup?.name?.toLowerCase().includes(query) ||
                          (!group.classGroup && query === '-')
                        );
                      }
                      
                      if (assignmentDosenFilter) {
                        const query = assignmentDosenFilter.toLowerCase();
                        groupedEntries = groupedEntries.filter(([_, group]) => 
                          group.instructors.some(inst => inst?.full_name?.toLowerCase().includes(query))
                        );
                      }
                      
                      if (groupedEntries.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              {assignmentCourseFilter || assignmentClassFilter || assignmentDosenFilter 
                                ? 'Tidak ada penugasan yang sesuai dengan filter' 
                                : 'Belum ada penugasan'}
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return groupedEntries.map(([key, group], index) => {
                        const allSelected = group.ids.every(id => selectedAssignmentIds.includes(id));
                        const someSelected = group.ids.some(id => selectedAssignmentIds.includes(id));
                        
                        return (
                          <TableRow key={key} className={someSelected ? 'bg-muted/50' : ''}>
                            <TableCell className="align-top">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedAssignmentIds([...new Set([...selectedAssignmentIds, ...group.ids])]);
                                  } else {
                                    setSelectedAssignmentIds(selectedAssignmentIds.filter(id => !group.ids.includes(id)));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-center align-top">{index + 1}</TableCell>
                            <TableCell className="align-top">
                              <Badge variant="secondary" className="font-mono mr-2">{group.course?.code}</Badge>
                              {group.course?.name}
                            </TableCell>
                            <TableCell className="align-top">
                              {group.classGroup ? (
                                <Badge variant="outline">{group.classGroup.name}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2">
                                {group.instructors.filter(Boolean).map((instructor, idx) => (
                                  <div key={instructor?.id || idx} className="flex items-center gap-2 group/instructor">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={instructor?.photo_url || undefined} />
                                      <AvatarFallback>{instructor?.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm flex-1">{instructor?.full_name}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover/instructor:opacity-100 transition-opacity" 
                                      onClick={() => removeInstructorMutation.mutate(group.ids[idx])}
                                      title="Hapus penugasan dosen ini"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    setSelectedCourseForAssign(group.course?.id || '');
                                    setSelectedClassForAssign(group.classGroup?.id || '');
                                    setSelectedDosenForAssign([]);
                                    setShowAssignDialog(true);
                                  }}
                                  title="Tambah dosen"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Bulk Delete Assignments Dialog */}
            <Dialog open={showBulkDeleteAssignmentDialog} onOpenChange={setShowBulkDeleteAssignmentDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Konfirmasi Hapus Penugasan</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground">
                  Apakah Anda yakin ingin menghapus <span className="font-semibold text-foreground">{selectedAssignmentIds.length} penugasan</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBulkDeleteAssignmentDialog(false)}>
                    Batal
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => bulkDeleteAssignmentsMutation.mutate(selectedAssignmentIds)}
                    disabled={bulkDeleteAssignmentsMutation.isPending}
                  >
                    {bulkDeleteAssignmentsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Menghapus...
                      </>
                    ) : (
                      `Hapus ${selectedAssignmentIds.length} Penugasan`
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={roleNameFilter}
                          onFilterChange={setRoleNameFilter}
                          placeholder="Filter nama..."
                        >
                          Nama
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={roleEmailFilter}
                          onFilterChange={setRoleEmailFilter}
                          placeholder="Filter email..."
                        >
                          Email
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableFilterHeader
                          filterValue={roleRoleFilter}
                          onFilterChange={setRoleRoleFilter}
                          placeholder="Filter role..."
                        >
                          Role
                        </TableFilterHeader>
                      </TableHead>
                      <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      let filteredRoleUsers = allUsers?.filter(u => u.id !== user?.id) || [];
                      
                      if (roleNameFilter) {
                        const query = roleNameFilter.toLowerCase();
                        filteredRoleUsers = filteredRoleUsers.filter(u => u.full_name?.toLowerCase().includes(query));
                      }
                      
                      if (roleEmailFilter) {
                        const query = roleEmailFilter.toLowerCase();
                        filteredRoleUsers = filteredRoleUsers.filter(u => u.email?.toLowerCase().includes(query));
                      }
                      
                      if (roleRoleFilter) {
                        const query = roleRoleFilter.toLowerCase();
                        filteredRoleUsers = filteredRoleUsers.filter(u => {
                          const roles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
                          return roles.some(r => r.toLowerCase().includes(query));
                        });
                      }
                      
                      if (filteredRoleUsers.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              {roleNameFilter || roleEmailFilter || roleRoleFilter 
                                ? 'Tidak ada pengguna yang sesuai dengan filter' 
                                : 'Belum ada pengguna'}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      return filteredRoleUsers.map((u, index) => (
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
                            <div className="flex flex-wrap gap-1">
                              {(u.roles && u.roles.length > 0 ? u.roles : [u.role]).map((r) => (
                                <Badge 
                                  key={r} 
                                  variant={r === 'admin' || r === 'sub_admin' ? 'default' : r === 'dosen' ? 'secondary' : 'outline'} 
                                  className="capitalize"
                                >
                                  {r === 'sub_admin' ? 'Sub-Admin' : r}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedUserForRole(u);
                                setNewRoles(u.roles || [u.role]);
                                setShowRoleDialog(true);
                              }}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Role Dialog - Multi-select */}
            <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ubah Role: {selectedUserForRole?.full_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pilih Role (dapat memilih lebih dari satu)</Label>
                    <div className="border rounded-lg p-3 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded">
                        <Checkbox
                          checked={newRoles.includes('mahasiswa')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewRoles([...newRoles, 'mahasiswa']);
                            } else {
                              setNewRoles(newRoles.filter(r => r !== 'mahasiswa'));
                            }
                          }}
                        />
                        <div>
                          <span className="font-medium">Mahasiswa</span>
                          <p className="text-xs text-muted-foreground">Akses untuk melihat nilai dan mengikuti kelas</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded">
                        <Checkbox
                          checked={newRoles.includes('dosen')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewRoles([...newRoles, 'dosen']);
                            } else {
                              setNewRoles(newRoles.filter(r => r !== 'dosen'));
                            }
                          }}
                        />
                        <div>
                          <span className="font-medium">Dosen</span>
                          <p className="text-xs text-muted-foreground">Akses untuk mengelola mata kuliah dan menilai mahasiswa</p>
                        </div>
                      </label>
                      {role === 'admin' && (
                        <>
                          <label className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded">
                            <Checkbox
                              checked={newRoles.includes('sub_admin')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewRoles([...newRoles, 'sub_admin']);
                                } else {
                                  setNewRoles(newRoles.filter(r => r !== 'sub_admin'));
                                }
                              }}
                            />
                            <div>
                              <span className="font-medium">Sub-Admin</span>
                              <p className="text-xs text-muted-foreground">Akses administrasi terbatas</p>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded">
                            <Checkbox
                              checked={newRoles.includes('admin')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewRoles([...newRoles, 'admin']);
                                } else {
                                  setNewRoles(newRoles.filter(r => r !== 'admin'));
                                }
                              }}
                            />
                            <div>
                              <span className="font-medium">Admin</span>
                              <p className="text-xs text-muted-foreground">Akses penuh ke seluruh sistem</p>
                            </div>
                          </label>
                        </>
                      )}
                    </div>
                    {newRoles.length === 0 && (
                      <p className="text-sm text-destructive">Minimal pilih satu role</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => selectedUserForRole && updateRoleMutation.mutate({ userId: selectedUserForRole.id, roles: newRoles })}
                    disabled={newRoles.length === 0 || updateRoleMutation.isPending}
                  >
                    {updateRoleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan'
                    )}
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
