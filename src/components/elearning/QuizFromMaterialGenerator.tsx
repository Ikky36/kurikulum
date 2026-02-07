import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Loader2, Sparkles, BookOpen, ChevronDown, FileText, Languages, Upload, X, Paperclip, File, MessageSquare } from 'lucide-react';
import { useAIGeneration, useElearningMaterials } from '@/hooks/useElearningMaterials';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';

interface SectionFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface MaterialSection {
  id: string;
  title: string;
  content: string;
  files?: SectionFile[];
}

interface MaterialWithSections {
  id: string;
  title: string;
  content: string | null;
  sections: MaterialSection[];
  order_index: number;
  llo?: { code: string; description: string } | null;
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  content?: string;
}

interface QuizFromMaterialGeneratorProps {
  classId: string;
  courseId: string;
  onGenerated: (questions: any[]) => void;
}

type LanguageMode = 'arabic' | 'indonesian' | 'mixed';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda' },
  { value: 'true_false', label: 'Benar/Salah' },
  { value: 'short_answer', label: 'Jawaban Singkat' },
  { value: 'mixed', label: 'Campuran' },
];

export function QuizFromMaterialGenerator({
  classId,
  courseId,
  onGenerated,
}: QuizFromMaterialGeneratorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateAI = useAIGeneration();
  const { data: rawMaterials, isLoading: materialsLoading } = useElearningMaterials(classId);

  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Map<string, Set<string>>>(new Map());
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [questionCount, setQuestionCount] = useState('5');
  const [totalPoints, setTotalPoints] = useState('100');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('indonesian');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  const [additionalFiles, setAdditionalFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Parse materials with sections
  const materials: MaterialWithSections[] = (rawMaterials || []).map((m: any) => ({
    ...m,
    sections: parseSections(m.sections, m.content),
  }));

  function parseSections(sectionsJson: any, fallbackContent: string | null): MaterialSection[] {
    if (sectionsJson && Array.isArray(sectionsJson) && sectionsJson.length > 0) {
      return sectionsJson.map((s: any) => ({
        ...s,
        files: s.files || [],
      }));
    }
    // If no sections, treat the whole content as one section
    if (fallbackContent) {
      return [{
        id: 'main',
        title: 'Konten Utama',
        content: fallbackContent,
        files: [],
      }];
    }
    return [];
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readFileContent = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      return text.substring(0, 3000);
    } catch {
      return '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newFiles: UploadedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `quiz-gen/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from('material-files')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('material-files')
          .getPublicUrl(fileName);

        let content = '';
        if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          content = await file.text();
          content = content.substring(0, 5000);
        }

        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
          content,
        });
      }

      setAdditionalFiles(prev => [...prev, ...newFiles]);
      toast({ title: 'Sukses', description: `${newFiles.length} file berhasil diupload` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal mengupload file', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAdditionalFile = (fileId: string) => {
    setAdditionalFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const toggleMaterial = (materialId: string) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
      // Also remove its sections
      const newSections = new Map(selectedSections);
      newSections.delete(materialId);
      setSelectedSections(newSections);
    } else {
      newSelected.add(materialId);
      // Auto-select all sections
      const material = materials.find(m => m.id === materialId);
      if (material) {
        const newSections = new Map(selectedSections);
        newSections.set(materialId, new Set(material.sections.map(s => s.id)));
        setSelectedSections(newSections);
      }
    }
    setSelectedMaterials(newSelected);
  };

  const toggleSection = (materialId: string, sectionId: string) => {
    const newSections = new Map(selectedSections);
    const materialSections = newSections.get(materialId) || new Set();
    
    if (materialSections.has(sectionId)) {
      materialSections.delete(sectionId);
    } else {
      materialSections.add(sectionId);
    }
    
    if (materialSections.size === 0) {
      newSections.delete(materialId);
      setSelectedMaterials(prev => {
        const newSet = new Set(prev);
        newSet.delete(materialId);
        return newSet;
      });
    } else {
      newSections.set(materialId, materialSections);
      setSelectedMaterials(prev => new Set([...prev, materialId]));
    }
    
    setSelectedSections(newSections);
  };

  const toggleExpanded = (materialId: string) => {
    setExpandedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  const getSelectedContent = async (): Promise<string> => {
    let content = '';
    
    for (const [materialId, sectionIds] of selectedSections) {
      const material = materials.find(m => m.id === materialId);
      if (!material) continue;
      
      content += `\n\n=== MATERI: ${material.title} ===\n`;
      
      for (const sectionId of sectionIds) {
        const section = material.sections.find(s => s.id === sectionId);
        if (section) {
          content += `\n--- Section: ${section.title} ---\n`;
          // Strip HTML tags for cleaner AI input
          const cleanContent = section.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          content += cleanContent + '\n';
          
          // Include file content from section files
          if (section.files && section.files.length > 0) {
            for (const file of section.files) {
              if (file.type?.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                const fileContent = await readFileContent(file.url);
                if (fileContent) {
                  content += `\n[Dari file ${file.name}]: ${fileContent}\n`;
                }
              } else {
                content += `\n[Referensi file: ${file.name}]\n`;
              }
            }
          }
        }
      }
    }
    
    // Add content from additional uploaded files
    if (additionalFiles.length > 0) {
      content += '\n\n=== FILE TAMBAHAN ===\n';
      for (const file of additionalFiles) {
        if (file.content) {
          content += `\n--- Dari file: ${file.name} ---\n${file.content}\n`;
        } else {
          content += `\n[Referensi file: ${file.name}]\n`;
        }
      }
    }
    
    return content;
  };

  const getTotalSelectedSections = (): number => {
    let total = 0;
    for (const sectionIds of selectedSections.values()) {
      total += sectionIds.size;
    }
    return total;
  };

  const getTotalFiles = (): number => {
    let total = 0;
    for (const [materialId, sectionIds] of selectedSections) {
      const material = materials.find(m => m.id === materialId);
      if (!material) continue;
      for (const sectionId of sectionIds) {
        const section = material.sections.find(s => s.id === sectionId);
        if (section?.files) {
          total += section.files.length;
        }
      }
    }
    return total + additionalFiles.length;
  };

  const handleGenerate = async () => {
    const selectedContent = await getSelectedContent();
    
    if (!selectedContent.trim()) {
      toast({ title: 'Error', description: 'Pilih minimal satu section materi', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const materialNames = Array.from(selectedMaterials).map(id => {
        const m = materials.find(mat => mat.id === id);
        return m?.title || '';
      }).filter(Boolean).join(', ');

      const result = await generateAI.mutateAsync({
        type: 'generate_quiz',
        topic: `Soal berdasarkan materi: ${materialNames}`,
        context: selectedContent.substring(0, 10000) + '\n\nPENTING: Soal HARUS berdasarkan konten materi dan file sumber yang diberikan. Jangan mengarang informasi di luar konteks.',
        questionType: questionType === 'mixed' ? 'multiple_choice' : questionType,
        questionCount: parseInt(questionCount),
        languageMode: languageMode,
        customPrompt: customPrompt.trim() || undefined,
      });

      setProgress(100);

      if (result?.error) {
        toast({
          title: result.code === 429 ? 'AI sedang sibuk' : 'Error',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      if (result.content) {
        try {
          // Parse JSON response
          let questions = [];
          const content = result.content.trim();
          
          // Try to extract JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            questions = JSON.parse(jsonMatch[0]);
          } else {
            questions = JSON.parse(content);
          }
          
          // Calculate points per question
          const totalPointsNum = parseInt(totalPoints) || 100;
          const questionCountNum = questions.length;
          const pointsPerQuestion = questionCountNum > 0 
            ? Math.round((totalPointsNum / questionCountNum) * 100) / 100 
            : 10;
          
          // Assign points to each question
          const questionsWithPoints = questions.map((q: any) => ({
            ...q,
            points: pointsPerQuestion,
          }));
          
          onGenerated(questionsWithPoints);
          toast({ title: 'Sukses', description: `${questions.length} soal berhasil di-generate! (${pointsPerQuestion} poin per soal)` });
        } catch (parseError) {
          console.error('Failed to parse quiz questions:', parseError);
          toast({
            title: 'Error',
            description: 'Gagal memproses hasil AI. Silakan coba lagi.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal generate soal',
        variant: 'destructive',
      });
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  if (materialsLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Memuat materi...</p>
        </CardContent>
      </Card>
    );
  }

  if (materials.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">Belum Ada Materi</h4>
          <p className="text-sm text-muted-foreground">
            Tambahkan materi terlebih dahulu untuk dapat generate soal berdasarkan section materi.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate Soal dari Section Materi
        </CardTitle>
        <CardDescription>
          Pilih section materi untuk dijadikan referensi pembuatan soal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Materials Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Pilih Materi & Section
            </Label>
            {getTotalSelectedSections() > 0 && (
              <Badge variant="secondary">
                {getTotalSelectedSections()} section dipilih
                {getTotalFiles() > 0 && ` • ${getTotalFiles()} file`}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
            {materials.map((material, index) => (
              <Collapsible 
                key={material.id}
                open={expandedMaterials.has(material.id)}
                onOpenChange={() => toggleExpanded(material.id)}
              >
                <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg">
                  <Checkbox
                    checked={selectedMaterials.has(material.id)}
                    onCheckedChange={() => toggleMaterial(material.id)}
                  />
                  <Badge variant="outline" className="shrink-0">
                    {index + 1}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{material.title}</p>
                    {material.llo && (
                      <p className="text-xs text-muted-foreground">{material.llo.code}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {material.sections.length} section
                  </Badge>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedMaterials.has(material.id) ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div className="ml-8 pl-4 border-l space-y-1 py-2">
                    {material.sections.map((section, sIdx) => (
                      <div 
                        key={section.id}
                        className="space-y-1"
                      >
                        <div className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded">
                          <Checkbox
                            checked={selectedSections.get(material.id)?.has(section.id) || false}
                            onCheckedChange={() => toggleSection(material.id, section.id)}
                          />
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm flex-1">{section.title}</span>
                          {section.files && section.files.length > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Paperclip className="h-2 w-2" />
                              {section.files.length}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Show section files */}
                        {section.files && section.files.length > 0 && selectedSections.get(material.id)?.has(section.id) && (
                          <div className="ml-8 space-y-1">
                            {section.files.map((file) => (
                              <div key={file.id} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                                <File className="h-3 w-3" />
                                <span className="truncate">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>

        {/* Question Type */}
        <div className="space-y-2">
          <Label>Tipe Soal</Label>
          <Select value={questionType} onValueChange={setQuestionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Question Count */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Jumlah Soal</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              placeholder="Masukkan jumlah soal"
            />
          </div>
          <div className="space-y-2">
            <Label>Total Poin</Label>
            <Input
              type="number"
              min={1}
              value={totalPoints}
              onChange={(e) => setTotalPoints(e.target.value)}
              placeholder="Masukkan total poin"
            />
            {parseInt(questionCount) > 0 && parseInt(totalPoints) > 0 && (
              <p className="text-xs text-muted-foreground">
                ≈ {Math.round((parseInt(totalPoints) / parseInt(questionCount)) * 100) / 100} poin per soal
              </p>
            )}
          </div>
        </div>

        {/* Additional File Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload File Sumber Tambahan
          </Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload File
            </Button>
            {additionalFiles.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Paperclip className="h-3 w-3" />
                {additionalFiles.length} file
              </Badge>
            )}
          </div>
          
          {/* Additional Files List */}
          {additionalFiles.length > 0 && (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {additionalFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                  <File className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeAdditionalFile(file.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom Prompt / Instruksi Tambahan */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Instruksi Tambahan untuk AI (Opsional)
          </Label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Contoh: Fokuskan soal pada bab tentang hukum tajwid nun mati dan tanwin, buat soal dengan tingkat kesulitan tinggi, sertakan contoh ayat Al-Quran..."
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Berikan instruksi spesifik untuk mengarahkan AI dalam membuat soal dari materi yang dipilih
          </p>
        </div>

        {/* Language Mode */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Bahasa Soal
          </Label>
          <ToggleGroup 
            type="single" 
            value={languageMode} 
            onValueChange={(v) => v && setLanguageMode(v as LanguageMode)}
            className="justify-start flex-wrap"
          >
            <ToggleGroupItem value="arabic" className="flex-1 min-w-[80px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <span className="font-arabic">عربي</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="indonesian" className="flex-1 min-w-[80px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              🇮🇩 Indonesia
            </ToggleGroupItem>
            <ToggleGroupItem value="mixed" className="flex-1 min-w-[80px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <span className="font-arabic">عربي</span>+ID
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Generating soal...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || getTotalSelectedSections() === 0}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate {questionCount} Soal
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
