import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSameCourseClasses, useSourceMaterials, useSourceAssignments, useImportMaterials, useImportAssignments } from '@/hooks/useContentImport';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Download, BookOpen, ClipboardCheck, HelpCircle, FileUp, Loader2, Search, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentImportDialogProps {
  courseId: string;
  targetClassId: string;
  defaultTab?: 'materials' | 'assignments';
  onSuccess?: () => void;
}

// Hook to fetch question counts for quiz assignments
function useQuizQuestionCounts(assignmentIds: string[]) {
  return useQuery({
    queryKey: ['quiz-question-counts', assignmentIds],
    queryFn: async () => {
      if (assignmentIds.length === 0) return {};
      const { data, error } = await supabase
        .from('elearning_quiz_questions')
        .select('assignment_id')
        .in('assignment_id', assignmentIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(q => {
        counts[q.assignment_id] = (counts[q.assignment_id] || 0) + 1;
      });
      return counts;
    },
    enabled: assignmentIds.length > 0,
  });
}

export function ContentImportDialog({ courseId, targetClassId, defaultTab = 'materials', onSuccess }: ContentImportDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [sourceClassId, setSourceClassId] = useState<string>('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [materialSearch, setMaterialSearch] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  const { data: otherClasses, isLoading: classesLoading } = useSameCourseClasses(courseId, targetClassId);
  const { data: sourceMaterials, isLoading: materialsLoading } = useSourceMaterials(sourceClassId);
  const { data: sourceAssignments, isLoading: assignmentsLoading } = useSourceAssignments(sourceClassId);

  // Get quiz assignment IDs to fetch question counts
  const quizAssignmentIds = (sourceAssignments || [])
    .filter(a => a.assignment_type === 'quiz')
    .map(a => a.id);
  const { data: questionCounts } = useQuizQuestionCounts(quizAssignmentIds);

  const importMaterials = useImportMaterials();
  const importAssignments = useImportAssignments();

  const isImporting = importMaterials.isPending || importAssignments.isPending;

  // Reset active tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const handleSourceClassChange = (classId: string) => {
    setSourceClassId(classId);
    setSelectedMaterials([]);
    setSelectedAssignments([]);
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterials(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleAssignment = (id: string) => {
    setSelectedAssignments(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const selectAllMaterials = () => {
    if (selectedMaterials.length === sourceMaterials?.length) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(sourceMaterials?.map(m => m.id) || []);
    }
  };

  const selectAllAssignments = () => {
    if (selectedAssignments.length === sourceAssignments?.length) {
      setSelectedAssignments([]);
    } else {
      setSelectedAssignments(sourceAssignments?.map(a => a.id) || []);
    }
  };

  const handleImport = async () => {
    try {
      let importedMaterials = 0;
      let importedAssignments = 0;

      if (selectedMaterials.length > 0) {
        await importMaterials.mutateAsync({
          sourceClassId,
          targetClassId,
          materialIds: selectedMaterials,
        });
        importedMaterials = selectedMaterials.length;
      }

      if (selectedAssignments.length > 0) {
        await importAssignments.mutateAsync({
          sourceClassId,
          targetClassId,
          assignmentIds: selectedAssignments,
          includeQuestions,
        });
        importedAssignments = selectedAssignments.length;
      }

      toast({
        title: 'Import Berhasil',
        description: `${importedMaterials > 0 ? `${importedMaterials} materi` : ''}${importedMaterials > 0 && importedAssignments > 0 ? ' dan ' : ''}${importedAssignments > 0 ? `${importedAssignments} tugas/quiz` : ''} berhasil diimport.`,
      });

      setOpen(false);
      setSourceClassId('');
      setSelectedMaterials([]);
      setSelectedAssignments([]);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengimport konten. Silakan coba lagi.',
        variant: 'destructive',
      });
    }
  };

  const getAssignmentIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <HelpCircle className="h-4 w-4" />;
      case 'file_upload': return <FileUp className="h-4 w-4" />;
      default: return <ClipboardCheck className="h-4 w-4" />;
    }
  };

  const getAssignmentTypeLabel = (assignment: any) => {
    if (assignment.assignment_type === 'quiz') return 'Quiz';
    if (assignment.submission_type === 'file_upload') return 'Upload File';
    if (assignment.submission_type === 'link_document') return 'Link';
    return 'Tugas';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Import dari Kelas Lain
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Import Materi & Tugas dari Kelas Lain</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Class Selection */}
          <div className="space-y-2">
            <Label>Pilih Kelas Sumber</Label>
            <Popover open={classPickerOpen} onOpenChange={setClassPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {sourceClassId
                    ? (() => {
                        const c: any = otherClasses?.find((cl: any) => cl.id === sourceClassId);
                        return c ? `${c.title} - ${c.class_group_name || ''}${c.instructor_name ? ` (${c.instructor_name})` : ''}` : 'Pilih kelas...';
                      })()
                    : 'Pilih kelas dengan mata kuliah yang sama...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari kelas, mata kuliah, atau dosen..." />
                  <CommandList>
                    {classesLoading ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : (
                      <>
                        <CommandEmpty>Tidak ada kelas ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {otherClasses?.map((cls: any) => {
                            const label = `${cls.title} - ${cls.class_group_name || ''}${cls.instructor_name ? ` (${cls.instructor_name})` : ''}`;
                            return (
                              <CommandItem
                                key={cls.id}
                                value={label}
                                onSelect={() => {
                                  handleSourceClassChange(cls.id);
                                  setClassPickerOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', sourceClassId === cls.id ? 'opacity-100' : 'opacity-0')} />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Content Selection */}
          {sourceClassId && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'materials' | 'assignments')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="materials" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Materi ({sourceMaterials?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="assignments" className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Tugas/Quiz ({sourceAssignments?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="materials" className="space-y-4 mt-4">
                {materialsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : sourceMaterials?.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Tidak ada materi di kelas sumber
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari materi..."
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={selectAllMaterials}>
                        {selectedMaterials.length === sourceMaterials?.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                      </Button>
                      <Badge variant="secondary">{selectedMaterials.length} dipilih</Badge>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {sourceMaterials
                        ?.filter((m: any) => {
                          const q = materialSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (m.title || '').toLowerCase().includes(q) || (m.content_type || '').toLowerCase().includes(q);
                        })
                        .map((material) => (
                          <Card 
                            key={material.id} 
                            className={`cursor-pointer transition-colors ${selectedMaterials.includes(material.id) ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => toggleMaterial(material.id)}
                          >
                            <CardContent className="py-3 flex items-center gap-3">
                              <Checkbox
                                checked={selectedMaterials.includes(material.id)}
                                onCheckedChange={() => toggleMaterial(material.id)}
                              />
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="font-medium">{material.title}</div>
                                <div className="text-sm text-muted-foreground">{material.content_type}</div>
                              </div>
                            </CardContent>
                          </Card>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="assignments" className="space-y-4 mt-4">
                {assignmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : sourceAssignments?.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Tidak ada tugas/quiz di kelas sumber
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={selectAllAssignments}>
                          {selectedAssignments.length === sourceAssignments?.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                        </Button>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="include-questions"
                            checked={includeQuestions}
                            onCheckedChange={(checked) => setIncludeQuestions(checked as boolean)}
                          />
                          <Label htmlFor="include-questions" className="text-sm">
                            Sertakan soal quiz
                          </Label>
                        </div>
                      </div>
                      <Badge variant="secondary">{selectedAssignments.length} dipilih</Badge>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {sourceAssignments?.map((assignment) => {
                        const qCount = questionCounts?.[assignment.id] || 0;
                        return (
                          <Card 
                            key={assignment.id} 
                            className={`cursor-pointer transition-colors ${selectedAssignments.includes(assignment.id) ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => toggleAssignment(assignment.id)}
                          >
                            <CardContent className="py-3 flex items-center gap-3">
                              <Checkbox
                                checked={selectedAssignments.includes(assignment.id)}
                                onCheckedChange={() => toggleAssignment(assignment.id)}
                              />
                              {getAssignmentIcon(assignment.assignment_type)}
                              <div className="flex-1">
                                <div className="font-medium">{assignment.title}</div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{getAssignmentTypeLabel(assignment)}</span>
                                  {assignment.assignment_type === 'quiz' && qCount > 0 && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      {qCount} soal
                                    </Badge>
                                  )}
                                  {assignment.time_limit_minutes && (
                                    <span>• {assignment.time_limit_minutes} menit</span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Import Button */}
          {sourceClassId && (selectedMaterials.length > 0 || selectedAssignments.length > 0) && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleImport} disabled={isImporting} className="gap-2">
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengimport...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Import {selectedMaterials.length + selectedAssignments.length} Item
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
