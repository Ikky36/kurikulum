import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import {
  useElearningClasses,
  useCreateElearningClass,
  useUpdateElearningClass,
  useDeleteElearningClass,
  useClassGroups,
  type ElearningClass,
} from '@/hooks/useElearning';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, BookOpen, Eye, EyeOff, Globe, GraduationCap, Calendar, LogIn, Search } from 'lucide-react';

type AssignedInstructor = {
  id: string;
  full_name: string;
  photo_url: string | null;
};

type ClassWithRelations = ElearningClass & {
  class_group: { id: string; name: string } | null;
  course: { id: string; name: string; code: string } | null;
  instructor: { id: string; full_name: string; photo_url: string | null } | null;
  assignedInstructors?: AssignedInstructor[];
};

interface SelectedClassInfo {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  classGroupName: string;
}

interface ElearningKelasProps {
  onEnterClass?: (classInfo: SelectedClassInfo) => void;
}

export function ElearningKelas({ onEnterClass }: ElearningKelasProps) {
  const { profile } = useAuth();
  const { data: classes, isLoading } = useElearningClasses();
  const { data: courses } = useCourses();
  const { data: classGroups } = useClassGroups();
  const createClass = useCreateElearningClass();
  const updateClass = useUpdateElearningClass();
  const deleteClass = useDeleteElearningClass();

  // Enable realtime subscription for elearning classes
  useRealtimeSubscription({
    table: 'elearning_classes',
    queryKeys: [['elearning-classes']],
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithRelations | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [classesWithInstructors, setClassesWithInstructors] = useState<ClassWithRelations[]>([]);
  const [dosenCourseAssignments, setDosenCourseAssignments] = useState<{course_id: string, class_group_id: string | null}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    class_group_id: '',
    visibility: 'class_only' as 'class_only' | 'instructors_only' | 'public',
    academic_year_id: '',
  });

  // Fetch academic years
  const [academicYearsList, setAcademicYearsList] = useState<{id: string; name: string; is_active: boolean}[]>([]);
  useEffect(() => {
    supabase.from('academic_years').select('*').eq('is_active', true).order('name').then(({ data }) => {
      setAcademicYearsList(data || []);
    });
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isSubAdmin = profile?.role === 'sub_admin';
  const isDosen = profile?.role === 'dosen';
  const canManage = isAdmin || isSubAdmin || isDosen;

  // Fetch course assignments for dosen (sub_admin can see all, like admin)
  useEffect(() => {
    const fetchDosenAssignments = async () => {
      if (!profile?.id || !isDosen) return;
      
      try {
        const { data, error } = await supabase
          .from('course_instructors')
          .select('course_id, class_group_id')
          .eq('instructor_profile_id', profile.id);
        
        if (error) throw error;
        setDosenCourseAssignments(data || []);
      } catch (error) {
        console.error('Error fetching dosen assignments:', error);
      }
    };

    fetchDosenAssignments();
  }, [profile?.id, isDosen]);

  // Helper function to check if dosen can edit a class
  const canDosenEditClass = (cls: ClassWithRelations) => {
    if (isAdmin || isSubAdmin) return true;
    if (!isDosen) return false;
    
    // Check if dosen is the creator
    if (cls.instructor_profile_id === profile?.id) return true;
    
    // Check if dosen is assigned to the course via course_instructors
    return dosenCourseAssignments.some(
      assignment => assignment.course_id === cls.course_id &&
      (assignment.class_group_id === null || assignment.class_group_id === cls.class_group_id)
    );
  };

  // Fetch assigned instructors for each class based on course_id and class_group_id
  useEffect(() => {
    const fetchAssignedInstructors = async () => {
      if (!classes || classes.length === 0) {
        setClassesWithInstructors([]);
        return;
      }

      const typedClasses = classes as ClassWithRelations[];
      
      // Get unique course_id + class_group_id combinations
      const combinations = typedClasses.map(cls => ({
        course_id: cls.course_id,
        class_group_id: cls.class_group_id
      }));

      // Fetch all course instructors
      const { data: instructorData, error } = await supabase
        .from('course_instructors')
        .select(`
          *,
          profiles:instructor_profile_id (id, full_name, photo_url)
        `);

      if (error) {
        console.error('Error fetching instructors:', error);
        setClassesWithInstructors(typedClasses);
        return;
      }

      // Map instructors to classes
      const updatedClasses = typedClasses.map(cls => {
        const matchingInstructors = (instructorData || [])
          .filter(ci => 
            ci.course_id === cls.course_id && 
            (ci.class_group_id === null || ci.class_group_id === cls.class_group_id)
          )
          .map(ci => ci.profiles as unknown as AssignedInstructor)
          .filter(Boolean);

        return {
          ...cls,
          assignedInstructors: matchingInstructors
        };
      });

      setClassesWithInstructors(updatedClasses);
    };

    fetchAssignedInstructors();
  }, [classes]);

  // Auto-generate title when course and class are selected
  // Format: "{course.code} {course.name} - {classGroup.name}" to match dashboard display
  const generateTitle = (courseId: string, classGroupId: string): string => {
    const course = courses?.find(c => c.id === courseId);
    const classGroup = classGroups?.find(g => g.id === classGroupId);
    if (course && classGroup) {
      return `${course.code} ${course.name} - ${classGroup.name}`;
    }
    return '';
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      course_id: '',
      class_group_id: '',
      visibility: 'class_only',
      academic_year_id: '',
    });
    setEditingClass(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (cls: ClassWithRelations) => {
    setEditingClass(cls);
    setFormData({
      title: cls.title,
      description: cls.description || '',
      course_id: cls.course_id,
      class_group_id: cls.class_group_id,
      visibility: cls.visibility as 'class_only' | 'instructors_only' | 'public',
      academic_year_id: (cls as any).academic_year_id || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.course_id || !formData.class_group_id) {
      toast.error('Mohon lengkapi semua field wajib');
      return;
    }

    // Auto-generate title from course and class
    const autoTitle = editingClass ? formData.title : generateTitle(formData.course_id, formData.class_group_id);

    try {
      if (editingClass) {
        await updateClass.mutateAsync({
          id: editingClass.id,
          title: autoTitle,
          description: formData.description || null,
          course_id: formData.course_id,
          class_group_id: formData.class_group_id,
          visibility: formData.visibility,
          academic_year_id: formData.academic_year_id || null,
        });
        toast.success('Kelas berhasil diperbarui');
      } else {
        await createClass.mutateAsync({
          title: autoTitle,
          description: formData.description || null,
          course_id: formData.course_id,
          class_group_id: formData.class_group_id,
          instructor_profile_id: profile!.id,
          visibility: formData.visibility,
          academic_year_id: formData.academic_year_id || null,
        });
        toast.success('Kelas berhasil dibuat');
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    if (!deletingClassId) return;

    try {
      await deleteClass.mutateAsync(deletingClassId);
      toast.success('Kelas berhasil dihapus');
      setDeleteDialogOpen(false);
      setDeletingClassId(null);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus kelas');
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4" />;
      case 'instructors_only':
        return <EyeOff className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Publik';
      case 'instructors_only':
        return 'Dosen Saja';
      default:
        return 'Kelas Saja';
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'instructors_only':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const allTypedClasses = classesWithInstructors.length > 0 ? classesWithInstructors : (classes || []) as ClassWithRelations[];

  const q = searchQuery.trim().toLowerCase();
  const typedClasses = q
    ? allTypedClasses.filter((cls) => {
        const courseName = `${cls.course?.code || ''} ${cls.course?.name || ''}`.toLowerCase();
        const classGroup = (cls.class_group?.name || '').toLowerCase();
        const title = (cls.title || '').toLowerCase();
        const instructors = (cls.assignedInstructors || []).map(i => i.full_name?.toLowerCase() || '').join(' ');
        return courseName.includes(q) || classGroup.includes(q) || title.includes(q) || instructors.includes(q);
      })
    : allTypedClasses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Daftar Kelas</h2>
          <p className="text-muted-foreground mt-1">
            {typedClasses.length} kelas tersedia
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreateDialog} size="lg" className="gap-2 shadow-md">
            <Plus className="h-5 w-5" />
            Buat Kelas Baru
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari mata kuliah, dosen, atau kelas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Classes Grid */}
      {typedClasses.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Belum Ada Kelas</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {canManage 
                ? 'Mulai dengan membuat kelas e-learning pertama Anda. Klik tombol di atas untuk memulai.'
                : 'Belum ada kelas yang tersedia untuk Anda saat ini.'}
            </p>
            {canManage && (
              <Button onClick={openCreateDialog} className="mt-6 gap-2">
                <Plus className="h-4 w-4" />
                Buat Kelas Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: Card Grid */}
          <div className="grid gap-6 sm:grid-cols-2 md:hidden">
            {typedClasses.map((cls) => (
              <Card 
                key={cls.id} 
                className="group hover:shadow-xl transition-all duration-300 overflow-hidden border-0 shadow-md bg-card"
              >
                <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
                        {cls.course?.name} - {cls.class_group?.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">
                        {cls.description || 'Tidak ada deskripsi'}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className={`gap-1.5 shrink-0 ${getVisibilityColor(cls.visibility)}`}>
                      {getVisibilityIcon(cls.visibility)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg"><BookOpen className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Mata Kuliah</p>
                        <p className="font-medium text-sm truncate">{cls.course?.code} - {cls.course?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-secondary/80 rounded-lg"><Users className="h-4 w-4 text-secondary-foreground" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Kelas</p>
                        <p className="font-medium text-sm">{cls.class_group?.name || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Dosen Pengampu</p>
                    {cls.assignedInstructors && cls.assignedInstructors.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {cls.assignedInstructors.map((instructor) => (
                          <div key={instructor.id} className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                              <AvatarImage src={instructor.photo_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {instructor.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-sm truncate">{instructor.full_name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Belum ada dosen ditugaskan</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4 border-t">
                    {onEnterClass && (
                      <Button size="sm" className="flex-1 gap-2" onClick={() => onEnterClass({
                        id: cls.id,
                        title: `${cls.course?.name || ''} - ${cls.class_group?.name || ''}`,
                        courseId: cls.course?.id || '',
                        courseName: cls.course ? `${cls.course.code} - ${cls.course.name}` : '',
                        classGroupName: cls.class_group?.name || '',
                      })}>
                        <LogIn className="h-4 w-4" /> Masuk
                      </Button>
                    )}
                    {canDosenEditClass(cls) && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(cls)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setDeletingClassId(cls.id); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop & Tablet: Elegant List */}
          <div className="hidden md:block space-y-3">
            {typedClasses.map((cls) => (
              <div
                key={cls.id}
                className="group flex items-center gap-4 p-4 bg-card border rounded-xl hover:shadow-md hover:border-primary/40 transition-all duration-200"
              >
                {/* Left accent */}
                <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-primary to-primary/40" />

                {/* Icon */}
                <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                      {cls.course?.code} - {cls.course?.name}
                    </h3>
                    <Badge variant="secondary" className={`gap-1 ${getVisibilityColor(cls.visibility)}`}>
                      {getVisibilityIcon(cls.visibility)}
                      <span className="text-xs">{getVisibilityLabel(cls.visibility)}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {cls.class_group?.name || '-'}
                    </span>
                    {cls.description && (
                      <span className="truncate hidden lg:inline">{cls.description}</span>
                    )}
                  </div>
                </div>

                {/* Instructors */}
                <div className="hidden lg:flex items-center justify-end gap-2 shrink-0 max-w-[350px]">
                  {cls.assignedInstructors && cls.assignedInstructors.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {cls.assignedInstructors.map((ins) => (
                        <div key={ins.id} className="flex items-center gap-1.5 bg-muted/40 border border-muted-foreground/10 px-2 py-1 rounded-full" title={ins.full_name}>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={ins.photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[10px]">
                              {ins.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                            {ins.full_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Belum ada dosen</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {onEnterClass && (
                    <Button size="sm" className="gap-2" onClick={() => onEnterClass({
                      id: cls.id,
                      title: `${cls.course?.name || ''} - ${cls.class_group?.name || ''}`,
                      courseId: cls.course?.id || '',
                      courseName: cls.course ? `${cls.course.code} - ${cls.course.name}` : '',
                      classGroupName: cls.class_group?.name || '',
                    })}>
                      <LogIn className="h-4 w-4" />
                      <span className="hidden lg:inline">Masuk</span>
                    </Button>
                  )}
                  {canDosenEditClass(cls) && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(cls)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => { setDeletingClassId(cls.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingClass ? 'Edit Kelas' : 'Buat Kelas Baru'}</DialogTitle>
            <DialogDescription>
              {editingClass ? 'Perbarui informasi kelas e-learning' : 'Tambahkan kelas e-learning baru untuk mahasiswa'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="course">Mata Kuliah *</Label>
              <Select
                value={formData.course_id}
                onValueChange={(value) => setFormData({ ...formData, course_id: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih mata kuliah" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Filter courses based on role
                    if (isAdmin || isSubAdmin) {
                      // Admin and sub_admin can see all courses
                      return courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          <span className="font-medium">{course.code}</span> - {course.name}
                        </SelectItem>
                      ));
                    } else if (isDosen) {
                      // Dosen can only see courses they're assigned to
                      const assignedCourseIds = dosenCourseAssignments.map(a => a.course_id);
                      const filteredCourses = courses?.filter(c => assignedCourseIds.includes(c.id));
                      if (!filteredCourses || filteredCourses.length === 0) {
                        return <div className="px-2 py-1.5 text-sm text-muted-foreground">Tidak ada mata kuliah yang ditugaskan</div>;
                      }
                      return filteredCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          <span className="font-medium">{course.code}</span> - {course.name}
                        </SelectItem>
                      ));
                    }
                    return null;
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class_group">Kelas *</Label>
              <Select
                value={formData.class_group_id}
                onValueChange={(value) => setFormData({ ...formData, class_group_id: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Filter class groups based on role and selected course
                    if (isAdmin || isSubAdmin) {
                      // Admin and sub_admin can see all class groups
                      return classGroups?.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ));
                    } else if (isDosen) {
                      // Dosen can only see class groups they're assigned to for the selected course
                      const assignmentsForCourse = dosenCourseAssignments.filter(
                        a => a.course_id === formData.course_id
                      );
                      // If any assignment has null class_group_id, dosen can access all class groups
                      const hasAllClassAccess = assignmentsForCourse.some(a => a.class_group_id === null);
                      if (hasAllClassAccess) {
                        return classGroups?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ));
                      }
                      // Otherwise, only show assigned class groups
                      const assignedClassGroupIds = assignmentsForCourse
                        .map(a => a.class_group_id)
                        .filter((id): id is string => id !== null);
                      const filteredClassGroups = classGroups?.filter(g => assignedClassGroupIds.includes(g.id));
                      if (!filteredClassGroups || filteredClassGroups.length === 0) {
                        return <div className="px-2 py-1.5 text-sm text-muted-foreground">Tidak ada kelas yang ditugaskan</div>;
                      }
                      return filteredClassGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ));
                    }
                    return null;
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat tentang kelas ini..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="academic_year">Tahun Akademik</Label>
              <Select
                value={formData.academic_year_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, academic_year_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih tahun akademik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak dipilih</SelectItem>
                  {academicYearsList.map((ay) => (
                    <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibilitas</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: 'class_only' | 'instructors_only' | 'public') =>
                  setFormData({ ...formData, visibility: value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class_only">
                    <div className="flex items-center gap-3">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="font-medium">Kelas Saja</p>
                        <p className="text-xs text-muted-foreground">Hanya mahasiswa di kelas ini</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="instructors_only">
                    <div className="flex items-center gap-3">
                      <EyeOff className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="font-medium">Dosen Saja</p>
                        <p className="text-xs text-muted-foreground">Hanya dosen yang bisa melihat</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium">Publik</p>
                        <p className="text-xs text-muted-foreground">Semua orang bisa melihat</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={createClass.isPending || updateClass.isPending} className="min-w-[100px]">
              {editingClass ? 'Simpan Perubahan' : 'Buat Kelas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua data kelas termasuk sesi, presensi, dan
              materi akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
