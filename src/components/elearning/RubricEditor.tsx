import { useState } from 'react';
import { useUpdateRubric, useCreateCriteria, useUpdateCriteria, useDeleteCriteria } from '@/hooks/useRubrics';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface RubricEditorProps {
  rubric: {
    id: string;
    title: string;
    description: string | null;
    criteria?: Array<{
      id: string;
      criterion_name: string;
      description: string | null;
      max_score: number;
      weight_percentage: number;
      order_index: number;
      levels?: Array<{
        id: string;
        level_name: string;
        description: string | null;
        score_range_min: number;
        score_range_max: number;
        order_index: number;
      }>;
    }>;
  };
  onSuccess: () => void;
}

export function RubricEditor({ rubric, onSuccess }: RubricEditorProps) {
  const { toast } = useToast();
  const updateRubric = useUpdateRubric();
  const createCriteria = useCreateCriteria();
  const updateCriteria = useUpdateCriteria();
  const deleteCriteria = useDeleteCriteria();

  const [title, setTitle] = useState(rubric.title);
  const [description, setDescription] = useState(rubric.description || '');
  const [criteria, setCriteria] = useState(rubric.criteria || []);
  const [expandedCriteria, setExpandedCriteria] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleCriteriaExpanded = (id: string) => {
    setExpandedCriteria(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleAddCriteria = async () => {
    try {
      const newCriteria = await createCriteria.mutateAsync({
        rubric_id: rubric.id,
        criterion_name: `Kriteria ${criteria.length + 1}`,
        description: '',
        max_score: 100,
        weight_percentage: 100 / (criteria.length + 1),
        order_index: criteria.length,
      });

      // Add default levels
      const defaultLevels = [
        { level_name: 'Sangat Baik', score_range_min: 85, score_range_max: 100 },
        { level_name: 'Baik', score_range_min: 70, score_range_max: 84 },
        { level_name: 'Cukup', score_range_min: 55, score_range_max: 69 },
        { level_name: 'Kurang', score_range_min: 0, score_range_max: 54 },
      ];

      for (let i = 0; i < defaultLevels.length; i++) {
        await supabase.from('rubric_levels').insert({
          criteria_id: newCriteria.id,
          level_name: defaultLevels[i].level_name,
          score_range_min: defaultLevels[i].score_range_min,
          score_range_max: defaultLevels[i].score_range_max,
          order_index: i,
        });
      }

      setCriteria([...criteria, { 
        ...newCriteria, 
        levels: defaultLevels.map((l, i) => ({
          ...l,
          id: `temp-${i}`,
          criteria_id: newCriteria.id,
          description: null,
          order_index: i,
        }))
      }]);
      toast({ title: 'Sukses', description: 'Kriteria ditambahkan' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menambah kriteria', variant: 'destructive' });
    }
  };

  const handleDeleteCriteria = async (id: string) => {
    try {
      await deleteCriteria.mutateAsync(id);
      setCriteria(criteria.filter(c => c.id !== id));
      toast({ title: 'Sukses', description: 'Kriteria dihapus' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus kriteria', variant: 'destructive' });
    }
  };

  const handleUpdateCriteria = (id: string, field: string, value: any) => {
    setCriteria(criteria.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleUpdateLevel = (criteriaId: string, levelId: string, field: string, value: any) => {
    setCriteria(criteria.map(c => {
      if (c.id !== criteriaId) return c;
      return {
        ...c,
        levels: c.levels?.map(l => 
          l.id === levelId ? { ...l, [field]: value } : l
        ),
      };
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update rubric title and description
      await updateRubric.mutateAsync({
        id: rubric.id,
        title,
        description: description || null,
      });

      // Update each criteria
      for (const c of criteria) {
        await updateCriteria.mutateAsync({
          id: c.id,
          criterion_name: c.criterion_name,
          description: c.description,
          max_score: c.max_score,
          weight_percentage: c.weight_percentage,
          order_index: c.order_index,
        });

        // Update levels
        if (c.levels) {
          for (const level of c.levels) {
            if (!level.id.startsWith('temp-')) {
              await supabase
                .from('rubric_levels')
                .update({
                  level_name: level.level_name,
                  description: level.description,
                  score_range_min: level.score_range_min,
                  score_range_max: level.score_range_max,
                  order_index: level.order_index,
                })
                .eq('id', level.id);
            }
          }
        }
      }

      toast({ title: 'Sukses', description: 'Rubrik berhasil disimpan' });
      onSuccess();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan rubrik', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rubric Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Judul Rubrik</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Deskripsi</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi rubrik..."
          />
        </div>
      </div>

      {/* Criteria List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Kriteria Penilaian</h3>
          <Button onClick={handleAddCriteria} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Tambah Kriteria
          </Button>
        </div>

        {criteria.map((c, idx) => (
          <Collapsible
            key={c.id}
            open={expandedCriteria.includes(c.id)}
            onOpenChange={() => toggleCriteriaExpanded(c.id)}
          >
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <div className="flex-1 grid gap-3 sm:grid-cols-4">
                    <Input
                      value={c.criterion_name}
                      onChange={(e) => handleUpdateCriteria(c.id, 'criterion_name', e.target.value)}
                      placeholder="Nama Kriteria"
                      className="sm:col-span-2"
                    />
                    <Input
                      type="number"
                      value={c.max_score}
                      onChange={(e) => handleUpdateCriteria(c.id, 'max_score', parseFloat(e.target.value))}
                      placeholder="Skor Maks"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={c.weight_percentage}
                        onChange={(e) => handleUpdateCriteria(c.id, 'weight_percentage', parseFloat(e.target.value))}
                        placeholder="Bobot %"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {expandedCriteria.includes(c.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteCriteria(c.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <Textarea
                    value={c.description || ''}
                    onChange={(e) => handleUpdateCriteria(c.id, 'description', e.target.value)}
                    placeholder="Deskripsi kriteria..."
                    rows={2}
                  />

                  {/* Levels */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Level Pencapaian</Label>
                    <div className="grid gap-2">
                      {c.levels?.map((level) => (
                        <div key={level.id} className="grid gap-2 sm:grid-cols-5 p-3 bg-muted/50 rounded-lg">
                          <Input
                            value={level.level_name}
                            onChange={(e) => handleUpdateLevel(c.id, level.id, 'level_name', e.target.value)}
                            placeholder="Nama Level"
                          />
                          <Input
                            value={level.description || ''}
                            onChange={(e) => handleUpdateLevel(c.id, level.id, 'description', e.target.value)}
                            placeholder="Deskripsi"
                            className="sm:col-span-2"
                          />
                          <Input
                            type="number"
                            value={level.score_range_min}
                            onChange={(e) => handleUpdateLevel(c.id, level.id, 'score_range_min', parseFloat(e.target.value))}
                            placeholder="Min"
                          />
                          <Input
                            type="number"
                            value={level.score_range_max}
                            onChange={(e) => handleUpdateLevel(c.id, level.id, 'score_range_max', parseFloat(e.target.value))}
                            placeholder="Max"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onSuccess}>
          Batal
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>
    </div>
  );
}
