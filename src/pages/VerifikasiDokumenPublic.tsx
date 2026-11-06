import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentSettings } from '@/lib/documentSettings';
import { parseApprovalsFromComments, getDocApproval } from '@/lib/documentApprovals';
import { decodeVerificationPayload } from '@/components/document/UniversalDocumentContainer';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
  UserCheck,
  GraduationCap,
  Calendar,
  Building2,
  Scale,
  Award,
  FileCheck,
  MapPin,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function VerifikasiDokumenPublic() {
  const [searchParams] = useSearchParams();
  const { settings: docSettings, isLoading: loadingSettings } = useDocumentSettings();

  const docTypeParam = searchParams.get('doc') || '';
  const idParam = searchParams.get('id') || '';
  const vParam = searchParams.get('v');

  // Decode QR code payload token jika tersedia
  const urlPayload = vParam ? decodeVerificationPayload(vParam) : null;

  // Resolusi tipe dokumen dan ID sebenarnya
  const targetDoc = urlPayload?.doc || docTypeParam || 'kartu_bimbingan_ta';
  const effectiveDocId = urlPayload?.fullId || idParam || urlPayload?.id || '';

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveDocId);
  const isSample = (!effectiveDocId || effectiveDocId === 'sample') && !urlPayload;

  // Kategori Dokumen
  const isSeminarDoc =
    targetDoc.startsWith('berita_acara') ||
    targetDoc.startsWith('lembar_nilai') ||
    targetDoc.startsWith('surat_tugas') ||
    targetDoc.includes('sempro') ||
    targetDoc.includes('sidang');

  const isKRS = targetDoc === 'krs';
  const isProposal = targetDoc.includes('proposal');
  const isKartuBimbingan = targetDoc.includes('bimbingan') || (!isSeminarDoc && !isKRS && !isProposal);

  // 1. Fetch data Seminar / Sidang dari ta_seminars jika dokumen seminar
  const { data: seminarData, isLoading: loadingSeminar } = useQuery({
    queryKey: ['public_verify_seminar', effectiveDocId],
    queryFn: async () => {
      if (!isUuid || !isSeminarDoc) return null;
      const { data, error } = await supabase
        .from('ta_seminars')
        .select(`
          id, type, status, schedule_date, room, final_score, final_grade, result_status, revision_deadline, notes,
          chairperson_id, chairperson_name, chairperson_nip, chairperson_signature_url, chairperson_signed_at,
          created_at, updated_at,
          ta_submissions (
            id, title, status,
            profiles:student_id (id, full_name, nim, program, academic_year)
          ),
          chairperson:chairperson_id (id, full_name, nip, signature_url),
          ta_examiners (
            id, role, examiner_type, examiner_name, examiner_nip, score, signed_at, signature_url,
            scores_detail, revision_notes,
            profiles:dosen_id (id, full_name, nip, signature_url)
          )
        `)
        .eq('id', effectiveDocId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching public seminar doc verification:', error);
        return null;
      }
      return data;
    },
    enabled: Boolean(isUuid && isSeminarDoc),
  });

  // 2. Fetch data Tugas Akhir (Bimbingan / Pengesahan Proposal) jika bukan seminar/KRS
  const { data: taData, isLoading: loadingTA } = useQuery({
    queryKey: ['public_verify_ta', effectiveDocId],
    queryFn: async () => {
      if (!isUuid || isSeminarDoc || isKRS) return null;
      const { data, error } = await supabase
        .from('ta_submissions')
        .select(`
          id, title, status, comments, created_at, updated_at,
          ta_types (id, name),
          profiles:student_id (id, full_name, nim, program, academic_year),
          ta_advisors (id, role, dosen_id, profiles (id, full_name, nip, signature_url)),
          ta_consultation_logs (id, date, problem, solution, status)
        `)
        .eq('id', effectiveDocId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching public doc verification:', error);
        return null;
      }
      return data;
    },
    enabled: Boolean(isUuid && !isSeminarDoc && !isKRS),
  });

  // 3. Fetch data KRS jika dokumen adalah KRS
  const { data: krsData, isLoading: loadingKRS } = useQuery({
    queryKey: ['public_verify_krs', effectiveDocId],
    queryFn: async () => {
      if (!isUuid || !isKRS) return null;
      const { data, error } = await supabase
        .from('krs')
        .select(`
          id, status, created_at, updated_at,
          profiles:student_id (id, full_name, nim, program, academic_year),
          academic_years (id, year),
          semesters (id, name),
          krs_items (id, status, courses (id, name, code, sks))
        `)
        .eq('id', effectiveDocId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching public krs doc verification:', error);
        return null;
      }
      return data;
    },
    enabled: Boolean(isUuid && isKRS),
  });

  const isLoading = loadingSettings || (isUuid && (loadingSeminar || loadingTA || loadingKRS));

  // Resolusi Judul Dokumen Resmi
  const resolveDocTitle = (): string => {
    if (urlPayload?.dt) return urlPayload.dt;
    switch (targetDoc) {
      case 'berita_acara_sempro':
        return 'Berita Acara Seminar Proposal Tugas Akhir';
      case 'berita_acara_sidang':
        return 'Berita Acara Sidang Munaqasyah Tugas Akhir';
      case 'lembar_nilai_sempro':
        return 'Lembar Penilaian Rubrik Seminar Proposal';
      case 'lembar_nilai_sidang':
        return 'Lembar Penilaian Rubrik Sidang Munaqasyah';
      case 'surat_tugas_sempro':
        return 'Surat Tugas Penguji Seminar Proposal';
      case 'surat_tugas_sidang':
        return 'Surat Tugas Penguji Sidang Munaqasyah';
      case 'pengesahan_proposal':
      case 'surat_pengesahan_proposal':
        return 'Lembar Pengesahan Proposal Tugas Akhir';
      case 'pengesahan_tugas_akhir':
      case 'surat_pengesahan_tugas_akhir':
        return 'Surat Pengesahan Tugas Akhir (Nota Dinas)';
      case 'krs':
        return 'Kartu Rencana Studi (KRS)';
      case 'kartu_bimbingan_dpa':
        return 'Kartu Bimbingan Penasihat Akademik (DPA)';
      case 'kartu_bimbingan_ta':
      default:
        return 'Kartu Kendali Bimbingan Tugas Akhir';
    }
  };

  const docTitle = resolveDocTitle();

  // Helper Format Tanggal
  const formatDateTime = (isoDate?: string | null) => {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) + ' pukul ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch {
      return isoDate;
    }
  };

  const formatDateOnly = (isoDate?: string | null) => {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  // Parse approvals dari comments database jika dokumen TA non-seminar
  const approvalState = parseApprovalsFromComments(taData?.comments);
  const docApproval = getDocApproval(approvalState, targetDoc);
  const signers = docApproval?.signers || {};

  const isKaprodiApproved = urlPayload
    ? Boolean(urlPayload.okk || urlPayload.st === 'approved')
    : Boolean(signers.kaprodi?.is_approved);

  const isAdvisorApproved = urlPayload
    ? Boolean(urlPayload.ok1)
    : Boolean(signers.advisor_1?.is_approved || signers.advisor_2?.is_approved);

  // Status Keabsahan Dokumen
  let isFullyVerified = false;
  if (isSample) {
    isFullyVerified = true;
  } else if (isSeminarDoc) {
    isFullyVerified = seminarData
      ? Boolean(seminarData.status === 'completed' || seminarData.chairperson_signed_at)
      : (urlPayload?.st === 'approved');
  } else if (isKRS) {
    isFullyVerified = krsData
      ? Boolean(krsData.status === 'approved')
      : (urlPayload?.st === 'approved');
  } else if (isProposal) {
    isFullyVerified = taData ? isAdvisorApproved : (urlPayload?.st === 'approved');
  } else {
    isFullyVerified = taData ? isKaprodiApproved : (urlPayload?.st === 'approved');
  }

  // Identitas Mahasiswa & Dokumen
  const studentName =
    urlPayload?.nm ||
    seminarData?.ta_submissions?.profiles?.full_name ||
    taData?.profiles?.full_name ||
    krsData?.profiles?.full_name ||
    (isSample ? 'Ahmad Fauzi Mubarak' : 'Mahasiswa');

  const studentNim =
    urlPayload?.nim ||
    seminarData?.ta_submissions?.profiles?.nim ||
    taData?.profiles?.nim ||
    krsData?.profiles?.nim ||
    (isSample ? '4220261109' : '-');

  const studentProgram =
    urlPayload?.pr ||
    seminarData?.ta_submissions?.profiles?.program ||
    taData?.profiles?.program ||
    krsData?.profiles?.program ||
    docSettings.program_name ||
    'Pendidikan Bahasa Arab';

  const topicTitle =
    urlPayload?.tl ||
    seminarData?.ta_submissions?.title ||
    taData?.title ||
    (isSample
      ? 'Analisis Kontrastif Sintaksis Bahasa Arab dan Bahasa Indonesia pada Terjemahan Kitab Matan Al-Ajurrumiyyah'
      : '-');

  const docCodeNumber = urlPayload?.no || (
    isSample
      ? 'DOC-TA-202610-88492'
      : isSeminarDoc
      ? `ST-${effectiveDocId.slice(0, 4).toUpperCase()}/PBA-STITMA/TA/${new Date(seminarData?.created_at || Date.now()).getFullYear()}`
      : `DOC-${effectiveDocId.slice(0, 8).toUpperCase()}-${new Date(taData?.created_at || Date.now()).getFullYear()}`
  );

  // Data Spesifik Seminar / Sidang
  const finalScore = urlPayload?.sc ?? seminarData?.final_score ?? (isSample ? 77.5 : null);
  const finalGrade = urlPayload?.gr || seminarData?.final_grade || (isSample ? 'B+' : null);
  
  const resolveResultStatus = (status?: string | null) => {
    if (!status) return null;
    if (status === 'lulus_tanpa_revisi') return 'LULUS MURNI (TANPA REVISI)';
    if (status === 'lulus_revisi_ringan') return 'LULUS DENGAN REVISI RINGAN';
    if (status === 'lulus_revisi_berat') return 'LULUS DENGAN REVISI SUBSTANSIAL';
    if (status === 'mengulang') return 'TIDAK LULUS (MENGULANG)';
    return status;
  };

  const resultStatusLabel = urlPayload?.rs || resolveResultStatus(seminarData?.result_status) || (isSample ? 'LULUS DENGAN REVISI RINGAN' : null);
  const examDateFormatted = urlPayload?.ed || (seminarData?.schedule_date ? formatDateTime(seminarData.schedule_date) : (isSample ? 'Selasa, 3 November 2026' : null));
  const examRoom = urlPayload?.rm || seminarData?.room || (isSample ? 'Ruang Sidang STITMA' : null);
  const revisionDeadline = urlPayload?.rd || (seminarData?.revision_deadline ? formatDateOnly(seminarData.revision_deadline) : (isSample ? '15 November 2026' : null));

  // Pejabat Pengesah
  const chairpersonName =
    urlPayload?.ch ||
    seminarData?.chairperson_name ||
    seminarData?.chairperson?.full_name ||
    (isSample ? 'Agus Sylistyo, M.Pd.' : 'Ketua Sidang');
  const chairpersonNip = seminarData?.chairperson_nip || seminarData?.chairperson?.nip || (isSample ? '198204122011011003' : null);
  const chairpersonSignedAt = seminarData?.chairperson_signed_at || (isSample ? new Date().toISOString() : null);
  const isChairpersonApproved = seminarData ? Boolean(seminarData.chairperson_signed_at) : (urlPayload ? Boolean(urlPayload.st === 'approved') : isSample);

  // Dewan Penguji
  const dbExaminers = Array.isArray(seminarData?.ta_examiners) ? seminarData.ta_examiners : [];

  // Data Pembimbing (Bimbingan)
  const adv1Name =
    urlPayload?.a1 ||
    signers.advisor_1?.signer_name ||
    (isSample ? 'Zulkifli Hayad, M.Pd.' : 'Dosen Pembimbing');
  const adv1Nidn = urlPayload?.ad1 || signers.advisor_1?.signer_nidn;
  const adv1Date = urlPayload?.da1 || signers.advisor_1?.approved_at || taData?.updated_at || taData?.created_at;
  const adv1Approved = urlPayload ? Boolean(urlPayload.ok1) : Boolean(signers.advisor_1?.is_approved);

  // Kaprodi
  const kaprodiName =
    urlPayload?.kp ||
    signers.kaprodi?.signer_name ||
    docSettings.kaprodi_name ||
    (isSample ? 'Zulkifli Hayad, M.Pd.' : 'Ketua Program Studi');
  const kaprodiNidn = urlPayload?.kpd || signers.kaprodi?.signer_nidn || docSettings.kaprodi_nidn;
  const kaprodiDate = urlPayload?.dkp || signers.kaprodi?.approved_at || seminarData?.chairperson_signed_at || taData?.approved_at;
  const kaprodiApproved = urlPayload ? Boolean(urlPayload.okk || urlPayload.st === 'approved') : (isSeminarDoc ? isFullyVerified : Boolean(signers.kaprodi?.is_approved));

  // Jumlah log aktivitas
  const approvedLogsCount = urlPayload?.cnt ?? (taData?.ta_consultation_logs?.filter((l: any) => l.status === 'approved').length || (isSample ? 8 : 0));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/50 py-6 px-3 sm:px-6 flex flex-col items-center justify-start">
      <div className="w-full max-w-xl space-y-4">

        {/* HEADER KAMPUS */}
        <div className="bg-card rounded-2xl p-4 sm:p-5 border shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-primary to-teal-500" />
          
          <div className="flex items-center justify-center gap-3 mb-2 pt-1">
            {docSettings.header_logo_left_url ? (
              <img
                src={docSettings.header_logo_left_url}
                alt="Logo Kampus"
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div className="text-left">
              <h1 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {docSettings.qr_verify_header_line_1 || docSettings.institution_line_1 || 'SEKOLAH TINGGI ILMU TARBIYAH MADANI'}
              </h1>
              <p className="text-sm sm:text-base font-bold text-slate-900 uppercase">
                {docSettings.qr_verify_header_line_2 || docSettings.institution_line_2 || 'STIT MADANI YOGYAKARTA'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {docSettings.qr_verify_header_subtitle || 'Layanan Verifikasi Dokumen & Keabsahan Akademik'}
              </p>
            </div>
          </div>
        </div>

        {/* CARD STATUS KEABSAHAN UTAMA */}
        {docSettings.qr_verify_show_badge !== false && (
          <Card className={`border-2 shadow-sm overflow-hidden ${
            isFullyVerified
              ? 'border-emerald-500/80 bg-emerald-50/70 dark:bg-emerald-950/30'
              : 'border-amber-500/80 bg-amber-50/70 dark:bg-amber-950/30'
          }`}>
            <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
              <div className={`p-2.5 rounded-full shrink-0 ${
                isFullyVerified
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                {isFullyVerified ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <Clock className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm sm:text-base font-extrabold ${
                    isFullyVerified ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'
                  }`}>
                    {isFullyVerified
                      ? (docSettings.qr_verify_badge_verified_title || 'DOKUMEN RESMI TERVERIFIKASI & SAH')
                      : 'DOKUMEN DALAM PROSES PENGESAHAN'}
                  </span>
                  <Badge className={isFullyVerified ? 'bg-emerald-600' : 'bg-amber-600'}>
                    {isFullyVerified
                      ? (docSettings.qr_verify_badge_verified_label || 'Autentik ✓')
                      : 'Menunggu'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isFullyVerified
                    ? (docSettings.qr_verify_badge_verified_desc || 'Dokumen ini secara resmi tercatat dalam pangkalan data akademik dan telah dibubuhi stempel tanda tangan digital yang sah oleh pejabat berwenang.')
                    : 'Dokumen ini sedang dalam proses review/pengesahan bertingkat oleh dosen pembimbing, dewan penguji, atau pimpinan program studi.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RINCIAN DOKUMEN & IDENTITAS MAHASISWA */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Informasi Registrasi Dokumen
            </CardTitle>
            {docSettings.qr_verify_show_doc_number !== false && (
              <CardDescription className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                Nomor Registrasi: {docCodeNumber}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Tabel Detail */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-start gap-2 py-1 border-b border-dashed">
                <span className="text-slate-500 font-medium">Jenis Dokumen</span>
                <span className="font-bold text-slate-900 text-right">{docTitle}</span>
              </div>

              {docSettings.qr_verify_show_student_name !== false && (
                <div className="flex justify-between items-start gap-2 py-1 border-b border-dashed">
                  <span className="text-slate-500 font-medium">Nama Mahasiswa</span>
                  <span className="font-bold text-slate-900 text-right">{studentName}</span>
                </div>
              )}

              {docSettings.qr_verify_show_student_nim !== false && (
                <div className="flex justify-between items-start gap-2 py-1 border-b border-dashed">
                  <span className="text-slate-500 font-medium">NIM</span>
                  <span className="font-mono font-semibold text-slate-900 text-right">{studentNim}</span>
                </div>
              )}

              {docSettings.qr_verify_show_student_prodi !== false && (
                <div className="flex justify-between items-start gap-2 py-1 border-b border-dashed">
                  <span className="text-slate-500 font-medium">Program Studi</span>
                  <span className="font-medium text-slate-900 text-right">{studentProgram}</span>
                </div>
              )}

              {/* Judul Skripsi / Proposal */}
              {docSettings.qr_verify_show_topic_title !== false && !isKRS && (
                <div className="pt-1">
                  <span className="text-slate-500 font-medium block mb-1">
                    {isProposal ? 'Judul Proposal Tugas Akhir:' : 'Judul Tugas Akhir / Skripsi:'}
                  </span>
                  <p className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-md border text-slate-800 dark:text-slate-200 italic font-medium leading-relaxed">
                    "{topicTitle}"
                  </p>
                </div>
              )}
            </div>

            {/* SEKSI SPESIFIK: HASIL EVALUASI SIDANG & SKOR */}
            {isSeminarDoc && (finalScore !== null || resultStatusLabel || examDateFormatted) && (
              <div className="pt-3 border-t">
                <h3 className="font-bold text-slate-900 mb-2.5 flex items-center gap-1.5 text-xs">
                  <Award className="w-4 h-4 text-primary" />
                  Hasil Evaluasi Persidangan & Kelulusan
                </h3>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
                  {/* Skor & Predikat */}
                  <div className="p-3 rounded-lg border bg-slate-50/70 text-center space-y-0.5">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Nilai Akhir Rata-rata</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xl font-black text-primary font-mono">
                        {finalScore !== null && finalScore !== undefined ? finalScore : '-'}
                      </span>
                      {finalGrade && (
                        <Badge variant="outline" className="font-bold text-xs bg-white">
                          {finalGrade}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Status Kelulusan */}
                  <div className="p-3 rounded-lg border bg-slate-50/70 text-center space-y-0.5 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Status Keputusan</span>
                    <span className={`text-xs font-extrabold ${
                      resultStatusLabel?.toLowerCase().includes('lulus')
                        ? 'text-emerald-700'
                        : resultStatusLabel?.toLowerCase().includes('ulang')
                        ? 'text-destructive'
                        : 'text-slate-800'
                    }`}>
                      {resultStatusLabel || 'Terjadwal'}
                    </span>
                  </div>
                </div>

                {/* Jadwal, Ruangan & Batas Revisi */}
                <div className="space-y-1.5 p-2.5 rounded-lg border bg-muted/20 text-[11px]">
                  {examDateFormatted && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Tanggal Ujian
                      </span>
                      <span className="font-medium text-slate-800">{examDateFormatted}</span>
                    </div>
                  )}
                  {examRoom && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Ruang Ujian
                      </span>
                      <span className="font-medium text-slate-800">{examRoom}</span>
                    </div>
                  )}
                  {revisionDeadline && (
                    <div className="flex justify-between items-center pt-1 border-t border-dashed">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Batas Pengumpulan Revisi
                      </span>
                      <span className="font-bold text-amber-700">{revisionDeadline}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SEKSI SPESIFIK: KRS TOTAL SKS */}
            {isKRS && (
              <div className="p-3 bg-muted/40 border rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Beban Studi Semester Ini</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {urlPayload?.cnt || krsData?.krs_items?.length || 20} SKS Terdaftar
                  </span>
                </div>
                <Badge variant="secondary" className="font-normal text-[10px]">
                  SIAKAD Aktif
                </Badge>
              </div>
            )}

            {/* AUDIT TRAIL PEJABAT PENGESAH */}
            {docSettings.qr_verify_show_signers !== false && (
              <div className="pt-2 border-t">
                <h3 className="font-bold text-slate-900 mb-2.5 flex items-center gap-1.5 text-xs">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Jejak Digital Pengesahan Pejabat (Audit Trail)
                </h3>

                <div className="space-y-2">
                  {/* JIKA SEMINAR: Ketua Sidang */}
                  {isSeminarDoc && targetDoc !== 'surat_tugas_sempro' && targetDoc !== 'surat_tugas_sidang' && (
                    <div className="p-2.5 rounded-lg border bg-card flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Ketua Sidang / Majelis Ujian
                        </span>
                        <p className="font-semibold text-slate-900 text-xs">
                          {chairpersonName}
                        </p>
                        {chairpersonNip && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            NIP/NIDN: {chairpersonNip}
                          </p>
                        )}
                        {docSettings.qr_verify_show_timestamps !== false && (
                          <p className={`text-[10px] mt-1 flex items-center gap-1 ${
                            isChairpersonApproved ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" /> {isChairpersonApproved ? `Disahkan: ${formatDateTime(chairpersonSignedAt)}` : 'Menunggu Pengesahan'}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${
                        isChairpersonApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {isChairpersonApproved ? 'Disahkan ✓' : 'Menunggu'}
                      </Badge>
                    </div>
                  )}

                  {/* JIKA SEMINAR: Seluruh Dewan Penguji */}
                  {isSeminarDoc && dbExaminers.length > 0 && targetDoc !== 'surat_tugas_sempro' && targetDoc !== 'surat_tugas_sidang' && (
                    dbExaminers.map((ex: any, idx: number) => {
                      const exName = ex.examiner_name || ex.profiles?.full_name || `Penguji ${idx + 1}`;
                      const exNip = ex.examiner_nip || ex.profiles?.nip;
                      const exSigned = Boolean(ex.signed_at);
                      return (
                        <div key={ex.id || idx} className="p-2.5 rounded-lg border bg-card flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              {ex.role || `Penguji ${idx + 1}`}
                            </span>
                            <p className="font-semibold text-slate-900 text-xs">
                              {exName}
                            </p>
                            {exNip && (
                              <p className="text-[10px] text-muted-foreground font-mono">
                                NIP: {exNip}
                              </p>
                            )}
                            {ex.score !== undefined && ex.score !== null && (
                              <p className="text-[10px] font-mono text-primary font-semibold">
                                Nilai Penguji: {ex.score}
                              </p>
                            )}
                            {docSettings.qr_verify_show_timestamps !== false && (
                              <p className={`text-[10px] mt-1 flex items-center gap-1 ${
                                exSigned ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                              }`}>
                                <CheckCircle2 className="w-3 h-3" /> {exSigned ? `Disahkan: ${formatDateTime(ex.signed_at)}` : 'Menunggu Penilaian'}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${
                            exSigned ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {exSigned ? 'Disahkan ✓' : 'Menunggu'}
                          </Badge>
                        </div>
                      );
                    })
                  )}

                  {/* Fallback ringkasan penguji jika dari payload offline */}
                  {isSeminarDoc && dbExaminers.length === 0 && urlPayload?.exs && (
                    <div className="p-2.5 rounded-lg border bg-card text-[11px] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Dewan Penguji Terdaftar
                      </span>
                      <p className="font-medium text-slate-800">
                        {urlPayload.exs}
                      </p>
                    </div>
                  )}

                  {/* JIKA BUKAN SEMINAR: Dosen Pembimbing 1 */}
                  {!isSeminarDoc && !isKRS && (
                    <div className="p-2.5 rounded-lg border bg-card flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Dosen Pembimbing I
                        </span>
                        <p className="font-semibold text-slate-900 text-xs">
                          {adv1Name}
                        </p>
                        {adv1Nidn && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            NIDN: {adv1Nidn}
                          </p>
                        )}
                        {docSettings.qr_verify_show_timestamps !== false && (
                          <p className={`text-[10px] mt-1 flex items-center gap-1 ${
                            adv1Approved ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" /> {adv1Approved ? `Disahkan: ${formatDateTime(adv1Date)}` : 'Menunggu Pengesahan'}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${
                        adv1Approved ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {adv1Approved ? 'Disahkan ✓' : 'Menunggu'}
                      </Badge>
                    </div>
                  )}

                  {/* Ketua Program Studi */}
                  <div className="p-2.5 rounded-lg border bg-card flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        {targetDoc?.startsWith('surat_tugas') ? 'Pemberi Tugas (Ketua Program Studi)' : 'Ketua Program Studi (Mengetahui)'}
                      </span>
                      <p className="font-semibold text-slate-900 text-xs">
                        {kaprodiName}
                      </p>
                      {kaprodiNidn && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          NIDN: {kaprodiNidn}
                        </p>
                      )}
                      {docSettings.qr_verify_show_timestamps !== false && (
                        <p className={`text-[10px] mt-1 flex items-center gap-1 ${
                          kaprodiApproved ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" /> {kaprodiApproved ? `Disahkan: ${formatDateTime(kaprodiDate)}` : 'Menunggu Pengesahan'}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${
                      kaprodiApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {kaprodiApproved ? 'Disahkan ✓' : 'Menunggu'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* RINGKASAN AKTIVITAS BIMBINGAN */}
            {docSettings.qr_verify_show_activity_summary !== false && isKartuBimbingan && !isSeminarDoc && (
              <div className="p-3 bg-muted/40 border rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Sesi Bimbingan Tervalidasi</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {isSample ? '8 Sesi Pertemuan' : `${approvedLogsCount} Pertemuan`}
                  </span>
                </div>
                <Badge variant="secondary" className="font-normal text-[10px]">
                  {docSettings.qr_verify_activity_badge_text || 'Terdaftar di SIAKAD'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KETERANGAN LANDASAN HUKUM UU ITE */}
        {docSettings.qr_verify_show_legal_note !== false && (
          <div className="p-3.5 bg-card border rounded-xl shadow-xs text-[11px] text-slate-600 space-y-1 text-left">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Scale className="w-3.5 h-3.5 text-primary" />
              Landasan Hukum Keabsahan Dokumen Elektronik
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Berdasarkan <strong>Undang-Undang Republik Indonesia No. 11 Tahun 2008 Pasal 5 Ayat 1</strong> tentang Informasi dan Transaksi Elektronik (UU ITE), informasi elektronik dan/atau dokumen elektronik dan/atau hasil cetaknya merupakan alat bukti hukum yang sah.
            </p>
          </div>
        )}

        {/* PESAN KUSTOM KAMPUS / KONTAK BAAK */}
        {docSettings.qr_verify_custom_footer_message && (
          <p className="text-[11px] text-center text-muted-foreground px-4 leading-normal">
            {docSettings.qr_verify_custom_footer_message}
          </p>
        )}

        <div className="text-center pt-2">
          <Link
            to="/"
            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            ← Kembali ke Beranda Sistem
          </Link>
        </div>

      </div>
    </div>
  );
}
