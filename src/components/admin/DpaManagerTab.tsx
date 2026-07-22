import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Trash2, UserPlus, GraduationCap, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SistemKuliah {
  id: string;
  name: string;
  is_active: boolean;
}

export function DpaManagerTab() {
  const queryClient = useQueryClient();
  const [selectedDosen, setSelectedDosen] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSistemKuliah, setSelectedSistemKuliah] = useState('');

  // Fetch DPA assignments
  const { data: advisors = [], isLoading } = useQuery({
    queryKey: ['academic_advisors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_advisors')
        .select(`
          *,
          dosen:profiles!academic_advisors_dosen_id_fkey(full_name, nip),
          sistem_kuliah:sistem_kuliah(name)
        `)
        .order('enrollment_year', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Fetch Dosen list
  const { data: dosenList = [] } = useQuery({
    queryKey: ['dosen_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, nip')
        .eq('role', 'dosen')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch Sistem Kuliah list
  const { data: sistemKuliahList = [] } = useQuery({
    queryKey: ['sistem_kuliah_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistem_kuliah')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as SistemKuliah[];
    }
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('academic_advisors')
        .insert({
          dosen_id: selectedDosen,
          enrollment_year: parseInt(selectedYear),
          sistem_kuliah_id: selectedSistemKuliah
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dosen Pembimbing Akademik berhasil ditugaskan');
      queryClient.invalidateQueries({ queryKey: ['academic_advisors'] });
      setSelectedDosen('');
      setSelectedYear('');
      setSelectedSistemKuliah('');
    },
    onError: (err: any) => {
      if (err.code === '23505') {
        toast.error('Angkatan & Sistem Kuliah ini sudah memiliki DPA. Hapus DPA lama terlebih dahulu.');
      } else {
        toast.error('Gagal menugaskan DPA: ' + err.message);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('academic_advisors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Penugasan DPA berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['academic_advisors'] });
    },
    onError: (err: any) => toast.error('Gagal menghapus penugasan: ' + err.message)
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => (currentYear + 1) - i);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tugaskan Dosen Pembimbing Akademik
          </CardTitle>
          <CardDescription>
            Pilih Dosen untuk membina kelompok mahasiswa berdasarkan Tahun Masuk (Angkatan) dan Sistem Kuliah.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full space-y-2">
              <label className="text-sm font-medium">Dosen</label>
              <Select value={selectedDosen} onValueChange={setSelectedDosen}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Dosen..." />
                </SelectTrigger>
                <SelectContent>
                  {dosenList.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name} {d.nip ? `(${d.nip})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-[200px] space-y-2">
              <label className="text-sm font-medium">Angkatan</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Tahun Masuk" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[250px] space-y-2">
              <label className="text-sm font-medium">Sistem Kuliah</label>
              <Select value={selectedSistemKuliah} onValueChange={setSelectedSistemKuliah}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Sistem..." />
                </SelectTrigger>
                <SelectContent>
                  {sistemKuliahList.map((s: SistemKuliah) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => addMutation.mutate()} 
              disabled={!selectedDosen || !selectedYear || !selectedSistemKuliah || addMutation.isPending}
            >
              Tugaskan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daftar Dosen Pembimbing Akademik
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Dosen (DPA)</TableHead>
                <TableHead>Angkatan</TableHead>
                <TableHead>Sistem Kuliah</TableHead>
                <TableHead>Tanggal Ditugaskan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell>
                </TableRow>
              ) : advisors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada DPA yang ditugaskan.</TableCell>
                </TableRow>
              ) : (
                advisors.map((adv: any) => (
                  <TableRow key={adv.id}>
                    <TableCell>
                      <div className="font-medium">{adv.dosen?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{adv.dosen?.nip || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{adv.enrollment_year}</span>
                      </div>
                    </TableCell>
                    <TableCell>{adv.sistem_kuliah?.name}</TableCell>
                    <TableCell>{new Date(adv.created_at).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => {
                          if (window.confirm('Yakin ingin menghapus penugasan DPA ini?')) {
                            deleteMutation.mutate(adv.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
