import { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  AlertTriangle, Clock, ChevronLeft, ChevronRight, CheckCircle, 
  Send, Shield, Eye, EyeOff, Lock, Maximize
} from 'lucide-react';
import { MatchingQuestion } from '@/components/quiz/MatchingQuestion';
import { containsArabic } from '@/components/ui/arabic-text';

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
  is_focus_mode: boolean;
  show_answer_mode: string | null;
  seb_password?: never;
  elearning_class_id: string;
}

interface GradingResult {
  total_points: number;
  earned_points: number;
  percentage: number;
  details: Array<{
    question_id: string;
    question: string;
    question_type: string;
    user_answer: any;
    correct_answer: any;
    is_correct: boolean;
    points: number;
    earned_points: number;
    feedback: string | null;
  }>;
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
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [focusConsent, setFocusConsent] = useState(false);
  const [showFocusWarning, setShowFocusWarning] = useState(false);
  const focusViolationRef = useRef(false);
  const quizStartedRef = useRef(false);
  const wakeLockRef = useRef<any>(null);
  const hideTimeRef = useRef<number | null>(null);


  const { data: assignment, isLoading: loadingAssignment } = useQuery({
    queryKey: ['quiz-assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_assignments')
        .select('id, title, description, time_limit_minutes, max_attempts, is_safe_exam_mode, is_focus_mode, show_answer_mode, elearning_class_id')
        .eq('id', assignmentId)
        .single();
      if (error) throw error;
      return data as Assignment;
    },
    enabled: !!assignmentId,
  });

  const navigateBackToClass = useCallback(() => {
    if (assignment?.elearning_class_id) {
      navigate('/e-learning', { state: { classId: assignment.elearning_class_id, tab: 'tugas' } });
    } else {
      navigate('/e-learning');
    }
  }, [assignment?.elearning_class_id, navigate]);


  const { data: questions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['quiz-questions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_quiz_questions_for_student', { p_assignment_id: assignmentId });
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
    if (document.hidden) {
      hideTimeRef.current = Date.now();
    }

    if (document.hidden && assignment?.is_safe_exam_mode) {
      setTabBlurCount(prev => prev + 1);
      setFocusModeWarnings(prev => prev + 1);
      toast.error('Peringatan: Anda meninggalkan halaman quiz!', {
        description: `Peringatan ke-${tabBlurCount + 1}. Terlalu banyak peringatan akan mengakhiri quiz.`,
      });
      
      if (tabBlurCount >= 2) {
        toast.error('Quiz dihentikan karena terlalu banyak peringatan!');
        handleAutoSubmit(true, 'Pelanggaran berulang: Meninggalkan halaman kuis (Mode Ujian)');
      }
    }

    // Focus Mode: 5s grace period logic
    if (assignment?.is_focus_mode && focusModeActive && !focusViolationRef.current && !showResults) {
      if (document.hidden) {
        hideTimeRef.current = Date.now();
      } else if (hideTimeRef.current) {
        const timeAway = Date.now() - hideTimeRef.current;
        hideTimeRef.current = null;

        if (timeAway > 5000) {
          focusViolationRef.current = true;
          handleAutoSubmit(true, `Meninggalkan halaman kuis lebih dari batas waktu (Tercatat keluar selama ${Math.round(timeAway / 1000)} detik)`);
        } else {
          setFocusModeWarnings(prev => {
            const next = prev + 1;
            if (next >= 2) {
              focusViolationRef.current = true;
              handleAutoSubmit(true, 'Pelanggaran berulang: 2 kali keluar dari halaman kuis meskipun sudah diperingatkan');
            } else {
              toast.error('Peringatan 1: Anda terdeteksi keluar dari kuis. Jangan ulangi lagi atau kuis akan langsung dihentikan.');
            }
            return next;
          });
        }
      }
    }
  }, [assignment?.is_safe_exam_mode, assignment?.is_focus_mode, tabBlurCount, focusModeActive, showResults]);

  // Focus Mode: fullscreen change detection
  const handleFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement && assignment?.is_focus_mode && focusModeActive && !focusViolationRef.current && !showResults) {
      setShowFocusWarning(true);
    }
  }, [assignment?.is_focus_mode, focusModeActive, showResults]);

  // Prevent context menu and keyboard shortcuts
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (assignment?.is_safe_exam_mode || (assignment?.is_focus_mode && focusModeActive)) {
      e.preventDefault();
    }
  }, [assignment?.is_safe_exam_mode, assignment?.is_focus_mode, focusModeActive]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isLocked = assignment?.is_safe_exam_mode || (assignment?.is_focus_mode && focusModeActive);
    if (isLocked) {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'p' || e.key === 'a')) ||
        (e.key === 'F12') ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        toast.warning('Fitur ini dinonaktifkan dalam mode ujian');
      }
      // Prevent Escape to exit fullscreen in focus mode
      if (e.key === 'Escape' && assignment?.is_focus_mode && focusModeActive) {
        e.preventDefault();
      }
    }
  }, [assignment?.is_safe_exam_mode, assignment?.is_focus_mode, focusModeActive]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((assignment?.is_focus_mode && focusModeActive) || assignment?.is_safe_exam_mode) {
        if (!showResults) {
          e.preventDefault();
          e.returnValue = '';
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleVisibilityChange, handleContextMenu, handleKeyDown, handleFullscreenChange, assignment?.is_focus_mode, assignment?.is_safe_exam_mode, focusModeActive, showResults]);

  // Focus Mode: enter fullscreen when quiz starts
  const enterFocusMode = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFocusModeActive(true);
      quizStartedRef.current = true;
      toast.success('Mode Fokus aktif. Jangan keluar fullscreen atau berpindah tab.');
      
      // Request Wake Lock
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error('Wake Lock request failed:', err);
        }
      }
    } catch {
      toast.error('Gagal mengaktifkan mode fullscreen. Pastikan browser mendukung fitur ini.');
    }
  }, []);

  // Focus Mode: exit fullscreen when quiz ends
  useEffect(() => {
    if (showResults) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setFocusModeActive(false);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
        wakeLockRef.current = null;
      }
    }
  }, [showResults]);

  // Focus Mode: auto-submit on violation confirmation
  const handleReturnToFocusMode = useCallback(async () => {
    setShowFocusWarning(false);
    await enterFocusMode();
  }, [enterFocusMode]);

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

  const handleAutoSubmit = async (isAuto = true, reason: string = 'Waktu habis! Quiz disubmit otomatis.') => {
    if (!focusViolationRef.current || reason.includes('Waktu habis')) {
      toast.warning(reason);
    } else {
      toast.error(`KUIS DIHENTIKAN OTOMATIS: ${reason}`);
    }
    await handleSubmit(isAuto, reason);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePasswordSubmit = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-seb-password', {
        body: { assignment_id: assignmentId, password: sebPassword },
      });
      if (error) throw error;
      if (data?.valid) {
        setIsAuthenticated(true);
        toast.success('Password benar! Quiz dimulai.');
      } else {
        toast.error('Password salah!');
      }
    } catch {
      toast.error('Gagal memverifikasi password.');
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (isAuto = false, violationReason = '') => {
    if (!profile?.id || !assignmentId) return;

    setIsSubmitting(true);
    try {
      // Use server-side grading for secure score calculation
      const { data: gradingData, error: gradingError } = await supabase
        .rpc('grade_quiz_submission', { 
          p_assignment_id: assignmentId, 
          p_answers: answers 
        });

      if (gradingError) throw gradingError;

      // Cast the result to the correct type
      const gradingResult = gradingData as unknown as GradingResult;

      const attemptNumber = (previousSubmissions?.length || 0) + 1;

      const finalAnswers = {
        ...answers,
        _is_auto_submitted: isAuto,
        _violation_reason: violationReason || null,
        _focus_mode_warnings: focusModeWarnings
      };

      const submissionData = {
        assignment_id: assignmentId,
        student_profile_id: profile.id,
        answers: JSON.stringify(finalAnswers),
        score: gradingResult.percentage,
        attempt_number: attemptNumber,
        submitted_at: new Date().toISOString(),
      };

      await submitQuiz.mutateAsync(submissionData);
      
      // Transform grading result for display
      const result = {
        score: gradingResult.earned_points,
        total: gradingResult.total_points,
        percentage: gradingResult.percentage,
        details: gradingResult.details,
      };
      
      setSubmissionResult(result);
      setShowResults(true);
      
      // Invalidate quiz questions to get correct answers now that student has submitted
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', assignmentId] });
      
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
            <Button variant="outline" onClick={() => navigateBackToClass()}>
              Kembali ke Kelas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Focus Mode: show entry screen to request fullscreen
  if (assignment?.is_focus_mode && !focusModeActive && !showResults && !quizStartedRef.current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Maximize className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle>Mode Fokus</CardTitle>
            <CardDescription>
              Quiz ini menggunakan Mode Fokus. Browser Anda akan masuk ke layar penuh (fullscreen).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Browser akan masuk mode fullscreen</li>
                  <li>Jangan keluar dari fullscreen (jangan tekan tombol <kbd className="px-1 py-0.5 text-xs border rounded">Esc</kbd>, <kbd className="px-1 py-0.5 text-xs border rounded">F11</kbd>, atau <kbd className="px-1 py-0.5 text-xs border rounded">Alt+Tab</kbd>)</li>
                  <li>Jangan berpindah tab, jendela, atau aplikasi lain</li>
                  <li>Jangan meminimalkan browser atau membuka notifikasi</li>
                  <li><strong className="text-destructive">Jika melanggar, quiz akan otomatis dikumpulkan dan tidak dapat diulang</strong></li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Pastikan Anda sudah siap mengerjakan quiz. Tutup semua aplikasi lain (chat, notifikasi, media sosial) sebelum melanjutkan agar tidak keluar dari mode fokus secara tidak sengaja.
              </AlertDescription>
            </Alert>

            <label className="flex items-start gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={focusConsent}
                onCheckedChange={(checked) => setFocusConsent(checked as boolean)}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed">
                Saya telah membaca dan memahami aturan Mode Fokus. Saya bersedia menerima konsekuensi quiz otomatis dikumpulkan jika saya keluar dari mode fokus, baik sengaja maupun tidak sengaja.
              </span>
            </label>

            <Button
              onClick={enterFocusMode}
              className="w-full gap-2"
              disabled={!focusConsent}
            >
              <Maximize className="h-4 w-4" />
              Mulai Quiz (Masuk Fullscreen)
            </Button>
            <Button variant="outline" onClick={() => navigateBackToClass()} className="w-full">
              Kembali
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
                  {submissionResult.details.map((detail: any, idx: number) => {
                    const formatAnswer = (val: any) => {
                      if (val === null || val === undefined) return '-';
                      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
                      try {
                        return JSON.stringify(val);
                      } catch {
                        return String(val);
                      }
                    };

                    const isCorrect = Boolean(detail?.is_correct);

                    return (
                      <Card key={idx} className={isCorrect ? 'border-green-500/50' : 'border-red-500/50'}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <Badge variant={isCorrect ? 'default' : 'destructive'}>
                              {idx + 1}
                            </Badge>
                            <div className="flex-1 space-y-2">
                              <p 
                                className={`font-medium bidi-content ${containsArabic(detail.question || '') ? 'font-arabic' : ''}`}
                                dir="auto"
                                style={containsArabic(detail.question || '') ? {
                                  fontFamily: "'Scheherazade New', 'Amiri', serif",
                                  fontSize: '1.3em',
                                  lineHeight: 2,
                                } : undefined}
                              >{detail.question}</p>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Jawaban Anda:</span>
                                  <p 
                                    className={`bidi-content ${isCorrect ? 'text-green-600' : 'text-red-600'} ${containsArabic(formatAnswer(detail.user_answer)) ? 'font-arabic' : ''}`}
                                    dir="auto"
                                    style={containsArabic(formatAnswer(detail.user_answer)) ? {
                                      fontFamily: "'Scheherazade New', 'Amiri', serif",
                                      fontSize: '1.2em',
                                      lineHeight: 1.8,
                                    } : undefined}
                                  >
                                    {formatAnswer(detail.user_answer)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Jawaban Benar:</span>
                                  <p 
                                    className={`text-green-600 bidi-content ${containsArabic(formatAnswer(detail.correct_answer)) ? 'font-arabic' : ''}`}
                                    dir="auto"
                                    style={containsArabic(formatAnswer(detail.correct_answer)) ? {
                                      fontFamily: "'Scheherazade New', 'Amiri', serif",
                                      fontSize: '1.2em',
                                      lineHeight: 1.8,
                                    } : undefined}
                                  >{formatAnswer(detail.correct_answer)}</p>
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
                    );
                  })}
                </div>
              )}

              <div className="flex justify-center mt-8">
                <Button onClick={() => navigateBackToClass()}>
                  Kembali ke Kelas
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
              {assignment?.is_focus_mode && focusModeActive && (
                <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  <Maximize className="h-3 w-3" />
                  Mode Fokus
                </Badge>
              )}
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
              <CardTitle 
                className={`text-xl mt-4 bidi-content ${containsArabic(currentQuestion.question_text) ? 'font-arabic' : ''}`}
                dir="auto"
                style={containsArabic(currentQuestion.question_text) ? {
                  fontFamily: "'Scheherazade New', 'Amiri', serif",
                  fontSize: '1.5rem',
                  lineHeight: 2,
                } : undefined}
              >{currentQuestion.question_text}</CardTitle>
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
              {(currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false' || currentQuestion.question_type === 'select_missing_word') && (
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
                      // Use stored options (e.g. Arabic) if present; fallback to Indonesian
                      if (!Array.isArray(options) || options.length < 2) {
                        options = ['Benar', 'Salah'];
                      }
                    }
                    return (options || []).map((option: string, idx: number) => {
                      const isArabicOption = containsArabic(option);
                      return (
                        <Label
                          key={idx}
                          className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted bidi-content ${
                            answers[currentQuestion.id] === option ? 'border-primary bg-primary/5' : ''
                          } ${isArabicOption ? 'font-arabic' : ''}`}
                          dir="auto"
                          style={isArabicOption ? {
                            fontFamily: "'Scheherazade New', 'Amiri', serif",
                            fontSize: '1.3em',
                            lineHeight: 2,
                          } : undefined}
                        >
                          <RadioGroupItem value={option} />
                          <span className="bidi-content" dir="auto">{option}</span>
                        </Label>
                      );
                    });
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

              {/* Long Answer */}
              {currentQuestion.question_type === 'long_answer' && (
                <div className="space-y-2">
                  <Textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Tuliskan jawaban panjang Anda di sini..."
                    className="min-h-[250px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    * Soal ini akan dinilai manual oleh dosen
                  </p>
                </div>
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

              {/* Matching - Drag and Drop */}
              {currentQuestion.question_type === 'matching' && (
                (() => {
                  let options = currentQuestion.options;
                  if (typeof options === 'string') {
                    try { options = JSON.parse(options); } catch { options = { left: [], right: [] }; }
                  }
                  
                  return (
                    <MatchingQuestion
                      options={options}
                      value={answers[currentQuestion.id] || {}}
                      onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    />
                  );
                })()
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

        {/* Question Number Navigation */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {questions?.map((q, idx) => (
                <Button
                  key={idx}
                  variant={currentQuestionIndex === idx ? 'default' : answers[q.id] ? 'secondary' : 'outline'}
                  size="sm"
                  className="w-full h-9 text-sm font-medium"
                  onClick={() => setCurrentQuestionIndex(idx)}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex-1 sm:flex-none"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Sebelumnya</span>
            <span className="sm:hidden">Prev</span>
          </Button>

          {currentQuestionIndex < (questions?.length || 0) - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min((questions?.length || 0) - 1, prev + 1))}
              className="flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="flex-1 sm:flex-none gap-2">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Submit
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

      {/* Focus Mode Violation Warning Dialog */}
      <AlertDialog open={showFocusWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Layar Penuh Tertutup
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda telah keluar dari mode layar penuh (fullscreen). Anda harus kembali ke layar penuh untuk melanjutkan kuis. Waktu kuis akan terus berjalan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleReturnToFocusMode}>
              <Maximize className="h-4 w-4 mr-2" />
              Kembali ke Mode Fokus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
