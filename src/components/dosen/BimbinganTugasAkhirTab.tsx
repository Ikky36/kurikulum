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
import { RekapitulasiFaseView } from '@/pages/tugas-akhir/RekapitulasiFaseView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users } from 'lucide-react';
import { KartuBimbinganViewerModal } from '@/components/document/KartuBimbinganViewerModal';
import { parseApprovalsFromComments, serializeApprovalsToComments, useTaApprovalActions, getDocApproval } from '@/lib/documentApprovals';

export function BimbinganTugasAkhirTab() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedAdvisorship, setSelectedAdvisorship] = useState<any>(null);
  const [dosenSubTab, setDosenSubTab] = useState('daftar');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTemplateCode, setPrintTemplateCode] = useState<string>('kartu_bimbingan_ta');
  
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
            id, title, type_id, status, document_link, comments, created_at, current_phase_id,
            ta_types (id, name),
            current_phase:ta_master_phases (id, name, order_num),
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
      <Tabs value={dosenSubTab} onValueChange={setDosenSubTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 w-full sm:w-auto flex overflow-x-auto justify-start h-auto scrollbar-none">
          <TabsTrigger value="daftar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-xs sm:text-sm">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Daftar Mahasiswa Bimbingan
          </TabsTrigger>
          <TabsTrigger value="rekapitulasi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-xs sm:text-sm">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Rekapitulasi Progres Fase
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daftar" className="mt-0 space-y-6">
          <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Daftar Mahasiswa Bimbingan TA</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Daftar mahasiswa Tugas Akhir yang diplot kepada Anda sebagai dosen pembimbing.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Desktop Table View */}
          <div className="rounded-md border hidden md:block overflow-x-auto">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Memuat data...</div>
            ) : !advisorships || advisorships.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                Belum ada mahasiswa bimbingan Tugas Akhir yang diplot ke Anda.
              </div>
            ) : (
              advisorships.map((adv: any) => (
                <div key={adv.id} className="p-4 rounded-xl border bg-card shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {adv.ta_submissions?.profiles?.full_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        NIM: {adv.ta_submissions?.profiles?.nim || '-'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant={adv.ta_submissions?.status === 'approved' ? 'default' : 'secondary'} className="text-[11px] px-2 py-0.5">
                        {adv.ta_submissions?.status === 'approved' ? 'Berjalan' : adv.ta_submissions?.status}
                      </Badge>
                      <span className="text-[11px] font-medium text-muted-foreground">{adv.role}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {adv.ta_submissions?.ta_types?.name || 'Tugas Akhir'}
                    </Badge>
                    <p className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed" title={adv.ta_submissions?.title}>
                      {adv.ta_submissions?.title}
                    </p>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full relative justify-center text-xs h-9 mt-1" 
                    onClick={() => {
                      setSelectedAdvisorship(adv);
                      setIsDetailOpen(true);
                    }}
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Kelola Bimbingan
                    {hasPendingLog(adv.ta_submissions?.id) && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                      </span>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="rekapitulasi" className="mt-0">
          <RekapitulasiFaseView scope="dosen" dosenId={profile?.id || user?.id} />
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDetailOpen(false);
          resetLogForm();
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-full max-w-4xl h-[90vh] sm:h-[85vh] p-4 sm:p-6 flex flex-col overflow-hidden">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base sm:text-lg">Detail & Log Bimbingan</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Kelola aktivitas bimbingan untuk mahasiswa {selectedAdvisorship?.ta_submissions?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>

          {selectedAdvisorship && (
            <div className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 bg-muted/30 rounded-lg border min-w-0">
                <div>
                  <Label className="text-muted-foreground text-xs">Topik Tugas Akhir</Label>
                  <p className="font-medium text-sm mt-1">{selectedAdvisorship.ta_submissions?.title}</p>
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
                <div className="min-w-0 max-w-full">
                  <TADosenMilestones 
                    submissionId={selectedAdvisorship.ta_submissions.id} 
                    typeId={selectedAdvisorship.ta_submissions.ta_types?.id || selectedAdvisorship.ta_submissions.type_id} 
                    dosenId={profile?.id || user?.id || ''} 
                  />
                </div>
              )}

              {(() => {
                const isAdvisor2 = selectedAdvisorship?.role?.toLowerCase().includes('2');
                const myRoleKey = isAdvisor2 ? 'advisor_2' : 'advisor_1';
                const myRoleLabel = isAdvisor2 ? 'Dosen Pembimbing 2' : 'Dosen Pembimbing 1';
                const approvalState = parseApprovalsFromComments(selectedAdvisorship?.ta_submissions?.comments);

                const kartuApproval = getDocApproval(approvalState, 'kartu_bimbingan_ta');
                const isApprovalRequested = Boolean(kartuApproval?.requested);
                const myApproval = kartuApproval?.signers?.[myRoleKey];
                const isMyApproved = !!myApproval?.is_approved;
                const kaprodiApproval = kartuApproval?.signers?.kaprodi;
                const approvedLogsCount = consultationLogs?.filter((l: any) => l.status === 'approved').length || 0;

                const proposalApproval = getDocApproval(approvalState, 'surat_pengesahan_proposal');
                const isProposalRequested = Boolean(proposalApproval?.requested);
                const proposalMyApproval = proposalApproval?.signers?.[myRoleKey];
                const isProposalApproved = !!proposalMyApproval?.is_approved;

                return (
                  <div className="space-y-4 min-w-0 max-w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold flex items-center">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" /> Riwayat Log Konsultasi
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Kelola dan berikan tanggapan atau evaluasi terhadap setiap sesi bimbingan mahasiswa.
                        </p>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setPrintTemplateCode('kartu_bimbingan_ta'); setIsPrintModalOpen(true); }}
                          className="gap-1.5 flex-1 sm:flex-initial justify-center text-xs h-9"
                        >
                          <Printer className="w-3.5 h-3.5" /> Cetak Kartu Bimbingan
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={openAddLog}
                          className="gap-1.5 flex-1 sm:flex-initial justify-center text-xs h-9"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Log Manual
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 bg-muted rounded-md text-sm mb-4">
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
                            <div className="col-span-1 sm:col-span-2 mt-2">
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

                {/* Desktop Table View */}
                <div className="rounded-md border hidden md:block overflow-x-auto">
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

                {/* Mobile Card View: Log Konsultasi */}
                <div className="md:hidden space-y-3">
                  {loadingLogs ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">Memuat riwayat...</div>
                  ) : !consultationLogs || consultationLogs.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                      Belum ada log konsultasi.
                    </div>
                  ) : (
                    consultationLogs.map((log: any) => (
                      <Card key={log.id} className="p-3.5 space-y-2.5 border shadow-2xs">
                        <div className="flex items-center justify-between gap-2 border-b pb-2">
                          <span className="text-xs font-semibold flex items-center text-foreground">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary" />
                            {new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <Badge variant={
                            log.status === 'approved' ? 'default' :
                            log.status === 'rejected' ? 'destructive' :
                            log.status === 'revision' ? 'secondary' : 'outline'
                          } className="text-[11px] px-2 py-0.5">
                            {log.status === 'approved' ? 'Disetujui' :
                             log.status === 'rejected' ? 'Ditolak' :
                             log.status === 'revision' ? 'Revisi' : 'Menunggu'}
                          </Badge>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div>
                            <span className="text-[11px] font-medium text-muted-foreground">Laporan Kemajuan:</span>
                            <p className="font-medium text-foreground mt-0.5 leading-relaxed">{log.problem}</p>
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-muted-foreground">Tanggapan / Arahan Anda:</span>
                            {log.solution ? (
                              <p className="font-medium text-primary mt-0.5 leading-relaxed">{log.solution}</p>
                            ) : (
                              <p className="text-muted-foreground italic mt-0.5">Belum ditanggapi</p>
                            )}
                          </div>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full justify-center text-xs h-8 mt-1" 
                          onClick={() => openLogResponse(log)}
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Beri Tanggapan / Respons
                        </Button>
                      </Card>
                    ))
                  )}
                </div>

                {/* 3 Tombol Pengesahan Dokumen Tugas Akhir */}
                <div className="pt-4 border-t flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
                  {/* 1. Pengesahan Proposal TA (Nota Dinas) */}
                  {isProposalApproved ? (
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto justify-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 h-9 px-3.5"
                        onClick={() => {
                          setPrintTemplateCode('surat_pengesahan_proposal');
                          setIsPrintModalOpen(true);
                        }}
                        title="Lihat Surat Pengesahan Proposal TA yang telah Anda sahkan"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Proposal TA (Telah Disahkan ✓)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full sm:w-auto justify-center h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
                        disabled={revokeAdvisorApproval.isPending}
                        title="Batalkan pengesahan proposal TA"
                        onClick={() => {
                          if (window.confirm('Batalkan pengesahan resmi Anda pada proposal TA mahasiswa ini?')) {
                            revokeAdvisorApproval.mutate({
                              submissionId: selectedAdvisorship.ta_submissions.id,
                              roleKey: myRoleKey,
                              docCode: 'surat_pengesahan_proposal',
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
                        <Undo2 className="w-3.5 h-3.5 mr-1" /> Batal Sahkan
                      </Button>
                    </div>
                  ) : isProposalRequested ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full sm:w-auto justify-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9 px-3.5"
                      disabled={approveByAdvisor.isPending}
                      onClick={() => {
                        const mhsName = selectedAdvisorship?.ta_submissions?.profiles?.full_name || 'mahasiswa';
                        if (window.confirm(`Sahkan secara resmi Proposal Tugas Akhir (Nota Dinas) untuk mahasiswa ${mhsName}? Tanda tangan digital Anda akan dibubuhkan pada dokumen resmi.`)) {
                          approveByAdvisor.mutate({
                            submissionId: selectedAdvisorship.ta_submissions.id,
                            roleKey: myRoleKey,
                            roleLabel: myRoleLabel,
                            docCode: 'surat_pengesahan_proposal',
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
                        }
                      }}
                      title="Mahasiswa telah mengajukan permohonan. Klik untuk mengesahkan Proposal TA."
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Sahkan Proposal TA Diajukan
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto justify-center gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 h-9 px-3.5"
                      disabled={approveByAdvisor.isPending}
                      onClick={() => {
                        const mhsName = selectedAdvisorship?.ta_submissions?.profiles?.full_name || 'mahasiswa';
                        if (window.confirm(`Mahasiswa belum menekan tombol ajukan pengesahan. Apakah Anda ingin langsung mengesahkan Proposal Tugas Akhir (Nota Dinas) untuk mahasiswa ${mhsName} ini?`)) {
                          approveByAdvisor.mutate({
                            submissionId: selectedAdvisorship.ta_submissions.id,
                            roleKey: myRoleKey,
                            roleLabel: myRoleLabel,
                            docCode: 'surat_pengesahan_proposal',
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
                        }
                      }}
                      title="Sahkan Proposal Tugas Akhir"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Sahkan Proposal TA
                    </Button>
                  )}

                  {/* 2. Sahkan Laporan TA (Belum aktif karena dokumennya belum dikostum) */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="w-full sm:w-auto justify-center gap-1.5 text-xs text-muted-foreground h-9 px-3.5"
                    title="Belum aktif karena dokumennya belum dikostum"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Sahkan Laporan TA
                  </Button>

                  {/* 3. Sahkan Kartu Bimbingan TA */}
                  {isMyApproved ? (
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="w-full sm:w-auto justify-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 h-9 px-3.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Sahkan Kartu Bimbingan TA (Telah Disahkan)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full sm:w-auto justify-center h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
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
                        <Undo2 className="w-3.5 h-3.5 mr-1" /> Batalkan
                      </Button>
                    </div>
                  ) : isApprovalRequested ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm text-xs h-9 px-3.5"
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
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Sahkan Kartu Bimbingan TA
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="w-full sm:w-auto justify-center gap-1.5 text-xs text-muted-foreground h-9 px-3.5"
                      title="Mahasiswa belum mengajukan permohonan pengesahan"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Sahkan Kartu Bimbingan TA (Belum Diajukan)
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
          </div>
        )}
        </DialogContent>
      </Dialog>

      {/* Modal Cetak Dokumen Tugas Akhir */}
      {selectedAdvisorship?.ta_submissions && (
        <KartuBimbinganViewerModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          submission={selectedAdvisorship.ta_submissions}
          consultationLogs={consultationLogs || []}
          studentProfile={selectedAdvisorship.ta_submissions?.profiles}
          templateCode={printTemplateCode}
        />
      )}
    </div>
  );
}
