import { useState } from 'react';
import { useElearningAssignments, useDeleteAssignment, type ElearningAssignment } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, FileUp, HelpCircle, Trash2, Pencil, Eye, Plus, Clock, Users, Shield } from 'lucide-react';
import { AssignmentEditor } from './AssignmentEditor';
import { QuizManager } from './QuizManager';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface AssignmentListProps {
  classId: string;
  courseId: string;
  canEdit: boolean;
}

type AssignmentWithRelations = ElearningAssignment & {
  llo?: { id: string; code: string; description: string } | null;
  assessment?: { id: string; code: string; name: string } | null;
};

export function AssignmentList({ classId, courseId, canEdit }: AssignmentListProps) {
  const { toast } = useToast();
  const { data: assignments, isLoading } = useElearningAssignments(classId);
  const deleteAssignment = useDeleteAssignment();
  
  const [showEditor, setShowEditor] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentWithRelations | null>(null);
  const [managingQuiz, setManagingQuiz] = useState<AssignmentWithRelations | null>(null);

  const typedAssignments = (assignments || []) as AssignmentWithRelations[];

  const handleDelete = async (id: string) => {
    try {
      await deleteAssignment.mutateAsync(id);
      toast({ title: 'Sukses', description: 'Tugas/Quiz berhasil dihapus' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus tugas/quiz', variant: 'destructive' });
    }
  };

  const getAssignmentIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <HelpCircle className="h-4 w-4" />;
      case 'file_upload': return <FileUp className="h-4 w-4" />;
      default: return <ClipboardCheck className="h-4 w-4" />;
    }
  };

  const getAssignmentTypeBadge = (type: string) => {
    switch (type) {
      case 'quiz': return <Badge>Quiz</Badge>;
      case 'file_upload': return <Badge variant="secondary">Upload File</Badge>;
      case 'link': return <Badge variant="outline">Link</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingAssignment(null); setShowEditor(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Tugas/Quiz
          </Button>
        </div>
      )}

      {typedAssignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center">Belum ada tugas atau quiz</p>
            {canEdit && (
              <Button variant="outline" className="mt-4" onClick={() => setShowEditor(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Tugas/Quiz Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {typedAssignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getAssignmentIcon(assignment.assignment_type)}
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getAssignmentTypeBadge(assignment.assignment_type)}
                    <Badge variant={assignment.is_published ? 'default' : 'secondary'}>
                      {assignment.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    {assignment.is_safe_exam_mode && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        SEB
                      </Badge>
                    )}
                  </div>
                </div>
                {assignment.description && (
                  <CardDescription className="mt-2">{assignment.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {assignment.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Deadline: {format(new Date(assignment.due_date), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                      </span>
                    )}
                    {assignment.max_attempts && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Max {assignment.max_attempts}x percobaan
                      </span>
                    )}
                    {assignment.time_limit_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {assignment.time_limit_minutes} menit
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {assignment.assignment_type === 'quiz' && canEdit && (
                      <Button variant="outline" size="sm" onClick={() => setManagingQuiz(assignment)}>
                        <HelpCircle className="h-4 w-4 mr-1" />
                        Kelola Soal
                      </Button>
                    )}
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingAssignment(assignment); setShowEditor(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Tugas/Quiz?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan. "{assignment.title}" akan dihapus permanen beserta semua soal dan submission.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(assignment.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Edit Tugas/Quiz' : 'Tambah Tugas/Quiz Baru'}</DialogTitle>
          </DialogHeader>
          <AssignmentEditor
            classId={classId}
            courseId={courseId}
            assignment={editingAssignment}
            onSuccess={() => {
              setShowEditor(false);
              setEditingAssignment(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Quiz Manager Dialog */}
      <Dialog open={!!managingQuiz} onOpenChange={() => setManagingQuiz(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Soal Quiz: {managingQuiz?.title}</DialogTitle>
          </DialogHeader>
          {managingQuiz && (
            <QuizManager
              assignmentId={managingQuiz.id}
              courseId={courseId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
