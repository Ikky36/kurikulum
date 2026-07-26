import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, CheckCircle2, FileText, MessageSquare, Plus, Save, Clock, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TADosenMilestones } from './TADosenMilestones';

export default function TugasAkhirDosen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedAdvisorship, setSelectedAdvisorship] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // States for consultation response & add
  const [activeLog, setActiveLog] = useState<any>(null);
  const [isAddingLog, setIsAddingLog] = useState(false);
  
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logProblem, setLogProblem] = useState('');
  const [logSolution, setLogSolution] = useState('');
  const [logStatus, setLogStatus] = useState('approved');

  const { data: advisorships, isLoading } = useQuery({
    queryKey: ['dosen_ta_students', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_advisors')
        .select(`
          id, role,
          ta_submissions (
            id, type_id, title, status, document_link, comments, created_at,
            ta_types (id, name),
            profiles:student_id (id, full_name, nim)
          )
        `)
        .eq('dosen_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: consultationLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['ta_consultation_logs', selectedAdvisorship?.ta_submissions?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_consultation_logs')
        .select('*')
        .eq('submission_id', selectedAdvisorship.ta_submissions.id)
        .eq('dosen_id', user?.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAdvisorship?.ta_submissions?.id && !!user?.id
  });

  const respondMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ta_consultation_logs')
        .update({
          solution: logSolution,
          status: logStatus
        })
        .eq('id', activeLog.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tanggapan berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['ta_consultation_logs'] });
      resetLogForm();
    },
    onError: (error: any) => {
      toast.error('Gagal menyimpan tanggapan: ' + error.message);
    }
  });

  const addLogMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ta_consultation_logs')
        .insert({
          submission_id: selectedAdvisorship.ta_submissions.id,
          dosen_id: user?.id,
          date: logDate,
          problem: logProblem,
          solution: logSolution,
          status: logStatus
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Log bimbingan berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['ta_consultation_logs'] });
      resetLogForm();
    },
    onError: (error: any) => {
      toast.error('Gagal menambahkan log: ' + error.message);
    }
  });

  const openLogResponse = (log: any) => {
    setActiveLog(log);
    setIsAddingLog(false);
    setLogSolution(log.solution || '');
    setLogStatus(log.status || 'approved');
  };

  const openAddLog = () => {
    setActiveLog(null);
    setIsAddingLog(true);
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogProblem('');
    setLogSolution('');
    setLogStatus('approved');
  };

  const resetLogForm = () => {
    setActiveLog(null);
    setIsAddingLog(false);
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Bimbingan Tugas Akhir</h1>
            <p className="text-muted-foreground mt-1">
              Pantau mahasiswa bimbingan dan kelola log konsultasi harian.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Mahasiswa Bimbingan</CardTitle>
            <CardDescription>Daftar mahasiswa yang diplot kepada Anda sebagai dosen pembimbing.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mahasiswa</TableHead>
                    <TableHead>Jenis & Topik</TableHead>
                    <TableHead>Peran Anda</TableHead>
                    <TableHead>Status TA</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">Memuat data...</TableCell>
                    </TableRow>
                  ) : !advisorships || advisorships.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Belum ada mahasiswa bimbingan yang diplot ke Anda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    advisorships.map((adv: any) => (
                      <TableRow key={adv.id}>
                        <TableCell>
                          <div className="font-medium">{adv.ta_submissions?.profiles?.full_name}</div>
                          <div className="text-xs text-muted-foreground">{adv.ta_submissions?.profiles?.nim}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="mb-1">{adv.ta_submissions?.ta_types?.name}</Badge>
                          <div className="font-medium line-clamp-2" title={adv.ta_submissions?.title}>{adv.ta_submissions?.title}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{adv.role}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={adv.ta_submissions?.status === 'approved' ? 'default' : 'secondary'}>
                            {adv.ta_submissions?.status === 'approved' ? 'Berjalan' : adv.ta_submissions?.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedAdvisorship(adv);
                            setIsDetailOpen(true);
                          }}>
                            <BookOpen className="w-4 h-4 mr-2" /> Kelola Bimbingan
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

        <Dialog open={isDetailOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDetailOpen(false);
            resetLogForm();
          }
        }}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Detail & Log Bimbingan</DialogTitle>
              <DialogDescription>
                Kelola aktivitas bimbingan untuk mahasiswa {selectedAdvisorship?.ta_submissions?.profiles?.full_name}
              </DialogDescription>
            </DialogHeader>

            {selectedAdvisorship && (
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
                  <div>
                    <Label className="text-muted-foreground text-xs">Topik Tugas Akhir</Label>
                    <p className="font-medium mt-1">{selectedAdvisorship.ta_submissions?.title}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Link Dokumen / Draft</Label>
                    {selectedAdvisorship.ta_submissions?.document_link ? (
                      <div className="mt-1">
                        <a 
                          href={selectedAdvisorship.ta_submissions.document_link.startsWith('http') ? selectedAdvisorship.ta_submissions.document_link : `https://${selectedAdvisorship.ta_submissions.document_link}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary hover:underline text-sm font-medium"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" /> Buka Dokumen
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm italic mt-1 text-muted-foreground">Tidak ada dokumen</p>
                    )}
                  </div>
                </div>

                {selectedAdvisorship.ta_submissions && selectedAdvisorship.ta_submissions.status === 'approved' && user?.id && (
                  <TADosenMilestones 
                    submissionId={selectedAdvisorship.ta_submissions.id} 
                    typeId={selectedAdvisorship.ta_submissions.ta_types?.id || selectedAdvisorship.ta_submissions.type_id} 
                    dosenId={profile?.id || user.id} 
                  />
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold flex items-center">
                      <FileText className="w-5 h-5 mr-2" /> Riwayat Log Konsultasi
                    </h3>
                    <Button size="sm" onClick={openAddLog}>
                      <Plus className="w-4 h-4 mr-2" /> Tambah Log Manual
                    </Button>
                  </div>

                  {(activeLog || isAddingLog) ? (
                    <Card className="border-primary/50 shadow-sm">
                      <CardHeader className="py-3 bg-primary/5 border-b">
                        <CardTitle className="text-base flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2 text-primary" />
                          {isAddingLog ? 'Tambah Log Bimbingan Baru' : 'Beri Tanggapan / Solusi'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        {isAddingLog ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Tanggal Konsultasi</Label>
                                <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="mt-1" />
                              </div>
                              <div>
                                <Label>Status Persetujuan</Label>
                                <Select value={logStatus} onValueChange={setLogStatus}>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="approved">Disetujui (Lanjut)</SelectItem>
                                    <SelectItem value="revision">Revisi</SelectItem>
                                    <SelectItem value="rejected">Ditolak / Ulang</SelectItem>
                                    <SelectItem value="pending">Menunggu</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label>Catatan Kemajuan / Masalah (Dari Mahasiswa/Dosen)</Label>
                              <Textarea 
                                className="mt-1" 
                                placeholder="Tuliskan apa saja yang dibahas pada bimbingan ini..." 
                                value={logProblem} 
                                onChange={e => setLogProblem(e.target.value)}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-md text-sm mb-4">
                              <div>
                                <span className="text-muted-foreground block text-xs">Tanggal Konsultasi:</span>
                                <span className="font-medium flex items-center mt-1">
                                  <Calendar className="w-3 h-3 mr-1" /> {new Date(activeLog.date).toLocaleDateString('id-ID')}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-xs">Status Saat Ini:</span>
                                <Badge variant="outline" className="mt-1">{activeLog.status}</Badge>
                              </div>
                              <div className="col-span-2 mt-2">
                                <span className="text-muted-foreground block text-xs mb-1">Catatan / Laporan Mahasiswa:</span>
                                <p className="font-medium whitespace-pre-wrap">{activeLog.problem}</p>
                              </div>
                            </div>
                            
                            <div>
                              <Label>Status Validasi</Label>
                              <Select value={logStatus} onValueChange={setLogStatus}>
                                <SelectTrigger className="w-full sm:w-1/2 mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="approved">Disetujui (Lanjut)</SelectItem>
                                  <SelectItem value="revision">Revisi</SelectItem>
                                  <SelectItem value="rejected">Ditolak / Ulang</SelectItem>
                                  <SelectItem value="pending">Menunggu</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        <div>
                          <Label>Solusi / Arahan Dosen Pembimbing</Label>
                          <Textarea 
                            className="mt-1" 
                            placeholder="Tuliskan arahan, revisi, atau solusi yang harus dikerjakan mahasiswa..." 
                            value={logSolution} 
                            onChange={e => setLogSolution(e.target.value)}
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <Button variant="outline" onClick={resetLogForm}>Batal</Button>
                          {isAddingLog ? (
                            <Button onClick={() => addLogMutation.mutate()} disabled={addLogMutation.isPending || !logProblem.trim()}>
                              {addLogMutation.isPending ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Log Baru</>}
                            </Button>
                          ) : (
                            <Button onClick={() => respondMutation.mutate()} disabled={respondMutation.isPending}>
                              {respondMutation.isPending ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Tanggapan</>}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Laporan Kemajuan</TableHead>
                          <TableHead>Tanggapan Anda</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingLogs ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6">Memuat riwayat...</TableCell>
                          </TableRow>
                        ) : !consultationLogs || consultationLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              Belum ada log konsultasi.
                            </TableCell>
                          </TableRow>
                        ) : (
                          consultationLogs.map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {new Date(log.date).toLocaleDateString('id-ID')}
                              </TableCell>
                              <TableCell>
                                <p className="text-sm line-clamp-2" title={log.problem}>{log.problem}</p>
                              </TableCell>
                              <TableCell>
                                {log.solution ? (
                                  <p className="text-sm line-clamp-2 text-primary" title={log.solution}>{log.solution}</p>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Belum ditanggapi</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  log.status === 'approved' ? 'default' :
                                  log.status === 'rejected' ? 'destructive' :
                                  log.status === 'revision' ? 'secondary' : 'outline'
                                }>
                                  {log.status === 'approved' ? 'Disetujui' :
                                   log.status === 'rejected' ? 'Ditolak' :
                                   log.status === 'revision' ? 'Revisi' : 'Menunggu'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => openLogResponse(log)}>
                                  <MessageSquare className="w-3 h-3 mr-1" /> Respons
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
