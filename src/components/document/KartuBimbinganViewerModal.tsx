import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UniversalDocumentContainer, DocumentSignatureData } from './UniversalDocumentContainer';
import { useDocumentTemplatesConfig } from '@/lib/documentTemplateTypes';
import { useDocumentSettings } from '@/lib/documentSettings';
import { parseApprovalsFromComments } from '@/lib/documentApprovals';
import { Check, ShieldCheck } from 'lucide-react';

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
  const { templatesMap, getTemplate } = useDocumentTemplatesConfig();
  const { settings: docSettings } = useDocumentSettings();

  // Cari template aktif yang ditargetkan untuk tugas akhir / bimbingan skripsi
  const template =
    Object.values(templatesMap).find(
      (t) =>
        t.placement_targets?.includes('mahasiswa_tugas_akhir') ||
        t.data_source_module === 'tugas_akhir' ||
        t.code === 'kartu_bimbingan_tugas_akhir' ||
        t.code === 'kartu_bimbingan_ta' ||
        t.code.includes('tugas_akhir')
    ) || getTemplate('kartu_bimbingan_ta', 'tugas_akhir');

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
  const mhsAngkatan = submission.profiles?.academic_year || studentProfile?.academic_year || (studentProfile as any)?.entry_year || '2023';

  // Sort logs by date ascending for official card view
  const sortedLogs = [...consultationLogs].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Hitung tanggal pengesahan/tanda tangan terakhir dari log bimbingan yang disetujui atau tanggal approval pengajuan
  const approvedLogs = sortedLogs.filter((l) => l.status === 'approved' || l.solution);
  const lastApprovedLog = approvedLogs.length > 0 ? approvedLogs[approvedLogs.length - 1] : sortedLogs[sortedLogs.length - 1];
  const latestSignatureDate = submission.approved_at || lastApprovedLog?.date || submission.updated_at || submission.created_at;

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

  // Parse status pengesahan dari comments submission
  const approvalState = parseApprovalsFromComments(submission.comments);
  const adv1Approval = approvalState.signers.advisor_1;
  const adv2Approval = approvalState.signers.advisor_2;
  const kaprodiApproval = approvalState.signers.kaprodi;

  // Signatures Data: tanda tangan digital hanya disuplai jika masing-masing pihak telah mengesahkan
  const signaturesData: Record<string, DocumentSignatureData> = {
    student: {
      name: mhsName,
      id_number: mhsNim,
      signed_at: sortedLogs[0]?.date || submission.created_at,
      is_approved: true,
    },
    advisor_1: {
      name: adv1Approval?.signer_name || advisor1?.profiles?.full_name || '....................................',
      id_number: adv1Approval?.signer_nidn || advisor1?.profiles?.nip,
      signature_url: adv1Approval?.is_approved ? (adv1Approval.signature_url || advisor1?.profiles?.signature_url) : null,
      paraf_url: advisor1?.profiles?.paraf_url,
      signed_at: adv1Approval?.is_approved ? (adv1Approval.approved_at || lastApprovedLog?.date) : null,
      is_approved: !!adv1Approval?.is_approved,
    },
    advisor_2: {
      name: adv2Approval?.signer_name || advisor2?.profiles?.full_name || '....................................',
      id_number: adv2Approval?.signer_nidn || advisor2?.profiles?.nip,
      signature_url: adv2Approval?.is_approved ? (adv2Approval.signature_url || advisor2?.profiles?.signature_url) : null,
      paraf_url: advisor2?.profiles?.paraf_url,
      signed_at: adv2Approval?.is_approved ? (adv2Approval.approved_at || lastApprovedLog?.date) : null,
      is_approved: !!adv2Approval?.is_approved,
    },
    kaprodi: {
      name: kaprodiApproval?.signer_name || docSettings.kaprodi_name || '....................................',
      id_number: kaprodiApproval?.signer_nidn || docSettings.kaprodi_nidn,
      signature_url: kaprodiApproval?.is_approved ? (kaprodiApproval.signature_url || docSettings.kaprodi_signature_url) : null,
      signed_at: kaprodiApproval?.is_approved ? (kaprodiApproval.approved_at || submission.approved_at) : null,
      is_approved: !!kaprodiApproval?.is_approved,
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full p-0 max-h-[95vh] overflow-y-auto bg-transparent border-none shadow-none">
        <UniversalDocumentContainer
          templateCode={template.code}
          templateOverride={template}
          documentDate={latestSignatureDate}
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
            tahun_angkatan: mhsAngkatan,
            judul_tugas_akhir: submission.title || '',
            nama_pembimbing_1: advisor1?.profiles?.full_name || '',
            nidn_pembimbing_1: advisor1?.profiles?.nip || advisor1?.profiles?.nidn || '',
            nama_pembimbing_2: advisor2?.profiles?.full_name || '',
            nidn_pembimbing_2: advisor2?.profiles?.nip || advisor2?.profiles?.nidn || '',
            jenis_tugas_akhir: submission.ta_types?.name || 'Skripsi',
            status_tugas_akhir: submission.status || '',
            total_pertemuan_bimbingan: `${sortedLogs.length} Pertemuan`,
          }}
          metadataItems={[]}
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
