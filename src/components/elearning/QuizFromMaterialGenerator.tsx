import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Loader2, Sparkles, BookOpen, ChevronDown, FileText, Languages } from 'lucide-react';
import { useAIGeneration, useElearningMaterials } from '@/hooks/useElearningMaterials';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface MaterialSection {
  id: string;
  title: string;
  content: string;
}

interface MaterialWithSections {
  id: string;
  title: string;
  content: string | null;
  sections: MaterialSection[];
  order_index: number;
  llo?: { code: string; description: string } | null;
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
  const generateAI = useAIGeneration();
  const { data: rawMaterials, isLoading: materialsLoading } = useElearningMaterials(classId);

  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Map<string, Set<string>>>(new Map());
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [questionCount, setQuestionCount] = useState('5');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('indonesian');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());

  // Parse materials with sections
  const materials: MaterialWithSections[] = (rawMaterials || []).map((m: any) => ({
    ...m,
    sections: parseSections(m.sections, m.content),
  }));

  function parseSections(sectionsJson: any, fallbackContent: string | null): MaterialSection[] {
    if (sectionsJson && Array.isArray(sectionsJson) && sectionsJson.length > 0) {
      return sectionsJson;
    }
    // If no sections, treat the whole content as one section
    if (fallbackContent) {
      return [{
        id: 'main',
        title: 'Konten Utama',
        content: fallbackContent,
      }];
    }
    return [];
  }

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

  const getSelectedContent = (): string => {
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

  const handleGenerate = async () => {
    const selectedContent = getSelectedContent();
    
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
        context: selectedContent.substring(0, 8000), // Limit context size
        questionType: questionType === 'mixed' ? 'multiple_choice' : questionType,
        questionCount: parseInt(questionCount),
        languageMode: languageMode,
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
          
          onGenerated(questions);
          toast({ title: 'Sukses', description: `${questions.length} soal berhasil di-generate!` });
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
                        className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded"
                      >
                        <Checkbox
                          checked={selectedSections.get(material.id)?.has(section.id) || false}
                          onCheckedChange={() => toggleSection(material.id, section.id)}
                        />
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{section.title}</span>
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
        <div className="space-y-2">
          <Label>Jumlah Soal</Label>
          <Select value={questionCount} onValueChange={setQuestionCount}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 soal</SelectItem>
              <SelectItem value="5">5 soal</SelectItem>
              <SelectItem value="10">10 soal</SelectItem>
              <SelectItem value="15">15 soal</SelectItem>
            </SelectContent>
          </Select>
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
