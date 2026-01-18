import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';

interface Assessment {
  id: string;
  code: string;
  name: string;
  weight: number;
}

interface Student {
  id: string;
  full_name: string;
  nim: string | null;
  enrollment_year?: number | null;
  class_group?: string | null;
  email?: string | null;
}

interface ImportRow {
  nim: string;
  studentName: string;
  studentId: string | null;
  scores: Record<string, number | null>;
  isValid: boolean;
  errors: string[];
}

interface AssessmentScoreImportExportProps {
  courseId: string;
  courseName: string;
  assessments: Assessment[];
  students: Student[];
  existingScores: Array<{
    assessment_id: string;
    student_profile_id: string;
    score: number;
  }>;
}

export function AssessmentScoreImportExport({
  courseId,
  courseName,
  assessments,
  students,
  existingScores,
}: AssessmentScoreImportExportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Export field options
  const [exportFields, setExportFields] = useState({
    no: true,
    nim: true,
    nama: true,
    angkatan: true,
    kelas: true,
    email: false,
    scores: true,
    capaian: true,
  });

  // Export filters
  const [exportFilters, setExportFilters] = useState({
    angkatan: 'all',
    kelas: 'all',
  });

  // Get unique values for filters
  const uniqueAngkatan = [...new Set(students.filter(s => s.enrollment_year).map(s => s.enrollment_year))].sort((a, b) => (b || 0) - (a || 0));
  const uniqueKelas = [...new Set(students.filter(s => s.class_group).map(s => s.class_group))].sort();

  // Download template Excel
  const handleDownloadTemplate = () => {
    const templateData = students.map(student => {
      const row: Record<string, any> = {
        nim: student.nim || '',
        nama: student.full_name,
      };
      
      // Add assessment columns
      assessments.forEach(assessment => {
        const existingScore = existingScores.find(
          s => s.assessment_id === assessment.id && s.student_profile_id === student.id
        );
        row[assessment.code] = existingScore?.score ?? '';
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // nim
      { wch: 25 }, // nama
      ...assessments.map(() => ({ wch: 10 })), // assessment columns
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai Tugas');
    XLSX.writeFile(wb, `nilai_tugas_${courseName.replace(/\s+/g, '_')}.xlsx`);

    toast({ title: 'Template berhasil diunduh', description: 'Silakan isi nilai sesuai format template' });
  };

  // Export scores to Excel with selected fields
  const handleExportScores = () => {
    // Filter students based on selected filters
    const filteredStudents = students.filter(student => {
      if (exportFilters.angkatan !== 'all' && String(student.enrollment_year) !== exportFilters.angkatan) {
        return false;
      }
      if (exportFilters.kelas !== 'all' && student.class_group !== exportFilters.kelas) {
        return false;
      }
      return true;
    });

    if (filteredStudents.length === 0) {
      toast({ title: 'Tidak ada data', description: 'Tidak ada mahasiswa yang sesuai dengan filter', variant: 'destructive' });
      return;
    }

    const exportData = filteredStudents.map((student, index) => {
      const row: Record<string, any> = {};
      
      if (exportFields.no) row['No'] = index + 1;
      if (exportFields.nim) row['NIM'] = student.nim || '';
      if (exportFields.nama) row['Nama'] = student.full_name;
      if (exportFields.angkatan) row['Angkatan'] = student.enrollment_year || '';
      if (exportFields.kelas) row['Kelas'] = student.class_group || '';
      if (exportFields.email) row['Email'] = student.email || '';
      
      if (exportFields.scores) {
        assessments.forEach(assessment => {
          const score = existingScores.find(
            s => s.assessment_id === assessment.id && s.student_profile_id === student.id
          );
          row[`${assessment.code} (${assessment.weight}%)`] = score?.score ?? '-';
        });
      }

      if (exportFields.capaian) {
        // Calculate achievement
        let weightedSum = 0;
        let totalWeight = 0;
        assessments.forEach(assessment => {
          const score = existingScores.find(
            s => s.assessment_id === assessment.id && s.student_profile_id === student.id
          );
          if (score?.score !== undefined) {
            totalWeight += assessment.weight;
            weightedSum += (score.score / 100) * assessment.weight;
          }
        });
        const achievement = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : null;
        row['Capaian (%)'] = achievement !== null ? achievement.toFixed(1) : '-';
      }
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths: { wch: number }[] = [];
    if (exportFields.no) colWidths.push({ wch: 5 });
    if (exportFields.nim) colWidths.push({ wch: 15 });
    if (exportFields.nama) colWidths.push({ wch: 25 });
    if (exportFields.angkatan) colWidths.push({ wch: 10 });
    if (exportFields.kelas) colWidths.push({ wch: 10 });
    if (exportFields.email) colWidths.push({ wch: 25 });
    if (exportFields.scores) assessments.forEach(() => colWidths.push({ wch: 12 }));
    if (exportFields.capaian) colWidths.push({ wch: 12 });
    
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai Mahasiswa');
    XLSX.writeFile(wb, `export_nilai_${courseName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({ title: 'Export berhasil', description: `Nilai ${filteredStudents.length} mahasiswa berhasil diekspor` });
    setShowExportDialog(false);
    // Reset filters
    setExportFilters({ angkatan: 'all', kelas: 'all' });
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
          
          const nim = String(row.nim || '').trim();
          
          // Find student by NIM
          const student = students.find(s => s.nim === nim);
          if (!nim) {
            errors.push('NIM kosong');
          } else if (!student) {
            errors.push('NIM tidak ditemukan');
          }

          // Parse scores for each assessment
          const scores: Record<string, number | null> = {};
          assessments.forEach(assessment => {
            const rawScore = row[assessment.code];
            if (rawScore !== undefined && rawScore !== '' && rawScore !== null) {
              const numScore = Number(rawScore);
              if (isNaN(numScore)) {
                errors.push(`${assessment.code}: bukan angka`);
                scores[assessment.id] = null;
              } else if (numScore < 0 || numScore > 100) {
                errors.push(`${assessment.code}: harus 0-100`);
                scores[assessment.id] = null;
              } else {
                scores[assessment.id] = numScore;
              }
            } else {
              scores[assessment.id] = null;
            }
          });

          return {
            nim,
            studentName: student?.full_name || row.nama || 'Unknown',
            studentId: student?.id || null,
            scores,
            isValid: errors.length === 0 && student !== undefined,
            errors,
          };
        });

        setImportData(parsedData);
        setShowImportDialog(true);
      } catch (error) {
        toast({ title: 'Gagal membaca file', description: 'Pastikan file dalam format Excel yang valid', variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Import valid data
  const handleImport = async () => {
    const validData = importData.filter(row => row.isValid && row.studentId);
    if (validData.length === 0) {
      toast({ title: 'Tidak ada data valid', description: 'Perbaiki error pada data sebelum import', variant: 'destructive' });
      return;
    }

    setImporting(true);
    
    // Collect all score upserts
    const upserts: Array<{
      assessment_id: string;
      student_profile_id: string;
      score: number;
    }> = [];

    validData.forEach(row => {
      if (!row.studentId) return;
      
      Object.entries(row.scores).forEach(([assessmentId, score]) => {
        if (score !== null) {
          upserts.push({
            assessment_id: assessmentId,
            student_profile_id: row.studentId!,
            score,
          });
        }
      });
    });

    setImportProgress({ current: 0, total: upserts.length });

    let successCount = 0;
    let errorCount = 0;

    // Batch upsert
    for (let i = 0; i < upserts.length; i++) {
      const upsert = upserts[i];
      setImportProgress({ current: i + 1, total: upserts.length });

      const { error } = await supabase
        .from('student_assessment_scores')
        .upsert(upsert, { onConflict: 'assessment_id,student_profile_id' });

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setImporting(false);
    setShowImportDialog(false);
    setImportData([]);

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['course-assessment-scores', courseId] });

    const skippedRows = importData.length - validData.length;
    if (successCount > 0) {
      let message = `${successCount} nilai berhasil diimport`;
      if (skippedRows > 0) message += `, ${skippedRows} baris dilewati (data tidak valid)`;
      if (errorCount > 0) message += `, ${errorCount} gagal tersimpan`;
      toast({
        title: 'Import Selesai',
        description: message,
      });
    } else {
      toast({
        title: 'Import gagal',
        description: 'Tidak ada nilai yang berhasil diimport',
        variant: 'destructive',
      });
    }
  };

  const toggleExportField = (field: keyof typeof exportFields) => {
    setExportFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validCount = importData.filter(r => r.isValid).length;
  const invalidCount = importData.filter(r => !r.isValid).length;

  if (assessments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Download Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Import Nilai
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
          <Download className="h-4 w-4 mr-2" />
          Export Nilai
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Export Options Dialog */}
      <Dialog open={showExportDialog} onOpenChange={(open) => {
        setShowExportDialog(open);
        if (!open) setExportFilters({ angkatan: 'all', kelas: 'all' });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Data Mahasiswa</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Filter Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Filter Data</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kelas</Label>
                  <Select value={exportFilters.kelas} onValueChange={(value) => setExportFilters(prev => ({ ...prev, kelas: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kelas</SelectItem>
                      {uniqueKelas.filter(kelas => kelas).map(kelas => (
                        <SelectItem key={kelas} value={kelas!}>{kelas}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Angkatan</Label>
                  <Select value={exportFilters.angkatan} onValueChange={(value) => setExportFilters(prev => ({ ...prev, angkatan: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Angkatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Angkatan</SelectItem>
                      {uniqueAngkatan.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Field Selection */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Pilih Kolom Data</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-no" 
                    checked={exportFields.no}
                    onCheckedChange={() => toggleExportField('no')}
                  />
                  <Label htmlFor="export-no" className="cursor-pointer">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-nim" 
                    checked={exportFields.nim}
                    onCheckedChange={() => toggleExportField('nim')}
                  />
                  <Label htmlFor="export-nim" className="cursor-pointer">NIM</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-nama" 
                    checked={exportFields.nama}
                    onCheckedChange={() => toggleExportField('nama')}
                  />
                  <Label htmlFor="export-nama" className="cursor-pointer">Nama</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-angkatan" 
                    checked={exportFields.angkatan}
                    onCheckedChange={() => toggleExportField('angkatan')}
                  />
                  <Label htmlFor="export-angkatan" className="cursor-pointer">Angkatan</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-kelas" 
                    checked={exportFields.kelas}
                    onCheckedChange={() => toggleExportField('kelas')}
                  />
                  <Label htmlFor="export-kelas" className="cursor-pointer">Kelas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-email" 
                    checked={exportFields.email}
                    onCheckedChange={() => toggleExportField('email')}
                  />
                  <Label htmlFor="export-email" className="cursor-pointer">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-scores" 
                    checked={exportFields.scores}
                    onCheckedChange={() => toggleExportField('scores')}
                  />
                  <Label htmlFor="export-scores" className="cursor-pointer">Nilai Tugas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-capaian" 
                    checked={exportFields.capaian}
                    onCheckedChange={() => toggleExportField('capaian')}
                  />
                  <Label htmlFor="export-capaian" className="cursor-pointer">Capaian (%)</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleExportScores}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => { if (!importing) setShowImportDialog(open); }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Import Nilai Tugas</DialogTitle>
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
                  {assessments.map(a => (
                    <TableHead key={a.id} className="text-center text-primary-foreground">{a.code}</TableHead>
                  ))}
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
                    <TableCell>{row.studentName}</TableCell>
                    {assessments.map(a => (
                      <TableCell key={a.id} className="text-center">
                        {row.scores[a.id] !== null ? row.scores[a.id] : '-'}
                      </TableCell>
                    ))}
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
                `Import ${validCount} Data Valid`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}