import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { TAType, TAMasterPhase } from '@/lib/types';

export function MasterPhaseAdmin() {
  const [selectedType, setSelectedType] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<TAMasterPhase | null>(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState(true);

  const queryClient = useQueryClient();

  // Load TA Types
  const { data: taTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ['admin_ta_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as TAType[];
    }
  });

  // Set default selected type when loaded
  React.useEffect(() => {
    if (taTypes && taTypes.length > 0 && !selectedType) {
      setSelectedType(taTypes[0].id);
    }
  }, [taTypes, selectedType]);

  // Load Master Phases for selected type
  const { data: phases, isLoading: loadingPhases } = useQuery({
    queryKey: ['admin_ta_phases', selectedType],
    queryFn: async () => {
      if (!selectedType) return [];
      const { data, error } = await supabase
        .from('ta_master_phases')
        .select('*')
        .eq('ta_type_id', selectedType)
        .order('order_num');
      if (error) throw error;
      return data as TAMasterPhase[];
    },
    enabled: !!selectedType
  });

  // Save Phase Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedType) throw new Error("Pilih jenis TA terlebih dahulu");
      
      const payload = {
        ta_type_id: selectedType,
        name: formName,
        order_num: formOrder,
        is_active: formIsActive
      };

      if (editingPhase) {
        const { error } = await supabase
          .from('ta_master_phases')
          .update(payload)
          .eq('id', editingPhase.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ta_master_phases')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPhase ? 'Fase berhasil diperbarui' : 'Fase baru ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['admin_ta_phases', selectedType] });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Gagal menyimpan fase: ' + error.message);
    }
  });

  // Delete Phase Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ta_master_phases')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fase berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['admin_ta_phases', selectedType] });
    },
    onError: (error: any) => {
      toast.error('Gagal menghapus fase: ' + error.message);
    }
  });

  // Reorder Mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string, newOrder: number }) => {
      const { error } = await supabase
        .from('ta_master_phases')
        .update({ order_num: newOrder })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_ta_phases', selectedType] });
    }
  });

  const handleOpenDialog = (phase?: TAMasterPhase) => {
    if (phase) {
      setEditingPhase(phase);
      setFormName(phase.name);
      setFormOrder(phase.order_num);
      setFormIsActive(phase.is_active);
    } else {
      setEditingPhase(null);
      setFormName('');
      setFormOrder(phases && phases.length > 0 ? Math.max(...phases.map(p => p.order_num)) + 1 : 1);
      setFormIsActive(true);
    }
    setIsDialogOpen(true);
  };

  const moveOrder = (index: number, direction: 'up' | 'down') => {
    if (!phases) return;
    const current = phases[index];
    const target = direction === 'up' ? phases[index - 1] : phases[index + 1];
    
    if (current && target) {
      // Swap order_num
      reorderMutation.mutate({ id: current.id, newOrder: target.order_num });
      reorderMutation.mutate({ id: target.id, newOrder: current.order_num });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Pengaturan Master Fase</CardTitle>
            <CardDescription>Atur tahapan bimbingan Tugas Akhir berdasarkan Jenis TA.</CardDescription>
          </div>
          {selectedType && (
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Tambah Fase
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 max-w-sm">
          <Label className="mb-2 block">Pilih Jenis Tugas Akhir</Label>
          {loadingTypes ? (
            <div className="h-10 animate-pulse bg-muted rounded-md" />
          ) : (
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Jenis TA" />
              </SelectTrigger>
              <SelectContent>
                {taTypes?.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedType && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Urutan</TableHead>
                  <TableHead>Nama Fase</TableHead>
                  <TableHead>Status Aktif</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPhases ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">Memuat fase...</TableCell>
                  </TableRow>
                ) : !phases || phases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Belum ada fase yang diatur untuk jenis TA ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  phases.map((phase, idx) => (
                    <TableRow key={phase.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          <span className="w-4 text-center">{phase.order_num}</span>
                          <div className="flex flex-col">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5" 
                              disabled={idx === 0}
                              onClick={() => moveOrder(idx, 'up')}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5" 
                              disabled={idx === phases.length - 1}
                              onClick={() => moveOrder(idx, 'down')}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{phase.name}</TableCell>
                      <TableCell>
                        <Switch checked={phase.is_active} disabled />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(phase)}>
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            if (window.confirm('Yakin ingin menghapus fase ini? Semua sub-target yang terkait mungkin akan kehilangan referensi fasenya.')) {
                              deleteMutation.mutate(phase.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPhase ? 'Edit Fase' : 'Tambah Fase Baru'}</DialogTitle>
              <DialogDescription>Masukkan nama fase dan urutannya.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nama Fase</Label>
                <Input 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)} 
                  placeholder="Cth: Penyusunan Proposal"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Nomor Urut</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={formOrder} 
                  onChange={e => setFormOrder(parseInt(e.target.value))} 
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Semakin kecil angkanya, semakin awal fasenya.</p>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  id="active-switch" 
                  checked={formIsActive} 
                  onCheckedChange={setFormIsActive} 
                />
                <Label htmlFor="active-switch">Fase Aktif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!formName.trim() || saveMutation.isPending}>
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
