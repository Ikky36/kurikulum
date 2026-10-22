import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentSettings } from '@/lib/documentSettings';
import { parseApprovalsFromComments } from '@/lib/documentApprovals';
import { decodeVerificationPayload } from '@/components/document/UniversalDocumentContainer';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  GraduationCap,
  Calendar,
  Building2,
  ExternalLink,
  Info,
  Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function VerifikasiDokumenPublic() {
  const [searchParams] = useSearchParams();
  const { settings: docSettings, isLoading: loadingSettings } = useDocumentSettings();

  const docType = searchParams.get('doc') || 'kartu_bimbingan_ta';
  const docId = searchParams.get('id') || '';
  const vParam = searchParams.get('v');
  const urlPayload = vParam ? decodeVerificationPayload(vParam) : null;

  // 1. Fetch data dokumen tugas akhir jika ID tersedia
  const { data: taData, isLoading: loadingTA } = useQuery({
    queryKey: ['public_verify_ta', docId],
    queryFn: async () => {
      if (!docId || docId === 'sample') return null;
      const { data, error } = await supabase
        .from('ta_submissions')
        .select(`
          id, title, status, comments, created_at, updated_at,
          ta_types (id, name),
          profiles:student_id (id, full_name, nim, program, academic_year),
          ta_advisors (id, role, dosen_id, profiles (id, full_name, nip, signature_url)),
          ta_consultation_logs (id, date, problem, solution, status)
        `)
        .eq('id', docId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching public doc verification:', error);
        return null;
      }
      return data;
    },
    enabled: Boolean(docId && docId !== 'sample' && !urlPayload),
  });

  // 2. Fetch data KRS jika dokumen adalah KRS
  const { data: krsData, isLoading: loadingKRS } = useQuery({
    queryKey: ['public_verify_krs', docId],
    queryFn: async () => {
      if (!docId || docId === 'sample') return null;
      const { data, error } = await supabase
        .from('krs')
        .select(`
          id, status, created_at, updated_at,
          profiles:student_id (id, full_name, nim, program, academic_year),
          academic_years (id, year),
          semesters (id, name),
          krs_items (id, status, courses (id, name, code, sks))
        `)
        .eq('id', docId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching public krs doc verification:', error);
        return null;
      }
      return data;
    },
    enabled: Boolean(docId && docId !== 'sample' && docType === 'krs' && !urlPayload),
  });

  const isLoading = loadingSettings || (!urlPayload && (loadingTA || loadingKRS));

  // Resolusi data yang diverifikasi
  const isSample = (!docId || docId === 'sample') && !urlPayload;
  const isTA = Boolean(
    urlPayload?.doc?.includes('ta') ||
    urlPayload?.doc?.includes('bimbingan') ||
    taData ||
    docType.includes('tugas_akhir') ||
    docType.includes('ta') ||
    isSample
  );

  // Parse approvals dari comments database jika ada
  const approvalState = parseApprovalsFromComments(taData?.comments);
  const signers = approvalState?.signers || {};

  const isKaprodiApproved = urlPayload
    ? Boolean(urlPayload.okk || urlPayload.st === 'approved')
    : Boolean(signers.kaprodi?.is_approved);

  const isAdvisorApproved = urlPayload
    ? Boolean(urlPayload.ok1)
    : Boolean(signers.advisor_1?.is_approved || signers.advisor_2?.is_approved);

  const isFullyVerified = isSample
    ? true
    : urlPayload
    ? urlPayload.st === 'approved'
    : isTA
    ? isKaprodiApproved
    : krsData?.status === 'approved';

  // Format Helper
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

  const studentName =
    urlPayload?.nm ||
    taData?.profiles?.full_name ||
    krsData?.profiles?.full_name ||
    (isSample ? 'Ahmad Fauzi Mubarak' : 'Mahasiswa');

  const studentNim =
    urlPayload?.nim ||
    taData?.profiles?.nim ||
    krsData?.profiles?.nim ||
    (isSample ? '4220261109' : '-');

  const studentProgram =
    urlPayload?.pr ||
    taData?.profiles?.program ||
    krsData?.profiles?.program ||
    docSettings.program_name ||
    'Pendidikan Bahasa Arab';

  const docTitle = isTA
    ? 'Kartu Kendali Bimbingan Tugas Akhir'
    : 'Kartu Rencana Studi (KRS)';

  const topicTitle =
    urlPayload?.tl ||
    taData?.title ||
    (isSample
      ? 'Analisis Kontrastif Sintaksis Bahasa Arab dan Bahasa Indonesia pada Terjemahan Kitab Matan Al-Ajurrumiyyah'
      : '-');

  const effectiveDocId = urlPayload?.fullId || urlPayload?.id || docId || 'DOC';
  const docCodeNumber = isSample
    ? 'DOC-TA-202610-88492'
    : `DOC-${effectiveDocId.slice(0, 8).toUpperCase()}-${new Date(taData?.created_at || Date.now()).getFullYear()}`;

  const approvedLogsCount = urlPayload?.cnt ?? (taData?.ta_consultation_logs?.filter((l: any) => l.status === 'approved').length || 0);

  // Signer data terverifikasi
  const adv1Name =
    urlPayload?.a1 ||
    signers.advisor_1?.signer_name ||
    (isSample ? 'Zulkifli Hayad, M.Pd.' : 'Dosen Pembimbing');
  const adv1Nidn = urlPayload?.ad1 || signers.advisor_1?.signer_nidn;
  const adv1Date = urlPayload?.da1 || signers.advisor_1?.approved_at || taData?.updated_at || taData?.created_at;
  const adv1Approved = urlPayload ? Boolean(urlPayload.ok1) : Boolean(signers.advisor_1?.is_approved);

  const kaprodiName =
    urlPayload?.kp ||
    signers.kaprodi?.signer_name ||
    docSettings.kaprodi_name ||
    (isSample ? 'Zulkifli Hayad, M.Pd.' : 'Ketua Program Studi');
  const kaprodiNidn = urlPayload?.kpd || signers.kaprodi?.signer_nidn || docSettings.kaprodi_nidn;
  const kaprodiDate = urlPayload?.dkp || signers.kaprodi?.approved_at || taData?.approved_at || taData?.updated_at;
  const kaprodiApproved = urlPayload ? Boolean(urlPayload.okk || urlPayload.st === 'approved') : Boolean(signers.kaprodi?.is_approved);

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
                    {isFullyVerified ? 'DOKUMEN RESMI TERVERIFIKASI & SAH' : 'DOKUMEN DALAM PROSES PENGESAHAN'}
                  </span>
                  <Badge className={isFullyVerified ? 'bg-emerald-600' : 'bg-amber-600'}>
                    {isFullyVerified ? 'Autentik ✓' : 'Menunggu'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isFullyVerified
                    ? 'Dokumen ini secara resmi tercatat dalam pangkalan data akademik dan telah dibubuhi stempel tanda tangan digital yang sah oleh pejabat berwenang.'
                    : 'Dokumen ini sedang dalam proses review/pengesahan bertingkat oleh dosen pembimbing atau pimpinan program studi.'}
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

              {docSettings.qr_verify_show_topic_title !== false && isTA && (
                <div className="pt-1">
                  <span className="text-slate-500 font-medium block mb-1">Judul Tugas Akhir / Skripsi:</span>
                  <p className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-md border text-slate-800 dark:text-slate-200 italic font-medium leading-relaxed">
                    "{topicTitle}"
                  </p>
                </div>
              )}
            </div>

            {/* AUDIT TRAIL PEJABAT PENGESAH */}
            {docSettings.qr_verify_show_signers !== false && (
              <div className="pt-2">
                <h3 className="font-bold text-slate-900 mb-2.5 flex items-center gap-1.5 text-xs">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Jejak Digital Pengesahan Pejabat (Audit Trail)
                </h3>

                <div className="space-y-2">
                  {/* Pembimbing 1 */}
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

                  {/* Kaprodi */}
                  <div className="p-2.5 rounded-lg border bg-card flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Ketua Program Studi
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
            {docSettings.qr_verify_show_activity_summary !== false && isTA && (
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
