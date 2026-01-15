import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, XCircle, Eye, Clock, Trophy, FileQuestion,
  AlertCircle, BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface QuizResultViewerProps {
  assignmentId: string;
  assignmentTitle: string;
  showAnswerMode: string | null;
}

interface Submission {
  id: string;
  score: number | null;
  attempt_number: number;
  submitted_at: string;
  answers: any;
  feedback: string | null;
}

interface QuestionDetail {
  question_id: string;
  question: string;
  question_type: string;
  user_answer: any;
  correct_answer: any;
  is_correct: boolean;
  points: number;
  earned_points: number;
  feedback: string | null;
}

export function QuizResultViewer({ assignmentId, assignmentTitle, showAnswerMode }: QuizResultViewerProps) {
  const { profile } = useAuth();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [open, setOpen] = useState(false);

  // Fetch student's submissions for this assignment
  const { data: submissions, isLoading: loadingSubmissions } = useQuery({
    queryKey: ['quiz-results', assignmentId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_profile_id', profile!.id)
        .order('attempt_number', { ascending: false });
      if (error) throw error;
      return data as Submission[];
    },
    enabled: !!assignmentId && !!profile?.id,
  });

  // Fetch questions with correct answers (only available after submission based on show_answer_mode)
  const { data: questions } = useQuery({
    queryKey: ['quiz-questions-result', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_quiz_questions_for_student', { p_assignment_id: assignmentId });
      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId && !!submissions && submissions.length > 0,
  });

  const canShowAnswers = showAnswerMode === 'after_quiz' || showAnswerMode === 'after_each';
  const hasSubmissions = submissions && submissions.length > 0;
  const bestSubmission = submissions?.reduce((best, current) => 
    (current.score || 0) > (best?.score || 0) ? current : best
  , submissions[0]);

  const getAnswerDisplay = (answer: any, questionType: string, options?: any): string => {
    if (answer === null || answer === undefined) return '-';
    
    if (questionType === 'matching') {
      if (typeof answer === 'object' && !Array.isArray(answer)) {
        return Object.entries(answer)
          .map(([left, right]) => `${left} → ${right}`)
          .join(', ');
      }
      // If answer is array like [[0,0],[1,1]], we need to show from options
      if (Array.isArray(answer) && options) {
        const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
        if (Array.isArray(parsedOptions)) {
          return parsedOptions
            .map((pair: { left: string; right: string }) => `${pair.left} → ${pair.right}`)
            .join(', ');
        }
      }
    }
    
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    
    return String(answer);
  };

  const getCorrectAnswerDisplay = (question: any): string => {
    if (question.question_type === 'matching' && question.options) {
      const parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      if (Array.isArray(parsedOptions)) {
        return parsedOptions
          .map((pair: { left: string; right: string }) => `${pair.left} → ${pair.right}`)
          .join(', ');
      }
    }
    return getAnswerDisplay(question.correct_answer, question.question_type);
  };

  const renderSubmissionDetails = (submission: Submission) => {
    if (!questions || !canShowAnswers) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Pembahasan tidak tersedia untuk quiz ini.</p>
          {showAnswerMode === 'never' && (
            <p className="text-sm mt-2">Dosen mengatur agar jawaban tidak ditampilkan.</p>
          )}
        </div>
      );
    }

    // Parse answers from submission
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
                      <p className="font-medium">
                        <span className="text-muted-foreground mr-2">#{idx + 1}</span>
                        {question.question_text}
                      </p>
                      <Badge variant="outline" className="shrink-0">
                        {isCorrect ? question.points : 0}/{question.points} poin
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium">Jawaban Anda:</span>
                        <p className={`p-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                          {getAnswerDisplay(userAnswer, question.question_type, question.options)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium">Jawaban Benar:</span>
                        <p className="p-2 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
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

  const checkAnswer = (userAnswer: any, correctAnswer: any, questionType: string, options?: any): boolean => {
    if (userAnswer === null || userAnswer === undefined) {
      return false;
    }

    if (questionType === 'multiple_choice' || questionType === 'true_false' || questionType === 'select_missing_word') {
      if (correctAnswer === null || correctAnswer === undefined) return false;
      return String(userAnswer) === String(correctAnswer);
    }

    if (questionType === 'multiple_answer') {
      if (!Array.isArray(correctAnswer) || !Array.isArray(userAnswer)) return false;
      const userArr = [...userAnswer].sort();
      const correctArr = [...correctAnswer].sort();
      return JSON.stringify(userArr) === JSON.stringify(correctArr);
    }

    if (questionType === 'short_answer') {
      if (correctAnswer === null || correctAnswer === undefined) return false;
      return String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
    }

    if (questionType === 'matching') {
      // Build expected mapping from options (the correct pairs)
      if (typeof userAnswer !== 'object' || !options) return false;
      
      const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      if (!Array.isArray(parsedOptions)) return false;
      
      // Build expected mapping: {left: right, ...}
      const expectedMapping: Record<string, string> = {};
      parsedOptions.forEach((pair: { left: string; right: string }) => {
        if (pair.left && pair.right) {
          expectedMapping[pair.left] = pair.right;
        }
      });
      
      // Check if user answer matches expected mapping
      const userKeys = Object.keys(userAnswer);
      const expectedKeys = Object.keys(expectedMapping);
      
      if (userKeys.length !== expectedKeys.length) return false;
      
      for (const key of userKeys) {
        if (expectedMapping[key] !== userAnswer[key]) {
          return false;
        }
      }
      
      return true;
    }

    return false;
  };

  if (!hasSubmissions) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          Lihat Hasil
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Hasil Quiz: {assignmentTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold text-primary">{bestSubmission?.score?.toFixed(0) || 0}%</p>
                  <p className="text-xs text-muted-foreground">Nilai Terbaik</p>
                </div>
                <div>
                  <FileQuestion className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{submissions?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Percobaan</p>
                </div>
                <div>
                  <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium">
                    {bestSubmission && format(new Date(bestSubmission.submitted_at), 'dd MMM yyyy', { locale: idLocale })}
                  </p>
                  <p className="text-xs text-muted-foreground">Terakhir Submit</p>
                </div>
                <div>
                  {canShowAnswers ? (
                    <>
                      <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                      <p className="text-sm font-medium">Tersedia</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                      <p className="text-sm font-medium">Tidak Tersedia</p>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">Pembahasan</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission History */}
          <div>
            <h3 className="font-semibold mb-3">Riwayat Percobaan</h3>
            <div className="flex flex-wrap gap-2">
              {submissions?.map((submission) => (
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

          {/* Selected Submission Details */}
          {selectedSubmission && (
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
                <ScrollArea className="h-[400px] pr-4">
                  {renderSubmissionDetails(selectedSubmission)}
                </ScrollArea>
              </div>
            </>
          )}

          {/* Auto-select first submission if none selected */}
          {!selectedSubmission && submissions && submissions.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Pilih percobaan di atas untuk melihat detail pembahasan.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
