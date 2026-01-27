import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Upload, FileText, Loader2, Sparkles, X, Languages, Plus, Trash2 } from 'lucide-react';
import { useAIGeneration } from '@/hooks/useElearningMaterials';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { MaterialSection } from './MaterialSectionEditor';

interface AIMultiSectionGeneratorProps {
  onGenerated: (sections: MaterialSection[]) => void;
  courseTitle?: string;
  lloData?: { code: string; description: string; indikator?: string[] } | null;
  defaultTopic?: string;
  indicators?: string[];
}

type LanguageMode = 'arabic' | 'indonesian' | 'mixed';

export function AIMultiSectionGenerator({ 
  onGenerated, 
  courseTitle, 
  lloData,
  defaultTopic = '',
  indicators = [],
}: AIMultiSectionGeneratorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateAI = useAIGeneration();

  const [sectionTitles, setSectionTitles] = useState<string[]>(['Pendahuluan', 'Pembahasan', 'Kesimpulan']);
  const [prompt, setPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('indonesian');
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);

  const addSectionTitle = () => {
    setSectionTitles([...sectionTitles, `Section ${sectionTitles.length + 1}`]);
  };

  const updateSectionTitle = (index: number, value: string) => {
    const newTitles = [...sectionTitles];
    newTitles[index] = value;
    setSectionTitles(newTitles);
  };

  const removeSectionTitle = (index: number) => {
    setSectionTitles(sectionTitles.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        setFileContent(text);
      } else if (file.type === 'application/pdf') {
        toast({ title: 'Info', description: 'File PDF akan diproses.' });
        setFileContent(`[Konten dari file: ${file.name}]`);
      } else {
        const text = await file.text();
        setFileContent(text);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal membaca file', variant: 'destructive' });
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFileContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateId = () => `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleGenerate = async () => {
    if (sectionTitles.length === 0) {
      toast({ title: 'Error', description: 'Tambahkan minimal satu section', variant: 'destructive' });
      return;
    }

    if (!prompt && !fileContent) {
      toast({ title: 'Error', description: 'Masukkan prompt atau upload file', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setCurrentSection(0);

    const generatedSections: MaterialSection[] = [];

    try {
      for (let i = 0; i < sectionTitles.length; i++) {
        setCurrentSection(i + 1);
        setProgress(Math.round(((i) / sectionTitles.length) * 100));

        const sectionTitle = sectionTitles[i];
        const sectionPrompt = `Buat konten untuk section "${sectionTitle}" (section ${i + 1} dari ${sectionTitles.length}).

Topik utama: ${prompt || defaultTopic || 'Materi pembelajaran'}

Konteks section dalam materi:
- Section sebelumnya: ${i > 0 ? sectionTitles.slice(0, i).join(', ') : 'Tidak ada (ini section pertama)'}
- Section sesudahnya: ${i < sectionTitles.length - 1 ? sectionTitles.slice(i + 1).join(', ') : 'Tidak ada (ini section terakhir)'}

${fileContent ? `\nReferensi dari file:\n${fileContent.substring(0, 2000)}` : ''}

Pastikan konten section ini relevan dengan judulnya dan terhubung dengan section lainnya.`;

        const result = await generateAI.mutateAsync({
          type: 'generate_material',
          topic: sectionPrompt,
          context: fileContent || undefined,
          indicators: indicators.length > 0 ? indicators : (lloData?.indikator || []),
          languageMode: languageMode,
        });

        if (result?.error) {
          toast({
            title: result.code === 429 ? 'AI sedang sibuk' : 'Error',
            description: result.error,
            variant: 'destructive',
          });
          break;
        }

        if (result.content) {
          generatedSections.push({
            id: generateId(),
            title: sectionTitle,
            content: result.content,
          });
        }
      }

      setProgress(100);

      if (generatedSections.length > 0) {
        onGenerated(generatedSections);
        toast({ title: 'Sukses', description: `${generatedSections.length} section berhasil di-generate!` });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal generate konten',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setCurrentSection(0);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate Multi-Section dengan AI
        </CardTitle>
        <CardDescription>
          Generate beberapa section materi sekaligus dengan bantuan AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section Titles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Daftar Section ({sectionTitles.length})</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSectionTitle} className="gap-1">
              <Plus className="h-3 w-3" />
              Tambah
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sectionTitles.map((title, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0 w-6 h-6 flex items-center justify-center p-0">
                  {index + 1}
                </Badge>
                <Input
                  value={title}
                  onChange={(e) => updateSectionTitle(index, e.target.value)}
                  placeholder={`Section ${index + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeSectionTitle(index)}
                  disabled={sectionTitles.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* LLO Context */}
        {lloData && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">{lloData.code}</p>
            <p className="text-muted-foreground">{lloData.description}</p>
          </div>
        )}

        {/* File Upload */}
        <div className="space-y-2">
          <Label>Upload File Referensi (Opsional)</Label>
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="flex-1"
            />
            {uploadedFile && (
              <Button type="button" variant="ghost" size="icon" onClick={removeFile}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {uploadedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{uploadedFile.name}</span>
              <Badge variant="outline">{(uploadedFile.size / 1024).toFixed(1)} KB</Badge>
            </div>
          )}
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <Label>Instruksi / Topik Utama</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Contoh: Buat materi tentang konsep dasar pemrograman berorientasi objek..."
            className="min-h-[80px]"
          />
        </div>

        {/* Language Mode */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Bahasa Output
          </Label>
          <ToggleGroup 
            type="single" 
            value={languageMode} 
            onValueChange={(v) => v && setLanguageMode(v as LanguageMode)}
            className="justify-start flex-wrap"
          >
            <ToggleGroupItem value="arabic" className="flex-1 min-w-[80px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <span className="font-arabic text-lg ml-1">عربي</span>
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
              <span>Generating section {currentSection} dari {sectionTitles.length}...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Generate Button */}
        <Button 
          type="button"
          onClick={handleGenerate} 
          disabled={isGenerating || sectionTitles.length === 0 || (!prompt && !fileContent)}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating {currentSection}/{sectionTitles.length}...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate {sectionTitles.length} Section
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
