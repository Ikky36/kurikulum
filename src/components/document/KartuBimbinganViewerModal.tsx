import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UniversalDocumentContainer, DocumentSignatureData } from './UniversalDocumentContainer';
import { useDocumentTemplatesConfig } from '@/lib/documentTemplateTypes';
import { useDocumentSettings } from '@/lib/documentSettings';
import { Check } from 'lucide-react';

export interface KartuBimbinganViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: any;
  consultationLogs: any[];
  studentProfile?: any;
}

export function KartuBimbinganViewerModal({
  open,
  onOpenChange,
  submission,
  consultationLogs = [],
  studentProfile,
}: KartuBimbinganViewerModalProps) {
  const { getTemplate } = useDocumentTemplatesConfig();
  const { settings: docSettings } = useDocumentSettings();
  const template = getTemplate('kartu_bimbingan_ta');

  if (!submission) return null;

  // Extract Advisors
  const advisors = submission.ta_advisors || [];
  const advisor1 = advisors.find(
    (a: any) => a.role === 'pembimbing_1' || a.role?.toLowerCase()?.includes('1') || a.role?.toLowerCase()?.includes('utama')
  ) || advisors[0];
  const advisor2 = advisors.find(
    (a: any) => (a.role === 'pembimbing_2' || a.role?.toLowerCase()?.includes('2') || a.role?.toLowerCase()?.includes('pendamping')) && a !== advisor1
  ) || (advisors.length > 1 ? advisors[1] : null);

  // Student Info
  const mhsName = submission.profiles?.full_name || studentProfile?.full_name || 'Mahasiswa';
  const mhsNim = submission.profiles?.nim || studentProfile?.nim || '-';
  const mhsProgram = submission.profiles?.program || studentProfile?.program || docSettings.program_name || '-';
  const mhsSistem = submission.sistem_kuliah?.name || (studentProfile as any)?.sistem_kuliah?.name || 'Reguler';

  // Metadata items
  const metadataItems = [
    { label: 'Judul Tugas Akhir', value: <span className="font-semibold uppercase">{submission.title}</span> },
    { label: 'Jenis Tugas Akhir', value: submission.ta_types?.name || 'Skripsi' },
    { label: 'Dosen Pembimbing I', value: advisor1?.profiles?.full_name || '-' },
  ];

  if (advisor2?.profiles?.full_name) {
    metadataItems.push({ label: 'Dosen Pembimbing II', value: advisor2.profiles.full_name });
  }

  // Signatures Data
  const signaturesData: Record<string, DocumentSignatureData> = {
    student: {
      name: mhsName,
      id_number: mhsNim,
    },
    advisor_1: {
      name: advisor1?.profiles?.full_name || '....................................',
      id_number: advisor1?.profiles?.nip,
      signature_url: advisor1?.profiles?.signature_url,
      paraf_url: advisor1?.profiles?.paraf_url,
    },
    advisor_2: {
      name: advisor2?.profiles?.full_name || '....................................',
      id_number: advisor2?.profiles?.nip,
      signature_url: advisor2?.profiles?.signature_url,
      paraf_url: advisor2?.profiles?.paraf_url,
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

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Sort logs by date ascending for official card view
  const sortedLogs = [...consultationLogs].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full p-0 max-h-[95vh] overflow-y-auto bg-transparent border-none shadow-none">
        <UniversalDocumentContainer
          templateCode="kartu_bimbingan_ta"
          studentInfo={{
            name: mhsName,
            nim: mhsNim,
            program: mhsProgram,
            sistem_kuliah: mhsSistem,
          }}
          variables={{
            nama_mahasiswa: mhsName,
            nim: mhsNim,
            program_studi: mhsProgram,
            judul_tugas_akhir: submission.title || '',
            nama_pembimbing_1: advisor1?.profiles?.full_name || '',
            nidn_pembimbing_1: advisor1?.profiles?.nip || advisor1?.profiles?.nidn || '',
            nama_pembimbing_2: advisor2?.profiles?.full_name || '',
            nidn_pembimbing_2: advisor2?.profiles?.nip || advisor2?.profiles?.nidn || '',
            jenis_tugas_akhir: submission.ta_types?.name || 'Skripsi',
            status_tugas_akhir: submission.status || '',
            total_pertemuan_bimbingan: `${sortedLogs.length} Pertemuan`,
          }}
          metadataItems={metadataItems}
          signaturesData={signaturesData}
          onClose={() => onOpenChange(false)}
        >
          {/* TABEL DATA LOG BIMBINGAN */}
          <div className="w-full overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse border border-slate-400 text-xs text-slate-800 [page-break-inside:auto] [break-inside:auto]">
              <thead className="table-header-group">
                <tr className="bg-slate-100/90 text-slate-900 font-bold border-b border-slate-400 text-center [page-break-inside:avoid] [break-inside:avoid]">
                  {template.columns.map((col) => (
                    <th
                      key={col.id}
                      className={`border border-slate-400 px-2 py-1.5 ${
                        col.id === 'no' ? 'w-10 text-center' :
                        col.id === 'date' ? 'w-28 text-center whitespace-nowrap' :
                        col.id === 'paraf' ? 'w-28 text-center' :
                        col.id === 'advisor_name' ? 'w-36 text-left' :
                        'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="table-row-group">
                {sortedLogs.length > 0 ? (
                  sortedLogs.map((log, index) => {
                    const isApproved = log.status === 'approved';
                    const advisorProfile = log.profiles || {};
                    const parafImg = advisorProfile.paraf_url || advisorProfile.signature_url;

                    return (
                      <tr key={log.id || index} className="border-b border-slate-300 hover:bg-slate-50/50 [page-break-inside:avoid] [break-inside:avoid]">
                        {template.columns.map((col) => {
                          const baseId = col.id.split('_')[0];
                          if (baseId === 'no') {
                            return (
                              <td key={col.id} className="border border-slate-400 text-center py-2 px-1 font-medium">
                                {index + 1}
                              </td>
                            );
                          }
                          if (baseId === 'date') {
                            return (
                              <td key={col.id} className="border border-slate-400 text-center py-2 px-2 whitespace-nowrap text-[11px]">
                                {formatDate(log.date)}
                              </td>
                            );
                          }
                          if (baseId === 'topic') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-2 px-3 align-top leading-relaxed font-medium">
                                {log.problem || '-'}
                              </td>
                            );
                          }
                          if (baseId === 'notes') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-2 px-3 align-top leading-relaxed text-slate-700">
                                {log.solution || (
                                  <span className="text-slate-400 italic text-[11px]">
                                    {isApproved ? 'Telah disetujui tanpa catatan tambahan' : 'Menunggu tanggapan'}
                                  </span>
                                )}
                              </td>
                            );
                          }
                          if (baseId === 'advisor' || baseId === 'advisor_name') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-2 px-2 align-top text-[11px]">
                                {advisorProfile.full_name || '-'}
                              </td>
                            );
                          }
                          if (baseId === 'paraf') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-1 px-1 text-center align-middle">
                                {isApproved ? (
                                  parafImg ? (
                                    <div className="h-9 w-full flex items-center justify-center">
                                      <img
                                        src={parafImg}
                                        alt="Paraf Dosen"
                                        className="max-h-8 max-w-[85px] object-contain drop-shadow-sm"
                                      />
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                      <Check className="h-3 w-3" /> Valid
                                    </div>
                                  )
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Belum diparaf
                                  </span>
                                )}
                              </td>
                            );
                          }
                          if (baseId === 'duration') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-2 px-2 text-center text-[11px]">
                                {log.duration || '-'}
                              </td>
                            );
                          }
                          if (baseId === 'status') {
                            return (
                              <td key={col.id} className="border border-slate-400 py-2 px-2 text-center text-[11px]">
                                {isApproved ? 'Disetujui' : 'Revisi'}
                              </td>
                            );
                          }
                          // Custom or manual column
                          return (
                            <td key={col.id} className="border border-slate-400 py-2 px-2 text-center text-[11px] text-slate-500">
                              {log[col.id] || '-'}
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
                      Belum ada riwayat bimbingan tugas akhir yang tercatat.
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
