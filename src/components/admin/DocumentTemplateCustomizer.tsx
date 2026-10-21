import React, { useState, useEffect, useRef } from 'react';
import {
  useDocumentTemplatesConfig,
  SingleDocumentTemplate,
  defaultDocumentTemplates,
} from '@/lib/documentTemplateTypes';
import {
  DOCUMENT_DATA_SOURCE_MODULES,
  getAllDataSourceModules,
  getDataSourceModuleById,
  interpolateVariables,
  getDummyContextForModule,
} from '@/lib/documentDataSources';
import { useDocumentSettings } from '@/lib/documentSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  Table as TableIcon,
  HelpCircle,
  Eye,
  Info,
  Plus,
  Trash2,
  Database,
  Layers,
  Send,
  Printer,
  Sparkles,
  ChevronDown,
  CheckSquare,
  Type,
  AlignLeft,
  LayoutTemplate,
} from 'lucide-react';

export function DocumentTemplateCustomizer() {
  const { templatesMap, updateSingleTemplate, createNewTemplate, deleteTemplate, isUpdating } = useDocumentTemplatesConfig();
  const { settings: docSettings } = useDocumentSettings();

  const [selectedDocCode, setSelectedDocCode] = useState<string>('kartu_bimbingan_ta');
  const [currentTemplate, setCurrentTemplate] = useState<SingleDocumentTemplate>(
    templatesMap[selectedDocCode] || defaultDocumentTemplates.kartu_bimbingan_ta
  );

  // New Document Dialog State
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCode, setNewDocCode] = useState('');
  const [newDocModule, setNewDocModule] = useState('tugas_akhir');

  // Textarea Cursor Ref for Variable Inserter
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Input for adding custom table column
  const [newColumnLabel, setNewColumnLabel] = useState('');

  // Input for adding Carbon Copy (Tembusan)
  const [newCopyItem, setNewCopyItem] = useState('');

  // Sync state when selected document or templateMap changes
  useEffect(() => {
    if (templatesMap[selectedDocCode]) {
      setCurrentTemplate(templatesMap[selectedDocCode]);
    } else {
      const firstCode = Object.keys(templatesMap)[0] || 'kartu_bimbingan_ta';
      setSelectedDocCode(firstCode);
      if (templatesMap[firstCode]) {
        setCurrentTemplate(templatesMap[firstCode]);
      }
    }
  }, [selectedDocCode, templatesMap]);

  const handleDocCodeChange = (code: string) => {
    setSelectedDocCode(code);
    if (templatesMap[code]) {
      setCurrentTemplate(templatesMap[code]);
    }
  };

  const updateTemplateField = <K extends keyof SingleDocumentTemplate>(key: K, value: SingleDocumentTemplate[K]) => {
    setCurrentTemplate((prev) => ({ ...prev, [key]: value }));
  };

  // Content mode handler ('all' | 'text_only' | 'table_only')
  const handleContentModeChange = (mode: 'all' | 'text_only' | 'table_only') => {
    setCurrentTemplate((prev) => ({
      ...prev,
      content_mode: mode,
      body_text_enabled: mode === 'all' || mode === 'text_only',
      table_enabled: mode === 'all' || mode === 'table_only',
    }));
  };

  // Variable Inserter Handler: Inserts {{variable}} at cursor position in Textarea
  const handleInsertVariable = (varKey: string) => {
    const tag = `{{${varKey}}}`;
    const textarea = textareaRef.current;
    if (!textarea) {
      const current = currentTemplate.body_text_template || '';
      updateTemplateField('body_text_template', current ? `${current} ${tag}` : tag);
      toast.success(`Variabel ${tag} berhasil disisipkan`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const oldText = currentTemplate.body_text_template || '';
    const newText = oldText.substring(0, start) + tag + oldText.substring(end);
    
    updateTemplateField('body_text_template', newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);

    toast.success(`Variabel ${tag} berhasil disisipkan`);
  };

  // Table Column Handlers
  const toggleColumn = (columnId: string, enabled: boolean) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => (col.id === columnId ? { ...col, enabled } : col)),
    }));
  };

  const updateColumnLabel = (columnId: string, label: string) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => (col.id === columnId ? { ...col, label } : col)),
    }));
  };

  const handleAddColumn = () => {
    if (!newColumnLabel.trim()) {
      toast.error('Masukkan nama label kolom');
      return;
    }
    const cleanId = `col_${Date.now()}`;
    const newCol = {
      id: cleanId,
      label: newColumnLabel.trim(),
      enabled: true,
      is_custom: true,
    };
    updateTemplateField('columns', [...(currentTemplate.columns || []), newCol]);
    setNewColumnLabel('');
    toast.success(`Kolom "${newCol.label}" berhasil ditambahkan`);
  };

  const handleRemoveColumn = (columnId: string) => {
    updateTemplateField(
      'columns',
      currentTemplate.columns.filter((c) => c.id !== columnId)
    );
    toast.info('Kolom dihapus');
  };

  // Signer Handlers
  const addSigner = () => {
    const newId = `signer_${Date.now()}`;
    const newSigners = [
      ...currentTemplate.signatures,
      {
        id: newId,
        role_label: 'Pejabat Penandatangan',
        enabled: true,
        use_digital_signature: false,
        signer_status: 'mengetahui' as const,
        custom_name: '',
        custom_id_number: '',
      },
    ];
    updateTemplateField('signatures', newSigners);
    toast.success('Penandatangan baru ditambahkan');
  };

  const removeSigner = (sigId: string) => {
    if (currentTemplate.signatures.length <= 1) {
      toast.warning('Minimal harus ada 1 penandatangan.');
      return;
    }
    const filtered = currentTemplate.signatures.filter((s) => s.id !== sigId);
    updateTemplateField('signatures', filtered);
  };

  const updateSignerField = (sigId: string, field: string, value: any) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      signatures: prev.signatures.map((s) => (s.id === sigId ? { ...s, [field]: value } : s)),
    }));
  };

  // Carbon Copy (Tembusan) Handlers
  const addCopyItem = () => {
    if (!newCopyItem.trim()) return;
    const list = currentTemplate.copies_list || [];
    updateTemplateField('copies_list', [...list, newCopyItem.trim()]);
    setNewCopyItem('');
    toast.success('Tembusan ditambahkan');
  };

  const removeCopyItem = (index: number) => {
    const list = [...(currentTemplate.copies_list || [])];
    list.splice(index, 1);
    updateTemplateField('copies_list', list);
  };

  // Placement Handlers
  const togglePlacement = (placementId: string) => {
    const current = currentTemplate.placement_targets || [];
    if (current.includes(placementId)) {
      updateTemplateField('placement_targets', current.filter((id) => id !== placementId));
    } else {
      updateTemplateField('placement_targets', [...current, placementId]);
    }
  };

  // Create New Document Handler
  const handleCreateDocument = () => {
    if (!newDocName.trim() || !newDocCode.trim()) {
      toast.error('Nama dan kode dokumen wajib diisi.');
      return;
    }

    const cleanCode = newDocCode.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (templatesMap[cleanCode]) {
      toast.error('Kode dokumen sudah digunakan. Harap gunakan kode unik lain.');
      return;
    }

    const modDef = getDataSourceModuleById(newDocModule);
    const newTemplate: SingleDocumentTemplate = {
      code: cleanCode,
      name: newDocName.trim(),
      orientation: 'portrait',
      data_source_module: newDocModule,
      document_title: newDocName.toUpperCase(),
      document_subtitle: `PROGRAM STUDI ${docSettings.program_name || 'PENDIDIKAN BAHASA ARAB'}`,
      show_kop: true,
      show_footer: true,
      show_student_info: true,
      content_mode: 'all',
      body_text_enabled: true,
      body_text_template: 'Dengan ini menerangkan bahwa mahasiswa {{nama_mahasiswa}} (NIM: {{nim}}) adalah mahasiswa aktif pada Program Studi {{program_studi}}...',
      table_enabled: modDef.tableDatasets.length > 0,
      table_dataset_id: modDef.tableDatasets[0]?.datasetId || '',
      columns: modDef.tableDatasets[0]?.availableColumns.map((c) => ({
        id: c.id,
        label: c.label,
        enabled: c.defaultEnabled,
      })) || [],
      rules_note_enabled: false,
      rules_note_title: 'Catatan / Ketentuan:',
      rules_note_text: '1. Dokumen ini sah dan diakui dalam lingkup akademik perguruan tinggi.',
      signatures: [
        { id: 'pemohon', role_label: 'Mahasiswa Pemohon', enabled: true, use_digital_signature: false, signer_status: 'pemohon' },
        { id: 'kaprodi', role_label: 'Ketua Program Studi', enabled: true, use_digital_signature: true, signer_status: 'mengetahui' },
      ],
      copies_enabled: false,
      copies_list: ['Ketua Program Studi', 'Arsip BAAK'],
      placement_targets: [modDef.placements[0]?.id].filter(Boolean),
    };

    createNewTemplate(cleanCode, newTemplate);
    setSelectedDocCode(cleanCode);
    setNewDocModalOpen(false);
    setNewDocName('');
    setNewDocCode('');
    toast.success(`Dokumen "${newDocName}" berhasil dibuat!`);
  };

  // Delete Document Handler
  const handleDeleteDocument = () => {
    if (['kartu_bimbingan_ta', 'krs', 'kartu_bimbingan_dpa'].includes(selectedDocCode)) {
      toast.error('Dokumen sistem bawaan tidak dapat dihapus.');
      return;
    }
    if (confirm(`Yakin ingin menghapus dokumen "${currentTemplate.name}"?`)) {
      deleteTemplate(selectedDocCode);
      setSelectedDocCode('kartu_bimbingan_ta');
      toast.success('Dokumen berhasil dihapus.');
    }
  };

  // Save Handler
  const handleSave = () => {
    updateSingleTemplate(selectedDocCode, currentTemplate);
  };

  // Reset to default
  const handleReset = () => {
    if (defaultDocumentTemplates[selectedDocCode]) {
      setCurrentTemplate(defaultDocumentTemplates[selectedDocCode]);
      toast.info('Template dikembalikan ke pengaturan default sistem.');
    } else {
      toast.info('Dokumen kustom tidak memiliki reset bawaan sistem.');
    }
  };

  // Active module definition
  const activeModule = getDataSourceModuleById(currentTemplate.data_source_module || 'tugas_akhir');
  const allModules = getAllDataSourceModules();

  // Dummy context for live preview
  const dummyContext = getDummyContextForModule(activeModule.id, docSettings);
  const previewBodyText = interpolateVariables(currentTemplate.body_text_template || '', dummyContext);

  const isPortrait = (currentTemplate.orientation || 'portrait') === 'portrait';
  const currentContentMode = currentTemplate.content_mode || 'all';

  return (
    <div className="space-y-6">
      {/* HEADER SECTION: PILIH / TAMBAH DOKUMEN & AKSI SIMPAN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-card border rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="min-w-[240px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Pilih Dokumen:</Label>
            <Select value={selectedDocCode} onValueChange={handleDocCodeChange}>
              <SelectTrigger className="font-semibold">
                <SelectValue placeholder="Pilih dokumen..." />
              </SelectTrigger>
              <SelectContent>
                {Object.values(templatesMap).map((tmpl) => (
                  <SelectItem key={tmpl.code} value={tmpl.code}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span>{tmpl.name}</span>
                      {['kartu_bimbingan_ta', 'krs'].includes(tmpl.code) && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">Bawaan</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={newDocModalOpen} onOpenChange={setNewDocModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 sm:mt-5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Tambah Dokumen Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Buat Dokumen Kustom Baru</DialogTitle>
                <DialogDescription className="text-xs">
                  Buat formulir atau surat resmi baru berbasis data aplikasi kampus.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 py-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nama Dokumen</Label>
                  <Input
                    placeholder="Contoh: Surat Keterangan Bimbingan Aktif"
                    value={newDocName}
                    onChange={(e) => {
                      setNewDocName(e.target.value);
                      if (!newDocCode) {
                        setNewDocCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                      }
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Kode Unik Dokumen</Label>
                  <Input
                    placeholder="Contoh: surat_bimbingan_aktif"
                    value={newDocCode}
                    onChange={(e) => setNewDocCode(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Hanya huruf kecil, angka, dan underscore.</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Modul Sumber Data</Label>
                  <Select value={newDocModule} onValueChange={setNewDocModule}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih modul..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allModules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-xs">{m.name}</span>
                            <span className="text-[10px] text-muted-foreground">{m.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setNewDocModalOpen(false)}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleCreateDocument}>
                  Buat Dokumen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {!['kartu_bimbingan_ta', 'krs', 'kartu_bimbingan_dpa'].includes(selectedDocCode) && (
            <Button
              variant="ghost"
              size="sm"
              className="sm:mt-5 text-xs text-destructive hover:bg-destructive/10"
              onClick={handleDeleteDocument}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Hapus
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isUpdating} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isUpdating} className="gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" />
            {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN BUILDER & LIVE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 COLS): REORDERED DYNAMIC BUILDER FORMS */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* ============================================================== */}
          {/* 1. CEKLIST FOOTER DAN KOP SURAT                                */}
          {/* ============================================================== */}
          <Card className="shadow-xs border-primary/20">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  1. Ceklist Footer dan Kop Surat
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-normal">
                  Layout & Header-Footer
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Tentukan elemen kop surat institusi, footer catatan kaki, serta posisi lembar dokumen.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Checklist Kop Surat */}
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Kop Surat</Label>
                    <p className="text-[10px] text-muted-foreground">Header resmi institusi</p>
                  </div>
                  <Switch
                    checked={currentTemplate.show_kop}
                    onCheckedChange={(checked) => updateTemplateField('show_kop', checked)}
                  />
                </div>

                {/* Checklist Footer Dokumen */}
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Footer Dokumen</Label>
                    <p className="text-[10px] text-muted-foreground">Catatan kaki & halaman</p>
                  </div>
                  <Switch
                    checked={currentTemplate.show_footer !== false}
                    onCheckedChange={(checked) => updateTemplateField('show_footer', checked)}
                  />
                </div>

                {/* Checklist Biodata Mahasiswa */}
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Biodata Mahasiswa</Label>
                    <p className="text-[10px] text-muted-foreground">Kotak Nama, NIM, Prodi</p>
                  </div>
                  <Switch
                    checked={currentTemplate.show_student_info}
                    onCheckedChange={(checked) => updateTemplateField('show_student_info', checked)}
                  />
                </div>
              </div>

              {/* Orientasi Lembar Kertas */}
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium">Orientasi Kertas Cetak</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Ditentukan langsung oleh Admin agar format cetak terkunci rapi bagi civitas.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={isPortrait ? 'default' : 'outline'}
                      className="h-8 text-xs justify-center gap-1"
                      onClick={() => updateTemplateField('orientation', 'portrait')}
                    >
                      <FileText className="h-3 w-3" />
                      Portrait (Tegak)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!isPortrait ? 'default' : 'outline'}
                      className="h-8 text-xs justify-center gap-1"
                      onClick={() => updateTemplateField('orientation', 'landscape')}
                    >
                      <FileText className="h-3 w-3 rotate-90" />
                      Landscape (Mendatar)
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============================================================== */}
          {/* 2. JUDUL UTAMA DOKUMEN                                         */}
          {/* ============================================================== */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                2. Judul Utama Dokumen
              </CardTitle>
              <CardDescription className="text-xs">
                Tentukan teks judul resmi dan subjudul identitas dokumen.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Judul Utama Dokumen (Kapital)</Label>
                <Input
                  value={currentTemplate.document_title}
                  onChange={(e) => updateTemplateField('document_title', e.target.value)}
                  placeholder="Contoh: KARTU KENDALI BIMBINGAN TUGAS AKHIR"
                  className="font-bold text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Subjudul Dokumen</Label>
                <Input
                  value={currentTemplate.document_subtitle}
                  onChange={(e) => updateTemplateField('document_subtitle', e.target.value)}
                  placeholder="Contoh: PROGRAM STUDI PENDIDIKAN BAHASA ARAB"
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* ============================================================== */}
          {/* 3. TEKS EDITOR / TABEL BUILDER (PILIHAN & DATABASE BEBAS)      */}
          {/* ============================================================== */}
          <Card className="shadow-xs border-primary/20">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4 text-primary" />
                    3. Teks Editor & Tabel Builder
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Admin dapat memilih format teks editor, tabel builder, atau keduanya. Database bebas dipilih dan kolom/narasi bisa ditambah.
                  </CardDescription>
                </div>

                <Badge variant="outline" className="text-[10px] w-fit">
                  Database: {activeModule.name}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* PEMILIHAN DATABASE BEBAS */}
              <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Database className="h-4 w-4 text-primary" />
                    Pilih Modul Sumber Data Database:
                  </div>
                  <Select
                    value={currentTemplate.data_source_module || 'tugas_akhir'}
                    onValueChange={(val) => {
                      updateTemplateField('data_source_module', val);
                      const mod = getDataSourceModuleById(val);
                      if (mod.tableDatasets[0]) {
                        updateTemplateField('table_dataset_id', mod.tableDatasets[0].datasetId);
                        updateTemplateField(
                          'columns',
                          mod.tableDatasets[0].availableColumns.map((c) => ({
                            id: c.id,
                            label: c.label,
                            enabled: c.defaultEnabled,
                          }))
                        );
                      }
                      toast.success(`Modul data dialihkan ke ${mod.name}`);
                    }}
                  >
                    <SelectTrigger className="text-xs h-8 sm:w-[260px] bg-white">
                      <SelectValue placeholder="Pilih modul..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allModules.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">{activeModule.description}</p>
              </div>

              {/* PEMILIHAN TIPE KONTEN: TEKS EDITOR ATAU TABEL BUILDER ATAU KEDUANYA */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pilih Format Isi Dokumen:</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleContentModeChange('all')}
                    className={`py-2 px-3 text-xs rounded-lg border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                      currentContentMode === 'all'
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <AlignLeft className="h-3.5 w-3.5" /> + <TableIcon className="h-3.5 w-3.5" />
                    </span>
                    <span>Keduanya (Teks & Tabel)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleContentModeChange('text_only')}
                    className={`py-2 px-3 text-xs rounded-lg border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                      currentContentMode === 'text_only'
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                    <span>Hanya Teks Editor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleContentModeChange('table_only')}
                    className={`py-2 px-3 text-xs rounded-lg border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                      currentContentMode === 'table_only'
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                    <span>Hanya Tabel Builder</span>
                  </button>
                </div>
              </div>

              {/* A. BAGIAN TEKS EDITOR / NARASI */}
              {currentContentMode !== 'table_only' && (
                <div className="p-3.5 border border-primary/20 bg-card rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                      <AlignLeft className="h-3.5 w-3.5 text-primary" />
                      Teks Editor / Narasi Surat Keterangan
                    </div>
                    <Switch
                      checked={currentTemplate.body_text_enabled !== false}
                      onCheckedChange={(checked) => updateTemplateField('body_text_enabled', checked)}
                    />
                  </div>

                  {currentTemplate.body_text_enabled !== false && (
                    <div className="space-y-3">
                      {/* TOOLBAR SISIPKAN REFERENSI DATABASE */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border rounded-lg">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5 text-primary" />
                          Variabel Database:
                        </span>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="default" className="h-7 text-xs gap-1.5 shadow-xs">
                              <Plus className="h-3.5 w-3.5" />
                              Sisipkan Data Database
                              <ChevronDown className="h-3 w-3 opacity-70" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" align="end">
                            <div className="space-y-2.5">
                              <div className="border-b pb-1.5">
                                <p className="font-semibold text-xs text-foreground">
                                  Pilih Kolom Data ({activeModule.name})
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Klik item untuk menyisipkan placeholder otomatis di posisi kursor teks.
                                </p>
                              </div>
                              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                {activeModule.textVariables.map((v) => (
                                  <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => handleInsertVariable(v.key)}
                                    className="w-full text-left p-1.5 rounded hover:bg-primary/10 transition-colors flex items-center justify-between border border-transparent hover:border-primary/20 text-xs group"
                                  >
                                    <div>
                                      <p className="font-medium text-slate-900 group-hover:text-primary">{v.label}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">{`{{${v.key}}}`}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal uppercase">
                                      {v.category}
                                    </Badge>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* QUICK CHIPS SHORTCUT */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Sisip Cepat:</span>
                        {activeModule.textVariables.slice(0, 5).map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => handleInsertVariable(v.key)}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 hover:bg-primary/15 hover:text-primary border transition-colors"
                            title={v.label}
                          >
                            + {v.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <Textarea
                          ref={textareaRef}
                          rows={4}
                          value={currentTemplate.body_text_template || ''}
                          onChange={(e) => updateTemplateField('body_text_template', e.target.value)}
                          placeholder="Ketik narasi surat di sini. Gunakan tombol 'Sisipkan Data Database' untuk menyisipkan nilai data..."
                          className="text-xs leading-relaxed font-sans"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Placeholder seperti <code className="bg-muted px-1 rounded font-mono">{`{{nama_mahasiswa}}`}</code> otomatis diisi dengan data asli dari database kampus saat dicetak.
                        </p>
                      </div>

                      {/* Sub-Bab Catatan / Tata Tertib Tambahan */}
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            Sertakan Poin Catatan / Tata Tertib di Bawah Teks
                          </Label>
                          <Switch
                            checked={currentTemplate.rules_note_enabled}
                            onCheckedChange={(checked) => updateTemplateField('rules_note_enabled', checked)}
                          />
                        </div>
                        {currentTemplate.rules_note_enabled && (
                          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                            <Input
                              value={currentTemplate.rules_note_title}
                              onChange={(e) => updateTemplateField('rules_note_title', e.target.value)}
                              placeholder="Ketentuan & Tata Tertib:"
                              className="text-xs font-semibold h-7"
                            />
                            <Textarea
                              rows={2}
                              value={currentTemplate.rules_note_text}
                              onChange={(e) => updateTemplateField('rules_note_text', e.target.value)}
                              placeholder="1. Poin aturan..."
                              className="text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* B. BAGIAN TABEL BUILDER (DATA BERULANG) */}
              {currentContentMode !== 'text_only' && (
                <div className="p-3.5 border border-primary/20 bg-card rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                      <TableIcon className="h-3.5 w-3.5 text-primary" />
                      Tabel Builder (Kolom Data Dinamis)
                    </div>
                    <Switch
                      checked={currentTemplate.table_enabled !== false}
                      onCheckedChange={(checked) => updateTemplateField('table_enabled', checked)}
                    />
                  </div>

                  {currentTemplate.table_enabled !== false && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Daftar Kolom Tabel:</span>
                        <span className="text-[10px] text-muted-foreground">Aktifkan & sesuaikan judul kolom</span>
                      </div>

                      <div className="space-y-2 border rounded-lg p-2.5 bg-slate-50">
                        {currentTemplate.columns.map((col) => (
                          <div
                            key={col.id}
                            className="flex items-center justify-between gap-3 p-1.5 bg-white border rounded text-xs"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Switch
                                checked={col.enabled}
                                onCheckedChange={(checked) => toggleColumn(col.id, checked)}
                              />
                              <Input
                                value={col.label}
                                onChange={(e) => updateColumnLabel(col.id, e.target.value)}
                                className="h-7 text-xs font-medium max-w-[200px]"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground font-mono">id: {col.id}</span>
                              {col.is_custom && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveColumn(col.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* FORM TAMBAH KOLOM BARU (BISA DITAMBAH) */}
                      <div className="flex items-center gap-2 pt-1 border-t">
                        <Input
                          placeholder="Nama kolom baru (contoh: Keterangan / Tindak Lanjut)..."
                          value={newColumnLabel}
                          onChange={(e) => setNewColumnLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddColumn();
                            }
                          }}
                          className="h-8 text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAddColumn}
                          className="h-8 text-xs gap-1 whitespace-nowrap"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Tambah Kolom
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============================================================== */}
          {/* 4. PENGESAHAN & TANDA TANGAN                                   */}
          {/* ============================================================== */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  4. Pengesahan & Tanda Tangan
                </CardTitle>
                <Button size="sm" variant="outline" onClick={addSigner} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Tambah Penandatangan
                </Button>
              </div>
              <CardDescription className="text-xs">
                Tentukan siapa saja yang menandatangani, status peran (Menyetujui/Mengetahui), serta daftar tembusan resmi.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* DAFTAR PENANDATANGAN */}
              <div className="space-y-3">
                {currentTemplate.signatures.map((sig, idx) => (
                  <div key={sig.id} className="p-3 border rounded-lg bg-slate-50 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={sig.enabled}
                          onCheckedChange={(checked) => updateSignerField(sig.id, 'enabled', checked)}
                        />
                        <span className="font-semibold text-slate-800">Penandatangan #{idx + 1}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => removeSigner(sig.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Label Jabatan</Label>
                        <Input
                          value={sig.role_label}
                          onChange={(e) => updateSignerField(sig.id, 'role_label', e.target.value)}
                          placeholder="Contoh: Dosen Pembimbing I / Ketua Program Studi"
                          className="h-7 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">Status Pengesahan</Label>
                        <Select
                          value={sig.signer_status || 'mengetahui'}
                          onValueChange={(val) => updateSignerField(sig.id, 'signer_status', val)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mengetahui" className="text-xs">Mengetahui</SelectItem>
                            <SelectItem value="menyetujui" className="text-xs">Menyetujui</SelectItem>
                            <SelectItem value="pemohon" className="text-xs">Pemohon / Mahasiswa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Nama Kustom (Opsional)</Label>
                        <Input
                          value={sig.custom_name || ''}
                          onChange={(e) => updateSignerField(sig.id, 'custom_name', e.target.value)}
                          placeholder="Kosongkan jika otomatis dari akun..."
                          className="h-7 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">NIDN / NUPTK / NIP</Label>
                        <Input
                          value={sig.custom_id_number || ''}
                          onChange={(e) => updateSignerField(sig.id, 'custom_id_number', e.target.value)}
                          placeholder="Nomor identitas dosen..."
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-[11px] text-muted-foreground">Metode Tanda Tangan:</span>
                      <div className="flex items-center gap-1 bg-muted p-0.5 rounded text-[10px]">
                        <button
                          type="button"
                          onClick={() => updateSignerField(sig.id, 'use_digital_signature', true)}
                          className={`px-2 py-0.5 rounded transition-all ${
                            sig.use_digital_signature ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'
                          }`}
                        >
                          Digital (Akun)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSignerField(sig.id, 'use_digital_signature', false)}
                          className={`px-2 py-0.5 rounded transition-all ${
                            !sig.use_digital_signature ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'
                          }`}
                        >
                          Tanda Tangan Basah
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DAFTAR TEMBUSAN RESMI (CARBON COPY / CC) */}
              <div className="pt-3 border-t space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-primary" />
                      Tembusan (Carbon Copy / CC)
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Daftar pihak penerima tembusan resmi dokumen</p>
                  </div>
                  <Switch
                    checked={currentTemplate.copies_enabled || false}
                    onCheckedChange={(checked) => updateTemplateField('copies_enabled', checked)}
                  />
                </div>

                {currentTemplate.copies_enabled && (
                  <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Contoh: Dekan Fakultas Tarbiyah / Arsip BAAK..."
                        value={newCopyItem}
                        onChange={(e) => setNewCopyItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCopyItem();
                          }
                        }}
                        className="h-8 text-xs"
                      />
                      <Button size="sm" onClick={addCopyItem} className="h-8 text-xs gap-1">
                        <Plus className="h-3.5 w-3.5" /> Tambah
                      </Button>
                    </div>

                    <div className="space-y-1.5 border rounded-lg p-2.5 bg-slate-50 text-xs">
                      {currentTemplate.copies_list && currentTemplate.copies_list.length > 0 ? (
                        currentTemplate.copies_list.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1 bg-white border rounded">
                            <span>{idx + 1}. {item}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-destructive"
                              onClick={() => removeCopyItem(idx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-muted-foreground text-center py-1">Belum ada tembusan.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ============================================================== */}
          {/* 5. PENEMPATAN TOMBOL CETAK                                     */}
          {/* ============================================================== */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                5. Penempatan Tombol Cetak di Aplikasi
              </CardTitle>
              <CardDescription className="text-xs">
                Tentukan di halaman mana saja tombol cetak dokumen ini akan aktif dan siapa saja role yang dapat mencetaknya.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {activeModule.placements.map((plc) => {
                const isChecked = (currentTemplate.placement_targets || []).includes(plc.id);
                return (
                  <div
                    key={plc.id}
                    onClick={() => togglePlacement(plc.id)}
                    className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{plc.label}</p>
                      <p className="text-[10px] text-muted-foreground">Lokasi: {plc.page} (Akses: {plc.targetRole})</p>
                    </div>
                    <Switch checked={isChecked} onCheckedChange={() => togglePlacement(plc.id)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN (5 COLS): REAL-TIME LIVE SHEET PREVIEW */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <Card className="shadow-md border-primary/20">
            <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  Pratinjau Lembar Kertas
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Skala simulasi: {docSettings.paper_size} ({currentTemplate.orientation || 'portrait'})
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {docSettings.paper_size}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold uppercase">
                  {currentTemplate.orientation || 'portrait'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 bg-muted/40 flex justify-center overflow-x-auto">
              {/* LEMBAR KERTAS FISIK SIMULASI */}
              <div
                className={`w-full bg-white text-slate-900 shadow-md rounded-sm border transition-all flex flex-col justify-between overflow-hidden ${
                  isPortrait ? 'max-w-[340px] aspect-[1/1.414]' : 'max-w-[480px] aspect-[1.414/1]'
                }`}
                style={{
                  paddingTop: `${Math.max(docSettings.margin_top / 3, 6)}px`,
                  paddingBottom: `${Math.max(docSettings.margin_bottom / 3, 6)}px`,
                  paddingLeft: `${Math.max(docSettings.margin_left / 3, 8)}px`,
                  paddingRight: `${Math.max(docSettings.margin_right / 3, 8)}px`,
                }}
              >
                {/* 1. KOP SURAT */}
                {currentTemplate.show_kop && docSettings.header_mode !== 'none' && (
                  <div className="w-full mb-2">
                    {docSettings.header_mode === 'image' && docSettings.header_image_url ? (
                      <div
                        className="w-full mb-1 overflow-hidden"
                        style={
                          docSettings.header_image_full_bleed
                            ? {
                                marginTop: `-${Math.max(docSettings.margin_top / 3, 6)}px`,
                                marginLeft: `-${Math.max(docSettings.margin_left / 3, 8)}px`,
                                marginRight: `-${Math.max(docSettings.margin_right / 3, 8)}px`,
                                width: `calc(100% + ${Math.max(docSettings.margin_left / 3, 8) + Math.max(docSettings.margin_right / 3, 8)}px)`,
                              }
                            : undefined
                        }
                      >
                        <img
                          src={docSettings.header_image_url}
                          alt="Kop"
                          className={`w-full block ${
                            docSettings.header_image_height_mode === 'auto' ? 'h-auto' : 'object-cover object-top'
                          }`}
                          style={
                            docSettings.header_image_height_mode === 'auto'
                              ? undefined
                              : { height: `${Math.round((docSettings.header_image_height_mm || 35) * 1.3)}px` }
                          }
                        />
                      </div>
                    ) : (
                      <div className="w-full border-b-[1.5px] border-b-slate-900 pb-1 mb-1">
                        <div className="text-center leading-tight">
                          <p className="text-[7px] text-slate-700 font-medium">{docSettings.institution_line_1}</p>
                          <p className="text-[8px] font-bold text-slate-900">{docSettings.institution_line_2}</p>
                          <p className="text-[7px] font-semibold text-slate-800">
                            {docSettings.faculty_name} - {docSettings.program_name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. AREA KONTEN DOKUMEN */}
                <div className="flex-1 flex flex-col justify-between py-1 text-[7px] space-y-2">
                  <div>
                    {/* Judul Dokumen */}
                    <div className="text-center font-bold text-[8.5px] uppercase tracking-wide border-b pb-0.5 mb-1.5">
                      {currentTemplate.document_title}
                    </div>

                    {/* Biodata Mahasiswa Mini */}
                    {currentTemplate.show_student_info && (
                      <div className="grid grid-cols-2 gap-1 text-[6.5px] text-slate-700 bg-slate-50 p-1 rounded border border-slate-200 mb-1.5">
                        <div>Nama : <strong>{dummyContext.nama_mahasiswa || 'Ahmad Fauzi'}</strong></div>
                        <div>NIM : <strong>{dummyContext.nim || '422026'}</strong></div>
                        <div>Prodi : <strong>{dummyContext.program_studi || 'PBA'}</strong></div>
                        <div>Angkatan : <strong>{dummyContext.tahun_angkatan || '2023'}</strong></div>
                      </div>
                    )}

                    {/* Teks Narasi / Surat Keterangan */}
                    {currentContentMode !== 'table_only' && currentTemplate.body_text_enabled !== false && previewBodyText && (
                      <div className="p-1 text-[6.5px] leading-relaxed text-slate-800 border-l-2 border-primary/40 bg-slate-50/50 mb-1.5">
                        {previewBodyText}
                      </div>
                    )}

                    {/* Tabel Data Dummy */}
                    {currentContentMode !== 'text_only' && currentTemplate.table_enabled !== false && (
                      <table className="w-full border-collapse border border-slate-300 text-[6px]">
                        <thead>
                          <tr className="bg-slate-100">
                            {currentTemplate.columns
                              .filter((c) => c.enabled)
                              .map((c) => (
                                <th key={c.id} className="border border-slate-300 p-0.5 text-center font-semibold">
                                  {c.label}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {currentTemplate.columns
                              .filter((c) => c.enabled)
                              .map((c, i) => (
                                <td key={c.id} className="border border-slate-300 p-0.5 text-center text-slate-600">
                                  {i === 0 ? '1' : i === currentTemplate.columns.filter((col) => col.enabled).length - 1 ? '[Paraf]' : 'Data Contoh'}
                                </td>
                              ))}
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {/* Sub-Bab Catatan */}
                    {currentTemplate.rules_note_enabled && currentTemplate.rules_note_text && (
                      <div className="mt-1.5 p-1 bg-slate-50 border border-slate-200 rounded text-[5.5px] text-slate-600">
                        <p className="font-bold text-slate-800">{currentTemplate.rules_note_title}</p>
                        <p className="truncate">{currentTemplate.rules_note_text}</p>
                      </div>
                    )}
                  </div>

                  {/* Pengesahan Tanda Tangan */}
                  <div>
                    <div className="text-right text-[6px] text-slate-500 mb-0.5">
                      {docSettings.default_city || 'Ponorogo'}, 21 Oktober 2026
                    </div>
                    <div className="flex justify-around items-end pt-0.5 text-center text-[6px]">
                      {currentTemplate.signatures
                        .filter((s) => s.enabled)
                        .slice(0, 3)
                        .map((sig) => (
                          <div key={sig.id} className="flex flex-col items-center">
                            {sig.signer_status && sig.signer_status !== 'pemohon' && (
                              <span className="text-[5px] uppercase font-semibold text-slate-400">
                                {sig.signer_status === 'mengetahui' ? 'Mengetahui,' : 'Menyetujui,'}
                              </span>
                            )}
                            <p className="text-[5.5px] text-slate-600">{sig.role_label},</p>
                            <div className="h-5 flex items-center justify-center font-serif text-[6px] italic text-slate-400">
                              (Ttd)
                            </div>
                            <p className="font-semibold text-slate-800 underline">
                              {sig.custom_name || (sig.id === 'kaprodi' ? docSettings.kaprodi_name || 'Dr. Fulan' : 'Nama Pejabat')}
                            </p>
                          </div>
                        ))}
                    </div>

                    {/* Tembusan Mini */}
                    {currentTemplate.copies_enabled && currentTemplate.copies_list && currentTemplate.copies_list.length > 0 && (
                      <div className="mt-1 pt-1 border-t text-[5px] text-slate-500">
                        <span className="font-semibold">Tembusan: </span>
                        <span>{currentTemplate.copies_list.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. FOOTER */}
                {docSettings.footer_enabled && currentTemplate.show_footer !== false && (
                  <div className="border-t border-slate-200 pt-0.5 mt-1 flex justify-between items-center text-[5px] text-slate-500">
                    <p className="truncate max-w-[200px]">{docSettings.footer_text}</p>
                    {docSettings.show_page_number && <span>Hal. 1/1</span>}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="py-2.5 px-4 border-t flex justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Pratinjau simulasi data modul {activeModule.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => window.print()}
              >
                <Printer className="h-3 w-3" /> Uji Cetak
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
