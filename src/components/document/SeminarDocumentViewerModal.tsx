import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UniversalDocumentContainer, DocumentSignatureData } from './UniversalDocumentContainer';
import { useDocumentTemplatesConfig, SingleDocumentTemplate } from '@/lib/documentTemplateTypes';
import { useDocumentSettings } from '@/lib/documentSettings';
import { useTaRubricsConfig, determineGradeFromScore } from '@/lib/taAssessmentTypes';
import { FileText, Award, FileCheck, Printer, CheckCircle2 } from 'lucide-react';

export interface SeminarDocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seminar: any;
  initialDocType?: 'berita_acara' | 'lembar_nilai' | 'surat_tugas';
}

export const SeminarDocumentViewerModal: React.FC<SeminarDocumentViewerModalProps> = ({
  open,
  onOpenChange,
  seminar,
  initialDocType = 'berita_acara',
}) => {
  const [activeDocType, setActiveDocType] = useState<'berita_acara' | 'lembar_nilai' | 'surat_tugas'>(initialDocType);

  useEffect(() => {
    if (open && initialDocType) {
      setActiveDocType(initialDocType);
    }
  }, [open, initialDocType]);
  const { templatesMap, getTemplate } = useDocumentTemplatesConfig();
  const { settings: docSettings } = useDocumentSettings();
  const { getRubric } = useTaRubricsConfig();

  if (!seminar) return null;

  const isSempro = seminar.type === 'sempro';
  const submission = seminar.ta_submissions;
  const student = submission?.profiles;
  const examiners = Array.isArray(seminar.ta_examiners) ? seminar.ta_examiners : [];

  // 1. Resolve active template code
  let targetTemplateCode = 'berita_acara_sempro';
  if (activeDocType === 'berita_acara') {
    targetTemplateCode = isSempro ? 'berita_acara_sempro' : 'berita_acara_sidang';
  } else if (activeDocType === 'lembar_nilai') {
    targetTemplateCode = isSempro ? 'lembar_nilai_sempro' : 'lembar_nilai_sidang';
  } else if (activeDocType === 'surat_tugas') {
    targetTemplateCode = isSempro ? 'surat_tugas_sempro' : 'surat_tugas_sidang';
  }

  const baseTemplate: SingleDocumentTemplate =
    templatesMap[targetTemplateCode] || getTemplate(targetTemplateCode, 'tugas_akhir');

  // Format Date helpers
  let dayStr = 'Senin';
  let dateFormatted = '-';
  let timeStr = '09:00';
  if (seminar.schedule_date) {
    const d = new Date(seminar.schedule_date);
    dayStr = d.toLocaleDateString('id-ID', { weekday: 'long' });
    dateFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  let deadlineFormatted = '-';
  if (seminar.revision_deadline) {
    const d = new Date(seminar.revision_deadline);
    deadlineFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Result Status Label
  let statusKelulusanLabel = 'Lulus dengan Revisi';
  if (seminar.result_status === 'lulus_tanpa_revisi') statusKelulusanLabel = 'LULUS MURNI (TANPA REVISI)';
  else if (seminar.result_status === 'lulus_revisi_ringan') statusKelulusanLabel = 'LULUS DENGAN REVISI RINGAN';
  else if (seminar.result_status === 'lulus_revisi_berat') statusKelulusanLabel = 'LULUS DENGAN REVISI SUBSTANSIAL';
  else if (seminar.result_status === 'mengulang') statusKelulusanLabel = 'TIDAK LULUS (MENGULANG SIDANG)';

  // Compile revision notes
  const compiledNotes = examiners
    .filter((e: any) => e.revision_notes && e.revision_notes.trim())
    .map((e: any, i: number) => `${i + 1}. [${e.role} - ${e.examiner_name || e.profiles?.full_name || 'Penguji'}]: ${e.revision_notes}`)
    .join('\n');

  // List of examiners string
  const examinerNamesStr = examiners
    .map((e: any, i: number) => `${i + 1}. ${e.examiner_name || e.profiles?.full_name || 'Dosen Penguji'} (${e.role})`)
    .join(', ');

  // Rubric config for Lembar Nilai
  const rubric = getRubric(seminar.type);
  const criteria = rubric.criteria || [];

  // Generate dynamic signatures structure based on actual committee
  const dynamicSignatures = [];
  const signaturesData: Record<string, DocumentSignatureData> = {};

  if (activeDocType === 'surat_tugas') {
    // Surat Tugas signed by Kaprodi / Dekan
    dynamicSignatures.push({
      id: 'kaprodi',
      role_label: 'Ketua Program Studi',
      enabled: true,
      use_digital_signature: true,
      signer_status: 'mengetahui' as const,
    });
    signaturesData['kaprodi'] = {
      name: docSettings.kaprodi_name || 'Ketua Program Studi',
      id_number: docSettings.kaprodi_nidn || '',
      signature_url: docSettings.kaprodi_signature_url,
      signed_at: seminar.schedule_date || new Date().toISOString(),
      is_approved: true,
    };
  } else {
    // Berita Acara & Lembar Nilai: Chairperson + All Examiners + Kaprodi
    // 1. Ketua Sidang
    const chairName = seminar.chairperson_name || seminar.chairperson?.full_name || 'Ketua Sidang';
    dynamicSignatures.push({
      id: 'chairperson',
      role_label: 'Ketua Sidang',
      enabled: true,
      use_digital_signature: true,
      signer_status: 'mengetahui' as const,
    });
    signaturesData['chairperson'] = {
      name: chairName,
      id_number: seminar.chairperson_nip || seminar.chairperson?.nip || '',
      signature_url: seminar.chairperson_signature_url,
      signed_at: seminar.chairperson_signed_at,
      is_approved: !!seminar.chairperson_signed_at,
    };

    // 2. All Examiners
    examiners.forEach((ex: any, idx: number) => {
      const exKey = `examiner_${idx}`;
      const exName = ex.examiner_name || ex.profiles?.full_name || `Penguji ${idx + 1}`;
      dynamicSignatures.push({
        id: exKey,
        role_label: ex.role || `Penguji ${idx + 1}`,
        enabled: true,
        use_digital_signature: true,
        signer_status: 'menyetujui' as const,
      });
      signaturesData[exKey] = {
        name: exName,
        id_number: ex.examiner_nip || ex.profiles?.nip || '',
        signature_url: ex.signature_url,
        signed_at: ex.signed_at,
        is_approved: !!ex.signed_at,
      };
    });

    // 3. Kaprodi
    dynamicSignatures.push({
      id: 'kaprodi',
      role_label: 'Ketua Program Studi',
      enabled: true,
      use_digital_signature: true,
      signer_status: 'mengetahui' as const,
    });
    signaturesData['kaprodi'] = {
      name: docSettings.kaprodi_name || 'Ketua Program Studi',
      id_number: docSettings.kaprodi_nidn || '',
      signature_url: docSettings.kaprodi_signature_url,
      signed_at: seminar.chairperson_signed_at || seminar.schedule_date,
      is_approved: !!seminar.chairperson_signed_at,
    };
  }

  // Template override with dynamic committee signatures
  const templateOverride: SingleDocumentTemplate = {
    ...baseTemplate,
    signatures: dynamicSignatures,
  };

  // Variables for interpolation
  const variables = {
    nama_mahasiswa: student?.full_name || 'Mahasiswa',
    nim: student?.nim || '-',
    program_studi: student?.program || docSettings.program_name || 'Pendidikan Bahasa Arab',
    judul_tugas_akhir: submission?.title || '-',
    hari_ujian: dayStr,
    tanggal_ujian: dateFormatted,
    jam_ujian: timeStr,
    ruangan_ujian: seminar.room || 'Ruang Sidang STITMA',
    skor_akhir: seminar.final_score !== null && seminar.final_score !== undefined ? String(seminar.final_score) : '-',
    predikat_huruf: seminar.final_grade || 'Lulus',
    status_kelulusan: statusKelulusanLabel,
    batas_waktu_revisi: deadlineFormatted,
    catatan_revisi_penguji: compiledNotes || 'Naskah disetujui tanpa catatan perbaikan.',
    nama_ketua_sidang: seminar.chairperson_name || seminar.chairperson?.full_name || 'Dosen Penguji',
    daftar_nama_penguji: examinerNamesStr,
    nomor_surat: `ST-0${seminar.id.substring(0, 3)}/PBA-STITMA/TA/${new Date().getFullYear()}`,
  };

  const studentInfo = {
    name: student?.full_name,
    nim: student?.nim,
    program: student?.program || docSettings.program_name,
    judul_tugas_akhir: submission?.title,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-5xl max-h-[96vh] p-3 sm:p-5 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-900">
        {/* Document Selector Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b bg-background p-3 rounded-lg print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-muted-foreground">Pilih Dokumen:</span>
            <div className="inline-flex rounded-lg border bg-muted/60 p-0.5">
              <Button
                variant={activeDocType === 'berita_acara' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveDocType('berita_acara')}
                className="h-7 text-xs gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Berita Acara
              </Button>
              <Button
                variant={activeDocType === 'lembar_nilai' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveDocType('lembar_nilai')}
                className="h-7 text-xs gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                Lembar Nilai Rubrik
              </Button>
              <Button
                variant={activeDocType === 'surat_tugas' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveDocType('surat_tugas')}
                className="h-7 text-xs gap-1.5"
              >
                <FileCheck className="w-3.5 h-3.5" />
                Surat Tugas
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {isSempro ? 'Seminar Proposal' : 'Sidang Munaqasyah'}
            </Badge>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto pt-2 flex justify-center">
          <UniversalDocumentContainer
            templateCode={targetTemplateCode}
            templateOverride={templateOverride}
            containerId={`printable-ta-${seminar.id}`}
            studentInfo={studentInfo}
            variables={variables}
            signaturesData={signaturesData}
            onClose={() => onOpenChange(false)}
          >
            {/* If Lembar Nilai, render the Rubric Scoring Table */}
            {activeDocType === 'lembar_nilai' && (
              <div className="my-4 space-y-3">
                <table className="w-full border-collapse border border-slate-700 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-700 py-1.5 px-2 w-10 text-center font-bold">No</th>
                      <th className="border border-slate-700 py-1.5 px-3 text-left font-bold">
                        Komponen & Aspek Penilaian Rubrik
                      </th>
                      <th className="border border-slate-700 py-1.5 px-2 w-20 text-center font-bold">Bobot (%)</th>
                      {examiners.map((ex: any, idx: number) => (
                        <th key={idx} className="border border-slate-700 py-1.5 px-2 w-24 text-center font-bold">
                          {ex.role}
                        </th>
                      ))}
                      <th className="border border-slate-700 py-1.5 px-2 w-24 text-center font-bold">
                        Rata-rata
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((crit, idx) => {
                      // Ambil skor per penguji untuk kriteria ini
                      const critScores = examiners.map((ex: any) => {
                        if (Array.isArray(ex.scores_detail)) {
                          const item = ex.scores_detail.find((s: any) => s.criterion_id === crit.id);
                          return item?.raw_score ?? null;
                        }
                        return null;
                      });

                      const validScores = critScores.filter((s): s is number => s !== null);
                      const avg = validScores.length > 0
                        ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
                        : '-';

                      return (
                        <tr key={crit.id} className="hover:bg-slate-50">
                          <td className="border border-slate-700 py-2 px-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-700 py-2 px-3">
                            <span className="font-semibold block">{crit.name}</span>
                            {crit.description && (
                              <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                                {crit.description}
                              </span>
                            )}
                          </td>
                          <td className="border border-slate-700 py-2 px-2 text-center font-semibold">
                            {crit.weight}%
                          </td>
                          {critScores.map((score, sIdx) => (
                            <td key={sIdx} className="border border-slate-700 py-2 px-2 text-center font-mono">
                              {score !== null ? score : '-'}
                            </td>
                          ))}
                          <td className="border border-slate-700 py-2 px-2 text-center font-bold font-mono">
                            {avg}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Row */}
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={2} className="border border-slate-700 py-2 px-3 text-right">
                        NILAI AKHIR RATA-RATA:
                      </td>
                      <td className="border border-slate-700 py-2 px-2 text-center">100%</td>
                      {examiners.map((ex: any, idx: number) => (
                        <td key={idx} className="border border-slate-700 py-2 px-2 text-center font-mono text-sm">
                          {ex.score !== undefined && ex.score !== null ? ex.score : '-'}
                        </td>
                      ))}
                      <td className="border border-slate-700 py-2 px-2 text-center font-mono text-sm text-primary">
                        {seminar.final_score !== null && seminar.final_score !== undefined ? seminar.final_score : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </UniversalDocumentContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default SeminarDocumentViewerModal;
