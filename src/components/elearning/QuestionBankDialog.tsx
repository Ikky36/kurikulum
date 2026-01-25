import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuestionBank, QuestionBankItem } from '@/hooks/useQuestionBank';
import { Search, Database, CheckCircle, Filter } from 'lucide-react';
import { containsArabic } from '@/components/ui/arabic-text';

interface QuestionBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  onSelectQuestions: (questions: QuestionBankItem[]) => void;
}

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda' },
  { value: 'true_false', label: 'Benar/Salah' },
  { value: 'short_answer', label: 'Jawaban Singkat' },
  { value: 'matching', label: 'Menjodohkan' },
  { value: 'select_missing_word', label: 'Pilih Kata yang Hilang' },
];

export function QuestionBankDialog({ open, onOpenChange, courseId, onSelectQuestions }: QuestionBankDialogProps) {
  const { data: bankQuestions = [], isLoading } = useQuestionBank(courseId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredQuestions = useMemo(() => {
    return bankQuestions.filter(q => {
      const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           q.question_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || q.question_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [bankQuestions, searchQuery, filterType]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = () => {
    const selectedQuestions = bankQuestions.filter(q => selectedIds.has(q.id));
    onSelectQuestions(selectedQuestions);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const getTypeLabel = (type: string) => {
    return QUESTION_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Bank Soal
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan kode atau teks soal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              {QUESTION_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Memuat soal...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {bankQuestions.length === 0 
                ? 'Belum ada soal di bank soal. Simpan soal ke bank soal untuk menggunakannya kembali.'
                : 'Tidak ada soal yang cocok dengan pencarian.'
              }
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.has(q.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => toggleSelection(q.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(q.id)}
                    onCheckedChange={() => toggleSelection(q.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {q.question_code}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(q.question_type)}
                      </Badge>
                      <Badge className="text-xs">{q.points} pts</Badge>
                    </div>
                    <p 
                      className={`text-sm line-clamp-2 bidi-content ${containsArabic(q.question_text) ? 'font-arabic' : ''}`}
                      dir="auto"
                      style={containsArabic(q.question_text) ? {
                        fontFamily: "'Scheherazade New', 'Amiri', serif",
                        fontSize: '1.1em',
                        lineHeight: 1.8,
                      } : undefined}
                    >{q.question_text}</p>
                    {q.tags && q.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {q.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-muted">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedIds.has(q.id) && (
                    <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 border-t pt-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} soal dipilih` : 'Pilih soal untuk ditambahkan'}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            Tambahkan ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
