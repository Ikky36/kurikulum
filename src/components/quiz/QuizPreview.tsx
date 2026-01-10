import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MatchingQuestion } from './MatchingQuestion';
import { ChevronLeft, ChevronRight, Check, X, Eye, RotateCcw, Play, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_code?: string | null;
  question_type: string;
  question_text: string;
  options?: any;
  correct_answer?: any;
  feedback?: string | null;
  points: number;
}

interface QuizPreviewProps {
  questions: Question[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'single' | 'all';
  initialQuestionIndex?: number;
}

export function QuizPreview({ questions, open, onOpenChange, mode, initialQuestionIndex = 0 }: QuizPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialQuestionIndex);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [allSubmitted, setAllSubmitted] = useState(false);

  const currentQuestion = questions[currentIndex];

  const parseOptions = (optionsStr?: string) => {
    if (!optionsStr) return [];
    try {
      const parsed = typeof optionsStr === 'string' ? JSON.parse(optionsStr) : optionsStr;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parseCorrectAnswer = (answerStr?: string) => {
    if (answerStr === undefined || answerStr === null) return null;
    try {
      return typeof answerStr === 'string' ? JSON.parse(answerStr) : answerStr;
    } catch {
      return answerStr;
    }
  };

  const checkAnswer = (question: Question, userAnswer: any) => {
    const correctAnswer = parseCorrectAnswer(question.correct_answer);
    const options = parseOptions(question.options);

    switch (question.question_type) {
      case 'multiple_choice':
      case 'select_missing_word':
        if (typeof correctAnswer === 'number') {
          return parseInt(userAnswer) === correctAnswer;
        }
        return userAnswer === correctAnswer;

      case 'true_false':
        if (typeof correctAnswer === 'number') {
          return parseInt(userAnswer) === correctAnswer;
        }
        return userAnswer?.toString() === correctAnswer?.toString();

      case 'short_answer':
        return userAnswer?.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();

      case 'multiple_answer':
        if (!Array.isArray(correctAnswer) || !Array.isArray(userAnswer)) return false;
        const sortedCorrect = [...correctAnswer].sort();
        const sortedUser = [...userAnswer].sort();
        return JSON.stringify(sortedCorrect) === JSON.stringify(sortedUser);

      case 'matching':
        if (!correctAnswer || !userAnswer) return false;
        // For matching, check if all pairs are correct
        let allCorrect = true;
        options.forEach((pair: any) => {
          if (userAnswer[pair.left] !== pair.right) {
            allCorrect = false;
          }
        });
        return allCorrect;

      default:
        return false;
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    // Reset result when answer changes
    setShowResults(prev => ({ ...prev, [questionId]: false }));
  };

  const handleCheckSingle = () => {
    if (currentQuestion) {
      setShowResults(prev => ({ ...prev, [currentQuestion.id]: true }));
    }
  };

  const handleCheckAll = () => {
    const newResults: Record<string, boolean> = {};
    questions.forEach(q => {
      newResults[q.id] = true;
    });
    setShowResults(newResults);
    setAllSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({});
    setShowResults({});
    setAllSubmitted(false);
    setCurrentIndex(0);
  };

  const getScoreStats = useMemo(() => {
    let correct = 0;
    let total = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach(q => {
      total++;
      totalPoints += q.points;
      if (showResults[q.id] && checkAnswer(q, answers[q.id])) {
        correct++;
        earnedPoints += q.points;
      }
    });

    return { correct, total, totalPoints, earnedPoints };
  }, [questions, answers, showResults]);

  const renderQuestionInput = (question: Question) => {
    const options = parseOptions(question.options);
    const userAnswer = answers[question.id];
    const isChecked = showResults[question.id];
    const isCorrect = isChecked && checkAnswer(question, userAnswer);
    const correctAnswer = parseCorrectAnswer(question.correct_answer);

    switch (question.question_type) {
      case 'multiple_choice':
      case 'select_missing_word':
        return (
          <RadioGroup
            value={userAnswer?.toString()}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            disabled={isChecked}
            className="space-y-2"
          >
            {options.map((opt: any, idx: number) => {
              const optText = typeof opt === 'object' ? opt.text : opt;
              const isThisCorrect = isChecked && idx === correctAnswer;
              const isThisSelected = userAnswer?.toString() === idx.toString();
              const isThisWrong = isChecked && isThisSelected && !isThisCorrect;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-all",
                    isThisCorrect && "border-green-500 bg-green-50 dark:bg-green-950",
                    isThisWrong && "border-red-500 bg-red-50 dark:bg-red-950",
                    !isChecked && isThisSelected && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem value={idx.toString()} id={`${question.id}-${idx}`} />
                  <Label htmlFor={`${question.id}-${idx}`} className="flex-1 cursor-pointer">
                    <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {optText}
                  </Label>
                  {isThisCorrect && <Check className="h-5 w-5 text-green-600" />}
                  {isThisWrong && <X className="h-5 w-5 text-red-600" />}
                </div>
              );
            })}
          </RadioGroup>
        );

      case 'true_false':
        return (
          <RadioGroup
            value={userAnswer?.toString()}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            disabled={isChecked}
            className="space-y-2"
          >
            {['Benar', 'Salah'].map((opt, idx) => {
              const isThisCorrect = isChecked && idx === correctAnswer;
              const isThisSelected = userAnswer?.toString() === idx.toString();
              const isThisWrong = isChecked && isThisSelected && !isThisCorrect;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-all",
                    isThisCorrect && "border-green-500 bg-green-50 dark:bg-green-950",
                    isThisWrong && "border-red-500 bg-red-50 dark:bg-red-950",
                    !isChecked && isThisSelected && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem value={idx.toString()} id={`${question.id}-tf-${idx}`} />
                  <Label htmlFor={`${question.id}-tf-${idx}`} className="flex-1 cursor-pointer">
                    {opt}
                  </Label>
                  {isThisCorrect && <Check className="h-5 w-5 text-green-600" />}
                  {isThisWrong && <X className="h-5 w-5 text-red-600" />}
                </div>
              );
            })}
          </RadioGroup>
        );

      case 'short_answer':
        return (
          <div className="space-y-2">
            <Input
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Ketik jawaban Anda..."
              disabled={isChecked}
              className={cn(
                isChecked && isCorrect && "border-green-500 bg-green-50",
                isChecked && !isCorrect && "border-red-500 bg-red-50"
              )}
            />
            {isChecked && !isCorrect && (
              <p className="text-sm text-green-600">Jawaban benar: {correctAnswer}</p>
            )}
          </div>
        );

      case 'essay':
        return (
          <Textarea
            value={userAnswer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Tulis jawaban essay Anda..."
            disabled={isChecked}
            className="min-h-[150px]"
          />
        );

      case 'multiple_answer':
        const selectedAnswers = userAnswer || [];
        return (
          <div className="space-y-2">
            {options.map((opt: any, idx: number) => {
              const optText = typeof opt === 'object' ? opt.text : opt;
              const isThisCorrect = isChecked && Array.isArray(correctAnswer) && correctAnswer.includes(idx);
              const isThisSelected = selectedAnswers.includes(idx);
              const isThisWrong = isChecked && isThisSelected && !isThisCorrect;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-all",
                    isThisCorrect && "border-green-500 bg-green-50 dark:bg-green-950",
                    isThisWrong && "border-red-500 bg-red-50 dark:bg-red-950",
                    !isChecked && isThisSelected && "border-primary bg-primary/5"
                  )}
                >
                  <Checkbox
                    id={`${question.id}-ma-${idx}`}
                    checked={isThisSelected}
                    onCheckedChange={(checked) => {
                      if (isChecked) return;
                      const newAnswers = checked
                        ? [...selectedAnswers, idx]
                        : selectedAnswers.filter((a: number) => a !== idx);
                      handleAnswerChange(question.id, newAnswers);
                    }}
                    disabled={isChecked}
                  />
                  <Label htmlFor={`${question.id}-ma-${idx}`} className="flex-1 cursor-pointer">
                    <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {optText}
                  </Label>
                  {isThisCorrect && <Check className="h-5 w-5 text-green-600" />}
                  {isThisWrong && <X className="h-5 w-5 text-red-600" />}
                </div>
              );
            })}
          </div>
        );

      case 'matching':
        const matchingOptions = {
          left: options.map((p: any) => p.left),
          right: options.map((p: any) => p.right),
        };
        return (
          <div className="space-y-4">
            <MatchingQuestion
              options={matchingOptions}
              value={userAnswer || {}}
              onChange={(value) => handleAnswerChange(question.id, value)}
            />
            {isChecked && (
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <p className="font-medium text-sm">Jawaban Benar:</p>
                {options.map((pair: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-background rounded">{pair.left}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded text-green-700 dark:text-green-300">
                      {pair.right}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-muted-foreground">Tipe soal tidak dikenali</p>;
    }
  };

  if (mode === 'single' && currentQuestion) {
    const isChecked = showResults[currentQuestion.id];
    const isCorrect = isChecked && checkAnswer(currentQuestion, answers[currentQuestion.id]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Soal - {currentIndex + 1}/{questions.length}
            </DialogTitle>
          </DialogHeader>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentQuestion.question_code && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {currentQuestion.question_code}
                    </Badge>
                  )}
                  <Badge variant="secondary">{currentQuestion.points} poin</Badge>
                </div>
                {isChecked && (
                  <Badge variant={isCorrect ? "default" : "destructive"}>
                    {isCorrect ? "Benar" : "Salah"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base font-medium leading-relaxed">{currentQuestion.question_text}</p>
              {renderQuestionInput(currentQuestion)}
              
              {isChecked && currentQuestion.feedback && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">💡 Feedback:</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">{currentQuestion.feedback}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter className="flex-wrap gap-2">
            <div className="flex items-center gap-2 mr-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {questions.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                disabled={currentIndex === questions.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {!isChecked ? (
              <Button onClick={handleCheckSingle}>
                <Check className="h-4 w-4 mr-2" />
                Cek Jawaban
              </Button>
            ) : (
              <Button variant="outline" onClick={() => {
                setAnswers(prev => ({ ...prev, [currentQuestion.id]: undefined }));
                setShowResults(prev => ({ ...prev, [currentQuestion.id]: false }));
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Mode: All questions
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Preview Semua Soal ({questions.length})
          </DialogTitle>
        </DialogHeader>

        {allSubmitted && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">Hasil Preview</p>
                  <p className="text-sm text-muted-foreground">
                    Benar: {getScoreStats.correct}/{getScoreStats.total} soal
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    {getScoreStats.earnedPoints}/{getScoreStats.totalPoints}
                  </p>
                  <p className="text-sm text-muted-foreground">poin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {questions.map((question, idx) => {
            const isChecked = showResults[question.id];
            const isCorrect = isChecked && checkAnswer(question, answers[question.id]);

            return (
              <Card key={question.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {idx + 1}
                      </span>
                      {question.question_code && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {question.question_code}
                        </Badge>
                      )}
                      <Badge variant="secondary">{question.points} poin</Badge>
                    </div>
                    {isChecked && (
                      <Badge variant={isCorrect ? "default" : "destructive"}>
                        {isCorrect ? "Benar" : "Salah"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base font-medium leading-relaxed">{question.question_text}</p>
                  {renderQuestionInput(question)}
                  
                  {isChecked && question.feedback && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">💡 Feedback:</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{question.feedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          {!allSubmitted ? (
            <Button onClick={handleCheckAll}>
              <Check className="h-4 w-4 mr-2" />
              Cek Semua Jawaban
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
