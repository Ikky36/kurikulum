import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UniversalDocumentContainer, DocumentSignatureData } from './UniversalDocumentContainer';
import { useDocumentTemplatesConfig } from '@/lib/documentTemplateTypes';
import { useDocumentSettings } from '@/lib/documentSettings';

export interface KrsDocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  krsData?: any;
  krsItems: any[];
  studentProfile?: any;
  dpaProfile?: any;
  semesterName?: string;
  academicYearName?: string;
}

export function KrsDocumentViewerModal({
  open,
  onOpenChange,
  krsData,
  krsItems = [],
  studentProfile,
  dpaProfile,
  semesterName,
  academicYearName,
}: KrsDocumentViewerModalProps) {
  const { getTemplate } = useDocumentTemplatesConfig();
  const { settings: docSettings } = useDocumentSettings();
  const template = getTemplate('krs');

  // Student Info
  const mhsName = studentProfile?.full_name || 'Mahasiswa';
  const mhsNim = studentProfile?.nim || '-';
  const mhsProgram = studentProfile?.program || docSettings.program_name || '-';
  const mhsSistem = (studentProfile as any)?.sistem_kuliah?.name || (studentProfile as any)?.sistem_kuliah_id || 'Reguler';

  // Signatures Data
  const signaturesData: Record<string, DocumentSignatureData> = {
    student: {
      name: mhsName,
      id_number: mhsNim,
    },
    dpa: {
      name: dpaProfile?.full_name || '....................................',
      id_number: dpaProfile?.nip,
      signature_url: dpaProfile?.signature_url,
      paraf_url: dpaProfile?.paraf_url,
    },
    kaprodi: {
      name: docSettings.kaprodi_name || '....................................',
      id_number: docSettings.kaprodi_nidn,
      signature_url: docSettings.kaprodi_signature_url,
    },
  };

  // Filter columns based on template configuration
  const colMap = new Map(template.columns.map((c) => [c.id, c]));
  const isColEnabled = (id: string) => colMap.get(id)?.enabled ?? true;
  const getColLabel = (id: string, fallback: string) => colMap.get(id)?.label || fallback;

  // Calculate Total SKS
  const totalSks = krsItems.reduce((acc, item) => {
    const sksVal = Number(item.courses?.sks || item.sks || 0);
    return acc + (isNaN(sksVal) ? 0 : sksVal);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full p-0 max-h-[95vh] overflow-y-auto bg-transparent border-none shadow-none">
        <UniversalDocumentContainer
          templateCode="krs"
          studentInfo={{
            name: mhsName,
            nim: mhsNim,
            program: mhsProgram,
            sistem_kuliah: mhsSistem,
            semester: semesterName,
            academic_year: academicYearName,
          }}
          variables={{
            nama_mahasiswa: mhsName,
            nim: mhsNim,
            program_studi: mhsProgram,
            semester_aktif: semesterName || '',
            tahun_akademik: academicYearName || '',
            total_sks_semester: `${totalSks} SKS`,
            nama_dpa: dpaProfile?.full_name || '',
            nidn_dpa: dpaProfile?.nip || dpaProfile?.nidn || '',
          }}
          metadataItems={[
            { label: 'Dosen Pembimbing (DPA)', value: dpaProfile?.full_name || 'Belum Ditentukan' },
          ]}
          signaturesData={signaturesData}
          onClose={() => onOpenChange(false)}
        >
          {/* TABEL DATA KRS */}
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse border border-slate-400 text-xs text-slate-800 [page-break-inside:auto] [break-inside:auto]">
              <thead className="table-header-group">
                <tr className="bg-slate-100/90 text-slate-900 font-bold border-b border-slate-400 text-center [page-break-inside:avoid] [break-inside:avoid]">
                  {template.columns.map((col) => (
                    <th
                      key={col.id}
                      className={`border border-slate-400 px-2 py-1.5 ${
                        col.id === 'no' ? 'w-10 text-center' :
                        col.id === 'code' ? 'w-24 text-center' :
                        col.id === 'sks' ? 'w-14 text-center' :
                        col.id === 'class_group' ? 'w-24 text-center' :
                        'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="table-row-group">
                {krsItems.length > 0 ? (
                  krsItems.map((item, index) => {
                    const course = item.courses || item;
                    const sks = course.sks || 0;
                    const className = item.class_groups?.name || item.class_group || '-';
                    const instructors = course.course_instructors || [];
                    const lecturerName = instructors.length > 0 
                      ? instructors.map((ci: any) => ci.profiles?.full_name).filter(Boolean).join(', ')
                      : (item.lecturer_name || '-');

                    return (
                      <tr key={item.id || index} className="border-b border-slate-300 hover:bg-slate-50/50 [page-break-inside:avoid] [break-inside:avoid]">
                        {template.columns.map((col) => {
                          const baseId = col.id.split('_')[0];
                          if (baseId === 'no') {
                            return (
                              <td key={col.id} className="border border-slate-400 text-center py-2 px-1 font-medium">
                                {index + 1}
                              </td>
                            );
                          }
                          if (baseId === 'code') {
                            return (
                              <td key={col.id} className="border border-slate-400 text-center py-2 px-2 font-mono text-[11px] font-semibold">
                                {course.code || '-'}
                              </td>
                            );
                          }
                          if (baseId === 'name') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-2 px-3 font-medium">
                                {course.name || '-'}
                              </td>
                            );
                          }
                          if (baseId === 'sks') {
                            return (
                              <td key={col.id} className="border border-slate-400 text-center py-2 px-2 font-semibold">
                                {sks}
                              </td>
                            );
                          }
                          if (baseId === 'class' || baseId === 'class_group') {
                            return (
                              <td key={col.id} className="border border-slate-400 text-center py-2 px-2">
                                {className}
                              </td>
                            );
                          }
                          if (baseId === 'lecturer') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-2 px-3 text-[11px]">
                                {lecturerName}
                              </td>
                            );
                          }
                          if (baseId === 'schedule') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-2 px-2 text-center text-[11px]">
                                {item.schedule || '-'}
                              </td>
                            );
                          }
                          if (baseId === 'room') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-2 px-2 text-center text-[11px]">
                                {item.room || '-'}
                              </td>
                            );
                          }
                          return (
                            <td key={col.id} className="border border-slate-400 py-2 px-2 text-center text-[11px] text-slate-500">
                              {item[col.id] || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={template.columns.length}
                      className="border border-slate-400 text-center py-8 text-slate-400 italic"
                    >
                      Belum ada mata kuliah yang dikontrak dalam KRS ini.
                    </td>
                  </tr>
                )}

                {/* BARIS TOTAL SKS */}
                {krsItems.length > 0 && (
                  <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-400">
                    <td
                      colSpan={Math.max(1, template.columns.findIndex((c) => c.id.startsWith('sks')) > 0 ? template.columns.findIndex((c) => c.id.startsWith('sks')) : 1)}
                      className="border border-slate-400 py-2 px-3 text-right"
                    >
                      Total Beban Studi (SKS) :
                    </td>
                    {template.columns.some((c) => c.id.startsWith('sks')) && (
                      <td className="border border-slate-400 py-2 px-2 text-center text-sm font-extrabold text-slate-900">
                        {totalSks}
                      </td>
                    )}
                    <td
                      colSpan={Math.max(1, template.columns.length - (template.columns.findIndex((c) => c.id.startsWith('sks')) + 1))}
                      className="border border-slate-400 py-2 px-2 text-left text-[11px] text-slate-600 font-normal italic"
                    >
                      (Maksimal 24 SKS per semester)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </UniversalDocumentContainer>
      </DialogContent>
    </Dialog>
  );
}
