import { useState } from 'react';
import { useElearningMaterials, useDeleteMaterial, type ElearningMaterial } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, FileText, Video, Image, Trash2, Pencil, Eye, Plus, GripVertical, Lock, CheckCircle, Box, Maximize2 } from 'lucide-react';
import { MaterialEditor } from './MaterialEditor';
import { H5PViewer } from './H5PViewer';
import { MaterialQuiz } from './MaterialQuiz';
import { MaterialFullViewer } from './MaterialFullViewer';
import { containsArabic } from '@/components/ui/arabic-text';
import type { MaterialSection } from './MaterialSectionEditor';

interface MaterialListProps {
  classId: string;
  courseId: string;
  canEdit: boolean;
}

type MaterialWithLLO = Omit<ElearningMaterial, 'sections'> & {
  llo?: { id: string; code: string; description: string } | null;
  prerequisite_material_id?: string | null;
  prerequisite_assignment_id?: string | null;
  sections?: MaterialSection[] | null;
};

export function MaterialList({ classId, courseId, canEdit }: MaterialListProps) {
  const { toast } = useToast();
  const { data: materials, isLoading } = useElearningMaterials(classId);
  const deleteMaterial = useDeleteMaterial();
  
  const [showEditor, setShowEditor] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialWithLLO | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<MaterialWithLLO | null>(null);
  const [fullViewMaterial, setFullViewMaterial] = useState<MaterialWithLLO | null>(null);

  // Parse materials and handle sections type conversion
  const typedMaterials: MaterialWithLLO[] = (materials || []).map((m: any) => ({
    ...m,
    sections: Array.isArray(m.sections) ? m.sections as MaterialSection[] : null,
  }));

  const handleDelete = async (id: string) => {
    try {
      await deleteMaterial.mutateAsync(id);
      toast({ title: 'Sukses', description: 'Materi berhasil dihapus' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus materi', variant: 'destructive' });
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5" />;
      case 'image': return <Image className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      case 'h5p': return <Box className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  // Extract embedded quiz ID from content
  const getEmbeddedQuizId = (content: string | null): string | null => {
    if (!content) return null;
    const match = content.match(/<!-- EMBEDDED_QUIZ:(.+?) -->/);
    return match ? match[1] : null;
  };

  const hasPrerequisite = (material: MaterialWithLLO) => {
    return material.prerequisite_material_id || material.prerequisite_assignment_id;
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
            onClick={() => { setEditingMaterial(null); setShowEditor(true); }}
            size="lg"
            className="gap-2 shadow-md"
          >
            <Plus className="h-5 w-5" />
            Tambah Materi
          </Button>
        </div>
      )}

      {typedMaterials.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Belum Ada Materi</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Mulai dengan menambahkan materi pembelajaran pertama. Anda dapat menggunakan AI untuk membantu membuat konten.
            </p>
            {canEdit && (
              <Button onClick={() => setShowEditor(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Buat Materi Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {typedMaterials.map((material, index) => (
            <Card 
              key={material.id} 
              className="group hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="flex">
                {/* Order Indicator */}
                <div className="w-16 bg-gradient-to-b from-primary/20 to-primary/5 flex flex-col items-center justify-center gap-1 shrink-0">
                  {canEdit && <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab" />}
                  <span className="text-2xl font-bold text-primary/60">{index + 1}</span>
                </div>

                <div className="flex-1 p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                      {getContentTypeIcon(material.content_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                          {material.title}
                        </h3>
                        {hasPrerequisite(material) && (
                          <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                            <Lock className="h-3 w-3" />
                            Bersyarat
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2" dir="auto">
                        {material.content_type === 'text' 
                          ? (() => {
                              const tmp = document.createElement('div');
                              tmp.innerHTML = material.content || '';
                              return (tmp.textContent || tmp.innerText || '').trim().substring(0, 150) + '...';
                            })()
                          : material.file_url}
                      </p>
                      {material.llo && (
                        <Badge variant="secondary" className="mt-2">
                          {material.llo.code}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                    {/* Full View for multi-section materials */}
                    {material.sections && material.sections.length > 0 && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => setFullViewMaterial(material)}
                        className="gap-2"
                      >
                        <Maximize2 className="h-4 w-4" />
                        Buka Materi
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setViewingMaterial(material)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      {material.sections && material.sections.length > 0 ? 'Preview' : 'Lihat'}
                    </Button>
                    {canEdit && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setEditingMaterial(material); setShowEditor(true); }}
                          className="gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-2">
                              <Trash2 className="h-4 w-4" />
                              Hapus
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Materi?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan. Materi "{material.title}" akan dihapus permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(material.id)}
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Material Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingMaterial ? 'Edit Materi' : 'Tambah Materi Baru'}
            </DialogTitle>
          </DialogHeader>
          <MaterialEditor
            classId={classId}
            courseId={courseId}
            material={editingMaterial as any}
            onSuccess={() => {
              setShowEditor(false);
              setEditingMaterial(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Material Viewer Dialog */}
      <Dialog open={!!viewingMaterial} onOpenChange={() => setViewingMaterial(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {viewingMaterial && getContentTypeIcon(viewingMaterial.content_type)}
              </div>
              {viewingMaterial?.title}
            </DialogTitle>
          </DialogHeader>
          {viewingMaterial && (
            <div className="mt-4 space-y-4">
              {viewingMaterial.llo && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-3">
                    <p className="text-sm">
                      <span className="font-medium">Sub-CPMK:</span> {viewingMaterial.llo.code} - {viewingMaterial.llo.description}
                    </p>
                  </CardContent>
                </Card>
              )}
              {viewingMaterial.content_type === 'text' && (
                <>
                  {/* Show sections if available */}
                  {viewingMaterial.sections && viewingMaterial.sections.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Materi ini memiliki {viewingMaterial.sections.length} section
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            setViewingMaterial(null);
                            setFullViewMaterial(viewingMaterial);
                          }}
                          className="gap-2"
                        >
                          <Maximize2 className="h-4 w-4" />
                          Buka Full Mode
                        </Button>
                      </div>
                      {viewingMaterial.sections.map((section, idx) => (
                        <Card key={section.id} className="bg-muted/30">
                          <CardContent className="py-4">
                            <h4 className="font-medium mb-2">
                              Section {idx + 1}: {section.title}
                            </h4>
                            <div 
                              className="prose prose-sm max-w-none dark:prose-invert bidi-content line-clamp-3"
                              dir="auto"
                              dangerouslySetInnerHTML={{ __html: section.content?.substring(0, 200) + '...' || '' }}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert p-4 bg-muted/30 rounded-lg bidi-content"
                        dir="auto"
                        dangerouslySetInnerHTML={{ __html: viewingMaterial.content?.replace(/<!-- EMBEDDED_QUIZ:.+? -->/g, '') || '' }}
                      />
                      {/* Embedded Quiz */}
                      {getEmbeddedQuizId(viewingMaterial.content) && (
                        <div className="mt-6 pt-6 border-t">
                          <h3 className="text-lg font-semibold mb-4">Quiz Materi</h3>
                          <MaterialQuiz 
                            assignmentId={getEmbeddedQuizId(viewingMaterial.content)!}
                            assignmentTitle="Quiz Materi"
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              {viewingMaterial.content_type === 'h5p' && viewingMaterial.file_url && (
                <H5PViewer embedUrl={viewingMaterial.file_url} title={viewingMaterial.title} />
              )}
              {viewingMaterial.content_type === 'video' && viewingMaterial.file_url && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={viewingMaterial.file_url.replace('watch?v=', 'embed/')}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}
              {viewingMaterial.content_type === 'image' && viewingMaterial.file_url && (
                <img 
                  src={viewingMaterial.file_url} 
                  alt={viewingMaterial.title} 
                  className="max-w-full rounded-lg shadow-md" 
                />
              )}
              {viewingMaterial.content_type === 'document' && viewingMaterial.file_url && (
                <Card>
                  <CardContent className="py-4">
                    <a 
                      href={viewingMaterial.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <FileText className="h-5 w-5" />
                      Buka Dokumen
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full View Mode */}
      {fullViewMaterial && (
        <MaterialFullViewer
          material={fullViewMaterial}
          onClose={() => setFullViewMaterial(null)}
        />
      )}
    </div>
  );
}
