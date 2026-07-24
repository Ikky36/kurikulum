import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, XCircle, Users, ExternalLink, Plus, Trash2, Save, Calendar, Clock, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export default function TugasAkhirAdmin() {
  const [activeTab, setActiveTab] = useState('pengajuan');
  
  // STATE FOR PENGAJUAN
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<string>('approved');
  const [formComments, setFormComments] = useState<string>('');
  const [formAdvisors, setFormAdvisors] = useState<Array<{ id: string, role: string }>>([{ id: '', role: 'Pembimbing 1' }]);

  // STATE FOR SEMINAR
  const [selectedSeminar, setSelectedSeminar] = useState<any>(null);
  const [isSeminarDetailOpen, setIsSeminarDetailOpen] = useState(false);
  const [seminarScheduleDate, setSeminarScheduleDate] = useState<string>('');
  const [seminarRoom, setSeminarRoom] = useState<string>('');
  const [seminarStatus, setSeminarStatus] = useState<string>('pending');
  const [formExaminers, setFormExaminers] = useState<Array<{ id: string, role: string }>>([{ id: '', role: 'Penguji 1' }]);

  const queryClient = useQueryClient();

  const { data: dosenList } = useQuery({
    queryKey: ['admin_dosen_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, nim')
        .eq('role', 'dosen')
        .order('full_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['admin_ta_submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_submissions')
        .select(`
          *,
          profiles:student_id(full_name, nim),
          ta_types(name),
          ta_advisors(role, dosen_id, profiles(full_name))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: seminars, isLoading: seminarsLoading } = useQuery({
    queryKey: ['admin_ta_seminars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_seminars')
        .select(`
          *,
          ta_submissions(title, profiles:student_id(full_name, nim)),
          ta_examiners(role, dosen_id, profiles(full_name))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      let finalComments = selectedSubmission.comments || '';
      if (formComments) {
        finalComments = `[Catatan Admin]: ${formComments}\n\n[Catatan Mahasiswa]: ${selectedSubmission.comments || '-'}`;
      }

      const { error: updateError } = await supabase
        .from('ta_submissions')
        .update({ 
          status: formStatus,
          comments: finalComments
        })
        .eq('id', selectedSubmission.id);
      
      if (updateError) throw updateError;

      if (formStatus === 'approved') {
        await supabase.from('ta_advisors').delete().eq('submission_id', selectedSubmission.id);
        const validAdvisors = formAdvisors.filter(a => a.id !== '');
        if (validAdvisors.length > 0) {
          const insertData = validAdvisors.map(adv => ({
            submission_id: selectedSubmission.id,
            dosen_id: adv.id,
            role: adv.role
          }));
          const { error: advisorError } = await supabase.from('ta_advisors').insert(insertData);
          if (advisorError) throw advisorError;
        }
      }
    },
    onSuccess: () => {
      toast.success('Pengajuan berhasil diproses');
      queryClient.invalidateQueries({ queryKey: ['admin_ta_submissions'] });
      setIsDetailOpen(false);
    },
    onError: (error: any) => {
      toast.error('Gagal memproses pengajuan: ' + error.message);
    }
  });

  const seminarMutation = useMutation({
    mutationFn: async () => {
      const { error: updateError } = await supabase
        .from('ta_seminars')
        .update({
          schedule_date: seminarScheduleDate || null,
          room: seminarRoom,
          status: seminarStatus
        })
        .eq('id', selectedSeminar.id);
      
      if (updateError) throw updateError;

      // Update examiners
      await supabase.from('ta_examiners').delete().eq('seminar_id', selectedSeminar.id);
      const validExaminers = formExaminers.filter(e => e.id !== '');
      if (validExaminers.length > 0) {
        const insertData = validExaminers.map(ex => ({
          seminar_id: selectedSeminar.id,
          dosen_id: ex.id,
          role: ex.role
        }));
        const { error: exError } = await supabase.from('ta_examiners').insert(insertData);
        if (exError) throw exError;
      }
    },
    onSuccess: () => {
      toast.success('Jadwal seminar berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['admin_ta_seminars'] });
      setIsSeminarDetailOpen(false);
    },
    onError: (error: any) => {
      toast.error('Gagal memperbarui jadwal: ' + error.message);
    }
  });

  const openSeminarDetail = (seminar: any) => {
    setSelectedSeminar(seminar);
    setSeminarScheduleDate(seminar.schedule_date ? seminar.schedule_date.substring(0, 16) : '');
    setSeminarRoom(seminar.room || '');
    setSeminarStatus(seminar.status || 'pending');
    if (seminar.ta_examiners && seminar.ta_examiners.length > 0) {
      setFormExaminers(seminar.ta_examiners.map((ex: any) => ({ id: ex.dosen_id, role: ex.role })));
    } else {
      setFormExaminers([{ id: '', role: 'Penguji 1' }]);
    }
    setIsSeminarDetailOpen(true);
  };

  return (
    <Layout>
      <div className="container py-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Kelola Tugas Akhir</h1>
            <p className="text-muted-foreground mt-1">
              Review pengajuan, plotting dosen, dan jadwal sidang mahasiswa.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="pengajuan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6">
              Pengajuan Judul
            </TabsTrigger>
            <TabsTrigger value="seminar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6">
              Pendaftaran Seminar & Sidang
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PENGAJUAN JUDUL */}
          <TabsContent value="pengajuan" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Pengajuan Tugas Akhir</CardTitle>
                <CardDescription>Persetujuan judul dan penugasan dosen pembimbing.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mahasiswa</TableHead>
                        <TableHead>Jenis & Judul</TableHead>
                        <TableHead>Dosen Pembimbing</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">Memuat data...</TableCell>
                        </TableRow>
                      ) : submissions?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            Belum ada data pengajuan
                          </TableCell>
                        </TableRow>
                      ) : (
                        submissions?.map((sub: any) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div className="font-medium">{sub.profiles?.full_name}</div>
                              <div className="text-xs text-muted-foreground">{sub.profiles?.nim}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="mb-1">{sub.ta_types?.name}</Badge>
                              <div className="font-medium line-clamp-2" title={sub.title}>{sub.title}</div>
                            </TableCell>
                            <TableCell>
                              {sub.ta_advisors?.length > 0 ? (
                                <ul className="text-sm">
                                  {sub.ta_advisors.map((adv: any, i: number) => (
                                    <li key={i}>- {adv.profiles?.full_name} <span className="text-muted-foreground text-xs">({adv.role})</span></li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Belum diplot</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                sub.status === 'approved' ? 'default' :
                                sub.status === 'rejected' ? 'destructive' :
                                sub.status === 'revision' ? 'secondary' : 'outline'
                              }>
                                {sub.status === 'approved' ? 'Diterima' :
                                 sub.status === 'rejected' ? 'Ditolak' :
                                 sub.status === 'revision' ? 'Revisi' : 'Menunggu'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => {
                                setSelectedSubmission(sub);
                                setFormStatus(sub.status === 'pending' ? 'approved' : sub.status);
                                setFormComments('');
                                if (sub.ta_advisors && sub.ta_advisors.length > 0) {
                                  setFormAdvisors(sub.ta_advisors.map((a: any) => ({ id: a.dosen_id || '', role: a.role })));
                                } else {
                                  setFormAdvisors([{ id: '', role: 'Pembimbing 1' }]);
                                }
                                setIsDetailOpen(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" /> Detail
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detail Pengajuan Tugas Akhir</DialogTitle>
                  <DialogDescription>
                    Informasi lengkap mengenai pengajuan mahasiswa.
                  </DialogDescription>
                </DialogHeader>
                
                {selectedSubmission && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Nama Mahasiswa</Label>
                        <p className="font-medium">{selectedSubmission.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedSubmission.profiles?.nim}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Jenis Tugas Akhir</Label>
                        <p className="font-medium"><Badge variant="outline">{selectedSubmission.ta_types?.name}</Badge></p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-muted-foreground text-xs">Topik / Judul</Label>
                      <p className="font-medium mt-1 p-3 bg-muted rounded-md">{selectedSubmission.title}</p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs">Link Dokumen</Label>
                      {selectedSubmission.document_link ? (
                        <div className="mt-1">
                          <a 
                            href={selectedSubmission.document_link.startsWith('http') ? selectedSubmission.document_link : `https://${selectedSubmission.document_link}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" /> Buka Dokumen Pengajuan
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm italic mt-1">Tidak ada dokumen yang dilampirkan.</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs">Catatan Mahasiswa</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedSubmission.comments || '-'}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-border mt-4">
                      <h4 className="text-sm font-semibold mb-3">Tindakan Admin</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Status Pengajuan</Label>
                          <Select value={formStatus} onValueChange={setFormStatus}>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="approved">Setujui (Diterima)</SelectItem>
                              <SelectItem value="revision">Revisi</SelectItem>
                              <SelectItem value="rejected">Tolak</SelectItem>
                              <SelectItem value="pending">Kembalikan ke Menunggu</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formStatus === 'approved' && (
                          <div className="p-4 bg-muted/30 border rounded-md space-y-3">
                            <div className="flex justify-between items-center">
                              <Label>Plotting Dosen Pembimbing</Label>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setFormAdvisors([...formAdvisors, { id: '', role: `Pembimbing ${formAdvisors.length + 1}` }])}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Tambah Pembimbing
                              </Button>
                            </div>
                            
                            {formAdvisors.map((adv, index) => (
                              <div key={index} className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground">{adv.role}</Label>
                                  <Select 
                                    value={adv.id} 
                                    onValueChange={(val) => {
                                      const newAdvisors = [...formAdvisors];
                                      newAdvisors[index].id = val;
                                      setFormAdvisors(newAdvisors);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih dosen pembimbing" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {dosenList?.map((dosen) => (
                                        <SelectItem key={dosen.id} value={dosen.id}>
                                          {dosen.full_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive"
                                  onClick={() => {
                                    const newAdvisors = [...formAdvisors];
                                    newAdvisors.splice(index, 1);
                                    setFormAdvisors(newAdvisors);
                                  }}
                                  disabled={formAdvisors.length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <Label>Catatan Admin {formStatus !== 'approved' && <span className="text-destructive">*</span>}</Label>
                          <Textarea 
                            className="mt-1" 
                            placeholder={formStatus === 'approved' ? "Catatan opsional..." : "Berikan alasan mengapa direvisi atau ditolak..."}
                            value={formComments}
                            onChange={(e) => setFormComments(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Batal</Button>
                  <Button 
                    onClick={() => processMutation.mutate()} 
                    disabled={processMutation.isPending || (formStatus !== 'approved' && !formComments.trim())}
                  >
                    {processMutation.isPending ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* TAB 2: SEMINAR & SIDANG */}
          <TabsContent value="seminar" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Jadwal Ujian & Seminar</CardTitle>
                <CardDescription>Atur jadwal ujian, lokasi, dan tetapkan dosen penguji.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mahasiswa</TableHead>
                        <TableHead>Jenis Ujian</TableHead>
                        <TableHead>Jadwal & Ruangan</TableHead>
                        <TableHead>Dosen Penguji</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seminarsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">Memuat data seminar...</TableCell>
                        </TableRow>
                      ) : !seminars || seminars.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            Belum ada pengajuan seminar atau ujian
                          </TableCell>
                        </TableRow>
                      ) : (
                        seminars.map((sem: any) => (
                          <TableRow key={sem.id}>
                            <TableCell>
                              <div className="font-medium">{sem.ta_submissions?.profiles?.full_name}</div>
                              <div className="text-xs text-muted-foreground">{sem.ta_submissions?.profiles?.nim}</div>
                            </TableCell>
                            <TableCell>
                              <Badge className="capitalize">{sem.type}</Badge>
                            </TableCell>
                            <TableCell>
                              {sem.schedule_date ? (
                                <div className="space-y-1">
                                  <div className="flex items-center text-sm font-medium">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {new Date(sem.schedule_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {new Date(sem.schedule_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  {sem.room && (
                                    <div className="flex items-center text-xs font-medium text-primary mt-1">
                                      <MapPin className="w-3 h-3 mr-1" /> {sem.room}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Belum dijadwalkan</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {sem.ta_examiners?.length > 0 ? (
                                <ul className="text-sm">
                                  {sem.ta_examiners.map((ex: any, i: number) => (
                                    <li key={i}>- {ex.profiles?.full_name}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Belum diplot</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                sem.status === 'scheduled' ? 'default' :
                                sem.status === 'finished' ? 'secondary' :
                                sem.status === 'rejected' ? 'destructive' : 'outline'
                              }>
                                {sem.status === 'scheduled' ? 'Terjadwal' :
                                 sem.status === 'finished' ? 'Selesai' :
                                 sem.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => openSeminarDetail(sem)}>
                                <Calendar className="w-4 h-4 mr-2" /> Atur Jadwal
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Dialog open={isSeminarDetailOpen} onOpenChange={setIsSeminarDetailOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Atur Jadwal Ujian & Penguji</DialogTitle>
                  <DialogDescription>
                    Atur waktu, tempat, dan dosen penguji untuk ujian ini.
                  </DialogDescription>
                </DialogHeader>

                {selectedSeminar && (
                  <div className="space-y-6 py-4">
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <Label className="text-xs text-muted-foreground">Mahasiswa</Label>
                      <p className="font-medium text-base">{selectedSeminar.ta_submissions?.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground mb-3">{selectedSeminar.ta_submissions?.profiles?.nim}</p>
                      
                      <Label className="text-xs text-muted-foreground">Jenis Ujian</Label>
                      <p className="font-medium capitalize">{selectedSeminar.type}</p>
                      
                      <Label className="text-xs text-muted-foreground mt-3 block">Topik / Judul</Label>
                      <p className="text-sm font-medium line-clamp-2">{selectedSeminar.ta_submissions?.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tanggal & Waktu Ujian</Label>
                        <Input 
                          type="datetime-local" 
                          value={seminarScheduleDate} 
                          onChange={(e) => setSeminarScheduleDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Ruangan / Lokasi</Label>
                        <Input 
                          type="text" 
                          placeholder="Cth: Ruang Sidang 1" 
                          value={seminarRoom} 
                          onChange={(e) => setSeminarRoom(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Status Ujian</Label>
                      <Select value={seminarStatus} onValueChange={setSeminarStatus}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Menunggu Penjadwalan</SelectItem>
                          <SelectItem value="scheduled">Terjadwal (Disetujui)</SelectItem>
                          <SelectItem value="finished">Selesai (Nilai Keluar)</SelectItem>
                          <SelectItem value="rejected">Ditolak / Batal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between items-center mb-4">
                        <Label className="text-base">Plotting Dosen Penguji</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setFormExaminers([...formExaminers, { id: '', role: `Penguji ${formExaminers.length + 1}` }])}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Tambah Penguji
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {formExaminers.map((ex, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">{ex.role}</Label>
                              <Select 
                                value={ex.id} 
                                onValueChange={(val) => {
                                  const newExs = [...formExaminers];
                                  newExs[index].id = val;
                                  setFormExaminers(newExs);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih dosen penguji" />
                                </SelectTrigger>
                                <SelectContent>
                                  {dosenList?.map((dosen) => (
                                    <SelectItem key={dosen.id} value={dosen.id}>
                                      {dosen.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive border border-transparent hover:border-destructive/20"
                              onClick={() => {
                                const newExs = [...formExaminers];
                                newExs.splice(index, 1);
                                setFormExaminers(newExs);
                              }}
                              disabled={formExaminers.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter className="mt-2">
                  <Button variant="outline" onClick={() => setIsSeminarDetailOpen(false)}>Batal</Button>
                  <Button onClick={() => seminarMutation.mutate()} disabled={seminarMutation.isPending}>
                    {seminarMutation.isPending ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Penjadwalan</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
