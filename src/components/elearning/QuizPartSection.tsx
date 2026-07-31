import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Database, Sparkles, BookOpen, Trash2, Pencil, CheckSquare, EyeOff, Eye, List, Play, BookmarkPlus, Loader2, HelpCircle, FileText, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BulkSelectProvider, useBulkSelect, BulkSelectCheckbox } from "@/components/ui/bulk-select-table";
import { PointsDistributor } from "./PointsDistributor";

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



export interface QuizPartSectionProps {
  part: any;
  questions: any[];
  onAddRequest: (partId: string, type: string) => void;
  onUpdatePartName: (partId: string, name: string) => void;
  onUpdatePartPoints: (partId: string, points: number) => void;
  onDeletePart: (partId: string) => void;
  isUpdatingPart: boolean;
  
  // Passthrough for QuestionsListWithBulk
  showAnswers: boolean;
  setShowAnswers: (show: boolean) => void;
  setPreviewMode: (mode: "single" | "all") => void;
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
  onBatchUpdatePoints: (questionIds: string[], points: number) => Promise<void>;
  isBatchUpdatingPoints: boolean;
}

export function QuizPartSection(props: QuizPartSectionProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(props.part.name);
  
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [editPoints, setEditPoints] = useState(props.part.total_points || 0);

  return (
    <Card className="mb-8 border-primary/20 shadow-sm">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="max-w-[250px] font-semibold"
                />
                <Button size="sm" onClick={() => {
                  props.onUpdatePartName(props.part.id, editName);
                  setIsEditingName(false);
                }} disabled={props.isUpdatingPart}>Simpan</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditName(props.part.name);
                  setIsEditingName(false);
                }}>Batal</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{props.part.name}</h3>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditingName(true)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total Poin Bagian:</span>
            {isEditingPoints ? (
              <div className="flex items-center gap-2">
                <Input 
                  type="number"
                  value={editPoints} 
                  onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <Button size="sm" onClick={() => {
                  props.onUpdatePartPoints(props.part.id, editPoints);
                  setIsEditingPoints(false);
                }} disabled={props.isUpdatingPart}>Simpan</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditPoints(props.part.total_points || 0);
                  setIsEditingPoints(false);
                }}>Batal</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-base">{props.part.total_points || 0}</Badge>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditingPoints(true)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <Button size="icon" variant="destructive" className="h-8 w-8 ml-2" onClick={() => props.onDeletePart(props.part.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Button variant="outline" className="h-10 text-sm" onClick={() => props.onAddRequest(props.part.id, "manual")}>
            <Plus className="h-4 w-4 mr-2" /> Manual
          </Button>
          <Button variant="outline" className="h-10 text-sm" onClick={() => props.onAddRequest(props.part.id, "bank")}>
            <Database className="h-4 w-4 mr-2" /> Bank Soal
          </Button>
          <Button variant="outline" className="h-10 text-sm" onClick={() => props.onAddRequest(props.part.id, "import")}>
            <Upload className="h-4 w-4 mr-2" /> Import
          </Button>
          <Button variant="outline" className="h-10 text-sm border-primary/30 text-primary" onClick={() => props.onAddRequest(props.part.id, "ai")}>
            <Sparkles className="h-4 w-4 mr-2" /> AI
          </Button>
          <Button variant="outline" className="h-10 text-sm border-secondary/50 text-secondary-foreground" onClick={() => props.onAddRequest(props.part.id, "material")}>
            <BookOpen className="h-4 w-4 mr-2" /> Materi
          </Button>
        </div>

        <BulkSelectProvider>
          <QuestionsListWithBulk
            questions={props.questions}
            showAnswers={props.showAnswers}
            setShowAnswers={props.setShowAnswers}
            setPreviewMode={props.setPreviewMode}
            setShowPreview={props.setShowPreview}
            setPreviewQuestionIndex={props.setPreviewQuestionIndex}
            getQuestionTypeInfo={props.getQuestionTypeInfo}
            formatOptions={props.formatOptions}
            formatCorrectAnswer={props.formatCorrectAnswer}
            handleSaveToBank={props.handleSaveToBank}
            openEditDialog={props.openEditDialog}
            handleDeleteQuestion={props.handleDeleteQuestion}
            onBulkDelete={props.onBulkDelete}
            onBulkSaveToBank={props.onBulkSaveToBank}
          />
        </BulkSelectProvider>
        
        {props.questions && props.questions.length > 0 && (
          <PointsDistributor
            questionCount={props.questions.length}
            initialTotalPoints={props.part.total_points || 0}
            onDistribute={async (pointsPerQuestion) => {
              const questionIds = props.questions.map((q: any) => q.id);
              await props.onBatchUpdatePoints(questionIds, pointsPerQuestion);
            }}
            isLoading={props.isBatchUpdatingPoints}
          />
        )}
      </CardContent>
    </Card>
  );
}
