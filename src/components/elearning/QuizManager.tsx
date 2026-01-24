import { useState } from 'react';
import { useQuizQuestions, useBatchCreateQuestions, useDeleteQuizQuestion, useUpdateQuizQuestion, useCourseLLOs } from '@/hooks/useElearningMaterials';
import { useQuestionBank, useAddToQuestionBank, useBatchAddToQuestionBank, QuestionBankItem } from '@/hooks/useQuestionBank';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Trash2, HelpCircle, ChevronDown, Upload, Shield, Sparkles, FileText, CheckCircle, Pencil, Eye, EyeOff, Save, X, Database, Plus, BookmarkPlus, Play, List, CheckSquare } from 'lucide-react';
import { QuizTemplateImport, type ParsedQuestion } from './QuizTemplateImport';
import { SEBConfigGenerator } from './SEBConfigGenerator';
import { AIContentGenerator } from './AIContentGenerator';
import { QuestionBankDialog } from './QuestionBankDialog';
import { QuizPreview } from '@/components/quiz/QuizPreview';
import { MatchingQuestionEditor } from '@/components/quiz/MatchingQuestionEditor';
import { BulkSelectProvider, useBulkSelect, BulkSelectCheckbox, BulkSelectAllCheckbox } from '@/components/ui/bulk-select-table';

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
  { value: 'long_answer', label: 'Jawaban Panjang', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'matching', label: 'Menjodohkan', color: 'bg-orange-100 text-orange-700' },
  { value: 'select_missing_word', label: 'Pilih Kata yang Hilang', color: 'bg-pink-100 text-pink-700' },
];

// Komponen untuk daftar soal dengan fitur bulk select
interface QuestionsListWithBulkProps {
  questions: any[] | undefined;
  showAnswers: boolean;
  setShowAnswers: (show: boolean) => void;
  setPreviewMode: (mode: 'single' | 'all') => void;
  setShowPreview: (show: boolean) => void;
  setPreviewQuestionIndex: (index: number) => void;
  getQuestionTypeInfo: (type: string) => { value: string; label: string; color: string };
  formatOptions: (question: any) => React.ReactNode;
  formatCorrectAnswer: (question: any) => string;
  handleSaveToBank: (question: any) => void;
  openEditDialog: (question: any) => void;
  handleDeleteQuestion: (id: string) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkSaveToBank: (ids: string[]) => Promise<void>;
}

