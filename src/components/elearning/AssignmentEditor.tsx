import { useState } from 'react';
import { useCreateAssignment, useUpdateAssignment, useCourseLLOs, type ElearningAssignment } from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AssignmentEditorProps {
  classId: string;
  courseId: string;
  assignment?: ElearningAssignment | null;
  onSuccess: () => void;
}

export function AssignmentEditor({ classId, courseId, assignment, onSuccess }: AssignmentEditorProps) {
  const { toast } = useToast();
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const { data: llos } = useCourseLLOs(courseId);

  const [title, setTitle] = useState(assignment?.title || '');
  const [description, setDescription] = useState(assignment?.description || '');
  const [assignmentType, setAssignmentType] = useState(assignment?.assignment_type || 'quiz');
  const [dueDate, setDueDate] = useState(assignment?.due_date?.slice(0, 16) || '');
  const [maxAttempts, setMaxAttempts] = useState(assignment?.max_attempts?.toString() || '1');
  const [timeLimit, setTimeLimit] = useState(assignment?.time_limit_minutes?.toString() || '');
  const [selectedLloId, setSelectedLloId] = useState(assignment?.llo_id || '');
  const [isPublished, setIsPublished] = useState(assignment?.is_published || false);
  const [isSafeExamMode, setIsSafeExamMode] = useState(assignment?.is_safe_exam_mode || false);

  const isLoading = createAssignment.isPending || updateAssignment.isPending;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Judul harus diisi', variant: 'destructive' });
      return;
    }

    try {
      const data = {
        title,
        description: description || null,
        assignment_type: assignmentType,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        max_attempts: maxAttempts ? parseInt(maxAttempts) : null,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
        llo_id: selectedLloId || null,
        is_published: isPublished,
        is_safe_exam_mode: isSafeExamMode,
        elearning_class_id: classId,
      };

      if (assignment) {
        await updateAssignment.mutateAsync({ id: assignment.id, ...data });
        toast({ title: 'Sukses', description: 'Tugas/Quiz berhasil diperbarui' });
      } else {
        await createAssignment.mutateAsync(data);
        toast({ title: 'Sukses', description: 'Tugas/Quiz berhasil ditambahkan' });
      }
      onSuccess();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Judul</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul tugas/quiz" />
        </div>
        <div className="space-y-2">
          <Label>Tipe</Label>
          <Select value={assignmentType} onValueChange={setAssignmentType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="file_upload">Upload File</SelectItem>
              <SelectItem value="link">Link</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Deskripsi</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi..." />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Deadline</Label>
          <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Max Percobaan</Label>
          <Input type="number" min="1" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Batas Waktu (menit)</Label>
          <Input type="number" min="1" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="Kosong = unlimited" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sub-CPMK (Opsional)</Label>
        <Select value={selectedLloId} onValueChange={setSelectedLloId}>
          <SelectTrigger><SelectValue placeholder="Pilih Sub-CPMK..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tidak ada</SelectItem>
            {(llos || []).map((llo: any) => (
              <SelectItem key={llo.id} value={llo.id}>{llo.code} - {llo.description?.substring(0, 40)}...</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div><Label>Publikasikan</Label><p className="text-xs text-muted-foreground">Mahasiswa dapat melihat</p></div>
        <Switch checked={isPublished} onCheckedChange={setIsPublished} />
      </div>

      {assignmentType === 'quiz' && (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5">
          <div><Label>Safe Exam Browser</Label><p className="text-xs text-muted-foreground">Aktifkan mode ujian aman</p></div>
          <Switch checked={isSafeExamMode} onCheckedChange={setIsSafeExamMode} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onSuccess}>Batal</Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {assignment ? 'Perbarui' : 'Simpan'}
        </Button>
      </div>
    </div>
  );
}
