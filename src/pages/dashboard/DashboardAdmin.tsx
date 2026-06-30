import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTableRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useLoginAs } from '@/hooks/useLoginAs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Camera, Loader2, Plus, Trash2, UserCog, BookOpen, Users, GraduationCap, Pencil, Search, Filter, Target, Eye, EyeOff, Settings, CheckSquare, LogIn } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Course, Profile, AppRole, Program } from '@/lib/types';
import { CourseImportExport } from '@/components/admin/CourseImportExport';
import { SistemKuliahManager } from '@/components/admin/SistemKuliahManager';
import { StudentSemesterBadge } from '@/components/ui/semester-badge';
import { UserImportExport } from '@/components/admin/UserImportExport';
import { UserPagination } from '@/components/admin/UserPagination';
import { KurikulumTab } from '@/components/admin/KurikulumTab';
import { DashboardScoreRecap } from '@/components/dashboard/DashboardScoreRecap';
import { TableFilterHeader } from '@/components/ui/table-column-filter';
import { TableSortHeader, SortConfig, sortData } from '@/components/ui/table-sort-header';

interface SistemKuliah {
  id: string;
  name: string;
  is_active: boolean;
}


export default function DashboardAdmin() {
  const { user, profile, role, refreshProfile, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { saveAdminSession } = useLoginAs();

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
  const [selectedCurriculumForAssign, setSelectedCurriculumForAssign] = useState<string>('all');
  const [selectedAcademicYearForAssign, setSelectedAcademicYearForAssign] = useState<string>('');
  const [selectedCourseForAssign, setSelectedCourseForAssign] = useState('');
  const [selectedDosenForAssign, setSelectedDosenForAssign] = useState<string[]>([]);
  const [selectedClassForAssign, setSelectedClassForAssign] = useState('');
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

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
  
  // Login As state
  const [loginAsLoading, setLoginAsLoading] = useState<string | null>(null);
  const [showLoginAsDialog, setShowLoginAsDialog] = useState(false);
  const [userToLoginAs, setUserToLoginAs] = useState<Profile | null>(null);
  
  // Assignment bulk selection state
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [showBulkDeleteAssignmentDialog, setShowBulkDeleteAssignmentDialog] = useState(false);

  // Assignment table filter state
  const [assignmentCourseFilter, setAssignmentCourseFilter] = useState('');
  const [assignmentClassFilter, setAssignmentClassFilter] = useState('');
  const [assignmentDosenFilter, setAssignmentDosenFilter] = useState('');
  const [assignmentCurriculumFilter, setAssignmentCurriculumFilter] = useState<string>('all');
  const [assignmentAcademicYearFilter, setAssignmentAcademicYearFilter] = useState<string>('all');

  // Role table filter state
  const [roleNameFilter, setRoleNameFilter] = useState('');
  const [roleEmailFilter, setRoleEmailFilter] = useState('');
  const [roleRoleFilter, setRoleRoleFilter] = useState('');

  // Sorting state
  const [userSort, setUserSort] = useState<SortConfig | null>(null);
  const [assignmentSort, setAssignmentSort] = useState<SortConfig | null>(null);
  const [roleSort, setRoleSort] = useState<SortConfig | null>(null);

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
        .select(`*, courses:course_id (*), profiles:instructor_profile_id (*), class_groups:class_group_id (*), academic_years:academic_year_id (id, name, is_active)`);
      if (error) throw error;
      return data.map(d => ({
        ...d,
        course: d.courses as unknown as Course,
        instructor: d.profiles as unknown as Profile,
        classGroup: d.class_groups as unknown as { id: string; name: string } | null,
        academicYear: d.academic_years as unknown as { id: string; name: string; is_active: boolean } | null,
      }));
    },
  });

  // Fetch class groups for assignment (with semester)
  const { data: classGroups } = useQuery({
    queryKey: ['class-groups-assign'],
    queryFn: async () => {
      const { data, error } = await supabase.from('class_groups').select('*').order('name');
      if (error) throw error;
      return data as { id: string; name: string; description?: string; semester?: string | null }[];
    },
  });

  // Filter class groups based on selected course's semester
  const getFilteredClassGroups = () => {
    if (!selectedCourseForAssign || !classGroups) return classGroups || [];
    
    const selectedCourse = courses?.find(c => c.id === selectedCourseForAssign);
    if (!selectedCourse?.semester) return classGroups;
    
    const courseSemester = selectedCourse.semester.trim();
    
    return classGroups.filter(cg => {
      if (!cg.semester) return false;
      // Handle comma-separated semester values (e.g., "1, 2, 3")
      const classSemesters = cg.semester.split(',').map(s => s.trim());
      return classSemesters.includes(courseSemester);
    });
  };

  // Fetch curricula for filtering courses in assignment
  const { data: assignCurricula } = useQuery({
    queryKey: ['curricula', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('curricula').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  // Fetch academic years (active only for assignment dialog)
  const { data: activeAcademicYears } = useQuery({
    queryKey: ['academic-years', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_years').select('id, name').eq('is_active', true).order('name', { ascending: false });
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  // Fetch ALL academic years (for filter dropdown above table)
  const { data: allAcademicYears } = useQuery({
    queryKey: ['academic-years', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_years').select('id, name, is_active').order('name', { ascending: false });
      if (error) throw error;
      return data as { id: string; name: string; is_active: boolean }[];
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
    mutationFn: async ({ courseId, instructorIds, classGroupId, academicYearId }: { courseId: string; instructorIds: string[]; classGroupId?: string; academicYearId?: string }) => {
      const insertData = instructorIds.map(id => ({
        course_id: courseId,
        instructor_profile_id: id,
        class_group_id: classGroupId || null,
        academic_year_id: academicYearId || null,
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
      setSelectedCurriculumForAssign('all');
      setSelectedAcademicYearForAssign('');
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
        let errorMessage = 'Gagal membuat akun';
        try {
          // FunctionsHttpError stores response in context
          if (error.context && typeof error.context.json === 'function') {
            const errorBody = await error.context.json();
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
          }
        } catch {
          // Try parsing error message directly
          if (error.message) {
            // Edge function errors sometimes embed JSON in the message
            const jsonMatch = error.message.match(/\{.*"error"\s*:\s*"(.+?)"\s*.*\}/);
            if (jsonMatch?.[1]) {
              errorMessage = jsonMatch[1];
            } else {
              errorMessage = error.message;
            }
          }
        }
        throw new Error(errorMessage);
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
    mutationFn: async ({ id, password, email, originalEmail, ...userData }: Partial<Profile> & { id: string; password?: string; originalEmail?: string }) => {
      // Update profile data (excluding email which is handled separately)
      const { error } = await supabase.from('profiles').update(userData).eq('id', id);
      if (error) throw error;
      
      // If email changed, update via edge function
      if (email && originalEmail && email !== originalEmail) {
        const { data, error: emailError } = await supabase.functions.invoke('admin-update-email', {
          body: { userId: id, email },
        });
        if (emailError) throw emailError;
        if (data?.error) throw new Error(data.error);
      }
      
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

  // Login As handler
  const handleLoginAs = async (targetUser: Profile) => {
    if (!targetUser.id || !profile) return;
    
    setLoginAsLoading(targetUser.id);
    
    try {
      // Save admin session before impersonating
      const saved = await saveAdminSession(
        targetUser.full_name,
        profile.full_name,
        profile.email,
        role || 'admin'
      );
      
      if (!saved) {
        throw new Error('Gagal menyimpan sesi admin');
      }
      
      const { data, error } = await supabase.functions.invoke('admin-login-as', {
        body: { target_user_id: targetUser.id },
      });
      
      if (error) {
        throw new Error(error.message || 'Gagal login sebagai user');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      if (data?.token_hash) {
        // Verify the OTP token to get the session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink',
        });
        
        if (verifyError) {
          throw new Error(verifyError.message);
        }
        
        toast({ 
          title: 'Berhasil', 
          description: `Anda sekarang login sebagai ${targetUser.full_name}. Klik banner kuning untuk kembali ke akun admin.` 
        });
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      // Clear saved session on error
      localStorage.removeItem('lovable_admin_session');
      toast({ 
        title: 'Gagal', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoginAsLoading(null);
      setShowLoginAsDialog(false);
      setUserToLoginAs(null);
    }
  };

  // Filter users based on search, role, and column filters - MUST be before early returns
  // Changed: Show users with multiple roles in each role's tab
  const filteredUsers = useMemo(() => {
    const filtered = allUsers?.filter(u => {
      // Exclude current user if they're admin
      if (u.id === user?.id) return false;
      
      // Apply role filter - show users who have this role (including those with multiple roles)
      if (userRoleFilter !== 'all') {
        const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
        if (!userRoles.includes(userRoleFilter)) return false;
      }
      
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
    
    // Apply sorting
    return sortData(filtered, userSort, (item, key) => {
      switch (key) {
        case 'name': return item.full_name;
        case 'gender': return (item as any).gender;
        case 'email': return item.email;
        case 'nim': return item.nim;
        case 'nip': return item.nip;
        case 'enrollment_year': return item.enrollment_year;
        case 'program': return item.program;
        default: return null;
      }
    });
  }, [allUsers, userRoleFilter, userSearchQuery, user?.id, userNameFilter, userGenderFilter, userEmailFilter, userNimNipFilter, userAngkatanFilter, userProgramFilter, userSort]);

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
        originalEmail: editingUser.email, // Track original email for change detection
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

  // Get available dosen for assignment (exclude already assigned to same course + class combination)
  const getAvailableDosenForCourse = (courseId: string, classGroupId?: string) => {
    const assignedIds = courseInstructors
      ?.filter(ci => {
        // Must match course
        if (ci.course?.id !== courseId) return false;
        // Must match class (null == null is true)
        if (classGroupId) {
          return ci.class_group_id === classGroupId;
        } else {
          return ci.class_group_id === null;
        }
      })
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="kelas" className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Kelas</span>
            </TabsTrigger>
            <TabsTrigger value="rekap" className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Rekap Skor</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Kelola Akun</TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Penugasan</TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Role</TabsTrigger>
          </TabsList>

          {/* Kelas Tab */}
          <TabsContent value="kelas">
            <KurikulumTab />
          </TabsContent>

          {/* Rekap Skor Tab */}
          <TabsContent value="rekap">
            <DashboardScoreRecap />
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
                            <Input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="email@example.com" />
                            {editingUser && userEmail !== editingUser.email && (
                              <p className="text-xs text-warning">Email akan diubah dari {editingUser.email}</p>
                            )}
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
                    selectedRole={userRoleFilter}
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
                        <TableSortHeader
                          sortKey="name"
                          currentSort={userSort}
                          onSort={setUserSort}
                          sortType="text"
                        >
                          Nama
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableSortHeader
                          sortKey="gender"
                          currentSort={userSort}
                          onSort={setUserSort}
                          sortType="text"
                          filterOptions={['pria', 'wanita']}
                          filterValue={userGenderFilter}
                          onFilterChange={setUserGenderFilter}
                          filterPlaceholder="Filter gender..."
                        >
                          Gender
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableSortHeader
                          sortKey="email"
                          currentSort={userSort}
                          onSort={setUserSort}
                          sortType="text"
                        >
                          Email
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">Role</TableHead>
                      {/* NIM column for mahasiswa */}
                      {(userRoleFilter === 'all' || userRoleFilter === 'mahasiswa') && (
                        <TableHead className="text-primary-foreground">
                          <TableSortHeader
                            sortKey="nim"
                            currentSort={userSort}
                            onSort={setUserSort}
                            sortType="text"
                          >
                            NIM
                          </TableSortHeader>
                        </TableHead>
                      )}
                      {/* NIDN/NIDK/NIPY column for dosen */}
                      {(userRoleFilter === 'all' || userRoleFilter === 'dosen') && (
                        <TableHead className="text-primary-foreground">
                          <TableSortHeader
                            sortKey="nip"
                            currentSort={userSort}
                            onSort={setUserSort}
                            sortType="text"
                          >
                            NIDN/NIDK/NIPY
                          </TableSortHeader>
                        </TableHead>
                      )}
                      {/* Angkatan & Program only for mahasiswa or all */}
                      {(userRoleFilter === 'all' || userRoleFilter === 'mahasiswa') && (
                        <>
                          <TableHead className="text-primary-foreground">
                            <TableSortHeader
                              sortKey="enrollment_year"
                              currentSort={userSort}
                              onSort={setUserSort}
                              sortType="number"
                            >
                              Angkatan
                            </TableSortHeader>
                          </TableHead>
                          <TableHead className="text-primary-foreground">
                            <TableSortHeader
                              sortKey="program"
                              currentSort={userSort}
                              onSort={setUserSort}
                              sortType="text"
                            >
                              Program
                            </TableSortHeader>
                          </TableHead>
                        </>
                      )}
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{u.full_name}</span>
                              {u.role === 'mahasiswa' && <StudentSemesterBadge studentId={u.id} />}
                            </div>
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
                        {/* NIM column for mahasiswa */}
                        {(userRoleFilter === 'all' || userRoleFilter === 'mahasiswa') && (
                          <TableCell>{u.role === 'mahasiswa' ? (u.nim || '-') : '-'}</TableCell>
                        )}
                        {/* NIDN/NIDK/NIPY column for dosen */}
                        {(userRoleFilter === 'all' || userRoleFilter === 'dosen') && (
                          <TableCell>{u.role === 'dosen' ? (u.nip || '-') : '-'}</TableCell>
                        )}
                        {/* Angkatan & Program only for mahasiswa or all */}
                        {(userRoleFilter === 'all' || userRoleFilter === 'mahasiswa') && (
                          <>
                            <TableCell>{u.role === 'mahasiswa' ? (u.enrollment_year || '-') : '-'}</TableCell>
                            <TableCell>{u.role === 'mahasiswa' ? (u.program || '-') : '-'}</TableCell>
                          </>
                        )}
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openEditUser(u)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setUserToLoginAs(u);
                                setShowLoginAsDialog(true);
                              }}
                              disabled={loginAsLoading === u.id}
                              title="Login sebagai user ini"
                            >
                              {loginAsLoading === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <LogIn className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setUserToDelete(u);
                                setShowDeleteUserDialog(true);
                              }}
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={userRoleFilter === 'admin' || userRoleFilter === 'sub_admin' ? 7 : userRoleFilter === 'dosen' ? 8 : userRoleFilter === 'mahasiswa' ? 10 : 11} className="text-center py-8 text-muted-foreground">
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

            {/* Login As Confirmation Dialog */}
            <Dialog open={showLoginAsDialog} onOpenChange={setShowLoginAsDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Konfirmasi Login Sebagai User</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground">
                  Anda akan login sebagai <span className="font-semibold text-foreground">{userToLoginAs?.full_name}</span>. 
                  Ini akan mengakhiri sesi Anda saat ini dan memulai sesi baru sebagai user tersebut.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowLoginAsDialog(false)}>
                    Batal
                  </Button>
                  <Button 
                    onClick={() => userToLoginAs && handleLoginAs(userToLoginAs)}
                    disabled={loginAsLoading !== null}
                  >
                    {loginAsLoading !== null ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Login Sebagai User
                      </>
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
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Kurikulum</Label>
                            <Select value={selectedCurriculumForAssign} onValueChange={(v) => { setSelectedCurriculumForAssign(v); setSelectedCourseForAssign(''); }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Semua Kurikulum</SelectItem>
                                {assignCurricula?.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Tahun Akademik</Label>
                            <Select value={selectedAcademicYearForAssign || 'none'} onValueChange={(v) => setSelectedAcademicYearForAssign(v === 'none' ? '' : v)}>
                              <SelectTrigger><SelectValue placeholder="Pilih tahun akademik" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Tanpa Tahun Akademik</SelectItem>
                                {activeAcademicYears?.map(ay => (
                                  <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Mata Kuliah</Label>
                          <Popover open={courseSearchOpen} onOpenChange={setCourseSearchOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={courseSearchOpen}
                                className="w-full justify-between font-normal"
                              >
                                {selectedCourseForAssign
                                  ? (() => {
                                      const course = courses?.find(c => c.id === selectedCourseForAssign);
                                      return course ? `${course.code} - ${course.name}${course.semester ? ` (Sem. ${course.semester})` : ''}` : 'Pilih mata kuliah...';
                                    })()
                                  : 'Pilih mata kuliah...'}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Cari mata kuliah..." 
                                  value={courseSearchQuery}
                                  onValueChange={setCourseSearchQuery}
                                />
                                <CommandList>
                                  <CommandEmpty>Mata kuliah tidak ditemukan.</CommandEmpty>
                                  <CommandGroup>
                                    {courses?.filter(course => {
                                      if (selectedCurriculumForAssign !== 'all' && course.curriculum_id !== selectedCurriculumForAssign) return false;
                                      const searchLower = courseSearchQuery.toLowerCase();
                                      return course.code.toLowerCase().includes(searchLower) ||
                                             course.name.toLowerCase().includes(searchLower);
                                    }).map((course) => (
                                      <CommandItem
                                        key={course.id}
                                        value={`${course.code} ${course.name}`}
                                        onSelect={() => {
                                          setSelectedCourseForAssign(course.id);
                                          setSelectedDosenForAssign([]);
                                          setSelectedClassForAssign('');
                                          setCourseSearchOpen(false);
                                          setCourseSearchQuery('');
                                        }}
                                      >
                                        <span className="font-medium">{course.code}</span>
                                        <span className="mx-2">-</span>
                                        <span className="flex-1 truncate">{course.name}</span>
                                        {course.semester && (
                                          <Badge variant="secondary" className="ml-2">Sem. {course.semester}</Badge>
                                        )}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Kelas (Opsional)</Label>
                          <Select 
                            value={selectedClassForAssign || 'none'} 
                            onValueChange={(v) => setSelectedClassForAssign(v === 'none' ? '' : v)}
                            disabled={!selectedCourseForAssign}
                          >
                            <SelectTrigger><SelectValue placeholder="Pilih kelas (opsional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Tanpa Kelas</SelectItem>
                              {getFilteredClassGroups().map((cg) => (
                                <SelectItem key={cg.id} value={cg.id}>{cg.name} {cg.semester ? `(Sem. ${cg.semester})` : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedCourseForAssign && getFilteredClassGroups().length === 0 && (
                            <p className="text-muted-foreground text-sm">Tidak ada kelas dengan semester yang sesuai</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Dosen (dapat memilih lebih dari satu)</Label>
                          <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                            {selectedCourseForAssign ? (
                              getAvailableDosenForCourse(selectedCourseForAssign, selectedClassForAssign || undefined).map(dosen => (
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
                            {selectedCourseForAssign && getAvailableDosenForCourse(selectedCourseForAssign, selectedClassForAssign || undefined).length === 0 && (
                              <p className="text-muted-foreground text-sm">Semua dosen sudah ditugaskan ke kombinasi mata kuliah dan kelas ini</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={() => assignInstructorMutation.mutate({ 
                            courseId: selectedCourseForAssign, 
                            instructorIds: selectedDosenForAssign,
                            classGroupId: selectedClassForAssign || undefined,
                            academicYearId: selectedAcademicYearForAssign || undefined,
                          })} 
                          disabled={!selectedCourseForAssign || selectedDosenForAssign.length === 0}
                        >
                          Tugaskan
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Filters above table */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <Select value={assignmentCurriculumFilter} onValueChange={setAssignmentCurriculumFilter}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter Kurikulum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kurikulum</SelectItem>
                      {assignCurricula?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={assignmentAcademicYearFilter} onValueChange={setAssignmentAcademicYearFilter}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter Tahun Akademik" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tahun Akademik</SelectItem>
                      <SelectItem value="none">Tanpa Tahun Akademik</SelectItem>
                      {allAcademicYears?.map(ay => (
                        <SelectItem key={ay.id} value={ay.id}>{ay.name}{!ay.is_active ? ' (Non-aktif)' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(assignmentCurriculumFilter !== 'all' || assignmentAcademicYearFilter !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={() => { setAssignmentCurriculumFilter('all'); setAssignmentAcademicYearFilter('all'); }}>
                      Reset
                    </Button>
                  )}
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
                        <TableSortHeader
                          sortKey="course"
                          currentSort={assignmentSort}
                          onSort={setAssignmentSort}
                          sortType="text"
                        >
                          Mata Kuliah
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableSortHeader
                          sortKey="class"
                          currentSort={assignmentSort}
                          onSort={setAssignmentSort}
                          sortType="text"
                        >
                          Kelas
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableSortHeader
                          sortKey="academic_year"
                          currentSort={assignmentSort}
                          onSort={setAssignmentSort}
                          sortType="text"
                        >
                          Tahun Akademik
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableSortHeader
                          sortKey="dosen"
                          currentSort={assignmentSort}
                          onSort={setAssignmentSort}
                          sortType="text"
                        >
                          Dosen
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Group instructors by course + class + academic_year
                      const grouped = (courseInstructors || []).reduce((acc, ci) => {
                        const key = `${ci.course_id}_${ci.class_group_id || 'none'}_${ci.academic_year_id || 'none'}`;
                        if (!acc[key]) {
                          acc[key] = {
                            course: ci.course,
                            classGroup: ci.classGroup,
                            academicYear: ci.academicYear,
                            curriculumId: ci.course?.curriculum_id || null,
                            academicYearId: ci.academic_year_id || null,
                            instructors: [],
                            ids: [],
                          };
                        }
                        acc[key].instructors.push(ci.instructor);
                        acc[key].ids.push(ci.id);
                        return acc;
                      }, {} as Record<string, { course: Course | null; classGroup: { id: string; name: string } | null; academicYear: { id: string; name: string; is_active: boolean } | null; curriculumId: string | null; academicYearId: string | null; instructors: (Profile | null)[]; ids: string[] }>);

                      // Apply filters
                      let groupedEntries = Object.entries(grouped);

                      if (assignmentCurriculumFilter !== 'all') {
                        groupedEntries = groupedEntries.filter(([_, g]) => g.curriculumId === assignmentCurriculumFilter);
                      }
                      if (assignmentAcademicYearFilter !== 'all') {
                        if (assignmentAcademicYearFilter === 'none') {
                          groupedEntries = groupedEntries.filter(([_, g]) => !g.academicYearId);
                        } else {
                          groupedEntries = groupedEntries.filter(([_, g]) => g.academicYearId === assignmentAcademicYearFilter);
                        }
                      }
                      
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
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              {assignmentCourseFilter || assignmentClassFilter || assignmentDosenFilter || assignmentCurriculumFilter !== 'all' || assignmentAcademicYearFilter !== 'all'
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
                            <TableCell className="align-top">
                              {group.academicYear ? (
                                <Badge variant={group.academicYear.is_active ? 'outline' : 'secondary'}>
                                  {group.academicYear.name}
                                  {!group.academicYear.is_active && ' (Non-aktif)'}
                                </Badge>
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
                        <TableSortHeader
                          sortKey="name"
                          currentSort={roleSort}
                          onSort={setRoleSort}
                          sortType="text"
                        >
                          Nama
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableSortHeader
                          sortKey="email"
                          currentSort={roleSort}
                          onSort={setRoleSort}
                          sortType="text"
                        >
                          Email
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        <TableSortHeader
                          sortKey="role"
                          currentSort={roleSort}
                          onSort={setRoleSort}
                          sortType="text"
                          filterOptions={['mahasiswa', 'dosen', 'sub_admin', 'admin']}
                          filterValue={roleRoleFilter}
                          onFilterChange={setRoleRoleFilter}
                          filterPlaceholder="Filter role..."
                        >
                          Role
                        </TableSortHeader>
                      </TableHead>
                      <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      let filteredRoleUsers = allUsers?.filter(u => u.id !== user?.id) || [];
                      
                      // Apply category filter for role
                      if (roleRoleFilter && roleRoleFilter !== 'all') {
                        filteredRoleUsers = filteredRoleUsers.filter(u => {
                          const roles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
                          return roles.includes(roleRoleFilter as any);
                        });
                      }
                      
                      // Apply sorting
                      filteredRoleUsers = sortData(filteredRoleUsers, roleSort, (item, key) => {
                        switch (key) {
                          case 'name': return item.full_name;
                          case 'email': return item.email;
                          case 'role': return item.role;
                          default: return null;
                        }
                      });
                      
                      if (filteredRoleUsers.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              {roleRoleFilter && roleRoleFilter !== 'all'
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
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{u.full_name}</span>
                                {u.role === 'mahasiswa' && <StudentSemesterBadge studentId={u.id} />}
                              </div>
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
