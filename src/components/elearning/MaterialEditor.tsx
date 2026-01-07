import { useState } from 'react';
import { useCreateMaterial, useUpdateMaterial, useCourseLLOs, useAIGeneration, type ElearningMaterial } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, BookOpen, Video, Image, FileText } from 'lucide-react';

interface MaterialEditorProps {
  classId: string;
  courseId: string;
  material?: ElearningMaterial | null;
  onSuccess: () => void;
}

type LLOWithCLO = {
  id: string;
  code: string;
  description: string;
  indikator?: string[] | null;
  clo?: { id: string; code: string; description: string } | null;
};

export function MaterialEditor({ classId, courseId, material, onSuccess }: MaterialEditorProps) {
  const { toast } = useToast();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const generateAI = useAIGeneration();
  const { data: llos } = useCourseLLOs(courseId);

  const [title, setTitle] = useState(material?.title || '');
  const [contentType, setContentType] = useState<'text' | 'video' | 'image' | 'document'>(
    (material?.content_type as 'text' | 'video' | 'image' | 'document') || 'text'
  );
  const [content, setContent] = useState(material?.content || '');
  const [fileUrl, setFileUrl] = useState(material?.file_url || '');
  const [selectedLloId, setSelectedLloId] = useState(material?.llo_id || '');
  const [isPublished, setIsPublished] = useState(material?.is_published || false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState('');

  const typedLlos = (llos || []) as LLOWithCLO[];
  const selectedLlo = typedLlos.find(l => l.id === selectedLloId);
  const isLoading = createMaterial.isPending || updateMaterial.isPending;

  const handleGenerateWithAI = async () => {
    if (!aiTopic && !selectedLlo) {
      toast({ title: 'Error', description: 'Masukkan topik atau pilih Sub-CPMK terlebih dahulu', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateAI.mutateAsync({
        type: 'generate_material',
        topic: aiTopic || `${selectedLlo?.code}: ${selectedLlo?.description}`,
        indicators: selectedLlo?.indikator || [],
      });

      if (result.content) {
        setContent(result.content);
        setContentType('text');
        if (!title && selectedLlo) {
          setTitle(`Materi ${selectedLlo.code}`);
        }
        toast({ title: 'Sukses', description: 'Materi berhasil di-generate' });
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Gagal generate materi dengan AI', 
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Judul materi harus diisi', variant: 'destructive' });
      return;
    }

    if (contentType === 'text' && !content.trim()) {
      toast({ title: 'Error', description: 'Konten materi harus diisi', variant: 'destructive' });
      return;
    }

    if (contentType !== 'text' && !fileUrl.trim()) {
      toast({ title: 'Error', description: 'URL file harus diisi', variant: 'destructive' });
      return;
    }

    try {
      const data = {
        title,
        content_type: contentType,
        content: contentType === 'text' ? content : null,
        file_url: contentType !== 'text' ? fileUrl : null,
        llo_id: selectedLloId || null,
        is_published: isPublished,
        elearning_class_id: classId,
      };

      if (material) {
        await updateMaterial.mutateAsync({ id: material.id, ...data });
        toast({ title: 'Sukses', description: 'Materi berhasil diperbarui' });
      } else {
        await createMaterial.mutateAsync(data);
        toast({ title: 'Sukses', description: 'Materi berhasil ditambahkan' });
      }
      onSuccess();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan materi', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Judul Materi</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan judul materi..."
        />
      </div>

      {/* LLO Selection */}
      <div className="space-y-2">
        <Label>Sub-CPMK (Opsional)</Label>
        <Select value={selectedLloId} onValueChange={setSelectedLloId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih Sub-CPMK..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tidak ada</SelectItem>
            {typedLlos.map((llo) => (
              <SelectItem key={llo.id} value={llo.id}>
                {llo.code} - {llo.description.substring(0, 50)}...
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedLlo?.indikator && selectedLlo.indikator.length > 0 && (
          <div className="p-3 bg-muted rounded-lg mt-2">
            <p className="text-sm font-medium mb-2">Indikator:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {selectedLlo.indikator.map((ind, idx) => (
                <li key={idx}>• {ind}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Content Type Tabs */}
      <Tabs value={contentType} onValueChange={(v) => setContentType(v as typeof contentType)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Teks
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Gambar
          </TabsTrigger>
          <TabsTrigger value="document" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Dokumen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4">
          {/* AI Generation */}
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <Label className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generate dengan AI
            </Label>
            <div className="flex gap-2">
              <Input
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Masukkan topik atau biarkan kosong untuk menggunakan Sub-CPMK..."
                className="flex-1"
              />
              <Button onClick={handleGenerateWithAI} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Konten Materi (HTML)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Masukkan konten materi dalam format HTML..."
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          {content && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div 
                className="p-4 border rounded-lg prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <div className="space-y-2">
            <Label>URL Video (YouTube/Vimeo)</Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          {fileUrl && fileUrl.includes('youtube') && (
            <div className="aspect-video">
              <iframe
                src={fileUrl.replace('watch?v=', 'embed/')}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="image" className="space-y-4">
          <div className="space-y-2">
            <Label>URL Gambar</Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          {fileUrl && (
            <img src={fileUrl} alt="Preview" className="max-w-full rounded-lg" />
          )}
        </TabsContent>

        <TabsContent value="document" className="space-y-4">
          <div className="space-y-2">
            <Label>URL Dokumen (Google Drive/PDF)</Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Publish Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label>Publikasikan Materi</Label>
          <p className="text-sm text-muted-foreground">Materi yang dipublikasikan dapat dilihat oleh mahasiswa</p>
        </div>
        <Switch checked={isPublished} onCheckedChange={setIsPublished} />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onSuccess}>Batal</Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {material ? 'Perbarui Materi' : 'Simpan Materi'}
        </Button>
      </div>
    </div>
  );
}
