import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiTableRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { 
  BulkSelectProvider, 
  BulkSelectCheckbox, 
  BulkSelectAllCheckbox, 
  BulkActionBar,
  useBulkSelect 
} from '@/components/ui/bulk-select-table';
import { KurikulumImportExport } from '@/components/kurikulum/KurikulumImportExport';
import { KurikulumFilter } from '@/components/kurikulum/KurikulumFilter';
import { TableSortHeader, SortConfig, sortData } from '@/components/ui/table-sort-header';

type VmtsPtVisi = { id: string; visi: string };
type VmtsPtMisi = { id: string; code: string; misi: string };
type VmtsPtTujuan = { id: string; code: string; tujuan: string };
type VmtsPtStrategi = { id: string; code: string; strategi: string };
type VmtsPsVisi = { id: string; visi: string };
type VmtsPsMisi = { id: string; code: string; misi: string };
type VmtsPsTujuan = { id: string; code: string; tujuan: string };
type VmtsPsStrategi = { id: string; code: string; strategi: string };
type ProfilLulusan = { id: string; code: string; profil: string; deskripsi: string | null };
type BahanKajianKelompok = { id: string; kelompok: string; bahan_kajian: string };

function KurikulumContent() {
  const { profile, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  // Admin and sub_admin can edit curriculum
  const canEdit = hasAnyRole(['admin', 'sub_admin']);
  const { clearSelection } = useBulkSelect();

  // Filter states
  const [filterPtMisi, setFilterPtMisi] = useState('');
  const [filterPtTujuan, setFilterPtTujuan] = useState('');
  const [filterPtStrategi, setFilterPtStrategi] = useState('');
  const [filterPsMisi, setFilterPsMisi] = useState('');
  const [filterPsTujuan, setFilterPsTujuan] = useState('');
  const [filterPsStrategi, setFilterPsStrategi] = useState('');
  const [filterProfilLulusan, setFilterProfilLulusan] = useState('');
  const [filterCpl, setFilterCpl] = useState('');
  const [filterBk, setFilterBk] = useState('');
  const [filterMk, setFilterMk] = useState('');
  
  // Sort states for each table
  const [sortPtMisi, setSortPtMisi] = useState<SortConfig | null>(null);
  const [sortPtTujuan, setSortPtTujuan] = useState<SortConfig | null>(null);
  const [sortPtStrategi, setSortPtStrategi] = useState<SortConfig | null>(null);
  const [sortPsMisi, setSortPsMisi] = useState<SortConfig | null>(null);
  const [sortPsTujuan, setSortPsTujuan] = useState<SortConfig | null>(null);
  const [sortPsStrategi, setSortPsStrategi] = useState<SortConfig | null>(null);
  const [sortProfilLulusan, setSortProfilLulusan] = useState<SortConfig | null>(null);
  const [sortCpl, setSortCpl] = useState<SortConfig | null>(null);
  const [sortBk, setSortBk] = useState<SortConfig | null>(null);
  const [sortMk, setSortMk] = useState<SortConfig | null>(null);

  // Enable realtime for curriculum-related tables
  useMultiTableRealtimeSubscription([
    { table: 'plos', queryKeys: [['plos'], ['plo-data']] },
    { table: 'clos', queryKeys: [['clos'], ['course-clos']] },
    { table: 'llos', queryKeys: [['llos'], ['clo-llos']] },
    { table: 'curricula', queryKeys: [['curricula']] },
  ]);

  // State for dialogs
  const [editDialog, setEditDialog] = useState<{ type: string; data: any; isNew: boolean } | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Fetch all data
  const { data: ptVisi } = useQuery({
    queryKey: ['vmts_pt_visi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_pt_visi').select('*').limit(1);
      return data?.[0] as VmtsPtVisi | undefined;
    },
  });

  const { data: ptMisi = [] } = useQuery({
    queryKey: ['vmts_pt_misi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_pt_misi').select('*').order('code');
      return data as VmtsPtMisi[];
    },
  });

  const { data: ptTujuan = [] } = useQuery({
    queryKey: ['vmts_pt_tujuan'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_pt_tujuan').select('*').order('code');
      return data as VmtsPtTujuan[];
    },
  });

  const { data: ptStrategi = [] } = useQuery({
    queryKey: ['vmts_pt_strategi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_pt_strategi').select('*').order('code');
      return data as VmtsPtStrategi[];
    },
  });

  const { data: psVisi } = useQuery({
    queryKey: ['vmts_ps_visi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_ps_visi').select('*').limit(1);
      return data?.[0] as VmtsPsVisi | undefined;
    },
  });

  const { data: psMisi = [] } = useQuery({
    queryKey: ['vmts_ps_misi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_ps_misi').select('*').order('code');
      return data as VmtsPsMisi[];
    },
  });

  const { data: psTujuan = [] } = useQuery({
    queryKey: ['vmts_ps_tujuan'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_ps_tujuan').select('*').order('code');
      return data as VmtsPsTujuan[];
    },
  });

  const { data: psStrategi = [] } = useQuery({
    queryKey: ['vmts_ps_strategi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_ps_strategi').select('*').order('code');
      return data as VmtsPsStrategi[];
    },
  });

  const { data: profilLulusan = [] } = useQuery({
    queryKey: ['profil_lulusan'],
    queryFn: async () => {
      const { data } = await supabase.from('profil_lulusan').select('*').order('code');
      return data as ProfilLulusan[];
    },
  });

  const { data: bahanKajianKelompok = [] } = useQuery({
    queryKey: ['bahan_kajian_kelompok'],
    queryFn: async () => {
      const { data } = await supabase.from('bahan_kajian_kelompok').select('*').order('kelompok');
      return data as BahanKajianKelompok[];
    },
  });

  const { data: plos = [] } = useQuery({
    queryKey: ['plos'],
    queryFn: async () => {
      const { data } = await supabase.from('plos').select('*, profil_lulusan:profil_lulusan_id(*), plo_profil_lulusan(profil_lulusan_id, profil_lulusan:profil_lulusan_id(*))').order('code');
      return data || [];
    },
  });

  const { data: ploPls = [] } = useQuery({
    queryKey: ['plo_profil_lulusan'],
    queryFn: async () => {
      const { data } = await supabase.from('plo_profil_lulusan').select('*');
      return data || [];
    },
  });

  const { data: curricula = [] } = useQuery({
    queryKey: ['curricula'],
    queryFn: async () => {
      const { data } = await supabase.from('curricula').select('*').order('name');
      return data || [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses_kurikulum'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, curricula:curriculum_id(*), course_plos(plo_id, plos(*)), course_profil_lulusan(profil_lulusan_id, profil_lulusan:profil_lulusan_id(*))').order('code');
      return data || [];
    },
  });

  const { data: llos = [] } = useQuery({
    queryKey: ['llos_bahan_kajian'],
    queryFn: async () => {
      const { data } = await supabase.from('llos').select('*, clos(course_id)');
      return data || [];
    },
  });

  // Generic mutation for all tables
  const saveMutation = useMutation({
    mutationFn: async ({ table, data, isNew, id }: { table: string; data: Record<string, any>; isNew: boolean; id?: string }) => {
      if (isNew) {
        const { error } = await supabase.from(table as any).insert(data);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).update(data).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Data berhasil disimpan');
      setEditDialog(null);
    },
    onError: (error: any) => {
      toast.error('Gagal menyimpan data: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase.from(table as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Data berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error('Gagal menghapus data: ' + error.message);
    },
  });

  // Bulk delete function
  const handleBulkDelete = async (table: string, ids: string[]) => {
    const { error } = await supabase.from(table as any).delete().in('id', ids);
    if (error) throw error;
    queryClient.invalidateQueries();
    clearSelection();
    toast.success(`${ids.length} data berhasil dihapus`);
  };

  const openEdit = (type: string, data: any, isNew: boolean) => {
    setFormData(data || {});
    setEditDialog({ type, data, isNew });
  };

  const handleSave = () => {
    if (!editDialog) return;
    const { type, isNew, data } = editDialog;
    saveMutation.mutate({ table: type, data: formData, isNew, id: data?.id });
  };

  const handleDelete = (table: string, id: string) => {
    if (confirm('Yakin ingin menghapus data ini?')) {
      deleteMutation.mutate({ table, id });
    }
  };

  // Update PLO mutation
  const updatePloMutation = useMutation({
    mutationFn: async ({ id, profil_lulusan_id }: { id: string; profil_lulusan_id: string | null }) => {
      const { error } = await supabase.from('plos').update({ profil_lulusan_id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plos'] });
      toast.success('CPL berhasil diupdate');
      setEditDialog(null);
    },
    onError: (error: any) => {
      toast.error('Gagal mengupdate CPL: ' + error.message);
    },
  });

  // Update Course PLO mutation
  const updateCoursePloPl = useMutation({
    mutationFn: async ({ courseId, ploIds }: { courseId: string; ploIds: string[] }) => {
      // First delete existing
      await supabase.from('course_plos').delete().eq('course_id', courseId);
      // Then insert new
      if (ploIds.length > 0) {
        const inserts = ploIds.map(plo_id => ({ course_id: courseId, plo_id }));
        const { error } = await supabase.from('course_plos').insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses_kurikulum'] });
      toast.success('CPL/PLO berhasil diupdate');
      setEditDialog(null);
    },
    onError: (error: any) => {
      toast.error('Gagal mengupdate CPL/PLO: ' + error.message);
    },
  });

  const renderCodeTable = (
    title: string,
    data: { id: string; code: string; [key: string]: any }[],
    table: string,
    valueKey: string,
    valueLabel: string,
    filterValue: string,
    onFilterChange: (value: string) => void,
    sortConfig: SortConfig | null,
    onSortChange: (config: SortConfig) => void
  ) => {
    // Filter data
    let filteredData = data.filter(item => {
      const searchLower = filterValue.toLowerCase();
      return (
        item.code?.toLowerCase().includes(searchLower) ||
        item[valueKey]?.toLowerCase().includes(searchLower)
      );
    });
    
    // Apply sorting
    filteredData = sortData(filteredData, sortConfig, (item, key) => {
      switch (key) {
        case 'code': return item.code;
        case 'value': return item[valueKey];
        default: return null;
      }
    });
    
    const ids = filteredData.map(item => item.id);
    
    const tableConfig = {
      tableName: table,
      displayName: title,
      columns: [
        { key: 'code', label: 'Kode', required: true },
        { key: valueKey, label: valueLabel, required: true },
      ],
      queryKey: table,
    };
    
    return (
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <KurikulumFilter 
              searchTerm={filterValue} 
              onSearchChange={onFilterChange}
              placeholder={`Cari ${title.toLowerCase()}...`}
            />
            {canEdit && (
              <>
                <KurikulumImportExport tableConfig={tableConfig} data={data} />
                <Button size="sm" onClick={() => openEdit(table, { code: '', [valueKey]: '' }, true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground w-16">No</TableHead>
                <TableHead className="text-primary-foreground w-24">
                  <TableSortHeader
                    sortKey="code"
                    currentSort={sortConfig}
                    onSort={onSortChange}
                    sortType="text"
                  >
                    Kode
                  </TableSortHeader>
                </TableHead>
                <TableHead className="text-primary-foreground">
                  <TableSortHeader
                    sortKey="value"
                    currentSort={sortConfig}
                    onSort={onSortChange}
                    sortType="text"
                  >
                    {valueLabel}
                  </TableSortHeader>
                </TableHead>
                {canEdit && <TableHead className="text-primary-foreground w-24">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((item, idx) => (
                  <TableRow key={item.id}>
                    {canEdit && (
                      <TableCell>
                        <BulkSelectCheckbox id={item.id} />
                      </TableCell>
                    )}
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item[valueKey]}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(table, item, false)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(table, item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 3} className="text-center text-muted-foreground">
                    {filterValue ? 'Tidak ada data yang cocok' : 'Belum ada data'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {canEdit && <BulkActionBar onDelete={(ids) => handleBulkDelete(table, ids)} itemName="data" />}
        </CardContent>
      </Card>
    );
  };

  const renderProfilLulusanTable = () => {
    // Filter data
    const filteredProfilLulusan = profilLulusan.filter(item => {
      const searchLower = filterProfilLulusan.toLowerCase();
      return (
        item.code?.toLowerCase().includes(searchLower) ||
        item.profil?.toLowerCase().includes(searchLower) ||
        item.deskripsi?.toLowerCase().includes(searchLower)
      );
    });
    
    const ids = filteredProfilLulusan.map(item => item.id);
    
    const tableConfig = {
      tableName: 'profil_lulusan',
      displayName: 'Profil Lulusan',
      columns: [
        { key: 'code', label: 'Kode', required: true },
        { key: 'profil', label: 'Profil', required: true },
        { key: 'deskripsi', label: 'Deskripsi', required: false },
      ],
      queryKey: 'profil_lulusan',
    };
    
    return (
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">PL - Profil Lulusan</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <KurikulumFilter 
              searchTerm={filterProfilLulusan} 
              onSearchChange={setFilterProfilLulusan}
              placeholder="Cari profil lulusan..."
            />
            {canEdit && (
              <>
                <KurikulumImportExport tableConfig={tableConfig} data={profilLulusan} />
                <Button size="sm" onClick={() => openEdit('profil_lulusan', { code: '', profil: '', deskripsi: '' }, true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground w-16">No</TableHead>
                <TableHead className="text-primary-foreground w-24">Kode</TableHead>
                <TableHead className="text-primary-foreground">Profil Lulusan</TableHead>
                <TableHead className="text-primary-foreground">Deskripsi</TableHead>
                {canEdit && <TableHead className="text-primary-foreground w-24">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfilLulusan.length > 0 ? (
                filteredProfilLulusan.map((item, idx) => (
                  <TableRow key={item.id}>
                    {canEdit && (
                      <TableCell>
                        <BulkSelectCheckbox id={item.id} />
                      </TableCell>
                    )}
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.profil}</TableCell>
                    <TableCell>{item.deskripsi || '-'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit('profil_lulusan', item, false)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete('profil_lulusan', item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 4} className="text-center text-muted-foreground">
                    {filterProfilLulusan ? 'Tidak ada data yang cocok' : 'Belum ada data'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {canEdit && <BulkActionBar onDelete={(ids) => handleBulkDelete('profil_lulusan', ids)} itemName="profil lulusan" />}
        </CardContent>
      </Card>
    );
  };

  const renderCplTable = () => {
    // Filter data
    const filteredPlos = plos.filter((item: any) => {
      const searchLower = filterCpl.toLowerCase();
      return (
        item.code?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    });
    
    const ids = filteredPlos.map((item: any) => item.id);
    
    const tableConfig = {
      tableName: 'plos',
      displayName: 'CPL',
      columns: [
        { key: 'code', label: 'Kode', required: true },
        { key: 'description', label: 'Deskripsi CPL', required: true },
      ],
      queryKey: 'plos',
    };
    
    return (
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">CPL - Capaian Pembelajaran Lulusan</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <KurikulumFilter 
              searchTerm={filterCpl} 
              onSearchChange={setFilterCpl}
              placeholder="Cari CPL..."
            />
            {canEdit && (
              <>
                <KurikulumImportExport tableConfig={tableConfig} data={plos} />
                <Button size="sm" onClick={() => openEdit('plos', { code: '', description: '', profil_lulusan_ids: [] }, true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground w-16">No</TableHead>
                <TableHead className="text-primary-foreground w-24">Kode</TableHead>
                <TableHead className="text-primary-foreground">CPL</TableHead>
                <TableHead className="text-primary-foreground">PL</TableHead>
                {canEdit && <TableHead className="text-primary-foreground w-24">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlos.length > 0 ? (
                filteredPlos.map((item: any, idx: number) => {
                  const itemPls = item.plo_profil_lulusan?.map((ppl: any) => ppl.profil_lulusan).filter(Boolean) || [];
                  return (
                    <TableRow key={item.id}>
                      {canEdit && (
                        <TableCell>
                          <BulkSelectCheckbox id={item.id} />
                        </TableCell>
                      )}
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help font-medium">{item.code}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>{item.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        {itemPls.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {itemPls.map((pl: any, i: number) => (
                              <TooltipProvider key={i}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help bg-muted px-1.5 py-0.5 rounded text-xs">{pl.code}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>{pl.profil}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        ) : '-'}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit('plos', { 
                                id: item.id, 
                                code: item.code, 
                                description: item.description, 
                                profil_lulusan_ids: item.plo_profil_lulusan?.map((ppl: any) => ppl.profil_lulusan_id) || []
                              }, false)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete('plos', item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 4} className="text-center text-muted-foreground">
                    {filterCpl ? 'Tidak ada data yang cocok' : 'Belum ada data'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {canEdit && <BulkActionBar onDelete={(ids) => handleBulkDelete('plos', ids)} itemName="CPL" />}
        </CardContent>
      </Card>
    );
  };

  // State for Bahan Kajian dialog
  const [bkDialog, setBkDialog] = useState(false);
  const [selectedCourseForBk, setSelectedCourseForBk] = useState<string>('');
  const [selectedBahanKajian, setSelectedBahanKajian] = useState<string[]>([]);
  const [bkKelompok, setBkKelompok] = useState('');
  const [editingBk, setEditingBk] = useState<BahanKajianKelompok | null>(null);

  // Get LLOs for selected course
  const llosForSelectedCourse = selectedCourseForBk
    ? llos.filter((llo: any) => {
        const cloData = llo.clos;
        return cloData && cloData.course_id === selectedCourseForBk;
      })
    : [];

  // Get all unique bahan_kajian from LLOs
  const availableBahanKajian = llosForSelectedCourse.flatMap((llo: any) => llo.bahan_kajian || []).filter(Boolean);

  const resetBkForm = () => {
    setBkDialog(false);
    setSelectedCourseForBk('');
    setSelectedBahanKajian([]);
    setBkKelompok('');
    setEditingBk(null);
  };

  const handleSaveBk = () => {
    if (!bkKelompok || selectedBahanKajian.length === 0) return;
    
    const bahanKajianStr = selectedBahanKajian.join(', ');
    
    if (editingBk) {
      saveMutation.mutate({ 
        table: 'bahan_kajian_kelompok', 
        data: { kelompok: bkKelompok, bahan_kajian: bahanKajianStr }, 
        isNew: false, 
        id: editingBk.id 
      });
    } else {
      saveMutation.mutate({ 
        table: 'bahan_kajian_kelompok', 
        data: { kelompok: bkKelompok, bahan_kajian: bahanKajianStr }, 
        isNew: true 
      });
    }
    resetBkForm();
  };

  const openEditBk = (item: BahanKajianKelompok) => {
    setEditingBk(item);
    setBkKelompok(item.kelompok);
    setSelectedBahanKajian(item.bahan_kajian.split(', ').map(s => s.trim()));
    setBkDialog(true);
  };

  const renderBahanKajianTable = () => {
    // Filter data
    const filteredBk = bahanKajianKelompok.filter(item => {
      const searchLower = filterBk.toLowerCase();
      return (
        item.kelompok?.toLowerCase().includes(searchLower) ||
        item.bahan_kajian?.toLowerCase().includes(searchLower)
      );
    });
    
    const ids = filteredBk.map(item => item.id);
    
    const tableConfig = {
      tableName: 'bahan_kajian_kelompok',
      displayName: 'Bahan Kajian',
      columns: [
        { key: 'kelompok', label: 'Kelompok BK', required: true },
        { key: 'bahan_kajian', label: 'Bahan Kajian', required: true },
      ],
      queryKey: 'bahan_kajian_kelompok',
    };
    
    return (
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">BK - Bahan Kajian</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <KurikulumFilter 
              searchTerm={filterBk} 
              onSearchChange={setFilterBk}
              placeholder="Cari bahan kajian..."
            />
            {canEdit && (
              <>
                <KurikulumImportExport tableConfig={tableConfig} data={bahanKajianKelompok} />
                <Button size="sm" onClick={() => setBkDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground w-16">No</TableHead>
                <TableHead className="text-primary-foreground">Kelompok BK</TableHead>
                <TableHead className="text-primary-foreground">Bahan Kajian</TableHead>
                {canEdit && <TableHead className="text-primary-foreground w-24">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBk.length > 0 ? (
                filteredBk.map((item, idx) => (
                  <TableRow key={item.id}>
                    {canEdit && (
                      <TableCell>
                        <BulkSelectCheckbox id={item.id} />
                      </TableCell>
                    )}
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{item.kelompok}</TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside space-y-1">
                        {item.bahan_kajian.split(', ').map((bk, i) => (
                          <li key={i} className="text-sm">{bk.trim()}</li>
                        ))}
                      </ul>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditBk(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete('bahan_kajian_kelompok', item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 3} className="text-center text-muted-foreground">
                    {filterBk ? 'Tidak ada data yang cocok' : 'Belum ada data'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {canEdit && <BulkActionBar onDelete={(ids) => handleBulkDelete('bahan_kajian_kelompok', ids)} itemName="bahan kajian" />}

          {/* Bahan Kajian Dialog */}
          <Dialog open={bkDialog} onOpenChange={(open) => { if (!open) resetBkForm(); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingBk ? 'Edit Bahan Kajian' : 'Tambah Bahan Kajian'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Kelompok BK</label>
                  <Input 
                    value={bkKelompok} 
                    onChange={(e) => setBkKelompok(e.target.value)} 
                    placeholder="Contoh: Kelompok A"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Pilih Mata Kuliah</label>
                  <Select value={selectedCourseForBk} onValueChange={setSelectedCourseForBk}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih mata kuliah..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course: any) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCourseForBk && (
                  <div>
                    <label className="text-sm font-medium">Pilih Bahan Kajian dari SUB-CPMK/LLO</label>
                    {availableBahanKajian.length > 0 ? (
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 mt-2">
                        {[...new Set(availableBahanKajian)].map((bk: string, idx: number) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`bk-${idx}`}
                              checked={selectedBahanKajian.includes(bk)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBahanKajian([...selectedBahanKajian, bk]);
                                } else {
                                  setSelectedBahanKajian(selectedBahanKajian.filter(s => s !== bk));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor={`bk-${idx}`} className="text-sm cursor-pointer flex-1">
                              {bk}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">
                        Tidak ada bahan kajian pada mata kuliah ini. Silakan tambahkan bahan kajian di SUB-CPMK/LLO mata kuliah.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetBkForm}>Batal</Button>
                <Button onClick={handleSaveBk} disabled={!bkKelompok || selectedBahanKajian.length === 0}>
                  {editingBk ? 'Simpan' : 'Tambah'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  };

  const semesterOptions = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

  const renderMataKuliahTable = () => {
    // Filter data
    const filteredCourses = courses.filter((course: any) => {
      const searchLower = filterMk.toLowerCase();
      return (
        course.code?.toLowerCase().includes(searchLower) ||
        course.name?.toLowerCase().includes(searchLower) ||
        course.semester?.toLowerCase().includes(searchLower)
      );
    });
    
    const ids = filteredCourses.map((course: any) => course.id);
    
    const tableConfig = {
      tableName: 'courses',
      displayName: 'Mata Kuliah',
      columns: [
        { key: 'code', label: 'Kode', required: true },
        { key: 'name', label: 'Nama', required: true },
        { key: 'semester', label: 'Semester', required: false },
      ],
      queryKey: 'courses_kurikulum',
    };
    
    return (
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">MK - Mata Kuliah</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <KurikulumFilter 
              searchTerm={filterMk} 
              onSearchChange={setFilterMk}
              placeholder="Cari mata kuliah..."
            />
            {canEdit && (
              <>
                <KurikulumImportExport tableConfig={tableConfig} data={courses} />
                <Button size="sm" onClick={() => openEdit('courses', { code: '', name: '', semester: '', curriculum_id: '', passing_score: '60', ploIds: [], plIds: [] }, true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground w-16">No</TableHead>
                <TableHead className="text-primary-foreground w-24">Kode</TableHead>
                <TableHead className="text-primary-foreground">Nama</TableHead>
                <TableHead className="text-primary-foreground">Kurikulum</TableHead>
                <TableHead className="text-primary-foreground">Semester</TableHead>
                <TableHead className="text-primary-foreground">CPL/PLO</TableHead>
                <TableHead className="text-primary-foreground">PL</TableHead>
                {canEdit && <TableHead className="text-primary-foreground w-24">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course: any, idx: number) => {
                  const coursePlos = course.course_plos?.map((cp: any) => cp.plos) || [];
                  const cplCodes = coursePlos.map((p: any) => p?.code).filter(Boolean);
                  const coursePls = course.course_profil_lulusan?.map((cpl: any) => cpl.profil_lulusan) || [];
                  
                  return (
                    <TableRow key={course.id}>
                      {canEdit && (
                        <TableCell>
                          <BulkSelectCheckbox id={course.id} />
                        </TableCell>
                      )}
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help font-medium">{course.code}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>{course.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <a href={`/mata-kuliah/${course.id}`} className="hover:text-primary hover:underline transition-colors">
                          {course.name}
                        </a>
                      </TableCell>
                      <TableCell>{course.curricula?.name || '-'}</TableCell>
                      <TableCell>{course.semester || '-'}</TableCell>
                      <TableCell>
                        {cplCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cplCodes.map((code: string, i: number) => {
                              const plo = plos.find((p: any) => p.code === code);
                              return (
                                <TooltipProvider key={i}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help bg-muted px-1.5 py-0.5 rounded text-xs">{code}</span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <p>{plo?.description || code}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {coursePls.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {coursePls.map((pl: any, i: number) => (
                              <TooltipProvider key={i}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help bg-muted px-1.5 py-0.5 rounded text-xs">{pl?.code}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>{pl?.profil || pl?.code}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        ) : '-'}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const existingPlIds = course.course_profil_lulusan?.map((cpl: any) => cpl.profil_lulusan_id) || [];
                                openEdit('courses', {
                                  id: course.id,
                                  code: course.code,
                                  name: course.name,
                                  semester: course.semester || '',
                                  curriculum_id: course.curriculum_id || '',
                                  passing_score: course.passing_score?.toString() || '60',
                                  ploIds: course.course_plos?.map((cp: any) => cp.plo_id) || [],
                                  plIds: existingPlIds,
                                }, false);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete('courses', course.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 9 : 7} className="text-center text-muted-foreground">
                    Belum ada data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {canEdit && <BulkActionBar onDelete={(ids) => handleBulkDelete('courses', ids)} itemName="mata kuliah" />}
        </CardContent>
      </Card>
    );
  };

  const renderEditDialog = () => {
    if (!editDialog) return null;
    const { type, isNew, data } = editDialog;

    // PLO specific dialog with PL multi-select
    if (type === 'plos') {
      const selectedPlIds = (formData.profil_lulusan_ids as unknown as string[]) || [];
      return (
        <Dialog open onOpenChange={() => setEditDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{isNew ? 'Tambah' : 'Edit'} CPL</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Kode CPL</label>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="CPL-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Deskripsi CPL</label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi CPL"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Profil Lulusan (PL) - Multi-select</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 mt-1">
                  {profilLulusan.map((pl) => {
                    return (
                      <label key={pl.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPlIds.includes(pl.id)}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...selectedPlIds, pl.id]
                              : selectedPlIds.filter((id) => id !== pl.id);
                            setFormData({ ...formData, profil_lulusan_ids: newIds as any });
                          }}
                        />
                        <span className="text-sm">{pl.code} - {pl.profil}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(null)}>
                Batal
              </Button>
              <Button 
                onClick={async () => {
                  const { id, code, description, profil_lulusan_ids } = formData;
                  const plIds = (profil_lulusan_ids as unknown as string[]) || [];
                  
                  if (isNew) {
                    const { data: newPlo, error: ploError } = await supabase
                      .from('plos')
                      .insert({ code, description })
                      .select()
                      .single();
                    
                    if (ploError) {
                      toast.error('Gagal menyimpan CPL: ' + ploError.message);
                      return;
                    }
                    
                    if (plIds.length > 0) {
                      const plRelations = plIds.map(plId => ({
                        plo_id: newPlo.id,
                        profil_lulusan_id: plId
                      }));
                      await supabase.from('plo_profil_lulusan').insert(plRelations);
                    }
                  } else {
                    const { error: ploError } = await supabase
                      .from('plos')
                      .update({ code, description })
                      .eq('id', id);
                    
                    if (ploError) {
                      toast.error('Gagal menyimpan CPL: ' + ploError.message);
                      return;
                    }
                    
                    await supabase.from('plo_profil_lulusan').delete().eq('plo_id', id);
                    if (plIds.length > 0) {
                      const plRelations = plIds.map(plId => ({
                        plo_id: id,
                        profil_lulusan_id: plId
                      }));
                      await supabase.from('plo_profil_lulusan').insert(plRelations);
                    }
                  }
                  
                  queryClient.invalidateQueries({ queryKey: ['plos'] });
                  queryClient.invalidateQueries({ queryKey: ['plo_profil_lulusan'] });
                  toast.success('Data berhasil disimpan');
                  setEditDialog(null);
                }}
                disabled={!formData.code || !formData.description}
              >
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    // Courses Dialog
    if (type === 'courses') {
      const selectedPloIds = (formData.ploIds as unknown as string[]) || [];
      return (
        <Dialog open onOpenChange={() => setEditDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{isNew ? 'Tambah' : 'Edit'} Mata Kuliah</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Kode</label>
                  <Input
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="PBA101"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Semester</label>
                  <Select
                    value={formData.semester || ''}
                    onValueChange={(v) => setFormData({ ...formData, semester: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesterOptions.map(sem => (
                        <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Nama Mata Kuliah</label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama mata kuliah"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kurikulum</label>
                <Select
                  value={formData.curriculum_id || '__none__'}
                  onValueChange={(v) => setFormData({ ...formData, curriculum_id: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kurikulum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tidak ada</SelectItem>
                    {curricula.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">CPL/PLO Terkait</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                  {plos.map((plo: any) => (
                    <label key={plo.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPloIds.includes(plo.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...selectedPloIds, plo.id]
                            : selectedPloIds.filter((id) => id !== plo.id);
                          setFormData({ ...formData, ploIds: newIds as any });
                        }}
                      />
                      <span className="text-sm">{plo.code} - {plo.description}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">PL - Profil Lulusan (Multi-select)</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                  {profilLulusan.map((pl) => {
                    const selectedPlIds = (formData.plIds as unknown as string[]) || [];
                    return (
                      <label key={pl.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPlIds.includes(pl.id)}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...selectedPlIds, pl.id]
                              : selectedPlIds.filter((id) => id !== pl.id);
                            setFormData({ ...formData, plIds: newIds as any });
                          }}
                        />
                        <span className="text-sm">{pl.code} - {pl.profil}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(null)}>
                Batal
              </Button>
              <Button 
                onClick={async () => {
                  const { id, code, name, semester, curriculum_id, passing_score } = formData;
                  if (isNew) {
                    const { data: newCourse, error } = await supabase
                      .from('courses')
                      .insert({ 
                        code, 
                        name, 
                        semester: semester || null, 
                        curriculum_id: curriculum_id || null,
                        passing_score: parseInt(passing_score) || 60
                      })
                      .select()
                      .single();
                    
                    if (error) {
                      toast.error('Gagal membuat mata kuliah: ' + error.message);
                      return;
                    }
                    
                    if (selectedPloIds.length > 0) {
                      const inserts = selectedPloIds.map(plo_id => ({ course_id: newCourse.id, plo_id }));
                      await supabase.from('course_plos').insert(inserts);
                    }
                    
                    const selectedPlIdsList = (formData.plIds as unknown as string[]) || [];
                    if (selectedPlIdsList.length > 0) {
                      const plInserts = selectedPlIdsList.map(profil_lulusan_id => ({ course_id: newCourse.id, profil_lulusan_id }));
                      await supabase.from('course_profil_lulusan').insert(plInserts);
                    }
                    
                    queryClient.invalidateQueries();
                    toast.success('Mata kuliah berhasil ditambahkan');
                    setEditDialog(null);
                  } else {
                    const { error } = await supabase
                      .from('courses')
                      .update({ 
                        code, 
                        name, 
                        semester: semester || null, 
                        curriculum_id: curriculum_id || null,
                        passing_score: parseInt(passing_score) || 60
                      })
                      .eq('id', id);
                    
                    if (error) {
                      toast.error('Gagal mengupdate mata kuliah: ' + error.message);
                      return;
                    }
                    
                    await supabase.from('course_plos').delete().eq('course_id', id);
                    if (selectedPloIds.length > 0) {
                      const inserts = selectedPloIds.map(plo_id => ({ course_id: id, plo_id }));
                      await supabase.from('course_plos').insert(inserts);
                    }
                    
                    const selectedPlIdsList = (formData.plIds as unknown as string[]) || [];
                    await supabase.from('course_profil_lulusan').delete().eq('course_id', id);
                    if (selectedPlIdsList.length > 0) {
                      const plInserts = selectedPlIdsList.map(profil_lulusan_id => ({ course_id: id, profil_lulusan_id }));
                      await supabase.from('course_profil_lulusan').insert(plInserts);
                    }
                    
                    queryClient.invalidateQueries();
                    toast.success('Mata kuliah berhasil diupdate');
                    setEditDialog(null);
                  }
                }}
                disabled={!formData.code || !formData.name}
              >
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    if (type === 'cpl_pl') {
      return (
        <Dialog open onOpenChange={() => setEditDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit CPL - Profil Lulusan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Profil Lulusan (PL)</label>
                <Select
                  value={formData.profil_lulusan_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, profil_lulusan_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Profil Lulusan" />
                  </SelectTrigger>
                  <SelectContent>
                    {profilLulusan.map((pl) => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.code} - {pl.profil}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(null)}>
                Batal
              </Button>
              <Button onClick={() => updatePloMutation.mutate({ id: formData.id, profil_lulusan_id: formData.profil_lulusan_id || null })}>
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    if (type === 'course_plo_pl') {
      const selectedPloIds = (formData.ploIds as unknown as string[]) || [];
      return (
        <Dialog open onOpenChange={() => setEditDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit CPL/PLO Mata Kuliah</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">CPL/PLO</label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                  {plos.map((plo: any) => (
                    <label key={plo.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPloIds.includes(plo.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...selectedPloIds, plo.id]
                            : selectedPloIds.filter((id) => id !== plo.id);
                          setFormData({ ...formData, ploIds: newIds as any });
                        }}
                      />
                      <span>{plo.code} - {plo.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(null)}>
                Batal
              </Button>
              <Button onClick={() => updateCoursePloPl.mutate({ courseId: formData.id, ploIds: selectedPloIds })}>
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    // Generic edit dialog for other types
    const fieldConfig: Record<string, { fields: { key: string; label: string; type: 'input' | 'textarea' }[] }> = {
      vmts_pt_visi: { fields: [{ key: 'visi', label: 'Visi PT', type: 'textarea' }] },
      vmts_pt_misi: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'misi', label: 'Misi PT', type: 'textarea' }] },
      vmts_pt_tujuan: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'tujuan', label: 'Tujuan PT', type: 'textarea' }] },
      vmts_pt_strategi: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'strategi', label: 'Strategi PT', type: 'textarea' }] },
      vmts_ps_visi: { fields: [{ key: 'visi', label: 'Visi Keilmuan PS', type: 'textarea' }] },
      vmts_ps_misi: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'misi', label: 'Misi PS', type: 'textarea' }] },
      vmts_ps_tujuan: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'tujuan', label: 'Tujuan PS', type: 'textarea' }] },
      vmts_ps_strategi: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'strategi', label: 'Strategi PS', type: 'textarea' }] },
      profil_lulusan: {
        fields: [
          { key: 'code', label: 'Kode', type: 'input' },
          { key: 'profil', label: 'Profil Lulusan', type: 'textarea' },
          { key: 'deskripsi', label: 'Deskripsi', type: 'textarea' },
        ],
      },
      bahan_kajian_kelompok: {
        fields: [
          { key: 'kelompok', label: 'Kelompok BK', type: 'input' },
          { key: 'bahan_kajian', label: 'Bahan Kajian', type: 'textarea' },
        ],
      },
    };

    const config = fieldConfig[type];
    if (!config) return null;

    return (
      <Dialog open onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? 'Tambah' : 'Edit'} Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {config.fields.map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium">{field.label}</label>
                {field.type === 'textarea' ? (
                  <Textarea
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <Input
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Layout>
      <div className="container py-8 px-4 sm:px-6 lg:px-10 xl:px-16">
        <h1 className="font-display text-3xl font-bold mb-6">Kurikulum</h1>

        <Tabs defaultValue="vmts-pt">
          <TabsList className="grid grid-cols-2 lg:grid-cols-6 w-full mb-6">
            <TabsTrigger value="vmts-pt">VMTS PT</TabsTrigger>
            <TabsTrigger value="vmts-ps">VMTS PS</TabsTrigger>
            <TabsTrigger value="profil-lulusan">PL</TabsTrigger>
            <TabsTrigger value="cpl">CPL</TabsTrigger>
            <TabsTrigger value="bahan-kajian">BK</TabsTrigger>
            <TabsTrigger value="mata-kuliah">MK</TabsTrigger>
          </TabsList>

          <TabsContent value="vmts-pt">
            {renderCodeTable('Misi PT', ptMisi, 'vmts_pt_misi', 'misi', 'Misi Perguruan Tinggi', filterPtMisi, setFilterPtMisi, sortPtMisi, setSortPtMisi)}
            {renderCodeTable('Tujuan PT', ptTujuan, 'vmts_pt_tujuan', 'tujuan', 'Tujuan Perguruan Tinggi', filterPtTujuan, setFilterPtTujuan, sortPtTujuan, setSortPtTujuan)}
            {renderCodeTable('Strategi PT', ptStrategi, 'vmts_pt_strategi', 'strategi', 'Strategi Perguruan Tinggi', filterPtStrategi, setFilterPtStrategi, sortPtStrategi, setSortPtStrategi)}
          </TabsContent>

          <TabsContent value="vmts-ps">
            {renderCodeTable('Misi PS', psMisi, 'vmts_ps_misi', 'misi', 'Misi Program Studi', filterPsMisi, setFilterPsMisi, sortPsMisi, setSortPsMisi)}
            {renderCodeTable('Tujuan PS', psTujuan, 'vmts_ps_tujuan', 'tujuan', 'Tujuan Program Studi', filterPsTujuan, setFilterPsTujuan, sortPsTujuan, setSortPsTujuan)}
            {renderCodeTable('Strategi PS', psStrategi, 'vmts_ps_strategi', 'strategi', 'Strategi Program Studi', filterPsStrategi, setFilterPsStrategi, sortPsStrategi, setSortPsStrategi)}
          </TabsContent>

          <TabsContent value="profil-lulusan">
            {renderProfilLulusanTable()}
          </TabsContent>

          <TabsContent value="cpl">
            {renderCplTable()}
          </TabsContent>

          <TabsContent value="bahan-kajian">
            {renderBahanKajianTable()}
          </TabsContent>

          <TabsContent value="mata-kuliah">
            {renderMataKuliahTable()}
          </TabsContent>
        </Tabs>

        {renderEditDialog()}
      </div>
    </Layout>
  );
}

export default function Kurikulum() {
  return (
    <BulkSelectProvider>
      <KurikulumContent />
    </BulkSelectProvider>
  );
}
