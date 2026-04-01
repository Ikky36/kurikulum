import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Upload, FileText, Loader2, Sparkles, X, Languages, Image, File, Paperclip } from 'lucide-react';
import { useAIGeneration, useAIImageGeneration } from '@/hooks/useElearningMaterials';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  content?: string;
}

interface AIContentGeneratorProps {
  type: 'material' | 'quiz';
  onGenerated: (content: string) => void;
  courseTitle?: string;
  lloData?: { code: string; description: string; indikator?: string[] } | null;
  defaultTopic?: string;
  indicators?: string[];
  questionType?: string;
  questionCount?: number;
  totalPoints?: number;
}

type LanguageMode = 'arabic' | 'indonesian' | 'mixed' | 'english' | 'english_indonesian';

export function AIContentGenerator({ 
  type, 
  onGenerated, 
  courseTitle, 
  lloData,
  defaultTopic = '',
  indicators = [],
  questionType = 'multiple_choice',
  questionCount = 5,
  totalPoints = 100
}: AIContentGeneratorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateAI = useAIGeneration();
  const generateImage = useAIImageGeneration();

  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'from_scratch' | 'from_file' | 'enhance'>('from_scratch');
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('indonesian');
  const [generateInfographic, setGenerateInfographic] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readFileContent = async (file: File): Promise<string> => {
    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        return await file.text();
      }
      return `[Konten dari file: ${file.name}]`;
    } catch {
      return `[Konten dari file: ${file.name}]`;
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
        const fileName = `ai-gen/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from('material-files')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('material-files')
          .getPublicUrl(fileName);

        const content = await readFileContent(file);

        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
          content: content.substring(0, 5000),
        });
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast({ title: 'Sukses', description: `${newFiles.length} file berhasil diupload` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal mengupload file', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeAllFiles = () => {
    setUploadedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAllFileContent = (): string => {
    return uploadedFiles.map(f => `\n--- Dari file: ${f.name} ---\n${f.content || '[Konten tidak tersedia]'}`).join('\n');
  };

  const handleGenerate = async () => {
    const fileContent = getAllFileContent();
    
    if (!prompt && !fileContent) {
      toast({ title: 'Error', description: 'Masukkan prompt atau upload file', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep('Generating konten...');

    // Calculate total steps
    const totalSteps = (type === 'material' && generateInfographic) ? 2 : 1;
    let currentStepNum = 0;

    try {
      // Build context with file content if available
      const contextWithFile = fileContent 
        ? `${prompt ? prompt + '\n\n' : ''}KONTEN FILE REFERENSI:${fileContent}\n\nPENTING: Konten HARUS berdasarkan file sumber yang diberikan. Jangan mengarang informasi di luar konteks file.` 
        : undefined;
      
      currentStepNum = 1;
      setProgress(Math.round((currentStepNum / totalSteps) * 50));
      
      const result = await generateAI.mutateAsync({
        type: type === 'material' ? 'generate_material' : 'generate_quiz',
        topic: prompt || defaultTopic || 'Generate content',
        context: contextWithFile,
        indicators: indicators.length > 0 ? indicators : (lloData?.indikator || []),
        questionType: questionType,
        questionCount: questionCount,
        languageMode: languageMode,
        contentLength: contentLength,
      });

      if (result?.error) {
        toast({
          title: result.code === 429 ? 'AI sedang sibuk' : 'Error',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      let finalContent = result.content || '';
      
      // Generate infographic if enabled and type is material
      if (type === 'material' && generateInfographic && finalContent) {
        setCurrentStep('Generating infografis...');
        setProgress(75);
        
        try {
          const imagePrompt = `Buat infografis edukatif untuk materi pembelajaran.
Topik: ${prompt || defaultTopic}
Gaya: clean, modern, educational infographic dengan ikon-ikon relevan, diagram, dan layout yang jelas.
Gunakan warna yang kontras dan teks yang mudah dibaca.
Ultra high resolution.`;
          
          const imageResult = await generateImage.mutateAsync({
            prompt: imagePrompt,
            topic: prompt || defaultTopic,
          });
          
          if (imageResult?.imageUrl) {
            // Prepend the infographic image to content
            finalContent = `<div class="infographic-container mb-6 text-center">
<img src="${imageResult.imageUrl}" alt="Infografis Materi" class="max-w-full h-auto rounded-lg shadow-md mx-auto" style="max-height: 500px;" />
<p class="text-sm text-muted-foreground mt-2 italic">Infografis Materi</p>
</div>
${finalContent}`;
          }
        } catch (imgError) {
          console.error('Failed to generate infographic:', imgError);
          // Continue without image
        }
      }

      setProgress(100);

      if (finalContent) {
        onGenerated(finalContent);
        toast({ title: 'Sukses', description: 'Konten berhasil di-generate!' });
      } else {
        toast({
          title: 'Error',
          description: 'AI tidak mengembalikan konten. Silakan coba lagi.',
          variant: 'destructive',
        });
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
      setCurrentStep('');
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Content Generator
        </CardTitle>
        <CardDescription>
          Generate {type === 'material' ? 'materi pembelajaran' : 'soal quiz'} dengan bantuan AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generation Type */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={generationType === 'from_scratch' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setGenerationType('from_scratch')}
          >
            <Wand2 className="h-3 w-3 mr-1" />
            Dari Awal
          </Badge>
          <Badge 
            variant={generationType === 'from_file' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setGenerationType('from_file')}
          >
            <Upload className="h-3 w-3 mr-1" />
            Dari File
          </Badge>
          <Badge 
            variant={generationType === 'enhance' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setGenerationType('enhance')}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Enhance
          </Badge>
        </div>

        {/* LLO Context */}
        {lloData && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">{lloData.code}</p>
            <p className="text-muted-foreground">{lloData.description}</p>
          </div>
        )}

        {/* File Upload */}
        {(generationType === 'from_file' || generationType === 'enhance') && (
          <div className="space-y-2">
            <Label>Upload File Referensi (Multiple)</Label>
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
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload File Sumber
              </Button>
              {uploadedFiles.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Paperclip className="h-3 w-3" />
                  {uploadedFiles.length} file
                </Badge>
              )}
              {uploadedFiles.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={removeAllFiles}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                    <File className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-muted-foreground text-xs">{formatFileSize(file.size)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Prompt */}
        <div className="space-y-2">
          <Label>Instruksi / Prompt</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              type === 'material' 
                ? 'Contoh: Buat materi tentang konsep dasar pemrograman berorientasi objek dengan contoh kode Python...'
                : 'Contoh: Buat soal tentang struktur data array dan linked list dengan tingkat kesulitan sedang...'
            }
            className="min-h-[100px]"
          />
        </div>

        {/* Language Mode Toggle */}
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
            <ToggleGroupItem 
              value="arabic" 
              className="flex-1 min-w-[100px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <span className="font-arabic text-lg ml-1">عربي</span>
              <span className="text-xs ml-1">Arab</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="indonesian" 
              className="flex-1 min-w-[100px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              🇮🇩 Indonesia
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="mixed" 
              className="flex-1 min-w-[100px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <span className="font-arabic">عربي</span>
              <span className="mx-1">+</span>
              <span>ID</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            {languageMode === 'arabic' && 'Output akan sepenuhnya dalam bahasa Arab dengan harakat lengkap'}
            {languageMode === 'indonesian' && 'Output akan sepenuhnya dalam bahasa Indonesia'}
            {languageMode === 'mixed' && 'Output akan menggunakan bahasa Arab (dengan harakat) dan terjemahan Indonesia'}
          </p>
        </div>

        {/* Content Length - Only show for material type */}
        {type === 'material' && (
          <div className="space-y-2">
            <Label>Panjang Konten</Label>
            <Select value={contentLength} onValueChange={(v: any) => setContentLength(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Pendek (500-800 kata)</SelectItem>
                <SelectItem value="medium">Sedang (1000-1500 kata)</SelectItem>
                <SelectItem value="long">Panjang (2000-3000 kata)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Generate Infographic Option - Only show for material type */}
        {type === 'material' && (
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox 
              id="generate-infographic-single" 
              checked={generateInfographic}
              onCheckedChange={(checked) => setGenerateInfographic(checked === true)}
            />
            <div className="flex-1">
              <Label htmlFor="generate-infographic-single" className="flex items-center gap-2 cursor-pointer">
                <Image className="h-4 w-4 text-primary" />
                Generate Gambar Infografis
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                AI akan membuat gambar infografis yang sesuai dengan materi
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{currentStep || 'Generating...'}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || (!prompt && uploadedFiles.length === 0)}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {currentStep || 'Generating...'}
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate {type === 'material' ? 'Materi' : 'Quiz'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
