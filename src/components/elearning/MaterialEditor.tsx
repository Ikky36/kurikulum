import { useState } from 'react';
import { 
  useCreateMaterial, 
  useUpdateMaterial, 
  useCourseLLOs, 
  useElearningMaterials,
  useElearningAssignments,
  type ElearningMaterial 
} from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, ChevronDown, Lock, BookOpen, ClipboardCheck, Sparkles } from 'lucide-react';
import { AdvancedRichEditor } from './AdvancedRichEditor';
import { AIContentGenerator } from './AIContentGenerator';

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

type MaterialWithPrereqs = ElearningMaterial & {
  prerequisite_material_id?: string | null;
  prerequisite_assignment_id?: string | null;
};

export function MaterialEditor({ classId, courseId, material, onSuccess }: MaterialEditorProps) {
  const { toast } = useToast();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const { data: llos } = useCourseLLOs(courseId);
  const { data: materials } = useElearningMaterials(classId);
  const { data: assignments } = useElearningAssignments(classId);

  const extendedMaterial = material as MaterialWithPrereqs | null;

  const [title, setTitle] = useState(material?.title || '');
  const [content, setContent] = useState(material?.content || '');
  const [selectedLloId, setSelectedLloId] = useState(material?.llo_id || '');
  const [isPublished, setIsPublished] = useState(material?.is_published || false);
  const [prerequisiteMaterialId, setPrerequisiteMaterialId] = useState(extendedMaterial?.prerequisite_material_id || '');
  const [prerequisiteAssignmentId, setPrerequisiteAssignmentId] = useState(extendedMaterial?.prerequisite_assignment_id || '');
  const [showAI, setShowAI] = useState(false);
  const [showPrerequisites, setShowPrerequisites] = useState(false);

  const typedLlos = (llos || []) as LLOWithCLO[];
  const selectedLlo = typedLlos.find(l => l.id === selectedLloId);
  const isLoading = createMaterial.isPending || updateMaterial.isPending;

  // Filter out current material from prerequisites
  const otherMaterials = (materials || []).filter(m => m.id !== material?.id);

  const handleAIGenerated = (generatedContent: string) => {
    setContent(generatedContent);
    if (!title && selectedLlo) {
      setTitle(`Materi ${selectedLlo.code}`);
    }
    setShowAI(false);
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
      const data: any = {
        title,
        content_type: 'text' as const,
        content,
        file_url: null,
        llo_id: selectedLloId || null,
        is_published: isPublished,
        elearning_class_id: classId,
        prerequisite_material_id: prerequisiteMaterialId || null,
        prerequisite_assignment_id: prerequisiteAssignmentId || null,
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
        <Label htmlFor="title" className="text-base font-medium">Judul Materi</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan judul materi..."
          className="h-12 text-base"
        />
      </div>

      {/* LLO Selection */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Sub-CPMK (Opsional)</Label>
        <Select value={selectedLloId || "__none__"} onValueChange={(v) => setSelectedLloId(v === "__none__" ? "" : v)}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Pilih Sub-CPMK..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Tidak ada</SelectItem>
            {typedLlos.map((llo) => (
              <SelectItem key={llo.id} value={llo.id}>
                <span className="font-medium">{llo.code}</span> - {llo.description.substring(0, 50)}...
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedLlo?.indikator && selectedLlo.indikator.length > 0 && (
          <Card className="mt-3 bg-primary/5 border-primary/20">
            <CardContent className="py-3">
              <p className="text-sm font-medium mb-2">Indikator:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {selectedLlo.indikator.map((ind, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {ind}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Prerequisites */}
      <Collapsible open={showPrerequisites} onOpenChange={setShowPrerequisites}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-12">
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Prasyarat (Konten Bersyarat)
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showPrerequisites ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <Card className="bg-muted/50">
            <CardContent className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Mahasiswa harus menyelesaikan salah satu prasyarat berikut sebelum dapat mengakses materi ini.
              </p>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Prasyarat Materi
                </Label>
                <Select 
                  value={prerequisiteMaterialId || "__none__"} 
                  onValueChange={(v) => setPrerequisiteMaterialId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih materi prasyarat..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tidak ada</SelectItem>
                    {otherMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Prasyarat Tugas/Quiz
                </Label>
                <Select 
                  value={prerequisiteAssignmentId || "__none__"} 
                  onValueChange={(v) => setPrerequisiteAssignmentId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tugas/quiz prasyarat..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tidak ada</SelectItem>
                    {(assignments || []).map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* AI Content Generation */}
      <Collapsible open={showAI} onOpenChange={setShowAI}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-12 border-primary/30 hover:border-primary">
            <span className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              Generate Materi dengan AI
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAI ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <AIContentGenerator
            type="material"
            onGenerated={handleAIGenerated}
            defaultTopic={selectedLlo ? `${selectedLlo.code}: ${selectedLlo.description}` : ''}
            indicators={selectedLlo?.indikator || []}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Advanced Rich Content Editor */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Konten Materi</Label>
        <AdvancedRichEditor value={content} onChange={setContent} />
      </div>

      {/* Preview */}
      {content && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>Preview Materi</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="py-4">
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Publish Toggle */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Publikasikan Materi</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Materi yang dipublikasikan dapat dilihat oleh mahasiswa
              </p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onSuccess} className="min-w-[100px]">
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="min-w-[140px]">
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {material ? 'Perbarui Materi' : 'Simpan Materi'}
        </Button>
      </div>
    </div>
  );
}
