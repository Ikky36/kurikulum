import { useState, useEffect, useCallback } from 'react';
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
import { ClipboardCheck, FileUp, HelpCircle, Trash2, Pencil, Play, Plus, Clock, Users, Shield, Lock, CheckCircle, AlertCircle, Link2, Eye, Upload, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AssignmentEditor } from './AssignmentEditor';
import { QuizManager } from './QuizManager';
import { QuizResultViewer } from './QuizResultViewer';
import { QuizResultsManager } from './QuizResultsManager';
import { AssignmentLeaderboard } from './AssignmentLeaderboard';
import { LinkSubmissionForm } from './LinkSubmissionForm';
import { SubmissionGrader } from './SubmissionGrader';
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
  start_date?: string | null;
};

const CountdownTimer = ({ targetDate, onComplete }: { targetDate: string, onComplete: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = target - now;
      
      if (difference <= 0) {
        return null;
      }
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const left = calculateTimeLeft();
      setTimeLeft(left);
      if (!left) {
        clearInterval(timer);
        onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200 mt-2 mb-2 w-fit">
      <Clock className="h-4 w-4 animate-pulse" />
      <span>Bisa dikerjakan dalam:</span>
      <span className="font-mono">{timeLeft.days}h {timeLeft.hours}j {timeLeft.minutes}m {timeLeft.seconds}d</span>
    </div>
  );
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
  const [submittingLink, setSubmittingLink] = useState<AssignmentWithRelations | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<AssignmentWithRelations | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unlockedAssignments, setUnlockedAssignments] = useState<Set<string>>(new Set());

  const handleTimerComplete = useCallback((id: string) => {
    setUnlockedAssignments(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  }, []);

  const isLocked = (assignment: AssignmentWithRelations) => {
    if (!assignment.start_date) return false;
    if (unlockedAssignments.has(assignment.id)) return false;
    return new Date(assignment.start_date).getTime() > new Date().getTime();
  };

  const typedAssignments = (assignments || []) as AssignmentWithRelations[];
  const isMahasiswa = profile?.role === 'mahasiswa';

  // Fetch student's submissions to check which assignments they've completed
  const { data: mySubmissions, refetch: refetchMySubmissions } = useQuery({
    queryKey: ['my-submissions', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_submissions')
        .select('id, assignment_id, score, attempt_number, submission_url, submission_content, submitted_at, feedback')
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

  const q = searchQuery.trim().toLowerCase();
  const filteredAssignments = q
    ? typedAssignments.filter(a =>
        (a.title || '').toLowerCase().includes(q)
        || (a.description || '').toLowerCase().includes(q)
        || (a.assignment_type || '').toLowerCase().includes(q)
        || (a.llo?.code || '').toLowerCase().includes(q)
      )
    : typedAssignments;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari tugas atau quiz..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canEdit && (
          <Button 
            onClick={() => { setEditingAssignment(null); setShowEditor(true); }}
            size="lg"
            className="gap-2 shadow-md"
          >
            <Plus className="h-5 w-5" />
            Tambah Tugas/Quiz
          </Button>
        )}
      </div>

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
      ) : filteredAssignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            Tidak ada tugas/quiz yang cocok dengan pencarian "{searchQuery}"
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-1 md:[&_>_div]:max-w-none">
          {filteredAssignments.map((assignment) => (
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

                {/* Leaderboard Button */}
                {assignment.assignment_type === 'quiz' && assignment.is_published && (
                  <div className="pt-2 border-t">
                    <AssignmentLeaderboard 
                      assignmentId={assignment.id} 
                      assignmentTitle={assignment.title}
                      classId={classId}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t">
                  {/* Student Actions - Quiz */}
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
                        isLocked(assignment) ? (
                          <div className="w-full">
                            <CountdownTimer 
                              targetDate={assignment.start_date!} 
                              onComplete={() => handleTimerComplete(assignment.id)} 
                            />
                            <Button disabled className="gap-2 w-full">
                              <Lock className="h-4 w-4" />
                              Terkunci
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleStartQuiz(assignment)} 
                            className="gap-2 flex-1"
                          >
                            <Play className="h-4 w-4" />
                            Kerjakan Quiz
                          </Button>
                        )
                      )}
                    </div>
                  )}

                  {/* Student Actions - Link/Tugas */}
                  {isMahasiswa && assignment.assignment_type === 'tugas' && assignment.is_published && (
                    <div className="flex items-center gap-2 flex-1">
                      {(() => {
                        const submission = getSubmissionForAssignment(assignment.id);
                        if (submission?.score !== null && submission?.score !== undefined) {
                          return (
                            <>
                              <Badge className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                Nilai: {submission.score}
                              </Badge>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setSubmittingLink(assignment)}
                                className="gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                Lihat
                              </Button>
                            </>
                          );
                        }
                        if (submission) {
                          return (
                            <>
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Menunggu Nilai
                              </Badge>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setSubmittingLink(assignment)}
                                className="gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                Lihat
                              </Button>
                            </>
                          );
                        }
                        
                        if (isLocked(assignment)) {
                          return (
                            <div className="w-full">
                              <CountdownTimer 
                                targetDate={assignment.start_date!} 
                                onComplete={() => handleTimerComplete(assignment.id)} 
                              />
                              <Button disabled className="gap-2 w-full">
                                <Lock className="h-4 w-4" />
                                Terkunci
                              </Button>
                            </div>
                          );
                        }

                        return (
                          <Button 
                            onClick={() => setSubmittingLink(assignment)} 
                            className="gap-2 flex-1"
                          >
                            <Link2 className="h-4 w-4" />
                            Kumpulkan Tugas
                          </Button>
                        );
                      })()}
                    </div>
                  )}

                  {/* Instructor Actions */}
                  {canEdit && (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      {/* Grading button for non-quiz assignments */}
                      {assignment.assignment_type === 'tugas' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setGradingAssignment(assignment)}
                          className="gap-1"
                        >
                          <Users className="h-4 w-4" />
                          Periksa
                        </Button>
                      )}
                       {assignment.assignment_type === 'quiz' && (
                        <>
                          <QuizResultsManager
                            assignmentId={assignment.id}
                            assignmentTitle={assignment.title}
                            classId={classId}
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setManagingQuiz(assignment)}
                            className="gap-1"
                          >
                            <HelpCircle className="h-4 w-4" />
                            Kelola Soal
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleStartQuiz(assignment)}
                            className="gap-1 border-yellow-500/50 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 hover:text-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-500/20"
                            title="Uji coba kuis ini sebagai Mahasiswa"
                          >
                            <Play className="h-4 w-4" />
                            Uji Coba
                          </Button>
                        </>
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
              classId={classId}
              courseId={courseId}
              assignmentTitle={managingQuiz.title}
              isSafeExamMode={managingQuiz.is_safe_exam_mode}
              sebPassword={managingQuiz.seb_password}
              sebQuitPassword={managingQuiz.seb_quit_password}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Link Submission Dialog - For Students */}
      <Dialog open={!!submittingLink} onOpenChange={() => setSubmittingLink(null)}>
        <DialogContent className="w-full max-w-full sm:w-[96vw] sm:max-w-[96vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {submittingLink?.title}
            </DialogTitle>
          </DialogHeader>
          {submittingLink && (
            <LinkSubmissionForm
              assignmentId={submittingLink.id}
              assignmentTitle={submittingLink.title}
              existingSubmission={mySubmissions?.find(s => s.assignment_id === submittingLink.id) || null}
              onSuccess={() => {
                setSubmittingLink(null);
                refetchMySubmissions();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Submission Grader Dialog - For Instructors */}
      <Dialog open={!!gradingAssignment} onOpenChange={() => setGradingAssignment(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5" />
              Periksa Submission: {gradingAssignment?.title}
            </DialogTitle>
          </DialogHeader>
          {gradingAssignment && (
            <SubmissionGrader
              assignmentId={gradingAssignment.id}
              assignmentTitle={gradingAssignment.title}
              classId={classId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
