import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  useCreateAssignment, 
  useUpdateAssignment, 
  useCourseLLOs, 
  useElearningMaterials,
  useElearningAssignments,
  type ElearningAssignment 
} from '@/hooks/useElearningMaterials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, BookOpen, ClipboardCheck, ChevronDown, Shield, Eye, Maximize } from 'lucide-react';

interface AssignmentEditorProps {
  classId: string;
  courseId: string;
  assignment?: ElearningAssignment | null;
  onSuccess: () => void;
}

type ExtendedAssignment = ElearningAssignment & {
  seb_password?: string | null;
  seb_quit_password?: string | null;
  show_answer_mode?: string | null;
  prerequisite_material_id?: string | null;
  prerequisite_assignment_id?: string | null;
  start_date?: string | null;
  assignment_code?: string | null;
};

export function AssignmentEditor({ classId, courseId, assignment, onSuccess }: AssignmentEditorProps) {
  const { toast } = useToast();
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const { data: llos } = useCourseLLOs(courseId);
  const { data: materials } = useElearningMaterials(classId);
  const { data: assignments } = useElearningAssignments(classId);

  const extendedAssignment = assignment as ExtendedAssignment | null;

  const [title, setTitle] = useState(assignment?.title || '');
  const [assignmentCode, setAssignmentCode] = useState(extendedAssignment?.assignment_code || '');
  const [description, setDescription] = useState(assignment?.description || '');
  const [assignmentType, setAssignmentType] = useState(assignment?.assignment_type || 'quiz');
  const [startDate, setStartDate] = useState(extendedAssignment?.start_date?.slice(0, 16) || '');
  const [dueDate, setDueDate] = useState(assignment?.due_date?.slice(0, 16) || '');
  const [maxAttempts, setMaxAttempts] = useState(assignment?.max_attempts?.toString() || '1');
  const [timeLimit, setTimeLimit] = useState(assignment?.time_limit_minutes?.toString() || '');
  const [selectedLloId, setSelectedLloId] = useState(assignment?.llo_id || '');
  const [isPublished, setIsPublished] = useState(assignment?.is_published || false);
  const [isSafeExamMode, setIsSafeExamMode] = useState(assignment?.is_safe_exam_mode || false);
  const [isFocusMode, setIsFocusMode] = useState((assignment as any)?.is_focus_mode || false);
  const [showAnswerMode, setShowAnswerMode] = useState(extendedAssignment?.show_answer_mode || 'after_quiz');
  const [sebPassword, setSebPassword] = useState(extendedAssignment?.seb_password || '');
  const [sebQuitPassword, setSebQuitPassword] = useState(extendedAssignment?.seb_quit_password || '');
  const [prerequisiteMaterialId, setPrerequisiteMaterialId] = useState(extendedAssignment?.prerequisite_material_id || '');
  const [prerequisiteAssignmentId, setPrerequisiteAssignmentId] = useState(extendedAssignment?.prerequisite_assignment_id || '');
  const [showPrerequisites, setShowPrerequisites] = useState(false);

  const isLoading = createAssignment.isPending || updateAssignment.isPending;

  // Filter out current assignment from prerequisites
  const otherAssignments = (assignments || []).filter((a: any) => a.id !== assignment?.id);

  const handleSubmit = async () => {
    if (!assignmentCode.trim()) {
      toast({ title: 'Error', description: 'Kode Tugas harus diisi', variant: 'destructive' });
      return;
    }

    if (!title.trim()) {
      toast({ title: 'Error', description: 'Judul harus diisi', variant: 'destructive' });
      return;
    }

    try {
      // Map UI assignment type to database values
      // Database expects: assignment_type = 'quiz' | 'tugas'
      // submission_type = 'file_upload' | 'link_document' | null (for quiz)
      const getDbAssignmentType = (type: string) => {
        if (type === 'quiz') return 'quiz';
        return 'tugas'; // file_upload and link are both 'tugas'
      };

      const getSubmissionType = (type: string) => {
        switch (type) {
          case 'file_upload':
            return 'file_upload';
          case 'link':
            return 'link_document';
          case 'quiz':
          default:
            return null;
        }
      };

      const dbAssignmentType = getDbAssignmentType(assignmentType);
      const isQuiz = assignmentType === 'quiz';

      const data: any = {
        title,
        assignment_code: assignmentCode || null,
        description: description || null,
        assignment_type: dbAssignmentType,
        submission_type: getSubmissionType(assignmentType),
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        max_attempts: maxAttempts ? parseInt(maxAttempts) : null,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
        llo_id: selectedLloId || null,
        is_published: isPublished,
        is_safe_exam_mode: isQuiz ? isSafeExamMode : false,
        is_focus_mode: isQuiz ? isFocusMode : false,
        show_answer_mode: isQuiz ? showAnswerMode : null,
        seb_password: isQuiz && isSafeExamMode ? sebPassword : null,
        seb_quit_password: isQuiz && isSafeExamMode ? sebQuitPassword : null,
        elearning_class_id: classId,
        prerequisite_material_id: prerequisiteMaterialId || null,
        prerequisite_assignment_id: prerequisiteAssignmentId || null,
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
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-base font-medium">Kode Tugas *</Label>
          <Input 
            value={assignmentCode} 
            onChange={(e) => setAssignmentCode(e.target.value)} 
            placeholder="Cth: Q1, HW1..."
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base font-medium">Judul *</Label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Judul tugas/quiz"
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base font-medium">Tipe</Label>
          <Select value={assignmentType} onValueChange={setAssignmentType}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quiz">Quiz (Soal Interaktif)</SelectItem>
              <SelectItem value="file_upload">Upload File</SelectItem>
              <SelectItem value="link">Link</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium">Deskripsi</Label>
        <Textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Deskripsi tugas/quiz..."
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Time Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Waktu Mulai</Label>
          <Input 
            type="datetime-local" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Deadline</Label>
          <Input 
            type="datetime-local" 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Max Percobaan</Label>
          <Input 
            type="number" 
            min="1" 
            value={maxAttempts} 
            onChange={(e) => setMaxAttempts(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Batas Waktu (menit)</Label>
          <Input 
            type="number" 
            min="1" 
            value={timeLimit} 
            onChange={(e) => setTimeLimit(e.target.value)} 
            placeholder="Kosong = unlimited"
            className="h-11"
          />
        </div>
      </div>

      {/* LLO Selection */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Sub-CPMK (Opsional)</Label>
        <Select value={selectedLloId || "__none__"} onValueChange={(v) => setSelectedLloId(v === "__none__" ? "" : v)}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Pilih Sub-CPMK..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Tidak ada</SelectItem>
            {(llos || []).map((llo: any) => (
              <SelectItem key={llo.id} value={llo.id}>
                <span className="font-medium">{llo.code}</span> - {llo.description?.substring(0, 40)}...
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prerequisites */}
      <Collapsible open={showPrerequisites} onOpenChange={setShowPrerequisites}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-11">
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
                Mahasiswa harus menyelesaikan prasyarat berikut sebelum dapat mengakses tugas/quiz ini.
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
                    {(materials || []).map((m: any) => (
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
                    {otherAssignments.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Answer Display Mode - Quiz only */}
      {assignmentType === 'quiz' && (
        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Tampilkan Jawaban
          </Label>
          <Select value={showAnswerMode} onValueChange={setShowAnswerMode}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="after_each">Setelah setiap soal dijawab</SelectItem>
              <SelectItem value="after_quiz">Setelah quiz selesai</SelectItem>
              <SelectItem value="never">Tidak ditampilkan</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Kapan jawaban benar dan feedback ditampilkan kepada mahasiswa
          </p>
        </div>
      )}

      {/* Publish Toggle */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Publikasikan</Label>
              <p className="text-xs text-muted-foreground mt-1">Mahasiswa dapat melihat dan mengerjakan</p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </CardContent>
      </Card>

      {/* Focus Mode - Quiz only */}
      {assignmentType === 'quiz' && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Maximize className="h-5 w-5 text-blue-600" />
                <div>
                  <Label className="text-base font-medium">Mode Fokus (Fullscreen)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Browser mahasiswa akan fullscreen saat mengerjakan quiz. Jika keluar fullscreen atau berpindah tab/aplikasi, quiz otomatis dikumpulkan.
                  </p>
                </div>
              </div>
              <Switch checked={isFocusMode} onCheckedChange={setIsFocusMode} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safe Exam Browser - Quiz only */}
      {assignmentType === 'quiz' && (
        <>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-destructive" />
                  <div>
                    <Label className="text-base font-medium">Safe Exam Browser</Label>
                    <p className="text-xs text-muted-foreground mt-1">Aktifkan mode ujian aman (mengunci browser)</p>
                  </div>
                </div>
                <Switch checked={isSafeExamMode} onCheckedChange={setIsSafeExamMode} />
              </div>
            </CardContent>
          </Card>

          {isSafeExamMode && (
            <Card className="bg-muted/50">
              <CardContent className="py-4 space-y-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Konfigurasi Safe Exam Browser
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Password Akses Quiz</Label>
                    <Input 
                      type="text" 
                      value={sebPassword} 
                      onChange={(e) => setSebPassword(e.target.value)}
                      placeholder="Password untuk akses quiz..."
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">Mahasiswa memasukkan password ini di SEB</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Password Keluar SEB (Pengawas)</Label>
                    <Input 
                      type="text" 
                      value={sebQuitPassword} 
                      onChange={(e) => setSebQuitPassword(e.target.value)}
                      placeholder="Password untuk keluar SEB..."
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">Password untuk pengawas keluar SEB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onSuccess} className="min-w-[100px]">
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="min-w-[120px]">
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {assignment ? 'Perbarui' : 'Simpan'}
        </Button>
      </div>
    </div>
  );
}
