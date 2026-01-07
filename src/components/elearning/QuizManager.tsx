import { useState } from 'react';
import { useQuizQuestions, useBatchCreateQuestions, useDeleteQuizQuestion, useAIGeneration, useCourseLLOs } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Trash2, HelpCircle, ChevronDown, Upload, Shield, Sparkles, FileText, CheckCircle } from 'lucide-react';
import { QuizTemplateImport, type ParsedQuestion } from './QuizTemplateImport';
import { SEBConfigGenerator } from './SEBConfigGenerator';
import { AIContentGenerator } from './AIContentGenerator';

interface QuizManagerProps {
  assignmentId: string;
  courseId: string;
  assignmentTitle?: string;
  isSafeExamMode?: boolean;
  sebPassword?: string;
  sebQuitPassword?: string;
}

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda', color: 'bg-blue-100 text-blue-700' },
  { value: 'true_false', label: 'Benar/Salah', color: 'bg-green-100 text-green-700' },
  { value: 'short_answer', label: 'Jawaban Singkat', color: 'bg-purple-100 text-purple-700' },
  { value: 'matching', label: 'Menjodohkan', color: 'bg-orange-100 text-orange-700' },
  { value: 'select_missing_word', label: 'Pilih Kata yang Hilang', color: 'bg-pink-100 text-pink-700' },
];

export function QuizManager({ assignmentId, courseId, assignmentTitle = 'Quiz', isSafeExamMode, sebPassword, sebQuitPassword }: QuizManagerProps) {
  const { toast } = useToast();
  const { data: questions, isLoading } = useQuizQuestions(assignmentId);
  const { data: llos } = useCourseLLOs(courseId);
  const batchCreate = useBatchCreateQuestions();
  const deleteQuestion = useDeleteQuizQuestion();

  const [aiQuestionType, setAiQuestionType] = useState('multiple_choice');
  const [aiQuestionCount, setAiQuestionCount] = useState('5');
  const [selectedLloId, setSelectedLloId] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showSebConfig, setShowSebConfig] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const selectedLlo = (llos || []).find((l: any) => l.id === selectedLloId);

  const handleAIGenerated = async (content: string) => {
    try {
      let parsedQuestions;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        parsedQuestions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch {
        toast({ title: 'Error', description: 'Format response AI tidak valid', variant: 'destructive' });
        return;
      }

      const questionsToInsert = parsedQuestions.map((q: any, idx: number) => ({
        assignment_id: assignmentId,
        question_type: aiQuestionType,
        question_text: q.question_text,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: JSON.stringify(q.correct_answer),
        feedback: q.feedback || null,
        points: 10,
        order_index: (questions?.length || 0) + idx + 1,
      }));

      await batchCreate.mutateAsync(questionsToInsert);
      toast({ title: 'Sukses', description: `${parsedQuestions.length} soal berhasil di-generate` });
      setShowAI(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Gagal generate soal', variant: 'destructive' });
    }
  };

  const handleImportQuestions = async (parsedQuestions: ParsedQuestion[]) => {
    try {
      const questionsToInsert = parsedQuestions.map((q, idx) => ({
        assignment_id: assignmentId,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: JSON.stringify(q.correct_answer),
        feedback: q.feedback || null,
        points: q.points,
        order_index: (questions?.length || 0) + idx + 1,
      }));

      await batchCreate.mutateAsync(questionsToInsert);
      setShowImport(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal mengimport soal', variant: 'destructive' });
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteQuestion.mutateAsync(id);
      toast({ title: 'Sukses', description: 'Soal berhasil dihapus' });
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus soal', variant: 'destructive' });
    }
  };

  const getQuestionTypeInfo = (type: string) => {
    return QUESTION_TYPES.find(t => t.value === type) || QUESTION_TYPES[0];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const quizUrl = `${window.location.origin}/quiz/${assignmentId}`;

  return (
    <div className="space-y-6">
      {/* SEB Config Generator */}
      {isSafeExamMode && (
        <Collapsible open={showSebConfig} onOpenChange={setShowSebConfig}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-12 border-destructive/30">
              <span className="flex items-center gap-2 text-destructive">
                <Shield className="h-4 w-4" />
                Generate File .seb (Safe Exam Browser)
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showSebConfig ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <SEBConfigGenerator
              assignmentId={assignmentId}
              assignmentTitle={assignmentTitle}
              quizUrl={quizUrl}
              existingPassword={sebPassword}
              existingQuitPassword={sebQuitPassword}
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Import from Template */}
      <Collapsible open={showImport} onOpenChange={setShowImport}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-12">
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Soal dari File Excel
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showImport ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <QuizTemplateImport onImport={handleImportQuestions} />
        </CollapsibleContent>
      </Collapsible>

      {/* AI Generator */}
      <Collapsible open={showAI} onOpenChange={setShowAI}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-12 border-primary/30 hover:border-primary">
            <span className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              Generate Soal dengan AI
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAI ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardContent className="py-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sub-CPMK (Opsional)</Label>
                  <Select value={selectedLloId || "__none__"} onValueChange={(v) => setSelectedLloId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Pilih Sub-CPMK..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tidak ada</SelectItem>
                      {(llos || []).map((llo: any) => (
                        <SelectItem key={llo.id} value={llo.id}>
                          <span className="font-medium">{llo.code}</span> - {llo.description?.substring(0, 30)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipe Soal</Label>
                  <Select value={aiQuestionType} onValueChange={setAiQuestionType}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Jumlah Soal yang Ingin Di-generate</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="20" 
                  value={aiQuestionCount} 
                  onChange={(e) => setAiQuestionCount(e.target.value)}
                  className="h-11 max-w-[150px]"
                />
              </div>

              <AIContentGenerator
                type="quiz"
                onGenerated={handleAIGenerated}
                defaultTopic={selectedLlo ? `${selectedLlo.code}: ${selectedLlo.description}` : ''}
                indicators={selectedLlo?.indikator || []}
                questionType={aiQuestionType}
                questionCount={parseInt(aiQuestionCount)}
              />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Daftar Soal
          </h3>
          <Badge variant="secondary" className="text-base px-3 py-1">
            {questions?.length || 0} Soal
          </Badge>
        </div>
        
        {questions?.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="font-semibold mb-2">Belum Ada Soal</h4>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Generate soal dengan AI atau import dari file Excel untuk memulai.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {questions?.map((q: any, idx: number) => {
              const typeInfo = getQuestionTypeInfo(q.question_type);
              return (
                <Card key={q.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex flex-col items-center gap-1">
                          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {idx + 1}
                          </span>
                          <Badge className="text-xs">{q.points} pts</Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className={`text-xs ${typeInfo.color}`}>
                              {typeInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm leading-relaxed">{q.question_text}</p>
                          {q.feedback && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Feedback: {q.feedback}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => handleDeleteQuestion(q.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
