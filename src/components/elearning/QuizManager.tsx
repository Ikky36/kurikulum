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
import { Loader2, Wand2, Trash2, HelpCircle, ChevronDown, Upload, Download, Shield } from 'lucide-react';
import { QuizTemplateImport, type ParsedQuestion } from './QuizTemplateImport';
import { SEBConfigGenerator } from './SEBConfigGenerator';

interface QuizManagerProps {
  assignmentId: string;
  courseId: string;
  assignmentTitle?: string;
  isSafeExamMode?: boolean;
  sebPassword?: string;
  sebQuitPassword?: string;
}

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda' },
  { value: 'true_false', label: 'Benar/Salah' },
  { value: 'short_answer', label: 'Jawaban Singkat' },
  { value: 'matching', label: 'Menjodohkan' },
  { value: 'select_missing_word', label: 'Pilih Kata yang Hilang' },
];

export function QuizManager({ assignmentId, courseId, assignmentTitle = 'Quiz', isSafeExamMode, sebPassword, sebQuitPassword }: QuizManagerProps) {
  const { toast } = useToast();
  const { data: questions, isLoading } = useQuizQuestions(assignmentId);
  const { data: llos } = useCourseLLOs(courseId);
  const batchCreate = useBatchCreateQuestions();
  const deleteQuestion = useDeleteQuizQuestion();
  const generateAI = useAIGeneration();

  const [aiTopic, setAiTopic] = useState('');
  const [aiQuestionType, setAiQuestionType] = useState('multiple_choice');
  const [aiQuestionCount, setAiQuestionCount] = useState('5');
  const [selectedLloId, setSelectedLloId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSebConfig, setShowSebConfig] = useState(false);

  const selectedLlo = (llos || []).find((l: any) => l.id === selectedLloId);

  const handleGenerateWithAI = async () => {
    if (!aiTopic && !selectedLlo) {
      toast({ title: 'Error', description: 'Masukkan topik atau pilih Sub-CPMK', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateAI.mutateAsync({
        type: 'generate_quiz',
        topic: aiTopic || `${selectedLlo?.code}: ${selectedLlo?.description}`,
        indicators: selectedLlo?.indikator || [],
        questionType: aiQuestionType,
        questionCount: parseInt(aiQuestionCount),
      });

      if (result.content) {
        let parsedQuestions;
        try {
          const jsonMatch = result.content.match(/\[[\s\S]*\]/);
          parsedQuestions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);
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
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Gagal generate soal', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
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

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const quizUrl = `${window.location.origin}/quiz/${assignmentId}`;

  return (
    <div className="space-y-6">
      {/* SEB Config Generator */}
      {isSafeExamMode && (
        <Collapsible open={showSebConfig} onOpenChange={setShowSebConfig}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2"><Shield className="h-4 w-4" />Generate File .seb</span>
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
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2"><Upload className="h-4 w-4" />Import dari File</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showImport ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <QuizTemplateImport onImport={handleImportQuestions} />
        </CollapsibleContent>
      </Collapsible>

      {/* AI Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4" />
            Generate Soal dengan AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sub-CPMK</Label>
              <Select value={selectedLloId || "__none__"} onValueChange={(v) => setSelectedLloId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Pilih Sub-CPMK..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tidak ada</SelectItem>
                  {(llos || []).map((llo: any) => (
                    <SelectItem key={llo.id} value={llo.id}>{llo.code} - {llo.description?.substring(0, 30)}...</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipe Soal</Label>
              <Select value={aiQuestionType} onValueChange={setAiQuestionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Topik (opsional)</Label>
              <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Topik tambahan..." />
            </div>
            <div className="space-y-2">
              <Label>Jumlah Soal</Label>
              <Input type="number" min="1" max="20" value={aiQuestionCount} onChange={(e) => setAiQuestionCount(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleGenerateWithAI} disabled={isGenerating} className="w-full">
            {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Wand2 className="h-4 w-4 mr-2" />Generate Soal</>}
          </Button>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-3">
        <h3 className="font-semibold">Daftar Soal ({questions?.length || 0})</h3>
        {questions?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Belum ada soal. Generate dengan AI atau import dari file.
            </CardContent>
          </Card>
        ) : (
          questions?.map((q: any, idx: number) => (
            <Card key={q.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                      <Badge variant="secondary" className="text-xs">{QUESTION_TYPES.find(t => t.value === q.question_type)?.label}</Badge>
                      <Badge className="text-xs">{q.points} poin</Badge>
                    </div>
                    <p className="text-sm">{q.question_text}</p>
                    {q.feedback && <p className="text-xs text-muted-foreground mt-1">Feedback: {q.feedback}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
