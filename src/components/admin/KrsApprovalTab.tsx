import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Check, X, Search, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function KrsApprovalTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedKrs, setSelectedKrs] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  // Fetch KRS data
  const { data: krsList = [], isLoading } = useQuery({
    queryKey: ['admin_krs_approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('krs')
        .select(`
          *,
          profiles:student_id(full_name, nim, program),
          semesters:semester_id(name, max_sks),
          krs_items(
            id,
            courses(id, code, name, sks)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Calculate SKS per KRS
  const krsWithSks = (krsList || []).map(krs => {
    const totalSks = krs.krs_items?.reduce((sum: number, item: any) => sum + (item.courses?.sks || 0), 0) || 0;
    return { ...krs, total_sks: totalSks };
  });

  const filteredKrs = (krsWithSks || []).filter(krs => {
    const fullName = krs.profiles?.full_name || '';
    const nim = krs.profiles?.nim || '';
    const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          nim.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || krs.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const approveMutation = useMutation({
    mutationFn: async (krsData: any) => {
      // 1. Dapatkan profil mahasiswa
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', krsData.student_id)
        .single();
        
      if (!profile) throw new Error('Profil mahasiswa tidak ditemukan');

      // 2. Update status KRS menjadi approved
      const { error } = await supabase
        .from('krs')
        .update({ status: 'approved', notes: null })
        .eq('id', krsData.id);
      if (error) throw error;

      // 3. Jalankan logika Auto-Allocation Kelas E-Learning
      if (krsData.krs_items && krsData.krs_items.length > 0) {
        for (const item of krsData.krs_items) {
          const courseId = item.courses?.id;
          if (!courseId) continue;
          
          // Cari kelas e-learning untuk mata kuliah ini
          const { data: eClasses } = await supabase
            .from('elearning_classes')
            .select('id, class_groups(id, sistem_kuliah_id, gender_type, programs(name))')
            .eq('course_id', courseId)
            .eq('is_active', true);
            
          if (eClasses && eClasses.length > 0) {
             let matchedId = null;
             
             // Cari kelas yang paling cocok dengan profil mahasiswa
             const exactMatch = eClasses.find(ec => {
               const cg = ec.class_groups as any;
               if (!cg) return false;
               const matchSistem = cg.sistem_kuliah_id ? cg.sistem_kuliah_id === profile.sistem_kuliah_id : true;
               const matchGender = cg.gender_type ? (cg.gender_type === 'Campuran' || cg.gender_type === profile.gender) : true;
               const matchProgram = cg.programs?.name ? cg.programs.name === profile.program : true;
               return matchSistem && matchGender && matchProgram;
             });
             
             if (exactMatch) {
               matchedId = exactMatch.id;
             } else {
               // Fallback: titipkan ke kelas pertama yang tersedia
               matchedId = eClasses[0].id;
             }
             
             if (matchedId) {
               await supabase
                 .from('krs_items')
                 .update({ elearning_class_id: matchedId })
                 .eq('id', item.id);
             }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success('KRS disetujui & Mahasiswa otomatis dialokasikan ke kelas');
      queryClient.invalidateQueries({ queryKey: ['admin_krs_approvals'] });
      setSelectedKrs(null);
    },
    onError: (err: any) => toast.error('Gagal menyetujui KRS: ' + err.message)
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string, notes: string }) => {
      const { error } = await supabase
        .from('krs')
        .update({ status: 'draft', notes })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('KRS ditolak dan dikembalikan ke mahasiswa');
      queryClient.invalidateQueries({ queryKey: ['admin_krs_approvals'] });
      setRejectDialog(false);
      setRejectNotes('');
      setSelectedKrs(null);
    },
    onError: (err: any) => toast.error('Gagal menolak KRS: ' + err.message)
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama / NIM..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Menunggu (Pending)</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
            <SelectItem value="rejected">Ditolak / Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Total SKS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell>
                </TableRow>
              ) : filteredKrs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data KRS ditemukan.</TableCell>
                </TableRow>
              ) : (
                filteredKrs.map((krs) => (
                  <TableRow key={krs.id}>
                    <TableCell>
                      <div className="font-medium">{krs.profiles?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{krs.profiles?.nim || '-'} • {krs.profiles?.program || '-'}</div>
                    </TableCell>
                    <TableCell>{krs.semesters?.name}</TableCell>
                    <TableCell>
                      <span className={krs.total_sks > (krs.semesters?.max_sks || 24) ? "text-red-500 font-bold" : ""}>
                        {krs.total_sks} / {krs.semesters?.max_sks || 24}
                      </span>
                    </TableCell>
                    <TableCell>
                      {krs.status === 'approved' && <Badge className="bg-green-500">Disetujui</Badge>}
                      {krs.status === 'pending' && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">Pending</Badge>}
                      {(krs.status === 'rejected' || krs.status === 'draft') && <Badge variant="outline">Draft/Ditolak</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedKrs(krs)}>
                        <FileText className="h-4 w-4 mr-1" /> Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail & Action Modal */}
      {selectedKrs && (
        <Dialog open={!!selectedKrs} onOpenChange={(open) => !open && setSelectedKrs(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detail Pengajuan KRS</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nama Mahasiswa</p>
                <p className="font-semibold">{selectedKrs.profiles?.full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">NIM</p>
                <p className="font-semibold">{selectedKrs.profiles?.nim || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Semester</p>
                <p className="font-semibold">{selectedKrs.semesters?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Batas Maksimal SKS</p>
                <p className="font-semibold">{selectedKrs.semesters?.max_sks || 24}</p>
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Mata Kuliah</TableHead>
                    <TableHead className="text-right">SKS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedKrs.krs_items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.courses?.code}</TableCell>
                      <TableCell>{item.courses?.name}</TableCell>
                      <TableCell className="text-right">{item.courses?.sks}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2} className="text-right">Total SKS</TableCell>
                    <TableCell className="text-right">
                      <span className={selectedKrs.total_sks > (selectedKrs.semesters?.max_sks || 24) ? "text-red-500" : "text-primary"}>
                        {selectedKrs.total_sks}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {selectedKrs.status === 'pending' && (
              <DialogFooter className="mt-4 gap-2 sm:gap-0">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setRejectDialog(true);
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> Tolak & Kembalikan
                </Button>
                <Button 
                  onClick={() => approveMutation.mutate(selectedKrs)}
                  disabled={approveMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" /> Setujui KRS
                </Button>
              </DialogFooter>
            )}

            {selectedKrs.status === 'approved' && (
              <DialogFooter className="mt-4">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setRejectDialog(true);
                  }}
                >
                  <AlertCircle className="h-4 w-4 mr-1" /> Batalkan Persetujuan (Reset)
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Notes Modal */}
      {rejectDialog && (
        <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tolak KRS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Catatan / Alasan Penolakan (Wajib)</label>
                <Textarea 
                  placeholder="Misal: SKS terlalu banyak, kurangi mata kuliah pilihan..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(false)}>Batal</Button>
              <Button 
                variant="destructive" 
                disabled={!rejectNotes.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: selectedKrs?.id, notes: rejectNotes })}
              >
                Kirim Penolakan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
