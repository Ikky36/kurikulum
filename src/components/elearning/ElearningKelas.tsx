import { useState } from 'react';
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
import { Plus, Edit, Trash2, Users, BookOpen, Eye, EyeOff, Globe } from 'lucide-react';

type ClassWithRelations = ElearningClass & {
  class_group: { id: string; name: string } | null;
  course: { id: string; name: string; code: string } | null;
  instructor: { id: string; full_name: string; photo_url: string | null } | null;
};

export function ElearningKelas() {
  const { profile } = useAuth();
  const { data: classes, isLoading } = useElearningClasses();
  const { data: courses } = useCourses();
  const { data: classGroups } = useClassGroups();
  const createClass = useCreateElearningClass();
  const updateClass = useUpdateElearningClass();
  const deleteClass = useDeleteElearningClass();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithRelations | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    class_group_id: '',
    visibility: 'class_only' as 'class_only' | 'instructors_only' | 'public',
  });

  const isAdmin = profile?.role === 'admin';
  const isDosen = profile?.role === 'dosen';
  const canManage = isAdmin || isDosen;

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      course_id: '',
      class_group_id: '',
      visibility: 'class_only',
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
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.course_id || !formData.class_group_id) {
      toast.error('Mohon lengkapi semua field wajib');
      return;
    }

    try {
      if (editingClass) {
        await updateClass.mutateAsync({
          id: editingClass.id,
          title: formData.title,
          description: formData.description || null,
          course_id: formData.course_id,
          class_group_id: formData.class_group_id,
          visibility: formData.visibility,
        });
        toast.success('Kelas berhasil diperbarui');
      } else {
        await createClass.mutateAsync({
          title: formData.title,
          description: formData.description || null,
          course_id: formData.course_id,
          class_group_id: formData.class_group_id,
          instructor_profile_id: profile!.id,
          visibility: formData.visibility,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const typedClasses = (classes || []) as ClassWithRelations[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Daftar Kelas</h2>
          <p className="text-sm text-muted-foreground">
            {typedClasses.length} kelas tersedia
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Buat Kelas
          </Button>
        )}
      </div>

      {/* Classes Grid */}
      {typedClasses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Belum ada kelas tersedia.
              {canManage && ' Klik "Buat Kelas" untuk menambahkan.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {typedClasses.map((cls) => (
            <Card key={cls.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg line-clamp-1">{cls.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {cls.description || 'Tidak ada deskripsi'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1 shrink-0">
                    {getVisibilityIcon(cls.visibility)}
                    <span className="hidden sm:inline">{getVisibilityLabel(cls.visibility)}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Course & Class Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      {cls.course?.code} - {cls.course?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{cls.class_group?.name || '-'}</span>
                  </div>
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={cls.instructor?.photo_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {cls.instructor?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{cls.instructor?.full_name}</span>
                </div>

                {/* Actions */}
                {(isAdmin || cls.instructor_profile_id === profile?.id) && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => openEditDialog(cls)}
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingClassId(cls.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit Kelas' : 'Buat Kelas Baru'}</DialogTitle>
            <DialogDescription>
              {editingClass ? 'Perbarui informasi kelas' : 'Tambahkan kelas e-learning baru'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Judul Kelas *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Masukkan judul kelas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat kelas"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Mata Kuliah *</Label>
              <Select
                value={formData.course_id}
                onValueChange={(value) => setFormData({ ...formData, course_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata kuliah" />
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

            <div className="space-y-2">
              <Label htmlFor="class_group">Kelas *</Label>
              <Select
                value={formData.class_group_id}
                onValueChange={(value) => setFormData({ ...formData, class_group_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classGroups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class_only">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Kelas Saja - Hanya mahasiswa di kelas ini
                    </div>
                  </SelectItem>
                  <SelectItem value="instructors_only">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Dosen Saja - Hanya dosen mata kuliah ini
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Publik - Semua orang bisa melihat
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={createClass.isPending || updateClass.isPending}>
              {editingClass ? 'Simpan' : 'Buat'}
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
