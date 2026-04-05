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

type VmtsVisi = { id: string; visi: string; curriculum_id?: string | null };
type VmtsPtMisi = { id: string; code: string; misi: string };
type VmtsPtTujuan = { id: string; code: string; tujuan: string };
type VmtsPtStrategi = { id: string; code: string; strategi: string };
type VmtsPsMisi = { id: string; code: string; misi: string };
type VmtsPsTujuan = { id: string; code: string; tujuan: string };
type VmtsPsStrategi = { id: string; code: string; strategi: string };
type VmtsUppsMisi = { id: string; code: string; misi: string };
type VmtsUppsTujuan = { id: string; code: string; tujuan: string };
type VmtsUppsStrategi = { id: string; code: string; strategi: string };
type ProfilLulusan = { id: string; code: string; profil: string; deskripsi: string | null };
type BahanKajianKelompok = { id: string; kelompok: string; bahan_kajian: string };

function KurikulumContent() {
  const { profile, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  // Admin and sub_admin can edit curriculum
  const canEdit = hasAnyRole(['admin', 'sub_admin']);
  const { clearSelection } = useBulkSelect();

  // Selected curriculum filter state
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('all');

  // Filter states
  const [filterPtMisi, setFilterPtMisi] = useState('');
  const [filterPtTujuan, setFilterPtTujuan] = useState('');
  const [filterPtStrategi, setFilterPtStrategi] = useState('');
  const [filterPsMisi, setFilterPsMisi] = useState('');
  const [filterPsTujuan, setFilterPsTujuan] = useState('');
  const [filterPsStrategi, setFilterPsStrategi] = useState('');
  const [filterUppsMisi, setFilterUppsMisi] = useState('');
  const [filterUppsTujuan, setFilterUppsTujuan] = useState('');
  const [filterUppsStrategi, setFilterUppsStrategi] = useState('');
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
  const [sortUppsMisi, setSortUppsMisi] = useState<SortConfig | null>(null);
  const [sortUppsTujuan, setSortUppsTujuan] = useState<SortConfig | null>(null);
  const [sortUppsStrategi, setSortUppsStrategi] = useState<SortConfig | null>(null);
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
  const { data: ptVisiList = [] } = useQuery({
    queryKey: ['vmts_pt_visi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_pt_visi').select('*');
      return (data || []) as VmtsVisi[];
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

  const { data: psVisiList = [] } = useQuery({
    queryKey: ['vmts_ps_visi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_ps_visi').select('*');
      return (data || []) as VmtsVisi[];
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

  // VMTS UPPS data
  const { data: uppsVisiList = [] } = useQuery({
    queryKey: ['vmts_upps_visi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_upps_visi' as any).select('*');
      return (data || []) as unknown as VmtsVisi[];
    },
  });

  const { data: uppsMisi = [] } = useQuery({
    queryKey: ['vmts_upps_misi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_upps_misi' as any).select('*').order('code');
      return (data || []) as unknown as VmtsUppsMisi[];
    },
  });

  const { data: uppsTujuan = [] } = useQuery({
    queryKey: ['vmts_upps_tujuan'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_upps_tujuan' as any).select('*').order('code');
      return (data || []) as unknown as VmtsUppsTujuan[];
    },
  });

  const { data: uppsStrategi = [] } = useQuery({
    queryKey: ['vmts_upps_strategi'],
    queryFn: async () => {
      const { data } = await supabase.from('vmts_upps_strategi' as any).select('*').order('code');
      return (data || []) as unknown as VmtsUppsStrategi[];
    },
  });

  // Setting: show VMTS UPPS tab
  const { data: showVmtsUpps = true } = useQuery({
    queryKey: ['app-settings', 'show_vmts_upps'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('setting_value').eq('setting_key', 'show_vmts_upps').single();
      return data?.setting_value !== 'false';
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

  // Get active curriculum IDs for filtering
  const activeCurriculumIds = useMemo(() => 
    curricula.filter((c: any) => c.is_active).map((c: any) => c.id),
    [curricula]
  );

  // Get active curricula for dropdown
  const activeCurricula = useMemo(() => 
    curricula.filter((c: any) => c.is_active),
    [curricula]
  );

  // Determine which curriculum IDs to filter by
  const filterCurriculumIds = useMemo(() => {
    if (selectedCurriculumId === 'all') {
      return activeCurriculumIds;
    }
    return [selectedCurriculumId];
  }, [selectedCurriculumId, activeCurriculumIds]);

  // Helper: filter items by curriculum. When 'all', show items matching active curricula OR without curriculum_id.
  // When specific curriculum selected, only show items with that curriculum_id.
  const filterByCurriculum = (items: any[]) => {
    if (selectedCurriculumId === 'all') {
      return items.filter((item: any) => !item.curriculum_id || activeCurriculumIds.includes(item.curriculum_id));
    }
    return items.filter((item: any) => item.curriculum_id === selectedCurriculumId);
  };

  const findByCurriculum = (items: any[]) => {
    if (selectedCurriculumId === 'all') {
      return items.find((item: any) => !item.curriculum_id || activeCurriculumIds.includes(item.curriculum_id));
    }
    return items.find((item: any) => item.curriculum_id === selectedCurriculumId);
  };

  // Filter courses by selected curriculum
  const filteredCourses = useMemo(() => filterByCurriculum(courses), [courses, selectedCurriculumId, activeCurriculumIds]);

  // Filter VMTS PT data by selected curriculum
  const filteredPtMisi = useMemo(() => filterByCurriculum(ptMisi), [ptMisi, selectedCurriculumId, activeCurriculumIds]);
  const filteredPtTujuan = useMemo(() => filterByCurriculum(ptTujuan), [ptTujuan, selectedCurriculumId, activeCurriculumIds]);
  const filteredPtStrategi = useMemo(() => filterByCurriculum(ptStrategi), [ptStrategi, selectedCurriculumId, activeCurriculumIds]);

  // Filter VMTS PS data by selected curriculum
  const filteredPsMisi = useMemo(() => filterByCurriculum(psMisi), [psMisi, selectedCurriculumId, activeCurriculumIds]);
  const filteredPsTujuan = useMemo(() => filterByCurriculum(psTujuan), [psTujuan, selectedCurriculumId, activeCurriculumIds]);
  const filteredPsStrategi = useMemo(() => filterByCurriculum(psStrategi), [psStrategi, selectedCurriculumId, activeCurriculumIds]);

  // Filter VMTS UPPS data by selected curriculum
  const filteredUppsVisi = useMemo(() => findByCurriculum(uppsVisiList), [uppsVisiList, selectedCurriculumId, activeCurriculumIds]);
  const filteredUppsMisi = useMemo(() => filterByCurriculum(uppsMisi), [uppsMisi, selectedCurriculumId, activeCurriculumIds]);
  const filteredUppsTujuan = useMemo(() => filterByCurriculum(uppsTujuan), [uppsTujuan, selectedCurriculumId, activeCurriculumIds]);
  const filteredUppsStrategi = useMemo(() => filterByCurriculum(uppsStrategi), [uppsStrategi, selectedCurriculumId, activeCurriculumIds]);

  // Filter Visi PT/PS by selected curriculum
  const filteredPtVisi = useMemo(() => findByCurriculum(ptVisiList), [ptVisiList, selectedCurriculumId, activeCurriculumIds]);
  const filteredPsVisi = useMemo(() => findByCurriculum(psVisiList), [psVisiList, selectedCurriculumId, activeCurriculumIds]);

  const filteredProfilLulusanData = useMemo(() => filterByCurriculum(profilLulusan), [profilLulusan, selectedCurriculumId, activeCurriculumIds]);

  // Filter PLOs (CPL) by selected curriculum
  const filteredPlosData = useMemo(() => filterByCurriculum(plos), [plos, selectedCurriculumId, activeCurriculumIds]);

  // Filter Bahan Kajian by selected curriculum
  const filteredBahanKajianData = useMemo(() => filterByCurriculum(bahanKajianKelompok), [bahanKajianKelompok, selectedCurriculumId, activeCurriculumIds]);

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
    // Auto-set curriculum_id from current filter when creating new items
    const defaultData = data || {};
    if (isNew && selectedCurriculumId !== 'all' && !defaultData.curriculum_id) {
      defaultData.curriculum_id = selectedCurriculumId;
    }
    setFormData(defaultData);
    setEditDialog({ type, data: defaultData, isNew });
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

  // Render Visi card - single row, single column, no add button
  const renderVisiCard = (
    title: string,
    visiData: VmtsVisi | undefined,
    table: string
  ) => {
    return (
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {canEdit && !visiData && (
            <Button size="sm" onClick={() => openEdit(table, { visi: '' }, true)}>
              <Pencil className="h-4 w-4 mr-1" /> Isi Visi
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="text-primary-foreground text-center">{title}</TableHead>
                {canEdit && visiData && <TableHead className="text-primary-foreground w-24">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiData ? (
                <TableRow>
                  <TableCell>{visiData.visi}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(table, visiData, false)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 2 : 1} className="text-center text-muted-foreground">
                    Belum ada data visi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

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
    // Filter data - use pre-filtered data based on curriculum
    const displayedProfilLulusan = filteredProfilLulusanData.filter(item => {
      const searchLower = filterProfilLulusan.toLowerCase();
      return (
        item.code?.toLowerCase().includes(searchLower) ||
        item.profil?.toLowerCase().includes(searchLower) ||
        item.deskripsi?.toLowerCase().includes(searchLower)
      );
    });
    
    const ids = displayedProfilLulusan.map(item => item.id);
    
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
              {displayedProfilLulusan.length > 0 ? (
                displayedProfilLulusan.map((item, idx) => (
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
    // Filter data - use pre-filtered data based on curriculum
    const displayedPlos = filteredPlosData.filter((item: any) => {
      const searchLower = filterCpl.toLowerCase();
      return (
        item.code?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    });
    
    const ids = displayedPlos.map((item: any) => item.id);
    
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
              {displayedPlos.length > 0 ? (
                displayedPlos.map((item: any, idx: number) => {
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
    // Filter data - use pre-filtered data based on curriculum
    const displayedBk = filteredBahanKajianData.filter(item => {
      const searchLower = filterBk.toLowerCase();
      return (
        item.kelompok?.toLowerCase().includes(searchLower) ||
        item.bahan_kajian?.toLowerCase().includes(searchLower)
      );
    });
    
    const ids = displayedBk.map(item => item.id);
    
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
              {displayedBk.length > 0 ? (
                displayedBk.map((item, idx) => (
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
                              className="h-4 w-4 rounded border-border"
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

  const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const renderMataKuliahTable = () => {
    // Filter data - start from filteredCourses which already excludes inactive curricula
    const displayedCourses = filteredCourses.filter((course: any) => {
      const searchLower = filterMk.toLowerCase();
      return (
        course.code?.toLowerCase().includes(searchLower) ||
        course.name?.toLowerCase().includes(searchLower) ||
        course.semester?.toLowerCase().includes(searchLower)
      );
    });
    
    const ids = displayedCourses.map((course: any) => course.id);
    
    const tableConfig = {
      tableName: 'courses',
      displayName: 'Mata Kuliah',
      columns: [
        { key: 'code', label: 'Kode', required: true },
        { key: 'name', label: 'Nama', required: true },
        { key: 'semester', label: 'Semester', required: false },
        { key: 'sks', label: 'SKS', required: false },
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
                <Button size="sm" onClick={() => openEdit('courses', { code: '', name: '', semester: '', curriculum_id: '', passing_score: '60', sks: '0', ploIds: [], plIds: [] }, true)}>
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
                <TableHead className="text-primary-foreground w-16">SKS</TableHead>
                <TableHead className="text-primary-foreground">CPL/PLO</TableHead>
                <TableHead className="text-primary-foreground">PL</TableHead>
                {canEdit && <TableHead className="text-primary-foreground w-24">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCourses.length > 0 ? (
                displayedCourses.map((course: any, idx: number) => {
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
                      <TableCell>{course.semester ? `Semester ${course.semester}` : '-'}</TableCell>
                      <TableCell>{course.sks ?? 0}</TableCell>
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
                                  sks: course.sks?.toString() || '0',
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
                  <TableCell colSpan={canEdit ? 10 : 8} className="text-center text-muted-foreground">
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
                <label className="text-sm font-medium">Kurikulum</label>
                <Select
                  value={formData.curriculum_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, curriculum_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kurikulum" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCurricula.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  const { id, code, description, curriculum_id, profil_lulusan_ids } = formData;
                  const plIds = (profil_lulusan_ids as unknown as string[]) || [];
                  
                  if (isNew) {
                    const { data: newPlo, error: ploError } = await supabase
                      .from('plos')
                      .insert({ code, description, curriculum_id: curriculum_id || null })
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
                      .update({ code, description, curriculum_id: curriculum_id || null })
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
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{isNew ? 'Tambah' : 'Edit'} Mata Kuliah</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
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
                        <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nama Mata Kuliah</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama mata kuliah"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">SKS</label>
                  <Input
                    type="number"
                    value={formData.sks || '0'}
                    onChange={(e) => setFormData({ ...formData, sks: e.target.value })}
                    placeholder="0"
                    min={0}
                    max={24}
                  />
                </div>
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
            <DialogFooter className="flex-shrink-0 pt-4">
              <Button variant="outline" onClick={() => setEditDialog(null)}>
                Batal
              </Button>
              <Button 
                onClick={async () => {
                  const { id, code, name, semester, curriculum_id, passing_score, sks } = formData;
                  if (isNew) {
                    const { data: newCourse, error } = await supabase
                      .from('courses')
                      .insert({ 
                        code, 
                        name, 
                        semester: semester || null, 
                        curriculum_id: curriculum_id || null,
                        passing_score: parseInt(passing_score) || 60,
                        sks: parseInt(sks) || 0
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
                        passing_score: parseInt(passing_score) || 60,
                        sks: parseInt(sks) || 0
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

    // Tables that have curriculum_id
    const tablesWithCurriculum = [
      'vmts_pt_misi', 'vmts_pt_tujuan', 'vmts_pt_strategi',
      'vmts_ps_misi', 'vmts_ps_tujuan', 'vmts_ps_strategi',
      'vmts_upps_visi', 'vmts_upps_misi', 'vmts_upps_tujuan', 'vmts_upps_strategi',
      'vmts_pt_visi', 'vmts_ps_visi',
      'profil_lulusan', 'bahan_kajian_kelompok'
    ];
    const hasCurriculum = tablesWithCurriculum.includes(type);

    // Generic edit dialog for other types
    const fieldConfig: Record<string, { fields: { key: string; label: string; type: 'input' | 'textarea' }[] }> = {
      vmts_pt_visi: { fields: [{ key: 'visi', label: 'Visi PT', type: 'textarea' }] },
      vmts_pt_misi: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'misi', label: 'Misi PT', type: 'textarea' }] },
      vmts_pt_tujuan: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'tujuan', label: 'Tujuan PT', type: 'textarea' }] },
      vmts_pt_strategi: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'strategi', label: 'Strategi PT', type: 'textarea' }] },
      vmts_upps_visi: { fields: [{ key: 'visi', label: 'Visi UPPS', type: 'textarea' }] },
      vmts_upps_misi: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'misi', label: 'Misi UPPS', type: 'textarea' }] },
      vmts_upps_tujuan: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'tujuan', label: 'Tujuan UPPS', type: 'textarea' }] },
      vmts_upps_strategi: { fields: [{ key: 'code', label: 'Kode', type: 'input' }, { key: 'strategi', label: 'Strategi UPPS', type: 'textarea' }] },
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
            {hasCurriculum && (
              <div>
                <label className="text-sm font-medium">Kurikulum</label>
                <Select
                  value={formData.curriculum_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, curriculum_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kurikulum" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCurricula.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="font-display text-3xl font-bold">Kurikulum</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Filter Kurikulum:</label>
            <Select value={selectedCurriculumId} onValueChange={setSelectedCurriculumId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Semua Kurikulum Aktif" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kurikulum Aktif</SelectItem>
                {activeCurricula.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="vmts-pt">
          <TabsList className={`grid grid-cols-2 ${showVmtsUpps ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} w-full mb-6`}>
            <TabsTrigger value="vmts-pt">VMTS PT</TabsTrigger>
            {showVmtsUpps && <TabsTrigger value="vmts-upps">VMTS UPPS</TabsTrigger>}
            <TabsTrigger value="vmts-ps">VMTS PS</TabsTrigger>
            <TabsTrigger value="profil-lulusan">PL</TabsTrigger>
            <TabsTrigger value="cpl">CPL</TabsTrigger>
            <TabsTrigger value="bahan-kajian">BK</TabsTrigger>
            <TabsTrigger value="mata-kuliah">MK</TabsTrigger>
          </TabsList>

          <TabsContent value="vmts-pt">
            {renderVisiCard('Visi PT', filteredPtVisi, 'vmts_pt_visi')}
            {renderCodeTable('Misi PT', filteredPtMisi, 'vmts_pt_misi', 'misi', 'Misi Perguruan Tinggi', filterPtMisi, setFilterPtMisi, sortPtMisi, setSortPtMisi)}
            {renderCodeTable('Tujuan PT', filteredPtTujuan, 'vmts_pt_tujuan', 'tujuan', 'Tujuan Perguruan Tinggi', filterPtTujuan, setFilterPtTujuan, sortPtTujuan, setSortPtTujuan)}
            {renderCodeTable('Strategi PT', filteredPtStrategi, 'vmts_pt_strategi', 'strategi', 'Strategi Perguruan Tinggi', filterPtStrategi, setFilterPtStrategi, sortPtStrategi, setSortPtStrategi)}
          </TabsContent>

          {showVmtsUpps && (
            <TabsContent value="vmts-upps">
              {renderVisiCard('Visi UPPS', filteredUppsVisi, 'vmts_upps_visi')}
              {renderCodeTable('Misi UPPS', filteredUppsMisi, 'vmts_upps_misi', 'misi', 'Misi UPPS', filterUppsMisi, setFilterUppsMisi, sortUppsMisi, setSortUppsMisi)}
              {renderCodeTable('Tujuan UPPS', filteredUppsTujuan, 'vmts_upps_tujuan', 'tujuan', 'Tujuan UPPS', filterUppsTujuan, setFilterUppsTujuan, sortUppsTujuan, setSortUppsTujuan)}
              {renderCodeTable('Strategi UPPS', filteredUppsStrategi, 'vmts_upps_strategi', 'strategi', 'Strategi UPPS', filterUppsStrategi, setFilterUppsStrategi, sortUppsStrategi, setSortUppsStrategi)}
            </TabsContent>
          )}

          <TabsContent value="vmts-ps">
            {renderVisiCard('Visi Keilmuan PS', filteredPsVisi, 'vmts_ps_visi')}
            {renderCodeTable('Misi PS', filteredPsMisi, 'vmts_ps_misi', 'misi', 'Misi Program Studi', filterPsMisi, setFilterPsMisi, sortPsMisi, setSortPsMisi)}
            {renderCodeTable('Tujuan PS', filteredPsTujuan, 'vmts_ps_tujuan', 'tujuan', 'Tujuan Program Studi', filterPsTujuan, setFilterPsTujuan, sortPsTujuan, setSortPsTujuan)}
            {renderCodeTable('Strategi PS', filteredPsStrategi, 'vmts_ps_strategi', 'strategi', 'Strategi Program Studi', filterPsStrategi, setFilterPsStrategi, sortPsStrategi, setSortPsStrategi)}
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
