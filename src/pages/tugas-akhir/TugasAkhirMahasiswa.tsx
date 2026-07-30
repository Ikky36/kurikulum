import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Plus, Calendar, MessageSquare, Save, Undo2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAcademicPeriod } from '@/hooks/useAcademicPeriod';
import { calculateSemester } from '@/utils/academicHelpers';
import { TATimeline } from './TATimeline';
import { SeminarRegistrationForm } from './SeminarRegistrationForm';

export default function TugasAkhirMahasiswa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeAcademicYear, activeSemester } = useAcademicPeriod();
  
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [documentLink, setDocumentLink] = useState('');
  const [comments, setComments] = useState('');
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  // Add Log State
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logDosenId, setLogDosenId] = useState('');
  const [logProblem, setLogProblem] = useState('');

  // Revision & Rejection State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isReviseOpen, setIsReviseOpen] = useState(false);

  const { data: myProfile } = useQuery({
    queryKey: ['my_profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: mySubmission, isLoading: subLoading } = useQuery({
    queryKey: ['my_ta_submission', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_submissions')
        .select('*, ta_types(name), ta_advisors(role, profiles(id, full_name))')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: consultationLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['my_ta_logs', mySubmission?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_consultation_logs')
        .select('*, profiles:dosen_id(full_name)')
        .eq('submission_id', mySubmission.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!mySubmission?.id && mySubmission?.status === 'approved'
  });

  const { data: phases } = useQuery({
    queryKey: ['ta_phases', mySubmission?.type_id],
    queryFn: async () => {
      if (!mySubmission?.type_id) return [];
      const { data, error } = await supabase
        .from('ta_master_phases')
        .select('*')
        .eq('ta_type_id', mySubmission.type_id)
        .eq('is_active', true)
        .order('order_num');
      if (error) throw error;
      return data;
    },
    enabled: !!mySubmission?.type_id && mySubmission?.status === 'approved'
  });

  const { data: milestones, isLoading: milestonesLoading } = useQuery({
    queryKey: ['my_ta_milestones', mySubmission?.id],
    queryFn: async () => {
      if (!mySubmission?.id) return [];
      const { data, error } = await supabase
        .from('ta_milestones')
        .select('*, phase:ta_master_phases(name)')
        .eq('submission_id', mySubmission.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!mySubmission?.id && mySubmission?.status === 'approved'
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('ta_milestones')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my_ta_milestones'] });
      if (variables.status === 'completed') {
        toast.success('Sub-target ditandai selesai');
      } else {
        toast.info('Status sub-target dibatalkan');
      }
    }
  });

  const { data: taTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['ta_types_student'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_types').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });
  
  const { data: taRequirements } = useQuery({
    queryKey: ['ta_requirements_student'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_requirements').select('*').order('order_num', { ascending: true }).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: instrumenPenilaian } = useQuery({
    queryKey: ['instrumen_penilaian_student'],
    queryFn: async () => {
      const { data, error } = await supabase.from('instrumen_penilaian').select('*').order('rentang_max', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: myGrades } = useQuery({
    queryKey: ['my_grades_student', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('grades').select('*, courses(id, name, sks)').eq('student_profile_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const validateRequirements = (phase: string, typeId: string | null) => {
    if (!taRequirements || !instrumenPenilaian || !myGrades || !myProfile) return [];

    const reqsToEval = taRequirements.filter(req => {
      if (req.phase !== phase) return false;
      if (req.is_general) return true;
      if (typeId && req.type_id === typeId) return true;
      return false;
    });

    const errors: string[] = [];
    const mySemester = calculateSemester(myProfile?.enrollment_year, activeAcademicYear?.name, activeSemester?.name) || 1;

    const totalSKS = myGrades.reduce((sum, g) => sum + (g.final_score > 50 ? (g.courses?.sks || 0) : 0), 0);

    const predicateCounts: Record<string, number> = {};
    myGrades.forEach(grade => {
      const instrumen = instrumenPenilaian.find(i => grade.final_score >= i.rentang_min && grade.final_score <= i.rentang_max);
      if (instrumen) predicateCounts[instrumen.id] = (predicateCounts[instrumen.id] || 0) + 1;
    });

    const passedCourseIds = myGrades.filter(g => g.final_score > 50).map(g => g.courses?.id);

    reqsToEval.forEach(req => {
      if (req.req_type === 'min_semester') {
        const min = req.req_value?.min || 1;
        if (mySemester < min) {
          if (req.is_required) errors.push(`${req.name}: Minimal semester ${min} (Anda semester ${mySemester}).`);
        }
      } else if (req.req_type === 'min_sks') {
        const min = req.req_value?.min || 1;
        if (totalSKS < min) {
          if (req.is_required) errors.push(`${req.name}: Minimal SKS lulus ${min} (SKS Anda ${totalSKS}).`);
        }
      } else if (req.req_type === 'predicate') {
        const predId = req.req_value?.predicate_id;
        const maxLimit = req.req_value?.max_count || 0;
        const count = predicateCounts[predId] || 0;
        if (count > maxLimit) {
          const predName = instrumenPenilaian.find(i => i.id === predId)?.predikat || 'Unknown';
          if (req.is_required) errors.push(`${req.name}: Maksimal ${maxLimit} nilai ${predName} (Anda memiliki ${count}).`);
        }
      } else if (req.req_type === 'course') {
        const courseIds = req.req_value?.course_ids || [];
        const hasPassedAll = courseIds.every((id: string) => passedCourseIds.includes(id));
        if (!hasPassedAll && req.is_required) {
          errors.push(`${req.name}: Anda belum lulus mata kuliah prasyarat.`);
        }
      }
    });

    return errors;
  };

  useEffect(() => {
    const genErrs = validateRequirements('umum', null);
    setGeneralErrors(genErrs);

    if (selectedType) {
      const specErrs = validateRequirements('pengajuan_judul', selectedType);
      setValidationErrors(specErrs);
    } else {
      setValidationErrors([]);
    }
  }, [selectedType, taRequirements, instrumenPenilaian, myGrades, myProfile]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      
      const { data, error } = await supabase.from('ta_submissions').insert({
        student_id: user.id,
        type_id: selectedType,
        title,
        document_link: documentLink,
        comments
      }).select().single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_ta_submission', user?.id] });
      toast.success('Berhasil mengajukan Tugas Akhir');
      setIsCreatingNew(false);
    },
    onError: (error: any) => {
      toast.error('Gagal mengajukan: ' + error.message);
    }
  });

  const reviseMutation = useMutation({
    mutationFn: async () => {
      if (!mySubmission) throw new Error('Tidak ada pengajuan yang direvisi');

      const { data, error } = await supabase
        .from('ta_submissions')
        .update({
          title,
          document_link: documentLink,
          comments,
          status: 'pending' // Reset status
        })
        .eq('id', mySubmission.id)
        .select().single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_ta_submission', user?.id] });
      toast.success('Berhasil mengirim perbaikan pengajuan');
      setIsReviseOpen(false);
    },
    onError: (error: any) => {
      toast.error('Gagal mengirim perbaikan: ' + error.message);
    }
  });

  const addLogMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ta_consultation_logs')
        .insert({
          submission_id: mySubmission.id,
          dosen_id: logDosenId,
          date: logDate,
          problem: logProblem,
          status: 'pending'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Log bimbingan berhasil dikirim.');
      queryClient.invalidateQueries({ queryKey: ['my_ta_logs'] });
      setIsAddLogOpen(false);
      setLogProblem('');
      setLogDosenId('');
    },
    onError: (e: any) => toast.error('Gagal menambahkan log: ' + e.message)
  });

  const openReviseModal = () => {
    setTitle(mySubmission.title);
    setDocumentLink(mySubmission.document_link || '');
    setComments(mySubmission.comments || '');
    setSelectedType(mySubmission.type_id || '');
    setIsReviseOpen(true);
  };

  const openNewSubmission = () => {
    setIsCreatingNew(true);
    setTitle('');
    setDocumentLink('');
    setComments('');
    setSelectedType('');
  };

  if (subLoading || typesLoading) return <Layout><div className="container py-8 text-center">Memuat data...</div></Layout>;

  return (
    <Layout>
      <div className="container py-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 tracking-tight">Tugas Akhir</h1>
        
        {generalErrors.length > 0 && !mySubmission && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Tidak Memenuhi Syarat Akademik Umum</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2">
                {generalErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
              <p className="mt-2 text-sm opacity-90">Hubungi akademik jika Anda merasa ada kesalahan pada data nilai/semester Anda.</p>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="bimbingan" className="space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3">
            <TabsTrigger value="bimbingan">Judul & Bimbingan</TabsTrigger>
            <TabsTrigger value="seminar" disabled={!mySubmission || mySubmission.status !== 'approved' || isCreatingNew}>Seminar Proposal</TabsTrigger>
            <TabsTrigger value="sidang" disabled={!mySubmission || mySubmission.status !== 'approved' || isCreatingNew}>Sidang Akhir</TabsTrigger>
          </TabsList>

          <TabsContent value="bimbingan" className="space-y-6">
            {(mySubmission && !isCreatingNew) ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl">{mySubmission.title}</CardTitle>
                        <CardDescription className="text-base mt-1">Jenis: {mySubmission.ta_types?.name}</CardDescription>
                      </div>
                      <Badge className="text-sm px-3 py-1" variant={
                        mySubmission.status === 'approved' ? 'default' :
                        mySubmission.status === 'rejected' ? 'destructive' :
                        mySubmission.status === 'revision' ? 'secondary' : 'outline'
                      }>
                        {mySubmission.status === 'approved' && <CheckCircle2 className="w-4 h-4 mr-2 inline" />}
                        {mySubmission.status === 'rejected' && <XCircle className="w-4 h-4 mr-2 inline" />}
                        {mySubmission.status === 'revision' && <RefreshCw className="w-4 h-4 mr-2 inline" />}
                        {mySubmission.status === 'pending' && <Clock className="w-4 h-4 mr-2 inline" />}
                        {mySubmission.status === 'approved' ? 'Disetujui' :
                         mySubmission.status === 'rejected' ? 'Ditolak' :
                         mySubmission.status === 'revision' ? 'Revisi' : 'Menunggu Review'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Status Alerts */}
                    {mySubmission.status === 'rejected' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Pengajuan Ditolak</AlertTitle>
                        <AlertDescription className="mt-2 space-y-4">
                          <p>Mohon maaf, pengajuan judul Anda ditolak. Silakan ajukan judul baru dengan menghubungi Kaprodi atau membuat pengajuan baru.</p>
                          <Button variant="outline" size="sm" onClick={openNewSubmission}>
                            Buat Pengajuan Judul Baru
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {mySubmission.status === 'revision' && (
                      <Alert variant="default" className="border-secondary bg-secondary/10">
                        <RefreshCw className="h-4 w-4 text-secondary-foreground" />
                        <AlertTitle>Perlu Revisi</AlertTitle>
                        <AlertDescription className="mt-2 space-y-4">
                          <p>Pengajuan Anda dikembalikan untuk direvisi. Silakan perbaiki dokumen atau judul sesuai catatan.</p>
                          <Button variant="secondary" size="sm" onClick={openReviseModal}>
                            Perbaiki & Ajukan Ulang
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Admin Comments */}
                    {mySubmission.comments && mySubmission.comments.includes('[Catatan Admin]') && (
                      <div className="p-4 bg-muted rounded-lg border">
                        <h3 className="text-sm font-semibold mb-2 flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2" /> Catatan Admin / Prodi
                        </h3>
                        <p className="text-sm whitespace-pre-wrap">{mySubmission.comments}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                      <div>
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Dosen Pembimbing</h3>
                        {mySubmission.ta_advisors?.length > 0 ? (
                          <ul className="space-y-2">
                            {mySubmission.ta_advisors.map((adv: any, i: number) => (
                              <li key={i} className="flex flex-col">
                                <span className="font-medium">{adv.profiles?.full_name}</span>
                                <span className="text-xs text-muted-foreground">{adv.role}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm italic">Belum ada pembimbing yang diplot.</p>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Dokumen Pengajuan</h3>
                        {mySubmission.document_link ? (
                          <a href={mySubmission.document_link.startsWith('http') ? mySubmission.document_link : `https://${mySubmission.document_link}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center">
                            <FileText className="w-4 h-4 mr-2" /> Buka Dokumen Proposal
                          </a>
                        ) : (
                          <p className="text-sm italic text-muted-foreground">Tidak ada dokumen dilampirkan.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {mySubmission.status === 'approved' && phases && phases.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Progres Tugas Akhir</CardTitle>
                      <CardDescription>Tahapan penyusunan tugas akhir yang harus Anda selesaikan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TATimeline phases={phases} currentPhaseId={mySubmission.current_phase_id} />
                      
                      <div className="mt-8">
                        <h3 className="font-semibold text-base mb-4 flex items-center">
                          <CheckCircle2 className="w-5 h-5 mr-2 text-primary" /> Sub-Target Anda
                        </h3>
                        {milestonesLoading ? (
                          <div className="text-center py-4 text-muted-foreground">Memuat sub-target...</div>
                        ) : !milestones || milestones.length === 0 ? (
                          <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed text-muted-foreground">
                            Belum ada sub-target yang diberikan oleh dosen pembimbing Anda.
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {milestones.map((m: any) => (
                              <div key={m.id} className="p-4 border rounded-lg bg-card shadow-sm flex items-start gap-4">
                                <div className="mt-1">
                                  {m.status === 'completed' ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <Clock className="w-5 h-5 text-amber-500" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <h4 className={`font-medium ${m.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                      {m.title}
                                    </h4>
                                    {m.status === 'pending' ? (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="shrink-0"
                                        onClick={() => {
                                          if(window.confirm('Tandai target ini sebagai selesai?')) {
                                            toggleMilestoneMutation.mutate({ id: m.id, status: 'completed' });
                                          }
                                        }}
                                        disabled={toggleMilestoneMutation.isPending}
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Tandai Selesai
                                      </Button>
                                    ) : (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          if(window.confirm('Batalkan status selesai pada target ini?')) {
                                            toggleMilestoneMutation.mutate({ id: m.id, status: 'pending' });
                                          }
                                        }}
                                        disabled={toggleMilestoneMutation.isPending}
                                      >
                                        <Undo2 className="w-4 h-4 mr-2" /> Batalkan Selesai
                                      </Button>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-xs text-muted-foreground">
                                    {m.phase && (
                                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">{m.phase.name}</Badge>
                                    )}
                                    {m.target_date && (
                                      <div className="flex items-center text-red-500 font-medium">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        Target: {new Date(m.target_date).toLocaleDateString('id-ID')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {mySubmission.status === 'approved' && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Riwayat Bimbingan</CardTitle>
                        <CardDescription>Catat dan pantau histori konsultasi Anda dengan dosen pembimbing.</CardDescription>
                      </div>
                      <Button onClick={() => setIsAddLogOpen(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Tambah Log
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tanggal</TableHead>
                              <TableHead>Pembimbing</TableHead>
                              <TableHead>Pembahasan & Masalah</TableHead>
                              <TableHead>Solusi / Feedback Dosen</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {logsLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-6">Memuat log...</TableCell>
                              </TableRow>
                            ) : !consultationLogs || consultationLogs.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                  Belum ada log bimbingan yang tercatat.
                                </TableCell>
                              </TableRow>
                            ) : (
                              consultationLogs.map((log: any) => (
                                <TableRow key={log.id}>
                                  <TableCell className="whitespace-nowrap text-sm">
                                    {new Date(log.date).toLocaleDateString('id-ID')}
                                  </TableCell>
                                  <TableCell className="text-sm font-medium">
                                    {log.profiles?.full_name}
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-sm line-clamp-3">{log.problem}</p>
                                  </TableCell>
                                  <TableCell>
                                    {log.solution ? (
                                      <p className="text-sm line-clamp-3 text-primary">{log.solution}</p>
                                    ) : (
                                      <span className="text-xs italic text-muted-foreground">Menunggu tanggapan</span>
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
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className={generalErrors.length > 0 ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                  <CardTitle>{isCreatingNew ? 'Pengajuan Judul Baru' : 'Pengajuan Judul Tugas Akhir'}</CardTitle>
                  <CardDescription>Pilih jenis tugas akhir dan masukkan judul yang akan diajukan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Jenis Tugas Akhir</Label>
                    <Select value={selectedType} onValueChange={setSelectedType} disabled={generalErrors.length > 0}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Jenis..." />
                      </SelectTrigger>
                      <SelectContent>
                        {taTypes?.map((type: any) => (
                          <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {validationErrors.length > 0 && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Tidak Memenuhi Syarat Pengajuan {taTypes?.find((t:any) => t.id === selectedType)?.name}</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside mt-2">
                          {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label>Topik / Judul</Label>
                    <Textarea 
                      placeholder="Ketikkan judul tugas akhir Anda..." 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      className="min-h-[80px]"
                      disabled={validationErrors.length > 0 || generalErrors.length > 0}
                    />
                  </div>
                  
                  {taRequirements?.filter(r => r.phase === 'pengajuan_judul' && (r.is_general || r.type_id === selectedType) && r.req_type === 'document').map(req => (
                    <div className="space-y-2" key={req.id}>
                      <Label>{req.name} {req.is_required && <span className="text-destructive">*</span>}</Label>
                      <Input 
                        placeholder="Link Dokumen / Google Drive..." 
                        value={documentLink} 
                        onChange={(e) => setDocumentLink(e.target.value)}
                        disabled={validationErrors.length > 0 || generalErrors.length > 0}
                      />
                      <p className="text-xs text-muted-foreground">Pastikan link dapat diakses oleh publik atau Dosen/Admin.</p>
                    </div>
                  ))}

                  {taRequirements?.filter(r => r.phase === 'pengajuan_judul' && (r.is_general || r.type_id === selectedType) && r.req_type === 'document').length === 0 && (
                     <div className="space-y-2">
                       <Label>Link Dokumen Proposal (Google Drive, dll)</Label>
                       <Input 
                         placeholder="https://..." 
                         value={documentLink} 
                         onChange={(e) => setDocumentLink(e.target.value)}
                         disabled={validationErrors.length > 0 || generalErrors.length > 0}
                       />
                       <p className="text-xs text-muted-foreground">Pastikan link dapat diakses oleh publik atau Dosen/Admin.</p>
                     </div>
                  )}

                  <div className="space-y-2">
                    <Label>Catatan Tambahan (Opsional)</Label>
                    <Textarea 
                      placeholder="Pesan untuk Kaprodi..." 
                      value={comments} 
                      onChange={(e) => setComments(e.target.value)}
                      disabled={validationErrors.length > 0 || generalErrors.length > 0}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  {isCreatingNew && (
                    <Button variant="outline" onClick={() => setIsCreatingNew(false)} className="w-full sm:w-auto">Batal</Button>
                  )}
                  <Button 
                    onClick={() => submitMutation.mutate()} 
                    disabled={!selectedType || !title || !documentLink || submitMutation.isPending || validationErrors.length > 0 || generalErrors.length > 0}
                    className="flex-1"
                  >
                    {submitMutation.isPending ? 'Mengirim...' : 'Kirim Pengajuan'}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="seminar">
            {!mySubmission || mySubmission.status !== 'approved' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Pendaftaran Seminar Proposal</CardTitle>
                  <CardDescription>Ajukan jadwal seminar proposal Anda di sini.</CardDescription>
                </CardHeader>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Anda belum memiliki pengajuan Tugas Akhir yang disetujui Kaprodi.</p>
                </CardContent>
              </Card>
            ) : (
              <SeminarRegistrationForm 
                phase="sempro"
                submission={mySubmission}
                profile={myProfile}
                requirements={taRequirements || []}
                grades={myGrades || []}
                instrumenPenilaian={instrumenPenilaian || []}
                semester={calculateSemester(myProfile?.enrollment_year, activeAcademicYear?.name, activeSemester?.name) || 1}
              />
            )}
          </TabsContent>

          <TabsContent value="sidang">
            {!mySubmission || mySubmission.status !== 'approved' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Pendaftaran Sidang Akhir</CardTitle>
                  <CardDescription>Ajukan jadwal sidang akhir setelah bimbingan Anda selesai.</CardDescription>
                </CardHeader>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Anda belum memiliki pengajuan Tugas Akhir yang disetujui Kaprodi.</p>
                </CardContent>
              </Card>
            ) : (
              <SeminarRegistrationForm 
                phase="sidang"
                submission={mySubmission}
                profile={myProfile}
                requirements={taRequirements || []}
                grades={myGrades || []}
                instrumenPenilaian={instrumenPenilaian || []}
                semester={calculateSemester(myProfile?.enrollment_year, activeAcademicYear?.name, activeSemester?.name) || 1}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Modal Perbaiki Pengajuan (Revisi) */}
        <Dialog open={isReviseOpen} onOpenChange={setIsReviseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Perbaiki Pengajuan Judul</DialogTitle>
              <DialogDescription>Perbaiki judul atau perbarui link dokumen berdasarkan catatan yang diberikan.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jenis Tugas Akhir</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis..." />
                  </SelectTrigger>
                  <SelectContent>
                    {taTypes?.map((type: any) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topik / Judul</Label>
                <Textarea 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Link Dokumen (Proposal/Draft)</Label>
                <Input 
                  value={documentLink} 
                  onChange={(e) => setDocumentLink(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pesan Balasan / Catatan</Label>
                <Textarea 
                  value={comments} 
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Ketik balasan Anda di sini..."
                  className="min-h-[60px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviseOpen(false)}>Batal</Button>
              <Button 
                onClick={() => reviseMutation.mutate()} 
                disabled={reviseMutation.isPending || !title.trim() || !documentLink.trim()}
              >
                {reviseMutation.isPending ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Kirim Perbaikan</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Tambah Log Bimbingan */}
        <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Log Bimbingan</DialogTitle>
              <DialogDescription>Catat hasil konsultasi dengan dosen pembimbing Anda.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tanggal Konsultasi</Label>
                <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dosen Pembimbing</Label>
                <Select value={logDosenId} onValueChange={setLogDosenId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dosen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mySubmission?.ta_advisors?.map((adv: any) => (
                      <SelectItem key={adv.profiles.id} value={adv.profiles.id}>
                        {adv.profiles.full_name} ({adv.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Laporan Kemajuan / Pertanyaan</Label>
                <Textarea 
                  placeholder="Apa saja yang dibahas pada pertemuan ini?"
                  value={logProblem}
                  onChange={(e) => setLogProblem(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddLogOpen(false)}>Batal</Button>
              <Button 
                onClick={() => addLogMutation.mutate()} 
                disabled={addLogMutation.isPending || !logDosenId || !logProblem.trim()}
              >
                {addLogMutation.isPending ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Log</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
