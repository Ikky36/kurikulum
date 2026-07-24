import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Edit2, Check, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const TugasAkhirSettingsTab = () => {
  const queryClient = useQueryClient();
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);

  const [newReqName, setNewReqName] = useState('');
  const [newReqType, setNewReqType] = useState('sempro');
  const [newReqIsRequired, setNewReqIsRequired] = useState(true);
  const [isReqDialogOpen, setIsReqDialogOpen] = useState(false);

  const { data: taTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['ta_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_types').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: taSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['ta_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_settings').select('*, ta_types(name)').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: seminarRequirements, isLoading: reqsLoading } = useQuery({
    queryKey: ['ta_seminar_requirements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_seminar_requirements').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const addTypeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('ta_types').insert({
        name: newTypeName,
        description: newTypeDesc
      }).select().single();
      
      if (error) throw error;

      // Auto create settings for this type
      await supabase.from('ta_settings').insert({
        type_id: data.id,
        min_semester: 7,
        max_bad_grades_count: 2,
        required_course_ids: []
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_types'] });
      queryClient.invalidateQueries({ queryKey: ['ta_settings'] });
      toast.success('Jenis Tugas Akhir berhasil ditambahkan');
      setNewTypeName('');
      setNewTypeDesc('');
      setIsTypeDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Gagal menambahkan: ' + error.message);
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string, field: string, value: any }) => {
      const { error } = await supabase.from('ta_settings').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_settings'] });
      toast.success('Pengaturan berhasil diperbarui');
    },
    onError: (error) => {
      toast.error('Gagal memperbarui: ' + error.message);
    }
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ta_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_types'] });
      queryClient.invalidateQueries({ queryKey: ['ta_settings'] });
      toast.success('Jenis Tugas Akhir berhasil dihapus');
    },
    onError: (error) => {
      toast.error('Gagal menghapus: ' + error.message);
    }
  });

  const addReqMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('ta_seminar_requirements').insert({
        name: newReqName,
        type: newReqType,
        is_required: newReqIsRequired
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_seminar_requirements'] });
      toast.success('Syarat Seminar berhasil ditambahkan');
      setNewReqName('');
      setNewReqIsRequired(true);
      setIsReqDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Gagal menambahkan: ' + error.message);
    }
  });

  const updateReqMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string, field: string, value: any }) => {
      const { error } = await supabase.from('ta_seminar_requirements').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_seminar_requirements'] });
      toast.success('Syarat Seminar berhasil diperbarui');
    },
    onError: (error) => {
      toast.error('Gagal memperbarui: ' + error.message);
    }
  });

  const deleteReqMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ta_seminar_requirements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta_seminar_requirements'] });
      toast.success('Syarat Seminar berhasil dihapus');
    },
    onError: (error) => {
      toast.error('Gagal menghapus: ' + error.message);
    }
  });

  if (typesLoading || settingsLoading || reqsLoading) return <div>Memuat pengaturan...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Jenis & Persyaratan Tugas Akhir</CardTitle>
            <CardDescription>Atur jenis tugas akhir (Skripsi, Jurnal) dan batas persyaratannya.</CardDescription>
          </div>
          <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Tambah Jenis TA</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Jenis Tugas Akhir</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Jenis (Contoh: Skripsi / Jurnal)</Label>
                  <Input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Masukkan nama..." />
                </div>
                <div className="space-y-2">
                  <Label>Keterangan (Opsional)</Label>
                  <Input value={newTypeDesc} onChange={(e) => setNewTypeDesc(e.target.value)} placeholder="Deskripsi singkat..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTypeDialogOpen(false)}>Batal</Button>
                <Button onClick={() => addTypeMutation.mutate()} disabled={!newTypeName || addTypeMutation.isPending}>Simpan</Button>
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
                  <TableHead>Minimal Semester</TableHead>
                  <TableHead>Max Nilai C/D/E</TableHead>
                  <TableHead className="w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taSettings?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Belum ada pengaturan jenis Tugas Akhir.</TableCell>
                  </TableRow>
                )}
                {taSettings?.map((setting: any) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-medium">
                      {setting.ta_types?.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          min={1} 
                          max={14} 
                          className="w-20"
                          defaultValue={setting.min_semester}
                          onBlur={(e) => {
                            if (e.target.value !== String(setting.min_semester)) {
                              updateSettingMutation.mutate({ id: setting.id, field: 'min_semester', value: parseInt(e.target.value) });
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          min={0} 
                          max={10} 
                          className="w-20"
                          defaultValue={setting.max_bad_grades_count}
                          onBlur={(e) => {
                            if (e.target.value !== String(setting.max_bad_grades_count)) {
                              updateSettingMutation.mutate({ id: setting.id, field: 'max_bad_grades_count', value: parseInt(e.target.value) });
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="icon" onClick={() => {
                        if (confirm('Yakin ingin menghapus jenis Tugas Akhir ini? Semua data pengajuan terkait juga akan terhapus.')) {
                          deleteTypeMutation.mutate(setting.type_id);
                        }
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
            <CardTitle>Persyaratan Berkas Seminar & Sidang</CardTitle>
            <CardDescription>Daftar berkas/syarat yang harus diunggah mahasiswa saat mendaftar Seminar Proposal atau Sidang Akhir.</CardDescription>
          </div>
          <Dialog open={isReqDialogOpen} onOpenChange={setIsReqDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Tambah Syarat</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Syarat Pendaftaran</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tahap Ujian</Label>
                  <Select value={newReqType} onValueChange={setNewReqType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tahap ujian" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sempro">Seminar Proposal</SelectItem>
                      <SelectItem value="sidang">Sidang Akhir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nama Syarat (Misal: Bukti Bebas Pustaka, Bukti Lulus TOEFL)</Label>
                  <Input value={newReqName} onChange={(e) => setNewReqName(e.target.value)} placeholder="Masukkan nama syarat..." />
                </div>
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Wajib (Required)</Label>
                    <p className="text-sm text-muted-foreground">Mahasiswa tidak bisa mendaftar jika berkas ini belum diunggah.</p>
                  </div>
                  <Switch checked={newReqIsRequired} onCheckedChange={setNewReqIsRequired} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReqDialogOpen(false)}>Batal</Button>
                <Button onClick={() => addReqMutation.mutate()} disabled={!newReqName || addReqMutation.isPending}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Berkas / Syarat</TableHead>
                  <TableHead>Tahap Ujian</TableHead>
                  <TableHead>Status Wajib</TableHead>
                  <TableHead className="w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seminarRequirements?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Belum ada persyaratan yang ditambahkan.</TableCell>
                  </TableRow>
                )}
                {seminarRequirements?.map((req: any) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={req.type === 'sempro' ? 'secondary' : 'default'}>
                        {req.type === 'sempro' ? 'Sem. Proposal' : 'Sidang Akhir'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={req.is_required} 
                        onCheckedChange={(checked) => updateReqMutation.mutate({ id: req.id, field: 'is_required', value: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="icon" onClick={() => {
                        if (confirm('Yakin ingin menghapus syarat ini?')) {
                          deleteReqMutation.mutate(req.id);
                        }
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
    </div>
  );
};
