import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateSubmission, useUpdateSubmission } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link2, Send, Eye, Loader2, CheckCircle } from 'lucide-react';
import { LinkPreviewEmbed, parseLinkInfo } from './LinkPreviewEmbed';

interface LinkSubmissionFormProps {
  assignmentId: string;
  assignmentTitle: string;
  existingSubmission?: {
    id: string;
    submission_url: string | null;
    submission_content: string | null;
    submitted_at: string;
    score: number | null;
    feedback: string | null;
  } | null;
  onSuccess?: () => void;
}

export function LinkSubmissionForm({ 
  assignmentId, 
  assignmentTitle,
  existingSubmission,
  onSuccess 
}: LinkSubmissionFormProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const createSubmission = useCreateSubmission();
  const updateSubmission = useUpdateSubmission();
  
  const [linkUrl, setLinkUrl] = useState(existingSubmission?.submission_url || '');
  const [notes, setNotes] = useState(existingSubmission?.submission_content || '');
  const [showPreview, setShowPreview] = useState(false);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Get dynamic preview title based on link type
  const getPreviewTitle = (url: string) => {
    if (!isValidUrl(url)) return 'Preview';
    const linkInfo = parseLinkInfo(url);
    switch (linkInfo.category) {
      case 'video': return 'Preview Video';
      case 'audio': return 'Preview Audio';
      case 'image': return 'Preview Gambar';
      case 'document': return 'Preview Dokumen';
      default: return 'Preview Link';
    }
  };

  const handleSubmit = async () => {
    if (!profile?.id) {
      toast({ title: 'Error', description: 'Anda harus login terlebih dahulu', variant: 'destructive' });
      return;
    }

    if (!linkUrl.trim()) {
      toast({ title: 'Error', description: 'Masukkan URL link', variant: 'destructive' });
      return;
    }

    if (!isValidUrl(linkUrl)) {
      toast({ title: 'Error', description: 'Format URL tidak valid', variant: 'destructive' });
      return;
    }

    try {
      if (existingSubmission?.id) {
        // Update existing submission
        await updateSubmission.mutateAsync({
          id: existingSubmission.id,
          submission_url: linkUrl.trim(),
          submission_content: notes.trim() || null,
          submitted_at: new Date().toISOString(),
        });
      } else {
        // Create new submission
        await createSubmission.mutateAsync({
          assignment_id: assignmentId,
          student_profile_id: profile.id,
          submission_url: linkUrl.trim(),
          submission_content: notes.trim() || null,
          submitted_at: new Date().toISOString(),
        });
      }

      toast({ title: 'Sukses', description: existingSubmission ? 'Tugas berhasil diperbarui' : 'Tugas berhasil dikumpulkan' });
      onSuccess?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal mengirim tugas', variant: 'destructive' });
    }
  };

  // Already submitted and graded
  if (existingSubmission?.score !== null && existingSubmission?.score !== undefined) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            Tugas Sudah Dinilai
          </CardTitle>
          <CardDescription>
            Nilai: <span className="font-semibold text-foreground">{existingSubmission.score}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingSubmission.submission_url && (
            <LinkPreviewEmbed 
              url={existingSubmission.submission_url} 
              title="Link yang dikumpulkan"
            />
          )}
          {existingSubmission.feedback && (
            <div className="p-4 rounded-lg bg-muted">
              <Label className="text-sm font-medium">Feedback Dosen:</Label>
              <p className="mt-1 text-sm">{existingSubmission.feedback}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Link2 className="h-4 w-4 sm:h-5 sm:w-5" />
          Kumpulkan Tugas Link
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Masukkan link dokumen/file yang ingin dikumpulkan. Mendukung Google Docs, Drive, YouTube, dan lainnya.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <Label htmlFor="link-url" className="text-sm">URL Link *</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="link-url"
              type="url"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setShowPreview(false);
              }}
              className="flex-1 text-sm"
            />
            {isValidUrl(linkUrl) && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPreview(!showPreview)}
                className="gap-1.5 shrink-0 w-full sm:w-auto"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'Sembunyikan' : 'Preview'}
              </Button>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Pastikan link dapat diakses oleh dosen (share: "Anyone with the link")
          </p>
        </div>

        {showPreview && isValidUrl(linkUrl) && (
          <LinkPreviewEmbed url={linkUrl} title={getPreviewTitle(linkUrl)} showInlinePreview />
        )}

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm">Catatan (Opsional)</Label>
          <Textarea
            id="notes"
            placeholder="Tambahkan catatan untuk dosen..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        <div className="flex justify-center gap-2 pt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={!linkUrl.trim() || !isValidUrl(linkUrl) || createSubmission.isPending || updateSubmission.isPending}
            className="gap-2 w-full sm:w-auto"
            size="default"
          >
            {(createSubmission.isPending || updateSubmission.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {existingSubmission ? 'Perbarui' : 'Kumpulkan Tugas'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
