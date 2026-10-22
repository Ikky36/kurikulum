import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UniversalDocumentContainer, DocumentSignatureData } from './UniversalDocumentContainer';
import { useDocumentTemplatesConfig, defaultDocumentTemplates } from '@/lib/documentTemplateTypes';
import { useDocumentSettings } from '@/lib/documentSettings';
import { parseApprovalsFromComments } from '@/lib/documentApprovals';
import { Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  if (!submission) return null;

  try {
    // Cari template aktif yang ditargetkan untuk tugas akhir / bimbingan skripsi
    const template =
      Object.values(templatesMap).find(
        (t) =>
          t?.placement_targets?.includes('mahasiswa_tugas_akhir') ||
          t?.data_source_module === 'tugas_akhir' ||
          t?.code === 'kartu_bimbingan_tugas_akhir' ||
          t?.code === 'kartu_bimbingan_ta' ||
          t?.code?.includes('tugas_akhir')
      ) ||
      getTemplate('kartu_bimbingan_ta', 'tugas_akhir') ||
      defaultDocumentTemplates.kartu_bimbingan_ta;

    const columns =
      Array.isArray(template?.columns) && template.columns.length > 0
        ? template.columns
        : (defaultDocumentTemplates.kartu_bimbingan_ta.columns || []);

    // Extract Advisors & normalize profiles
    const advisors = Array.isArray(submission.ta_advisors) ? submission.ta_advisors : [];
    const advisor1 = advisors.find(
      (a: any) => a.role === 'pembimbing_1' || a.role?.toLowerCase()?.includes('1') || a.role?.toLowerCase()?.includes('utama')
    ) || advisors[0];
    const advisor2 = advisors.find(
      (a: any) => (a.role === 'pembimbing_2' || a.role?.toLowerCase()?.includes('2') || a.role?.toLowerCase()?.includes('pendamping')) && a !== advisor1
    ) || (advisors.length > 1 ? advisors[1] : null);

    const adv1Profile = Array.isArray(advisor1?.profiles) ? advisor1?.profiles[0] : advisor1?.profiles;
    const adv2Profile = Array.isArray(advisor2?.profiles) ? advisor2?.profiles[0] : advisor2?.profiles;

    // Student Info & normalize profiles
    const rawStudent = submission.profiles || studentProfile;
    const mhsProfile = Array.isArray(rawStudent) ? rawStudent[0] : rawStudent;
    const mhsName = mhsProfile?.full_name || 'Mahasiswa';
    const mhsNim = mhsProfile?.nim || '-';
    const mhsProgram = mhsProfile?.program || docSettings.program_name || '-';
    const mhsSistem = submission.sistem_kuliah?.name || mhsProfile?.sistem_kuliah?.name || 'Reguler';
    const mhsAngkatan = mhsProfile?.academic_year || mhsProfile?.entry_year || '2023';

    // Sort logs by date ascending for official card view
    const safeLogs = Array.isArray(consultationLogs) ? consultationLogs : [];
    const sortedLogs = [...safeLogs].sort((a, b) => {
      const dateA = a?.date ? new Date(a.date).getTime() : 0;
      const dateB = b?.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    // Hitung tanggal pengesahan/tanda tangan terakhir dari log bimbingan yang disetujui atau tanggal approval pengajuan
    const approvedLogs = sortedLogs.filter((l) => l.status === 'approved' || l.solution);
    const lastApprovedLog = approvedLogs.length > 0 ? approvedLogs[approvedLogs.length - 1] : sortedLogs[sortedLogs.length - 1];
    const latestSignatureDate = submission.approved_at || lastApprovedLog?.date || submission.updated_at || submission.created_at;

    // Format date helper
    const formatDate = (dateString?: string) => {
      if (!dateString) return '-';
      try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('id-ID', {
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
    const signers = approvalState.signers || {};

    const adv1Approval =
      signers.advisor_1 ||
      Object.values(signers).find(
        (s: any) =>
          s.role_key === 'advisor_1' ||
          s.role_label?.toLowerCase().includes('pembimbing 1') ||
          s.role_label?.toLowerCase().includes('pembimbing i') ||
          s.role_label?.toLowerCase().includes('pembimbing utama')
      );

    const adv2Approval =
      signers.advisor_2 ||
      Object.values(signers).find(
        (s: any) =>
          s.role_key === 'advisor_2' ||
          s.role_label?.toLowerCase().includes('pembimbing 2') ||
          s.role_label?.toLowerCase().includes('pembimbing ii') ||
          s.role_label?.toLowerCase().includes('pembimbing pendamping')
      );

    const kaprodiApproval =
      signers.kaprodi ||
      Object.values(signers).find(
        (s: any) =>
          s.role_key === 'kaprodi' ||
          s.role_label?.toLowerCase().includes('kaprodi') ||
          s.role_label?.toLowerCase().includes('ketua program studi') ||
          s.role_label?.toLowerCase().includes('ketua prodi')
      );

    // Signatures Data: tanda tangan digital hanya disuplai jika masing-masing pihak telah mengesahkan
    const adv1SigData: DocumentSignatureData = {
      name: adv1Approval?.signer_name || adv1Profile?.full_name || '....................................',
      id_number: adv1Approval?.signer_nidn || adv1Profile?.nip,
      signature_url: adv1Approval?.is_approved
        ? (adv1Approval.signature_url || adv1Profile?.signature_url || adv1Approval.paraf_url || adv1Profile?.paraf_url)
        : null,
      paraf_url: adv1Approval?.paraf_url || adv1Profile?.paraf_url,
      signed_at: adv1Approval?.is_approved ? (adv1Approval.approved_at || lastApprovedLog?.date) : null,
      is_approved: !!adv1Approval?.is_approved,
    };

    const adv2SigData: DocumentSignatureData = {
      name: adv2Approval?.signer_name || adv2Profile?.full_name || '....................................',
      id_number: adv2Approval?.signer_nidn || adv2Profile?.nip,
      signature_url: adv2Approval?.is_approved
        ? (adv2Approval.signature_url || adv2Profile?.signature_url || adv2Approval.paraf_url || adv2Profile?.paraf_url)
        : null,
      paraf_url: adv2Approval?.paraf_url || adv2Profile?.paraf_url,
      signed_at: adv2Approval?.is_approved ? (adv2Approval.approved_at || lastApprovedLog?.date) : null,
      is_approved: !!adv2Approval?.is_approved,
    };

    const kaprodiSigData: DocumentSignatureData = {
      name: kaprodiApproval?.signer_name || docSettings.kaprodi_name || '....................................',
      id_number: kaprodiApproval?.signer_nidn || docSettings.kaprodi_nidn,
      signature_url: kaprodiApproval?.is_approved ? (kaprodiApproval.signature_url || docSettings.kaprodi_signature_url) : null,
      signed_at: kaprodiApproval?.is_approved ? (kaprodiApproval.approved_at || submission.approved_at) : null,
      is_approved: !!kaprodiApproval?.is_approved,
    };

    const studentSigData: DocumentSignatureData = {
      name: mhsName,
      id_number: mhsNim,
      signed_at: sortedLogs[0]?.date || submission.created_at,
      is_approved: true,
    };

    const signaturesData: Record<string, DocumentSignatureData> = {
      student: studentSigData,
      advisor_1: adv1SigData,
      advisor_2: adv2SigData,
      kaprodi: kaprodiSigData,
    };

    // Petakan juga secara eksplisit ke setiap ID signature di konfigurasi template aktif
    if (Array.isArray(template?.signatures)) {
      template.signatures.forEach((s) => {
        if (!s.id) return;
        const roleType = (s.role_type || '').toLowerCase();
        const roleLabel = (s.role_label || '').toLowerCase();
        const idLower = s.id.toLowerCase();

        if (
          roleType === 'advisor_1' ||
          idLower.includes('advisor_1') ||
          idLower.includes('pembimbing_1') ||
          roleLabel.includes('pembimbing 1') ||
          roleLabel.includes('pembimbing i') ||
          roleLabel.includes('pembimbing utama')
        ) {
          signaturesData[s.id] = adv1SigData;
        } else if (
          roleType === 'advisor_2' ||
          idLower.includes('advisor_2') ||
          idLower.includes('pembimbing_2') ||
          roleLabel.includes('pembimbing 2') ||
          roleLabel.includes('pembimbing ii') ||
          roleLabel.includes('pembimbing pendamping')
        ) {
          signaturesData[s.id] = adv2SigData;
        } else if (
          roleType === 'kaprodi' ||
          idLower.includes('kaprodi') ||
          roleLabel.includes('kaprodi') ||
          roleLabel.includes('ketua program studi') ||
          roleLabel.includes('ketua prodi')
        ) {
          signaturesData[s.id] = kaprodiSigData;
        } else if (
          roleType === 'student' ||
          idLower.includes('student') ||
          idLower.includes('mahasiswa') ||
          roleLabel.includes('mahasiswa')
        ) {
          signaturesData[s.id] = studentSigData;
        }
      });
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-full p-0 max-h-[95vh] overflow-y-auto bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Pratinjau Kartu Bimbingan Tugas Akhir</DialogTitle>
            <DialogDescription>Lembar cetak kartu bimbingan tugas akhir mahasiswa</DialogDescription>
          </DialogHeader>

          <UniversalDocumentContainer
            templateCode={template.code}
            templateOverride={template}
            documentId={submission.id}
            documentDate={latestSignatureDate}
            verificationData={{
              id: submission.id,
              docType: template.code,
              studentName: mhsName,
              studentNim: mhsNim,
              studentProgram: mhsProgram,
              topicTitle: submission.title || '',
              isFullyApproved: Boolean(kaprodiApproval?.is_approved),
              adv1Name: adv1Approval?.signer_name || adv1Profile?.full_name || '',
              adv1Nidn: adv1Approval?.signer_nidn || adv1Profile?.nip || '',
              adv1Date: adv1Approval?.approved_at || lastApprovedLog?.date || '',
              adv1Approved: Boolean(adv1Approval?.is_approved),
              kaprodiName: kaprodiApproval?.signer_name || docSettings.kaprodi_name || '',
              kaprodiNidn: kaprodiApproval?.signer_nidn || docSettings.kaprodi_nidn || '',
              kaprodiDate: kaprodiApproval?.approved_at || submission.approved_at || '',
              kaprodiApproved: Boolean(kaprodiApproval?.is_approved),
              activityCount: approvedLogs.length,
            }}
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
              nama_pembimbing_1: adv1Profile?.full_name || '',
              nidn_pembimbing_1: adv1Profile?.nip || adv1Profile?.nidn || '',
              nama_pembimbing_2: adv2Profile?.full_name || '',
              nidn_pembimbing_2: adv2Profile?.nip || adv2Profile?.nidn || '',
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
                    {columns.map((col) => (
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
                      const rawAdvisorProfile = log.profiles;
                      const advisorProfile = Array.isArray(rawAdvisorProfile) ? (rawAdvisorProfile[0] || {}) : (rawAdvisorProfile || {});
                      const parafImg = advisorProfile.paraf_url || advisorProfile.signature_url;

                      return (
                        <tr key={log.id || index} className="border-b border-slate-300 hover:bg-slate-50/50 [page-break-inside:avoid] [break-inside:avoid]">
                          {columns.map((col) => {
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
                        colSpan={columns.length}
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
  } catch (err: any) {
    console.error('Error rendering KartuBimbinganViewerModal:', err);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card p-6 border shadow-lg rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <DialogTitle>Gagal Membuka Dokumen</DialogTitle>
            </div>
            <DialogDescription className="text-sm pt-2 text-muted-foreground">
              Terjadi kendala saat merender format dokumen: {err?.message || 'Data dokumen tidak lengkap.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
