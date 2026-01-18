import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, RefreshCw, RefreshCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Profile } from '@/lib/types';

interface SistemKuliah {
  id: string;
  name: string;
}

interface ImportRow {
  email: string;
  full_name: string;
  password: string;
  role: 'mahasiswa' | 'dosen';
  nim?: string;
  nip?: string;
  program?: string;
  class_group?: string;
  enrollment_year?: string;
  gender?: string;
  sistem_kuliah?: string;
  isValid: boolean;
  errors: string[];
  existsInDb: boolean;
}

interface UserImportExportProps {
  users: Profile[];
  onImportSuccess: () => void;
  onSyncSuccess?: () => void;
}

export function UserImportExport({ users, onImportSuccess, onSyncSuccess }: UserImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [updateIfExists, setUpdateIfExists] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase();

  const revalidateImportData = (rows: ImportRow[], updateFlag: boolean): ImportRow[] => {
    return rows.map((r) => {
      const errors: string[] = [];

      const email = normalizeEmail(r.email);
      const fullName = String(r.full_name || '').trim();
      const password = String(r.password || '').trim();
      const role = r.role;
      const nim = String(r.nim || '').trim();
      const nip = String(r.nip || '').trim();
      const sistemKuliah = String(r.sistem_kuliah || '').trim();

      const existsInDb = users.some((u) => u.email.toLowerCase() === email);

      if (!email) errors.push('Email wajib diisi');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Format email tidak valid');

      if (!fullName) errors.push('Nama lengkap wajib diisi');

      const passwordRequired = !existsInDb || !updateFlag;
      if (passwordRequired) {
        if (!password) errors.push('Password wajib diisi');
        else if (password.length < 6) errors.push('Password minimal 6 karakter');
      } else if (password && password.length < 6) {
        errors.push('Password minimal 6 karakter');
      }

      if (!role || !['mahasiswa', 'dosen'].includes(role)) {
        errors.push('Role harus mahasiswa atau dosen');
      }

      if (role === 'mahasiswa' && !nim) errors.push('NIM wajib untuk mahasiswa');
      if (role === 'dosen' && !nip) errors.push('NIP wajib untuk dosen');

      if (sistemKuliah && sistemKuliahList) {
        const found = sistemKuliahList.find((sk) => sk.name.toLowerCase() === sistemKuliah.toLowerCase());
        if (!found) {
          errors.push(`Sistem kuliah "${sistemKuliah}" tidak ditemukan`);
        }
      }

      return {
        ...r,
        email,
        full_name: fullName,
        password,
        existsInDb,
        isValid: errors.length === 0,
        errors,
      };
    });
  };

  // Fetch sistem kuliah for mapping
  const { data: sistemKuliahList } = useQuery({
    queryKey: ['sistem-kuliah'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistem_kuliah')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as SistemKuliah[];
    },
  });

  // Download template Excel
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        email: 'mahasiswa@example.com',
        full_name: 'Nama Mahasiswa',
        password: 'password123',
        role: 'mahasiswa',
        nim: '12345678',
        nip: '',
        program: 'Pendidikan Bahasa Arab',
        class_group: 'A',
        enrollment_year: '2024',
        gender: 'pria',
        sistem_kuliah: 'Reguler',
      },
      {
        email: 'dosen@example.com',
        full_name: 'Nama Dosen',
        password: 'password123',
        role: 'dosen',
        nim: '',
        nip: '198501012020011001',
        program: 'Pendidikan Bahasa Arab',
        class_group: '',
        enrollment_year: '',
        gender: 'pria',
        sistem_kuliah: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // email
      { wch: 20 }, // full_name
      { wch: 15 }, // password
      { wch: 12 }, // role
      { wch: 12 }, // nim
      { wch: 20 }, // nip
      { wch: 25 }, // program
      { wch: 10 }, // class_group
      { wch: 12 }, // enrollment_year
      { wch: 10 }, // gender
      { wch: 15 }, // sistem_kuliah
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Akun');
    XLSX.writeFile(wb, 'template_import_akun.xlsx');

    toast({ title: 'Template berhasil diunduh', description: 'Silakan isi data sesuai format template' });
  };

  // Export users to Excel
  const handleExportUsers = () => {
    if (!users || users.length === 0) {
      toast({ title: 'Tidak ada data', description: 'Tidak ada akun untuk diekspor', variant: 'destructive' });
      return;
    }

    const exportData = users
      .filter(u => u.role !== 'admin')
      .map(u => ({
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        nim: u.nim || '',
        nip: u.nip || '',
        program: u.program || '',
        class_group: u.class_group || '',
        enrollment_year: u.enrollment_year || '',
        gender: (u as any).gender || '',
        sistem_kuliah: '', // Will be filled with lookup
      }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    ws['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 25 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Akun');
    XLSX.writeFile(wb, `export_akun_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({ title: 'Export berhasil', description: `${exportData.length} akun berhasil diekspor` });
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
          toast({ title: 'File kosong', description: 'File Excel tidak memiliki data', variant: 'destructive' });
          return;
        }

        // Validate and parse data
        const parsedData: ImportRow[] = jsonData.map((row, index) => {
          const errors: string[] = [];
          
          const email = String(row.email || '').trim().toLowerCase();
          const fullName = String(row.full_name || '').trim();
          const password = String(row.password || '').trim();
          const role = String(row.role || '').trim().toLowerCase();
          const nim = String(row.nim || '').trim();
          const nip = String(row.nip || '').trim();
          const program = String(row.program || '').trim();
          const classGroup = String(row.class_group || '').trim();
          const enrollmentYear = String(row.enrollment_year || '').trim();
          const gender = String(row.gender || '').trim().toLowerCase();
          const sistemKuliah = String(row.sistem_kuliah || '').trim();

          // Check if email already exists in DB
          const existsInDb = users.some(u => u.email.toLowerCase() === email);

          // Validation
          if (!email) errors.push('Email wajib diisi');
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Format email tidak valid');
          
          if (!fullName) errors.push('Nama lengkap wajib diisi');

          // Password wajib untuk akun baru. Untuk akun yang sudah ada, password opsional jika "Update jika sudah ada" aktif.
          if (!password && !(existsInDb && updateIfExists)) errors.push('Password wajib diisi');
          else if (password && password.length < 6) errors.push('Password minimal 6 karakter');
          if (!role || !['mahasiswa', 'dosen'].includes(role)) {
            errors.push('Role harus mahasiswa atau dosen');
          }
          
          if (role === 'mahasiswa' && !nim) errors.push('NIM wajib untuk mahasiswa');
          if (role === 'dosen' && !nip) errors.push('NIP wajib untuk dosen');

          // Validate sistem kuliah if provided
          if (sistemKuliah && sistemKuliahList) {
            const found = sistemKuliahList.find(sk => sk.name.toLowerCase() === sistemKuliah.toLowerCase());
            if (!found) {
              errors.push(`Sistem kuliah "${sistemKuliah}" tidak ditemukan`);
            }
          }

          return {
            email,
            full_name: fullName,
            password,
            role: (role === 'mahasiswa' || role === 'dosen') ? role : 'mahasiswa',
            nim: nim || undefined,
            nip: nip || undefined,
            program: program || undefined,
            class_group: classGroup || undefined,
            enrollment_year: enrollmentYear || undefined,
            gender: gender || undefined,
            sistem_kuliah: sistemKuliah || undefined,
            isValid: errors.length === 0,
            errors,
            existsInDb,
          };
        });

        setImportData(parsedData);
        setShowImportDialog(true);
      } catch (error) {
        toast({ title: 'Gagal membaca file', description: 'Pastikan file dalam format Excel yang valid', variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Import valid data - using batch function for speed
  const handleImport = async () => {
    const validData = importData.filter(row => row.isValid);
    if (validData.length === 0) {
      toast({ title: 'Tidak ada data valid', description: 'Perbaiki error pada data sebelum import', variant: 'destructive' });
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: validData.length });

    try {
      // Prepare batch data with sistem_kuliah_id mapping
      const usersToCreate = validData.map(row => {
        let sistemKuliahId: string | undefined;
        if (row.sistem_kuliah && sistemKuliahList) {
          const found = sistemKuliahList.find(sk => sk.name.toLowerCase() === row.sistem_kuliah?.toLowerCase());
          if (found) {
            sistemKuliahId = found.id;
          }
        }

        return {
          email: row.email,
          password: row.password,
          full_name: row.full_name,
          role: row.role,
          nim: row.nim,
          nip: row.nip,
          program: row.program,
          class_group: row.class_group,
          enrollment_year: row.enrollment_year ? parseInt(row.enrollment_year) : undefined,
          gender: row.gender,
          sistem_kuliah_id: sistemKuliahId,
        };
      });

      // Process in batches of 50 for optimal performance
      const batchSize = 50;
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      const failedDetails: { email: string; error: string }[] = [];

      for (let i = 0; i < usersToCreate.length; i += batchSize) {
        const batch = usersToCreate.slice(i, i + batchSize);
        setImportProgress({ current: Math.min(i + batchSize, usersToCreate.length), total: usersToCreate.length });

        const { data, error } = await supabase.functions.invoke('admin-bulk-users', {
          body: {
            action: 'create',
            users: batch,
            updateIfExists: updateIfExists,
          },
        });

        if (error) {
          // If the whole batch fails, keep per-row info so admin can fix/retry.
          errorCount += batch.length;
          batch.forEach((u) => failedDetails.push({ email: u.email, error: error.message || 'Batch error' }));
          continue;
        }

        if (data) {
          createdCount += data.created || 0;
          updatedCount += data.updated || 0;
          errorCount += data.failed || 0;

          if (Array.isArray(data.results)) {
            data.results
              .filter((r: any) => !r?.success)
              .forEach((r: any) =>
                failedDetails.push({
                  email: String(r?.email || ''),
                  error: String(r?.error || 'Unknown error'),
                })
              );
          }
        }
      }

      // Auto-download failure report (so admin tahu tepatnya baris mana yang gagal)
      if (failedDetails.length > 0) {
        const ws = XLSX.utils.json_to_sheet(
          failedDetails.map((f) => ({
            email: f.email,
            error: f.error,
          }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Gagal');
        XLSX.writeFile(wb, `laporan_import_gagal_${new Date().toISOString().split('T')[0]}.xlsx`);
      }

      setImporting(false);
      setShowImportDialog(false);
      setImportData([]);

      const skippedCount = importData.length - validData.length;
      const totalSuccess = createdCount + updatedCount;
      
      if (totalSuccess > 0) {
        onImportSuccess();
        let message = '';
        if (createdCount > 0) message += `${createdCount} akun baru dibuat`;
        if (updatedCount > 0) message += `${message ? ', ' : ''}${updatedCount} akun diperbarui`;
        if (skippedCount > 0) message += `${message ? ', ' : ''}${skippedCount} baris dilewati (data tidak valid)`;
        if (errorCount > 0) message += `${message ? ', ' : ''}${errorCount} gagal (laporan diunduh)`;
        toast({
          title: 'Import Selesai',
          description: message,
        });
      } else {
        toast({
          title: 'Import gagal',
          description: 'Tidak ada akun yang berhasil diimport',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      setImporting(false);
      toast({
        title: 'Import gagal',
        description: err.message || 'Terjadi kesalahan saat import',
        variant: 'destructive',
      });
    }
  };

  // Sync profiles for auth users without profiles
  const handleSyncProfiles = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-sync-profiles');

      if (error) {
        toast({
          title: 'Sinkronisasi gagal',
          description: error.message || 'Terjadi kesalahan saat sinkronisasi',
          variant: 'destructive',
        });
        setSyncing(false);
        return;
      }

      if (data?.synced > 0) {
        onSyncSuccess?.();
        onImportSuccess(); // Also refresh users list
      }

      toast({
        title: 'Sinkronisasi Selesai',
        description: data?.message || `Berhasil sinkronisasi ${data?.synced || 0} profil`,
      });
    } catch (err: any) {
      toast({
        title: 'Sinkronisasi gagal',
        description: err.message || 'Terjadi kesalahan saat sinkronisasi',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const validCount = importData.filter(r => r.isValid).length;
  const invalidCount = importData.filter(r => !r.isValid).length;
  const existingCount = importData.filter(r => r.existsInDb && r.isValid).length;
  const newCount = importData.filter(r => !r.existsInDb && r.isValid).length;

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
        <Button variant="outline" size="sm" onClick={handleExportUsers}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handleSyncProfiles} disabled={syncing}>
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4 mr-2" />
          )}
          {syncing ? 'Menyinkronkan...' : 'Sinkronisasi Profil'}
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
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Import Data</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Data yang valid akan tetap diimport meskipun ada beberapa baris yang error.
            </p>
          </DialogHeader>

          <div className="flex flex-wrap gap-4 mb-4">
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {validCount} Valid
            </Badge>
            {newCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {newCount} Baru
              </Badge>
            )}
            {existingCount > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-600">
                <RefreshCw className="h-3 w-3" />
                {existingCount} Sudah Ada
              </Badge>
            )}
            {invalidCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {invalidCount} Error
              </Badge>
            )}
          </div>

          {/* Update if exists option */}
          <div className="flex items-center space-x-2 mb-4 p-3 bg-muted/50 rounded-lg">
            <Checkbox 
              id="updateIfExists" 
              checked={updateIfExists} 
              onCheckedChange={(checked) => {
                const next = checked as boolean;
                setUpdateIfExists(next);
                setImportData((prev) => revalidateImportData(prev, next));
              }}
            />
            <Label htmlFor="updateIfExists" className="text-sm cursor-pointer">
              <span className="font-medium">Update jika sudah ada</span>
              <span className="text-muted-foreground ml-1">
                - Jika email sudah terdaftar, data profil (nama, NIM, program, dll) akan diperbarui
              </span>
            </Label>
          </div>

          <div className="overflow-auto flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-12 text-primary-foreground">No</TableHead>
                  <TableHead className="w-12 text-primary-foreground">Status</TableHead>
                  <TableHead className="text-primary-foreground">Email</TableHead>
                  <TableHead className="text-primary-foreground">Nama</TableHead>
                  <TableHead className="text-primary-foreground">Role</TableHead>
                  <TableHead className="text-primary-foreground">NIM/NIP</TableHead>
                  <TableHead className="text-primary-foreground">Angkatan</TableHead>
                  <TableHead className="text-primary-foreground">Sistem</TableHead>
                  <TableHead className="text-primary-foreground">Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, idx) => (
                  <TableRow key={idx} className={!row.isValid ? 'bg-destructive/5' : row.existsInDb ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                    <TableCell className="text-center">{idx + 1}</TableCell>
                    <TableCell>
                      {!row.isValid ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : row.existsInDb ? (
                        <RefreshCw className="h-4 w-4 text-amber-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.email}</TableCell>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{row.role}</Badge>
                    </TableCell>
                    <TableCell>{row.role === 'mahasiswa' ? row.nim : row.nip}</TableCell>
                    <TableCell>{row.enrollment_year || '-'}</TableCell>
                    <TableCell>{row.sistem_kuliah || '-'}</TableCell>
                    <TableCell>
                      {row.errors.length > 0 ? (
                        <span className="text-xs text-destructive">{row.errors.join(', ')}</span>
                      ) : row.existsInDb ? (
                        <span className="text-xs text-amber-600">
                          {updateIfExists ? 'Akan diperbarui' : 'Sudah ada (dilewati)'}
                        </span>
                      ) : (
                        <span className="text-xs text-green-600">Akan dibuat</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {importing && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Mengimport... ({importProgress.current}/{importProgress.total})
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

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
                `Import ${validCount} Akun Valid`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
