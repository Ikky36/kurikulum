import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const TugasAkhirSettingsTab = () => {
  const queryClient = useQueryClient();
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);

  const [activeTab, setActiveTab] = useState('umum');
  const [isReqDialogOpen, setIsReqDialogOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<any>(null);
  
  // Requirement Form State
  const [reqName, setReqName] = useState('');
  const [reqPhase, setReqPhase] = useState('umum');
  const [reqIsGeneral, setReqIsGeneral] = useState(true);
  const [reqTypeId, setReqTypeId] = useState('all');
  const [reqType, setReqType] = useState('document');
  const [reqValueSks, setReqValueSks] = useState(140);
  const [reqValueSemester, setReqValueSemester] = useState(7);
  const [reqValuePredicateId, setReqValuePredicateId] = useState('');
  const [reqValuePredicateLimit, setReqValuePredicateLimit] = useState(2);
  const [reqValueCourseId, setReqValueCourseId] = useState('');
  const [reqIsRequired, setReqIsRequired] = useState(true);

  const resetReqForm = () => {
    setEditingReq(null);
    setReqName('');
    setReqPhase('umum');
    setReqIsGeneral(true);
    setReqTypeId('all');
    setReqType('document');
    setReqValueSks(140);
    setReqValueSemester(7);
    setReqValuePredicateId('');
    setReqValuePredicateLimit(2);
    setReqValueCourseId('');
    setReqIsRequired(true);
  };

  const openEditReq = (req: any) => {
    setEditingReq(req);
    setReqName(req.name);
    setReqPhase(req.phase);
    setReqIsGeneral(req.is_general);
    setReqTypeId(req.type_id || 'all');
    setReqType(req.req_type);
    
    if (req.req_type === 'min_sks') setReqValueSks(req.req_value?.min || 140);
    if (req.req_type === 'min_semester') setReqValueSemester(req.req_value?.min || 7);
    if (req.req_type === 'predicate') {
      setReqValuePredicateId(req.req_value?.predicate_id || '');
      setReqValuePredicateLimit(req.req_value?.max_count || 2);
    }
    if (req.req_type === 'course') setReqValueCourseId(req.req_value?.course_ids?.[0] || '');
    
    setReqIsRequired(req.is_required);
    setIsReqDialogOpen(true);
  };

  const openAddReq = () => {
    resetReqForm();
    setIsReqDialogOpen(true);
  };

  const openAddType = () => {
    setEditingType(null);
    setNewTypeName('');
    setNewTypeDesc('');
    setIsTypeDialogOpen(true);
  };

  const openEditType = (type: any) => {
    setEditingType(type);
    setNewTypeName(type.name);
    setNewTypeDesc(type.description || '');
    setIsTypeDialogOpen(true);
  };

  const { data: taTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['ta_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_types').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: taRequirements, isLoading: reqsLoading } = useQuery({
    queryKey: ['ta_requirements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_requirements').select('*, ta_types(name)').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: instrumenPenilaian } = useQuery({
    queryKey: ['instrumen_penilaian'],
    queryFn: async () => {
      const { data, error } = await supabase.from('instrumen_penilaian').select('*').order('rentang_max', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, name, code').order('name');
      if (error) throw error;
      return data;
    }
  });

  const saveTypeMutation = useMutation({
    mutationFn: async () => {
      if (editingType) {
        const { error } = await supabase.from('ta_types').update({
          name: newTypeName,
          description: newTypeDesc
        }).eq('id', editingType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ta_types').insert({
          name: newTypeName,
          description: newTypeDesc
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_types'] });
      toast.success(`Jenis Tugas Akhir berhasil ${editingType ? 'diperbarui' : 'ditambahkan'}`);
      setIsTypeDialogOpen(false);
    },
    onError: (error) => toast.error('Gagal menyimpan: ' + error.message)
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ta_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_types'] });
      queryClient.invalidateQueries({ queryKey: ['ta_requirements'] });
      toast.success('Jenis Tugas Akhir berhasil dihapus');
    },
    onError: (error) => toast.error('Gagal menghapus: ' + error.message)
  });

  const saveReqMutation = useMutation({
    mutationFn: async () => {
      let req_value = {};
      if (reqType === 'min_sks') req_value = { min: reqValueSks };
      else if (reqType === 'min_semester') req_value = { min: reqValueSemester };
      else if (reqType === 'predicate') req_value = { predicate_id: reqValuePredicateId, max_count: reqValuePredicateLimit };
      else if (reqType === 'course') req_value = { course_ids: [reqValueCourseId] };

      const payload = {
        name: reqName,
        phase: reqPhase,
        is_general: reqPhase === 'umum' ? true : reqIsGeneral,
        type_id: (reqPhase !== 'umum' && !reqIsGeneral && reqTypeId !== 'all') ? reqTypeId : null,
        req_type: reqType,
        req_value: req_value,
        is_required: reqIsRequired
      };

      if (editingReq) {
        const { error } = await supabase.from('ta_requirements').update(payload).eq('id', editingReq.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ta_requirements').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_requirements'] });
      toast.success(`Persyaratan berhasil ${editingReq ? 'diperbarui' : 'ditambahkan'}`);
      setIsReqDialogOpen(false);
    },
    onError: (error) => toast.error('Gagal menyimpan: ' + error.message)
  });

  const deleteReqMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ta_requirements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_requirements'] });
      toast.success('Persyaratan berhasil dihapus');
    },
    onError: (error) => toast.error('Gagal menghapus: ' + error.message)
  });

  const updateReqInlineMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string, field: string, value: any }) => {
      const { error } = await supabase.from('ta_requirements').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_requirements'] });
      toast.success('Status Wajib diperbarui');
    }
  });

  if (typesLoading || reqsLoading) return <div>Memuat pengaturan...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Jenis Tugas Akhir</CardTitle>
            <CardDescription>Kelola jenis tugas akhir seperti Skripsi, Tesis, Jurnal, atau Portofolio.</CardDescription>
          </div>
          <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAddType}><Plus className="w-4 h-4 mr-2"/> Tambah Jenis TA</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingType ? 'Edit Jenis Tugas Akhir' : 'Tambah Jenis Tugas Akhir'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Jenis (Contoh: Skripsi)</Label>
                  <Input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Masukkan nama..." />
                </div>
                <div className="space-y-2">
                  <Label>Keterangan (Opsional)</Label>
                  <Input value={newTypeDesc} onChange={(e) => setNewTypeDesc(e.target.value)} placeholder="Deskripsi singkat..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTypeDialogOpen(false)}>Batal</Button>
                <Button onClick={() => saveTypeMutation.mutate()} disabled={!newTypeName || saveTypeMutation.isPending}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Tugas Akhir</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="w-32">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taTypes?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">Belum ada jenis Tugas Akhir.</TableCell>
                  </TableRow>
                )}
                {taTypes?.map((type: any) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.description || '-'}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="icon" className="mr-2" onClick={() => openEditType(type)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => {
                        if (confirm('Yakin ingin menghapus jenis TA ini?')) deleteTypeMutation.mutate(type.id);
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Persyaratan Tugas Akhir</CardTitle>
            <CardDescription>Manajemen persyaratan dinamis untuk mahasiswa.</CardDescription>
          </div>
          <Dialog open={isReqDialogOpen} onOpenChange={setIsReqDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAddReq}><Plus className="w-4 h-4 mr-2"/> Tambah Syarat</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingReq ? 'Edit Syarat' : 'Tambah Syarat Baru'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label>Nama Persyaratan</Label>
                  <Input value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="Contoh: Lulus TOEFL 500" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fase Validasi</Label>
                    <Select value={reqPhase} onValueChange={(val) => { setReqPhase(val); if(val === 'umum') setReqIsGeneral(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="umum">Persyaratan Umum Awal</SelectItem>
                        <SelectItem value="pengajuan_judul">Pengajuan Judul</SelectItem>
                        <SelectItem value="sempro">Seminar Proposal</SelectItem>
                        <SelectItem value="sidang">Sidang Akhir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {reqPhase !== 'umum' && (
                    <div className="space-y-2">
                      <Label>Cakupan Jenis TA</Label>
                      <Select 
                        value={reqIsGeneral ? 'all' : reqTypeId} 
                        onValueChange={(val) => {
                          if (val === 'all') setReqIsGeneral(true);
                          else { setReqIsGeneral(false); setReqTypeId(val); }
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Jenis TA</SelectItem>
                          {taTypes?.map(t => <SelectItem key={t.id} value={t.id}>Khusus: {t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Jenis Validasi</Label>
                  <Select value={reqType} onValueChange={setReqType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Unggah Dokumen / Link (Mahasiswa)</SelectItem>
                      <SelectItem value="min_sks">Batas Minimal SKS (Otomatis)</SelectItem>
                      <SelectItem value="min_semester">Batas Minimal Semester (Otomatis)</SelectItem>
                      <SelectItem value="predicate">Batas Maksimal Predikat (Otomatis)</SelectItem>
                      <SelectItem value="course">Lulus Mata Kuliah (Otomatis)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {reqType === 'min_sks' && (
                  <div className="space-y-2">
                    <Label>Minimal Jumlah SKS Lulus</Label>
                    <Input type="number" min={1} value={reqValueSks} onChange={(e) => setReqValueSks(parseInt(e.target.value))} />
                  </div>
                )}

                {reqType === 'min_semester' && (
                  <div className="space-y-2">
                    <Label>Minimal Semester</Label>
                    <Input type="number" min={1} max={14} value={reqValueSemester} onChange={(e) => setReqValueSemester(parseInt(e.target.value))} />
                  </div>
                )}

                {reqType === 'predicate' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Predikat</Label>
                      <Select value={reqValuePredicateId} onValueChange={setReqValuePredicateId}>
                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                        <SelectContent>
                          {instrumenPenilaian?.map(i => <SelectItem key={i.id} value={i.id}>{i.predikat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Maksimal Jumlah MK</Label>
                      <Input type="number" min={0} value={reqValuePredicateLimit} onChange={(e) => setReqValuePredicateLimit(parseInt(e.target.value))} />
                    </div>
                  </div>
                )}

                {reqType === 'course' && (
                  <div className="space-y-2">
                    <Label>Mata Kuliah Prasyarat</Label>
                    <Select value={reqValueCourseId} onValueChange={setReqValueCourseId}>
                      <SelectTrigger><SelectValue placeholder="Pilih matkul..." /></SelectTrigger>
                      <SelectContent>
                        {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex flex-row items-center justify-between rounded-lg border p-4 mt-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Wajib Dipenuhi (Required)</Label>
                    <p className="text-sm text-muted-foreground">Jika aktif, sistem akan menolak pendaftaran jika syarat ini gagal.</p>
                  </div>
                  <Switch checked={reqIsRequired} onCheckedChange={setReqIsRequired} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReqDialogOpen(false)}>Batal</Button>
                <Button onClick={() => saveReqMutation.mutate()} disabled={!reqName || saveReqMutation.isPending}>Simpan Syarat</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="umum">Pra-Syarat Umum</TabsTrigger>
              <TabsTrigger value="pengajuan_judul">Pengajuan Judul</TabsTrigger>
              <TabsTrigger value="sempro">Seminar Proposal</TabsTrigger>
              <TabsTrigger value="sidang">Sidang Akhir</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="m-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Persyaratan</TableHead>
                      <TableHead>Cakupan</TableHead>
                      <TableHead>Jenis Validasi</TableHead>
                      <TableHead>Parameter</TableHead>
                      <TableHead className="w-24">Wajib</TableHead>
                      <TableHead className="w-32">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taRequirements?.filter(r => r.phase === activeTab).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada persyaratan di fase ini.</TableCell>
                      </TableRow>
                    )}
                    {taRequirements?.filter(r => r.phase === activeTab).map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.name}</TableCell>
                        <TableCell>
                          <Badge variant={req.is_general ? 'default' : 'outline'}>
                            {req.is_general ? 'Semua Jenis' : `Khusus: ${req.ta_types?.name}`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {req.req_type === 'document' ? 'Unggah Berkas' : 
                             req.req_type === 'min_sks' ? 'Syarat SKS' : 
                             req.req_type === 'min_semester' ? 'Syarat Semester' :
                             req.req_type === 'predicate' ? 'Syarat Nilai (Predikat)' :
                             req.req_type === 'course' ? 'Lulus Matkul' : req.req_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {req.req_type === 'min_sks' && `Min ${req.req_value?.min} SKS`}
                          {req.req_type === 'min_semester' && `Min Sem ${req.req_value?.min}`}
                          {req.req_type === 'predicate' && `Max ${req.req_value?.max_count} MK (${instrumenPenilaian?.find((i:any) => i.id === req.req_value?.predicate_id)?.predikat})`}
                          {req.req_type === 'course' && `Matkul ID: ${req.req_value?.course_ids?.[0]}`}
                          {req.req_type === 'document' && '-'}
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={req.is_required} 
                            onCheckedChange={(checked) => updateReqInlineMutation.mutate({ id: req.id, field: 'is_required', value: checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="icon" className="mr-2" onClick={() => openEditReq(req)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => {
                            if (confirm('Hapus persyaratan ini?')) deleteReqMutation.mutate(req.id);
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
