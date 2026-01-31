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
import { Wand2, Upload, FileText, Loader2, Sparkles, X, Languages, Plus, Trash2, Image, Paperclip, File } from 'lucide-react';
import { useAIGeneration, useAIImageGeneration } from '@/hooks/useElearningMaterials';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { MaterialSection, SectionFile } from './MaterialSectionEditor';
import { supabase } from '@/integrations/supabase/client';

interface SectionWithFiles {
  title: string;
  files: SectionFile[];
}

interface AIMultiSectionGeneratorProps {
  onGenerated: (sections: MaterialSection[]) => void;
  courseTitle?: string;
  lloData?: { code: string; description: string; indikator?: string[] } | null;
  defaultTopic?: string;
  indicators?: string[];
}

type LanguageMode = 'arabic' | 'indonesian' | 'mixed';
type ContentLength = 'short' | 'medium' | 'long';

export function AIMultiSectionGenerator({ 
  onGenerated, 
  courseTitle, 
  lloData,
  defaultTopic = '',
  indicators = [],
}: AIMultiSectionGeneratorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionFileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const generateAI = useAIGeneration();
  const generateImage = useAIImageGeneration();

  const [sections, setSections] = useState<SectionWithFiles[]>([
    { title: 'Pendahuluan', files: [] },
    { title: 'Pembahasan', files: [] },
    { title: 'Kesimpulan', files: [] },
  ]);
  const [prompt, setPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('indonesian');
  const [contentLength, setContentLength] = useState<ContentLength>('medium');
  const [generateInfographic, setGenerateInfographic] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [uploadingSection, setUploadingSection] = useState<number | null>(null);

  const addSection = () => {
    setSections([...sections, { title: `Section ${sections.length + 1}`, files: [] }]);
  };

  const updateSectionTitle = (index: number, value: string) => {
    const newSections = [...sections];
    newSections[index].title = value;
    setSections(newSections);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const handleSectionFileUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploadingSection(index);

    try {
      const newFiles: SectionFile[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `ai-gen/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from('material-files')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('material-files')
          .getPublicUrl(fileName);

        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
        });
      }

      const newSections = [...sections];
      newSections[index].files = [...newSections[index].files, ...newFiles];
      setSections(newSections);

      toast({ title: 'Sukses', description: `${newFiles.length} file berhasil diupload` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal mengupload file', variant: 'destructive' });
    } finally {
      setUploadingSection(null);
      const inputRef = sectionFileInputRefs.current.get(index);
      if (inputRef) inputRef.value = '';
    }
  };

  const removeSectionFile = (sectionIndex: number, fileId: string) => {
    const newSections = [...sections];
    newSections[sectionIndex].files = newSections[sectionIndex].files.filter(f => f.id !== fileId);
    setSections(newSections);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readFileContent = async (file: SectionFile): Promise<string> => {
    try {
      const response = await fetch(file.url);
      const text = await response.text();
      return text.substring(0, 3000);
    } catch {
      return `[Konten dari file: ${file.name}]`;
    }
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
    if (sections.length === 0) {
      toast({ title: 'Error', description: 'Tambahkan minimal satu section', variant: 'destructive' });
      return;
    }

    // Check if at least prompt or any section has files
    const hasAnyFiles = sections.some(s => s.files.length > 0);
    if (!prompt && !fileContent && !hasAnyFiles) {
      toast({ title: 'Error', description: 'Masukkan prompt atau upload file', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setCurrentSection(0);

    const generatedSections: MaterialSection[] = [];

    const lengthGuide = contentLength === 'short' ? '300-500 kata' : contentLength === 'medium' ? '600-1000 kata' : '1200-2000 kata';
    const totalSteps = generateInfographic ? sections.length * 2 : sections.length;

    try {
      for (let i = 0; i < sections.length; i++) {
        const stepIndex = generateInfographic ? i * 2 : i;
        setCurrentSection(i + 1);
        setCurrentStep('Memproses file sumber...');
        setProgress(Math.round((stepIndex / totalSteps) * 100));

        const section = sections[i];
        
        // Read content from section-specific files
        let sectionFileContent = '';
        if (section.files.length > 0) {
          setCurrentStep('Membaca file sumber section...');
          for (const file of section.files) {
            if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
              const content = await readFileContent(file);
              sectionFileContent += `\n\n--- Dari file: ${file.name} ---\n${content}`;
            } else {
              sectionFileContent += `\n\n[Referensi file: ${file.name}]`;
            }
          }
        }

        setCurrentStep('Generating teks...');

        const sectionPrompt = `Buat konten untuk section "${section.title}" (section ${i + 1} dari ${sections.length}).

Topik utama: ${prompt || defaultTopic || 'Materi pembelajaran'}

Konteks section dalam materi:
- Section sebelumnya: ${i > 0 ? sections.slice(0, i).map(s => s.title).join(', ') : 'Tidak ada (ini section pertama)'}
- Section sesudahnya: ${i < sections.length - 1 ? sections.slice(i + 1).map(s => s.title).join(', ') : 'Tidak ada (ini section terakhir)'}

${fileContent ? `\nReferensi umum dari file:\n${fileContent.substring(0, 2000)}` : ''}
${sectionFileContent ? `\nReferensi khusus untuk section ini:${sectionFileContent}` : ''}

Panjang konten: ${lengthGuide}

PENTING: Konten HARUS berdasarkan file sumber yang diberikan. Jangan mengarang informasi di luar konteks file.
Pastikan konten section ini relevan dengan judulnya dan terhubung dengan section lainnya.`;

        const result = await generateAI.mutateAsync({
          type: 'generate_material',
          topic: sectionPrompt,
          context: fileContent || sectionFileContent || undefined,
          indicators: indicators.length > 0 ? indicators : (lloData?.indikator || []),
          languageMode: languageMode,
          contentLength: contentLength,
        });

        if (result?.error) {
          toast({
            title: result.code === 429 ? 'AI sedang sibuk' : 'Error',
            description: result.error,
            variant: 'destructive',
          });
          break;
        }

        let sectionContent = result.content || '';
        
        // Generate infographic if enabled
        if (generateInfographic && sectionContent) {
          setCurrentStep('Generating infografis...');
          setProgress(Math.round(((stepIndex + 1) / totalSteps) * 100));
          
          try {
        const imagePrompt = `Buat infografis edukatif untuk materi pembelajaran dengan judul "${section.title}". 
Topik: ${prompt || defaultTopic}. 
Gaya: clean, modern, educational infographic dengan ikon-ikon relevan dan layout yang jelas.
Gunakan warna yang kontras dan teks yang mudah dibaca.`;
            
            const imageResult = await generateImage.mutateAsync({
              prompt: imagePrompt,
              topic: section.title,
            });
            
            if (imageResult?.imageUrl) {
              // Prepend the infographic image to section content
              sectionContent = `<div class="infographic-container mb-6 text-center">
<img src="${imageResult.imageUrl}" alt="Infografis: ${section.title}" class="max-w-full h-auto rounded-lg shadow-md mx-auto" style="max-height: 400px;" />
<p class="text-sm text-muted-foreground mt-2 italic">Infografis: ${section.title}</p>
</div>
${sectionContent}`;
            }
          } catch (imgError) {
            console.error('Failed to generate infographic:', imgError);
            // Continue without image
          }
        }

        if (sectionContent) {
          generatedSections.push({
            id: generateId(),
            title: section.title,
            content: sectionContent,
            files: section.files, // Include the uploaded files
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
      setCurrentStep('');
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
        {/* Section Titles with File Uploads */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Daftar Section & File Sumber ({sections.length})</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSection} className="gap-1">
              <Plus className="h-3 w-3" />
              Tambah
            </Button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {sections.map((section, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0 w-6 h-6 flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <Input
                      value={section.title}
                      onChange={(e) => updateSectionTitle(index, e.target.value)}
                      placeholder={`Section ${index + 1}`}
                      className="flex-1"
                    />
                    {section.files.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Paperclip className="h-3 w-3" />
                        {section.files.length}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeSection(index)}
                      disabled={sections.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* File Upload for this Section */}
                  <div className="ml-8 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={(el) => {
                          if (el) sectionFileInputRefs.current.set(index, el);
                        }}
                        type="file"
                        multiple
                        onChange={(e) => handleSectionFileUpload(index, e)}
                        className="hidden"
                        accept=".txt,.md,.pdf,.doc,.docx"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => sectionFileInputRefs.current.get(index)?.click()}
                        disabled={uploadingSection === index}
                        className="gap-1 text-xs"
                      >
                        {uploadingSection === index ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        Upload File Sumber
                      </Button>
                    </div>
                    
                    {/* File List */}
                    {section.files.length > 0 && (
                      <div className="space-y-1">
                        {section.files.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                            <File className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate flex-1">{file.name}</span>
                            <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive hover:text-destructive"
                              onClick={() => removeSectionFile(index, file.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
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

        {/* Content Length */}
        <div className="space-y-2">
          <Label>Panjang Konten per Section</Label>
          <Select value={contentLength} onValueChange={(v: ContentLength) => setContentLength(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Pendek (300-500 kata)</SelectItem>
              <SelectItem value="medium">Sedang (600-1000 kata)</SelectItem>
              <SelectItem value="long">Panjang (1200-2000 kata)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate Infographic Option */}
        <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
          <Checkbox 
            id="generate-infographic" 
            checked={generateInfographic}
            onCheckedChange={(checked) => setGenerateInfographic(checked === true)}
          />
          <div className="flex-1">
            <Label htmlFor="generate-infographic" className="flex items-center gap-2 cursor-pointer">
              <Image className="h-4 w-4 text-primary" />
              Generate Gambar Infografis
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              AI akan membuat gambar infografis yang sesuai untuk setiap section
            </p>
          </div>
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Section {currentSection}/{sections.length} - {currentStep}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Generate Button */}
        <Button 
          type="button"
          onClick={handleGenerate} 
          disabled={isGenerating || sections.length === 0 || (!prompt && !fileContent && !sections.some(s => s.files.length > 0))}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating {currentSection}/{sections.length}...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate {sections.length} Section
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
