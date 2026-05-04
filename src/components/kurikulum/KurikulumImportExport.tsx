import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TableColumn {
  key: string;
  label: string;
  required?: boolean;
  /** Format for export (e.g. stringify JSON, count items). Receives the whole row. */
  exportValue?: (item: any) => any;
  /** Skip this column for the import template / import row */
  importOnlyExport?: boolean;
}

interface TableConfig {
  tableName: string;
  displayName: string;
  columns: TableColumn[];
  queryKey: string;
}

interface KurikulumImportExportProps {
  tableConfig: TableConfig;
  data: any[];
  /** Extra fields automatically appended to every imported row (e.g. curriculum_id). */
  extraDefaults?: Record<string, any>;
}

type ImportRow = Record<string, any> & { status?: 'valid' | 'error' | 'exists'; message?: string };

export function KurikulumImportExport({ tableConfig, data }: KurikulumImportExportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);

  // Download template
  const handleDownloadTemplate = () => {
    const templateData = [{}];
    tableConfig.columns.forEach(col => {
      templateData[0][col.key] = col.key === 'code' ? 'CONTOH1' : `Contoh ${col.label}`;
    });

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = tableConfig.columns.map(col => ({ wch: Math.max(col.label.length + 5, 20) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tableConfig.displayName);
    XLSX.writeFile(wb, `template_${tableConfig.tableName}.xlsx`);

    toast({ title: 'Template berhasil diunduh', description: 'Silakan isi data sesuai format template' });
  };

  // Export data
  const handleExport = () => {
    if (data.length === 0) {
      toast({ title: 'Tidak ada data', description: 'Belum ada data untuk diekspor', variant: 'destructive' });
      return;
    }

    const exportData = data.map((item, idx) => {
      const row: Record<string, any> = { no: idx + 1 };
      tableConfig.columns.forEach(col => {
        row[col.key] = item[col.key] || '';
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 5 }, ...tableConfig.columns.map(col => ({ wch: Math.max(col.label.length + 5, 20) }))];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tableConfig.displayName);
    XLSX.writeFile(wb, `${tableConfig.tableName}_export.xlsx`);

    toast({ title: 'Data berhasil diekspor', description: `${data.length} data berhasil diekspor` });
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];

        // Validate and mark rows
        const validatedData: ImportRow[] = jsonData.map((row) => {
          const missingFields: string[] = [];
          tableConfig.columns.forEach(col => {
            if (col.required && !row[col.key]) {
              missingFields.push(col.label);
            }
          });

          if (missingFields.length > 0) {
            return { ...row, status: 'error' as const, message: `Field wajib kosong: ${missingFields.join(', ')}` };
          }

          // Check if code already exists
          if (row.code && data.some(d => d.code === row.code)) {
            return { ...row, status: 'exists' as const, message: 'Kode sudah ada di database' };
          }

          return { ...row, status: 'valid' as const };
        });

        setImportData(validatedData);
        setShowImportDialog(true);
      } catch {
        toast({ title: 'Gagal membaca file', description: 'Pastikan file Excel valid', variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Import data
  const handleImport = async () => {
    const validRows = importData.filter(row => row.status === 'valid');
    if (validRows.length === 0) {
      toast({ title: 'Tidak ada data valid', description: 'Semua data memiliki error atau sudah ada', variant: 'destructive' });
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      const insertData: Record<string, any> = {};
      tableConfig.columns.forEach(col => {
        if (row[col.key]) insertData[col.key] = row[col.key];
      });

      const { error } = await supabase.from(tableConfig.tableName as any).insert(insertData);
      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setImporting(false);
    setShowImportDialog(false);
    setImportData([]);
    queryClient.invalidateQueries({ queryKey: [tableConfig.queryKey] });

    const skippedCount = importData.length - validRows.length;
    if (successCount > 0) {
      let message = `${successCount} data berhasil diimport`;
      if (skippedCount > 0) message += `, ${skippedCount} baris dilewati (error/sudah ada)`;
      if (errorCount > 0) message += `, ${errorCount} gagal tersimpan`;
      toast({ title: 'Import Selesai', description: message });
    } else {
      toast({ title: 'Import gagal', description: 'Tidak ada data yang berhasil diimport', variant: 'destructive' });
    }
  };

  const validCount = importData.filter(r => r.status === 'valid').length;
  const errorCount = importData.filter(r => r.status === 'error').length;
  const existsCount = importData.filter(r => r.status === 'exists').length;

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" />
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Import {tableConfig.displayName}</DialogTitle>
            <DialogDescription>
              Preview data yang akan diimport. Data yang valid akan tetap diimport meskipun ada beberapa baris yang error.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 text-sm mb-4">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Valid: {validCount}
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertCircle className="h-4 w-4" /> Sudah ada: {existsCount}
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" /> Error: {errorCount}
            </span>
          </div>

          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  {tableConfig.columns.map(col => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, idx) => (
                  <TableRow key={idx} className={
                    row.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : 
                    row.status === 'exists' ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''
                  }>
                    <TableCell>{idx + 1}</TableCell>
                    {tableConfig.columns.map(col => (
                      <TableCell key={col.key}>{row[col.key] || '-'}</TableCell>
                    ))}
                    <TableCell>
                      {row.status === 'valid' && <span className="text-green-600 text-sm">✓ Valid</span>}
                      {row.status === 'error' && <span className="text-red-600 text-sm">{row.message}</span>}
                      {row.status === 'exists' && <span className="text-yellow-600 text-sm">{row.message}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Batal</Button>
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? 'Mengimport...' : `Import ${validCount} Data`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
