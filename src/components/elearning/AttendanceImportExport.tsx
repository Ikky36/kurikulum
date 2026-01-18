import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface AttendanceRecord {
  student_profile_id: string;
  student_name: string;
  nim: string;
  status: 'hadir' | 'izin' | 'alpha';
  notes: string;
}

interface ImportRow {
  nim: string;
  student_name: string;
  status: string;
  notes: string;
  isValid: boolean;
  errors: string[];
  student_profile_id?: string;
}

interface AttendanceImportExportProps {
  sessionTitle: string;
  sessionDate: string;
  students: Array<{
    student_profile_id: string;
    student: { full_name: string; nim: string } | null;
  }>;
  attendanceRecords: Record<string, { status: string; notes: string }>;
  onImportAttendance: (records: Array<{ student_profile_id: string; status: string; notes: string }>) => void;
}

export function AttendanceImportExport({
  sessionTitle,
  sessionDate,
  students,
  attendanceRecords,
  onImportAttendance,
}: AttendanceImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);

  // Download template Excel
  const handleDownloadTemplate = () => {
    const templateData = students.map((s, idx) => ({
      no: idx + 1,
      nim: s.student?.nim || '',
      nama: s.student?.full_name || '',
      status: attendanceRecords[s.student_profile_id]?.status || 'alpha',
      catatan: attendanceRecords[s.student_profile_id]?.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    ws['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presensi');
    
    const dateStr = format(new Date(sessionDate), 'dd-MM-yyyy', { locale: localeId });
    XLSX.writeFile(wb, `presensi_${sessionTitle.replace(/\s+/g, '_')}_${dateStr}.xlsx`);

    toast.success('Template berhasil diunduh');
  };

  // Export attendance to Excel
  const handleExportAttendance = () => {
    const exportData = students.map((s, idx) => ({
      no: idx + 1,
      nim: s.student?.nim || '',
      nama: s.student?.full_name || '',
      status: attendanceRecords[s.student_profile_id]?.status || 'alpha',
      catatan: attendanceRecords[s.student_profile_id]?.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    ws['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presensi');
    
    const dateStr = format(new Date(sessionDate), 'dd-MM-yyyy', { locale: localeId });
    XLSX.writeFile(wb, `presensi_${sessionTitle.replace(/\s+/g, '_')}_${dateStr}.xlsx`);

    toast.success('Export berhasil');
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (jsonData.length === 0) {
          toast.error('File kosong');
          return;
        }

        // Validate and parse data
        const parsedData: ImportRow[] = jsonData.map((row) => {
          const errors: string[] = [];
          
          const nim = String(row.nim || '').trim();
          const studentName = String(row.nama || '').trim();
          const status = String(row.status || '').trim().toLowerCase();
          const notes = String(row.catatan || '').trim();

          // Find student by NIM
          const student = students.find(s => s.student?.nim === nim);
          
          if (!nim) errors.push('NIM kosong');
          if (!student) errors.push('Mahasiswa tidak ditemukan');
          if (!['hadir', 'izin', 'alpha'].includes(status)) {
            errors.push('Status harus: hadir, izin, atau alpha');
          }

          return {
            nim,
            student_name: studentName,
            status,
            notes,
            isValid: errors.length === 0,
            errors,
            student_profile_id: student?.student_profile_id,
          };
        });

        setImportData(parsedData);
        setShowImportDialog(true);
      } catch (error) {
        toast.error('Gagal membaca file');
      }
    };
    reader.readAsBinaryString(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Import valid data
  const handleImport = async () => {
    const validData = importData.filter(row => row.isValid && row.student_profile_id);
    if (validData.length === 0) {
      toast.error('Tidak ada data valid');
      return;
    }

    setImporting(true);

    const records = validData.map(row => ({
      student_profile_id: row.student_profile_id!,
      status: row.status,
      notes: row.notes,
    }));

    onImportAttendance(records);

    setImporting(false);
    setShowImportDialog(false);
    
    const skippedCount = importData.length - validData.length;
    const message = skippedCount > 0 
      ? `${validData.length} data presensi berhasil diimport, ${skippedCount} baris dilewati (data tidak valid)`
      : `${validData.length} data presensi berhasil diimport`;
    toast.success(message);
    setImportData([]);
  };

  const validCount = importData.filter(r => r.isValid).length;
  const invalidCount = importData.filter(r => !r.isValid).length;

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Download Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Import Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportAttendance}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => { if (!importing) setShowImportDialog(open); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Import Presensi</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Data yang valid akan tetap diimport meskipun ada beberapa baris yang error.
            </p>
          </DialogHeader>

          <div className="flex gap-4 mb-4">
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {validCount} Valid
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {invalidCount} Error
              </Badge>
            )}
          </div>

          <div className="overflow-auto flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-12 text-primary-foreground">No</TableHead>
                  <TableHead className="w-12 text-primary-foreground">Status</TableHead>
                  <TableHead className="text-primary-foreground">NIM</TableHead>
                  <TableHead className="text-primary-foreground">Nama</TableHead>
                  <TableHead className="text-primary-foreground">Kehadiran</TableHead>
                  <TableHead className="text-primary-foreground">Catatan</TableHead>
                  <TableHead className="text-primary-foreground">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, idx) => (
                  <TableRow key={idx} className={row.isValid ? '' : 'bg-destructive/5'}>
                    <TableCell className="text-center">{idx + 1}</TableCell>
                    <TableCell>
                      {row.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.nim}</TableCell>
                    <TableCell>{row.student_name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={row.status === 'hadir' ? 'default' : row.status === 'izin' ? 'secondary' : 'destructive'}
                        className="capitalize"
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.notes || '-'}</TableCell>
                    <TableCell>
                      {row.errors.length > 0 && (
                        <span className="text-xs text-destructive">{row.errors.join(', ')}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={importing}>
              Batal
            </Button>
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengimport...
                </>
              ) : (
                `Import ${validCount} Data`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
