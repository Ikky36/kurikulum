import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface VmtsData {
  visi: any[];
  misi: any[];
  tujuan: any[];
  strategi: any[];
}

interface VmtsImportExportProps {
  curriculumId: string;
  data: {
    pt: VmtsData;
    upps: VmtsData;
    ps: VmtsData;
  };
  onSuccess: () => void;
}

export function VmtsImportExport({ curriculumId, data, onSuccess }: VmtsImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Generate Excel file
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    const createSheetData = (levelData: VmtsData) => {
      const sheetData: any[] = [];
      
      // Visi
      levelData.visi.forEach(v => {
        sheetData.push({ Kategori: 'Visi', Kode: '-', Deskripsi: v.visi });
      });
      // Misi
      levelData.misi.forEach(m => {
        sheetData.push({ Kategori: 'Misi', Kode: m.code || '-', Deskripsi: m.misi });
      });
      // Tujuan
      levelData.tujuan.forEach(t => {
        sheetData.push({ Kategori: 'Tujuan', Kode: t.code || '-', Deskripsi: t.tujuan });
      });
      // Strategi
      levelData.strategi.forEach(s => {
        sheetData.push({ Kategori: 'Strategi', Kode: s.code || '-', Deskripsi: s.strategi });
      });

      // If completely empty, provide template header
      if (sheetData.length === 0) {
        sheetData.push({ Kategori: 'Visi', Kode: '-', Deskripsi: 'Isi Visi di sini' });
        sheetData.push({ Kategori: 'Misi', Kode: 'M-1', Deskripsi: 'Isi Misi di sini' });
        sheetData.push({ Kategori: 'Tujuan', Kode: 'T-1', Deskripsi: 'Isi Tujuan di sini' });
        sheetData.push({ Kategori: 'Strategi', Kode: 'S-1', Deskripsi: 'Isi Strategi di sini' });
      }

      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 80 }];
      return ws;
    };

    XLSX.utils.book_append_sheet(wb, createSheetData(data.pt), 'VMTS_PT');
    XLSX.utils.book_append_sheet(wb, createSheetData(data.upps), 'VMTS_UPPS');
    XLSX.utils.book_append_sheet(wb, createSheetData(data.ps), 'VMTS_PS');

    XLSX.writeFile(wb, `VMTS_Terpadu_Export.xlsx`);
    toast({ title: 'Export Berhasil', description: 'File Excel VMTS terpadu berhasil diunduh.' });
  };

  // Trigger file input
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    
    // Check if there's existing data to warn the user about overwriting
    const hasData = 
      data.pt.visi.length > 0 || data.pt.misi.length > 0 ||
      data.upps.visi.length > 0 || data.upps.misi.length > 0 ||
      data.ps.visi.length > 0 || data.ps.misi.length > 0;

    if (hasData) {
      setShowConfirmDialog(true);
    } else {
      processImport(file);
    }
    
    e.target.value = ''; // Reset input
  };

  // Process the uploaded Excel file
  const processImport = (file: File) => {
    setShowConfirmDialog(false);
    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Function to process a single sheet
        const processSheet = async (sheetName: string, prefix: 'pt' | 'upps' | 'ps') => {
          const ws = wb.Sheets[sheetName];
          if (!ws) return;
          const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

          const visi = jsonData.filter(r => r.Kategori?.toLowerCase() === 'visi' && r.Deskripsi);
          const misi = jsonData.filter(r => r.Kategori?.toLowerCase() === 'misi' && r.Deskripsi);
          const tujuan = jsonData.filter(r => r.Kategori?.toLowerCase() === 'tujuan' && r.Deskripsi);
          const strategi = jsonData.filter(r => r.Kategori?.toLowerCase() === 'strategi' && r.Deskripsi);

          // Build queries to delete existing data for the current curriculum
          const filterQuery = curriculumId ? { curriculum_id: curriculumId } : {};
          if (curriculumId) {
             await supabase.from(`vmts_${prefix}_visi` as any).delete().eq('curriculum_id', curriculumId);
             await supabase.from(`vmts_${prefix}_misi` as any).delete().eq('curriculum_id', curriculumId);
             await supabase.from(`vmts_${prefix}_tujuan` as any).delete().eq('curriculum_id', curriculumId);
             await supabase.from(`vmts_${prefix}_strategi` as any).delete().eq('curriculum_id', curriculumId);
          } else {
             // For legacy data without curriculum_id, we just delete rows where curriculum_id is null
             await supabase.from(`vmts_${prefix}_visi` as any).delete().is('curriculum_id', null);
             await supabase.from(`vmts_${prefix}_misi` as any).delete().is('curriculum_id', null);
             await supabase.from(`vmts_${prefix}_tujuan` as any).delete().is('curriculum_id', null);
             await supabase.from(`vmts_${prefix}_strategi` as any).delete().is('curriculum_id', null);
          }

          // Insert new data
          if (visi.length > 0) {
            await supabase.from(`vmts_${prefix}_visi` as any).insert(visi.map(v => ({
              visi: v.Deskripsi,
              curriculum_id: curriculumId || null
            })));
          }
          if (misi.length > 0) {
            await supabase.from(`vmts_${prefix}_misi` as any).insert(misi.map(m => ({
              code: m.Kode === '-' ? '' : (m.Kode || ''),
              misi: m.Deskripsi,
              curriculum_id: curriculumId || null
            })));
          }
          if (tujuan.length > 0) {
            await supabase.from(`vmts_${prefix}_tujuan` as any).insert(tujuan.map(t => ({
              code: t.Kode === '-' ? '' : (t.Kode || ''),
              tujuan: t.Deskripsi,
              curriculum_id: curriculumId || null
            })));
          }
          if (strategi.length > 0) {
            await supabase.from(`vmts_${prefix}_strategi` as any).insert(strategi.map(s => ({
              code: s.Kode === '-' ? '' : (s.Kode || ''),
              strategi: s.Deskripsi,
              curriculum_id: curriculumId || null
            })));
          }
        };

        // Process all 3 sheets
        await processSheet('VMTS_PT', 'pt');
        await processSheet('VMTS_UPPS', 'upps');
        await processSheet('VMTS_PS', 'ps');

        toast({ title: 'Import Selesai', description: 'Seluruh data VMTS berhasil diperbarui.' });
        onSuccess(); // Refresh data
      } catch (err: any) {
        toast({ title: 'Import Gagal', description: 'Gagal memproses file Excel: ' + err.message, variant: 'destructive' });
      } finally {
        setImporting(false);
        setPendingFile(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex items-center gap-2 mb-4 bg-primary/5 p-3 rounded-lg border border-primary/20">
      <div className="flex-1">
        <h3 className="font-semibold text-sm">Manajemen VMTS Terpadu</h3>
        <p className="text-xs text-muted-foreground">Download template atau export data VMTS Anda, edit dalam satu file Excel (3 sheet), lalu import kembali ke sini.</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleExport} className="bg-white hover:bg-gray-100">
          <Download className="h-4 w-4 mr-1 text-primary" />
          Export / Template
        </Button>
        <Button variant="default" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          <Upload className="h-4 w-4 mr-1" />
          {importing ? 'Mengimport...' : 'Import'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onFileSelect}
        />
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Konfirmasi Penimpaan Data
            </DialogTitle>
            <DialogDescription className="pt-2">
              Kurikulum ini sudah memiliki data VMTS. Apakah Anda yakin ingin <b>menimpa (menghapus lalu mengganti)</b> seluruh data VMTS yang ada dengan data baru dari file Excel ini?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConfirmDialog(false); setPendingFile(null); }}>Batal</Button>
            <Button variant="destructive" onClick={() => pendingFile && processImport(pendingFile)}>
              Ya, Timpa Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
