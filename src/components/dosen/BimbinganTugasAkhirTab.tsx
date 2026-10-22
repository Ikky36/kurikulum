import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, CheckCircle2, FileText, MessageSquare, Plus, Save, Clock, ExternalLink, Printer, ShieldCheck, Undo2, FileCheck, GraduationCap, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { TADosenMilestones } from '@/pages/tugas-akhir/TADosenMilestones';
import { KartuBimbinganViewerModal } from '@/components/document/KartuBimbinganViewerModal';
import { parseApprovalsFromComments, serializeApprovalsToComments, useTaApprovalActions } from '@/lib/documentApprovals';

export function BimbinganTugasAkhirTab() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedAdvisorship, setSelectedAdvisorship] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // States for consultation response & add
  const [activeLog, setActiveLog] = useState<any>(null);
  const [isAddingLog, setIsAddingLog] = useState(false);
  
  const { approveByAdvisor, revokeAdvisorApproval } = useTaApprovalActions();
  
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
            id, title, type_id, status, document_link, comments, created_at,
            ta_types (id, name),
            profiles:student_id (id, full_name, nim, program),
            ta_advisors (id, role, profiles (id, full_name, nip, signature_url, paraf_url))
          )
        `)
        .eq('dosen_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Sinkronkan selectedAdvisorship saat query advisorships diperbarui dari server
  React.useEffect(() => {
    if (selectedAdvisorship && advisorships) {
      const refreshed = advisorships.find((a: any) => a.id === selectedAdvisorship.id);
      if (refreshed) {
        setSelectedAdvisorship(refreshed);
      }
    }
  }, [advisorships]);

  const { data: consultationLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['ta_consultation_logs', selectedAdvisorship?.ta_submissions?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_consultation_logs')
        .select('*, profiles:dosen_id (id, full_name, nip, signature_url, paraf_url)')
        .eq('submission_id', selectedAdvisorship.ta_submissions.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAdvisorship?.ta_submissions?.id && !!user?.id
  });

  const { data: allPendingLogs } = useQuery({
    queryKey: ['dosen_all_pending_ta_logs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_consultation_logs')
        .select('submission_id')
        .eq('dosen_id', user?.id)
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const hasPendingLog = (submissionId: string) => {
    return allPendingLogs?.some(log => log.submission_id === submissionId);
  };

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
    <div className="space-y-6 animate-slide-up">
      <Card>
        <CardHeader>
          <CardTitle>Daftar Mahasiswa Bimbingan TA</CardTitle>
          <CardDescription>Daftar mahasiswa Tugas Akhir yang diplot kepada Anda sebagai dosen pembimbing.</CardDescription>
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
                      Belum ada mahasiswa bimbingan Tugas Akhir yang diplot ke Anda.
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
                        <Button variant="outline" size="sm" className="relative" onClick={() => {
                          setSelectedAdvisorship(adv);
                          setIsDetailOpen(true);
                        }}>
                          <BookOpen className="w-4 h-4 mr-2" /> Kelola Bimbingan
                          {hasPendingLog(adv.ta_submissions?.id) && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                            </span>
                          )}
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

              {selectedAdvisorship.ta_submissions && (
                <TADosenMilestones 
                  submissionId={selectedAdvisorship.ta_submissions.id} 
                  typeId={selectedAdvisorship.ta_submissions.ta_types?.id || selectedAdvisorship.ta_submissions.type_id} 
                  dosenId={profile?.id || user?.id || ''} 
                />
              )}

              {(() => {
                const isAdvisor2 = selectedAdvisorship?.role?.toLowerCase().includes('2');
                const myRoleKey = isAdvisor2 ? 'advisor_2' : 'advisor_1';
                const myRoleLabel = isAdvisor2 ? 'Dosen Pembimbing 2' : 'Dosen Pembimbing 1';
                const approvalState = parseApprovalsFromComments(selectedAdvisorship?.ta_submissions?.comments);
                const isApprovalRequested = Boolean(approvalState?.requested);
                const myApproval = approvalState?.signers?.[myRoleKey];
                const isMyApproved = !!myApproval?.is_approved;
                const kaprodiApproval = approvalState?.signers?.kaprodi;
                const approvedLogsCount = consultationLogs?.filter((l: any) => l.status === 'approved').length || 0;

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center">
                          <FileText className="w-5 h-5 mr-2" /> Riwayat Log Konsultasi
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Kelola dan berikan tanggapan atau evaluasi terhadap setiap sesi bimbingan mahasiswa.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={openAddLog}>
                          <Plus className="w-4 h-4 mr-2" /> Tambah Log Manual
                        </Button>
                      </div>
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

                {/* SECTION LAYANAN PENGESAHAN & PENCETAKAN DOKUMEN MAHASISWA OLEH DOSEN */}
                <div className="pt-4 border-t space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-primary" />
                        Pengesahan & Pencetakan Dokumen Mahasiswa
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Bubuhkan pengesahan tanda tangan digital pada dokumen resmi mahasiswa dan cetak berkas bimbingan.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* DOKUMEN 1: KARTU BIMBINGAN */}
                    <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs hover:border-primary/50 transition-all">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-semibold text-sm leading-tight">Kartu Bimbingan</h5>
                              <span className="text-[11px] text-muted-foreground">Log konsultasi & kendali</span>
                            </div>
                          </div>
                          {isMyApproved ? (
                            <Badge className="bg-emerald-600 text-white text-[11px] gap-1 py-0.5">
                              <ShieldCheck className="w-3 h-3" /> Disahkan
                            </Badge>
                          ) : isApprovalRequested ? (
                            <Badge variant="outline" className="text-[11px] bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 gap-1 py-0.5">
                              <Clock className="w-3 h-3 text-amber-600" /> Perlu Disahkan
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[11px]">
                              Belum Diajukan
                            </Badge>
                          )}
                        </div>

                        {/* Status Pengesahan Ringkas per Pejabat */}
                        <div className="p-2.5 bg-muted/40 rounded-lg text-[11px] space-y-1.5 border border-muted">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status Anda ({myRoleLabel}):</span>
                            <span className={isMyApproved ? "text-emerald-600 font-semibold" : isApprovalRequested ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                              {isMyApproved 
                                ? `Disahkan (${myApproval?.approved_at ? new Date(myApproval.approved_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''})` 
                                : isApprovalRequested ? 'Menunggu Anda' : 'Belum Diajukan'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Pengesahan Kaprodi:</span>
                            <span className={kaprodiApproval?.is_approved ? "text-emerald-600 font-medium flex items-center gap-1" : "text-muted-foreground"}>
                              {kaprodiApproval?.is_approved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Disahkan ({kaprodiApproval.signer_name})</> : 'Belum Disahkan'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsPrintModalOpen(true)}
                          className="gap-1 text-xs"
                        >
                          <Printer className="w-3.5 h-3.5" /> Cetak Kartu
                        </Button>

                        {isMyApproved ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                            disabled={revokeAdvisorApproval.isPending}
                            onClick={() => {
                              if (window.confirm('Batalkan pengesahan resmi Anda pada kartu bimbingan mahasiswa ini?')) {
                                revokeAdvisorApproval.mutate({
                                  submissionId: selectedAdvisorship.ta_submissions.id,
                                  roleKey: myRoleKey,
                                }, {
                                  onSuccess: (updatedApproval) => {
                                    setSelectedAdvisorship((prev: any) => {
                                      if (!prev) return prev;
                                      const newComments = serializeApprovalsToComments(prev.ta_submissions?.comments, updatedApproval);
                                      return {
                                        ...prev,
                                        ta_submissions: {
                                          ...prev.ta_submissions,
                                          comments: newComments,
                                        },
                                      };
                                    });
                                  }
                                });
                              }
                            }}
                          >
                            <Undo2 className="w-3 h-3" /> Batalkan Sahkan
                          </Button>
                        ) : isApprovalRequested ? (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs shadow-sm"
                            disabled={approveByAdvisor.isPending}
                            onClick={() => {
                              const mhsName = selectedAdvisorship?.ta_submissions?.profiles?.full_name || 'mahasiswa';
                              if (approvedLogsCount === 0) {
                                if (!window.confirm(`Perhatian: Mahasiswa ${mhsName} belum memiliki riwayat bimbingan yang disetujui (0 log approved). Apakah Anda yakin ingin tetap mengesahkan kartu bimbingan ini?`)) {
                                  return;
                                }
                              } else if (!window.confirm(`Sahkan seluruh kartu bimbingan mahasiswa ${mhsName} (${approvedLogsCount} pertemuan bimbingan disetujui)? Tanda tangan digital Anda akan dibubuhkan pada dokumen pengesahan resmi.`)) {
                                return;
                              }

                              approveByAdvisor.mutate({
                                submissionId: selectedAdvisorship.ta_submissions.id,
                                roleKey: myRoleKey,
                                roleLabel: myRoleLabel,
                                signer: {
                                  id: user?.id,
                                  name: profile?.full_name || user?.email || 'Dosen Pembimbing',
                                  nidn: profile?.nip || '',
                                  signature_url: profile?.signature_url || profile?.paraf_url,
                                  paraf_url: profile?.paraf_url || profile?.signature_url,
                                },
                              }, {
                                onSuccess: (updatedApproval) => {
                                  setSelectedAdvisorship((prev: any) => {
                                    if (!prev) return prev;
                                    const newComments = serializeApprovalsToComments(prev.ta_submissions?.comments, updatedApproval);
                                    return {
                                      ...prev,
                                      ta_submissions: {
                                        ...prev.ta_submissions,
                                        comments: newComments,
                                      },
                                    };
                                  });
                                }
                              });
                            }}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Sahkan Kartu
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground gap-1 py-1">
                            <Clock className="w-3 h-3 text-amber-500" /> Belum Diajukan Mhs
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* DOKUMEN 2: PENGESAHAN PROPOSAL */}
                    <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-semibold text-sm leading-tight">Pengesahan Proposal</h5>
                              <span className="text-[11px] text-muted-foreground">Naskah Seminar Proposal</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Segera Hadir</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Pengesahan perbaikan naskah proposal skripsi pasca ujian seminar proposal mahasiswa.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                        <Button variant="outline" size="sm" disabled className="gap-1 text-xs">
                          <Printer className="w-3.5 h-3.5" /> Cetak Proposal
                        </Button>
                        <Button variant="secondary" size="sm" disabled className="gap-1 text-xs">
                          <ShieldCheck className="w-3.5 h-3.5" /> Sahkan Proposal
                        </Button>
                      </div>
                    </div>

                    {/* DOKUMEN 3: PENGESAHAN TUGAS AKHIR */}
                    <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-semibold text-sm leading-tight">Pengesahan Tugas Akhir</h5>
                              <span className="text-[11px] text-muted-foreground">Naskah Skripsi / TA Final</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Segera Hadir</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Lembar pengesahan naskah skripsi lengkap dan kelulusan yudisium tugas akhir.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                        <Button variant="outline" size="sm" disabled className="gap-1 text-xs">
                          <Printer className="w-3.5 h-3.5" /> Cetak Naskah TA
                        </Button>
                        <Button variant="secondary" size="sm" disabled className="gap-1 text-xs">
                          <ShieldCheck className="w-3.5 h-3.5" /> Sahkan Tugas Akhir
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          </div>
        )}
        </DialogContent>
      </Dialog>

      {/* Modal Cetak Kartu Bimbingan Tugas Akhir */}
      {selectedAdvisorship?.ta_submissions && (
        <KartuBimbinganViewerModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          submission={selectedAdvisorship.ta_submissions}
          consultationLogs={consultationLogs || []}
          studentProfile={selectedAdvisorship.ta_submissions?.profiles}
        />
      )}
    </div>
  );
}
