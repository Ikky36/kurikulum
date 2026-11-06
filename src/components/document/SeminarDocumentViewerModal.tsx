import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UniversalDocumentContainer, DocumentSignatureData } from './UniversalDocumentContainer';
import { QRCodeSVG } from 'qrcode.react';
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
  const [selectedExaminerIndex, setSelectedExaminerIndex] = useState<number | 'rekap'>(0);

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
  const isIndividualExaminerSheet = activeDocType === 'lembar_nilai' && selectedExaminerIndex !== 'rekap';
  const activeExaminer = isIndividualExaminerSheet && examiners.length > 0
    ? (examiners[selectedExaminerIndex as number] || examiners[0])
    : null;

  // Template override with dynamic committee signatures
  const templateOverride: SingleDocumentTemplate = {
    ...baseTemplate,
    document_title: activeDocType === 'lembar_nilai' ? 'FORMAT PENILAIAN' : baseTemplate.document_title,
    document_subtitle: activeDocType === 'lembar_nilai' ? '' : baseTemplate.document_subtitle,
    show_kop: true,
    show_footer: true,
    show_student_info: true,
    student_bio_fields: activeDocType === 'lembar_nilai'
      ? [
          { key: 'nama_mahasiswa', label: 'Nama Mahasiswa' },
          { key: 'nim', label: 'NIM' },
          { key: 'judul_tugas_akhir', label: 'Judul Tugas Akhir' },
        ]
      : baseTemplate.student_bio_fields,
    signatures: isIndividualExaminerSheet ? [] : dynamicSignatures,
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
        <div className="flex flex-col gap-2 pb-2 border-b bg-background p-3 rounded-lg print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

          {/* Sub-selector Penguji jika Lembar Nilai */}
          {activeDocType === 'lembar_nilai' && examiners.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t">
              <span className="text-[11px] font-bold text-muted-foreground uppercase shrink-0">
                Pilih Format Lembar:
              </span>
              {examiners.map((ex: any, idx: number) => {
                const exName = ex.examiner_name || ex.profiles?.full_name || `Penguji ${idx + 1}`;
                return (
                  <Button
                    key={idx}
                    variant={selectedExaminerIndex === idx ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedExaminerIndex(idx)}
                    className="h-6 text-[11px] px-2.5 shrink-0"
                  >
                    {ex.role || `Penguji ${idx + 1}`}: {exName}
                  </Button>
                );
              })}
              <Button
                variant={selectedExaminerIndex === 'rekap' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedExaminerIndex('rekap')}
                className="h-6 text-[11px] px-2.5 shrink-0"
              >
                Rekapitulasi Semua Penguji
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto pt-2 flex justify-center">
          <UniversalDocumentContainer
            templateCode={targetTemplateCode}
            templateOverride={templateOverride}
            containerId={`printable-ta-${seminar.id}`}
            documentId={seminar.id}
            documentDate={seminar.chairperson_signed_at || seminar.schedule_date || seminar.created_at}
            verificationData={{
              id: seminar.id,
              docType: targetTemplateCode,
              docTitle: baseTemplate?.document_title,
              studentName: student?.full_name,
              studentNim: student?.nim,
              studentProgram: student?.program || docSettings.program_name,
              topicTitle: submission?.title || '',
              isFullyApproved: Boolean(seminar.status === 'completed' || seminar.chairperson_signed_at),
              examDate: dateFormatted,
              room: seminar.room || 'Ruang Sidang STITMA',
              chairpersonName: seminar.chairperson_name || seminar.chairperson?.full_name || '',
              chairpersonNip: seminar.chairperson_nip || seminar.chairperson?.nip || '',
              chairpersonApproved: Boolean(seminar.chairperson_signed_at),
              finalScore: seminar.final_score,
              finalGrade: seminar.final_grade,
              resultStatus: statusKelulusanLabel,
              revisionDeadline: deadlineFormatted,
              examinersList: examinerNamesStr,
              docNumber: variables.nomor_surat,
              kaprodiName: docSettings.kaprodi_name || '',
              kaprodiNidn: docSettings.kaprodi_nidn || '',
              kaprodiApproved: Boolean(seminar.status === 'completed' || seminar.chairperson_signed_at),
            }}
            studentInfo={studentInfo}
            variables={variables}
            signaturesData={signaturesData}
            onClose={() => onOpenChange(false)}
          >
            {/* If Lembar Nilai, render the Rubric Scoring Table */}
            {activeDocType === 'lembar_nilai' && (
              isIndividualExaminerSheet && activeExaminer ? (
                // FORMAT PENILAIAN INDIVIDUAL PENGUJI (Sesuai Format Resmi Dokumen)
                (() => {
                  if (isSempro) {
                    const semproRubricCriteria = [
                      {
                        no: 1,
                        id: 'sempro_crit_1',
                        title: 'PENDAHULUAN',
                        weight: 20,
                        bullets: [
                          'Ketajaman Perumusan Masalah',
                          'Kesesuaian Tujuan Penelitian dengan Masalah Penelitian',
                          'Manfaat Penelitian',
                        ],
                      },
                      {
                        no: 2,
                        id: 'sempro_crit_2',
                        title: 'TINJAUAN PUSTAKA',
                        weight: 20,
                        bullets: [
                          'Relevansi dengan Masalah Penelitian',
                          'Cara Mengutip',
                          'Kemutakhiran Sumber Pustaka',
                          'Cara Penyusunan Daftar Pustaka',
                        ],
                      },
                      {
                        no: 3,
                        id: 'sempro_crit_3',
                        title: 'METODOLOGI PENELITIAN',
                        weight: 30,
                        bullets: [
                          'Kesesuaian Rancangan dengan Masalah Penelitian',
                          'Ketepatan Instrumen Penelitian',
                          'Ketepatan Metode Analisis Data',
                        ],
                      },
                      {
                        no: 4,
                        id: 'sempro_crit_4',
                        title: 'LISAN',
                        weight: 15,
                        bullets: [
                          'Pemahaman Materi dan Kelancaran Presentasi',
                          'Ketepatan dan Pemahaman Jawaban',
                        ],
                      },
                      {
                        no: 5,
                        id: 'sempro_crit_5',
                        title: 'UMUM',
                        weight: 15,
                        bullets: [
                          'Sistematika Proposal',
                          'Keterbacaan',
                          'Penggunaan Bahasa',
                        ],
                      },
                    ];

                    const getScoreVal = (critId: string, idx: number) => {
                      if (!activeExaminer || !Array.isArray(activeExaminer.scores_detail)) return '-';
                      const item = activeExaminer.scores_detail.find(
                        (s: any) => s.criterion_id === critId || s.criterion_id === `sempro_crit_${idx + 1}`
                      );
                      if (item && item.raw_score !== undefined && item.raw_score !== null) {
                        return item.raw_score;
                      }
                      const fallbackItem = activeExaminer.scores_detail[idx];
                      if (fallbackItem && fallbackItem.raw_score !== undefined && fallbackItem.raw_score !== null) {
                        return fallbackItem.raw_score;
                      }
                      return '-';
                    };

                    let finalScoreExaminer = '-';
                    if (activeExaminer.score !== undefined && activeExaminer.score !== null) {
                      finalScoreExaminer = Number(activeExaminer.score).toFixed(1);
                    }
                    const gradeExaminer = determineGradeFromScore(Number(finalScoreExaminer) || 0, 66);
                    const defaultCity = docSettings.default_city || 'Bantul';
                    const verificationUrl = typeof window !== 'undefined'
                      ? `${window.location.origin}/v?doc=lembar_nilai_sempro&id=${seminar.id}`
                      : '';

                    return (
                      <div className="my-2 space-y-3 font-serif text-slate-900">
                        {/* TABEL FORMAT PENILAIAN */}
                        <table className="w-full border-collapse border border-slate-900 text-xs text-slate-900">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-900 text-slate-900 font-bold text-center">
                              <th className="border border-slate-900 py-1.5 px-2 w-12 text-center font-bold">No</th>
                              <th className="border border-slate-900 py-1.5 px-3 text-center font-bold">
                                Kriteria Penilaian
                              </th>
                              <th className="border border-slate-900 py-1.5 px-3 w-20 text-center font-bold">
                                Bobot
                              </th>
                              <th className="border border-slate-900 py-1.5 px-3 w-24 text-center font-bold">
                                Nilai
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {semproRubricCriteria.map((crit, idx) => (
                              <tr key={crit.id} className="hover:bg-slate-50/40">
                                <td className="border border-slate-900 py-2 px-2 text-center align-top font-normal">{crit.no}</td>
                                <td className="border border-slate-900 py-2 px-3 align-top">
                                  <div className="font-bold uppercase text-slate-900">{crit.title}</div>
                                  <ul className="mt-1 space-y-0.5 text-slate-800 list-none pl-0">
                                    {crit.bullets.map((b, bIdx) => (
                                      <li key={bIdx}>- {b}</li>
                                    ))}
                                  </ul>
                                </td>
                                <td className="border border-slate-900 py-2 px-3 text-center align-middle font-normal">
                                  {crit.weight}
                                </td>
                                <td className="border border-slate-900 py-2 px-3 text-center align-middle font-mono font-medium">
                                  {getScoreVal(crit.id, idx)}
                                </td>
                              </tr>
                            ))}

                            {/* Catatan Penguji */}
                            <tr>
                              <td colSpan={4} className="border border-slate-900 py-2 px-3 align-top">
                                <div className="font-normal text-slate-900">Catatan Penguji :</div>
                                <div className="min-h-[45px] mt-1 text-slate-800 whitespace-pre-wrap">
                                  {activeExaminer.revision_notes || '-'}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Teks Nilai Rata-rata akhir */}
                        <div className="my-2.5 text-xs font-bold text-slate-900">
                          Nilai Rata-rata akhir : (&nbsp;&nbsp;{finalScoreExaminer !== '-' ? `${finalScoreExaminer} ( ${gradeExaminer.grade} )` : '          '}&nbsp;&nbsp;)
                        </div>

                        {/* Bagian Bawah Dua Kolom (Skala Nilai & Pengesahan Penguji) */}
                        <div className="grid grid-cols-2 gap-6 mt-4 pt-2 text-xs text-slate-900 break-inside-avoid page-break-inside-avoid">
                          {/* Kolom Kiri: Tabel Rentang Skala Nilai */}
                          <div className="space-y-1 font-mono text-[11px] leading-tight pt-1">
                            <div className="flex gap-3"><span className="w-6 font-bold">A</span><span>91 – 100</span></div>
                            <div className="flex gap-3"><span className="w-6 font-bold">A-</span><span>81 – 90,99</span></div>
                            <div className="flex gap-3"><span className="w-6 font-bold">B+</span><span>71 – 80,99</span></div>
                            <div className="flex gap-3"><span className="w-6 font-bold">B</span><span>66 – 70,99</span></div>
                            <div className="flex gap-3"><span className="w-6 font-bold">C+</span><span>61 – 65,99</span></div>
                            <div className="flex gap-3"><span className="w-6 font-bold">D</span><span>46 – 60,99</span></div>
                            <div className="flex gap-3"><span className="w-6 font-bold">E</span><span>0 – 45,99</span></div>
                          </div>

                          {/* Kolom Kanan: Pengesahan Penguji & Barcode */}
                          <div className="flex flex-col items-center justify-between text-center min-h-[145px]">
                            <div>
                              <p className="text-xs">
                                {defaultCity}, {dateFormatted}
                              </p>
                              <p className="font-bold text-xs mt-0.5">
                                {activeExaminer?.role || 'Penguji'}
                              </p>
                            </div>

                            <div className="my-1 h-14 flex items-center justify-center">
                              {activeExaminer?.signature_url ? (
                                <img
                                  src={activeExaminer.signature_url}
                                  alt="Tanda Tangan Penguji"
                                  className="max-h-14 max-w-[140px] object-contain"
                                />
                              ) : (
                                <div className="h-12 w-32 border-b border-dotted border-slate-400" />
                              )}
                            </div>

                            <div>
                              <p className="font-bold text-xs underline decoration-dotted">
                                (&nbsp;{activeExaminer?.examiner_name || activeExaminer?.profiles?.full_name || '.........................................'}&nbsp;)
                              </p>
                              {(activeExaminer?.examiner_nip || activeExaminer?.profiles?.nip) && (
                                <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                                  NIP/NIDN: {activeExaminer.examiner_nip || activeExaminer.profiles?.nip}
                                </p>
                              )}
                            </div>

                            {/* QR Code Verifikasi Dokumen di Pojok Kanan Bawah */}
                            {verificationUrl && (
                              <div className="self-end mt-2 pt-1 border border-slate-300 p-1 rounded bg-white">
                                <QRCodeSVG value={verificationUrl} size={36} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const criteriaA = criteria.filter((c: any) => c.category === 'A' || c.order_index <= 7);
                  const criteriaB = criteria.filter((c: any) => c.category === 'B' || c.order_index > 7);

                  const getScoreVal = (critId: string, idx: number) => {
                    if (!activeExaminer || !Array.isArray(activeExaminer.scores_detail)) return '-';
                    const item = activeExaminer.scores_detail.find((s: any) => s.criterion_id === critId);
                    if (item && item.raw_score !== undefined && item.raw_score !== null) {
                      return item.raw_score;
                    }
                    const fallbackItem = activeExaminer.scores_detail[idx];
                    if (fallbackItem && fallbackItem.raw_score !== undefined && fallbackItem.raw_score !== null) {
                      return fallbackItem.raw_score;
                    }
                    return '-';
                  };

                  const scoresA = criteriaA.map((crit: any, idx: number) => {
                    const v = getScoreVal(crit.id, idx);
                    return typeof v === 'number' ? v : null;
                  });
                  const validScoresA = scoresA.filter((s: any): s is number => s !== null);
                  const avgA = validScoresA.length > 0
                    ? (validScoresA.reduce((a: number, b: number) => a + b, 0) / validScoresA.length).toFixed(2)
                    : '-';

                  const scoresB = criteriaB.map((crit: any, idx: number) => {
                    const v = getScoreVal(crit.id, criteriaA.length + idx);
                    return typeof v === 'number' ? v : null;
                  });
                  const validScoresB = scoresB.filter((s: any): s is number => s !== null);
                  const avgB = validScoresB.length > 0
                    ? (validScoresB.reduce((a: number, b: number) => a + b, 0) / validScoresB.length).toFixed(2)
                    : '-';

                  let finalScoreExaminer = '-';
                  if (avgA !== '-' && avgB !== '-') {
                    finalScoreExaminer = ((Number(avgA) + Number(avgB)) / 2).toFixed(2);
                  } else if (activeExaminer.score !== undefined && activeExaminer.score !== null) {
                    finalScoreExaminer = Number(activeExaminer.score).toFixed(2);
                  }

                  const gradeExaminer = determineGradeFromScore(Number(finalScoreExaminer) || 0);
                  const defaultCity = docSettings.default_city || 'Bantul';
                  const verificationUrl = typeof window !== 'undefined'
                    ? `${window.location.origin}/v?doc=lembar_nilai_sidang&id=${seminar.id}`
                    : '';

                  return (
                    <div className="my-2 space-y-3 font-serif">
                      {/* TABEL FORMAT PENILAIAN */}
                      <table className="w-full border-collapse border border-slate-900 text-xs text-slate-900">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-900 text-slate-900 font-bold text-center">
                            <th className="border border-slate-900 py-1.5 px-2 w-12 text-center font-bold">NO</th>
                            <th className="border border-slate-900 py-1.5 px-3 text-center font-bold">
                              KOMPONEN PENILAIAN
                            </th>
                            <th className="border border-slate-900 py-1.5 px-3 w-32 text-center font-bold">
                              NILAI ANGKA
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* A. PENILAIAN DOKUMEN */}
                          <tr className="font-bold bg-slate-50/30">
                            <td className="border border-slate-900 py-1 px-2 text-center font-bold">A</td>
                            <td className="border border-slate-900 py-1 px-3 font-bold uppercase">
                              PENILAIAN DOKUMEN
                            </td>
                            <td className="border border-slate-900 py-1 px-3 text-center font-mono"></td>
                          </tr>
                          {criteriaA.map((crit: any, idx: number) => (
                            <tr key={crit.id} className="hover:bg-slate-50/40">
                              <td className="border border-slate-900 py-1 px-2 text-center">{idx + 1}</td>
                              <td className="border border-slate-900 py-1 px-3">{crit.name}</td>
                              <td className="border border-slate-900 py-1 px-3 text-center font-mono font-medium">
                                {getScoreVal(crit.id, idx)}
                              </td>
                            </tr>
                          ))}
                          {/* Baris Rata-rata A */}
                          <tr className="font-bold bg-slate-50/50">
                            <td colSpan={2} className="border border-slate-900 py-1 px-3 text-center font-bold">
                              Rata-rata
                            </td>
                            <td className="border border-slate-900 py-1 px-3 text-center font-mono font-bold">
                              {avgA}
                            </td>
                          </tr>

                          {/* B. PENILAIAN UJIAN LISAN */}
                          <tr className="font-bold bg-slate-50/30">
                            <td className="border border-slate-900 py-1 px-2 text-center font-bold">B</td>
                            <td className="border border-slate-900 py-1 px-3 font-bold uppercase">
                              PENILAIAN UJIAN LISAN
                            </td>
                            <td className="border border-slate-900 py-1 px-3 text-center font-mono"></td>
                          </tr>
                          {criteriaB.map((crit: any, idx: number) => (
                            <tr key={crit.id} className="hover:bg-slate-50/40">
                              <td className="border border-slate-900 py-1 px-2 text-center">{idx + 1}</td>
                              <td className="border border-slate-900 py-1 px-3">{crit.name}</td>
                              <td className="border border-slate-900 py-1 px-3 text-center font-mono font-medium">
                                {getScoreVal(crit.id, criteriaA.length + idx)}
                              </td>
                            </tr>
                          ))}
                          {/* Baris Rata-rata B */}
                          <tr className="font-bold bg-slate-50/50">
                            <td colSpan={2} className="border border-slate-900 py-1 px-3 text-center font-bold">
                              Rata-rata
                            </td>
                            <td className="border border-slate-900 py-1 px-3 text-center font-mono font-bold">
                              {avgB}
                            </td>
                          </tr>

                          {/* Baris Jumlah Rata-rata A & B */}
                          <tr className="font-bold bg-slate-100/70">
                            <td colSpan={2} className="border border-slate-900 py-1.5 px-3 text-center font-bold">
                              Jumlah Rata-rata A & B
                            </td>
                            <td className="border border-slate-900 py-1.5 px-3 text-center font-mono font-bold text-sm">
                              {finalScoreExaminer}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Teks Nilai Rata-rata Akhir */}
                      <div className="my-2 text-xs font-bold text-slate-900">
                        Nilai Rata-rata akhir : (&nbsp;&nbsp;{finalScoreExaminer !== '-' ? `${finalScoreExaminer} / ${gradeExaminer.grade}` : '          '}&nbsp;&nbsp;)
                      </div>

                      {/* Bagian Bawah Dua Kolom (Skala Nilai & Pengesahan Penguji) */}
                      <div className="grid grid-cols-2 gap-6 mt-4 pt-2 text-xs text-slate-900 break-inside-avoid page-break-inside-avoid">
                        {/* Kolom Kiri: Tabel Rentang Skala Nilai */}
                        <div className="space-y-1 font-mono text-[11px] leading-tight pt-1">
                          <div className="flex gap-3">
                            <span className="w-6 font-bold">A</span>
                            <span>91 – 100</span>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-6 font-bold">A-</span>
                            <span>81 – 90,99</span>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-6 font-bold">B+</span>
                            <span>71 – 80,99</span>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-6 font-bold">B</span>
                            <span>66 – 70,99</span>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-6 font-bold">C+</span>
                            <span>61 – 65,99</span>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-6 font-bold">D</span>
                            <span>46 – 60,99</span>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-6 font-bold">E</span>
                            <span>0 – 45,99</span>
                          </div>
                        </div>

                        {/* Kolom Kanan: Pengesahan Penguji & Barcode */}
                        <div className="flex flex-col items-center justify-between text-center min-h-[145px]">
                          <div>
                            <p className="text-xs">
                              {defaultCity}, {dateFormatted}
                            </p>
                            <p className="font-bold text-xs mt-0.5">
                              {activeExaminer?.role || 'Penguji'}
                            </p>
                          </div>

                          {/* Tanda Tangan Digital / Spasi */}
                          <div className="my-1 h-14 flex items-center justify-center">
                            {activeExaminer?.signature_url ? (
                              <img
                                src={activeExaminer.signature_url}
                                alt="Tanda Tangan Penguji"
                                className="max-h-14 max-w-[140px] object-contain"
                              />
                            ) : (
                              <div className="h-12 w-32 border-b border-dotted border-slate-400" />
                            )}
                          </div>

                          <div>
                            <p className="font-bold text-xs underline decoration-dotted">
                              (&nbsp;{activeExaminer?.examiner_name || activeExaminer?.profiles?.full_name || '.........................................'}&nbsp;)
                            </p>
                            {(activeExaminer?.examiner_nip || activeExaminer?.profiles?.nip) && (
                              <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                                NIP/NIDN: {activeExaminer.examiner_nip || activeExaminer.profiles?.nip}
                              </p>
                            )}
                          </div>

                          {/* QR Code Verifikasi Dokumen di Pojok Bawah */}
                          {verificationUrl && (
                            <div className="self-end mt-2 pt-1 border border-slate-300 p-1 rounded bg-white">
                              <QRCodeSVG value={verificationUrl} size={54} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                // FORMAT REKAPITULASI KOMPARATIF SEMUA PENGUJI
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
                      {criteria.map((crit: any, idx: number) => {
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
              )
            )}
          </UniversalDocumentContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default SeminarDocumentViewerModal;
