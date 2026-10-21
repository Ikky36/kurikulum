import React, { useState, useEffect, useRef } from 'react';
import { useDocumentSettings, DocumentLayoutSettings, defaultDocumentSettings } from '@/lib/documentSettings';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  FileText,
  Printer,
  Upload,
  Trash2,
  RotateCcw,
  Save,
  CheckCircle2,
  Eye,
  Sliders,
  Image as ImageIcon,
  Building,
  UserCheck,
  Maximize2,
  Info
} from 'lucide-react';
import { DocumentTemplateCustomizer } from './DocumentTemplateCustomizer';
import { UniversalDocumentContainer } from '@/components/document/UniversalDocumentContainer';
import { printElementById } from '@/lib/printUtils';

export function DocumentSettingsTab() {
  const { user } = useAuth();
  const { settings, isLoading, updateSettings, isUpdating } = useDocumentSettings();
  const [form, setForm] = useState<DocumentLayoutSettings>(settings);
  const [activeMainTab, setActiveMainTab] = useState<'layout' | 'templates'>('layout');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Hidden File Input Refs
  const headerImageInputRef = useRef<HTMLInputElement | null>(null);
  const logoLeftInputRef = useRef<HTMLInputElement | null>(null);
  const logoRightInputRef = useRef<HTMLInputElement | null>(null);
  const footerImageInputRef = useRef<HTMLInputElement | null>(null);

  // Sync form when settings data loads
  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  // Update field helper
  const updateField = <K extends keyof DocumentLayoutSettings>(key: K, value: DocumentLayoutSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Image Upload Handler (Max 1 MB)
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldKey: 'header_image_url' | 'header_logo_left_url' | 'header_logo_right_url' | 'footer_image_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';

    const MAX_SIZE_MB = 1;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Ukuran file melebihi ${MAX_SIZE_MB} MB. Harap perkecil ukuran file gambar.`);
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format gambar harus PNG, JPG, atau WebP.');
      return;
    }

    setUploadingField(fieldKey);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const timestamp = Date.now();
      const filePath = `app/documents/${fieldKey}_${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${timestamp}`;
      updateField(fieldKey, publicUrl);
      toast.success('Gambar berhasil diunggah');
    } catch (err: any) {
      toast.error('Gagal mengunggah gambar: ' + err.message);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = () => {
    updateSettings(form);
  };

  const handleReset = () => {
    setForm(defaultDocumentSettings);
    toast.info('Form dikembalikan ke pengaturan default (belum disimpan)');
  };

  // Test Print simulation via isolated print iframe
  const handleTestPrint = async () => {
    toast.loading('Menyiapkan lembar uji cetak kop...', { id: 'test-print-kop' });
    try {
      await printElementById('admin-kop-printable-sheet', {
        paperSize: form.paper_size,
        orientation: form.orientation,
        marginTop: form.margin_top,
        marginBottom: form.margin_bottom,
        marginLeft: form.margin_left,
        marginRight: form.margin_right,
        title: `Uji Cetak Kop & Lembar - ${form.institution_line_1 || 'STITMA'}`,
      });
      toast.success('Dialog cetak berhasil dibuka.', { id: 'test-print-kop' });
    } catch (e) {
      console.error(e);
      toast.error('Gagal mencetak dokumen.', { id: 'test-print-kop' });
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
        </CardHeader>
        <CardContent className="h-96" />
      </Card>
    );
  }

  // Calculate aspect ratio for preview
  const isA4 = form.paper_size === 'A4';
  const isPortrait = form.orientation === 'portrait';
  // A4: 210 x 297 (ratio: 1 : 1.414)
  // F4: 215 x 330 (ratio: 1 : 1.535)
  const ratioStyle = isPortrait
    ? isA4 ? 'aspect-[210/297]' : 'aspect-[215/330]'
    : isA4 ? 'aspect-[297/210]' : 'aspect-[330/215]';

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Pengaturan Lembar Dokumen & Kop Surat
              </CardTitle>
              <CardDescription>
                Atur format lembar kertas (A4/F4), kop surat instansi, margin, dan footer untuk seluruh dokumen resmi aplikasi.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={isUpdating}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Default
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                <Save className="h-4 w-4 mr-1.5" />
                {isUpdating ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sub-Navigasi Pengaturan Dokumen */}
      <Tabs value={activeMainTab} onValueChange={(val) => setActiveMainTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-2 max-w-md bg-muted p-1">
          <TabsTrigger value="layout" className="text-xs font-semibold py-2">
            <Sliders className="h-4 w-4 mr-1.5" />
            1. Format Lembar & Kop Surat
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs font-semibold py-2">
            <FileText className="h-4 w-4 mr-1.5" />
            2. Kustomisasi Dokumen & Kolom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* PANEL KIRI: FORM PENGATURAN (7 Kolom) */}
        <div className="lg:col-span-7 space-y-6">
          <Tabs defaultValue="kertas" className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted">
              <TabsTrigger value="kertas" className="text-xs py-2">
                <Sliders className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Kertas & Margin
              </TabsTrigger>
              <TabsTrigger value="kop" className="text-xs py-2">
                <Building className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Kop Surat
              </TabsTrigger>
              <TabsTrigger value="footer" className="text-xs py-2">
                <FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Footer
              </TabsTrigger>
              <TabsTrigger value="pejabat" className="text-xs py-2">
                <UserCheck className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Pengesahan
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: KERTAS & MARGIN */}
            <TabsContent value="kertas" className="space-y-4 pt-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ukuran Kertas & Orientasi</CardTitle>
                  <CardDescription className="text-xs">
                    Pilih ukuran standar cetak dokumen yang berlaku di kampus Anda.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Paper Size */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Ukuran Kertas</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={form.paper_size === 'A4' ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col items-start gap-1 justify-start text-left"
                        onClick={() => updateField('paper_size', 'A4')}
                      >
                        <div className="font-semibold text-sm flex items-center justify-between w-full">
                          A4
                          {form.paper_size === 'A4' && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <span className="text-[11px] opacity-80 font-normal">210 × 297 mm (Standar Umum)</span>
                      </Button>

                      <Button
                        type="button"
                        variant={form.paper_size === 'F4' ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col items-start gap-1 justify-start text-left"
                        onClick={() => updateField('paper_size', 'F4')}
                      >
                        <div className="font-semibold text-sm flex items-center justify-between w-full">
                          F4 / Folio
                          {form.paper_size === 'F4' && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <span className="text-[11px] opacity-80 font-normal">215 × 330 mm (Standar Berkas RI)</span>
                      </Button>
                    </div>
                  </div>

                  {/* Orientation */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Orientasi Halaman Default</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={form.orientation === 'portrait' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateField('orientation', 'portrait')}
                      >
                        Portrait (Tegak)
                      </Button>
                      <Button
                        type="button"
                        variant={form.orientation === 'landscape' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateField('orientation', 'landscape')}
                      >
                        Landscape (Mendatar)
                      </Button>
                    </div>
                  </div>

                  {/* Margins */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-semibold">Margin Halaman (dalam milimeter / mm)</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Menentukan batas jarak aman isi konten terhadap tepi kertas (1 cm = 10 mm).
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Atas (Top)</Label>
                        <Input
                          type="number"
                          min={5}
                          max={60}
                          value={form.margin_top}
                          onChange={(e) => updateField('margin_top', Number(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Bawah (Bottom)</Label>
                        <Input
                          type="number"
                          min={5}
                          max={60}
                          value={form.margin_bottom}
                          onChange={(e) => updateField('margin_bottom', Number(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Kiri (Left - Jilid)</Label>
                        <Input
                          type="number"
                          min={5}
                          max={60}
                          value={form.margin_left}
                          onChange={(e) => updateField('margin_left', Number(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Kanan (Right)</Label>
                        <Input
                          type="number"
                          min={5}
                          max={60}
                          value={form.margin_right}
                          onChange={(e) => updateField('margin_right', Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: KOP SURAT (HEADER) */}
            <TabsContent value="kop" className="space-y-4 pt-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Format Kop Surat (Header)</CardTitle>
                  <CardDescription className="text-xs">
                    Pilih apakah kop surat dibuat dari teks + logo atau gambar banner yang telah didesain dari percetakan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Header Mode Radio */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={form.header_mode === 'text' ? 'default' : 'outline'}
                      className="text-xs h-auto py-2.5 flex-col gap-1"
                      onClick={() => updateField('header_mode', 'text')}
                    >
                      <Building className="h-4 w-4" />
                      Logo & Teks
                    </Button>
                    <Button
                      type="button"
                      variant={form.header_mode === 'image' ? 'default' : 'outline'}
                      className="text-xs h-auto py-2.5 flex-col gap-1"
                      onClick={() => updateField('header_mode', 'image')}
                    >
                      <ImageIcon className="h-4 w-4" />
                      Gambar Banner
                    </Button>
                    <Button
                      type="button"
                      variant={form.header_mode === 'none' ? 'default' : 'outline'}
                      className="text-xs h-auto py-2.5 flex-col gap-1"
                      onClick={() => updateField('header_mode', 'none')}
                    >
                      <FileText className="h-4 w-4" />
                      Kertas Pracetak
                    </Button>
                  </div>

                  {/* MODE 1: LOGO & TEKS */}
                  {form.header_mode === 'text' && (
                    <div className="space-y-3 pt-2">
                      {/* Logo Uploads */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
                        {/* Logo Kiri */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Logo Kiri (Utama)</Label>
                          <div className="flex items-center gap-2">
                            {form.header_logo_left_url ? (
                              <img
                                src={form.header_logo_left_url}
                                alt="Logo Kiri"
                                className="h-10 w-10 object-contain rounded border bg-white p-1"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded border border-dashed flex items-center justify-center text-muted-foreground text-xs">
                                Logo
                              </div>
                            )}
                            <div className="flex gap-1">
                              <input
                                ref={logoLeftInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, 'header_logo_left_url')}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                disabled={uploadingField === 'header_logo_left_url'}
                                onClick={() => logoLeftInputRef.current?.click()}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                {form.header_logo_left_url ? 'Ganti' : 'Upload'}
                              </Button>
                              {form.header_logo_left_url && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive"
                                  onClick={() => updateField('header_logo_left_url', '')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Logo Kanan (Opsional) */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Logo Kanan (Opsional)</Label>
                          <div className="flex items-center gap-2">
                            {form.header_logo_right_url ? (
                              <img
                                src={form.header_logo_right_url}
                                alt="Logo Kanan"
                                className="h-10 w-10 object-contain rounded border bg-white p-1"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded border border-dashed flex items-center justify-center text-muted-foreground text-xs">
                                Logo
                              </div>
                            )}
                            <div className="flex gap-1">
                              <input
                                ref={logoRightInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, 'header_logo_right_url')}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                disabled={uploadingField === 'header_logo_right_url'}
                                onClick={() => logoRightInputRef.current?.click()}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                {form.header_logo_right_url ? 'Ganti' : 'Upload'}
                              </Button>
                              {form.header_logo_right_url && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive"
                                  onClick={() => updateField('header_logo_right_url', '')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Text Fields */}
                      <div className="space-y-2">
                        <Label className="text-xs">Baris 1 (Yayasan / Lembaga Induk / Kementerian)</Label>
                        <Input
                          value={form.institution_line_1}
                          onChange={(e) => updateField('institution_line_1', e.target.value)}
                          placeholder="Contoh: YAYASAN WAKAF PONDOK MODERN GONTOR"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Baris 2 (Nama Universitas / Perguruan Tinggi)</Label>
                        <Input
                          value={form.institution_line_2}
                          onChange={(e) => updateField('institution_line_2', e.target.value)}
                          placeholder="Contoh: UNIVERSITAS DARUSSALAM GONTOR"
                          className="font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nama Fakultas</Label>
                          <Input
                            value={form.faculty_name}
                            onChange={(e) => updateField('faculty_name', e.target.value)}
                            placeholder="Contoh: FAKULTAS TARBIYAH"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nama Program Studi</Label>
                          <Input
                            value={form.program_name}
                            onChange={(e) => updateField('program_name', e.target.value)}
                            placeholder="Contoh: PENDIDIKAN BAHASA ARAB"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Alamat Kampus</Label>
                        <Input
                          value={form.address_line}
                          onChange={(e) => updateField('address_line', e.target.value)}
                          placeholder="Jl. Raya Siman Km. 6, Ponorogo, Jawa Timur 63471"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Kontak, Email, & Website</Label>
                        <Input
                          value={form.contact_line}
                          onChange={(e) => updateField('contact_line', e.target.value)}
                          placeholder="Telp: (0352) 483762 | Email: pba@unida.gontor.ac.id | Web: unida.gontor.ac.id"
                        />
                      </div>
                    </div>
                  )}

                  {/* MODE 2: GAMBAR BANNER PENUH */}
                  {form.header_mode === 'image' && (
                    <div className="space-y-3 pt-2">
                      <div className="p-4 border-2 border-dashed rounded-lg text-center space-y-3">
                        {form.header_image_url ? (
                          <div className="space-y-3">
                            <div className="border rounded bg-slate-100 p-1 overflow-hidden">
                              <img
                                src={form.header_image_url}
                                alt="Kop Banner"
                                className={`w-full block ${
                                  form.header_image_height_mode === 'auto'
                                    ? 'h-auto max-h-36 object-contain mx-auto'
                                    : 'object-cover object-top'
                                }`}
                                style={
                                  form.header_image_height_mode === 'auto'
                                    ? undefined
                                    : { height: `${Math.round((form.header_image_height_mm || 35) * 2.2)}px` }
                                }
                              />
                            </div>
                            <div className="flex justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingField === 'header_image_url'}
                                onClick={() => headerImageInputRef.current?.click()}
                              >
                                Ganti Banner
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => updateField('header_image_url', '')}
                              >
                                Hapus
                              </Button>
                            </div>

                            {/* PENGATURAN LEBAR & TINGGI BANNER */}
                            <div className="bg-slate-50 border rounded-lg p-3 text-left space-y-3 mt-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <div>
                                  <Label className="text-xs font-semibold">Lebar Banner Kop</Label>
                                  <p className="text-[11px] text-muted-foreground">Bentang kop terhadap batas kertas</p>
                                </div>
                                <div className="flex items-center gap-1 bg-muted p-0.5 rounded text-xs shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={form.header_image_full_bleed ? 'default' : 'ghost'}
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => updateField('header_image_full_bleed', true)}
                                  >
                                    Penuh Kertas (Edge-to-Edge)
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={!form.header_image_full_bleed ? 'default' : 'ghost'}
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => updateField('header_image_full_bleed', false)}
                                  >
                                    Di Dalam Margin
                                  </Button>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-t pt-2.5">
                                <div>
                                  <Label className="text-xs font-semibold">Ketinggian Kop</Label>
                                  <p className="text-[11px] text-muted-foreground">Penyesuaian tinggi area kop surat</p>
                                </div>
                                <div className="flex items-center gap-1 bg-muted p-0.5 rounded text-xs shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={form.header_image_height_mode === 'custom' ? 'default' : 'ghost'}
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => updateField('header_image_height_mode', 'custom')}
                                  >
                                    Atur Tinggi (Presisi mm)
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={form.header_image_height_mode === 'auto' ? 'default' : 'ghost'}
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => updateField('header_image_height_mode', 'auto')}
                                  >
                                    Otomatis (Rasio Asli)
                                  </Button>
                                </div>
                              </div>

                              {form.header_image_height_mode === 'custom' && (
                                <div className="space-y-1.5 pt-1 border-t">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground font-medium">Tinggi Area Kop:</span>
                                    <span className="font-bold text-primary">{form.header_image_height_mm || 35} mm</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="range"
                                      min={15}
                                      max={60}
                                      step={1}
                                      value={form.header_image_height_mm || 35}
                                      onChange={(e) => updateField('header_image_height_mm', Number(e.target.value))}
                                      className="flex-1 accent-primary"
                                    />
                                    <Input
                                      type="number"
                                      className="w-16 h-7 text-xs text-center"
                                      min={15}
                                      max={60}
                                      value={form.header_image_height_mm || 35}
                                      onChange={(e) => updateField('header_image_height_mm', Math.max(15, Math.min(80, Number(e.target.value) || 35)))}
                                    />
                                    <span className="text-xs text-muted-foreground">mm</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                                    💡 <em>Gambar otomatis direntangkan 100% selebar kertas. Bagian kop atas ditampilkan penuh dan ruang kosong/watermark di bawah kop terpotong rapi.</em>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 space-y-2">
                            <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto" />
                            <p className="text-xs text-muted-foreground">
                              Upload 1 berkas gambar kop surat resmi lengkap beresolusi tinggi (Maks. 1 MB).
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              disabled={uploadingField === 'header_image_url'}
                              onClick={() => headerImageInputRef.current?.click()}
                            >
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                              Unggah Gambar Kop
                            </Button>
                          </div>
                        )}
                        <input
                          ref={headerImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'header_image_url')}
                        />
                      </div>
                    </div>
                  )}

                  {/* MODE 3: KERTAS PRACETAK */}
                  {form.header_mode === 'none' && (
                    <div className="p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Mode Kertas Pracetak Aktif</p>
                      <p>
                        Sistem tidak akan mencetak kop surat di layar/file, melainkan hanya menyisakan ruang margin atas (Top Margin)
                        agar cocok saat dimasukkan ke printer berisi kertas fisik yang sudah memiliki kop dari percetakan.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: FOOTER */}
            <TabsContent value="footer" className="space-y-4 pt-3">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Catatan Kaki (Footer)</CardTitle>
                      <CardDescription className="text-xs">
                        Teks atau banner penutup di bagian bawah setiap lembar dokumen.
                      </CardDescription>
                    </div>
                    <Switch
                      checked={form.footer_enabled}
                      onCheckedChange={(checked) => updateField('footer_enabled', checked)}
                    />
                  </div>
                </CardHeader>
                {form.footer_enabled && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={form.footer_mode === 'text' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateField('footer_mode', 'text')}
                      >
                        Teks Catatan
                      </Button>
                      <Button
                        type="button"
                        variant={form.footer_mode === 'image' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateField('footer_mode', 'image')}
                      >
                        Banner Gambar
                      </Button>
                    </div>

                    {form.footer_mode === 'text' ? (
                      <div className="space-y-2">
                        <Label className="text-xs">Teks Catatan Kaki / Disclaimer</Label>
                        <Textarea
                          rows={3}
                          value={form.footer_text}
                          onChange={(e) => updateField('footer_text', e.target.value)}
                          placeholder="Dokumen ini diterbitkan secara sah melalui Sistem Informasi Akademik..."
                        />
                      </div>
                    ) : (
                      <div className="p-3 border rounded text-center space-y-3">
                        {form.footer_image_url ? (
                          <div className="space-y-3">
                            <div className="border rounded bg-slate-100 p-1 overflow-hidden">
                              <img
                                src={form.footer_image_url}
                                alt="Footer Banner"
                                className={`w-full block ${
                                  form.footer_image_height_mode === 'auto'
                                    ? 'h-auto max-h-24 object-contain mx-auto'
                                    : 'object-cover object-bottom'
                                }`}
                                style={
                                  form.footer_image_height_mode === 'auto'
                                    ? undefined
                                    : { height: `${Math.round((form.footer_image_height_mm || 20) * 2.2)}px` }
                                }
                              />
                            </div>
                            <div className="flex justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingField === 'footer_image_url'}
                                onClick={() => footerImageInputRef.current?.click()}
                              >
                                Ganti Banner
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => updateField('footer_image_url', '')}
                              >
                                Hapus
                              </Button>
                            </div>

                            {/* PENGATURAN LEBAR & TINGGI FOOTER */}
                            <div className="bg-slate-50 border rounded-lg p-3 text-left space-y-3 mt-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <div>
                                  <Label className="text-xs font-semibold">Lebar Banner Footer</Label>
                                  <p className="text-[11px] text-muted-foreground">Bentang banner terhadap batas kertas</p>
                                </div>
                                <div className="flex items-center gap-1 bg-muted p-0.5 rounded text-xs shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={form.footer_image_full_bleed ? 'default' : 'ghost'}
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => updateField('footer_image_full_bleed', true)}
                                  >
                                    Penuh Kertas (Edge-to-Edge)
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={!form.footer_image_full_bleed ? 'default' : 'ghost'}
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => updateField('footer_image_full_bleed', false)}
                                  >
                                    Di Dalam Margin
                                  </Button>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-t pt-2.5">
                                <div>
                                  <Label className="text-xs font-semibold">Ketinggian Footer</Label>
                                  <p className="text-[11px] text-muted-foreground">Penyesuaian tinggi area footer</p>
                                </div>
                                <div className="flex items-center gap-1 bg-muted p-0.5 rounded text-xs shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={form.footer_image_height_mode === 'custom' ? 'default' : 'ghost'}
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => updateField('footer_image_height_mode', 'custom')}
                                  >
                                    Atur Tinggi (Presisi mm)
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={form.footer_image_height_mode === 'auto' ? 'default' : 'ghost'}
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => updateField('footer_image_height_mode', 'auto')}
                                  >
                                    Otomatis (Rasio Asli)
                                  </Button>
                                </div>
                              </div>

                              {form.footer_image_height_mode === 'custom' && (
                                <div className="space-y-1.5 pt-1 border-t">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground font-medium">Tinggi Area Footer:</span>
                                    <span className="font-bold text-primary">{form.footer_image_height_mm || 20} mm</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="range"
                                      min={10}
                                      max={50}
                                      step={1}
                                      value={form.footer_image_height_mm || 20}
                                      onChange={(e) => updateField('footer_image_height_mm', Number(e.target.value))}
                                      className="flex-1 accent-primary"
                                    />
                                    <Input
                                      type="number"
                                      className="w-16 h-7 text-xs text-center"
                                      min={10}
                                      max={50}
                                      value={form.footer_image_height_mm || 20}
                                      onChange={(e) => updateField('footer_image_height_mm', Math.max(10, Math.min(60, Number(e.target.value) || 20)))}
                                    />
                                    <span className="text-xs text-muted-foreground">mm</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                                    💡 <em>Gambar footer otomatis direntangkan 100% selebar kertas. Bagian grafis bawah ditampilkan utuh dan menempel pas di batas kertas.</em>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="py-4 space-y-2">
                            <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                            <p className="text-xs text-muted-foreground">
                              Upload 1 berkas gambar banner footer resmi (Maks. 1 MB).
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              disabled={uploadingField === 'footer_image_url'}
                              onClick={() => footerImageInputRef.current?.click()}
                            >
                              <Upload className="h-3.5 w-3.5 mr-1" /> Unggah Banner Footer
                            </Button>
                          </div>
                        )}
                        <input
                          ref={footerImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'footer_image_url')}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold">Tampilkan Nomor Halaman</Label>
                        <p className="text-[11px] text-muted-foreground">Contoh: "Halaman 1 dari 1"</p>
                      </div>
                      <Switch
                        checked={form.show_page_number}
                        onCheckedChange={(checked) => updateField('show_page_number', checked)}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* TAB 4: PEJABAT PENGESAHAN */}
            <TabsContent value="pejabat" className="space-y-4 pt-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pejabat & Lokasi Pengesahan</CardTitle>
                  <CardDescription className="text-xs">
                    Data default yang dicantumkan pada kolom tanda tangan di bagian akhir lembar dokumen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Kota Pengesahan Default</Label>
                    <Input
                      value={form.default_city}
                      onChange={(e) => updateField('default_city', e.target.value)}
                      placeholder="Contoh: Ponorogo"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nama Ketua Program Studi (Kaprodi)</Label>
                      <Input
                        value={form.kaprodi_name}
                        onChange={(e) => updateField('kaprodi_name', e.target.value)}
                        placeholder="Contoh: Dr. Fulan, M.Pd."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">NIDN / NIP Kaprodi</Label>
                      <Input
                        value={form.kaprodi_nidn}
                        onChange={(e) => updateField('kaprodi_nidn', e.target.value)}
                        placeholder="Contoh: 0712345678"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nama Dekan Fakultas</Label>
                      <Input
                        value={form.dekan_name}
                        onChange={(e) => updateField('dekan_name', e.target.value)}
                        placeholder="Contoh: Prof. Dr. Ahmad, M.A."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">NIDN / NIP Dekan</Label>
                      <Input
                        value={form.dekan_nidn}
                        onChange={(e) => updateField('dekan_nidn', e.target.value)}
                        placeholder="Contoh: 0787654321"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* PANEL KANAN: LIVE INTERACTIVE PREVIEW DOKUMEN (5 Kolom) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-primary" />
                  Pratinjau Lembar Kertas
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Skala simulasi: {form.paper_size} ({form.orientation})
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {form.paper_size}
              </Badge>
            </CardHeader>
            <CardContent className="p-3 bg-muted/40 flex justify-center">
              {/* LEMBAR KERTAS FISIK SIMULASI */}
              <div
                className={`w-full max-w-[360px] bg-white text-slate-900 shadow-md rounded-sm border transition-all flex flex-col justify-between overflow-hidden ${ratioStyle}`}
                style={{
                  paddingTop: `${Math.max(form.margin_top / 3, 6)}px`,
                  paddingBottom: `${Math.max(form.margin_bottom / 3, 6)}px`,
                  paddingLeft: `${Math.max(form.margin_left / 3, 8)}px`,
                  paddingRight: `${Math.max(form.margin_right / 3, 8)}px`,
                }}
              >
                {/* 1. KOP SURAT */}
                {form.header_mode === 'image' && form.header_image_url && (
                  <div
                    className="w-full mb-2 overflow-hidden"
                    style={
                      form.header_image_full_bleed
                        ? {
                            marginTop: `-${Math.max(form.margin_top / 3, 6)}px`,
                            marginLeft: `-${Math.max(form.margin_left / 3, 8)}px`,
                            marginRight: `-${Math.max(form.margin_right / 3, 8)}px`,
                            width: `calc(100% + ${Math.max(form.margin_left / 3, 8) + Math.max(form.margin_right / 3, 8)}px)`,
                          }
                        : undefined
                    }
                  >
                    <img
                      src={form.header_image_url}
                      alt="Kop"
                      className={`w-full block ${
                        form.header_image_height_mode === 'auto'
                          ? 'h-auto'
                          : 'object-cover object-top'
                      }`}
                      style={
                        form.header_image_height_mode === 'auto'
                          ? undefined
                          : { height: `${Math.round((form.header_image_height_mm || 35) * 1.4)}px` }
                      }
                    />
                  </div>
                )}

                {form.header_mode === 'text' && (
                  <div className="w-full border-b-[2px] border-b-slate-900 pb-1 mb-2">
                    <div className="flex items-center justify-between gap-1">
                      {form.header_logo_left_url ? (
                        <img src={form.header_logo_left_url} alt="Logo L" className="h-7 w-7 object-contain shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-slate-200 shrink-0" />
                      )}

                      <div className="text-center flex-1 leading-tight px-1">
                        <p className="text-[7px] text-slate-700 tracking-wider font-medium">{form.institution_line_1}</p>
                        <p className="text-[8px] font-bold text-slate-900">{form.institution_line_2}</p>
                        <p className="text-[7.5px] font-semibold text-slate-800">{form.faculty_name} - {form.program_name}</p>
                        <p className="text-[6px] text-slate-500 truncate">{form.address_line}</p>
                      </div>

                      {form.header_logo_right_url ? (
                        <img src={form.header_logo_right_url} alt="Logo R" className="h-7 w-7 object-contain shrink-0" />
                      ) : (
                        <div className="w-6 shrink-0" />
                      )}
                    </div>
                    {/* Garis ganda kop dinas */}
                    <div className="border-t border-slate-900 mt-1" />
                  </div>
                )}

                {/* 2. AREA KONTEN CONTOH */}
                <div className="flex-1 flex flex-col justify-between py-1 text-[7px] space-y-2">
                  <div>
                    <div className="text-center font-bold text-[8.5px] uppercase tracking-wide border-b pb-0.5 mb-1.5">
                      KARTU KENDALI BIMBINGAN TUGAS AKHIR
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[6.5px] text-slate-700 bg-slate-50 p-1 rounded border border-slate-200 mb-1.5">
                      <div>Nama : <strong>Ahmad Fauzi</strong></div>
                      <div>NIM : <strong>422026</strong></div>
                      <div>Prodi : <strong>{form.program_name || 'Informatika'}</strong></div>
                      <div>Dosen : <strong>Dr. Fulan, M.Kom</strong></div>
                    </div>

                    {/* Tabel Mini Dummy */}
                    <table className="w-full border-collapse border border-slate-300 text-[6px]">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 px-1 py-0.5 text-center w-4">No</th>
                          <th className="border border-slate-300 px-1 py-0.5 text-left">Materi Bimbingan</th>
                          <th className="border border-slate-300 px-1 py-0.5 text-center w-12">Paraf</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 text-center py-0.5">1</td>
                          <td className="border border-slate-300 px-1">Bab I: Pendahuluan & Rumusan</td>
                          <td className="border border-slate-300 text-center text-emerald-600 font-semibold">[Paraf]</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 text-center py-0.5">2</td>
                          <td className="border border-slate-300 px-1">Bab II: Tinjauan Pustaka</td>
                          <td className="border border-slate-300 text-center text-emerald-600 font-semibold">[Paraf]</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Blok Tanda Tangan Simulasi */}
                  <div className="pt-2 text-[6.5px]">
                    <p className="text-right text-[6px] text-slate-600 mb-1">
                      {form.default_city || 'Ponorogo'}, 20 Oktober 2026
                    </p>
                    <div className="grid grid-cols-2 text-center pt-1">
                      <div>
                        <p className="text-[6px] text-slate-500">Mahasiswa,</p>
                        <div className="h-6 flex items-center justify-center font-serif text-[7px] italic text-slate-400">
                          (Ttd)
                        </div>
                        <p className="font-semibold text-slate-800">Ahmad Fauzi</p>
                        <p className="text-[5.5px] text-slate-500">NIM. 422026</p>
                      </div>
                      <div>
                        <p className="text-[6px] text-slate-500">Dosen Pembimbing,</p>
                        <div className="h-6 flex items-center justify-center font-serif text-[7px] italic text-slate-400">
                          (Ttd)
                        </div>
                        <p className="font-semibold text-slate-800">{form.kaprodi_name || 'Dr. Fulan, M.Kom'}</p>
                        <p className="text-[5.5px] text-slate-500">NIDN. {form.kaprodi_nidn || '0712345678'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. FOOTER */}
                {form.footer_enabled && (
                  <div
                    className={`mt-1 overflow-hidden ${
                      form.footer_mode === 'image' && form.footer_image_full_bleed
                        ? ''
                        : 'border-t border-slate-200 pt-1'
                    }`}
                    style={
                      form.footer_mode === 'image' && form.footer_image_full_bleed
                        ? {
                            marginBottom: `-${Math.max(form.margin_bottom / 3, 6)}px`,
                            marginLeft: `-${Math.max(form.margin_left / 3, 8)}px`,
                            marginRight: `-${Math.max(form.margin_right / 3, 8)}px`,
                            width: `calc(100% + ${Math.max(form.margin_left / 3, 8) + Math.max(form.margin_right / 3, 8)}px)`,
                          }
                        : undefined
                    }
                  >
                    {form.footer_mode === 'text' ? (
                      <div className="flex justify-between items-center text-[5.5px] text-slate-500">
                        <p className="truncate max-w-[200px]">{form.footer_text}</p>
                        {form.show_page_number && <span>Hal. 1/1</span>}
                      </div>
                    ) : form.footer_image_url ? (
                      <div className="relative w-full">
                        <img
                          src={form.footer_image_url}
                          alt="Footer"
                          className={`w-full block ${
                            form.footer_image_height_mode === 'auto'
                              ? 'h-auto'
                              : 'object-cover object-bottom'
                          }`}
                          style={
                            form.footer_image_height_mode === 'auto'
                              ? undefined
                              : { height: `${Math.round((form.footer_image_height_mm || 20) * 1.4)}px` }
                          }
                        />
                        {form.show_page_number && (
                          <span className="absolute bottom-0.5 right-1 text-[5px] bg-white/80 px-1 rounded text-slate-600">
                            Hal. 1/1
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t flex justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> Margin: T:{form.margin_top} B:{form.margin_bottom} L:{form.margin_left} R:{form.margin_right} mm
              </span>
              <Button variant="outline" size="sm" className="text-xs" onClick={handleTestPrint}>
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Cetak Lembar
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="templates" className="mt-4">
      <DocumentTemplateCustomizer />
    </TabsContent>
  </Tabs>

  {/* ELEMEN OFFSCREEN UNTUK UJI CETAK KOP DOKUMEN */}
  <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 overflow-hidden" aria-hidden="true">
    <UniversalDocumentContainer
      containerId="admin-kop-printable-sheet"
      templateCode="kartu_bimbingan_ta"
      variables={{}}
    />
  </div>
</div>
  );
}
