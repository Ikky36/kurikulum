import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { UserSearch, FileText, CheckCircle, XCircle, TrendingUp, CalendarDays, MessageSquare, Save, BellRing } from 'lucide-react';
import { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

export function MahasiswaBimbinganTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  
  // Tab DPA Panel
  const [activeTab, setActiveTab] = useState('krs');
  
  // Log Bimbingan Form
  const [logTopic, setLogTopic] = useState('');
  const [logMedia, setLogMedia] = useState('Tatap Muka');
  const [logNotes, setLogNotes] = useState('');
  
  // Inline Reply state
  const [respondingLogId, setRespondingLogId] = useState<string | null>(null);
  const [replyNotes, setReplyNotes] = useState('');

  // Fetch DPA assignments for current dosen
  const { data: myAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['dpa_my_assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('academic_advisors')
        .select('*, sistem_kuliah(name)')
        .eq('dosen_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const isDPA = myAssignments.length > 0;

  // Fetch students matching the assignments
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['dpa_my_students', myAssignments],
    queryFn: async () => {
      if (myAssignments.length === 0) return [];
      
      // Build an OR query string
      // e.g. "and(enrollment_year.eq.2023,sistem_kuliah_id.eq.uuid1),and(enrollment_year.eq.2024,sistem_kuliah_id.eq.uuid2)"
      const orQuery = myAssignments.map(a => 
        `and(enrollment_year.eq.${a.enrollment_year},sistem_kuliah_id.eq.${a.sistem_kuliah_id})`
      ).join(',');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mahasiswa')
        .or(orQuery)
        .order('full_name');
        
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isDPA
  });

  // Collective query for Smart Table Stats
  const { data: studentsStats, isLoading: loadingStats } = useQuery({
    queryKey: ['dpa_students_stats', students.map(s => s.id)],
    queryFn: async () => {
      if (students.length === 0) return {};
      
      const studentIds = students.map(s => s.id);
      
      const { data: krsData } = await supabase
        .from('krs')
        .select('student_id, status')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });
        
      const { data: gradesData } = await supabase
        .from('grades')
        .select('student_profile_id, final_score')
        .in('student_profile_id', studentIds);
        
      const { data: logsData } = await supabase
        .from('academic_guidance_logs')
        .select('student_id, created_at, status')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      const stats: Record<string, any> = {};
      
      studentIds.forEach(id => {
        const studentKrs = krsData?.find(k => k.student_id === id);
        const studentGrades = gradesData?.filter(g => g.student_profile_id === id) || [];
        const avgScore = studentGrades.length > 0 
          ? studentGrades.reduce((sum, g) => sum + g.final_score, 0) / studentGrades.length 
          : null;
        const studentLog = logsData?.find(l => l.student_id === id);
        
        stats[id] = {
          krsStatus: studentKrs?.status || 'belum isi',
          averageScore: avgScore,
          lastLogDate: studentLog?.created_at || null,
          lastLogStatus: studentLog?.status || null,
        };
      });
      
      return stats;
    },
    enabled: students.length > 0
  });

  // Fetch KRS for selected student
  const { data: studentKrs, refetch: refetchKrs } = useQuery({
    queryKey: ['dpa_student_krs', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent?.id) return null;
      // Get the latest KRS
      const { data, error } = await supabase
        .from('krs')
        .select(`*, semesters(name, max_sks), krs_items(courses(id, code, name, sks))`)
        .eq('student_id', selectedStudent.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudent?.id && activeTab === 'krs'
  });

  // Calculate KRS total SKS
  const totalSks = studentKrs?.krs_items?.reduce((sum: number, item: any) => sum + (item.courses?.sks || 0), 0) || 0;

  const approveKrsMutation = useMutation({
    mutationFn: async (krsId: string) => {
      const { error } = await supabase.from('krs').update({ status: 'approved', notes: null }).eq('id', krsId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('KRS Mahasiswa disetujui');
      refetchKrs();
    }
  });

  const rejectKrsMutation = useMutation({
    mutationFn: async ({ krsId, notes }: { krsId: string, notes: string }) => {
      const { error } = await supabase.from('krs').update({ status: 'draft', notes }).eq('id', krsId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('KRS ditolak dan dikembalikan ke mahasiswa');
      refetchKrs();
    }
  });

  // Fetch Bimbingan Logs
  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['dpa_guidance_logs', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent?.id) return [];
      const { data, error } = await supabase
        .from('academic_guidance_logs')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudent?.id && activeTab === 'log'
  });

  const addLogMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('academic_guidance_logs').insert({
        student_id: selectedStudent?.id,
        dosen_id: user?.id,
        topic: logTopic,
        media: logMedia,
        dosen_notes: logNotes,
        status: 'completed'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Catatan Bimbingan berhasil disimpan');
      setLogTopic('');
      setLogNotes('');
      refetchLogs();
    }
  });

  const replyLogMutation = useMutation({
    mutationFn: async ({ logId, notes }: { logId: string; notes: string }) => {
      const { error } = await supabase
        .from('academic_guidance_logs')
        .update({ dosen_notes: notes, status: 'completed', is_read_by_student: false })
        .eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Balasan bimbingan berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['dpa_student_logs'] });
      queryClient.invalidateQueries({ queryKey: ['dpa_pending_count'] });
      queryClient.invalidateQueries({ queryKey: ['dpa_students_stats'] });
      setRespondingLogId(null);
      setReplyNotes('');
      refetchLogs();
    }
  });

  if (loadingAssignments) return <div>Memuat data DPA...</div>;

  if (!isDPA) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <UserSearch className="h-12 w-12 mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-foreground">Anda Belum Menjadi DPA</h3>
          <p className="mt-1">Anda belum ditugaskan sebagai Dosen Pembimbing Akademik oleh Admin.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total pending requests for the alert
  const totalPending = studentsStats ? Object.values(studentsStats).filter(stat => stat.lastLogStatus === 'pending').length : 0;

  return (
    <div className="space-y-6">
      {totalPending > 0 && (
        <Alert className="bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-400">
          <BellRing className="h-4 w-4 stroke-amber-600 dark:stroke-amber-400 animate-bounce" />
          <AlertTitle className="font-bold">Perhatian: Ada Pengajuan Baru!</AlertTitle>
          <AlertDescription>
            Anda memiliki <strong>{totalPending}</strong> permintaan bimbingan akademik baru yang menunggu balasan. Silakan cek tabel di bawah ini yang berstatus <span className="font-semibold bg-amber-500 text-white px-1 py-0.5 rounded text-xs ml-1">Pengajuan Baru!</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {myAssignments.map((a: any) => (
          <Card key={a.id} className="bg-primary/5 border-primary/20">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Kelompok Bimbingan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{a.enrollment_year}</div>
              <p className="text-xs text-muted-foreground">{a.sistem_kuliah?.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Mahasiswa Bimbingan</CardTitle>
          <CardDescription>Pilih mahasiswa untuk melihat detail KRS, Nilai, dan melakukan Log Bimbingan.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="align-middle border-r border-b border-primary-foreground/20 text-center">NIM</TableHead>
                <TableHead rowSpan={2} className="align-middle border-r border-b border-primary-foreground/20 text-center">Nama Mahasiswa</TableHead>
                <TableHead rowSpan={2} className="align-middle border-r border-b border-primary-foreground/20 text-center">Status KRS</TableHead>
                <TableHead rowSpan={2} className="align-middle border-r border-b border-primary-foreground/20 text-center">Nilai</TableHead>
                <TableHead colSpan={4} className="text-center border-b border-r border-primary-foreground/20">PRESENSI</TableHead>
                <TableHead rowSpan={2} className="align-middle border-r border-b border-primary-foreground/20 text-center">Bimbingan</TableHead>
                <TableHead rowSpan={2} className="text-center align-middle border-b border-primary-foreground/20">Aksi</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-center border-r border-primary-foreground/20 font-bold h-8">H</TableHead>
                <TableHead className="text-center border-r border-primary-foreground/20 font-bold h-8">I</TableHead>
                <TableHead className="text-center border-r border-primary-foreground/20 font-bold h-8">S</TableHead>
                <TableHead className="text-center border-r border-primary-foreground/20 font-bold text-red-200 h-8">A</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStudents || loadingStats ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Memuat data akademik...</TableCell></TableRow>
              ) : students.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Belum ada mahasiswa di kelompok ini.</TableCell></TableRow>
              ) : (
                students.map((student) => {
                  const stat = studentsStats?.[student.id];
                  return (
                    <TableRow key={student.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium border-r">{student.nim || '-'}</TableCell>
                      <TableCell className="border-r">{student.full_name}</TableCell>
                      <TableCell className="text-center border-r">
                        <Badge variant={
                          stat?.krsStatus === 'approved' ? 'default' : 
                          stat?.krsStatus === 'pending' ? 'secondary' : 
                          stat?.krsStatus === 'rejected' ? 'destructive' : 'outline'
                        } className="capitalize font-medium">
                          {stat?.krsStatus === 'approved' ? 'Disetujui' : 
                           stat?.krsStatus === 'pending' ? 'Menunggu' : 
                           stat?.krsStatus === 'rejected' ? 'Ditolak' : 'Belum Isi'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center border-r">
                        {stat?.averageScore !== null ? (
                          <span className={cn("font-bold", stat.averageScore >= 60 ? "text-success" : "text-destructive")}>
                            {stat.averageScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center border-r text-muted-foreground">0</TableCell>
                      <TableCell className="text-center border-r text-muted-foreground">0</TableCell>
                      <TableCell className="text-center border-r text-muted-foreground">0</TableCell>
                      <TableCell className="text-center border-r text-muted-foreground">0</TableCell>
                      <TableCell className="text-center border-r">
                        {stat?.lastLogStatus === 'pending' ? (
                          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white animate-pulse border-0">Pengajuan Baru!</Badge>
                        ) : stat?.lastLogDate ? (
                          <span className="text-sm font-medium">{new Date(stat.lastLogDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                        ) : (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0">Belum Pernah</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => { setSelectedStudent(student); setActiveTab('krs'); }} className="shadow-sm">
                          <UserSearch className="h-4 w-4 mr-1" /> Panel DPA
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DPA Modal */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          <DialogContent className="w-full sm:w-[96vw] max-w-[100vw] sm:max-w-[96vw] max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Panel Pembimbingan Akademik</DialogTitle>
              <DialogDescription>
                Mahasiswa: <strong className="text-foreground">{selectedStudent.full_name}</strong> ({selectedStudent.nim})
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="krs" className="gap-2"><FileText className="h-4 w-4"/> KRS</TabsTrigger>
                <TabsTrigger value="nilai" className="gap-2"><TrendingUp className="h-4 w-4"/> Nilai (IPS)</TabsTrigger>
                <TabsTrigger value="presensi" className="gap-2"><CalendarDays className="h-4 w-4"/> Presensi</TabsTrigger>
                <TabsTrigger value="log" className="gap-2"><MessageSquare className="h-4 w-4"/> Log Bimbingan</TabsTrigger>
              </TabsList>

              {/* TAB KRS */}
              <TabsContent value="krs" className="space-y-4 pt-4">
                {!studentKrs ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">Mahasiswa belum mengajukan KRS semester ini.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Semester</p>
                        <p className="font-semibold">{studentKrs.semesters?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total SKS</p>
                        <p className={totalSks > (studentKrs.semesters?.max_sks || 24) ? "font-bold text-destructive" : "font-semibold"}>
                          {totalSks} / {studentKrs.semesters?.max_sks || 24}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status KRS</p>
                        <Badge variant={studentKrs.status === 'approved' ? 'default' : studentKrs.status === 'pending' ? 'secondary' : 'outline'}>
                          {studentKrs.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kode</TableHead>
                          <TableHead>Mata Kuliah</TableHead>
                          <TableHead className="text-right">SKS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentKrs.krs_items?.map((item: any) => (
                          <TableRow key={item.courses.id}>
                            <TableCell>{item.courses.code}</TableCell>
                            <TableCell>{item.courses.name}</TableCell>
                            <TableCell className="text-right">{item.courses.sks}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {studentKrs.status === 'pending' && (
                      <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
                        <Button variant="destructive" onClick={() => {
                          const note = window.prompt('Masukkan alasan penolakan KRS:');
                          if (note) rejectKrsMutation.mutate({ krsId: studentKrs.id, notes: note });
                        }}>
                          <XCircle className="h-4 w-4 mr-2" /> Tolak KRS
                        </Button>
                        <Button onClick={() => approveKrsMutation.mutate(studentKrs.id)} disabled={approveKrsMutation.isPending}>
                          <CheckCircle className="h-4 w-4 mr-2" /> Setujui KRS
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* TAB NILAI */}
              <TabsContent value="nilai" className="pt-4">
                <Card className="border-dashed bg-muted/10">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-4 opacity-20 text-primary" />
                    <h3 className="text-lg font-medium text-foreground">Analisis Nilai (Segera Hadir)</h3>
                    <p className="mt-1 max-w-sm">Grafik IPS dan rincian rekapitulasi nilai mahasiswa akan diintegrasikan dengan modul penilaian akhir.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB PRESENSI */}
              <TabsContent value="presensi" className="pt-4">
                <Card className="border-dashed bg-muted/10">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mb-4 opacity-20 text-primary" />
                    <h3 className="text-lg font-medium text-foreground">Pemantauan Presensi (Segera Hadir)</h3>
                    <p className="mt-1 max-w-sm">Rincian absensi kelas akan ditarik otomatis dari sistem E-Learning ketika modul E-Learning telah aktif.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB LOG BIMBINGAN */}
              <TabsContent value="log" className="space-y-6 pt-4">
                {/* Form Input */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Tambah Catatan Bimbingan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Topik</label>
                        <Input value={logTopic} onChange={e => setLogTopic(e.target.value)} placeholder="Membahas KRS, IPK Turun..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Media</label>
                        <Select value={logMedia} onValueChange={setLogMedia}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tatap Muka">Tatap Muka</SelectItem>
                            <SelectItem value="Online / Zoom">Online / Zoom</SelectItem>
                            <SelectItem value="Chat System">Pesan Sistem</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Catatan / Rekomendasi DPA</label>
                      <Textarea value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Tuliskan isi bimbingan dan saran untuk mahasiswa..." />
                    </div>
                    <Button onClick={() => addLogMutation.mutate()} disabled={!logTopic || !logNotes || addLogMutation.isPending} className="w-full">
                      <Save className="h-4 w-4 mr-2" /> Simpan Catatan Bimbingan
                    </Button>
                  </CardContent>
                </Card>

                {/* History */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Riwayat Bimbingan Sebelumnya</h4>
                    {logs.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Belum ada riwayat bimbingan.</p>
                    ) : (
                      <Accordion type="multiple" className="space-y-4">
                        {logs.map((log: any) => (
                          <AccordionItem value={log.id} key={log.id} className="border rounded-lg px-4 py-1 bg-card shadow-sm relative overflow-hidden data-[state=open]:pb-4">
                            {log.status === 'pending' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                            
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex justify-between items-start sm:items-center w-full pr-4 text-left">
                                <div>
                                  <p className="font-medium">{log.topic}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{new Date(log.created_at).toLocaleString('id-ID')} • {log.media}</p>
                                </div>
                                <Badge variant="outline" className={cn(log.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-primary/5')}>
                                  {log.status === 'pending' ? 'Menunggu Balasan' : 'Selesai'}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            
                            <AccordionContent>
                              <div className="space-y-4 pt-3 border-t">
                                {/* Student Message */}
                                {log.student_message && (
                                  <div className="bg-muted/50 p-3 rounded-md text-sm border border-border/50">
                                    <span className="font-semibold text-xs text-muted-foreground block mb-1">Pesan dari Mahasiswa:</span>
                                    {log.student_message}
                                  </div>
                                )}

                                {/* Dosen Notes if completed */}
                                {log.status === 'completed' && log.dosen_notes && (
                                  <div>
                                    <span className="font-semibold text-xs text-primary block mb-1">Catatan Kesimpulan DPA:</span>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.dosen_notes}</p>
                                  </div>
                                )}

                                {/* Reply Action for pending */}
                                {log.status === 'pending' && (
                                  <div className="pt-3 border-t border-amber-200">
                                    {respondingLogId === log.id ? (
                                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                          <span className="font-semibold text-xs text-primary block mb-2">Tuliskan Kesimpulan & Balasan Anda:</span>
                                          <Textarea 
                                            placeholder="Tuliskan solusi, saran, atau persetujuan jadwal..." 
                                            value={replyNotes}
                                            onChange={(e) => setReplyNotes(e.target.value)}
                                            className="min-h-[100px] border-amber-300 focus-visible:ring-amber-500"
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button size="sm" variant="outline" onClick={() => { setRespondingLogId(null); setReplyNotes(''); }}>Batal</Button>
                                          <Button size="sm" onClick={() => replyLogMutation.mutate({ logId: log.id, notes: replyNotes })} disabled={!replyNotes || replyLogMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                                            <Save className="h-4 w-4 mr-2" /> Simpan Kesimpulan & Tutup Topik
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button size="sm" variant="secondary" className="w-full bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/30" onClick={() => setRespondingLogId(log.id)}>
                                        <MessageSquare className="h-4 w-4 mr-2" /> Beri Kesimpulan & Tutup Topik
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                </TabsContent>
            </Tabs>

            <DialogFooter className="sm:justify-start">
              <Button type="button" variant="outline" onClick={() => setSelectedStudent(null)}>Tutup Panel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
