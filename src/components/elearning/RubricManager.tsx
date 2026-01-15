import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRubrics, useDeleteRubric, useCreateRubric, useBatchCreateCriteria } from '@/hooks/useRubrics';
import { useElearningAssignments } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Plus, Trash2, Pencil, Eye, Target, Scale } from 'lucide-react';
import { RubricEditor } from './RubricEditor';
import { RubricScorer } from './RubricScorer';

interface RubricManagerProps {
  classId: string;
  courseId: string;
  canEdit: boolean;
}

type RubricWithRelations = {
  id: string;
  title: string;
  description: string | null;
  elearning_class_id: string;
  assignment_id: string | null;
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
  created_by?: { id: string; full_name: string } | null;
  assignment?: { id: string; title: string } | null;
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

export function RubricManager({ classId, courseId, canEdit }: RubricManagerProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { data: rubrics, isLoading } = useRubrics(classId);
  const { data: assignments } = useElearningAssignments(classId);
  const deleteRubric = useDeleteRubric();
  const createRubric = useCreateRubric();
  const batchCreateCriteria = useBatchCreateCriteria();

  const [showCreator, setShowCreator] = useState(false);
  const [editingRubric, setEditingRubric] = useState<RubricWithRelations | null>(null);
  const [scoringRubric, setScoringRubric] = useState<RubricWithRelations | null>(null);
  const [newRubric, setNewRubric] = useState({
    title: '',
    description: '',
    assignment_id: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const typedRubrics = (rubrics || []) as RubricWithRelations[];

  const handleDelete = async (id: string) => {
    try {
      await deleteRubric.mutateAsync(id);
      toast({ title: 'Sukses', description: 'Rubrik berhasil dihapus' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus rubrik', variant: 'destructive' });
    }
  };

  const handleCreateRubric = async () => {
    if (!newRubric.title.trim()) {
      toast({ title: 'Error', description: 'Judul rubrik harus diisi', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      // Create the rubric
      const rubric = await createRubric.mutateAsync({
        elearning_class_id: classId,
        title: newRubric.title,
        description: newRubric.description || null,
        assignment_id: newRubric.assignment_id || null,
        created_by_profile_id: profile!.id,
      });

      // Create default criteria with levels
      await batchCreateCriteria.mutateAsync({
        rubricId: rubric.id,
        criteria: [
          {
            criterion_name: 'Kriteria 1',
            description: 'Deskripsi kriteria pertama',
            max_score: 100,
            weight_percentage: 100,
            order_index: 0,
            levels: [
              { level_name: 'Sangat Baik', description: 'Memenuhi semua aspek dengan sangat baik', score_range_min: 85, score_range_max: 100, order_index: 0 },
              { level_name: 'Baik', description: 'Memenuhi sebagian besar aspek', score_range_min: 70, score_range_max: 84, order_index: 1 },
              { level_name: 'Cukup', description: 'Memenuhi sebagian aspek', score_range_min: 55, score_range_max: 69, order_index: 2 },
              { level_name: 'Kurang', description: 'Kurang memenuhi aspek', score_range_min: 0, score_range_max: 54, order_index: 3 },
            ],
          },
        ],
      });

      toast({ title: 'Sukses', description: 'Rubrik berhasil dibuat' });
      setShowCreator(false);
      setNewRubric({ title: '', description: '', assignment_id: '' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal membuat rubrik', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex justify-end">
          <Button 
            onClick={() => setShowCreator(true)}
            size="lg"
            className="gap-2 shadow-md"
          >
            <Plus className="h-5 w-5" />
            Buat Rubrik Penilaian
          </Button>
        </div>
      )}

      {typedRubrics.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <ClipboardList className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Belum Ada Rubrik Penilaian</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Buat rubrik penilaian untuk menilai tugas atau portofolio mahasiswa dengan kriteria yang terstruktur.
            </p>
            {canEdit && (
              <Button onClick={() => setShowCreator(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Buat Rubrik Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {typedRubrics.map((rubric) => (
            <Card key={rubric.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300" />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-3 rounded-xl shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Scale className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {rubric.title}
                      </CardTitle>
                      {rubric.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {rubric.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <Badge variant="secondary" className="gap-1">
                    <Target className="h-3 w-3" />
                    {rubric.criteria?.length || 0} Kriteria
                  </Badge>
                  {rubric.assignment && (
                    <Badge variant="outline" className="gap-1">
                      Terkait: {rubric.assignment.title}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Dibuat oleh: {rubric.created_by?.full_name || 'Unknown'}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setScoringRubric(rubric)}
                    className="gap-1"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Nilai
                  </Button>
                  {canEdit && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEditingRubric(rubric)}
                        className="gap-1"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Rubrik?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tindakan ini tidak dapat dibatalkan. "{rubric.title}" akan dihapus permanen beserta semua kriteria dan nilai.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(rubric.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Rubric Dialog */}
      <Dialog open={showCreator} onOpenChange={setShowCreator}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Buat Rubrik Penilaian Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rubric-title">Judul Rubrik *</Label>
              <Input
                id="rubric-title"
                placeholder="Contoh: Rubrik Presentasi"
                value={newRubric.title}
                onChange={(e) => setNewRubric({ ...newRubric, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rubric-description">Deskripsi</Label>
              <Textarea
                id="rubric-description"
                placeholder="Deskripsi rubrik penilaian..."
                value={newRubric.description}
                onChange={(e) => setNewRubric({ ...newRubric, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rubric-assignment">Terkait Tugas/Quiz (Opsional)</Label>
              <Select 
                value={newRubric.assignment_id} 
                onValueChange={(value) => setNewRubric({ ...newRubric, assignment_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tugas/quiz..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak terkait tugas</SelectItem>
                  {assignments?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreator(false)}>
                Batal
              </Button>
              <Button onClick={handleCreateRubric} disabled={isCreating}>
                {isCreating ? 'Membuat...' : 'Buat Rubrik'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Rubric Dialog */}
      <Dialog open={!!editingRubric} onOpenChange={() => setEditingRubric(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Rubrik: {editingRubric?.title}</DialogTitle>
          </DialogHeader>
          {editingRubric && (
            <RubricEditor
              rubric={editingRubric}
              onSuccess={() => setEditingRubric(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Scoring Dialog */}
      <Dialog open={!!scoringRubric} onOpenChange={() => setScoringRubric(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Penilaian: {scoringRubric?.title}</DialogTitle>
          </DialogHeader>
          {scoringRubric && (
            <RubricScorer
              rubric={scoringRubric}
              classId={classId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
