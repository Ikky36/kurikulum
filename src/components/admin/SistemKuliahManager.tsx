import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, GraduationCap } from 'lucide-react';

interface SistemKuliah {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function SistemKuliahManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<SistemKuliah | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: sistemKuliahList, isLoading } = useQuery({
    queryKey: ['sistem-kuliah'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistem_kuliah')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as SistemKuliah[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; is_active: boolean }) => {
      const { error } = await supabase.from('sistem_kuliah').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistem-kuliah'] });
      toast({ title: 'Berhasil', description: 'Sistem kuliah berhasil ditambahkan' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SistemKuliah> & { id: string }) => {
      const { error } = await supabase.from('sistem_kuliah').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistem-kuliah'] });
      toast({ title: 'Berhasil', description: 'Sistem kuliah berhasil diperbarui' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sistem_kuliah').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistem-kuliah'] });
      toast({ title: 'Berhasil', description: 'Sistem kuliah berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsActive(true);
    setEditing(null);
    setShowDialog(false);
  };

  const openEdit = (item: SistemKuliah) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description || '');
    setIsActive(item.is_active);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        name,
        description: description || undefined,
        is_active: isActive,
      });
    } else {
      createMutation.mutate({
        name,
        description: description || undefined,
        is_active: isActive,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Sistem Kuliah
            </CardTitle>
            <CardDescription>
              Kelola sistem kuliah (Reguler, Ekstensi, dll.)
            </CardDescription>
          </div>
          <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Sistem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Sistem Kuliah' : 'Tambah Sistem Kuliah Baru'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Sistem</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Reguler, Ekstensi, Karyawan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi (opsional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi sistem kuliah..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    id="is-active"
                  />
                  <Label htmlFor="is-active">Aktif</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave} disabled={!name}>
                  {editing ? 'Simpan' : 'Tambah'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="w-12 text-primary-foreground">No</TableHead>
              <TableHead className="text-primary-foreground">Nama Sistem</TableHead>
              <TableHead className="text-primary-foreground">Deskripsi</TableHead>
              <TableHead className="text-primary-foreground">Status</TableHead>
              <TableHead className="w-24 text-primary-foreground">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sistemKuliahList?.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="text-center">{index + 1}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.description || '-'}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? 'default' : 'secondary'}>
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!sistemKuliahList || sistemKuliahList.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Belum ada sistem kuliah. Klik "Tambah Sistem" untuk menambahkan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
