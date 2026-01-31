import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGradeSubmission } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, CheckCircle2, Clock, AlertCircle, Eye, Save, Loader2, 
  FileText, Link2, ExternalLink, Star, MessageSquare 
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { AnnotatedPreview } from './AnnotatedPreview';

interface SubmissionGraderProps {
  assignmentId: string;
  assignmentTitle: string;
  classId: string;
}

interface SubmissionWithStudent {
  id: string;
  student_profile_id: string;
  submission_url: string | null;
  submission_content: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  attempt_number: number;
  student: {
    id: string;
    full_name: string;
    email: string;
    nim: string | null;
    photo_url: string | null;
  };
}

export function SubmissionGrader({ assignmentId, assignmentTitle, classId }: SubmissionGraderProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const gradeSubmission = useGradeSubmission();
  
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithStudent | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all submissions for this assignment
  const { data: submissions, isLoading, refetch } = useQuery({
    queryKey: ['assignment-submissions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_submissions')
        .select(`
          id,
          student_profile_id,
          submission_url,
          submission_content,
          submitted_at,
          score,
          feedback,
          graded_at,
          attempt_number,
          student:profiles!elearning_submissions_student_profile_id_fkey(
            id, full_name, email, nim, photo_url
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as unknown as SubmissionWithStudent[];
    },
  });

  // Fetch class students count for comparison
  const { data: classData } = useQuery({
    queryKey: ['elearning-class-students', classId],
    queryFn: async () => {
      const { data: eClass, error: classError } = await supabase
        .from('elearning_classes')
        .select('class_group_id')
        .eq('id', classId)
        .single();

      if (classError) throw classError;

      const { count, error: countError } = await supabase
        .from('class_students')
        .select('*', { count: 'exact', head: true })
        .eq('class_group_id', eClass.class_group_id);

      if (countError) throw countError;
      return { studentCount: count || 0 };
    },
  });

  const gradedCount = submissions?.filter(s => s.score !== null).length || 0;
  const pendingCount = submissions?.filter(s => s.score === null).length || 0;
  const totalSubmissions = submissions?.length || 0;
  const totalStudents = classData?.studentCount || 0;

  const handleOpenGrading = (submission: SubmissionWithStudent) => {
    setSelectedSubmission(submission);
    setGradeValue(submission.score?.toString() || '');
    setFeedbackValue(submission.feedback || '');
    setDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission || !profile?.id) return;

    const score = parseFloat(gradeValue);
    if (isNaN(score) || score < 0 || score > 100) {
      toast({ title: 'Error', description: 'Nilai harus antara 0-100', variant: 'destructive' });
      return;
    }

    try {
      await gradeSubmission.mutateAsync({
        id: selectedSubmission.id,
        score,
        feedback: feedbackValue.trim() || undefined,
        graded_by_profile_id: profile.id,
      });

      toast({ title: 'Sukses', description: 'Nilai berhasil disimpan' });
      setDialogOpen(false);
      refetch();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan nilai', variant: 'destructive' });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs text-muted-foreground">Total Mahasiswa</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSubmissions}</p>
                <p className="text-xs text-muted-foreground">Sudah Submit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gradedCount}</p>
                <p className="text-xs text-muted-foreground">Sudah Dinilai</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Belum Dinilai</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Daftar Submission
          </CardTitle>
          <CardDescription>
            Klik pada submission untuk melihat detail dan memberikan nilai
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !submissions?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p>Belum ada submission</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <Card
                  key={submission.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleOpenGrading(submission)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={submission.student.photo_url || undefined} />
                          <AvatarFallback>{getInitials(submission.student.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{submission.student.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {submission.student.nim || submission.student.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(submission.submitted_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                          </p>
                          {submission.submission_url && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                              <Link2 className="h-3 w-3" />
                              Link Document
                            </p>
                          )}
                        </div>

                        {submission.score !== null ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                            <Star className="h-3 w-3" />
                            {submission.score}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}

                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Lihat</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grading Dialog - Scrollable content with compact video */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg lg:max-w-5xl max-h-[90vh] overflow-hidden p-0">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 space-y-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Review & Penilaian Submission
                </DialogTitle>
              </DialogHeader>
              
              {selectedSubmission && (
                <div className="space-y-5">
                  {/* Student Info */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedSubmission.student.photo_url || undefined} />
                      <AvatarFallback>{getInitials(selectedSubmission.student.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedSubmission.student.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedSubmission.student.nim || selectedSubmission.student.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {format(new Date(selectedSubmission.submitted_at), 'dd MMMM yyyy, HH:mm', { locale: idLocale })}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Submission Content - Link Preview */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Link yang Dikumpulkan
                    </Label>
                    
                    {selectedSubmission.submission_url ? (
                      <div className="space-y-3">
                        {/* Link as Button */}
                        <Button 
                          variant="outline" 
                          className="gap-2 w-full justify-start" 
                          asChild
                        >
                          <a href={selectedSubmission.submission_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Buka Link Tugas
                          </a>
                        </Button>
                        
                        {/* Preview with annotation & video comments */}
                        <AnnotatedPreview 
                          url={selectedSubmission.submission_url} 
                          submissionId={selectedSubmission.id}
                          showFullscreen 
                          enableAnnotations
                          enableVideoComments
                        />
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">Tidak ada link</p>
                    )}
                  </div>

                  {/* Student Notes */}
                  {selectedSubmission.submission_content && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Catatan Mahasiswa
                        </Label>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-sm whitespace-pre-wrap">{selectedSubmission.submission_content}</p>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Grading Form */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Penilaian
                    </Label>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="grade-value">Nilai (0-100) *</Label>
                        <Input
                          id="grade-value"
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Masukkan nilai..."
                          value={gradeValue}
                          onChange={(e) => setGradeValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="feedback-value">Feedback (Opsional)</Label>
                        <Textarea
                          id="feedback-value"
                          placeholder="Berikan feedback atau catatan perbaikan..."
                          value={feedbackValue}
                          onChange={(e) => setFeedbackValue(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full">
                      Batal
                    </Button>
                    <Button 
                      onClick={handleSaveGrade}
                      disabled={!gradeValue || gradeSubmission.isPending}
                      className="gap-2 w-full"
                    >
                      {gradeSubmission.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Simpan Nilai
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
