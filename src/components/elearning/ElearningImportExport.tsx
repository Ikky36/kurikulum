import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ElearningImportExportProps {
  classId: string;
  className?: string;
  isActive?: boolean;
}

export function ElearningImportExport({ classId, className = '', isActive = true }: ElearningImportExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // 1. Fetch Class Info
      const { data: classData, error: classError } = await supabase
        .from('elearning_classes')
        .select('title, description')
        .eq('id', classId)
        .single();
        
      if (classError) throw classError;

      // 2. Fetch Materials
      const { data: materials, error: materialsError } = await supabase
        .from('elearning_materials')
        .select('*')
        .eq('elearning_class_id', classId);
        
      if (materialsError) throw materialsError;

      // 3. Fetch Assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('elearning_assignments')
        .select('*')
        .eq('elearning_class_id', classId);
        
      if (assignmentsError) throw assignmentsError;

      // 4. Fetch Quiz Questions if there are assignments
      let quizQuestions: any[] = [];
      if (assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        const { data: questions, error: questionsError } = await supabase
          .from('elearning_quiz_questions')
          .select('*')
          .in('assignment_id', assignmentIds);
          
        if (questionsError) throw questionsError;
        quizQuestions = questions;
      }

      // 5. Construct JSON
      const exportJson = {
        type: 'kurikulum_elearning_export',
        version: '1.0',
        class_info: classData,
        materials: materials.map(m => {
          const { id, created_at, updated_at, elearning_class_id, ...rest } = m;
          return { original_id: id, ...rest };
        }),
        assignments: assignments.map(a => {
          const { id, created_at, updated_at, elearning_class_id, ...rest } = a;
          return { original_id: id, ...rest };
        }),
        quiz_questions: quizQuestions.map(q => {
          const { id, created_at, updated_at, ...rest } = q;
          return { original_id: id, ...rest };
        })
      };

      // 6. Trigger Download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportJson, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href",     dataStr);
      downloadAnchorNode.setAttribute("download", `elearning_export_${classData.title.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      toast.success('Berhasil mengekspor data kelas');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.type !== 'kurikulum_elearning_export') {
          throw new Error('Format file tidak valid. Pastikan file adalah hasil export dari sistem ini.');
        }
        setImportData(json);
        setShowImportConfirm(true);
      } catch (error: any) {
        toast.error('Gagal membaca file: ' + error.message);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    if (!importData) return;
    
    try {
      setIsImporting(true);
      
      const idMap = new Map<string, string>(); // Maps original_id to new UUID
      
      // We will generate new UUIDs using crypto.randomUUID()
      // Fallback for browsers that don't support it in non-secure contexts (though Vite dev server usually does)
      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        // Fallback UUID v4 generator
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // 1. Prepare Materials
      const materialsToInsert = importData.materials.map((m: any) => {
        const newId = generateUUID();
        idMap.set(m.original_id, newId);
        
        const { original_id, ...rest } = m;
        return {
          ...rest,
          id: newId,
          elearning_class_id: classId,
          llo_id: null // Reset LLO because it belongs to another curriculum
        };
      });

      // 2. Prepare Assignments
      const assignmentsToInsert = importData.assignments.map((a: any) => {
        const newId = generateUUID();
        idMap.set(a.original_id, newId);
        
        const { original_id, ...rest } = a;
        return {
          ...rest,
          id: newId,
          elearning_class_id: classId,
          llo_id: null,
          assessment_id: null // Reset assessment link
        };
      });

      // 3. Update prerequisite IDs in materials and assignments
      materialsToInsert.forEach((m: any) => {
        if (m.prerequisite_material_id && idMap.has(m.prerequisite_material_id)) {
          m.prerequisite_material_id = idMap.get(m.prerequisite_material_id);
        } else {
          m.prerequisite_material_id = null;
        }
        if (m.prerequisite_assignment_id && idMap.has(m.prerequisite_assignment_id)) {
          m.prerequisite_assignment_id = idMap.get(m.prerequisite_assignment_id);
        } else {
          m.prerequisite_assignment_id = null;
        }
      });

      assignmentsToInsert.forEach((a: any) => {
        if (a.prerequisite_material_id && idMap.has(a.prerequisite_material_id)) {
          a.prerequisite_material_id = idMap.get(a.prerequisite_material_id);
        } else {
          a.prerequisite_material_id = null;
        }
        if (a.prerequisite_assignment_id && idMap.has(a.prerequisite_assignment_id)) {
          a.prerequisite_assignment_id = idMap.get(a.prerequisite_assignment_id);
        } else {
          a.prerequisite_assignment_id = null;
        }
      });

      // 4. Prepare Quiz Questions
      const questionsToInsert = importData.quiz_questions
        .filter((q: any) => idMap.has(q.assignment_id)) // Only insert if assignment exists
        .map((q: any) => {
          const newId = generateUUID();
          const { original_id, ...rest } = q;
          return {
            ...rest,
            id: newId,
            assignment_id: idMap.get(q.assignment_id)
          };
        });

      // 5. Execute Inserts (Batch)
      if (materialsToInsert.length > 0) {
        const { error: mErr } = await supabase.from('elearning_materials').insert(materialsToInsert);
        if (mErr) throw mErr;
      }
      
      if (assignmentsToInsert.length > 0) {
        const { error: aErr } = await supabase.from('elearning_assignments').insert(assignmentsToInsert);
        if (aErr) throw aErr;
      }

      if (questionsToInsert.length > 0) {
        const { error: qErr } = await supabase.from('elearning_quiz_questions').insert(questionsToInsert);
        if (qErr) throw qErr;
      }

      toast.success('Berhasil mengimpor data kelas!');
      setShowImportConfirm(false);
      setImportData(null);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['elearning-materials', classId] });
      queryClient.invalidateQueries({ queryKey: ['elearning-assignments', classId] });

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Gagal mengimpor data: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isActive) return null;

  return (
    <>
      <div className={`flex gap-2 ${className}`}>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExport}
          disabled={isExporting}
          className="text-xs h-8"
        >
          <Download className="w-3 h-3 mr-1" />
          {isExporting ? 'Mengekspor...' : 'Export'}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="text-xs h-8"
        >
          <Upload className="w-3 h-3 mr-1" />
          Import
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
      </div>

      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Import Data</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengimpor data kelas dari file ini? 
            </DialogDescription>
          </DialogHeader>
          
          {importData && (
            <div className="bg-muted p-4 rounded-md space-y-2 text-sm my-2 border">
              <div className="font-semibold">{importData.class_info?.title}</div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>{importData.materials?.length || 0} Materi Pembelajaran</li>
                <li>{importData.assignments?.length || 0} Tugas & Kuis</li>
                <li>{importData.quiz_questions?.length || 0} Soal Kuis</li>
              </ul>
              <div className="flex gap-2 items-start text-amber-600 bg-amber-50 p-2 rounded mt-4 border border-amber-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-xs">
                  Proses ini akan menambahkan materi dan tugas tersebut ke dalam kelas ini. Data tidak akan menimpa materi yang sudah ada, melainkan menambahkannya.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportConfirm(false)} disabled={isImporting}>
              Batal
            </Button>
            <Button onClick={executeImport} disabled={isImporting}>
              {isImporting ? 'Mengimpor...' : 'Ya, Import Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
