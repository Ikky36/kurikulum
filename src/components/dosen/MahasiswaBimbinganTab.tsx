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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserSearch, FileText, CheckCircle, XCircle, TrendingUp, CalendarDays, MessageSquare, Save } from 'lucide-react';
import { Profile } from '@/lib/types';

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

  return (
    <div className="space-y-6">
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
                <TableHead>NIM</TableHead>
                <TableHead>Nama Mahasiswa</TableHead>
                <TableHead>Angkatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStudents ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4">Memuat...</TableCell></TableRow>
              ) : students.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4">Belum ada mahasiswa di kelompok ini.</TableCell></TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.nim || '-'}</TableCell>
                    <TableCell>{student.full_name}</TableCell>
                    <TableCell>{student.enrollment_year}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => { setSelectedStudent(student); setActiveTab('krs'); }}>
                        <UserSearch className="h-4 w-4 mr-1" /> Panel DPA
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DPA Modal */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Riwayat Bimbingan Sebelumnya</h4>
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Belum ada riwayat bimbingan.</p>
                  ) : (
                    logs.map((log: any) => (
                      <div key={log.id} className="p-4 border rounded-lg bg-card space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{log.topic}</p>
                            <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('id-ID')} • {log.media}</p>
                          </div>
                          <Badge variant="outline" className="bg-primary/5">{log.status}</Badge>
                        </div>
                        <p className="text-sm whitespace-pre-wrap pt-2 border-t mt-2">{log.dosen_notes}</p>
                      </div>
                    ))
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
