import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, Eye, Clock, Trophy, FileQuestion,
  AlertCircle, BarChart3, Users, Search, ChevronLeft, ArrowLeft, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { containsArabic } from '@/components/ui/arabic-text';

interface QuizResultsManagerProps {
  assignmentId: string;
  assignmentTitle: string;
  classId: string;
}

interface StudentInfo {
  id: string;
  full_name: string;
  email: string;
  nim: string | null;
  photo_url: string | null;
}

interface Submission {
  id: string;
  student_profile_id: string;
  score: number | null;
  attempt_number: number;
  submitted_at: string;
  answers: any;
  feedback: string | null;
  profiles?: any;
}

export function QuizResultsManager({ assignmentId, assignmentTitle, classId }: QuizResultsManagerProps) {
  const { profile, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canReset = hasAnyRole(['admin', 'sub_admin', 'dosen']);
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resettingStudentId, setResettingStudentId] = useState<string | null>(null);

  const resetStudentAttempts = async (studentId: string, studentName: string) => {
    setResettingStudentId(studentId);
    try {
      const { error } = await supabase
        .from('elearning_submissions')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('student_profile_id', studentId);
      if (error) throw error;
      toast({
        title: 'Kesempatan direset',
        description: `Semua percobaan ${studentName} telah dihapus.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['quiz-results-all-submissions', assignmentId] });
      if (selectedStudent?.id === studentId) {
        setSelectedSubmission(null);
        setSelectedStudent(null);
      }
    } catch (err: any) {
      toast({
        title: 'Gagal mereset',
        description: err?.message || 'Terjadi kesalahan.',
        variant: 'destructive',
      });
    } finally {
      setResettingStudentId(null);
    }
  };

  const { data: eClass } = useQuery({
    queryKey: ['elearning-class', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_classes')
        .select('*')
        .eq('id', classId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!classId,
  });

  const { data: allStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students-result', eClass?.class_group_id],
    queryFn: async () => {
      if (!eClass?.class_group_id) return [];
      const { data, error } = await supabase
        .from('class_students')
        .select(`
          student_profile_id,
          student:profiles!class_students_student_profile_id_fkey(
            id, full_name, email, nim, photo_url
          )
        `)
        .eq('class_group_id', eClass.class_group_id);
      if (error) throw error;
      return data as unknown as Array<{ student_profile_id: string; student: StudentInfo }>;
    },
    enabled: open && !!eClass?.class_group_id,
  });

  const { data: allSubmissions } = useQuery({
    queryKey: ['quiz-results-all-submissions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_submissions')
        .select(`
          id, student_profile_id, score, attempt_number, submitted_at, answers, feedback, is_test_mode,
          profiles(id, full_name, email, photo_url, nim)
        `)
        .eq('assignment_id', assignmentId)
        .order('attempt_number', { ascending: false });
      if (error) throw error;
      return data as Submission[];
    },
    enabled: open,
  });

  const { data: questions } = useQuery({
    queryKey: ['quiz-questions-result', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_quiz_questions_for_student', { p_assignment_id: assignmentId });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const totalQuizPoints = questions?.reduce((sum: number, q: any) => sum + (q.points || 0), 0) || 0;

  const studentSubmissions: Submission[] = [];
  const testSubmissions: Submission[] = [];

  allSubmissions?.forEach(sub => {
    try {
      let ans = sub.answers;
      if (typeof ans === 'string') {
        try { ans = JSON.parse(ans); } catch(e) {}
      }
      if (typeof ans === 'string') {
        try { ans = JSON.parse(ans); } catch(e) {}
      }

      // Check DB column first, fallback to JSON flag
      if (sub.is_test_mode === true || (ans && typeof ans === 'object' && ans._is_test_mode === true)) {
        testSubmissions.push(sub);
      } else {
        studentSubmissions.push(sub);
      }
    } catch {
      studentSubmissions.push(sub);
    }
  });
  
  // Merge local test submissions
  try {
    const localStr = localStorage.getItem(`test_submissions_${assignmentId}`);
    if (localStr) {
      const localSubs = JSON.parse(localStr);
      localSubs.forEach((sub: any) => testSubmissions.push(sub));
    }
  } catch(e) {}

  // Group student submissions by student
  const submissionsByStudent = studentSubmissions.reduce((acc, sub) => {
    if (!acc[sub.student_profile_id]) acc[sub.student_profile_id] = [];
    acc[sub.student_profile_id].push(sub);
    return acc;
  }, {} as Record<string, Submission[]>) || {};

  // Group test submissions by submitter
  const testSubmissionsBySubmitter = testSubmissions.reduce((acc, sub) => {
    const profileId = sub.student_profile_id || 'unknown';
    const profileData = Array.isArray(sub.profiles) ? sub.profiles[0] : sub.profiles;
    
    if (!acc[profileId]) acc[profileId] = {
      profile: profileData || { id: profileId, full_name: 'Dosen / Admin', email: '-' },
      submissions: []
    };
    acc[profileId].submissions.push(sub);
    return acc;
  }, {} as Record<string, { profile: any, submissions: Submission[] }>) || {};

  // Prepare student list with best scores
  const studentList = (allStudents || []).map(cs => {
    const studentSubs = submissionsByStudent[cs.student_profile_id] || [];
    const bestScore = studentSubs.length > 0
      ? Math.max(...studentSubs.map(s => s.score || 0))
      : null;
      
    const hasViolation = studentSubs.some(sub => {
      try {
        const ans = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
        return ans?._is_auto_submitted === true;
      } catch {
        return false;
      }
    });

    return {
      student: cs.student,
      submissions: studentSubs,
      bestScore,
      totalAttempts: studentSubs.length,
      hasViolation,
    };
  });

  // Sort: submitted first (by best score desc), then not submitted (alphabetical)
  studentList.sort((a, b) => {
    if (a.totalAttempts > 0 && b.totalAttempts === 0) return -1;
    if (a.totalAttempts === 0 && b.totalAttempts > 0) return 1;
    if (a.totalAttempts > 0 && b.totalAttempts > 0) {
      return (b.bestScore || 0) - (a.bestScore || 0);
    }
    return a.student.full_name.localeCompare(b.student.full_name);
  });

  const filteredStudents = studentList.filter(s =>
    s.student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.student.nim && s.student.nim.includes(searchTerm))
  );

  const totalStudents = allStudents?.length || 0;
  const submittedCount = Object.keys(submissionsByStudent).length;
  const notSubmittedCount = totalStudents - submittedCount;

  const selectedStudentSubmissions = selectedStudent
    ? (submissionsByStudent[selectedStudent.id] || testSubmissionsBySubmitter[selectedStudent.id]?.submissions || [])
    : [];

  const parseOptionsArray = (options: any): any[] | null => {
    try {
      const parsed = typeof options === 'string' ? JSON.parse(options) : options;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const optionItemToText = (opt: any): string => {
    if (opt === null || opt === undefined) return '';
    if (typeof opt === 'object') {
      // supports { id, text } from imports
      if ('text' in opt) return String((opt as any).text ?? '');
      if ('label' in opt) return String((opt as any).label ?? '');
      if ('value' in opt) return String((opt as any).value ?? '');
    }
    return String(opt);
  };

  const getChoiceCandidates = (value: any, options: any): string[] => {
    const candidates: string[] = [];
    const add = (v: any) => {
      const t = String(v ?? '').trim();
      if (!t) return;
      if (!candidates.includes(t)) candidates.push(t);
    };

    const arr = parseOptionsArray(options);
    const idx = typeof value === 'number'
      ? value
      : (typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value, 10) : null);

    if (arr && idx !== null) {
      // Support BOTH 0-based and legacy 1-based indices
      if (idx >= 0 && idx < arr.length) add(optionItemToText(arr[idx]));
      if (idx - 1 >= 0 && idx - 1 < arr.length) add(optionItemToText(arr[idx - 1]));
    }

    // If it's already text (e.g., 'A', 'true', arabic string), keep it as candidate too
    if (typeof value === 'string' && !/^\d+$/.test(value)) add(value);

    if (!candidates.length && value !== null && value !== undefined) add(value);
    return candidates;
  };

  const resolveOptionText = (value: any, options: any): string => {
    if (value === null || value === undefined) return '-';
    const cands = getChoiceCandidates(value, options);
    return cands[0] ?? String(value);
  };

  const getAnswerDisplay = (answer: any, questionType: string, options?: any): string => {
    if (answer === null || answer === undefined) return '-';

    if (questionType === 'matching') {
      if (typeof answer === 'object' && !Array.isArray(answer)) {
        return Object.entries(answer).map(([left, right]) => `${left} → ${right}`).join(', ');
      }
    }

    if (questionType === 'multiple_answer' && Array.isArray(answer) && options) {
      return answer.map(a => resolveOptionText(a, options)).join(', ');
    }

    if ((questionType === 'multiple_choice' || questionType === 'true_false' || questionType === 'select_missing_word') && options) {
      return resolveOptionText(answer, options);
    }

    if (Array.isArray(answer)) return answer.join(', ');
    return String(answer);
  };

  const getCorrectAnswerDisplay = (question: any, userAnswer?: any): string => {
    if (question.question_type === 'matching' && question.options) {
      const parsedOptions = parseOptionsArray(question.options);
      if (parsedOptions) {
        return parsedOptions.map((pair: { left: string; right: string }) => `${pair.left} → ${pair.right}`).join(', ');
      }
    }

    if ((question.question_type === 'multiple_choice' || question.question_type === 'true_false' || question.question_type === 'select_missing_word') && question.options) {
      const correctCandidates = getChoiceCandidates(question.correct_answer, question.options);
      if (userAnswer !== undefined) {
        const userNorms = getChoiceCandidates(userAnswer, question.options).map(s => s.toLowerCase().trim());
        const matched = correctCandidates.find(c => userNorms.includes(c.toLowerCase().trim()));
        if (matched) return matched;
      }
      return correctCandidates[0] ?? resolveOptionText(question.correct_answer, question.options);
    }

    return getAnswerDisplay(question.correct_answer, question.question_type, question.options);
  };

  const checkAnswer = (userAnswer: any, correctAnswer: any, questionType: string, options?: any): boolean => {
    if (userAnswer === null || userAnswer === undefined) return false;
    if (questionType === 'essay' || questionType === 'long_answer') return false;

    if (questionType === 'multiple_choice' || questionType === 'select_missing_word' || questionType === 'true_false') {
      if (correctAnswer === null || correctAnswer === undefined) return false;
      const userNorms = getChoiceCandidates(userAnswer, options).map(s => s.toLowerCase().trim());
      const correctNorms = getChoiceCandidates(correctAnswer, options).map(s => s.toLowerCase().trim());
      return userNorms.some(u => correctNorms.includes(u));
    }

    if (questionType === 'multiple_answer') {
      if (!Array.isArray(correctAnswer) || !Array.isArray(userAnswer)) return false;
      return JSON.stringify([...userAnswer].sort()) === JSON.stringify([...correctAnswer].sort());
    }

    if (questionType === 'short_answer') {
      if (correctAnswer === null || correctAnswer === undefined) return false;
      return String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
    }

    if (questionType === 'matching') {
      if (typeof userAnswer !== 'object' || !options) return false;
      const parsedOptions = parseOptionsArray(options);
      if (!parsedOptions) return false;
      const expected: Record<string, string> = {};
      parsedOptions.forEach((pair: { left: string; right: string }) => {
        if (pair.left && pair.right) expected[pair.left] = pair.right;
      });
      const expectedKeys = Object.keys(expected);
      if (expectedKeys.length === 0) return false;
      if (Object.keys(userAnswer).length !== expectedKeys.length) return false;
      return expectedKeys.every(key => userAnswer[key] === expected[key]);
    }

    return false;
  };

  const renderSubmissionDetail = (submission: Submission) => {
    if (!questions) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Memuat soal...</p>
        </div>
      );
    }

    const userAnswers = typeof submission.answers === 'string'
      ? JSON.parse(submission.answers)
      : submission.answers || {};

    return (
      <div className="space-y-4">
        {questions.map((question: any, idx: number) => {
          const userAnswer = userAnswers[question.id];
          const isCorrect = checkAnswer(userAnswer, question.correct_answer, question.question_type, question.options);
          const userAnswerText = getAnswerDisplay(userAnswer, question.question_type, question.options);
          const correctAnswerText = getCorrectAnswerDisplay(question, userAnswer);

          return (
            <Card key={question.id} className={isCorrect ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' : 'border-red-500/50 bg-red-50/30 dark:bg-red-950/10'}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    {isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`font-medium bidi-content ${containsArabic(question.question_text) ? 'font-arabic' : ''}`}
                        dir="auto"
                        style={containsArabic(question.question_text) ? {
                          fontFamily: "'Scheherazade New', 'Amiri', serif",
                          fontSize: '1.3em',
                          lineHeight: 2,
                        } : undefined}
                      >
                        <span className="text-muted-foreground mr-2">#{idx + 1}</span>
                        {question.question_text}
                      </p>
                      <Badge variant="outline" className="shrink-0">
                        {isCorrect ? question.points : 0}/{question.points} poin
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium">Jawaban Mahasiswa:</span>
                        <p
                          className={`p-2 rounded bidi-content ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}
                          dir="auto"
                        >
                          {userAnswerText}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium">Jawaban Benar:</span>
                        <p className="p-2 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 bidi-content" dir="auto">
                          {correctAnswerText}
                        </p>
                      </div>
                    </div>

                    {question.feedback && (
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          💡 <span className="font-medium">Feedback:</span> {question.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedStudent(null); setSelectedSubmission(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Eye className="h-4 w-4" />
          Hasil Quiz
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Hasil Quiz: {assignmentTitle}
          </DialogTitle>
        </DialogHeader>

        {!selectedStudent ? (
          // Student list view
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="students">Nilai Mahasiswa</TabsTrigger>
              <TabsTrigger value="tests">Riwayat Uji Coba</TabsTrigger>
            </TabsList>
            
            <TabsContent value="students" className="space-y-4">
              {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold">{totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Total Mahasiswa</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <p className="text-2xl font-bold text-green-600">{submittedCount}</p>
                  <p className="text-xs text-muted-foreground">Sudah Submit</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                  <p className="text-2xl font-bold text-orange-600">{notSubmittedCount}</p>
                  <p className="text-xs text-muted-foreground">Belum Submit</p>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari mahasiswa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Student list */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredStudents.map(({ student, bestScore, totalAttempts, hasViolation }) => (
                  <Card
                    key={student.id}
                    className={`hover:shadow-md transition-shadow ${totalAttempts === 0 ? 'opacity-60' : ''}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div
                        className={`flex-1 min-w-0 flex items-center gap-3 ${totalAttempts > 0 ? 'cursor-pointer' : ''}`}
                        onClick={() => totalAttempts > 0 ? setSelectedStudent(student) : null}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.photo_url || undefined} />
                          <AvatarFallback>{student.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate flex items-center gap-2">
                            {student.full_name}
                            {hasViolation && <span title="Ada riwayat pelanggaran aturan kuis" className="text-base cursor-help">🚩</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{student.nim || student.email}</p>
                        </div>
                      </div>
                      {totalAttempts > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <Badge variant="secondary" className="text-xs">
                            {totalAttempts}x percobaan
                          </Badge>
                          <Badge className="bg-primary/10 text-primary">
                            <Trophy className="h-3 w-3 mr-1" />
                            {totalQuizPoints > 0 ? `${Math.round(((bestScore || 0) / 100) * totalQuizPoints)} / ${totalQuizPoints} poin (${bestScore?.toFixed(0) || 0}%)` : `${bestScore?.toFixed(0) || 0}%`}
                          </Badge>
                          {canReset && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-destructive hover:text-destructive"
                                  disabled={resettingStudentId === student.id}
                                  title="Reset kesempatan"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset Kesempatan Mahasiswa?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Semua percobaan ({totalAttempts}x) milik <b>{student.full_name}</b> pada quiz ini akan dihapus permanen. Mahasiswa dapat mengerjakan ulang dari awal. Lanjutkan?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => resetStudentAttempts(student.id, student.full_name)}
                                  >
                                    Ya, Reset
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <Eye
                            className="h-4 w-4 text-muted-foreground cursor-pointer"
                            onClick={() => setSelectedStudent(student)}
                          />
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Belum Submit
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Tidak ada mahasiswa ditemukan.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
            </TabsContent>

            <TabsContent value="tests" className="space-y-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {Object.values(testSubmissionsBySubmitter).map(({ profile, submissions }) => {
                    if (!profile) return null;
                    const totalAttempts = submissions.length;
                    const bestScore = totalAttempts > 0 ? Math.max(...submissions.map((s: any) => s.score || 0)) : 0;
                    const hasViolation = submissions.some((sub: any) => {
                      try {
                        const ans = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
                        return ans?._is_auto_submitted === true;
                      } catch { return false; }
                    });

                    return (
                      <Card key={profile.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div
                            className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer"
                            onClick={() => setSelectedStudent(profile as any)}
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile.photo_url || undefined} />
                              <AvatarFallback>{profile.full_name?.substring(0, 2).toUpperCase() || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate flex items-center gap-2">
                                {profile.full_name} (Uji Coba)
                                {hasViolation && <span title="Ada riwayat pelanggaran aturan kuis" className="text-base cursor-help">🚩</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">{profile.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Badge variant="secondary" className="text-xs">
                              {totalAttempts}x percobaan
                            </Badge>
                            <Badge className="bg-primary/10 text-primary">
                              <Trophy className="h-3 w-3 mr-1" />
                              {totalQuizPoints > 0 ? `${Math.round(((bestScore || 0) / 100) * totalQuizPoints)} / ${totalQuizPoints} poin (${bestScore?.toFixed(0) || 0}%)` : `${bestScore?.toFixed(0) || 0}%`}
                            </Badge>
                            <Eye
                              className="h-4 w-4 text-muted-foreground cursor-pointer"
                              onClick={() => setSelectedStudent(profile as any)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {Object.keys(testSubmissionsBySubmitter).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Belum ada dosen/admin yang melakukan uji coba kuis ini.</p>
                      
                      {/* DEBUG PANEL */}
                      <div className="mt-8 text-left text-xs bg-muted p-4 rounded-md overflow-auto max-h-40">
                        <p className="font-bold text-destructive mb-2">Debug Info (Hanya sementara):</p>
                        <p>Total Submissions Fetched: {allSubmissions?.length || 0}</p>
                        <p>Student Submissions: {studentSubmissions.length}</p>
                        <p>Test Submissions: {testSubmissions.length}</p>
                        <p className="text-red-500 font-semibold mt-2">Error Submit Terakhir: {localStorage.getItem('debug_last_submit_error') || 'Tidak ada error terekam'}</p>
                        <p className="mt-2">Raw first 3 submissions:</p>
                        <pre>
                          {JSON.stringify(allSubmissions?.slice(0, 3).map(s => ({
                            profileId: s.student_profile_id,
                            roleData: s.profiles,
                            answersType: typeof s.answers,
                            answersSnippet: typeof s.answers === 'string' ? s.answers.substring(0, 50) : s.answers
                          })), null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          // Student detail view
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedStudent(null); setSelectedSubmission(null); }}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar
            </Button>

            <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedStudent.photo_url || undefined} />
                    <AvatarFallback>{selectedStudent.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{selectedStudent.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedStudent.nim || selectedStudent.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                    <p className="text-xl font-bold text-primary">
                      {selectedStudentSubmissions.length > 0
                        ? Math.max(...selectedStudentSubmissions.map(s => s.score || 0)).toFixed(0)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Nilai Terbaik</p>
                  </div>
                  <div>
                    <FileQuestion className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-xl font-bold">{selectedStudentSubmissions.length}</p>
                    <p className="text-xs text-muted-foreground">Total Percobaan</p>
                  </div>
                  <div>
                    <Clock className="h-5 w-5 mx-auto mb-1 text-green-500" />
                    <p className="text-sm font-medium">
                      {selectedStudentSubmissions[0] && format(new Date(selectedStudentSubmissions[0].submitted_at), 'dd MMM yyyy', { locale: idLocale })}
                    </p>
                    <p className="text-xs text-muted-foreground">Terakhir Submit</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attempt selector */}
            <div>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h3 className="font-semibold">Riwayat Percobaan</h3>
                {canReset && selectedStudent && selectedStudentSubmissions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive gap-2"
                        disabled={resettingStudentId === selectedStudent.id}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset Kesempatan
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Kesempatan Mahasiswa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Semua {selectedStudentSubmissions.length} percobaan milik <b>{selectedStudent.full_name}</b> pada quiz ini akan dihapus permanen. Mahasiswa dapat mengerjakan ulang dari awal. Lanjutkan?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => resetStudentAttempts(selectedStudent.id, selectedStudent.full_name)}
                        >
                          Ya, Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedStudentSubmissions.map((submission) => (
                  <Button
                    key={submission.id}
                    variant={selectedSubmission?.id === submission.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSubmission(submission)}
                    className="gap-2"
                  >
                    <span>Percobaan {submission.attempt_number}</span>
                    {(() => {
                      try {
                        const ans = typeof submission.answers === 'string' ? JSON.parse(submission.answers) : submission.answers;
                        if (ans?._is_auto_submitted) {
                          return <span title="Disubmit Otomatis">🚩</span>;
                        }
                      } catch {}
                      return null;
                    })()}
                    <Badge variant="secondary" className="text-xs">
                      {submission.score?.toFixed(0) || 0}%
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>


            {/* Submission detail */}
            {selectedSubmission ? (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                      Detail Percobaan {selectedSubmission.attempt_number}
                    </h3>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(selectedSubmission.submitted_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                    </Badge>
                  </div>
                  
                  {(() => {
                    try {
                      const ans = typeof selectedSubmission.answers === 'string' ? JSON.parse(selectedSubmission.answers) : selectedSubmission.answers;
                      if (ans?._is_auto_submitted) {
                        return (
                          <div className="mb-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-600 dark:text-red-400">
                            <div className="flex items-center gap-2 font-semibold">
                              <AlertCircle className="h-4 w-4" />
                              Disubmit paksa oleh sistem karena pelanggaran aturan
                            </div>
                            {ans._violation_reason && (
                              <p className="mt-1 ml-6 text-xs text-red-500">Alasan: {ans._violation_reason}</p>
                            )}
                          </div>
                        );
                      }
                    } catch {}
                    return null;
                  })()}

                  <ScrollArea className="h-[350px] pr-4">
                    {renderSubmissionDetail(selectedSubmission)}
                  </ScrollArea>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Pilih percobaan di atas untuk melihat detail pembahasan.</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
