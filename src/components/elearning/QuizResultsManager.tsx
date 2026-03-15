import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, Eye, Clock, Trophy, FileQuestion,
  AlertCircle, BarChart3, Users, Search, ChevronLeft, ArrowLeft
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
}

export function QuizResultsManager({ assignmentId, assignmentTitle, classId }: QuizResultsManagerProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all class students
  const { data: allStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['quiz-results-students', classId],
    queryFn: async () => {
      const { data: eClass, error: classError } = await supabase
        .from('elearning_classes')
        .select('class_group_id')
        .eq('id', classId)
        .single();
      if (classError) throw classError;

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
    enabled: open,
  });

  // Fetch all submissions for this assignment
  const { data: allSubmissions } = useQuery({
    queryKey: ['quiz-results-all-submissions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_submissions')
        .select('id, student_profile_id, score, attempt_number, submitted_at, answers, feedback')
        .eq('assignment_id', assignmentId)
        .order('attempt_number', { ascending: false });
      if (error) throw error;
      return data as Submission[];
    },
    enabled: open,
  });

  // Fetch questions with correct answers (for dosen/admin)
  const { data: questions } = useQuery({
    queryKey: ['quiz-questions-result', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_quiz_questions_for_student', { p_assignment_id: assignmentId });
      if (error) throw error;
      return data;
    },
    enabled: open && !!selectedStudent,
  });

  // Group submissions by student
  const submissionsByStudent = allSubmissions?.reduce((acc, sub) => {
    if (!acc[sub.student_profile_id]) acc[sub.student_profile_id] = [];
    acc[sub.student_profile_id].push(sub);
    return acc;
  }, {} as Record<string, Submission[]>) || {};

  // Prepare student list with best scores
  const studentList = (allStudents || []).map(cs => {
    const studentSubs = submissionsByStudent[cs.student_profile_id] || [];
    const bestScore = studentSubs.length > 0
      ? Math.max(...studentSubs.map(s => s.score || 0))
      : null;
    return {
      student: cs.student,
      submissions: studentSubs,
      bestScore,
      totalAttempts: studentSubs.length,
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
    ? (submissionsByStudent[selectedStudent.id] || [])
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
                          {getAnswerDisplay(userAnswer, question.question_type, question.options)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium">Jawaban Benar:</span>
                        <p className="p-2 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 bidi-content" dir="auto">
                          {getCorrectAnswerDisplay(question)}
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
          <div className="space-y-4">
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
                {filteredStudents.map(({ student, bestScore, totalAttempts }) => (
                  <Card
                    key={student.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${totalAttempts === 0 ? 'opacity-60' : ''}`}
                    onClick={() => totalAttempts > 0 ? setSelectedStudent(student) : null}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.photo_url || undefined} />
                        <AvatarFallback>{student.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground">{student.nim || student.email}</p>
                      </div>
                      {totalAttempts > 0 ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {totalAttempts}x percobaan
                          </Badge>
                          <Badge className="bg-primary/10 text-primary">
                            <Trophy className="h-3 w-3 mr-1" />
                            {bestScore?.toFixed(0) || 0}%
                          </Badge>
                          <Eye className="h-4 w-4 text-muted-foreground" />
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
          </div>
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
              <h3 className="font-semibold mb-3">Riwayat Percobaan</h3>
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
