import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateSubmission } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link2, Send, Eye, Loader2, CheckCircle } from 'lucide-react';
import { LinkPreviewEmbed } from './LinkPreviewEmbed';

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
      await createSubmission.mutateAsync({
        assignment_id: assignmentId,
        student_profile_id: profile.id,
        submission_url: linkUrl.trim(),
        submission_content: notes.trim() || null,
        submitted_at: new Date().toISOString(),
      });

      toast({ title: 'Sukses', description: 'Tugas berhasil dikumpulkan' });
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Kumpulkan Tugas Link
        </CardTitle>
        <CardDescription>
          Masukkan link dokumen/file yang ingin dikumpulkan. Mendukung Google Docs, Drive, YouTube, dan lainnya.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="link-url">URL Link *</Label>
          <div className="flex gap-2">
            <Input
              id="link-url"
              type="url"
              placeholder="https://docs.google.com/document/d/..."
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setShowPreview(false);
              }}
              className="flex-1"
            />
            {isValidUrl(linkUrl) && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPreview(!showPreview)}
                className="gap-1.5 shrink-0"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'Sembunyikan' : 'Preview'}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Pastikan link dapat diakses oleh dosen (share settings: "Anyone with the link")
          </p>
        </div>

        {showPreview && isValidUrl(linkUrl) && (
          <LinkPreviewEmbed url={linkUrl} title="Preview Dokumen" />
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Catatan (Opsional)</Label>
          <Textarea
            id="notes"
            placeholder="Tambahkan catatan atau keterangan untuk dosen..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={!linkUrl.trim() || !isValidUrl(linkUrl) || createSubmission.isPending}
            className="gap-2"
          >
            {createSubmission.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {existingSubmission ? 'Perbarui Submission' : 'Kumpulkan Tugas'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
