import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, XCircle, Users, ExternalLink, Plus, Trash2, Save, Calendar, Clock, MapPin, Search } from 'lucide-react';
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
      toast.error(error.message || 'Gagal memperbarui jadwal seminar');
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
                            <div className="text-xs text-muted-foreground">{sem.ta_submissions?.profiles?.nim}</div>
                          </div>
                          <Badge variant={
                            sem.status === 'scheduled' ? 'default' :
                            sem.status === 'finished' ? 'secondary' :
                            sem.status === 'rejected' ? 'destructive' : 'outline'
                          } className="text-xs shrink-0">
                            {sem.status === 'scheduled' ? 'Terjadwal' :
                             sem.status === 'finished' ? 'Selesai' :
                             sem.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                          </Badge>
                        </div>

                        <div>
                          <Badge className="capitalize text-xs font-normal mb-1">{sem.type}</Badge>
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
                                {new Date(sem.schedule_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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

                        <div className="text-xs">
                          <span className="text-muted-foreground block text-[10px]">Dosen Penguji:</span>
                          {sem.ta_examiners?.length > 0 ? (
                            <span className="font-medium text-foreground">
                              {sem.ta_examiners.map((ex: any) => ex.profiles?.full_name).filter(Boolean).join(', ')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Belum diplot</span>
                          )}
                        </div>

                        <div className="pt-2 border-t">
                          <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => openSeminarDetail(sem)}>
                            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Atur Jadwal & Penguji
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
              <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
                <DialogHeader className="pr-6 text-left">
                  <DialogTitle className="text-base sm:text-xl font-bold">Atur Jadwal Ujian & Penguji</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Atur waktu, tempat, dan dosen penguji untuk ujian ini.
                  </DialogDescription>
                </DialogHeader>

                {selectedSeminar && (
                  <div className="space-y-4 py-2 sm:py-4 flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden pr-1 sm:pr-2">
                    <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border">
                      <Label className="text-xs text-muted-foreground">Mahasiswa</Label>
                      <p className="font-semibold text-sm sm:text-base">{selectedSeminar.ta_submissions?.profiles?.full_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">{selectedSeminar.ta_submissions?.profiles?.nim}</p>
                      
                      <Label className="text-xs text-muted-foreground">Jenis Ujian</Label>
                      <p className="font-medium capitalize text-sm">{selectedSeminar.type}</p>
                      
                      <Label className="text-xs text-muted-foreground mt-3 block">Topik / Judul</Label>
                      <p className="text-xs sm:text-sm font-medium whitespace-normal text-justify mt-1 break-words">{selectedSeminar.ta_submissions?.title}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label className="text-xs sm:text-sm">Tanggal & Waktu Ujian</Label>
                        <Input 
                          type="datetime-local" 
                          value={seminarScheduleDate} 
                          onChange={(e) => setSeminarScheduleDate(e.target.value)}
                          className="mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs sm:text-sm">Ruangan / Lokasi</Label>
                        <Input 
                          type="text" 
                          placeholder="Cth: Ruang Sidang 1" 
                          value={seminarRoom} 
                          onChange={(e) => setSeminarRoom(e.target.value)}
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs sm:text-sm">Status Ujian</Label>
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
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                        <Label className="text-sm font-semibold">Plotting Dosen Penguji</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="w-full sm:w-auto h-8 text-xs"
                          onClick={() => setFormExaminers([...formExaminers, { id: '', role: `Penguji ${formExaminers.length + 1}` }])}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Penguji
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {formExaminers.map((ex, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1 min-w-0">
                              <Label className="text-xs text-muted-foreground">{ex.role}</Label>
                              <Select 
                                value={ex.id} 
                                onValueChange={(val) => {
                                  const newExs = [...formExaminers];
                                  newExs[index].id = val;
                                  setFormExaminers(newExs);
                                }}
                              >
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Pilih dosen penguji" />
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
                              className="text-destructive shrink-0 h-10 w-10 border border-transparent hover:border-destructive/20"
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

                <DialogFooter className="mt-3 pt-3 border-t flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => setIsSeminarDetailOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button 
                    className="w-full sm:w-auto"
                    onClick={() => seminarMutation.mutate()} 
                    disabled={seminarMutation.isPending}
                  >
                    {seminarMutation.isPending ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Penjadwalan</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
