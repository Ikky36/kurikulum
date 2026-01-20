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
import { Profile, AppRole } from '@/lib/types';

interface SistemKuliah {
  id: string;
  name: string;
}

interface Program {
  id: string;
  name: string;
}

interface ImportRow {
  email: string;
  full_name: string;
  password: string;
  role: AppRole;
  nim?: string;
  nip?: string;
  program?: string;
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
  selectedRole?: 'all' | AppRole;
}

// Define columns for each role
const getRoleColumns = (role: 'all' | AppRole) => {
  const baseColumns = [
    { key: 'email', label: 'Email', width: 25, required: true },
    { key: 'full_name', label: 'Nama Lengkap', width: 20, required: true },
    { key: 'password', label: 'Password', width: 15, required: true },
    { key: 'gender', label: 'Gender', width: 10, required: false },
  ];

  switch (role) {
    case 'mahasiswa':
      return [
        ...baseColumns,
        { key: 'nim', label: 'NIM', width: 15, required: true },
        { key: 'enrollment_year', label: 'Angkatan', width: 12, required: false },
        { key: 'program', label: 'Program Studi', width: 25, required: false },
        { key: 'sistem_kuliah', label: 'Sistem Kuliah', width: 15, required: false },
      ];
    case 'dosen':
      return [
        ...baseColumns,
        { key: 'nip', label: 'NIDN/NIDK', width: 20, required: true },
      ];
    case 'admin':
    case 'sub_admin':
      return baseColumns;
    default:
      // 'all' - include all possible columns with role column
      return [
        { key: 'email', label: 'Email', width: 25, required: true },
        { key: 'full_name', label: 'Nama Lengkap', width: 20, required: true },
        { key: 'password', label: 'Password', width: 15, required: true },
        { key: 'role', label: 'Role', width: 12, required: true },
        { key: 'gender', label: 'Gender', width: 10, required: false },
        { key: 'nim', label: 'NIM', width: 15, required: false },
        { key: 'nip', label: 'NIDN/NIDK', width: 20, required: false },
        { key: 'enrollment_year', label: 'Angkatan', width: 12, required: false },
        { key: 'program', label: 'Program Studi', width: 25, required: false },
        { key: 'sistem_kuliah', label: 'Sistem Kuliah', width: 15, required: false },
      ];
  }
};

const getRoleName = (role: 'all' | AppRole) => {
  switch (role) {
    case 'mahasiswa': return 'Mahasiswa';
    case 'dosen': return 'Dosen';
    case 'admin': return 'Admin';
    case 'sub_admin': return 'Sub-Admin';
    default: return 'Semua';
  }
};

