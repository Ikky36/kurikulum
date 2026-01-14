import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuizQuestions, useCreateSubmission, useAssignmentSubmissions } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Trophy, ArrowRight, ArrowLeft, Send, RotateCcw, HelpCircle } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface MaterialQuizProps {
  assignmentId: string;
  assignmentTitle: string;
  onComplete?: (score: number) => void;
}

type QuestionOption = {
  id: string;
  text: string;
};

type QuizQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  options: Json | null;
  correct_answer: Json | null;
  points: number;
  order_index: number;
  feedback?: string | null;
};

export function MaterialQuiz({ assignmentId, assignmentTitle, onComplete }: MaterialQuizProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: questions, isLoading } = useQuizQuestions(assignmentId);
  const { data: submissions } = useAssignmentSubmissions(assignmentId);
  const createSubmission = useCreateSubmission();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const typedQuestions = (questions || []) as QuizQuestion[];
  const totalQuestions = typedQuestions.length;
  const currentQuestion = typedQuestions[currentQuestionIndex];

  // Check if user already submitted
  const userSubmission = useMemo(() => {
    if (!submissions || !profile) return null;
    return submissions.find(s => s.student_profile_id === profile.id);
  }, [submissions, profile]);

  const parseOptions = (options: Json | null): QuestionOption[] => {
    if (!options) return [];
    if (Array.isArray(options)) {
      return options.map((opt: any, idx) => ({
        id: opt.id || `opt-${idx}`,
        text: typeof opt === 'string' ? opt : opt.text || String(opt),
      }));
    }
    return [];
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleAnswerToggle = (questionId: string, optionId: string) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [questionId]: current.filter((id: string) => id !== optionId) };
      }
      return { ...prev, [questionId]: [...current, optionId] };
    });
  };

  const calculateScore = (): number => {
    let totalPoints = 0;
    let earnedPoints = 0;

    typedQuestions.forEach(question => {
      totalPoints += question.points;
      const userAnswer = answers[question.id];
      const correctAnswer = question.correct_answer;

      if (!correctAnswer || !userAnswer) return;

      if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
        if (userAnswer === correctAnswer) {
          earnedPoints += question.points;
        }
      } else if (question.question_type === 'multiple_answer') {
        const correctSet = new Set(Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]);
        const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer]);
        if (correctSet.size === userSet.size && [...correctSet].every(v => userSet.has(v))) {
          earnedPoints += question.points;
        }
      }
      // Essay questions need manual grading
    });

    return totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  };

  const handleSubmit = async () => {
    if (!profile) return;

    const calculatedScore = calculateScore();
    setScore(calculatedScore);
    setIsSubmitted(true);
    setShowResults(true);

    try {
      await createSubmission.mutateAsync({
        assignment_id: assignmentId,
        student_profile_id: profile.id,
        answers: answers as Json,
        score: calculatedScore,
        submitted_at: new Date().toISOString(),
      });
      toast({ title: 'Berhasil', description: 'Quiz berhasil dikumpulkan' });
      onComplete?.(calculatedScore);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan jawaban', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setShowResults(false);
    setScore(0);
  };

  const isCorrect = (questionId: string): boolean | null => {
    if (!isSubmitted) return null;
    const question = typedQuestions.find(q => q.id === questionId);
    if (!question) return null;
    
    const userAnswer = answers[questionId];
    const correctAnswer = question.correct_answer;
    
    if (!correctAnswer || !userAnswer) return false;
    
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
      return userAnswer === correctAnswer;
    }
    if (question.question_type === 'multiple_answer') {
      const correctSet = new Set(Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]);
      const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer]);
      return correctSet.size === userSet.size && [...correctSet].every(v => userSet.has(v));
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (typedQuestions.length === 0) {
    return (
      <Alert>
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>Belum Ada Soal</AlertTitle>
        <AlertDescription>Quiz ini belum memiliki soal.</AlertDescription>
      </Alert>
    );
  }

  // If user already submitted, show their previous results
  if (userSubmission && !showResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Quiz Sudah Dikerjakan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-primary mb-2">
              {userSubmission.score ?? 0}%
            </div>
            <p className="text-muted-foreground">
              Dikumpulkan pada {new Date(userSubmission.submitted_at).toLocaleDateString('id-ID')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show results after submission
  if (showResults) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Quiz Selesai!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-5xl font-bold text-primary">{score}%</div>
          <p className="text-muted-foreground">
            Anda menjawab dengan benar {Math.round(score * totalQuestions / 100)} dari {totalQuestions} soal
          </p>
          <Progress value={score} className="h-3" />
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Ulangi Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const options = parseOptions(currentQuestion.options);
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary">
            Soal {currentQuestionIndex + 1} dari {totalQuestions}
          </Badge>
          <Badge>{currentQuestion.points} poin</Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div 
          className="text-lg font-medium prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
        />

        {/* Multiple Choice */}
        {currentQuestion.question_type === 'multiple_choice' && (
          <RadioGroup
            value={answers[currentQuestion.id] || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          >
            <div className="space-y-3">
              {options.map((option) => (
                <div 
                  key={option.id} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                    answers[currentQuestion.id] === option.id 
                      ? 'bg-primary/5 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        )}

        {/* True/False */}
        {currentQuestion.question_type === 'true_false' && (
          <RadioGroup
            value={answers[currentQuestion.id] || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          >
            <div className="grid grid-cols-2 gap-4">
              {['true', 'false'].map((val) => (
                <div 
                  key={val}
                  className={`flex items-center justify-center p-4 rounded-lg border cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === val 
                      ? 'bg-primary/5 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleAnswerChange(currentQuestion.id, val)}
                >
                  <RadioGroupItem value={val} id={val} className="mr-2" />
                  <Label htmlFor={val} className="cursor-pointer font-medium">
                    {val === 'true' ? 'Benar' : 'Salah'}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        )}

        {/* Multiple Answer */}
        {currentQuestion.question_type === 'multiple_answer' && (
          <div className="space-y-3">
            {options.map((option) => {
              const selected = (answers[currentQuestion.id] || []).includes(option.id);
              return (
                <div 
                  key={option.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selected ? 'bg-primary/5 border-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => handleMultipleAnswerToggle(currentQuestion.id, option.id)}
                >
                  <Checkbox 
                    checked={selected}
                    onCheckedChange={() => handleMultipleAnswerToggle(currentQuestion.id, option.id)}
                  />
                  <Label className="flex-1 cursor-pointer">{option.text}</Label>
                </div>
              );
            })}
          </div>
        )}

        {/* Essay */}
        {currentQuestion.question_type === 'essay' && (
          <Textarea
            placeholder="Tulis jawaban Anda di sini..."
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            rows={6}
          />
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sebelumnya
        </Button>
        {currentQuestionIndex < totalQuestions - 1 ? (
          <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
            Selanjutnya
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={createSubmission.isPending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Kumpulkan Quiz
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
