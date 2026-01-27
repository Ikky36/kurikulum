import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, FileText, HelpCircle, CheckSquare, ArrowLeftRight, Type, Calculator } from 'lucide-react';
import * as XLSX from 'xlsx';

interface QuizTemplateImportProps {
  onImport: (questions: ParsedQuestion[]) => void;
  totalPoints?: number;
  onTotalPointsChange?: (value: number) => void;
}

export interface ParsedQuestion {
  question_text: string;
  question_type: string;
  options?: { id: string; text: string }[];
  correct_answer: any;
  points: number;
  feedback?: string;
}

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda', icon: HelpCircle },
  { value: 'true_false', label: 'Benar/Salah', icon: CheckSquare },
  { value: 'short_answer', label: 'Jawaban Singkat', icon: Type },
  { value: 'matching', label: 'Menjodohkan', icon: ArrowLeftRight },
];

export function QuizTemplateImport({ onImport, totalPoints = 100, onTotalPointsChange }: QuizTemplateImportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState('multiple_choice');
  const [isImporting, setIsImporting] = useState(false);
  const [localTotalPoints, setLocalTotalPoints] = useState(totalPoints.toString());
  const [useDistribution, setUseDistribution] = useState(true);

  const downloadTemplate = (type: string) => {
    let data: any[];
    let filename: string;

    switch (type) {
      case 'multiple_choice':
        data = [
          {
            'Soal': 'Apa ibukota Indonesia?',
            'Pilihan A': 'Jakarta',
            'Pilihan B': 'Bandung',
            'Pilihan C': 'Surabaya',
            'Pilihan D': 'Medan',
            'Jawaban Benar': 'A',
            'Poin': 10,
            'Feedback': 'Jakarta adalah ibukota negara Indonesia sejak 1945.'
          },
          {
            'Soal': 'Berapa hasil dari 2 + 2?',
            'Pilihan A': '3',
            'Pilihan B': '4',
            'Pilihan C': '5',
            'Pilihan D': '6',
            'Jawaban Benar': 'B',
            'Poin': 10,
            'Feedback': 'Hasil dari 2 + 2 adalah 4.'
          },
        ];
        filename = 'template_pilihan_ganda.xlsx';
        break;

      case 'true_false':
        data = [
          {
            'Soal': 'Matahari terbit dari arah barat',
            'Jawaban Benar': 'Salah',
            'Poin': 10,
            'Feedback': 'Matahari terbit dari arah timur.'
          },
          {
            'Soal': 'Air mendidih pada suhu 100°C',
            'Jawaban Benar': 'Benar',
            'Poin': 10,
            'Feedback': 'Air murni mendidih pada suhu 100°C pada tekanan atmosfer standar.'
          },
        ];
        filename = 'template_benar_salah.xlsx';
        break;

      case 'short_answer':
        data = [
          {
            'Soal': 'Siapa proklamator kemerdekaan Indonesia?',
            'Jawaban Benar': 'Soekarno dan Mohammad Hatta',
            'Jawaban Alternatif 1': 'Sukarno dan Hatta',
            'Jawaban Alternatif 2': 'Bung Karno dan Bung Hatta',
            'Poin': 10,
            'Feedback': 'Soekarno dan Mohammad Hatta memproklamasikan kemerdekaan Indonesia pada 17 Agustus 1945.'
          },
        ];
        filename = 'template_jawaban_singkat.xlsx';
        break;

      case 'matching':
        data = [
          {
            'Pasangan Kiri 1': 'Indonesia',
            'Pasangan Kanan 1': 'Jakarta',
            'Pasangan Kiri 2': 'Malaysia',
            'Pasangan Kanan 2': 'Kuala Lumpur',
            'Pasangan Kiri 3': 'Thailand',
            'Pasangan Kanan 3': 'Bangkok',
            'Pasangan Kiri 4': 'Filipina',
            'Pasangan Kanan 4': 'Manila',
            'Poin': 20,
            'Feedback': 'Jodohkan negara dengan ibukotanya masing-masing.'
          },
        ];
        filename = 'template_menjodohkan.xlsx';
        break;

      default:
        return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Soal');
    XLSX.writeFile(wb, filename);

    toast({
      title: 'Template Downloaded',
      description: `Template ${filename} berhasil diunduh. Isi template dan upload kembali.`,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const totalRows = jsonData.length;
      const { valid: questions, skipped } = parseQuestionsWithValidation(jsonData, selectedType);
      
      if (questions.length === 0) {
        throw new Error('Tidak ada soal yang valid ditemukan dalam file');
      }

      // Distribute points if enabled
      let finalQuestions = questions;
      if (useDistribution && questions.length > 0) {
        const totalPts = parseInt(localTotalPoints) || 100;
        const pointsPerQuestion = Math.round((totalPts / questions.length) * 100) / 100;
        finalQuestions = questions.map(q => ({
          ...q,
          points: pointsPerQuestion,
        }));
      }

      onImport(finalQuestions);
      
      const message = skipped > 0 
        ? `${questions.length} soal berhasil diimport, ${skipped} baris dilewati (data tidak lengkap)`
        : `${questions.length} soal berhasil diimport`;
      
      toast({
        title: 'Import Berhasil',
        description: message,
      });
    } catch (error: any) {
      toast({
        title: 'Import Gagal',
        description: error.message || 'Gagal membaca file. Pastikan format sesuai template.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const parseQuestionsWithValidation = (data: any[], type: string): { valid: ParsedQuestion[]; skipped: number } => {
    const allQuestions = parseQuestions(data, type);
    const valid = allQuestions.filter(q => q.question_text && q.question_text.trim() !== '');
    return { valid, skipped: allQuestions.length - valid.length };
  };

  const parseQuestions = (data: any[], type: string): ParsedQuestion[] => {
    return data.map((row) => {
      switch (type) {
        case 'multiple_choice':
          return {
            question_text: row['Soal'] || '',
            question_type: 'multiple_choice',
            options: [
              { id: 'A', text: row['Pilihan A'] || '' },
              { id: 'B', text: row['Pilihan B'] || '' },
              { id: 'C', text: row['Pilihan C'] || '' },
              { id: 'D', text: row['Pilihan D'] || '' },
            ].filter(o => o.text),
            correct_answer: row['Jawaban Benar']?.toUpperCase() || 'A',
            points: parseInt(row['Poin']) || 10,
            feedback: row['Feedback'] || '',
          };

        case 'true_false':
          const answer = row['Jawaban Benar']?.toLowerCase();
          return {
            question_text: row['Soal'] || '',
            question_type: 'true_false',
            options: [
              { id: 'true', text: 'Benar' },
              { id: 'false', text: 'Salah' },
            ],
            correct_answer: answer === 'benar' || answer === 'true' ? 'true' : 'false',
            points: parseInt(row['Poin']) || 10,
            feedback: row['Feedback'] || '',
          };

        case 'short_answer':
          const answers = [
            row['Jawaban Benar'],
            row['Jawaban Alternatif 1'],
            row['Jawaban Alternatif 2'],
          ].filter(Boolean);
          return {
            question_text: row['Soal'] || '',
            question_type: 'short_answer',
            correct_answer: answers,
            points: parseInt(row['Poin']) || 10,
            feedback: row['Feedback'] || '',
          };

        case 'matching':
          const pairs: { left: string; right: string }[] = [];
          for (let i = 1; i <= 10; i++) {
            const left = row[`Pasangan Kiri ${i}`];
            const right = row[`Pasangan Kanan ${i}`];
            if (left && right) {
              pairs.push({ left, right });
            }
          }
          return {
            question_text: 'Jodohkan pasangan yang sesuai',
            question_type: 'matching',
            options: pairs.map((p, idx) => ({ id: `${idx}`, text: `${p.left} -> ${p.right}` })),
            correct_answer: pairs,
            points: parseInt(row['Poin']) || 20,
            feedback: row['Feedback'] || '',
          };

        default:
          return {
            question_text: row['Soal'] || '',
            question_type: type,
            correct_answer: row['Jawaban Benar'] || '',
            points: parseInt(row['Poin']) || 10,
            feedback: row['Feedback'] || '',
          };
      }
    }).filter(q => q.question_text);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5" />
          Import Soal dari File
        </CardTitle>
        <CardDescription>
          Download template, isi dengan soal Anda, lalu upload kembali
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid grid-cols-4 w-full">
            {QUESTION_TYPES.map((type) => (
              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-1 text-xs">
                <type.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{type.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {QUESTION_TYPES.map((type) => (
            <TabsContent key={type.value} value={type.value} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate(type.value)}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template {type.label}
                </Button>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="quiz-file-input"
                  />
                  <Button
                    variant="default"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? 'Importing...' : 'Upload File Soal'}
                  </Button>
                </div>
              </div>

              {/* Total Points Distribution */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`use-distribution-${type.value}`}
                    checked={useDistribution}
                    onCheckedChange={(checked) => setUseDistribution(checked === true)}
                  />
                  <Label htmlFor={`use-distribution-${type.value}`} className="cursor-pointer flex items-center gap-1.5 text-sm">
                    <Calculator className="h-4 w-4" />
                    Distribusi poin merata
                  </Label>
                </div>
                {useDistribution && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Total:</Label>
                    <Input
                      type="number"
                      min={1}
                      value={localTotalPoints}
                      onChange={(e) => setLocalTotalPoints(e.target.value)}
                      className="w-24 h-8"
                      placeholder="100"
                    />
                    <span className="text-sm text-muted-foreground">poin</span>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Petunjuk:</strong> Download template terlebih dahulu, isi soal sesuai format, 
                  lalu upload file yang sudah diisi. Format file: .xlsx atau .xls
                  {useDistribution && (
                    <span className="block mt-1">
                      ⚡ Poin di file akan diabaikan dan didistribusikan merata dari total poin.
                    </span>
                  )}
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
