import React, { useState, useEffect } from 'react';
import {
  useDocumentTemplatesConfig,
  SingleDocumentTemplate,
  defaultDocumentTemplates,
} from '@/lib/documentTemplateTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Table as TableIcon,
  UserCheck,
  HelpCircle,
  Eye,
  Info,
} from 'lucide-react';

export function DocumentTemplateCustomizer() {
  const { templatesMap, updateSingleTemplate, isUpdating } = useDocumentTemplatesConfig();
  const [selectedDocCode, setSelectedDocCode] = useState<string>('kartu_bimbingan_ta');
  const [currentTemplate, setCurrentTemplate] = useState<SingleDocumentTemplate>(
    templatesMap[selectedDocCode] || defaultDocumentTemplates.kartu_bimbingan_ta
  );

  useEffect(() => {
    if (templatesMap[selectedDocCode]) {
      setCurrentTemplate(templatesMap[selectedDocCode]);
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

  const toggleSignature = (sigId: string, enabled: boolean) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      signatures: prev.signatures.map((sig) => (sig.id === sigId ? { ...sig, enabled } : sig)),
    }));
  };

  const updateSignatureLabel = (sigId: string, role_label: string) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      signatures: prev.signatures.map((sig) => (sig.id === sigId ? { ...sig, role_label } : sig)),
    }));
  };

  const toggleDigitalSignature = (sigId: string, use_digital_signature: boolean) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      signatures: prev.signatures.map((sig) => (sig.id === sigId ? { ...sig, use_digital_signature } : sig)),
    }));
  };

  const handleSave = () => {
    updateSingleTemplate(selectedDocCode, currentTemplate);
  };

  const handleReset = () => {
    if (defaultDocumentTemplates[selectedDocCode]) {
      setCurrentTemplate(defaultDocumentTemplates[selectedDocCode]);
      toast.info(`Template ${currentTemplate.name} dikembalikan ke bawaan awal (belum disimpan).`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                Kustomisasi Sub-Bab & Kolom Dokumen
              </CardTitle>
              <CardDescription className="text-xs">
                Sesuaikan judul, sub-bab tata tertib, kolom tabel, dan pihak penandatangan untuk masing-masing dokumen secara independen.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={isUpdating}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Reset Bawaan
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                <Save className="h-4 w-4 mr-1.5" />
                {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pilihan Dokumen */}
          <div className="max-w-md space-y-1.5">
            <Label className="text-xs font-semibold">Pilih Dokumen yang Ingin Dikustomisasi:</Label>
            <Select value={selectedDocCode} onValueChange={handleDocCodeChange}>
              <SelectTrigger className="font-medium">
                <SelectValue placeholder="Pilih dokumen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kartu_bimbingan_ta">
                  <span className="font-medium">Kartu Bimbingan Tugas Akhir</span> (Log Konsultasi Pembimbing)
                </SelectItem>
                <SelectItem value="krs">
                  <span className="font-medium">Kartu Rencana Studi (KRS)</span> (Daftar Mata Kuliah Semester)
                </SelectItem>
                <SelectItem value="kartu_bimbingan_dpa">
                  <span className="font-medium">Kartu Bimbingan Akademik (DPA)</span> (Konsultasi Perwalian)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* 1. JUDUL & SUB-JUDUL */}
            <div className="space-y-4 p-4 border rounded-xl bg-card">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  Judul & Header Dokumen
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Header
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Judul Utama Dokumen</Label>
                  <Input
                    value={currentTemplate.document_title}
                    onChange={(e) => updateTemplateField('document_title', e.target.value)}
                    placeholder="Contoh: KARTU KENDALI BIMBINGAN TUGAS AKHIR"
                    className="font-semibold uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Subjudul Dokumen (Opsional)</Label>
                  <Input
                    value={currentTemplate.document_subtitle}
                    onChange={(e) => updateTemplateField('document_subtitle', e.target.value)}
                    placeholder="Contoh: PROGRAM STUDI PENDIDIKAN BAHASA ARAB"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Tampilkan Kop Surat Instansi</Label>
                    <p className="text-[11px] text-muted-foreground">Menggunakan kop surat dari tab Kop & Dokumen</p>
                  </div>
                  <Switch
                    checked={currentTemplate.show_kop}
                    onCheckedChange={(checked) => updateTemplateField('show_kop', checked)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Tampilkan Kotak Biodata Mahasiswa</Label>
                    <p className="text-[11px] text-muted-foreground">Nama, NIM, Program Studi, Dosen</p>
                  </div>
                  <Switch
                    checked={currentTemplate.show_student_info}
                    onCheckedChange={(checked) => updateTemplateField('show_student_info', checked)}
                  />
                </div>
              </div>
            </div>

            {/* 2. SUB-BAB CATATAN & TATA TERTIB */}
            <div className="space-y-4 p-4 border rounded-xl bg-card">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Sub-Bab Catatan / Tata Tertib
                </span>
                <Switch
                  checked={currentTemplate.rules_note_enabled}
                  onCheckedChange={(checked) => updateTemplateField('rules_note_enabled', checked)}
                />
              </div>

              {currentTemplate.rules_note_enabled ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Judul Sub-Bab Catatan</Label>
                    <Input
                      value={currentTemplate.rules_note_title}
                      onChange={(e) => updateTemplateField('rules_note_title', e.target.value)}
                      placeholder="Contoh: Ketentuan & Tata Tertib Bimbingan:"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Isi Teks Ketentuan / Aturan Dokumen</Label>
                    <Textarea
                      rows={5}
                      value={currentTemplate.rules_note_text}
                      onChange={(e) => updateTemplateField('rules_note_text', e.target.value)}
                      placeholder="Tuliskan butir-butir tata tertib atau aturan bimbingan di sini..."
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground bg-muted/40 rounded-lg">
                  Sub-bab catatan / tata tertib disembunyikan untuk dokumen ini.
                </div>
              )}
            </div>
          </div>

          {/* 3. PEMILIH KOLOM TABEL DATA */}
          <div className="space-y-3 p-4 border rounded-xl bg-card">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  <TableIcon className="h-4 w-4 text-primary" />
                  Kolom Tabel Data Dokumen
                </span>
                <p className="text-xs text-muted-foreground">
                  Centang kolom yang ingin dicetak dan ubah label teks kolom sesuai istilah resmi yang diinginkan.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {currentTemplate.columns.map((col) => (
                <div
                  key={col.id}
                  className={`p-3 rounded-lg border transition-colors flex flex-col justify-between gap-2 ${
                    col.enabled ? 'bg-background border-primary/30' : 'bg-muted/40 border-muted opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${col.id}`}
                        checked={col.enabled}
                        onCheckedChange={(checked) => toggleColumn(col.id, !!checked)}
                      />
                      <label htmlFor={`col-${col.id}`} className="text-xs font-semibold cursor-pointer">
                        {col.enabled ? 'Tampilkan' : 'Disembunyikan'}
                      </label>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      ID: {col.id}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Label Kolom di Tabel</Label>
                    <Input
                      value={col.label}
                      disabled={!col.enabled}
                      onChange={(e) => updateColumnLabel(col.id, e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. KUSTOMISASI PIHAK PENANDATANGAN */}
          <div className="space-y-3 p-4 border rounded-xl bg-card">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Blok Tanda Tangan & Pengesahan Dokumen
                </span>
                <p className="text-xs text-muted-foreground">
                  Atur siapa saja pejabat/pihak yang membubuhkan tanda tangan di bagian akhir lembar dokumen.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
              {currentTemplate.signatures.map((sig) => (
                <div
                  key={sig.id}
                  className={`p-3 rounded-lg border transition-colors flex flex-col justify-between gap-3 ${
                    sig.enabled ? 'bg-background border-primary/30' : 'bg-muted/40 border-muted opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`sig-${sig.id}`}
                        checked={sig.enabled}
                        onCheckedChange={(checked) => toggleSignature(sig.id, !!checked)}
                      />
                      <label htmlFor={`sig-${sig.id}`} className="text-xs font-semibold cursor-pointer">
                        {sig.enabled ? 'Aktif' : 'Nonaktif'}
                      </label>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">
                      {sig.id}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Jabatan / Keterangan TTD</Label>
                    <Input
                      value={sig.role_label}
                      disabled={!sig.enabled}
                      onChange={(e) => updateSignatureLabel(sig.id, e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-[11px] text-muted-foreground">Tanda Tangan Digital</span>
                    <Switch
                      disabled={!sig.enabled}
                      checked={sig.use_digital_signature}
                      onCheckedChange={(checked) => toggleDigitalSignature(sig.id, checked)}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {sig.use_digital_signature
                      ? '✓ Menampilkan gambar tanda tangan/paraf dosen dari sistem'
                      : '○ Ruang kosong untuk tanda tangan basah'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-3 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isUpdating}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset Bawaan
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isUpdating}>
            <Save className="h-4 w-4 mr-1.5" />
            {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan Template'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
