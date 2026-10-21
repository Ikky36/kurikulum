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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-xs text-slate-800">
              <thead>
                <tr className="bg-slate-100/90 text-slate-900 font-bold border-b border-slate-400 text-center">
                  {isColEnabled('no') && (
                    <th className="border border-slate-400 px-2 py-1.5 w-10">
                      {getColLabel('no', 'No')}
                    </th>
                  )}
                  {isColEnabled('code') && (
                    <th className="border border-slate-400 px-2 py-1.5 w-24">
                      {getColLabel('code', 'Kode MK')}
                    </th>
                  )}
                  {isColEnabled('name') && (
                    <th className="border border-slate-400 px-3 py-1.5 text-left">
                      {getColLabel('name', 'Nama Mata Kuliah')}
                    </th>
                  )}
                  {isColEnabled('sks') && (
                    <th className="border border-slate-400 px-2 py-1.5 w-14 text-center">
                      {getColLabel('sks', 'SKS')}
                    </th>
                  )}
                  {isColEnabled('class_group') && (
                    <th className="border border-slate-400 px-2 py-1.5 w-24 text-center">
                      {getColLabel('class_group', 'Kelas / Rombel')}
                    </th>
                  )}
                  {isColEnabled('lecturer') && (
                    <th className="border border-slate-400 px-3 py-1.5 text-left">
                      {getColLabel('lecturer', 'Dosen Pengampu')}
                    </th>
                  )}
                  {isColEnabled('schedule') && (
                    <th className="border border-slate-400 px-2 py-1.5 text-center">
                      {getColLabel('schedule', 'Jadwal Kuliah')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
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
                      <tr key={item.id || index} className="border-b border-slate-300 hover:bg-slate-50/50">
                        {isColEnabled('no') && (
                          <td className="border border-slate-400 text-center py-2 px-1 font-medium">
                            {index + 1}
                          </td>
                        )}
                        {isColEnabled('code') && (
                          <td className="border border-slate-400 text-center py-2 px-2 font-mono text-[11px] font-semibold">
                            {course.code || '-'}
                          </td>
                        )}
                        {isColEnabled('name') && (
                          <td className="border border-slate-400 py-2 px-3 font-medium">
                            {course.name || '-'}
                          </td>
                        )}
                        {isColEnabled('sks') && (
                          <td className="border border-slate-400 text-center py-2 px-2 font-semibold">
                            {sks}
                          </td>
                        )}
                        {isColEnabled('class_group') && (
                          <td className="border border-slate-400 text-center py-2 px-2">
                            {className}
                          </td>
                        )}
                        {isColEnabled('lecturer') && (
                          <td className="border border-slate-400 py-2 px-3 text-[11px]">
                            {lecturerName}
                          </td>
                        )}
                        {isColEnabled('schedule') && (
                          <td className="border border-slate-400 py-2 px-2 text-center text-[11px]">
                            {item.schedule || '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={template.columns.filter((c) => c.enabled).length}
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
                      colSpan={
                        (isColEnabled('no') ? 1 : 0) +
                        (isColEnabled('code') ? 1 : 0) +
                        (isColEnabled('name') ? 1 : 0)
                      }
                      className="border border-slate-400 py-2 px-3 text-right"
                    >
                      Total Beban Studi (SKS) :
                    </td>
                    {isColEnabled('sks') && (
                      <td className="border border-slate-400 py-2 px-2 text-center text-sm font-extrabold text-slate-900">
                        {totalSks}
                      </td>
                    )}
                    <td
                      colSpan={
                        (isColEnabled('class_group') ? 1 : 0) +
                        (isColEnabled('lecturer') ? 1 : 0) +
                        (isColEnabled('schedule') ? 1 : 0)
                      }
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
