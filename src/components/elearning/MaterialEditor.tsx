import { useState } from 'react';
import { useCreateMaterial, useUpdateMaterial, useCourseLLOs, useAIGeneration, type ElearningMaterial } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2 } from 'lucide-react';
import { RichContentEditor } from './RichContentEditor';

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
  const [content, setContent] = useState(material?.content || '');
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

    if (!content.trim()) {
      toast({ title: 'Error', description: 'Konten materi harus diisi', variant: 'destructive' });
      return;
    }

    try {
      const data = {
        title,
        content_type: 'text' as const,
        content,
        file_url: null,
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
        <Select value={selectedLloId || "__none__"} onValueChange={(v) => setSelectedLloId(v === "__none__" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih Sub-CPMK..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Tidak ada</SelectItem>
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

      {/* Rich Content Editor - Combined text, image, video */}
      <div className="space-y-2">
        <Label>Konten Materi (Teks, Gambar, Video)</Label>
        <RichContentEditor value={content} onChange={setContent} />
      </div>

      {/* Preview */}
      {content && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div 
            className="p-4 border rounded-lg prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}

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
