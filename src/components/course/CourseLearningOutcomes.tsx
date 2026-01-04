import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, ChevronDown, Target, BookMarked, ClipboardList, AlertCircle, Link2 } from 'lucide-react';
import { CLO, LLO, Assessment, CoursePLO, PLO } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CourseLearningOutcomesProps {
  courseId: string;
  canEdit: boolean;
}

export function CourseLearningOutcomes({ courseId, canEdit }: CourseLearningOutcomesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  // CLO state
  const [showCloDialog, setShowCloDialog] = useState(false);
  const [editingClo, setEditingClo] = useState<CLO | null>(null);
  const [cloCode, setCloCode] = useState('');
  const [cloDescription, setCloDescription] = useState('');
  const [selectedPlosForClo, setSelectedPlosForClo] = useState<string[]>([]);

  // LLO state
  const [showLloDialog, setShowLloDialog] = useState(false);
  const [editingLlo, setEditingLlo] = useState<LLO | null>(null);
  const [lloCode, setLloCode] = useState('');
  const [lloDescription, setLloDescription] = useState('');
  const [lloWeight, setLloWeight] = useState('');
  const [selectedCloForLlo, setSelectedCloForLlo] = useState('');
  const [lloBahanKajian, setLloBahanKajian] = useState<string[]>([]);
  const [lloIndikator, setLloIndikator] = useState<string[]>([]);
  const [lloMetode, setLloMetode] = useState<string[]>([]);
  const [lloReferensi, setLloReferensi] = useState<string[]>([]);

  // Assessment state
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [assessmentCode, setAssessmentCode] = useState('');
  const [assessmentName, setAssessmentName] = useState('');
  const [assessmentDescription, setAssessmentDescription] = useState('');
  const [selectedLlosForAssessment, setSelectedLlosForAssessment] = useState<string[]>([]);

  // Fetch Course PLOs
  const { data: coursePlos } = useQuery({
    queryKey: ['course-plos', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_plos')
        .select('*, plos:plo_id(*)')
        .eq('course_id', courseId);
      if (error) throw error;
      return data.map(cp => ({
        ...cp,
        plo: cp.plos as unknown as PLO
      })) as CoursePLO[];
    },
  });

  // Fetch CLOs
  const { data: clos } = useQuery({
    queryKey: ['clos', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clos')
        .select('*')
        .eq('course_id', courseId)
        .order('code');
      if (error) throw error;
      return data as CLO[];
    },
  });

  // Fetch CLO-PLO relationships
  const { data: cloPlos, refetch: refetchCloPlos } = useQuery({
    queryKey: ['clo-plos', courseId],
    queryFn: async () => {
      if (!clos || clos.length === 0) return [];
      const { data, error } = await supabase
        .from('clo_plos')
        .select('*, plos:plo_id(*)')
        .in('clo_id', clos.map(c => c.id));
      if (error) throw error;
      return data;
    },
    enabled: !!clos && clos.length > 0,
  });

  // Fetch LLOs
  const { data: llos } = useQuery({
    queryKey: ['llos', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llos')
        .select('*, clos:clo_id(*)')
        .order('code');
      if (error) throw error;
      
      // Filter LLOs that belong to this course's CLOs
      const cloIds = clos?.map(c => c.id) || [];
      return data
        .filter(llo => cloIds.includes(llo.clo_id))
        .map(llo => ({
          ...llo,
          clo: llo.clos as unknown as CLO
        })) as LLO[];
    },
    enabled: !!clos,
  });

  // Fetch Assessments
  const { data: assessments } = useQuery({
    queryKey: ['assessments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('course_id', courseId)
        .order('code');
      if (error) throw error;
      return data as Assessment[];
    },
  });

  // Fetch Assessment-LLO links
  const { data: assessmentLlos } = useQuery({
    queryKey: ['assessment-llos', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_llos')
        .select('*, llos:llo_id(*)');
      if (error) throw error;
      return data;
    },
  });

  // Helper function to recalculate PLO weights when CLOs are added/removed
  const recalculatePloWeights = async (ploIds: string[]) => {
    for (const ploId of ploIds) {
      // Get all CLO-PLO links for this PLO
      const { data: links, error } = await supabase
        .from('clo_plos')
        .select('id')
        .eq('plo_id', ploId);
      
      if (error || !links || links.length === 0) continue;
      
      // Calculate equal weight for each CLO
      const equalWeight = 100 / links.length;
      
      // Update all links with equal weight
      await supabase
        .from('clo_plos')
        .update({ weight_percentage: equalWeight })
        .eq('plo_id', ploId);
    }
  };

  // CLO Mutations
  const createCloMutation = useMutation({
    mutationFn: async ({ ploIds, ...clo }: { code: string; description: string; course_id: string; ploIds: string[] }) => {
      const { data, error } = await supabase.from('clos').insert([clo]).select().single();
      if (error) throw error;
      
      if (ploIds.length > 0) {
        // First insert the links with placeholder weight
        const linkData = ploIds.map(ploId => ({
          clo_id: data.id,
          plo_id: ploId,
          weight_percentage: 0
        }));
        const { error: linkError } = await supabase.from('clo_plos').insert(linkData);
        if (linkError) throw linkError;
        
        // Then recalculate weights for all affected PLOs
        await recalculatePloWeights(ploIds);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clos', courseId] });
      queryClient.invalidateQueries({ queryKey: ['clo-plos', courseId] });
      toast({ title: 'Berhasil', description: 'CPMK/CLO berhasil ditambahkan' });
      resetCloForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateCloMutation = useMutation({
    mutationFn: async ({ id, ploIds, ...clo }: Partial<CLO> & { id: string; ploIds?: string[] }) => {
      const { error } = await supabase.from('clos').update(clo).eq('id', id);
      if (error) throw error;

      if (ploIds !== undefined) {
        // Get existing links
        const { data: existingLinks } = await supabase
          .from('clo_plos')
          .select('plo_id')
          .eq('clo_id', id);
        const existingPloIds = existingLinks?.map(l => l.plo_id) || [];
        
        // Delete removed links
        const { error: deleteError } = await supabase
          .from('clo_plos')
          .delete()
          .eq('clo_id', id);
        if (deleteError) throw deleteError;

        // Insert new links
        if (ploIds.length > 0) {
          const linkData = ploIds.map(ploId => ({
            clo_id: id,
            plo_id: ploId,
            weight_percentage: 0
          }));
          const { error: linkError } = await supabase.from('clo_plos').insert(linkData);
          if (linkError) throw linkError;
        }
        
        // Recalculate weights for all affected PLOs (old and new)
        const allAffectedPloIds = [...new Set([...existingPloIds, ...ploIds])];
        await recalculatePloWeights(allAffectedPloIds);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clos', courseId] });
      queryClient.invalidateQueries({ queryKey: ['clo-plos', courseId] });
      toast({ title: 'Berhasil', description: 'CPMK/CLO berhasil diperbarui' });
      resetCloForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCloMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clos', courseId] });
      queryClient.invalidateQueries({ queryKey: ['llos', courseId] });
      toast({ title: 'Berhasil', description: 'CPMK/CLO berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // LLO Mutations
  const createLloMutation = useMutation({
    mutationFn: async (llo: { 
      code: string; 
      description: string; 
      weight_percentage: number; 
      clo_id: string;
      bahan_kajian?: string[];
      indikator?: string[];
      metode?: string[];
      referensi?: string[];
    }) => {
      const { error } = await supabase.from('llos').insert([llo]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llos', courseId] });
      toast({ title: 'Berhasil', description: 'SUB-CPMK/LLO berhasil ditambahkan' });
      resetLloForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateLloMutation = useMutation({
    mutationFn: async ({ id, ...llo }: Partial<LLO> & { 
      id: string; 
      bahan_kajian?: string[];
      indikator?: string[];
      metode?: string[];
      referensi?: string[];
    }) => {
      const { error } = await supabase.from('llos').update(llo).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llos', courseId] });
      toast({ title: 'Berhasil', description: 'SUB-CPMK/LLO berhasil diperbarui' });
      resetLloForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteLloMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('llos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llos', courseId] });
      queryClient.invalidateQueries({ queryKey: ['assessment-llos', courseId] });
      toast({ title: 'Berhasil', description: 'SUB-CPMK/LLO berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Assessment Mutations
  const createAssessmentMutation = useMutation({
    mutationFn: async ({ lloIds, ...assessment }: { code: string; name: string; description?: string; course_id: string; lloIds: string[] }) => {
      const { data, error } = await supabase.from('assessments').insert([assessment]).select().single();
      if (error) throw error;
      
      if (lloIds.length > 0) {
        const linkData = lloIds.map(lloId => ({
          assessment_id: data.id,
          llo_id: lloId
        }));
        const { error: linkError } = await supabase.from('assessment_llos').insert(linkData);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['assessment-llos', courseId] });
      toast({ title: 'Berhasil', description: 'Tugas/Quiz berhasil ditambahkan' });
      resetAssessmentForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateAssessmentMutation = useMutation({
    mutationFn: async ({ id, lloIds, ...assessment }: Partial<Assessment> & { id: string; lloIds?: string[] }) => {
      const { error } = await supabase.from('assessments').update(assessment).eq('id', id);
      if (error) throw error;

      if (lloIds) {
        // Remove existing links
        const { error: deleteError } = await supabase
          .from('assessment_llos')
          .delete()
          .eq('assessment_id', id);
        if (deleteError) throw deleteError;

        // Add new links
        if (lloIds.length > 0) {
          const linkData = lloIds.map(lloId => ({
            assessment_id: id,
            llo_id: lloId
          }));
          const { error: linkError } = await supabase.from('assessment_llos').insert(linkData);
          if (linkError) throw linkError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['assessment-llos', courseId] });
      toast({ title: 'Berhasil', description: 'Tugas/Quiz berhasil diperbarui' });
      resetAssessmentForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['assessment-llos', courseId] });
      toast({ title: 'Berhasil', description: 'Tugas/Quiz berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Reset forms
  const resetCloForm = () => {
    setCloCode('');
    setCloDescription('');
    setSelectedPlosForClo([]);
    setEditingClo(null);
    setShowCloDialog(false);
  };

  const resetLloForm = () => {
    setLloCode('');
    setLloDescription('');
    setLloWeight('');
    setSelectedCloForLlo('');
    setLloBahanKajian([]);
    setLloIndikator([]);
    setLloMetode([]);
    setLloReferensi([]);
    setEditingLlo(null);
    setShowLloDialog(false);
  };

  const resetAssessmentForm = () => {
    setAssessmentCode('');
    setAssessmentName('');
    setAssessmentDescription('');
    setSelectedLlosForAssessment([]);
    setEditingAssessment(null);
    setShowAssessmentDialog(false);
  };

  // Open edit dialogs
  const openEditClo = (clo: CLO) => {
    const existingPlos = cloPlos?.filter(cp => cp.clo_id === clo.id).map(cp => cp.plo_id) || [];
    setEditingClo(clo);
    setCloCode(clo.code);
    setCloDescription(clo.description);
    setSelectedPlosForClo(existingPlos);
    setShowCloDialog(true);
  };

  const openEditLlo = (llo: LLO) => {
    const lloData = llo as LLO & { bahan_kajian?: string[]; indikator?: string[]; metode?: string[]; referensi?: string[] };
    setEditingLlo(llo);
    setLloCode(llo.code);
    setLloDescription(llo.description);
    setLloWeight(llo.weight_percentage.toString());
    setSelectedCloForLlo(llo.clo_id);
    setLloBahanKajian(lloData.bahan_kajian || []);
    setLloIndikator(lloData.indikator || []);
    setLloMetode(lloData.metode || []);
    setLloReferensi(lloData.referensi || []);
    setShowLloDialog(true);
  };

  const openEditAssessment = (assessment: Assessment) => {
    const existingLlos = assessmentLlos?.filter(al => al.assessment_id === assessment.id).map(al => al.llo_id) || [];
    setEditingAssessment(assessment);
    setAssessmentCode(assessment.code);
    setAssessmentName(assessment.name);
    setAssessmentDescription(assessment.description || '');
    setSelectedLlosForAssessment(existingLlos);
    setShowAssessmentDialog(true);
  };

  // Save handlers
  const handleSaveClo = () => {
    if (editingClo) {
      updateCloMutation.mutate({ id: editingClo.id, code: cloCode, description: cloDescription, ploIds: selectedPlosForClo });
    } else {
      createCloMutation.mutate({ code: cloCode, description: cloDescription, course_id: courseId, ploIds: selectedPlosForClo });
    }
  };

  const handleSaveLlo = () => {
    if (editingLlo) {
      updateLloMutation.mutate({ 
        id: editingLlo.id, 
        code: lloCode, 
        description: lloDescription,
        weight_percentage: parseFloat(lloWeight),
        clo_id: selectedCloForLlo,
        bahan_kajian: lloBahanKajian,
        indikator: lloIndikator,
        metode: lloMetode,
        referensi: lloReferensi
      });
    } else {
      createLloMutation.mutate({ 
        code: lloCode, 
        description: lloDescription, 
        weight_percentage: parseFloat(lloWeight),
        clo_id: selectedCloForLlo,
        bahan_kajian: lloBahanKajian,
        indikator: lloIndikator,
        metode: lloMetode,
        referensi: lloReferensi
      });
    }
  };

  const handleSaveAssessment = () => {
    if (editingAssessment) {
      updateAssessmentMutation.mutate({ 
        id: editingAssessment.id, 
        code: assessmentCode, 
        name: assessmentName,
        description: assessmentDescription || undefined,
        lloIds: selectedLlosForAssessment
      });
    } else {
      createAssessmentMutation.mutate({ 
        code: assessmentCode, 
        name: assessmentName,
        description: assessmentDescription || undefined,
        course_id: courseId,
        lloIds: selectedLlosForAssessment
      });
    }
  };

  // Get LLOs for a CLO
  const getLlosForClo = (cloId: string) => llos?.filter(llo => llo.clo_id === cloId) || [];

  // Get assessment weight (sum of related LLO weights)
  const getAssessmentWeight = (assessmentId: string) => {
    const linkedLloIds = assessmentLlos?.filter(al => al.assessment_id === assessmentId).map(al => al.llo_id) || [];
    return llos?.filter(llo => linkedLloIds.includes(llo.id)).reduce((sum, llo) => sum + llo.weight_percentage, 0) || 0;
  };

  // Get linked LLOs for assessment
  const getLinkedLlosForAssessment = (assessmentId: string) => {
    const linkedLloIds = assessmentLlos?.filter(al => al.assessment_id === assessmentId).map(al => al.llo_id) || [];
    return llos?.filter(llo => linkedLloIds.includes(llo.id)) || [];
  };

  // Calculate total LLO weight
  const totalLloWeight = llos?.reduce((sum, llo) => sum + llo.weight_percentage, 0) || 0;
  const isWeightValid = Math.abs(totalLloWeight - 100) < 0.01;

  return (
    <div className="space-y-6">
      {/* Course PLOs */}
      {coursePlos && coursePlos.length > 0 && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              CPL/PLO Terkait
            </CardTitle>
            <CardDescription>Capaian Pembelajaran Lulusan yang terkait dengan mata kuliah ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {coursePlos.map((cp) => (
                <div key={cp.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="secondary" className="font-mono shrink-0">{cp.plo?.code}</Badge>
                  <p className="text-sm text-muted-foreground">{cp.plo?.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLO Section */}
      <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-primary" />
                CPMK/CLO (Course Learning Outcomes)
              </CardTitle>
              <CardDescription>Capaian Pembelajaran Mata Kuliah</CardDescription>
            </div>
            {canEdit && (
              <Dialog open={showCloDialog} onOpenChange={(open) => { if (!open) resetCloForm(); setShowCloDialog(open); }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah CPMK
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingClo ? 'Edit CPMK/CLO' : 'Tambah CPMK/CLO Baru'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Kode CPMK</Label>
                      <Input value={cloCode} onChange={(e) => setCloCode(e.target.value)} placeholder="Contoh: CPMK-1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Rumusan CPMK/CLO</Label>
                      <Textarea value={cloDescription} onChange={(e) => setCloDescription(e.target.value)} placeholder="Rumusan CPMK/CLO..." rows={3} />
                    </div>
                    {coursePlos && coursePlos.length > 0 && (
                      <div className="space-y-2">
                        <Label>CPL/PLO Terkait</Label>
                        <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                          {coursePlos.map((cp) => (
                            <div key={cp.plo?.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`plo-${cp.plo?.id}`}
                                checked={selectedPlosForClo.includes(cp.plo?.id || '')}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPlosForClo([...selectedPlosForClo, cp.plo?.id || '']);
                                  } else {
                                    setSelectedPlosForClo(selectedPlosForClo.filter(id => id !== cp.plo?.id));
                                  }
                                }}
                              />
                              <label htmlFor={`plo-${cp.plo?.id}`} className="text-sm cursor-pointer flex-1">
                                <span className="font-mono font-medium">{cp.plo?.code}</span> - {cp.plo?.description?.substring(0, 60)}...
                              </label>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Bobot setiap CPMK terhadap CPL akan dihitung otomatis secara merata.
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveClo} disabled={!cloCode || !cloDescription}>
                      {editingClo ? 'Simpan' : 'Tambah'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {clos && clos.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-primary rounded-lg text-sm font-medium text-primary-foreground">
                <div className="col-span-1 text-center">No</div>
                <div className="col-span-2">Kode</div>
                <div className="col-span-4">CPMK/CLO</div>
                <div className="col-span-3">CPL/PLO</div>
                {canEdit && <div className="col-span-2 text-right">Aksi</div>}
              </div>
              <Accordion type="multiple" className="w-full">
              {clos.map((clo) => {
                const cloLlos = getLlosForClo(clo.id);
                const cloTotalWeight = cloLlos.reduce((sum, llo) => sum + llo.weight_percentage, 0);
                const linkedPlos = cloPlos?.filter(cp => cp.clo_id === clo.id).map(cp => ({
                  plo: cp.plos as unknown as PLO,
                  weight: Number(cp.weight_percentage) || 0
                })) || [];
                return (
                  <AccordionItem key={clo.id} value={clo.id}>
                    <AccordionTrigger className="hover:no-underline px-0">
                      <div className="grid grid-cols-12 gap-2 flex-1 text-left items-center">
                        <div className="col-span-1 text-sm text-center">{(clos?.indexOf(clo) || 0) + 1}</div>
                        <div className="col-span-2">
                          <Badge variant="secondary" className="font-mono">{clo.code}</Badge>
                        </div>
                        <div className="col-span-4 text-sm flex items-center gap-2">
                          {clo.description}
                          <Badge variant="outline" className="text-xs shrink-0">
                            {cloLlos.length} SUB-CPMK ({cloTotalWeight.toFixed(1)}%)
                          </Badge>
                        </div>
                        <div className="col-span-3 flex flex-wrap gap-1">
                          {linkedPlos.length > 0 ? (
                            linkedPlos.map((lp) => (
                              <Badge key={lp.plo?.id} variant="outline" className="text-xs bg-primary/10">
                                {lp.plo?.code} ({lp.weight.toFixed(0)}%)
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        {canEdit && (
                          <div className="col-span-2 flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditClo(clo)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCloMutation.mutate(clo.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4 pt-2 space-y-2">
                        {cloLlos.length > 0 ? (
                          <div className="space-y-2">
                            {cloLlos.map((llo) => (
                              <div key={llo.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="font-mono">{llo.code}</Badge>
                                  <span className="text-sm">{llo.description}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge>{llo.weight_percentage}%</Badge>
                                  {canEdit && (
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLlo(llo)}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLloMutation.mutate(llo.id)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Belum ada SUB-CPMK/LLO</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              </Accordion>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Belum ada CPMK/CLO. {canEdit && 'Klik "Tambah CPMK" untuk menambahkan.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* LLO Section */}
      <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                SUB-CPMK/LLO (Lesson Learning Outcomes)
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                Capaian Pembelajaran Pertemuan
                {llos && llos.length > 0 && (
                  <Badge variant={isWeightValid ? 'default' : 'destructive'} className="ml-2">
                    Total: {totalLloWeight.toFixed(1)}%
                  </Badge>
                )}
                {!isWeightValid && llos && llos.length > 0 && (
                  <span className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Total bobot harus 100%
                  </span>
                )}
              </CardDescription>
            </div>
            {canEdit && clos && clos.length > 0 && (
              <Dialog open={showLloDialog} onOpenChange={(open) => { if (!open) resetLloForm(); setShowLloDialog(open); }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah SUB-CPMK
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingLlo ? 'Edit SUB-CPMK/LLO' : 'Tambah SUB-CPMK/LLO Baru'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>CPMK/CLO Terkait</Label>
                        <Select value={selectedCloForLlo} onValueChange={setSelectedCloForLlo}>
                          <SelectTrigger><SelectValue placeholder="Pilih CPMK/CLO" /></SelectTrigger>
                          <SelectContent>
                            {clos?.map((clo) => (
                              <SelectItem key={clo.id} value={clo.id}>
                                {clo.code} - {clo.description.substring(0, 50)}...
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Kode SUB-CPMK</Label>
                        <Input value={lloCode} onChange={(e) => setLloCode(e.target.value)} placeholder="Contoh: SUB-CPMK-1.1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Rumusan SUB-CPMK/LLO</Label>
                      <Textarea value={lloDescription} onChange={(e) => setLloDescription(e.target.value)} placeholder="Rumusan SUB-CPMK/LLO..." rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bobot (%)</Label>
                      <Input type="number" min="0" max="100" step="0.1" value={lloWeight} onChange={(e) => setLloWeight(e.target.value)} placeholder="Contoh: 10" className="w-32" />
                    </div>
                    
                    {/* Bahan Kajian */}
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        Bahan Kajian
                        <Button type="button" variant="outline" size="sm" onClick={() => setLloBahanKajian([...lloBahanKajian, ''])}>
                          <Plus className="h-3 w-3 mr-1" /> Tambah
                        </Button>
                      </Label>
                      <div className="space-y-2">
                        {lloBahanKajian.map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <Input 
                              value={item} 
                              onChange={(e) => {
                                const newItems = [...lloBahanKajian];
                                newItems[index] = e.target.value;
                                setLloBahanKajian(newItems);
                              }} 
                              placeholder={`Bahan kajian ${index + 1}`}
                            />
                            <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => setLloBahanKajian(lloBahanKajian.filter((_, i) => i !== index))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Indikator */}
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        Indikator
                        <Button type="button" variant="outline" size="sm" onClick={() => setLloIndikator([...lloIndikator, ''])}>
                          <Plus className="h-3 w-3 mr-1" /> Tambah
                        </Button>
                      </Label>
                      <div className="space-y-2">
                        {lloIndikator.map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <Input 
                              value={item} 
                              onChange={(e) => {
                                const newItems = [...lloIndikator];
                                newItems[index] = e.target.value;
                                setLloIndikator(newItems);
                              }} 
                              placeholder={`Indikator ${index + 1}`}
                            />
                            <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => setLloIndikator(lloIndikator.filter((_, i) => i !== index))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metode */}
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        Metode
                        <Button type="button" variant="outline" size="sm" onClick={() => setLloMetode([...lloMetode, ''])}>
                          <Plus className="h-3 w-3 mr-1" /> Tambah
                        </Button>
                      </Label>
                      <div className="space-y-2">
                        {lloMetode.map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <Input 
                              value={item} 
                              onChange={(e) => {
                                const newItems = [...lloMetode];
                                newItems[index] = e.target.value;
                                setLloMetode(newItems);
                              }} 
                              placeholder={`Metode ${index + 1}`}
                            />
                            <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => setLloMetode(lloMetode.filter((_, i) => i !== index))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Referensi */}
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        Referensi (Link)
                        <Button type="button" variant="outline" size="sm" onClick={() => setLloReferensi([...lloReferensi, ''])}>
                          <Plus className="h-3 w-3 mr-1" /> Tambah
                        </Button>
                      </Label>
                      <div className="space-y-2">
                        {lloReferensi.map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <Input 
                              type="url"
                              value={item} 
                              onChange={(e) => {
                                const newItems = [...lloReferensi];
                                newItems[index] = e.target.value;
                                setLloReferensi(newItems);
                              }} 
                              placeholder={`https://... (Link ${index + 1})`}
                            />
                            <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => setLloReferensi(lloReferensi.filter((_, i) => i !== index))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveLlo} disabled={!lloCode || !lloDescription || !lloWeight || !selectedCloForLlo}>
                      {editingLlo ? 'Simpan' : 'Tambah'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {llos && llos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-12 text-primary-foreground">No</TableHead>
                  <TableHead className="w-28 text-primary-foreground">Kode</TableHead>
                  <TableHead className="text-primary-foreground">SUB-CPMK/LLO</TableHead>
                  <TableHead className="w-24 text-primary-foreground">CPMK</TableHead>
                  <TableHead className="text-primary-foreground">Bahan Kajian</TableHead>
                  <TableHead className="text-primary-foreground">Indikator</TableHead>
                  <TableHead className="text-primary-foreground">Metode</TableHead>
                  <TableHead className="text-primary-foreground">Referensi</TableHead>
                  <TableHead className="w-20 text-center text-primary-foreground">Bobot</TableHead>
                  {canEdit && <TableHead className="w-20 text-primary-foreground">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {llos.map((llo, index) => {
                  const lloData = llo as LLO & { bahan_kajian?: string[]; indikator?: string[]; metode?: string[]; referensi?: string[] };
                  return (
                    <TableRow key={llo.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{llo.code}</Badge></TableCell>
                      <TableCell className="text-sm max-w-xs">{llo.description}</TableCell>
                      <TableCell><Badge variant="secondary">{llo.clo?.code}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {lloData.bahan_kajian && lloData.bahan_kajian.length > 0 
                          ? lloData.bahan_kajian.map((item, i) => <div key={i} className="text-xs">• {item}</div>)
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-sm">
                        {lloData.indikator && lloData.indikator.length > 0 
                          ? lloData.indikator.map((item, i) => <div key={i} className="text-xs">• {item}</div>)
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-sm">
                        {lloData.metode && lloData.metode.length > 0 
                          ? lloData.metode.map((item, i) => <div key={i} className="text-xs">• {item}</div>)
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-sm">
                        {lloData.referensi && lloData.referensi.length > 0 
                          ? lloData.referensi.map((link, i) => (
                              <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block">
                                Link {i + 1}
                              </a>
                            ))
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge>{llo.weight_percentage}%</Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLlo(llo)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLloMutation.mutate(llo.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground text-center py-8 px-4">
              {clos && clos.length > 0 
                ? `Belum ada SUB-CPMK/LLO. ${canEdit ? 'Klik "Tambah SUB-CPMK" untuk menambahkan.' : ''}`
                : 'Tambahkan CPMK/CLO terlebih dahulu sebelum menambahkan SUB-CPMK/LLO.'
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Section */}
      <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Tugas/Quiz
              </CardTitle>
              <CardDescription>Penilaian yang terkait dengan SUB-CPMK/LLO</CardDescription>
            </div>
            {canEdit && llos && llos.length > 0 && (
              <Dialog open={showAssessmentDialog} onOpenChange={(open) => { if (!open) resetAssessmentForm(); setShowAssessmentDialog(open); }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Tugas/Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingAssessment ? 'Edit Tugas/Quiz' : 'Tambah Tugas/Quiz Baru'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kode</Label>
                        <Input value={assessmentCode} onChange={(e) => setAssessmentCode(e.target.value)} placeholder="T1" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <Input value={assessmentName} onChange={(e) => setAssessmentName(e.target.value)} placeholder="Tugas 1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Deskripsi (Opsional)</Label>
                      <Textarea value={assessmentDescription} onChange={(e) => setAssessmentDescription(e.target.value)} placeholder="Deskripsi tugas..." rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>SUB-CPMK/LLO Terkait</Label>
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {llos?.map((llo) => (
                          <div key={llo.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`llo-${llo.id}`}
                              checked={selectedLlosForAssessment.includes(llo.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedLlosForAssessment([...selectedLlosForAssessment, llo.id]);
                                } else {
                                  setSelectedLlosForAssessment(selectedLlosForAssessment.filter(id => id !== llo.id));
                                }
                              }}
                            />
                            <label htmlFor={`llo-${llo.id}`} className="text-sm cursor-pointer flex-1">
                              <span className="font-mono font-medium">{llo.code}</span> ({llo.weight_percentage}%) - {llo.description.substring(0, 40)}...
                            </label>
                          </div>
                        ))}
                      </div>
                      {selectedLlosForAssessment.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Total bobot: {llos?.filter(llo => selectedLlosForAssessment.includes(llo.id)).reduce((sum, llo) => sum + llo.weight_percentage, 0).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveAssessment} disabled={!assessmentCode || !assessmentName}>
                      {editingAssessment ? 'Simpan' : 'Tambah'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {assessments && assessments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-12 text-primary-foreground">No</TableHead>
                  <TableHead className="w-20 text-primary-foreground">Kode</TableHead>
                  <TableHead className="text-primary-foreground">Nama</TableHead>
                  <TableHead className="text-primary-foreground">SUB-CPMK Terkait</TableHead>
                  <TableHead className="w-24 text-center text-primary-foreground">Bobot</TableHead>
                  {canEdit && <TableHead className="w-20 text-primary-foreground">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment, index) => {
                  const linkedLlos = getLinkedLlosForAssessment(assessment.id);
                  const weight = getAssessmentWeight(assessment.id);
                  return (
                    <TableRow key={assessment.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{assessment.code}</Badge></TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{assessment.name}</span>
                          {assessment.description && (
                            <p className="text-xs text-muted-foreground">{assessment.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {linkedLlos.length > 0 ? (
                            linkedLlos.map(llo => (
                              <Badge key={llo.id} variant="secondary" className="text-xs">
                                {llo.code}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={weight > 0 ? 'default' : 'outline'}>{weight.toFixed(1)}%</Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAssessment(assessment)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAssessmentMutation.mutate(assessment.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground text-center py-8 px-4">
              {llos && llos.length > 0 
                ? `Belum ada Tugas/Quiz. ${canEdit ? 'Klik "Tambah Tugas/Quiz" untuk menambahkan.' : ''}`
                : 'Tambahkan SUB-CPMK/LLO terlebih dahulu sebelum menambahkan Tugas/Quiz.'
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
