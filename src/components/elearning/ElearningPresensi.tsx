import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  useElearningClasses,
  useElearningSessions,
  useCreateElearningSession,
  useUpdateElearningSession,
  useDeleteElearningSession,
  useElearningAttendance,
  useClassStudents,
  useBatchUpsertAttendance,
  type ElearningClass,
  type ElearningSession,
} from '@/hooks/useElearning';
import { useElearningRealtimeSubscription, useAttendanceRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StudentSemesterBadge } from '@/components/ui/semester-badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar, Clock, Users, Check, X, AlertCircle, Save } from 'lucide-react';
import { AttendanceImportExport } from './AttendanceImportExport';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

type ClassWithRelations = ElearningClass & {
  class_group: { id: string; name: string } | null;
  course: { id: string; name: string; code: string } | null;
  instructor: { id: string; full_name: string; photo_url: string | null } | null;
};

type AttendanceStatus = 'hadir' | 'izin' | 'alpha';

interface AttendanceRecord {
  student_profile_id: string;
  status: AttendanceStatus;
  notes: string;
}

interface ElearningPresensiProps {
  selectedClassId: string;
  isActive?: boolean;
}

export function ElearningPresensi({ selectedClassId: propSelectedClassId, isActive = true }: ElearningPresensiProps) {
  const { profile } = useAuth();
  const { data: classes, isLoading: classesLoading } = useElearningClasses();
  const selectedClassId = propSelectedClassId;
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ElearningSession | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [dosenCourseAssignments, setDosenCourseAssignments] = useState<{course_id: string, class_group_id: string | null}[]>([]);

  // Enable realtime subscriptions for sessions and attendance
  useElearningRealtimeSubscription(selectedClassId || undefined);
  useAttendanceRealtimeSubscription(selectedSessionId || undefined);

  const isAdmin = profile?.role === 'admin';
  const isSubAdmin = profile?.role === 'sub_admin';
  const isDosen = profile?.role === 'dosen';
  const typedClasses = (classes || []) as ClassWithRelations[];

  // Fetch dosen course assignments
  useEffect(() => {
    const fetchDosenAssignments = async () => {
      if (!profile?.id || !isDosen) return;
      
      try {
        const { data, error } = await supabase
          .from('course_instructors')
          .select('course_id, class_group_id')
          .eq('instructor_profile_id', profile.id);
        
        if (error) throw error;
        setDosenCourseAssignments(data || []);
      } catch (error) {
        console.error('Error fetching dosen assignments:', error);
      }
    };

    fetchDosenAssignments();
  }, [profile?.id, isDosen]);

  // Filter classes based on role
  const myClasses = typedClasses.filter((c) => {
    if (isAdmin || isSubAdmin) return true;
    if (isDosen) {
      const isCreator = c.instructor_profile_id === profile?.id;
      const isAssigned = dosenCourseAssignments.some(
        assignment => assignment.course_id === c.course_id && 
        (assignment.class_group_id === null || assignment.class_group_id === c.class_group_id)
      );
      return isCreator || isAssigned;
    }
    return false;
  });

  const selectedClass = myClasses.find((c) => c.id === selectedClassId);

  const { data: sessions } = useElearningSessions(selectedClassId);
  const { data: attendance, isLoading: attendanceLoading } = useElearningAttendance(selectedSessionId);
  const { data: classStudents } = useClassStudents(selectedClass?.class_group_id || '');
  const createSession = useCreateElearningSession();
  const updateSession = useUpdateElearningSession();
  const deleteSession = useDeleteElearningSession();
  const batchUpsertAttendance = useBatchUpsertAttendance();

  // Session form state
  const [sessionForm, setSessionForm] = useState({
    session_number: 1,
    title: '',
    session_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    notes: '',
  });

  // Determine if user can manage this class
  const canManageClass = useMemo(() => {
    const isCreator = selectedClass?.instructor_profile_id === profile?.id;
    const hasDosenAccess = isDosen && dosenCourseAssignments.some(
      assignment => selectedClass?.course_id === assignment.course_id &&
      (assignment.class_group_id === null || assignment.class_group_id === selectedClass.class_group_id)
    );
    
    return (isAdmin || isSubAdmin || isCreator || hasDosenAccess) && isActive;
  }, [isAdmin, isSubAdmin, isDosen, dosenCourseAssignments, selectedClass, profile?.id, isActive]);

  // Initialize attendance records when data loads
  useEffect(() => {
    if (classStudents && attendance) {
      const records: Record<string, AttendanceRecord> = {};
      classStudents.forEach((cs: any) => {
        const existingAttendance = attendance.find(
          (a: any) => a.student_profile_id === cs.student_profile_id
        );
        records[cs.student_profile_id] = {
          student_profile_id: cs.student_profile_id,
          status: (existingAttendance?.status as AttendanceStatus) || 'alpha',
          notes: existingAttendance?.notes || '',
        };
      });
      setAttendanceRecords(records);
      setHasChanges(false);
    }
  }, [classStudents, attendance]);

  const resetSessionForm = () => {
    const nextNumber = (sessions?.length || 0) + 1;
    setSessionForm({
      session_number: nextNumber,
      title: `Pertemuan ${nextNumber}`,
      session_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      notes: '',
    });
    setEditingSession(null);
  };

  const openCreateSessionDialog = () => {
    resetSessionForm();
    setSessionDialogOpen(true);
  };

  const openEditSessionDialog = (session: ElearningSession) => {
    setEditingSession(session);
    setSessionForm({
      session_number: session.session_number,
      title: session.title,
      session_date: session.session_date,
      start_time: session.start_time || '',
      end_time: session.end_time || '',
      notes: session.notes || '',
    });
    setSessionDialogOpen(true);
  };

  const handleSubmitSession = async () => {
    if (!sessionForm.title || !sessionForm.session_date) {
      toast.error('Mohon lengkapi field wajib');
      return;
    }

    try {
      if (editingSession) {
        await updateSession.mutateAsync({
          id: editingSession.id,
          session_number: sessionForm.session_number,
          title: sessionForm.title,
          session_date: sessionForm.session_date,
          start_time: sessionForm.start_time || null,
          end_time: sessionForm.end_time || null,
          notes: sessionForm.notes || null,
        });
        toast.success('Sesi berhasil diperbarui');
      } else {
        await createSession.mutateAsync({
          elearning_class_id: selectedClassId,
          session_number: sessionForm.session_number,
          title: sessionForm.title,
          session_date: sessionForm.session_date,
          start_time: sessionForm.start_time || null,
          end_time: sessionForm.end_time || null,
          notes: sessionForm.notes || null,
        });
        toast.success('Sesi berhasil dibuat');
      }
      setSessionDialogOpen(false);
      resetSessionForm();
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
    }
  };

  const handleDeleteSession = async () => {
    if (!deletingSessionId) return;

    try {
      await deleteSession.mutateAsync(deletingSessionId);
      if (selectedSessionId === deletingSessionId) {
        setSelectedSessionId('');
      }
      toast.success('Sesi berhasil dihapus');
      setDeleteDialogOpen(false);
      setDeletingSessionId(null);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus sesi');
    }
  };

  const updateAttendance = (studentId: string, field: 'status' | 'notes', value: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const saveAttendance = async () => {
    if (!selectedSessionId) return;

    const attendanceData = Object.values(attendanceRecords).map((record) => ({
      elearning_session_id: selectedSessionId,
      student_profile_id: record.student_profile_id,
      status: record.status,
      notes: record.notes || null,
      checked_at: new Date().toISOString(),
    }));

    try {
      await batchUpsertAttendance.mutateAsync(attendanceData);
      toast.success('Presensi berhasil disimpan');
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan presensi');
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'hadir':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <Check className="h-3 w-3 mr-1" />
            Hadir
          </Badge>
        );
      case 'izin':
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Izin
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Alpha
          </Badge>
        );
    }
  };

  if (classesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {selectedClassId && (
        <>
          {/* Sessions List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Sesi Pertemuan</CardTitle>
                <CardDescription>{sessions?.length || 0} sesi</CardDescription>
              </div>
              {canManageClass && (
                <Button onClick={openCreateSessionDialog} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Tambah Sesi
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!sessions?.length ? (
                <p className="text-muted-foreground text-center py-8">Belum ada sesi pertemuan</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedSessionId === session.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">Pertemuan {session.session_number}</Badge>
                        {canManageClass && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditSessionDialog(session);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingSessionId(session.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{session.title}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(session.session_date), 'dd MMM yyyy', { locale: localeId })}
                        </span>
                        {session.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.start_time.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Table */}
          {selectedSessionId && (
            <Card>
              <CardHeader className="flex flex-col gap-4 space-y-0 pb-4">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Daftar Presensi
                    </CardTitle>
                    <CardDescription>
                      {classStudents?.length || 0} mahasiswa
                    </CardDescription>
                  </div>
                  {canManageClass && hasChanges && (
                    <Button onClick={saveAttendance} disabled={batchUpsertAttendance.isPending} className="gap-2">
                      <Save className="h-4 w-4" />
                      Simpan Presensi
                    </Button>
                  )}
                </div>
                
                {/* Import/Export for attendance */}
                {canManageClass && classStudents && classStudents.length > 0 && (
                  <AttendanceImportExport
                    sessionTitle={sessions?.find(s => s.id === selectedSessionId)?.title || 'Sesi'}
                    sessionDate={sessions?.find(s => s.id === selectedSessionId)?.session_date || new Date().toISOString()}
                    students={classStudents}
                    attendanceRecords={attendanceRecords}
                    onImportAttendance={(records) => {
                      records.forEach(r => {
                        setAttendanceRecords(prev => ({
                          ...prev,
                          [r.student_profile_id]: {
                            student_profile_id: r.student_profile_id,
                            status: r.status as 'hadir' | 'izin' | 'alpha',
                            notes: r.notes,
                          },
                        }));
                      });
                      setHasChanges(true);
                    }}
                  />
                )}
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : !classStudents?.length ? (
                  <p className="text-muted-foreground text-center py-8">
                    Tidak ada mahasiswa di kelas ini
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Mahasiswa</TableHead>
                          <TableHead className="w-40">Status</TableHead>
                          <TableHead>Catatan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudents.map((cs: any, idx: number) => {
                          const record = attendanceRecords[cs.student_profile_id];
                          return (
                            <TableRow key={cs.id}>
                              <TableCell className="font-medium">{idx + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={cs.student?.photo_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {cs.student?.full_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-sm">{cs.student?.full_name}</p>
                                      <StudentSemesterBadge studentId={cs.student_profile_id} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{cs.student?.nim}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {canManageClass ? (
                                  <Select
                                    value={record?.status || 'alpha'}
                                    onValueChange={(v) =>
                                      updateAttendance(cs.student_profile_id, 'status', v)
                                    }
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hadir">
                                        <div className="flex items-center gap-2">
                                          <Check className="h-4 w-4 text-green-500" />
                                          Hadir
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="izin">
                                        <div className="flex items-center gap-2">
                                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                                          Izin
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="alpha">
                                        <div className="flex items-center gap-2">
                                          <X className="h-4 w-4 text-red-500" />
                                          Alpha
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  getStatusBadge(record?.status || 'alpha')
                                )}
                              </TableCell>
                              <TableCell>
                                {canManageClass ? (
                                  <Input
                                    value={record?.notes || ''}
                                    onChange={(e) =>
                                      updateAttendance(cs.student_profile_id, 'notes', e.target.value)
                                    }
                                    placeholder="Tambah catatan..."
                                    className="h-8"
                                  />
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {record?.notes || '-'}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Session Dialog */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSession ? 'Edit Sesi' : 'Tambah Sesi Baru'}</DialogTitle>
            <DialogDescription>
              {editingSession ? 'Perbarui informasi sesi' : 'Tambahkan sesi pertemuan baru'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor Pertemuan</Label>
                <Input
                  type="number"
                  min={1}
                  value={sessionForm.session_number}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, session_number: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={sessionForm.session_date}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Judul Sesi *</Label>
              <Input
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                placeholder="Contoh: Pertemuan 1 - Pengenalan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Waktu Mulai</Label>
                <Input
                  type="time"
                  value={sessionForm.start_time}
                  onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Waktu Selesai</Label>
                <Input
                  type="time"
                  value={sessionForm.end_time}
                  onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={sessionForm.notes}
                onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                placeholder="Catatan tambahan untuk sesi ini"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitSession} disabled={createSession.isPending || updateSession.isPending}>
              {editingSession ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Session Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Sesi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data presensi untuk sesi ini juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
