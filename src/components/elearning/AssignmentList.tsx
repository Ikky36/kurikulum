import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useElearningAssignments, useDeleteAssignment, type ElearningAssignment } from '@/hooks/useElearningMaterials';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, FileUp, HelpCircle, Trash2, Pencil, Play, Plus, Clock, Users, Shield, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { AssignmentEditor } from './AssignmentEditor';
import { QuizManager } from './QuizManager';
import { QuizResultViewer } from './QuizResultViewer';
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
  prerequisite_material_id?: string | null;
  prerequisite_assignment_id?: string | null;
  seb_password?: string | null;
  seb_quit_password?: string | null;
  show_answer_mode?: string | null;
};

export function AssignmentList({ classId, courseId, canEdit }: AssignmentListProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: assignments, isLoading } = useElearningAssignments(classId);
  const deleteAssignment = useDeleteAssignment();
  
  const [showEditor, setShowEditor] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentWithRelations | null>(null);
  const [managingQuiz, setManagingQuiz] = useState<AssignmentWithRelations | null>(null);

  const typedAssignments = (assignments || []) as AssignmentWithRelations[];
  const isMahasiswa = profile?.role === 'mahasiswa';

  // Fetch student's submissions to check which quizzes they've completed
  const { data: mySubmissions } = useQuery({
    queryKey: ['my-quiz-submissions', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_submissions')
        .select('assignment_id, score, attempt_number')
        .eq('student_profile_id', profile!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && isMahasiswa,
  });

  const getSubmissionForAssignment = (assignmentId: string) => {
    if (!mySubmissions) return null;
    const submissions = mySubmissions.filter(s => s.assignment_id === assignmentId);
    if (submissions.length === 0) return null;
    return submissions.reduce((best, current) => 
      (current.score || 0) > (best?.score || 0) ? current : best
    , submissions[0]);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAssignment.mutateAsync(id);
      toast({ title: 'Sukses', description: 'Tugas/Quiz berhasil dihapus' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus tugas/quiz', variant: 'destructive' });
    }
  };

  const handleStartQuiz = (assignment: AssignmentWithRelations) => {
    navigate(`/quiz/${assignment.id}`);
  };

  const getAssignmentIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <HelpCircle className="h-5 w-5" />;
      case 'file_upload': return <FileUp className="h-5 w-5" />;
      default: return <ClipboardCheck className="h-5 w-5" />;
    }
  };

  const getAssignmentTypeColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'file_upload': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const hasPrerequisite = (assignment: AssignmentWithRelations) => {
    return assignment.prerequisite_material_id || assignment.prerequisite_assignment_id;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex justify-end">
          <Button 
            onClick={() => { setEditingAssignment(null); setShowEditor(true); }}
            size="lg"
            className="gap-2 shadow-md"
          >
            <Plus className="h-5 w-5" />
            Tambah Tugas/Quiz
          </Button>
        </div>
      )}

      {typedAssignments.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <ClipboardCheck className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Belum Ada Tugas/Quiz</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Mulai dengan menambahkan tugas atau quiz pertama. Anda dapat menggunakan AI untuk membantu membuat soal.
            </p>
            {canEdit && (
              <Button onClick={() => setShowEditor(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Buat Tugas/Quiz Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {typedAssignments.map((assignment) => (
            <Card 
              key={assignment.id} 
              className="group hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {/* Top Badge Bar */}
              <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-3 rounded-xl shrink-0 ${getAssignmentTypeColor(assignment.assignment_type)}`}>
                      {getAssignmentIcon(assignment.assignment_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {assignment.title}
                      </CardTitle>
                      {assignment.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {assignment.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <Badge className={getAssignmentTypeColor(assignment.assignment_type)}>
                    {assignment.assignment_type === 'quiz' ? 'Quiz' : 
                     assignment.assignment_type === 'file_upload' ? 'Upload File' : 'Link'}
                  </Badge>
                  <Badge 
                    variant={assignment.is_published ? 'default' : 'secondary'}
                    className={assignment.is_published ? 'bg-green-100 text-green-700' : ''}
                  >
                    {assignment.is_published ? (
                      <><CheckCircle className="h-3 w-3 mr-1" />Published</>
                    ) : 'Draft'}
                  </Badge>
                  {assignment.is_safe_exam_mode && (
                    <Badge variant="destructive" className="gap-1">
                      <Shield className="h-3 w-3" />
                      SEB
                    </Badge>
                  )}
                  {hasPrerequisite(assignment) && (
                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                      <Lock className="h-3 w-3" />
                      Bersyarat
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Time & Attempts Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {assignment.due_date && (
                    <span className={`flex items-center gap-1.5 ${isOverdue(assignment.due_date) ? 'text-destructive' : ''}`}>
                      {isOverdue(assignment.due_date) ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      {format(new Date(assignment.due_date), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                    </span>
                  )}
                  {assignment.max_attempts && (
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {assignment.max_attempts}x percobaan
                    </span>
                  )}
                  {assignment.time_limit_minutes && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {assignment.time_limit_minutes} menit
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t">
                  {/* Student Actions */}
                  {isMahasiswa && assignment.assignment_type === 'quiz' && assignment.is_published && (
                    <div className="flex items-center gap-2 flex-1">
                      {getSubmissionForAssignment(assignment.id) ? (
                        <>
                          <QuizResultViewer 
                            assignmentId={assignment.id} 
                            assignmentTitle={assignment.title}
                            showAnswerMode={assignment.show_answer_mode || 'after_quiz'}
                          />
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {getSubmissionForAssignment(assignment.id)?.score?.toFixed(0) || 0}%
                          </Badge>
                          {/* Allow retake if max attempts not reached */}
                          {(!assignment.max_attempts || 
                            (mySubmissions?.filter(s => s.assignment_id === assignment.id).length || 0) < assignment.max_attempts) && (
                            <Button 
                              onClick={() => handleStartQuiz(assignment)} 
                              variant="outline"
                              size="sm"
                              className="gap-1"
                            >
                              <Play className="h-4 w-4" />
                              Coba Lagi
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button 
                          onClick={() => handleStartQuiz(assignment)} 
                          className="gap-2 flex-1"
                        >
                          <Play className="h-4 w-4" />
                          Kerjakan Quiz
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Instructor Actions */}
                  {canEdit && (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      {assignment.assignment_type === 'quiz' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setManagingQuiz(assignment)}
                          className="gap-1"
                        >
                          <HelpCircle className="h-4 w-4" />
                          Kelola Soal
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setEditingAssignment(assignment); setShowEditor(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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
                            <AlertDialogAction 
                              onClick={() => handleDelete(assignment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingAssignment ? 'Edit Tugas/Quiz' : 'Tambah Tugas/Quiz Baru'}
            </DialogTitle>
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
            <DialogTitle className="text-xl flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Kelola Soal: {managingQuiz?.title}
            </DialogTitle>
          </DialogHeader>
          {managingQuiz && (
            <QuizManager
              assignmentId={managingQuiz.id}
              courseId={courseId}
              assignmentTitle={managingQuiz.title}
              isSafeExamMode={managingQuiz.is_safe_exam_mode}
              sebPassword={managingQuiz.seb_password}
              sebQuitPassword={managingQuiz.seb_quit_password}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
