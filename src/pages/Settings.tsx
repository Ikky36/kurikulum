import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, Pencil, Palette, BookOpen, GraduationCap, Settings as SettingsIcon, Image } from 'lucide-react';
import { Curriculum, Program, AppSetting } from '@/lib/types';

export default function Settings() {
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Curriculum state
  const [showCurriculumDialog, setShowCurriculumDialog] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [curriculumName, setCurriculumName] = useState('');
  const [curriculumDescription, setCurriculumDescription] = useState('');

  // Program state
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');

  // Theme state
  const [appName, setAppName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch curricula
  const { data: curricula } = useQuery({
    queryKey: ['curricula'],
    queryFn: async () => {
      const { data, error } = await supabase.from('curricula').select('*').order('name');
      if (error) throw error;
      return data as Curriculum[];
    },
  });

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data as Program[];
    },
  });

  // Fetch app settings
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data.forEach((s: AppSetting) => {
        settingsMap[s.setting_key] = s.setting_value || '';
      });
      
      setAppName(settingsMap['app_name'] || 'Student Achievement Tracker PBA');
      setLogoUrl(settingsMap['logo_url'] || '');
      setPrimaryColor(settingsMap['primary_color'] || '');
      
      return settingsMap;
    },
  });

  // Curriculum mutations
  const createCurriculumMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { error } = await supabase.from('curricula').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({ title: 'Berhasil', description: 'Kurikulum berhasil ditambahkan' });
      resetCurriculumForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateCurriculumMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Curriculum> & { id: string }) => {
      const { error } = await supabase.from('curricula').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({ title: 'Berhasil', description: 'Kurikulum berhasil diperbarui' });
      resetCurriculumForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCurriculumMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('curricula').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast({ title: 'Berhasil', description: 'Kurikulum berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Program mutations
  const createProgramMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { error } = await supabase.from('programs').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({ title: 'Berhasil', description: 'Program Studi berhasil ditambahkan' });
      resetProgramForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Program> & { id: string }) => {
      const { error } = await supabase.from('programs').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({ title: 'Berhasil', description: 'Program Studi berhasil diperbarui' });
      resetProgramForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({ title: 'Berhasil', description: 'Program Studi berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  // Settings mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast({ title: 'Berhasil', description: 'Pengaturan berhasil disimpan' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `app/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Gagal upload', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    setLogoUrl(urlData.publicUrl);
    updateSettingMutation.mutate({ key: 'logo_url', value: urlData.publicUrl });
    setUploading(false);
  };

  const resetCurriculumForm = () => {
    setCurriculumName('');
    setCurriculumDescription('');
    setEditingCurriculum(null);
    setShowCurriculumDialog(false);
  };

  const resetProgramForm = () => {
    setProgramName('');
    setProgramDescription('');
    setEditingProgram(null);
    setShowProgramDialog(false);
  };

  const openEditCurriculum = (curriculum: Curriculum) => {
    setEditingCurriculum(curriculum);
    setCurriculumName(curriculum.name);
    setCurriculumDescription(curriculum.description || '');
    setShowCurriculumDialog(true);
  };

  const openEditProgram = (program: Program) => {
    setEditingProgram(program);
    setProgramName(program.name);
    setProgramDescription(program.description || '');
    setShowProgramDialog(true);
  };

  const handleSaveCurriculum = () => {
    if (editingCurriculum) {
      updateCurriculumMutation.mutate({ id: editingCurriculum.id, name: curriculumName, description: curriculumDescription || undefined });
    } else {
      createCurriculumMutation.mutate({ name: curriculumName, description: curriculumDescription || undefined });
    }
  };

  const handleSaveProgram = () => {
    if (editingProgram) {
      updateProgramMutation.mutate({ id: editingProgram.id, name: programName, description: programDescription || undefined });
    } else {
      createProgramMutation.mutate({ name: programName, description: programDescription || undefined });
    }
  };

  const handleSaveTheme = () => {
    updateSettingMutation.mutate({ key: 'app_name', value: appName });
  };

  if (loading) {
    return <Layout><div className="container py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></Layout>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== 'admin' && role !== 'sub_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const isAdmin = role === 'admin';
  const isSubAdmin = role === 'sub_admin';

  const canAccessTheme = isAdmin;

  return (
    <Layout>
      <div className="container py-8 lg:py-12">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Pengaturan
          </h1>
          <p className="text-muted-foreground">
            Kelola pengaturan aplikasi, kurikulum, dan program studi
          </p>
        </div>

        <Tabs defaultValue={canAccessTheme ? "theme" : "curriculum"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            {canAccessTheme && (
              <TabsTrigger value="theme" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Custom Web
              </TabsTrigger>
            )}
            <TabsTrigger value="curriculum" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Kurikulum
            </TabsTrigger>
            <TabsTrigger value="programs" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Program Studi
            </TabsTrigger>
          </TabsList>

          {/* Theme Tab - Only for admin */}
          {canAccessTheme && (
            <TabsContent value="theme">
              <Card>
                <CardHeader>
                  <CardTitle>Kustomisasi Tampilan</CardTitle>
                  <CardDescription>Atur nama aplikasi dan logo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nama Aplikasi</Label>
                        <Input 
                          value={appName} 
                          onChange={(e) => setAppName(e.target.value)} 
                          placeholder="Student Achievement Tracker PBA"
                        />
                      </div>
                      <Button onClick={handleSaveTheme}>Simpan Nama</Button>
                    </div>
                    
                    <div className="space-y-4">
                      <Label>Logo Aplikasi</Label>
                      <div className="flex items-center gap-4">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-lg border" />
                        ) : (
                          <div className="h-16 w-16 flex items-center justify-center rounded-lg border bg-muted">
                            <Image className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <Label htmlFor="logo-upload" className="cursor-pointer">
                            <Button variant="outline" asChild disabled={uploading}>
                              <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
                            </Button>
                          </Label>
                          <input 
                            id="logo-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleLogoUpload}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Curriculum Tab */}
          <TabsContent value="curriculum">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Kelola Kurikulum</CardTitle>
                    <CardDescription>Buat dan kelola nama kurikulum</CardDescription>
                  </div>
                  <Dialog open={showCurriculumDialog} onOpenChange={(open) => { if (!open) resetCurriculumForm(); setShowCurriculumDialog(open); }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Kurikulum
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingCurriculum ? 'Edit Kurikulum' : 'Tambah Kurikulum Baru'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nama Kurikulum</Label>
                          <Input 
                            value={curriculumName} 
                            onChange={(e) => setCurriculumName(e.target.value)} 
                            placeholder="Contoh: Kurikulum 2024" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Deskripsi (opsional)</Label>
                          <Textarea 
                            value={curriculumDescription} 
                            onChange={(e) => setCurriculumDescription(e.target.value)} 
                            placeholder="Deskripsi kurikulum..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleSaveCurriculum} disabled={!curriculumName}>
                          {editingCurriculum ? 'Simpan' : 'Tambah'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama Kurikulum</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="w-24">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {curricula?.map((curriculum, index) => (
                      <TableRow key={curriculum.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{curriculum.name}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{curriculum.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditCurriculum(curriculum)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteCurriculumMutation.mutate(curriculum.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!curricula || curricula.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Belum ada kurikulum. Klik "Tambah Kurikulum" untuk menambahkan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programs Tab */}
          <TabsContent value="programs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Kelola Program Studi</CardTitle>
                    <CardDescription>Buat dan kelola nama program studi</CardDescription>
                  </div>
                  <Dialog open={showProgramDialog} onOpenChange={(open) => { if (!open) resetProgramForm(); setShowProgramDialog(open); }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Prodi
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingProgram ? 'Edit Program Studi' : 'Tambah Program Studi Baru'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nama Program Studi</Label>
                          <Input 
                            value={programName} 
                            onChange={(e) => setProgramName(e.target.value)} 
                            placeholder="Contoh: Pendidikan Bahasa Arab" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Deskripsi (opsional)</Label>
                          <Textarea 
                            value={programDescription} 
                            onChange={(e) => setProgramDescription(e.target.value)} 
                            placeholder="Deskripsi program studi..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleSaveProgram} disabled={!programName}>
                          {editingProgram ? 'Simpan' : 'Tambah'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama Program Studi</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="w-24">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs?.map((program, index) => (
                      <TableRow key={program.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{program.name}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{program.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditProgram(program)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteProgramMutation.mutate(program.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!programs || programs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Belum ada program studi. Klik "Tambah Prodi" untuk menambahkan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