function QuestionsListWithBulk({
  questions,
  showAnswers,
  setShowAnswers,
  setPreviewMode,
  setShowPreview,
  setPreviewQuestionIndex,
  getQuestionTypeInfo,
  formatOptions,
  formatCorrectAnswer,
  handleSaveToBank,
  openEditDialog,
  handleDeleteQuestion,
  onBulkDelete,
  onBulkSaveToBank,
}: QuestionsListWithBulkProps) {
  const { selectedIds, selectionCount, clearSelection, toggleAll, isAllSelected, isSomeSelected } = useBulkSelect();
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const questionIds = (questions || []).map((q: any) => q.id);

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      clearSelection();
      setIsBulkMode(false);
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleBulkSaveToBank = async () => {
    setIsBulkSaving(true);
    try {
      await onBulkSaveToBank(Array.from(selectedIds));
      clearSelection();
      setIsBulkMode(false);
    } finally {
      setIsBulkSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Daftar Soal
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {questions && questions.length > 0 && (
            <Button
              variant={isBulkMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                if (isBulkMode) clearSelection();
              }}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              {isBulkMode ? 'Batal Pilih' : 'Pilih Soal'}
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAnswers(!showAnswers)}
            className="gap-2"
          >
            {showAnswers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAnswers ? 'Sembunyikan' : 'Tampilkan'} Jawaban
          </Button>
          {questions && questions.length > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setPreviewMode('all');
                  setShowPreview(true);
                }}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                Preview Semua
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  setPreviewMode('single');
                  setPreviewQuestionIndex(0);
                  setShowPreview(true);
                }}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Coba Soal
              </Button>
            </>
          )}
          <Badge variant="secondary" className="text-base px-3 py-1">
            {questions?.length || 0} Soal
          </Badge>
        </div>
      </div>

      {/* Bulk Mode Header */}
      {isBulkMode && questions && questions.length > 0 && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isAllSelected(questionIds) ? true : isSomeSelected(questionIds) ? "indeterminate" : false}
                  onCheckedChange={() => toggleAll(questionIds)}
                />
                <span className="text-sm font-medium">
                  {selectionCount > 0 ? `${selectionCount} soal dipilih` : 'Pilih semua soal'}
                </span>
              </div>
              {selectionCount > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkSaveToBank}
                    disabled={isBulkSaving}
                    className="gap-2"
                  >
                    {isBulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
                    Simpan ke Bank Soal
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    disabled={isBulkDeleting}
                    className="gap-2"
                  >
                    {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Hapus
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {questions?.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-semibold mb-2">Belum Ada Soal</h4>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Tambahkan soal secara manual, dari bank soal, import dari Excel, atau generate dengan AI.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions?.map((q: any, idx: number) => {
            const typeInfo = getQuestionTypeInfo(q.question_type);
            const isSelected = selectedIds.has(q.id);
            return (
              <Card key={q.id} className={`group hover:shadow-md transition-shadow ${isBulkMode && isSelected ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {isBulkMode && (
                        <div className="pt-1">
                          <BulkSelectCheckbox id={q.id} />
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {idx + 1}
                        </span>
                        <Badge className="text-xs">{q.points} pts</Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {q.question_code && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {q.question_code}
                            </Badge>
                          )}
                          <Badge variant="secondary" className={`text-xs ${typeInfo.color}`}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed font-medium bidi-content" dir="auto">{q.question_text}</p>
                        
                        {/* Show options with correct answer highlighted */}
                        {showAnswers && formatOptions(q)}
                        
                        {/* Show correct answer for short answer type */}
                        {showAnswers && q.question_type === 'short_answer' && (
                          <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Jawaban Benar: </span>
                            <span className="text-sm text-green-700 dark:text-green-300">{formatCorrectAnswer(q)}</span>
                          </div>
                        )}
                        
                        {/* Show answer key for long_answer/essay type */}
                        {showAnswers && (q.question_type === 'long_answer' || q.question_type === 'essay') && (
                          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">📝 Kunci Jawaban (Manual Grading): </span>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{formatCorrectAnswer(q) || 'Tidak ada kunci jawaban'}</p>
                          </div>
                        )}
                        
                        {/* Feedback */}
                        {showAnswers && q.feedback && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">💡 Feedback:</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">{q.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {!isBulkMode && (
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Simpan ke Bank Soal"
                          className="opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={() => handleSaveToBank(q)}
                        >
                          <BookmarkPlus className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={() => openEditDialog(q)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={() => handleDeleteQuestion(q.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anda akan menghapus {selectionCount} soal. Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)} disabled={isBulkDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function QuizManager({ assignmentId, courseId, assignmentTitle = 'Quiz', isSafeExamMode, sebPassword, sebQuitPassword }: QuizManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: questions, isLoading } = useQuizQuestions(assignmentId);
  const { data: llos } = useCourseLLOs(courseId);
  const { data: bankQuestions = [] } = useQuestionBank(courseId);
  const batchCreate = useBatchCreateQuestions();
  const deleteQuestion = useDeleteQuizQuestion();
  const updateQuestion = useUpdateQuizQuestion();
  const addToBank = useAddToQuestionBank();
  const batchAddToBank = useBatchAddToQuestionBank();

  const [aiQuestionType, setAiQuestionType] = useState('multiple_choice');
  const [aiQuestionCount, setAiQuestionCount] = useState('5');
  const [selectedLloId, setSelectedLloId] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showSebConfig, setShowSebConfig] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'single' | 'all'>('all');
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  
  // Manual add state
  const [manualForm, setManualForm] = useState({
    question_code: '',
    question_type: 'multiple_choice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    feedback: '',
    points: 10,
    save_to_bank: false,
    matching_pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }] as { left: string; right: string }[],
  });
  
  // Edit state
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    question_code: '',
    question_text: '',
    options: [] as string[],
    correct_answer: '' as any,
    feedback: '',
    points: 10,
  });

  const selectedLlo = (llos || []).find((l: any) => l.id === selectedLloId);

  // Generate next question code
  const generateNextCode = () => {
    const existingCodes = [
      ...(questions || []).map((q: any) => q.question_code).filter(Boolean),
      ...bankQuestions.map(q => q.question_code),
    ];
    
    let maxNum = 0;
    existingCodes.forEach(code => {
      const match = code?.match(/Q(\d+)/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1]));
      }
    });
    
    return `Q${(maxNum + 1).toString().padStart(3, '0')}`;
  };

  const handleAIGenerated = async (content: string) => {
    try {
      let parsedQuestions;
      try {
        // Clean up potential markdown code blocks
        let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
        parsedQuestions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Parse error:', parseError, 'Content:', content);
        toast({ title: 'Error', description: 'Format response AI tidak valid', variant: 'destructive' });
        return;
      }

      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        toast({ title: 'Error', description: 'Tidak ada soal yang di-generate', variant: 'destructive' });
        return;
      }

      const startCode = generateNextCode();
      const startNum = parseInt(startCode.match(/\d+/)?.[0] || '1');

      const questionsToInsert = parsedQuestions.map((q: any, idx: number) => {
        // Normalize options format
        let normalizedOptions = null;
        if (q.options) {
          if (Array.isArray(q.options) && q.options.length > 0) {
            if (typeof q.options[0] === 'object' && q.options[0].text) {
              normalizedOptions = q.options.map((opt: any) => 
                typeof opt === 'object' ? opt.text : opt
              );
            } else if (typeof q.options[0] === 'object' && q.options[0].left) {
              // Matching type - keep as is
              normalizedOptions = q.options;
            } else {
              normalizedOptions = q.options;
            }
          }
        }

        const questionCode = `Q${(startNum + idx).toString().padStart(3, '0')}`;

        return {
          assignment_id: assignmentId,
          question_code: questionCode,
          question_type: q.question_type || aiQuestionType,
          question_text: q.question_text,
          options: normalizedOptions ? JSON.stringify(normalizedOptions) : null,
          correct_answer: JSON.stringify(q.correct_answer),
          feedback: q.feedback || q.explanation || null,
          points: q.points || 10,
          order_index: (questions?.length || 0) + idx + 1,
        };
      });

      await batchCreate.mutateAsync(questionsToInsert);
      toast({ title: 'Sukses', description: `${parsedQuestions.length} soal berhasil di-generate` });
      setShowAI(false);
    } catch (error: any) {
      console.error('Generate error:', error);
      toast({ title: 'Error', description: error?.message || 'Gagal generate soal', variant: 'destructive' });
    }
  };

  const handleImportQuestions = async (parsedQuestions: ParsedQuestion[]) => {
    try {
      const startCode = generateNextCode();
      const startNum = parseInt(startCode.match(/\d+/)?.[0] || '1');

      const questionsToInsert = parsedQuestions.map((q, idx) => ({
        assignment_id: assignmentId,
        question_code: `Q${(startNum + idx).toString().padStart(3, '0')}`,
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

  const handleAddFromBank = async (selectedQuestions: QuestionBankItem[]) => {
    try {
      const questionsToInsert = selectedQuestions.map((q, idx) => ({
        assignment_id: assignmentId,
        question_code: q.question_code,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer ? JSON.stringify(q.correct_answer) : null,
        feedback: q.feedback || null,
        points: q.points,
        order_index: (questions?.length || 0) + idx + 1,
      }));

      await batchCreate.mutateAsync(questionsToInsert);
      toast({ title: 'Sukses', description: `${selectedQuestions.length} soal berhasil ditambahkan dari bank soal` });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menambahkan soal dari bank soal', variant: 'destructive' });
    }
  };

  const handleManualAdd = async () => {
    if (!manualForm.question_text.trim()) {
      toast({ title: 'Error', description: 'Pertanyaan tidak boleh kosong', variant: 'destructive' });
      return;
    }

    const questionCode = manualForm.question_code || generateNextCode();

    try {
      // Handle matching type differently
      let optionsToSave = null;
      let correctAnswerToSave = null;

      if (manualForm.question_type === 'matching') {
        const validPairs = manualForm.matching_pairs.filter(p => p.left.trim() && p.right.trim());
        if (validPairs.length < 2) {
          toast({ title: 'Error', description: 'Minimal 2 pasangan yang valid untuk soal menjodohkan', variant: 'destructive' });
          return;
        }
        optionsToSave = JSON.stringify(validPairs);
        // For matching, correct_answer is the mapping
        const correctMapping: Record<string, string> = {};
        validPairs.forEach(p => { correctMapping[p.left] = p.right; });
        correctAnswerToSave = JSON.stringify(correctMapping);
      } else if (manualForm.question_type === 'short_answer') {
        correctAnswerToSave = JSON.stringify(manualForm.options[0]);
      } else if (manualForm.question_type === 'long_answer' || manualForm.question_type === 'essay') {
        // Long answer/essay: store the expected answer as text (for reference, not auto-graded)
        correctAnswerToSave = manualForm.options[0]?.trim() ? JSON.stringify(manualForm.options[0]) : null;
        optionsToSave = null;
      } else {
        optionsToSave = manualForm.options.filter(o => o.trim()).length > 0 
          ? JSON.stringify(manualForm.options.filter(o => o.trim())) 
          : null;
        correctAnswerToSave = JSON.stringify(manualForm.correct_answer);
      }

      // Add to quiz
      await batchCreate.mutateAsync([{
        assignment_id: assignmentId,
        question_code: questionCode,
        question_type: manualForm.question_type,
        question_text: manualForm.question_text,
        options: optionsToSave,
        correct_answer: correctAnswerToSave,
        feedback: manualForm.feedback || null,
        points: manualForm.points,
        order_index: (questions?.length || 0) + 1,
      }]);

      // Also save to bank if requested
      if (manualForm.save_to_bank && user) {
        await addToBank.mutateAsync({
          course_id: courseId,
          instructor_profile_id: user.id,
          question_code: questionCode,
          question_type: manualForm.question_type,
          question_text: manualForm.question_text,
          options: manualForm.question_type === 'matching' 
            ? manualForm.matching_pairs.filter(p => p.left.trim() && p.right.trim())
            : (manualForm.options.filter(o => o.trim()).length > 0 
              ? manualForm.options.filter(o => o.trim()) 
              : null),
          correct_answer: manualForm.question_type === 'short_answer' 
            ? manualForm.options[0] 
            : manualForm.correct_answer,
          feedback: manualForm.feedback || null,
          points: manualForm.points,
        });
      }

      toast({ title: 'Sukses', description: 'Soal berhasil ditambahkan' });
      setShowManualAdd(false);
      setManualForm({
        question_code: '',
        question_type: 'multiple_choice',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        feedback: '',
        points: 10,
        save_to_bank: false,
        matching_pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }],
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menambahkan soal', variant: 'destructive' });
    }
  };

  const handleSaveToBank = async (question: any) => {
    if (!user) return;

    try {
      const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      const correctAnswer = typeof question.correct_answer === 'string' ? JSON.parse(question.correct_answer) : question.correct_answer;

      await addToBank.mutateAsync({
        course_id: courseId,
        instructor_profile_id: user.id,
        question_code: question.question_code || generateNextCode(),
        question_type: question.question_type,
        question_text: question.question_text,
        options: options,
        correct_answer: correctAnswer,
        feedback: question.feedback || null,
        points: question.points,
      });

      toast({ title: 'Sukses', description: 'Soal berhasil disimpan ke bank soal' });
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast({ title: 'Info', description: 'Soal dengan kode ini sudah ada di bank soal', variant: 'default' });
      } else {
        toast({ title: 'Error', description: 'Gagal menyimpan ke bank soal', variant: 'destructive' });
      }
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

  const openEditDialog = (question: any) => {
    let options: string[] = [];
    try {
      const parsed = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      if (Array.isArray(parsed)) {
        options = parsed.map((o: any) => typeof o === 'object' ? o.text || o.left : o);
      }
    } catch {}

    let correctAnswer = question.correct_answer;
    try {
      correctAnswer = typeof question.correct_answer === 'string' ? JSON.parse(question.correct_answer) : question.correct_answer;
    } catch {}

    setEditForm({
      question_code: question.question_code || '',
      question_text: question.question_text,
      options,
      correct_answer: correctAnswer,
      feedback: question.feedback || '',
      points: question.points,
    });
    setEditingQuestion(question);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;

    try {
      await updateQuestion.mutateAsync({
        id: editingQuestion.id,
        question_code: editForm.question_code || null,
        question_text: editForm.question_text,
        options: editForm.options.length > 0 ? JSON.stringify(editForm.options) : null,
        correct_answer: JSON.stringify(editForm.correct_answer),
        feedback: editForm.feedback,
        points: editForm.points,
      });
      toast({ title: 'Sukses', description: 'Soal berhasil diperbarui' });
      setEditingQuestion(null);
    } catch {
      toast({ title: 'Error', description: 'Gagal memperbarui soal', variant: 'destructive' });
    }
  };

  const getQuestionTypeInfo = (type: string) => {
    return QUESTION_TYPES.find(t => t.value === type) || QUESTION_TYPES[0];
  };

  const formatCorrectAnswer = (question: any) => {
    try {
      const answer = typeof question.correct_answer === 'string' ? JSON.parse(question.correct_answer) : question.correct_answer;
      const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;

      if (question.question_type === 'multiple_choice' || question.question_type === 'select_missing_word') {
        if (typeof answer === 'number' && Array.isArray(options)) {
          return options[answer] || answer;
        }
        return answer;
      }
      if (question.question_type === 'true_false') {
        if (typeof answer === 'number') {
          return answer === 0 ? 'Benar' : 'Salah';
        }
        return answer === true || answer === 'true' ? 'Benar' : 'Salah';
      }
      if (question.question_type === 'matching') {
        return 'Lihat pasangan';
      }
      return String(answer);
    } catch {
      return String(question.correct_answer);
    }
  };

  const formatOptions = (question: any) => {
    try {
      const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      const answer = typeof question.correct_answer === 'string' ? JSON.parse(question.correct_answer) : question.correct_answer;

      if (!Array.isArray(options)) return null;

      if (question.question_type === 'matching') {
        return (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {options.map((pair: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-muted rounded">{pair.left}</span>
                <span className="text-muted-foreground">↔</span>
                <span className="px-2 py-1 bg-primary/10 rounded">{pair.right}</span>
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {options.map((opt: any, idx: number) => {
            const optText = typeof opt === 'object' ? opt.text : opt;
            const isCorrect = typeof answer === 'number' ? idx === answer : optText === answer;
            return (
              <div 
                key={idx} 
                className={`text-sm px-3 py-2 rounded-lg border ${
                  isCorrect 
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' 
                    : 'border-border bg-muted/50'
                }`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                {optText}
                {isCorrect && <CheckCircle className="inline h-4 w-4 ml-2" />}
              </div>
            );
          })}
        </div>
      );
    } catch {
      return null;
    }
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

      {/* Action Buttons Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button variant="outline" className="h-12" onClick={() => setShowManualAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Manual
        </Button>
        <Button variant="outline" className="h-12" onClick={() => setShowQuestionBank(true)}>
          <Database className="h-4 w-4 mr-2" />
          Bank Soal
        </Button>
        <Button variant="outline" className="h-12" onClick={() => setShowImport(!showImport)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Excel
        </Button>
        <Button variant="outline" className="h-12 border-primary/30 text-primary" onClick={() => setShowAI(!showAI)}>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate AI
        </Button>
      </div>

      {/* Import from Template */}
      <Collapsible open={showImport} onOpenChange={setShowImport}>
        <CollapsibleContent>
          <QuizTemplateImport onImport={handleImportQuestions} />
        </CollapsibleContent>
      </Collapsible>

      {/* AI Generator */}
      <Collapsible open={showAI} onOpenChange={setShowAI}>
        <CollapsibleContent>
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

      {/* Questions List with Bulk Select */}
      <BulkSelectProvider>
        <QuestionsListWithBulk
          questions={questions}
          showAnswers={showAnswers}
          setShowAnswers={setShowAnswers}
          setPreviewMode={setPreviewMode}
          setShowPreview={setShowPreview}
          setPreviewQuestionIndex={setPreviewQuestionIndex}
          getQuestionTypeInfo={getQuestionTypeInfo}
          formatOptions={formatOptions}
          formatCorrectAnswer={formatCorrectAnswer}
          handleSaveToBank={handleSaveToBank}
          openEditDialog={openEditDialog}
          handleDeleteQuestion={handleDeleteQuestion}
          onBulkDelete={async (ids: string[]) => {
            for (const id of ids) {
              await deleteQuestion.mutateAsync(id);
            }
            toast({ title: 'Sukses', description: `${ids.length} soal berhasil dihapus` });
          }}
          onBulkSaveToBank={async (ids: string[]) => {
            if (!user) return;
            const selectedQuestions = (questions || []).filter((q: any) => ids.includes(q.id));
            const questionsToAdd = selectedQuestions.map((q: any) => {
              const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
              const correctAnswer = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer;
              return {
                course_id: courseId,
                instructor_profile_id: user.id,
                question_code: q.question_code || generateNextCode(),
                question_type: q.question_type,
                question_text: q.question_text,
                options: options,
                correct_answer: correctAnswer,
                feedback: q.feedback || null,
                points: q.points,
              };
            });
            await batchAddToBank.mutateAsync(questionsToAdd);
            toast({ title: 'Sukses', description: `${ids.length} soal berhasil disimpan ke bank soal` });
          }}
        />
      </BulkSelectProvider>

      {/* Question Bank Dialog */}
      <QuestionBankDialog
        open={showQuestionBank}
        onOpenChange={setShowQuestionBank}
        courseId={courseId}
        onSelectQuestions={handleAddFromBank}
      />

      {/* Manual Add Dialog */}
      <Dialog open={showManualAdd} onOpenChange={setShowManualAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Soal Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Soal</Label>
                <Input
                  value={manualForm.question_code}
                  onChange={(e) => setManualForm({ ...manualForm, question_code: e.target.value })}
                  placeholder={generateNextCode()}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Kosongkan untuk auto-generate</p>
              </div>
              <div className="space-y-2">
                <Label>Tipe Soal</Label>
                <Select value={manualForm.question_type} onValueChange={(v) => setManualForm({ ...manualForm, question_type: v })}>
                  <SelectTrigger>
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
              <Label>Pertanyaan</Label>
              <Textarea
                value={manualForm.question_text}
                onChange={(e) => setManualForm({ ...manualForm, question_text: e.target.value })}
                placeholder="Tulis pertanyaan di sini..."
                className="min-h-[100px]"
              />
            </div>

            {manualForm.question_type === 'short_answer' ? (
              <div className="space-y-2">
                <Label>Jawaban Benar</Label>
                <Input
                  value={manualForm.options[0]}
                  onChange={(e) => setManualForm({ ...manualForm, options: [e.target.value, '', '', ''] })}
                  placeholder="Masukkan jawaban yang benar..."
                />
              </div>
            ) : manualForm.question_type === 'true_false' ? (
              <div className="space-y-2">
                <Label>Jawaban Benar</Label>
                <Select 
                  value={manualForm.correct_answer.toString()} 
                  onValueChange={(v) => setManualForm({ ...manualForm, correct_answer: parseInt(v), options: ['Benar', 'Salah', '', ''] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Benar</SelectItem>
                    <SelectItem value="1">Salah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : manualForm.question_type === 'matching' ? (
              <MatchingQuestionEditor
                pairs={manualForm.matching_pairs}
                onChange={(pairs) => setManualForm({ ...manualForm, matching_pairs: pairs })}
              />
            ) : manualForm.question_type === 'long_answer' || manualForm.question_type === 'essay' ? (
              <div className="space-y-2">
                <Label>Kunci Jawaban / Poin-poin Penting (Opsional)</Label>
                <Textarea
                  value={manualForm.options[0] || ''}
                  onChange={(e) => {
                    const newOptions = [...manualForm.options];
                    newOptions[0] = e.target.value;
                    setManualForm({ ...manualForm, options: newOptions });
                  }}
                  placeholder="Tuliskan kunci jawaban atau poin-poin penting yang diharapkan dalam jawaban mahasiswa..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  ⚠️ Soal tipe ini akan dinilai manual oleh dosen dan tidak dihitung dalam skor otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Pilihan Jawaban</Label>
                {manualForm.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 font-medium">{String.fromCharCode(65 + idx)}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...manualForm.options];
                        newOptions[idx] = e.target.value;
                        setManualForm({ ...manualForm, options: newOptions });
                      }}
                      placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`}
                      className="flex-1"
                    />
                    <input
                      type="radio"
                      name="manual_correct"
                      checked={manualForm.correct_answer === idx}
                      onChange={() => setManualForm({ ...manualForm, correct_answer: idx })}
                      className="w-4 h-4"
                    />
                    <span className="text-xs text-muted-foreground w-12">Benar</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Feedback / Penjelasan (Opsional)</Label>
              <Textarea
                value={manualForm.feedback}
                onChange={(e) => setManualForm({ ...manualForm, feedback: e.target.value })}
                placeholder="Jelaskan mengapa jawaban tersebut benar..."
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label>Poin</Label>
                <Input
                  type="number"
                  min="1"
                  value={manualForm.points}
                  onChange={(e) => setManualForm({ ...manualForm, points: parseInt(e.target.value) || 10 })}
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="save_to_bank"
                  checked={manualForm.save_to_bank}
                  onChange={(e) => setManualForm({ ...manualForm, save_to_bank: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="save_to_bank" className="cursor-pointer">Simpan juga ke Bank Soal</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowManualAdd(false)}>
              <X className="h-4 w-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleManualAdd} disabled={batchCreate.isPending}>
              {batchCreate.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Tambah Soal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Soal</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Kode Soal</Label>
                <Input
                  value={editForm.question_code}
                  onChange={(e) => setEditForm({ ...editForm, question_code: e.target.value })}
                  placeholder="Q001"
                  className="font-mono max-w-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Pertanyaan</Label>
                <Textarea
                  value={editForm.question_text}
                  onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>

              {(editingQuestion.question_type === 'multiple_choice' || 
                editingQuestion.question_type === 'true_false' ||
                editingQuestion.question_type === 'select_missing_word') && (
                <div className="space-y-2">
                  <Label>Pilihan Jawaban</Label>
                  {editForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 font-medium">{String.fromCharCode(65 + idx)}.</span>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...editForm.options];
                          newOptions[idx] = e.target.value;
                          setEditForm({ ...editForm, options: newOptions });
                        }}
                        className="flex-1"
                      />
                      <input
                        type="radio"
                        name="correct"
                        checked={editForm.correct_answer === idx}
                        onChange={() => setEditForm({ ...editForm, correct_answer: idx })}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-muted-foreground">Benar</span>
                    </div>
                  ))}
                </div>
              )}

              {editingQuestion.question_type === 'short_answer' && (
                <div className="space-y-2">
                  <Label>Jawaban Benar</Label>
                  <Input
                    value={typeof editForm.correct_answer === 'string' ? editForm.correct_answer : ''}
                    onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Feedback / Penjelasan</Label>
                <Textarea
                  value={editForm.feedback}
                  onChange={(e) => setEditForm({ ...editForm, feedback: e.target.value })}
                  placeholder="Jelaskan mengapa jawaban tersebut benar..."
                />
              </div>

              <div className="space-y-2">
                <Label>Poin</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.points}
                  onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 10 })}
                  className="w-24"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              <X className="h-4 w-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateQuestion.isPending}>
              {updateQuestion.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Preview */}
      {questions && questions.length > 0 && (
        <QuizPreview
          questions={questions}
          open={showPreview}
          onOpenChange={setShowPreview}
          mode={previewMode}
          initialQuestionIndex={previewQuestionIndex}
        />
      )}
    </div>
  );
}
