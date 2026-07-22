import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiTableRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Layout } from '@/components/layout/Layout';
import { useAppSettings } from '@/hooks/useAppSettings';
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
import { Plus, Pencil, Trash2, Check, ChevronsUpDown, BookOpen } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, getVmtsAcronym } from '@/lib/utils';
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
import { VmtsImportExport } from '@/components/kurikulum/VmtsImportExport';

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
type BkCourseEntry = { course_id: string; bahan_kajian: string[] };
type BahanKajianKelompok = { id: string; kelompok: string; bahan_kajian: string | null; courses_data?: BkCourseEntry[]; curriculum_id?: string | null };

function KurikulumContent() {
  const { profile, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  // Admin and sub_admin can edit curriculum
  const canEdit = hasAnyRole(['admin', 'sub_admin']);
  const { clearSelection } = useBulkSelect();

  // Selected curriculum filter state
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('vmts-pt');

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

  // Setting: show VMTS UPPS tab and raw settings
  const { data: appSettings } = useAppSettings();
  const rawSettings = appSettings?.raw || {};
  const showVmtsUpps = rawSettings['show_vmts_upps'] !== 'false';

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
      return (data || []) as unknown as BahanKajianKelompok[];
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

  // Active semesters from settings (sorted by order_index)
  const { data: activeSemesters = [] } = useQuery({
    queryKey: ['semesters', 'active'],
    queryFn: async () => {
      const { data } = await supabase.from('semesters').select('*').eq('is_active', true).order('order_index');
      return (data || []) as { id: string; name: string; order_index: number; max_sks: number }[];
    },
  });

  // MK semester column filter
  const [filterMkSemester, setFilterMkSemester] = useState<string>('all');

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

  // Auto-select first active curriculum if none selected
  useEffect(() => {
    if (!selectedCurriculumId && activeCurricula.length > 0) {
      setSelectedCurriculumId(activeCurricula[0].id);
    }
  }, [activeCurricula, selectedCurriculumId]);

  // Determine which curriculum IDs to filter by
  const filterCurriculumIds = useMemo(() => {
    if (!selectedCurriculumId) {
      return activeCurriculumIds;
    }
    return [selectedCurriculumId];
  }, [selectedCurriculumId, activeCurriculumIds]);

  // Helper: filter items by curriculum. When empty, show items matching active curricula OR without curriculum_id.
  // When specific curriculum selected, only show items with that curriculum_id.
  const filterByCurriculum = (items: any[]) => {
    if (!selectedCurriculumId) {
      return items.filter((item: any) => !item.curriculum_id || activeCurriculumIds.includes(item.curriculum_id));
    }
    return items.filter((item: any) => item.curriculum_id === selectedCurriculumId);
  };

  const findByCurriculum = (items: any[]) => {
    if (!selectedCurriculumId) {
      return items.find((item: any) => !item.curriculum_id || activeCurriculumIds.includes(item.curriculum_id));
    }
    return items.find((item: any) => item.curriculum_id === selectedCurriculumId);
  };

  const { data: courses = [] } = useQuery({
    queryKey: ['courses_kurikulum'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, curricula:curriculum_id(*), course_plos(plo_id, plos(*)), course_profil_lulusan(profil_lulusan_id, profil_lulusan:profil_lulusan_id(*)), course_prerequisites(prerequisite_course_id)').order('code');
      return data || [];
    },
  });

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
    if (isNew && selectedCurriculumId !== '' && !defaultData.curriculum_id) {
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

  const handleFixData = async () => {
    if (!selectedCurriculumId) return;
    try {
      toast.info('Menyelamatkan data CPL yang hilang...');
      await supabase.from('plos').update({ curriculum_id: selectedCurriculumId }).is('curriculum_id', null);
      await supabase.from('courses').update({ curriculum_id: selectedCurriculumId }).is('curriculum_id', null);
      queryClient.invalidateQueries();
      toast.success('Data CPL berhasil diselamatkan ke Kurikulum Aktif!');
    } catch (error: any) {
      toast.error('Gagal: ' + error.message);
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
                {canEdit && visiData && <TableHead className="text-primary-foreground text-center w-24">Aksi</TableHead>}
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
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => openEdit(table, { code: '', [valueKey]: '' }, true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
                {/* <KurikulumImportExport tableConfig={tableConfig} data={data} extraDefaults={selectedCurriculumId !== '' && table.startsWith('vmts_ps') ? { curriculum_id: selectedCurriculumId } : undefined} /> */}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground text-center w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground text-center w-16">No</TableHead>
                <TableHead className="text-primary-foreground text-center w-24">
                  <TableSortHeader
                    className="w-full justify-center"
                    sortKey="code"
                    currentSort={sortConfig}
                    onSort={onSortChange}
                    sortType="text"
                  >
                    Kode
                  </TableSortHeader>
                </TableHead>
                <TableHead className="text-primary-foreground text-center">
                  <TableSortHeader
                    className="w-full justify-center"
                    sortKey="value"
                    currentSort={sortConfig}
                    onSort={onSortChange}
                    sortType="text"
                  >
                    {valueLabel}
                  </TableSortHeader>
                </TableHead>
                {canEdit && <TableHead className="text-primary-foreground text-center w-24">Aksi</TableHead>}
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
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => openEdit('profil_lulusan', { code: '', profil: '', deskripsi: '' }, true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
                <KurikulumImportExport tableConfig={tableConfig} data={filteredProfilLulusanData} extraDefaults={selectedCurriculumId !== '' ? { curriculum_id: selectedCurriculumId } : undefined} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground text-center w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground text-center w-16">No</TableHead>
                <TableHead className="text-primary-foreground text-center w-24">Kode</TableHead>
                <TableHead className="text-primary-foreground text-center">Profil Lulusan</TableHead>
                <TableHead className="text-primary-foreground text-center">Deskripsi</TableHead>
                {canEdit && <TableHead className="text-primary-foreground text-center w-24">Aksi</TableHead>}
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
        { 
          key: 'pl', 
          label: 'PL', 
          exportValue: (item: any) => {
            const pls = item.plo_profil_lulusan?.map((ppl: any) => ppl.profil_lulusan?.code).filter(Boolean) || [];
            return pls.join(', ');
          }
        },
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
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => openEdit('plos', { code: '', description: '', profil_lulusan_ids: [] }, true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
                <KurikulumImportExport tableConfig={tableConfig} data={filteredPlosData} extraDefaults={selectedCurriculumId !== '' ? { curriculum_id: selectedCurriculumId } : undefined} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground text-center w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground text-center w-16">No</TableHead>
                <TableHead className="text-primary-foreground text-center w-24">Kode</TableHead>
                <TableHead className="text-primary-foreground text-center">CPL</TableHead>
                <TableHead className="text-primary-foreground text-center">PL</TableHead>
                {canEdit && <TableHead className="text-primary-foreground text-center w-24">Aksi</TableHead>}
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
  const [bkKelompok, setBkKelompok] = useState('');
  const [editingBk, setEditingBk] = useState<BahanKajianKelompok | null>(null);
  const [bkCurriculumId, setBkCurriculumId] = useState<string>('');
  // Each entry: { course_id, bahan_kajian: [] }
  const [bkCoursesData, setBkCoursesData] = useState<BkCourseEntry[]>([]);
  // Open state per course-row combobox
  const [coursePickerOpen, setCoursePickerOpen] = useState<Record<number, boolean>>({});

  const resetBkForm = () => {
    setBkDialog(false);
    setBkKelompok('');
    setEditingBk(null);
    setBkCurriculumId('');
    setBkCoursesData([]);
    setCoursePickerOpen({});
  };

  const handleSaveBk = () => {
    if (!bkKelompok) return;
    const cleaned = bkCoursesData
      .filter(c => c.course_id)
      .map(c => ({
        course_id: c.course_id,
        bahan_kajian: (c.bahan_kajian || []).map(s => s.trim()).filter(Boolean),
      }));
    if (cleaned.length === 0) return;

    const currId = bkCurriculumId || (selectedCurriculumId !== '' ? selectedCurriculumId : null);
    // Keep legacy bahan_kajian column populated with a flat string for backwards compat
    const flat = cleaned.flatMap(c => c.bahan_kajian).join(', ');
    const payload = {
      kelompok: bkKelompok,
      bahan_kajian: flat,
      courses_data: cleaned as any,
      curriculum_id: currId || null,
    };

    if (editingBk) {
      saveMutation.mutate({ table: 'bahan_kajian_kelompok', data: payload, isNew: false, id: editingBk.id });
    } else {
      saveMutation.mutate({ table: 'bahan_kajian_kelompok', data: payload, isNew: true });
    }
    resetBkForm();
  };

  const openEditBk = (item: BahanKajianKelompok) => {
    setEditingBk(item);
    setBkKelompok(item.kelompok);
    const existing = Array.isArray(item.courses_data) ? (item.courses_data as BkCourseEntry[]) : [];
    setBkCoursesData(existing.length > 0 ? existing : [{ course_id: '', bahan_kajian: [''] }]);
    setBkCurriculumId(item.curriculum_id || '');
    setBkDialog(true);
  };

  const openAddBk = () => {
    setBkCoursesData([{ course_id: '', bahan_kajian: [''] }]);
    setBkDialog(true);
  };

  // Helpers for nested editing
  const updateCourseEntry = (idx: number, patch: Partial<BkCourseEntry>) => {
    setBkCoursesData(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };
  const addCourseEntry = () => setBkCoursesData(prev => [...prev, { course_id: '', bahan_kajian: [''] }]);
  const removeCourseEntry = (idx: number) => setBkCoursesData(prev => prev.filter((_, i) => i !== idx));
  const addBkItem = (idx: number) => updateCourseEntry(idx, { bahan_kajian: [...(bkCoursesData[idx].bahan_kajian || []), ''] });
  const updateBkItem = (idx: number, bIdx: number, value: string) => {
    const newBk = [...(bkCoursesData[idx].bahan_kajian || [])];
    newBk[bIdx] = value;
    updateCourseEntry(idx, { bahan_kajian: newBk });
  };
  const removeBkItem = (idx: number, bIdx: number) => {
    const newBk = (bkCoursesData[idx].bahan_kajian || []).filter((_, i) => i !== bIdx);
    updateCourseEntry(idx, { bahan_kajian: newBk });
  };

  // Available courses filtered by curriculum
  const dialogCurriculumId = bkCurriculumId || (selectedCurriculumId !== '' ? selectedCurriculumId : '');
  const dialogAvailableCourses = useMemo(() => {
    return courses.filter((c: any) => dialogCurriculumId ? c.curriculum_id === dialogCurriculumId : true);
  }, [courses, dialogCurriculumId]);

  const courseLabel = (id: string) => {
    const c = courses.find((x: any) => x.id === id);
    return c ? `${c.code} - ${c.name}` : 'Pilih mata kuliah...';
  };

  const renderBahanKajianTable = () => {
    const displayedBk = filteredBahanKajianData.filter(item => {
      const searchLower = filterBk.toLowerCase();
      const inCourses = (item.courses_data || []).some((cd: BkCourseEntry) => {
        const c: any = courses.find((x: any) => x.id === cd.course_id);
        return c && (`${c.code} ${c.name}`.toLowerCase().includes(searchLower));
      });
      return (
        item.kelompok?.toLowerCase().includes(searchLower) ||
        (item.bahan_kajian || '').toLowerCase().includes(searchLower) ||
        inCourses
      );
    });

    const ids = displayedBk.map(item => item.id);

    const tableConfig = {
      tableName: 'bahan_kajian_kelompok',
      displayName: 'Bahan Kajian',
      columns: [
        { key: 'kelompok', label: 'Kelompok BK', required: true },
        { key: 'bahan_kajian', label: 'Bahan Kajian (legacy/teks)', required: false },
        {
          key: 'courses_data',
          label: 'Mata Kuliah & Bahan Kajian (JSON)',
          required: false,
          importOnlyExport: true,
          exportValue: (item: any) => {
            const cd = (item.courses_data || []) as { course_id: string; bahan_kajian: string[] }[];
            if (!cd.length) return '';
            const labels = cd.map(c => {
              const course = courses?.find((co: any) => co.id === c.course_id);
              const name = course ? `${course.code} - ${course.name}` : c.course_id;
              return `${name}: ${(c.bahan_kajian || []).join('; ')}`;
            });
            return labels.join(' | ');
          },
        },
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
              placeholder="Cari bahan kajian / mata kuliah..."
            />
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={openAddBk}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
                <KurikulumImportExport tableConfig={tableConfig} data={filteredBahanKajianData} extraDefaults={selectedCurriculumId !== '' ? { curriculum_id: selectedCurriculumId } : undefined} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground text-center w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground text-center w-16">No</TableHead>
                <TableHead className="text-primary-foreground text-center">Kelompok BK</TableHead>
                <TableHead className="text-primary-foreground text-center">Bahan Kajian</TableHead>
                <TableHead className="text-primary-foreground text-center">Mata Kuliah</TableHead>
                {canEdit && <TableHead className="text-primary-foreground text-center w-24">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedBk.length > 0 ? (
                displayedBk.map((item, idx) => {
                  const cd = (item.courses_data || []) as BkCourseEntry[];
                  const allBk = cd.flatMap(e => e.bahan_kajian || []);
                  return (
                    <TableRow key={item.id}>
                      {canEdit && (
                        <TableCell>
                          <BulkSelectCheckbox id={item.id} />
                        </TableCell>
                      )}
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{item.kelompok}</TableCell>
                      <TableCell>
                        {cd.length > 0 ? (
                          <div className="space-y-2">
                            {cd.map((entry, i) => {
                              const c: any = courses.find((x: any) => x.id === entry.course_id);
                              return (
                                <div key={i}>
                                  <div className="text-xs font-semibold text-muted-foreground">
                                    {c ? `${c.code} - ${c.name}` : '—'}
                                  </div>
                                  <ul className="list-disc list-inside">
                                    {(entry.bahan_kajian || []).map((bk, j) => (
                                      <li key={j} className="text-sm">{bk}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <ul className="list-disc list-inside space-y-1">
                            {(item.bahan_kajian || '').split(', ').filter(Boolean).map((bk, i) => (
                              <li key={i} className="text-sm">{bk.trim()}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside space-y-1">
                          {cd.map((entry, i) => {
                            const c: any = courses.find((x: any) => x.id === entry.course_id);
                            if (!c) return null;
                            return <li key={i} className="text-sm">{c.code} - {c.name}</li>;
                          })}
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
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 4} className="text-center text-muted-foreground">
                    {filterBk ? 'Tidak ada data yang cocok' : 'Belum ada data'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {canEdit && <BulkActionBar onDelete={(ids) => handleBulkDelete('bahan_kajian_kelompok', ids)} itemName="bahan kajian" />}

          {/* Bahan Kajian Dialog */}
          <Dialog open={bkDialog} onOpenChange={(open) => { if (!open) resetBkForm(); }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBk ? 'Edit Bahan Kajian' : 'Tambah Bahan Kajian'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Kurikulum</label>
                  <Select
                    value={bkCurriculumId || (selectedCurriculumId !== '' ? selectedCurriculumId : '')}
                    onValueChange={(v) => { setBkCurriculumId(v); }}
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
                  <label className="text-sm font-medium">Kelompok BK</label>
                  <Input
                    value={bkKelompok}
                    onChange={(e) => setBkKelompok(e.target.value)}
                    placeholder="Contoh: Kelompok A"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Mata Kuliah & Bahan Kajian</label>
                    <Button type="button" variant="outline" size="sm" onClick={addCourseEntry}>
                      <Plus className="h-4 w-4 mr-1" /> Tambah Mata Kuliah
                    </Button>
                  </div>

                  {bkCoursesData.length === 0 && (
                    <p className="text-sm text-muted-foreground">Tambahkan minimal satu mata kuliah.</p>
                  )}

                  {bkCoursesData.map((entry, idx) => {
                    const usedIds = bkCoursesData.map((e, i) => i !== idx ? e.course_id : null).filter(Boolean) as string[];
                    const selectableCourses = dialogAvailableCourses.filter((c: any) => !usedIds.includes(c.id));
                    return (
                      <div key={idx} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <label className="text-xs font-medium">Mata Kuliah</label>
                            <Popover open={!!coursePickerOpen[idx]} onOpenChange={(o) => setCoursePickerOpen(prev => ({ ...prev, [idx]: o }))}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                                  <span className={cn(!entry.course_id && 'text-muted-foreground', 'truncate')}>
                                    {courseLabel(entry.course_id)}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Cari mata kuliah..." />
                                  <CommandList>
                                    <CommandEmpty>Mata kuliah tidak ditemukan.</CommandEmpty>
                                    <CommandGroup>
                                      {selectableCourses.map((c: any) => (
                                        <CommandItem
                                          key={c.id}
                                          value={`${c.code} ${c.name}`}
                                          onSelect={() => {
                                            updateCourseEntry(idx, { course_id: c.id });
                                            setCoursePickerOpen(prev => ({ ...prev, [idx]: false }));
                                          }}
                                        >
                                          <Check className={cn('mr-2 h-4 w-4', entry.course_id === c.id ? 'opacity-100' : 'opacity-0')} />
                                          {c.code} - {c.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="mt-5 text-destructive" onClick={() => removeCourseEntry(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium">Bahan Kajian</label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addBkItem(idx)}>
                              <Plus className="h-3 w-3 mr-1" /> Tambah
                            </Button>
                          </div>
                          {(entry.bahan_kajian || []).map((bk, bIdx) => (
                            <div key={bIdx} className="flex gap-2">
                              <Input
                                value={bk}
                                onChange={(e) => updateBkItem(idx, bIdx, e.target.value)}
                                placeholder={`Bahan kajian ${bIdx + 1}`}
                              />
                              <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => removeBkItem(idx, bIdx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {(entry.bahan_kajian || []).length === 0 && (
                            <p className="text-xs text-muted-foreground">Belum ada bahan kajian.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetBkForm}>Batal</Button>
                <Button
                  onClick={handleSaveBk}
                  disabled={!bkKelompok || bkCoursesData.length === 0 || bkCoursesData.every(c => !c.course_id || (c.bahan_kajian || []).every(b => !b.trim()))}
                >
                  {editingBk ? 'Simpan' : 'Tambah'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  };

  const semesterOptions = activeSemesters.map(s => s.name);

  const renderMataKuliahTable = () => {
    // Filter data - start from filteredCourses which already excludes inactive curricula
    const displayedCourses = filteredCourses.filter((course: any) => {
      const searchLower = filterMk.toLowerCase();
      const matchesSearch = (
        course.code?.toLowerCase().includes(searchLower) ||
        course.name?.toLowerCase().includes(searchLower) ||
        course.semester?.toLowerCase().includes(searchLower)
      );
      const matchesSemester = filterMkSemester === 'all' || String(course.semester || '') === filterMkSemester;
      return matchesSearch && matchesSemester;
    }).sort((a: any, b: any) => {
      // Sort by semester order_index then by code
      const aIdx = activeSemesters.findIndex(s => s.name === String(a.semester || ''));
      const bIdx = activeSemesters.findIndex(s => s.name === String(b.semester || ''));
      const aPos = aIdx === -1 ? 999 : aIdx;
      const bPos = bIdx === -1 ? 999 : bIdx;
      if (aPos !== bPos) return aPos - bPos;
      return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' });
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
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => openEdit('courses', { code: '', name: '', semester: '', curriculum_id: '', passing_score: '60', sks: '0', ploIds: [], plIds: [], has_prerequisite: 'false', prerequisiteIds: [] }, true)}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
                <KurikulumImportExport tableConfig={tableConfig} data={filteredCourses} extraDefaults={selectedCurriculumId !== '' ? { curriculum_id: selectedCurriculumId } : undefined} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {canEdit && (
                  <TableHead className="text-primary-foreground text-center w-12">
                    <BulkSelectAllCheckbox ids={ids} />
                  </TableHead>
                )}
                <TableHead className="text-primary-foreground text-center w-16">No</TableHead>
                <TableHead className="text-primary-foreground text-center w-24">Kode</TableHead>
                <TableHead className="text-primary-foreground text-center">Nama</TableHead>
                <TableHead className="text-primary-foreground text-center">Kurikulum</TableHead>
                <TableHead className="text-primary-foreground text-center">
                  <TableSortHeader
                    className="w-full justify-center"
                    sortKey="semester"
                    currentSort={sortMk}
                    onSort={setSortMk}
                    sortType="number"
                    filterOptions={activeSemesters.map(s => s.name)}
                    filterValue={filterMkSemester}
                    onFilterChange={setFilterMkSemester}
                    filterPlaceholder="Filter semester..."
                  >
                    Semester
                  </TableSortHeader>
                </TableHead>
                <TableHead className="text-primary-foreground text-center w-16">SKS</TableHead>
                <TableHead className="text-primary-foreground text-center">CPL/PLO</TableHead>
                <TableHead className="text-primary-foreground text-center">PL</TableHead>
                {canEdit && <TableHead className="text-primary-foreground text-center w-24">Aksi</TableHead>}
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
                                const existingPrerequisites = course.course_prerequisites?.map((cp: any) => cp.prerequisite_course_id) || [];
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
                                  has_prerequisite: existingPrerequisites.length > 0 ? 'true' : 'false',
                                  prerequisiteIds: existingPrerequisites,
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
                  {profilLulusan.filter((pl: any) => {
                    const currId = formData.curriculum_id;
                    return currId ? (pl as any).curriculum_id === currId : true;
                  }).map((pl) => {
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
                  {plos.filter((plo: any) => {
                    const currId = formData.curriculum_id;
                    return currId ? plo.curriculum_id === currId : true;
                  }).map((plo: any) => (
                    <label key={plo.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPloIds.includes(plo.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          const newIds = isChecked
                            ? [...selectedPloIds, plo.id]
                            : selectedPloIds.filter((id) => id !== plo.id);
                          
                          let newFormData = { ...formData, ploIds: newIds as any };
                          
                          // Auto-check related PLs
                          if (isChecked) {
                            const relatedPlIds = plo.plo_profil_lulusan?.map((p: any) => p.profil_lulusan_id) || [];
                            if (relatedPlIds.length > 0) {
                              const currentPlIds = (formData.plIds as unknown as string[]) || [];
                              const mergedPlIds = Array.from(new Set([...currentPlIds, ...relatedPlIds]));
                              (newFormData as any).plIds = mergedPlIds;
                            }
                          }
                          
                          setFormData(newFormData);
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
                  {profilLulusan.filter((pl: any) => {
                    const currId = formData.curriculum_id;
                    return currId ? (pl as any).curriculum_id === currId : true;
                  }).map((pl) => {
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
              <div>
                <label className="text-sm font-medium">Prasyarat Kelulusan</label>
                <Select
                  value={formData.has_prerequisite === 'true' ? 'true' : 'false'}
                  onValueChange={(v) => {
                    setFormData({ ...formData, has_prerequisite: v });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis Prasyarat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Tidak Bersyarat</SelectItem>
                    <SelectItem value="true">Bersyarat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.has_prerequisite === 'true' && (
                <div>
                  <label className="text-sm font-medium">Pilih Mata Kuliah Prasyarat (Multi-select)</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                    {courses.filter((c: any) => {
                      const currId = formData.curriculum_id;
                      return (currId ? c.curriculum_id === currId : true) && c.id !== formData.id;
                    }).map((c: any) => {
                      const selectedPrerequisiteIds = (formData.prerequisiteIds as unknown as string[]) || [];
                      return (
                        <label key={c.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedPrerequisiteIds.includes(c.id)}
                            onChange={(e) => {
                              const newIds = e.target.checked
                                ? [...selectedPrerequisiteIds, c.id]
                                : selectedPrerequisiteIds.filter((id) => id !== c.id);
                              setFormData({ ...formData, prerequisiteIds: newIds as any });
                            }}
                          />
                          <span className="text-sm">{c.code} - {c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="flex-shrink-0 pt-4">
              <Button variant="outline" onClick={() => setEditDialog(null)}>
                Batal
              </Button>
              <Button 
                onClick={async () => {
                  const { id, code, name, semester, curriculum_id, passing_score, sks } = formData;
                  const newSks = parseInt(sks) || 0;
                  
                  // Validasi SKS Limit
                  if (semester) {
                    const targetSemesterObj = activeSemesters.find(s => s.name === semester);
                    if (targetSemesterObj) {
                      const maxSks = (targetSemesterObj as any).max_sks || 24;
                      const currentSemesterCourses = courses.filter((c: any) => c.curriculum_id === curriculum_id && c.semester === semester && c.id !== id);
                      const currentTotalSks = currentSemesterCourses.reduce((sum: number, c: any) => sum + (c.sks || 0), 0);
                      if (currentTotalSks + newSks > maxSks) {
                        toast.error(`Gagal: Total SKS untuk Semester ${semester} akan menjadi ${currentTotalSks + newSks}, melebihi batas maksimal (${maxSks} SKS).`);
                        return;
                      }
                    }
                  }

                  if (isNew) {
                    const { data: newCourse, error } = await supabase
                      .from('courses')
                      .insert({ 
                        code, 
                        name, 
                        semester: semester || null, 
                        curriculum_id: curriculum_id || null,
                        passing_score: parseInt(passing_score) || 60,
                        sks: newSks
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

                    if (formData.has_prerequisite === 'true') {
                      const prerequisiteIdsList = (formData.prerequisiteIds as unknown as string[]) || [];
                      if (prerequisiteIdsList.length > 0) {
                        const prqInserts = prerequisiteIdsList.map(prq_id => ({ course_id: newCourse.id, prerequisite_course_id: prq_id }));
                        await supabase.from('course_prerequisites').insert(prqInserts);
                      }
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
                        sks: newSks
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

                    await supabase.from('course_prerequisites').delete().eq('course_id', id);
                    if (formData.has_prerequisite === 'true') {
                      const prerequisiteIdsList = (formData.prerequisiteIds as unknown as string[]) || [];
                      if (prerequisiteIdsList.length > 0) {
                        const prqInserts = prerequisiteIdsList.map(prq_id => ({ course_id: id, prerequisite_course_id: prq_id }));
                        await supabase.from('course_prerequisites').insert(prqInserts);
                      }
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
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Kurikulum</h1>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={handleFixData} className="ml-4 border-yellow-500 text-yellow-600 hover:bg-yellow-50">
                Perbaiki Data Hilang
              </Button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Filter Kurikulum:</label>
            <Select value={selectedCurriculumId} onValueChange={setSelectedCurriculumId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Pilih Kurikulum" />
              </SelectTrigger>
              <SelectContent>
                {activeCurricula.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`h-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${showVmtsUpps ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-2 w-full mb-6 p-2`}>
            <TabsTrigger value="vmts-pt">{getVmtsAcronym('pt', rawSettings)} PT</TabsTrigger>
            {showVmtsUpps && <TabsTrigger value="vmts-upps">{getVmtsAcronym('upps', rawSettings)} UPPS</TabsTrigger>}
            <TabsTrigger value="vmts-ps">{getVmtsAcronym('ps', rawSettings)} PS</TabsTrigger>
            <TabsTrigger value="profil-lulusan">PL</TabsTrigger>
            <TabsTrigger value="cpl">CPL</TabsTrigger>
            <TabsTrigger value="bahan-kajian">BK</TabsTrigger>
            <TabsTrigger value="mata-kuliah">MK</TabsTrigger>
          </TabsList>

          {canEdit && activeTab.startsWith('vmts') && (
            <VmtsImportExport 
              curriculumId={selectedCurriculumId}
              data={{
                pt: { visi: filteredPtVisi ? [filteredPtVisi] : [], misi: filteredPtMisi, tujuan: filteredPtTujuan, strategi: filteredPtStrategi },
                upps: { visi: filteredUppsVisi ? [filteredUppsVisi] : [], misi: filteredUppsMisi, tujuan: filteredUppsTujuan, strategi: filteredUppsStrategi },
                ps: { visi: filteredPsVisi ? [filteredPsVisi] : [], misi: filteredPsMisi, tujuan: filteredPsTujuan, strategi: filteredPsStrategi }
              }}
              onSuccess={() => queryClient.invalidateQueries()}
            />
          )}

          <TabsContent value="vmts-pt">
            {rawSettings['show_vmts_pt_visi'] !== 'false' && renderVisiCard('Visi PT', filteredPtVisi, 'vmts_pt_visi')}
            {rawSettings['show_vmts_pt_misi'] !== 'false' && renderCodeTable('Misi PT', filteredPtMisi, 'vmts_pt_misi', 'misi', 'Misi Perguruan Tinggi', filterPtMisi, setFilterPtMisi, sortPtMisi, setSortPtMisi)}
            {rawSettings['show_vmts_pt_tujuan'] !== 'false' && renderCodeTable('Tujuan PT', filteredPtTujuan, 'vmts_pt_tujuan', 'tujuan', 'Tujuan Perguruan Tinggi', filterPtTujuan, setFilterPtTujuan, sortPtTujuan, setSortPtTujuan)}
            {rawSettings['show_vmts_pt_strategi'] !== 'false' && renderCodeTable('Strategi PT', filteredPtStrategi, 'vmts_pt_strategi', 'strategi', 'Strategi Perguruan Tinggi', filterPtStrategi, setFilterPtStrategi, sortPtStrategi, setSortPtStrategi)}
          </TabsContent>

          {showVmtsUpps && (
            <TabsContent value="vmts-upps">
              {rawSettings['show_vmts_upps_visi'] !== 'false' && renderVisiCard('Visi UPPS', filteredUppsVisi, 'vmts_upps_visi')}
              {rawSettings['show_vmts_upps_misi'] !== 'false' && renderCodeTable('Misi UPPS', filteredUppsMisi, 'vmts_upps_misi', 'misi', 'Misi UPPS', filterUppsMisi, setFilterUppsMisi, sortUppsMisi, setSortUppsMisi)}
              {rawSettings['show_vmts_upps_tujuan'] !== 'false' && renderCodeTable('Tujuan UPPS', filteredUppsTujuan, 'vmts_upps_tujuan', 'tujuan', 'Tujuan UPPS', filterUppsTujuan, setFilterUppsTujuan, sortUppsTujuan, setSortUppsTujuan)}
              {rawSettings['show_vmts_upps_strategi'] !== 'false' && renderCodeTable('Strategi UPPS', filteredUppsStrategi, 'vmts_upps_strategi', 'strategi', 'Strategi UPPS', filterUppsStrategi, setFilterUppsStrategi, sortUppsStrategi, setSortUppsStrategi)}
            </TabsContent>
          )}

          <TabsContent value="vmts-ps">
            {rawSettings['show_vmts_ps_visi'] !== 'false' && renderVisiCard('Visi Keilmuan PS', filteredPsVisi, 'vmts_ps_visi')}
            {rawSettings['show_vmts_ps_misi'] !== 'false' && renderCodeTable('Misi PS', filteredPsMisi, 'vmts_ps_misi', 'misi', 'Misi Program Studi', filterPsMisi, setFilterPsMisi, sortPsMisi, setSortPsMisi)}
            {rawSettings['show_vmts_ps_tujuan'] !== 'false' && renderCodeTable('Tujuan PS', filteredPsTujuan, 'vmts_ps_tujuan', 'tujuan', 'Tujuan Program Studi', filterPsTujuan, setFilterPsTujuan, sortPsTujuan, setSortPsTujuan)}
            {rawSettings['show_vmts_ps_strategi'] !== 'false' && renderCodeTable('Strategi PS', filteredPsStrategi, 'vmts_ps_strategi', 'strategi', 'Strategi Program Studi', filterPsStrategi, setFilterPsStrategi, sortPsStrategi, setSortPsStrategi)}
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
