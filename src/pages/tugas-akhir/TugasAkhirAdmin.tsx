import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, XCircle, Users, ExternalLink, Plus, Trash2, Save, Calendar, Clock, MapPin, Search, Share2, ShieldCheck, Printer, FileText } from 'lucide-react';
import { SeminarDocumentViewerModal } from '@/components/document/SeminarDocumentViewerModal';
import { TableSortHeader, SortConfig, sortData } from '@/components/ui/table-sort-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MasterPhaseAdmin } from './MasterPhaseAdmin';
import { RekapitulasiFaseView } from './RekapitulasiFaseView';
import { BarChart3 } from 'lucide-react';
import { SubTargetViewer } from './SubTargetViewer';
import { ListTodo } from 'lucide-react';
import { useAcademicPeriod } from '@/hooks/useAcademicPeriod';
import { calculateSemester } from '@/utils/academicHelpers';
import { StudentSemesterBadge } from '@/components/ui/semester-badge';
import { cleanCommentsForDisplay, serializeApprovalsToComments, parseApprovalsFromComments } from '@/lib/documentApprovals';
import { SeminarScheduleDialog } from './SeminarScheduleDialog';

export default function TugasAkhirAdmin() {
  const { activeAcademicYear, activeSemester } = useAcademicPeriod();
  const [activeTab, setActiveTab] = useState('pengajuan');
  
  // STATE FOR PENGAJUAN
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<string>('approved');
  const [formComments, setFormComments] = useState<string>('');
  const [formAdvisors, setFormAdvisors] = useState<Array<{ id: string, role: string }>>([{ id: '', role: 'Pembimbing 1' }]);
  
  // FILTERS
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // STATE FOR SUB TARGET VIEWER
  const [isSubTargetOpen, setIsSubTargetOpen] = useState(false);
  const [subTargetData, setSubTargetData] = useState<{ id: string, name: string }>({ id: '', name: '' });

  // STATE FOR SEMINAR
  const [selectedSeminar, setSelectedSeminar] = useState<any>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedSeminarForDoc, setSelectedSeminarForDoc] = useState<any>(null);

  const openDocModal = (sem: any) => {
    setSelectedSeminarForDoc(sem);
    setIsDocModalOpen(true);
  };
  const [isSeminarDetailOpen, setIsSeminarDetailOpen] = useState(false);

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

  const { data: submissions, isLoading, refetch: refetchSubmissions } = useQuery({
    queryKey: ['admin_ta_submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_submissions')
        .select(`
          *,
          profiles:student_id(full_name, nim, program, enrollment_year),
          ta_types(id, name),
          ta_advisors(role, dosen_id, profiles(full_name)),
          current_phase:ta_master_phases(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: seminars, isLoading: seminarsLoading, refetch: refetchSeminars } = useQuery({
    queryKey: ['admin_ta_seminars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_seminars')
        .select(`
          *,
          chairperson:chairperson_id(id, full_name, nip, email),
          ta_submissions(id, title, student_id, profiles:student_id(full_name, nim, program)),
          ta_examiners(*, profiles:dosen_id(id, full_name, nip, email))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const uniquePrograms = Array.from(new Set(submissions?.map((s: any) => s.profiles?.program).filter(Boolean) || []));
  const uniqueTypes = Array.from(new Set(submissions?.map((s: any) => s.ta_types?.name).filter(Boolean) || []));
  const uniqueStatuses = Array.from(new Set(submissions?.map((s: any) => s.status).filter(Boolean) || []));

  const filteredSubmissions = submissions?.filter((sub: any) => {
    if (filterProgram !== 'all' && sub.profiles?.program !== filterProgram) return false;
    if (filterType !== 'all' && sub.ta_types?.name !== filterType) return false;
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = sub.profiles?.full_name?.toLowerCase().includes(q);
      const matchNim = sub.profiles?.nim?.toLowerCase().includes(q);
      const matchTitle = sub.title?.toLowerCase().includes(q);
      if (!matchName && !matchNim && !matchTitle) return false;
    }
    return true;
  });

  const sortedSubmissions = sortData(
    filteredSubmissions,
    sortConfig,
    (item, key) => {
      if (key === 'mahasiswa') return item.profiles?.full_name || '';
      if (key === 'judul') return item.ta_types?.name + ' ' + item.title || '';
      if (key === 'fase') return item.ta_phases?.name || '';
      if (key === 'status') return item.status || '';
      return item[key];
    }
  );

  const processMutation = useMutation({
    mutationFn: async () => {
      const approvalState = parseApprovalsFromComments(selectedSubmission.comments);
      const cleanPrev = cleanCommentsForDisplay(selectedSubmission.comments);
      let humanComments = cleanPrev || '';

      if (formComments) {
        humanComments = `[Catatan Admin]: ${formComments}\n\n[Catatan Mahasiswa]: ${cleanPrev || '-'}`;
      }
      const finalComments = serializeApprovalsToComments(humanComments, approvalState);

      let updateData: any = { 
        status: formStatus,
        comments: finalComments
      };

      if (formStatus === 'approved' && !selectedSubmission.current_phase_id) {
        // Try to assign the first phase automatically
        const targetTypeId = selectedSubmission.ta_types?.id || selectedSubmission.type_id;
        const { data: firstPhase, error: phaseError } = await supabase
          .from('ta_master_phases')
          .select('id')
          .eq('ta_type_id', targetTypeId)
          .order('order_num', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (firstPhase) {
          updateData.current_phase_id = firstPhase.id;
        } else {
          console.error('Error fetching master phases:', phaseError, 'for type:', targetTypeId);
          throw new Error('Gagal menetapkan fase: Master Fase belum dibuat untuk jenis TA ini.');
        }
      }

      const { error: updateError } = await supabase
        .from('ta_submissions')
        .update(updateData)
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

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ta_submissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pengajuan berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['admin_ta_submissions'] });
      refetchSubmissions();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus pengajuan');
    }
  });

  const openSeminarDetail = (seminar: any) => {
    setSelectedSeminar(seminar);
    setIsSeminarDetailOpen(true);
  };

  return (
    <Layout>
      <div className="container px-3 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Kelola Tugas Akhir</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Review pengajuan, plotting dosen, dan jadwal sidang mahasiswa.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 w-full flex overflow-x-auto justify-start sm:justify-start h-auto scrollbar-none">
            <TabsTrigger value="pengajuan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">
              Pengajuan
            </TabsTrigger>
            <TabsTrigger value="seminar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">
              Pendaftaran Seminar & Sidang
            </TabsTrigger>
            <TabsTrigger value="fase" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">
              Pengaturan Master Fase
            </TabsTrigger>
            <TabsTrigger value="rekapitulasi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Rekapitulasi Progres
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PENGAJUAN JUDUL */}
          <TabsContent value="pengajuan" className="mt-0">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Daftar Pengajuan Tugas Akhir</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Persetujuan judul dan penugasan dosen pembimbing.</CardDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2 w-full md:w-auto">
                    <div className="relative w-full sm:w-[250px]">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari mahasiswa/judul..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={filterProgram} onValueChange={setFilterProgram}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Semua Prodi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Program Studi</SelectItem>
                        {uniquePrograms.map(p => (
                          <SelectItem key={p as string} value={p as string}>{p as string}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Semua Jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Jenis</SelectItem>
                        {uniqueTypes.map(t => (
                          <SelectItem key={t as string} value={t as string}>{t as string}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Semua Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        {uniqueStatuses.map(s => (
                          <SelectItem key={s as string} value={s as string}>
                            {s === 'pending' ? 'Menunggu' :
                             s === 'approved' ? 'Disetujui' :
                             s === 'rejected' ? 'Ditolak' : s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Memuat data pengajuan...</div>
                  ) : sortedSubmissions?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Belum ada data pengajuan yang sesuai filter</div>
                  ) : (
                    sortedSubmissions?.map((sub: any) => (
                      <div key={sub.id} className="p-3.5 border rounded-lg bg-card shadow-sm space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{sub.profiles?.full_name}</div>
                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>{sub.profiles?.nim}</span>
                              {sub.profiles?.program && (
                                <span className="text-[10px] font-medium text-primary/80 uppercase">({sub.profiles.program})</span>
                              )}
                            </div>
                          </div>
                          <Badge variant={
                            sub.status === 'approved' ? 'default' :
                            sub.status === 'rejected' ? 'destructive' :
                            sub.status === 'revision' ? 'secondary' : 'outline'
                          } className="text-xs shrink-0">
                            {sub.status === 'approved' ? 'Diterima' :
                             sub.status === 'rejected' ? 'Ditolak' :
                             sub.status === 'revision' ? 'Revisi' : 'Menunggu'}
                          </Badge>
                        </div>

                        <div>
                          <Badge variant="outline" className="mb-1 text-[11px] font-normal">{sub.ta_types?.name}</Badge>
                          <p className="text-xs font-medium text-foreground/90 line-clamp-2">{sub.title}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Pembimbing:</span>
                            {sub.ta_advisors?.length > 0 ? (
                              <span className="font-medium text-foreground line-clamp-1">
                                {sub.ta_advisors.map((a: any) => a.profiles?.full_name).filter(Boolean).join(', ')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">Belum diplot</span>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Fase Saat Ini:</span>
                            {sub.current_phase ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0 mt-0.5">
                                {sub.current_phase.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">-</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => {
                            setSubTargetData({ id: sub.id, name: sub.profiles?.full_name || 'Mahasiswa' });
                            setIsSubTargetOpen(true);
                          }}>
                            <ListTodo className="w-3.5 h-3.5 mr-1" /> Target
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => {
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
                            <Eye className="w-3.5 h-3.5 mr-1" /> Detail
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive hover:text-white h-8 w-8 p-0 shrink-0" 
                            onClick={() => {
                              if (window.confirm('Yakin ingin menghapus pengajuan Tugas Akhir ini? Semua data terkait (bimbingan, seminar, file) juga mungkin akan terhapus.')) {
                                deleteSubmissionMutation.mutate(sub.id);
                              }
                            }} 
                            disabled={deleteSubmissionMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="rounded-md border overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <TableSortHeader
                            sortKey="mahasiswa"
                            currentSort={sortConfig}
                            onSort={setSortConfig}
                          >
                            Mahasiswa
                          </TableSortHeader>
                        </TableHead>
                        <TableHead>
                          <TableSortHeader
                            sortKey="judul"
                            currentSort={sortConfig}
                            onSort={setSortConfig}
                          >
                            Jenis & Judul
                          </TableSortHeader>
                        </TableHead>
                        <TableHead>Dosen Pembimbing</TableHead>
                        <TableHead>
                          <TableSortHeader
                            sortKey="fase"
                            currentSort={sortConfig}
                            onSort={setSortConfig}
                          >
                            Fase Saat Ini
                          </TableSortHeader>
                        </TableHead>
                        <TableHead>
                          <TableSortHeader
                            sortKey="status"
                            currentSort={sortConfig}
                            onSort={setSortConfig}
                          >
                            Status
                          </TableSortHeader>
                        </TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">Memuat data...</TableCell>
                        </TableRow>
                      ) : sortedSubmissions?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            Belum ada data pengajuan yang sesuai filter
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedSubmissions?.map((sub: any) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div className="font-medium">{sub.profiles?.full_name}</div>
                              <div className="text-xs text-muted-foreground">{sub.profiles?.nim}</div>
                              {sub.profiles?.program && (
                                <div className="text-[10px] font-medium text-primary/80 mt-1 uppercase tracking-wider">{sub.profiles.program}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="mb-1">{sub.ta_types?.name}</Badge>
                              <div className="font-medium whitespace-normal text-justify" title={sub.title}>{sub.title}</div>
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
                              {sub.current_phase ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {sub.current_phase.name}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
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
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                  setSubTargetData({ id: sub.id, name: sub.profiles?.full_name || 'Mahasiswa' });
                                  setIsSubTargetOpen(true);
                                }}>
                                  <ListTodo className="w-4 h-4 mr-2" /> Target
                                </Button>
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
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:bg-destructive hover:text-white" 
                                  onClick={() => {
                                    if (window.confirm('Yakin ingin menghapus pengajuan Tugas Akhir ini? Semua data terkait (bimbingan, seminar, file) juga mungkin akan terhapus.')) {
                                      deleteSubmissionMutation.mutate(sub.id);
                                    }
                                  }} 
                                  disabled={deleteSubmissionMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
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
              <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
                <DialogHeader className="pr-6 text-left">
                  <DialogTitle className="text-base sm:text-xl font-bold">Detail Pengajuan Tugas Akhir</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Informasi lengkap mengenai pengajuan mahasiswa.
                  </DialogDescription>
                </DialogHeader>
                
                {selectedSubmission && (
                  <div className="space-y-4 py-2 sm:py-4 flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden pr-1 sm:pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 bg-muted/40 rounded-lg border">
                      <div className="min-w-0">
                        <Label className="text-muted-foreground text-xs">Nama Mahasiswa</Label>
                        <p className="font-semibold text-sm sm:text-base break-words">{selectedSubmission.profiles?.full_name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-xs sm:text-sm text-muted-foreground">{selectedSubmission.profiles?.nim}</span>
                          {selectedSubmission.profiles?.id && (
                            <StudentSemesterBadge studentId={selectedSubmission.profiles.id} />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <Label className="text-muted-foreground text-xs">Jenis Tugas Akhir</Label>
                        <div className="mt-1">
                          <Badge variant="outline" className="font-medium text-xs sm:text-sm">{selectedSubmission.ta_types?.name}</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="min-w-0">
                      <Label className="text-muted-foreground text-xs">Topik / Judul</Label>
                      <p className="font-medium text-xs sm:text-sm mt-1 p-3 bg-muted rounded-md break-words whitespace-pre-wrap">{selectedSubmission.title}</p>
                    </div>

                    <div className="w-full min-w-0 overflow-hidden">
                      <Label className="text-muted-foreground text-xs">Link Dokumen</Label>
                      {selectedSubmission.document_link ? (
                        <div className="mt-1">
                          <a 
                            href={selectedSubmission.document_link.startsWith('http') ? selectedSubmission.document_link : `https://${selectedSubmission.document_link}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs sm:text-sm font-medium break-all max-w-full"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="truncate">Buka Dokumen Pengajuan</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm italic mt-1 text-muted-foreground">Tidak ada dokumen yang dilampirkan.</p>
                      )}
                    </div>

                    <div className="min-w-0">
                      <Label className="text-muted-foreground text-xs">Catatan Mahasiswa</Label>
                      <p className="text-xs sm:text-sm mt-1 p-2.5 bg-muted/30 border rounded-md whitespace-pre-wrap break-words">{cleanCommentsForDisplay(selectedSubmission.comments) || '-'}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-border mt-4">
                      <h4 className="text-sm font-semibold mb-3">Tindakan Admin</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs sm:text-sm">Status Pengajuan</Label>
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
                          <div className="p-3 sm:p-4 bg-muted/30 border rounded-md space-y-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                              <Label className="font-medium text-xs sm:text-sm">Plotting Dosen Pembimbing</Label>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="w-full sm:w-auto h-8 text-xs"
                                onClick={() => setFormAdvisors([...formAdvisors, { id: '', role: `Pembimbing ${formAdvisors.length + 1}` }])}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Pembimbing
                              </Button>
                            </div>
                            
                            {formAdvisors.map((adv, index) => (
                              <div key={index} className="flex gap-2 items-end">
                                <div className="flex-1 min-w-0">
                                  <Label className="text-xs text-muted-foreground">{adv.role}</Label>
                                  <Select 
                                    value={adv.id} 
                                    onValueChange={(val) => {
                                      const newAdvisors = [...formAdvisors];
                                      newAdvisors[index].id = val;
                                      setFormAdvisors(newAdvisors);
                                    }}
                                  >
                                    <SelectTrigger className="w-full min-w-0">
                                      <SelectValue placeholder="Pilih dosen pembimbing" />
                                    </SelectTrigger>
                                    <SelectContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
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
                                  className="text-destructive shrink-0 h-10 w-10"
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
                          <Label className="text-xs sm:text-sm">Catatan Admin {formStatus !== 'approved' && <span className="text-destructive">*</span>}</Label>
                          <Textarea 
                            className="mt-1 text-xs sm:text-sm" 
                            rows={3}
                            placeholder={formStatus === 'approved' ? "Catatan opsional..." : "Berikan alasan mengapa direvisi atau ditolak..."}
                            value={formComments}
                            onChange={(e) => setFormComments(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <DialogFooter className="mt-3 pt-3 border-t flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => setIsDetailOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button 
                    className="w-full sm:w-auto"
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
                <CardTitle className="text-lg sm:text-xl">Jadwal Ujian & Seminar</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Atur jadwal ujian, lokasi, dan tetapkan dosen penguji.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {seminarsLoading ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Memuat data seminar...</div>
                  ) : !seminars || seminars.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Belum ada pengajuan seminar atau ujian</div>
                  ) : (
                    seminars.map((sem: any) => (
                      <div key={sem.id} className="p-3.5 border rounded-lg bg-card shadow-sm space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{sem.ta_submissions?.profiles?.full_name}</div>
                            <div className="text-xs text-muted-foreground">{sem.ta_submissions?.profiles?.nim} • {sem.ta_submissions?.profiles?.program || 'PBA'}</div>
                          </div>
                          <Badge variant={
                            sem.status === 'scheduled' ? 'default' :
                            (sem.status === 'finished' || sem.status === 'completed') ? 'secondary' :
                            (sem.status === 'rejected' || sem.status === 'cancelled') ? 'destructive' : 'outline'
                          } className="text-xs shrink-0">
                            {sem.status === 'scheduled' ? 'Terjadwal' :
                             (sem.status === 'finished' || sem.status === 'completed') ? 'Selesai' :
                             (sem.status === 'rejected' || sem.status === 'cancelled') ? 'Ditolak' : 'Menunggu'}
                          </Badge>
                        </div>

                        <div>
                          <Badge className="capitalize text-xs font-normal mb-1">{sem.type === 'sempro' ? 'Seminar Proposal' : 'Sidang Munaqasyah'}</Badge>
                          <p className="text-xs font-medium text-foreground/90 line-clamp-2">{sem.ta_submissions?.title}</p>
                        </div>

                        <div className="p-2.5 bg-muted/40 rounded-md text-xs space-y-1">
                          {sem.schedule_date ? (
                            <>
                              <div className="flex items-center font-medium">
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary" />
                                {new Date(sem.schedule_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                              <div className="flex items-center text-muted-foreground">
                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                {new Date(sem.schedule_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </div>
                              {sem.room && (
                                <div className="flex items-center font-medium text-primary mt-0.5">
                                  <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {sem.room}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">Belum dijadwalkan</span>
                          )}
                        </div>

                        {/* Info Ketua Sidang */}
                        <div className="text-xs bg-card p-2 rounded border">
                          <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Ketua Sidang:</span>
                          <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3 text-primary" />
                            {sem.chairperson?.full_name || sem.chairperson_name || <em className="text-muted-foreground">Belum diplot</em>}
                            {sem.chairperson_type === 'external' && <Badge variant="outline" className="text-[9px] px-1 py-0">Tamu</Badge>}
                          </span>
                        </div>

                        {/* Info Dewan Penguji */}
                        <div className="text-xs">
                          <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Dewan Penguji ({sem.ta_examiners?.length || 0}):</span>
                          {sem.ta_examiners?.length > 0 ? (
                            <div className="space-y-0.5 mt-0.5">
                              {sem.ta_examiners.map((ex: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="truncate">
                                    • {ex.profiles?.full_name || ex.examiner_name || ex.role}
                                    <span className="text-[10px] text-muted-foreground ml-1">({ex.role})</span>
                                  </span>
                                  {ex.score !== undefined && ex.score !== null && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                      {ex.score}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Belum diplot</span>
                          )}
                        </div>

                        {sem.final_score !== null && sem.final_score !== undefined && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t">
                            <span className="font-semibold text-muted-foreground">Skor Akhir:</span>
                            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold">
                              {sem.final_score} ({sem.final_grade || 'Lulus'})
                            </Badge>
                          </div>
                        )}

                        <div className="pt-2 border-t flex gap-1.5 flex-wrap">
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => openSeminarDetail(sem)}>
                            <Calendar className="w-3.5 h-3.5 mr-1" /> Atur
                          </Button>
                          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => openSeminarDetail(sem)}>
                            <Share2 className="w-3.5 h-3.5" /> Tautan
                          </Button>
                          <Button variant="secondary" size="sm" className="h-8 text-xs gap-1" onClick={() => openDocModal(sem)} title="Cetak Dokumen Resmi">
                            <Printer className="w-3.5 h-3.5" /> Cetak
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="rounded-md border overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mahasiswa</TableHead>
                        <TableHead>Jenis Ujian</TableHead>
                        <TableHead>Jadwal & Ruangan</TableHead>
                        <TableHead>Ketua Sidang</TableHead>
                        <TableHead>Dewan Penguji</TableHead>
                        <TableHead>Status & Nilai</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seminarsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10">Memuat data seminar...</TableCell>
                        </TableRow>
                      ) : !seminars || seminars.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                            Belum ada pengajuan seminar atau ujian
                          </TableCell>
                        </TableRow>
                      ) : (
                        seminars.map((sem: any) => (
                          <TableRow key={sem.id}>
                            <TableCell>
                              <div className="font-medium">{sem.ta_submissions?.profiles?.full_name}</div>
                              <div className="text-xs text-muted-foreground">{sem.ta_submissions?.profiles?.nim}</div>
                              <div className="text-[11px] text-muted-foreground max-w-[200px] truncate" title={sem.ta_submissions?.title}>
                                {sem.ta_submissions?.title}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {sem.type === 'sempro' ? 'Sempro' : 'Sidang TA'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {sem.schedule_date ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center text-xs font-semibold">
                                    <Calendar className="w-3 h-3 mr-1 text-primary" />
                                    {new Date(sem.schedule_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                  <div className="flex items-center text-[11px] text-muted-foreground">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {new Date(sem.schedule_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                  </div>
                                  {sem.room && (
                                    <div className="flex items-center text-[11px] font-medium text-primary">
                                      <MapPin className="w-3 h-3 mr-1" /> {sem.room}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Belum dijadwalkan</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs space-y-0.5">
                                <div className="font-medium flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                                  <span className="truncate max-w-[140px]">
                                    {sem.chairperson?.full_name || sem.chairperson_name || <em className="text-muted-foreground">Belum diplot</em>}
                                  </span>
                                </div>
                                {sem.chairperson_type === 'external' && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0">Dosen Tamu</Badge>
                                )}
                                {sem.chairperson_signed_at && (
                                  <Badge className="bg-emerald-500/10 text-emerald-700 text-[9px] px-1 py-0">Disahkan</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {sem.ta_examiners?.length > 0 ? (
                                <div className="space-y-1 text-xs">
                                  {sem.ta_examiners.map((ex: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between gap-2 max-w-[190px]">
                                      <span className="truncate text-xs">
                                        • {ex.profiles?.full_name || ex.examiner_name || ex.role}
                                      </span>
                                      {ex.score !== undefined && ex.score !== null ? (
                                        <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0 font-semibold text-emerald-700">
                                          {ex.score}
                                        </Badge>
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground shrink-0">-</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Belum diplot</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant={
                                  sem.status === 'scheduled' ? 'default' :
                                  (sem.status === 'finished' || sem.status === 'completed') ? 'secondary' :
                                  (sem.status === 'rejected' || sem.status === 'cancelled') ? 'destructive' : 'outline'
                                } className="text-[11px]">
                                  {sem.status === 'scheduled' ? 'Terjadwal' :
                                   (sem.status === 'finished' || sem.status === 'completed') ? 'Selesai' :
                                   (sem.status === 'rejected' || sem.status === 'cancelled') ? 'Ditolak' : 'Menunggu'}
                                </Badge>
                                {sem.final_score !== null && sem.final_score !== undefined && (
                                  <div className="text-xs font-bold text-emerald-700">
                                    Skor: {sem.final_score} ({sem.final_grade || 'Lulus'})
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => openSeminarDetail(sem)}>
                                  <Calendar className="w-3.5 h-3.5" /> Atur
                                </Button>
                                <Button size="sm" className="h-8 text-xs gap-1" onClick={() => openSeminarDetail(sem)}>
                                  <Share2 className="w-3.5 h-3.5" /> Tautan
                                </Button>
                                <Button variant="secondary" size="sm" className="h-8 text-xs gap-1" onClick={() => openDocModal(sem)} title="Cetak Berita Acara, Lembar Nilai & Surat Tugas">
                                  <Printer className="w-3.5 h-3.5" /> Cetak
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Modal Dialog Komprehensif: Jadwal, Penguji & Tautan Evaluasi */}
            {selectedSeminar && (
              <SeminarScheduleDialog
                open={isSeminarDetailOpen}
                onOpenChange={setIsSeminarDetailOpen}
                seminar={selectedSeminar}
                dosenList={dosenList || []}
                onSaved={() => {
                  refetchSeminars();
                }}
              />
            )}

            {/* Modal Cetak Dokumen Lengkap (Berita Acara, Lembar Nilai Rubrik, Surat Tugas) */}
            {selectedSeminarForDoc && (
              <SeminarDocumentViewerModal
                open={isDocModalOpen}
                onOpenChange={setIsDocModalOpen}
                seminar={selectedSeminarForDoc}
              />
            )}
          </TabsContent>

          {/* TAB 3: PENGATURAN FASE */}
          <TabsContent value="fase" className="mt-0">
            <MasterPhaseAdmin />
          </TabsContent>

          {/* TAB 4: REKAPITULASI PROGRES FASE */}
          <TabsContent value="rekapitulasi" className="mt-0">
            <RekapitulasiFaseView scope="admin" />
          </TabsContent>
        </Tabs>
        
        <SubTargetViewer 
          isOpen={isSubTargetOpen} 
          setIsOpen={setIsSubTargetOpen}
          submissionId={subTargetData.id}
          studentName={subTargetData.name}
        />
      </div>
    </Layout>
  );
}