export function UserImportExport({ users, onImportSuccess, onSyncSuccess, selectedRole = 'all' }: UserImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [updateIfExists, setUpdateIfExists] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase();

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

  // Fetch programs for mapping
  const { data: programsList } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Program[];
    },
  });

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

      // Validate role based on selectedRole
      if (selectedRole === 'all') {
        if (!role || !['mahasiswa', 'dosen', 'admin', 'sub_admin'].includes(role)) {
          errors.push('Role harus mahasiswa, dosen, admin, atau sub_admin');
        }
      }

      if (role === 'mahasiswa' && !nim) errors.push('NIM wajib untuk mahasiswa');
      if (role === 'dosen' && !nip) errors.push('NIDN/NIDK wajib untuk dosen');

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

  // Download template Excel based on selected role
  const handleDownloadTemplate = () => {
    const columns = getRoleColumns(selectedRole);
    const roleName = getRoleName(selectedRole);
    
    // Create template data based on role
    let templateData: Record<string, any>[] = [];
    
    if (selectedRole === 'mahasiswa') {
      templateData = [{
        email: 'mahasiswa@example.com',
        full_name: 'Nama Mahasiswa',
        password: 'password123',
        gender: 'pria',
        nim: '12345678',
        enrollment_year: '2024',
        program: programsList?.[0]?.name || 'Pendidikan Bahasa Arab',
        sistem_kuliah: sistemKuliahList?.[0]?.name || 'Reguler',
      }];
    } else if (selectedRole === 'dosen') {
      templateData = [{
        email: 'dosen@example.com',
        full_name: 'Nama Dosen',
        password: 'password123',
        gender: 'pria',
        nip: '198501012020011001',
      }];
    } else if (selectedRole === 'admin' || selectedRole === 'sub_admin') {
      templateData = [{
        email: `${selectedRole}@example.com`,
        full_name: `Nama ${roleName}`,
        password: 'password123',
        gender: 'pria',
      }];
    } else {
      // 'all' - combined template
      templateData = [
        {
          email: 'mahasiswa@example.com',
          full_name: 'Nama Mahasiswa',
          password: 'password123',
          role: 'mahasiswa',
          gender: 'pria',
          nim: '12345678',
          nip: '',
          enrollment_year: '2024',
          program: programsList?.[0]?.name || 'Pendidikan Bahasa Arab',
          sistem_kuliah: sistemKuliahList?.[0]?.name || 'Reguler',
        },
        {
          email: 'dosen@example.com',
          full_name: 'Nama Dosen',
          password: 'password123',
          role: 'dosen',
          gender: 'pria',
          nim: '',
          nip: '198501012020011001',
          enrollment_year: '',
          program: '',
          sistem_kuliah: '',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = columns.map(col => ({ wch: col.width }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Template ${roleName}`);
    XLSX.writeFile(wb, `template_import_${selectedRole === 'all' ? 'akun' : selectedRole}.xlsx`);

    toast({ title: 'Template berhasil diunduh', description: `Template untuk ${roleName.toLowerCase()} telah diunduh` });
  };

  // Export users to Excel based on selected role
  const handleExportUsers = () => {
    // Filter users based on selected role
    let filteredUsers = users;
    if (selectedRole !== 'all') {
      filteredUsers = users.filter(u => u.role === selectedRole);
    } else {
      // Exclude admin from export when 'all' is selected
      filteredUsers = users.filter(u => u.role !== 'admin');
    }

    if (filteredUsers.length === 0) {
      toast({ title: 'Tidak ada data', description: `Tidak ada akun ${getRoleName(selectedRole).toLowerCase()} untuk diekspor`, variant: 'destructive' });
      return;
    }

    const columns = getRoleColumns(selectedRole);
    
    const exportData = filteredUsers.map(u => {
      const row: Record<string, any> = {};
      
      columns.forEach(col => {
        switch (col.key) {
          case 'email':
            row[col.key] = u.email;
            break;
          case 'full_name':
            row[col.key] = u.full_name;
            break;
          case 'password':
            row[col.key] = ''; // Password not exported for security
            break;
          case 'role':
            row[col.key] = u.role;
            break;
          case 'gender':
            row[col.key] = (u as any).gender || '';
            break;
          case 'nim':
            row[col.key] = u.nim || '';
            break;
          case 'nip':
            row[col.key] = u.nip || '';
            break;
          case 'enrollment_year':
            row[col.key] = u.enrollment_year || '';
            break;
          case 'program':
            row[col.key] = u.program || '';
            break;
          case 'sistem_kuliah':
            // Lookup sistem kuliah name from ID
            if (u.sistem_kuliah_id && sistemKuliahList) {
              const sk = sistemKuliahList.find(s => s.id === u.sistem_kuliah_id);
              row[col.key] = sk?.name || '';
            } else {
              row[col.key] = '';
            }
            break;
          default:
            row[col.key] = '';
        }
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = columns.map(col => ({ wch: col.width }));

    const wb = XLSX.utils.book_new();
    const roleName = getRoleName(selectedRole);
    XLSX.utils.book_append_sheet(wb, ws, `Data ${roleName}`);
    XLSX.writeFile(wb, `export_${selectedRole === 'all' ? 'akun' : selectedRole}_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({ title: 'Export berhasil', description: `${exportData.length} akun ${roleName.toLowerCase()} berhasil diekspor` });
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
        const parsedData: ImportRow[] = jsonData.map((row) => {
          const errors: string[] = [];
          
          const email = String(row.email || '').trim().toLowerCase();
          const fullName = String(row.full_name || '').trim();
          const password = String(row.password || '').trim();
          // If role is specified in file, use it; otherwise use selectedRole
          let role = String(row.role || selectedRole).trim().toLowerCase() as AppRole;
          if (selectedRole !== 'all') {
            role = selectedRole; // Force the selected role if not 'all'
          }
          const nim = String(row.nim || '').trim();
          const nip = String(row.nip || '').trim();
          const program = String(row.program || '').trim();
          const enrollmentYear = String(row.enrollment_year || '').trim();
          const gender = String(row.gender || '').trim().toLowerCase();
          const sistemKuliah = String(row.sistem_kuliah || '').trim();

          // Check if email already exists in DB
          const existsInDb = users.some(u => u.email.toLowerCase() === email);

          // Validation
          if (!email) errors.push('Email wajib diisi');
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Format email tidak valid');
          
          if (!fullName) errors.push('Nama lengkap wajib diisi');

          // Password wajib untuk akun baru
          if (!password && !(existsInDb && updateIfExists)) errors.push('Password wajib diisi');
          else if (password && password.length < 6) errors.push('Password minimal 6 karakter');
          
          // Role validation
          if (selectedRole === 'all') {
            if (!role || !['mahasiswa', 'dosen', 'admin', 'sub_admin'].includes(role)) {
              errors.push('Role harus mahasiswa, dosen, admin, atau sub_admin');
            }
          }
          
          // Role-specific validation
          if (role === 'mahasiswa' && !nim) errors.push('NIM wajib untuk mahasiswa');
          if (role === 'dosen' && !nip) errors.push('NIDN/NIDK wajib untuk dosen');

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
            role: (['mahasiswa', 'dosen', 'admin', 'sub_admin'].includes(role) ? role : 'mahasiswa') as AppRole,
            nim: nim || undefined,
            nip: nip || undefined,
            program: program || undefined,
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

      // Auto-download failure report
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
        onImportSuccess();
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

  const columns = getRoleColumns(selectedRole);
  const roleName = getRoleName(selectedRole);

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Template {roleName}
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Import {roleName}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportUsers}>
          <Download className="h-4 w-4 mr-2" />
          Export {roleName}
        </Button>
        <Button variant="outline" size="sm" onClick={handleSyncProfiles} disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          Sync Profil
        </Button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
      />

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Import {roleName}</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3 text-primary" />
              Valid: {validCount}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3 text-destructive" />
              Invalid: {invalidCount}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <RefreshCw className="h-3 w-3 text-primary" />
              Baru: {newCount}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <RefreshCw className="h-3 w-3 text-accent-foreground" />
              Sudah Ada: {existingCount}
            </Badge>
            
            <div className="flex items-center gap-2 ml-auto">
              <Checkbox 
                id="updateIfExists" 
                checked={updateIfExists} 
                onCheckedChange={(checked) => {
                  setUpdateIfExists(!!checked);
                  setImportData(revalidateImportData(importData, !!checked));
                }}
              />
              <Label htmlFor="updateIfExists" className="text-sm cursor-pointer">
                Update jika sudah ada
              </Label>
            </div>
          </div>

          {importing && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Mengimport {importProgress.current} dari {importProgress.total}...
              </span>
            </div>
          )}

          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Status</TableHead>
                  {columns.map(col => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, index) => (
                  <TableRow key={index} className={!row.isValid ? 'bg-destructive/10' : row.existsInDb ? 'bg-accent' : ''}>
                    <TableCell>
                      {row.isValid ? (
                        row.existsInDb ? (
                          <Badge variant="secondary">Update</Badge>
                        ) : (
                          <Badge variant="outline" className="border-primary text-primary">Baru</Badge>
                        )
                      ) : (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </TableCell>
                    {columns.map(col => (
                      <TableCell key={col.key} className="max-w-[150px] truncate">
                        {(row as any)[col.key] || '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-destructive text-xs max-w-[200px]">
                      {row.errors.join(', ')}
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
            <Button onClick={handleImport} disabled={validCount === 0 || importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengimport...
                </>
              ) : (
                `Import ${validCount} Akun`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
