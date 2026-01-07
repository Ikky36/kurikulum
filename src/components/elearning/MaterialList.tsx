import { useState } from 'react';
import { useElearningMaterials, useDeleteMaterial, type ElearningMaterial } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, FileText, Video, Image, Trash2, Pencil, Eye, Plus, GripVertical } from 'lucide-react';
import { MaterialEditor } from './MaterialEditor';

interface MaterialListProps {
  classId: string;
  courseId: string;
  canEdit: boolean;
}

type MaterialWithLLO = ElearningMaterial & {
  llo?: { id: string; code: string; description: string } | null;
};

export function MaterialList({ classId, courseId, canEdit }: MaterialListProps) {
  const { toast } = useToast();
  const { data: materials, isLoading } = useElearningMaterials(classId);
  const deleteMaterial = useDeleteMaterial();
  
  const [showEditor, setShowEditor] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialWithLLO | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<MaterialWithLLO | null>(null);

  const typedMaterials = (materials || []) as MaterialWithLLO[];

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
      case 'video': return <Video className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingMaterial(null); setShowEditor(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Materi
          </Button>
        </div>
      )}

      {typedMaterials.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center">Belum ada materi pembelajaran</p>
            {canEdit && (
              <Button variant="outline" className="mt-4" onClick={() => setShowEditor(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Materi Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {typedMaterials.map((material, index) => (
            <Card key={material.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {canEdit && <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mt-1" />}
                    <div className="flex items-center gap-2">
                      {getContentTypeIcon(material.content_type)}
                      <CardTitle className="text-lg">{material.title}</CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={material.is_published ? 'default' : 'secondary'}>
                      {material.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    {material.llo && (
                      <Badge variant="outline">{material.llo.code}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground line-clamp-1 flex-1">
                    {material.content_type === 'text' 
                      ? material.content?.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
                      : material.file_url}
                  </p>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => setViewingMaterial(material)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingMaterial(material); setShowEditor(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
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
                              <AlertDialogAction onClick={() => handleDelete(material.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Material Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Edit Materi' : 'Tambah Materi Baru'}</DialogTitle>
          </DialogHeader>
          <MaterialEditor
            classId={classId}
            courseId={courseId}
            material={editingMaterial}
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
            <DialogTitle className="flex items-center gap-2">
              {viewingMaterial && getContentTypeIcon(viewingMaterial.content_type)}
              {viewingMaterial?.title}
            </DialogTitle>
          </DialogHeader>
          {viewingMaterial && (
            <div className="mt-4">
              {viewingMaterial.llo && (
                <Badge variant="outline" className="mb-4">
                  Sub-CPMK: {viewingMaterial.llo.code} - {viewingMaterial.llo.description}
                </Badge>
              )}
              {viewingMaterial.content_type === 'text' && (
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: viewingMaterial.content || '' }}
                />
              )}
              {viewingMaterial.content_type === 'video' && viewingMaterial.file_url && (
                <div className="aspect-video">
                  <iframe
                    src={viewingMaterial.file_url.replace('watch?v=', 'embed/')}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  />
                </div>
              )}
              {viewingMaterial.content_type === 'image' && viewingMaterial.file_url && (
                <img src={viewingMaterial.file_url} alt={viewingMaterial.title} className="max-w-full rounded-lg" />
              )}
              {viewingMaterial.content_type === 'document' && viewingMaterial.file_url && (
                <div className="p-4 bg-muted rounded-lg">
                  <a href={viewingMaterial.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Buka Dokumen
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
