import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  AlertTriangle, Clock, ChevronLeft, ChevronRight, CheckCircle, 
  Send, Shield, Eye, EyeOff, Lock
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  question_type: string;
  question_text: string;
  options: any;
  correct_answer: any;
  feedback: string | null;
  points: number;
  order_index: number;
  question_image_url: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  is_safe_exam_mode: boolean;
  show_answer_mode: string | null;
  seb_password: string | null;
  elearning_class_id: string;
}

export default function QuizTaking() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [focusModeWarnings, setFocusModeWarnings] = useState(0);
  const [sebPassword, setSebPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tabBlurCount, setTabBlurCount] = useState(0);

  // Fetch assignment details
  const { data: assignment, isLoading: loadingAssignment } = useQuery({
    queryKey: ['quiz-assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();
      if (error) throw error;
      return data as Assignment;
    },
    enabled: !!assignmentId,
  });

  // Fetch questions
  const { data: questions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['quiz-questions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_quiz_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order_index');
      if (error) throw error;
      return data as QuizQuestion[];
    },
    enabled: !!assignmentId && (isAuthenticated || !assignment?.seb_password),
  });

  // Fetch previous submissions
  const { data: previousSubmissions } = useQuery({
    queryKey: ['quiz-submissions', assignmentId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_submissions')
        .select('*')
        .eq('assignment_id', assignmentId!)
        .eq('student_profile_id', profile!.id)
        .order('attempt_number', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId && !!profile?.id,
  });

  // Submit quiz mutation
  const submitQuiz = useMutation({
    mutationFn: async (submissionData: any) => {
      const { data, error } = await supabase
        .from('elearning_submissions')
        .insert(submissionData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions'] });
    },
  });

  // Focus mode detection - prevent tab switching
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && assignment?.is_safe_exam_mode) {
      setTabBlurCount(prev => prev + 1);
      setFocusModeWarnings(prev => prev + 1);
      toast.error('Peringatan: Anda meninggalkan halaman quiz!', {
        description: `Peringatan ke-${tabBlurCount + 1}. Terlalu banyak peringatan akan mengakhiri quiz.`,
      });
      
      if (tabBlurCount >= 2) {
        toast.error('Quiz dihentikan karena terlalu banyak peringatan!');
        handleAutoSubmit();
      }
    }
  }, [assignment?.is_safe_exam_mode, tabBlurCount]);

  // Prevent context menu and keyboard shortcuts
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (assignment?.is_safe_exam_mode) {
      e.preventDefault();
    }
  }, [assignment?.is_safe_exam_mode]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (assignment?.is_safe_exam_mode) {
      // Prevent common shortcuts
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'p' || e.key === 'a')) ||
        (e.key === 'F12') ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        toast.warning('Fitur ini dinonaktifkan dalam mode ujian');
      }
    }
  }, [assignment?.is_safe_exam_mode]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleVisibilityChange, handleContextMenu, handleKeyDown]);

  // Timer
  useEffect(() => {
    if (assignment?.time_limit_minutes && !showResults) {
      setTimeLeft(assignment.time_limit_minutes * 60);
    }
  }, [assignment?.time_limit_minutes, showResults]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResults]);

  const handleAutoSubmit = async () => {
    toast.warning('Waktu habis! Quiz akan disubmit otomatis.');
    await handleSubmit();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePasswordSubmit = () => {
    if (sebPassword === assignment?.seb_password) {
      setIsAuthenticated(true);
      toast.success('Password benar! Quiz dimulai.');
    } else {
      toast.error('Password salah!');
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateScore = () => {
    if (!questions) return { score: 0, total: 0, percentage: 0, details: [] };

    let totalScore = 0;
    let earnedScore = 0;
    const details: any[] = [];

    questions.forEach(q => {
      totalScore += q.points;
      const userAnswer = answers[q.id];
      let correctAnswer = q.correct_answer;

      // Parse correct answer if it's a string
      if (typeof correctAnswer === 'string') {
        try {
          correctAnswer = JSON.parse(correctAnswer);
        } catch {}
      }

      let isCorrect = false;

      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        isCorrect = userAnswer === correctAnswer || userAnswer === String(correctAnswer);
      } else if (q.question_type === 'short_answer') {
        isCorrect = userAnswer?.toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
      }

      if (isCorrect) {
        earnedScore += q.points;
      }

      details.push({
        question: q.question_text,
        userAnswer,
        correctAnswer,
        isCorrect,
        points: q.points,
        earnedPoints: isCorrect ? q.points : 0,
        feedback: q.feedback,
      });
    });

    return {
      score: earnedScore,
      total: totalScore,
      percentage: Math.round((earnedScore / totalScore) * 100),
      details,
    };
  };

  const handleSubmit = async () => {
    if (!profile?.id || !assignmentId) return;

    setIsSubmitting(true);
    try {
      const result = calculateScore();
      const attemptNumber = (previousSubmissions?.length || 0) + 1;

      const submissionData = {
        assignment_id: assignmentId,
        student_profile_id: profile.id,
        answers: JSON.stringify(answers),
        score: result.percentage,
        attempt_number: attemptNumber,
        submitted_at: new Date().toISOString(),
      };

      await submitQuiz.mutateAsync(submissionData);
      setSubmissionResult(result);
      setShowResults(true);
      toast.success('Quiz berhasil disubmit!');
    } catch (error: any) {
      toast.error(error.message || 'Gagal submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canTakeQuiz = () => {
    if (!assignment?.max_attempts) return true;
    return (previousSubmissions?.length || 0) < assignment.max_attempts;
  };

  if (loadingAssignment || loadingQuestions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Login Diperlukan</h2>
            <p className="text-muted-foreground mb-4">Silakan login untuk mengerjakan quiz ini.</p>
            <Button onClick={() => navigate('/auth')}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password protection for SEB mode
  if (assignment?.seb_password && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle>Quiz Dilindungi</CardTitle>
            <CardDescription>Masukkan password untuk mengakses quiz ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={sebPassword}
                onChange={(e) => setSebPassword(e.target.value)}
                placeholder="Masukkan password..."
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
            </div>
            <Button onClick={handlePasswordSubmit} className="w-full">
              Mulai Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canTakeQuiz()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Batas Percobaan Tercapai</h2>
            <p className="text-muted-foreground mb-4">
              Anda telah mencapai batas maksimal percobaan ({assignment?.max_attempts}x).
            </p>
            <Button variant="outline" onClick={() => navigate('/e-learning')}>
              Kembali ke E-Learning
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults && submissionResult) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center bg-gradient-to-r from-primary/10 to-transparent">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-primary" />
              <CardTitle className="text-2xl">Quiz Selesai!</CardTitle>
              <CardDescription>{assignment?.title}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-primary mb-2">
                  {submissionResult.percentage}%
                </div>
                <p className="text-muted-foreground">
                  Skor: {submissionResult.score} / {submissionResult.total} poin
                </p>
              </div>

              {/* Show answers based on show_answer_mode */}
              {(assignment?.show_answer_mode === 'after_quiz' || assignment?.show_answer_mode === 'after_each') && (
                <div className="space-y-4 mt-8">
                  <h3 className="font-semibold text-lg">Pembahasan</h3>
                  {submissionResult.details.map((detail: any, idx: number) => (
                    <Card key={idx} className={detail.isCorrect ? 'border-green-500/50' : 'border-red-500/50'}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Badge variant={detail.isCorrect ? 'default' : 'destructive'}>
                            {idx + 1}
                          </Badge>
                          <div className="flex-1 space-y-2">
                            <p className="font-medium">{detail.question}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Jawaban Anda:</span>
                                <p className={detail.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                  {String(detail.userAnswer || '-')}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Jawaban Benar:</span>
                                <p className="text-green-600">{String(detail.correctAnswer)}</p>
                              </div>
                            </div>
                            {detail.feedback && (
                              <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                💡 {detail.feedback}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-center mt-8">
                <Button onClick={() => navigate('/e-learning')}>
                  Kembali ke E-Learning
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions?.[currentQuestionIndex];
  const progress = questions ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-lg">{assignment?.title}</h1>
              <p className="text-sm text-muted-foreground">
                Soal {currentQuestionIndex + 1} dari {questions?.length || 0}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {assignment?.is_safe_exam_mode && (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Mode Ujian
                  {focusModeWarnings > 0 && (
                    <span className="text-destructive ml-1">({focusModeWarnings} peringatan)</span>
                  )}
                </Badge>
              )}
              {timeLeft !== null && (
                <Badge variant={timeLeft < 60 ? 'destructive' : 'outline'} className="gap-1 text-base px-3 py-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(timeLeft)}
                </Badge>
              )}
            </div>
          </div>
          <Progress value={progress} className="mt-2 h-2" />
        </div>
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {currentQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {currentQuestionIndex + 1}
                </Badge>
                <Badge variant="secondary">{currentQuestion.points} poin</Badge>
              </div>
              <CardTitle className="text-xl mt-4">{currentQuestion.question_text}</CardTitle>
              {currentQuestion.question_image_url && (
                <img 
                  src={currentQuestion.question_image_url} 
                  alt="Question" 
                  className="mt-4 max-w-full rounded-lg"
                />
              )}
            </CardHeader>
            <CardContent>
              {/* Multiple Choice / True False */}
              {(currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false') && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {(() => {
                    let options = currentQuestion.options;
                    if (typeof options === 'string') {
                      try { options = JSON.parse(options); } catch { options = []; }
                    }
                    if (currentQuestion.question_type === 'true_false') {
                      options = ['Benar', 'Salah'];
                    }
                    return (options || []).map((option: string, idx: number) => (
                      <Label
                        key={idx}
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted ${
                          answers[currentQuestion.id] === option ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <RadioGroupItem value={option} />
                        <span>{option}</span>
                      </Label>
                    ));
                  })()}
                </RadioGroup>
              )}

              {/* Short Answer */}
              {currentQuestion.question_type === 'short_answer' && (
                <Textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Ketik jawaban Anda di sini..."
                  className="min-h-[120px]"
                />
              )}

              {/* Essay */}
              {currentQuestion.question_type === 'essay' && (
                <Textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Tuliskan essay Anda di sini..."
                  className="min-h-[200px]"
                />
              )}

              {/* Multiple Answer (Checkbox) */}
              {currentQuestion.question_type === 'multiple_answer' && (
                <div className="space-y-3">
                  {(() => {
                    let options = currentQuestion.options;
                    if (typeof options === 'string') {
                      try { options = JSON.parse(options); } catch { options = []; }
                    }
                    const selectedAnswers: string[] = answers[currentQuestion.id] || [];
                    
                    const handleCheckboxChange = (option: string, checked: boolean) => {
                      let newAnswers = [...selectedAnswers];
                      if (checked) {
                        newAnswers.push(option);
                      } else {
                        newAnswers = newAnswers.filter(a => a !== option);
                      }
                      handleAnswerChange(currentQuestion.id, newAnswers);
                    };

                    return (options || []).map((option: string, idx: number) => (
                      <Label
                        key={idx}
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted ${
                          selectedAnswers.includes(option) ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <Checkbox
                          checked={selectedAnswers.includes(option)}
                          onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
                        />
                        <span>{option}</span>
                      </Label>
                    ));
                  })()}
                  <p className="text-sm text-muted-foreground mt-2">* Pilih semua jawaban yang benar</p>
                </div>
              )}

              {/* Matching */}
              {currentQuestion.question_type === 'matching' && (
                <div className="space-y-4">
                  {(() => {
                    let options = currentQuestion.options;
                    if (typeof options === 'string') {
                      try { options = JSON.parse(options); } catch { options = { left: [], right: [] }; }
                    }
                    
                    const leftItems = options?.left || options?.items || [];
                    const rightItems = options?.right || options?.matches || [];
                    const currentAnswers: Record<string, string> = answers[currentQuestion.id] || {};

                    const handleMatchChange = (leftItem: string, rightItem: string) => {
                      const newAnswers = { ...currentAnswers, [leftItem]: rightItem };
                      handleAnswerChange(currentQuestion.id, newAnswers);
                    };

                    // Get available right items (not yet matched)
                    const getAvailableRightItems = (currentLeft: string) => {
                      const usedRightItems = Object.entries(currentAnswers)
                        .filter(([left]) => left !== currentLeft)
                        .map(([, right]) => right);
                      return rightItems.filter((item: string) => !usedRightItems.includes(item));
                    };

                    return (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground mb-4">Cocokkan item di sebelah kiri dengan pasangannya:</p>
                        {leftItems.map((leftItem: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
                            <div className="flex-1 font-medium">{leftItem}</div>
                            <div className="w-8 text-center text-muted-foreground">→</div>
                            <div className="flex-1">
                              <Select
                                value={currentAnswers[leftItem] || ''}
                                onValueChange={(value) => handleMatchChange(leftItem, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih pasangan..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableRightItems(leftItem).map((rightItem: string, rIdx: number) => (
                                    <SelectItem key={rIdx} value={rightItem}>
                                      {rightItem}
                                    </SelectItem>
                                  ))}
                                  {currentAnswers[leftItem] && (
                                    <SelectItem value={currentAnswers[leftItem]}>
                                      {currentAnswers[leftItem]}
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Show feedback after each question if enabled */}
              {assignment?.show_answer_mode === 'after_each' && answers[currentQuestion.id] && (
                <Alert className="mt-4">
                  <AlertDescription>
                    Jawaban tersimpan. Lanjut ke soal berikutnya untuk melihat feedback.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Sebelumnya
          </Button>

          <div className="flex gap-2 flex-wrap justify-center">
            {questions?.map((_, idx) => (
              <Button
                key={idx}
                variant={currentQuestionIndex === idx ? 'default' : answers[questions[idx].id] ? 'secondary' : 'outline'}
                size="sm"
                className="w-10 h-10"
                onClick={() => setCurrentQuestionIndex(idx)}
              >
                {idx + 1}
              </Button>
            ))}
          </div>

          {currentQuestionIndex < (questions?.length || 0) - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min((questions?.length || 0) - 1, prev + 1))}
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Quiz
                </>
              )}
            </Button>
          )}
        </div>

        {/* Answer Summary */}
        <Card className="mt-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {Object.keys(answers).length} dari {questions?.length || 0} soal terjawab
              </span>
              <Progress 
                value={(Object.keys(answers).length / (questions?.length || 1)) * 100} 
                className="w-32 h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
