import React, { useRef } from 'react';
import { useDocumentSettings, getEffectiveDocumentMargins } from '@/lib/documentSettings';
import {
  useDocumentTemplatesConfig,
  SingleDocumentTemplate,
  defaultStudentBioFields,
  getSignatureSpacingClass,
} from '@/lib/documentTemplateTypes';
import { interpolateVariables, getDummyValueForColumn } from '@/lib/documentDataSources';
import { printElementById } from '@/lib/printUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, X, Download, ShieldCheck, Info, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DOMPurify from 'dompurify';

export interface DocumentSignatureData {
  name: string;
  id_number?: string; // NIP, NIDN, or NIM
  signature_url?: string | null;
  paraf_url?: string | null;
  signed_at?: string | Date | null; // Timestamp tanggal pengesahan/tanda tangan
  is_approved?: boolean; // Menandakan bahwa penandatangan telah menyetujui/mengesahkan secara resmi
}

export interface DocumentVerificationData {
  id?: string;
  docType?: string;
  studentName?: string;
  studentNim?: string;
  studentProgram?: string;
  topicTitle?: string;
  isFullyApproved?: boolean;
  adv1Name?: string;
  adv1Nidn?: string;
  adv1Date?: string;
  adv1Approved?: boolean;
  kaprodiName?: string;
  kaprodiNidn?: string;
  kaprodiDate?: string;
  kaprodiApproved?: boolean;
  activityCount?: number;
}

export function encodeVerificationPayload(obj: any): string {
  try {
    const jsonStr = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return '';
  }
}

export function decodeVerificationPayload(str: string): any {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes));

    // Handle model array ringkas: [id, nm, nim, pr, st, a1, kp, cnt, tl]
    if (Array.isArray(parsed)) {
      const [id, nm, nim, pr, isApproved, a1, kp, cnt, tl] = parsed;
      const approved = isApproved === 1 || isApproved === '1' || isApproved === 'approved';
      return {
        id: id || 'DOC',
        fullId: id || '',
        doc: 'kartu_bimbingan_ta',
        nm: nm || '',
        nim: nim || '',
        pr: pr || '',
        tl: tl || '',
        st: approved ? 'approved' : 'pending',
        a1: a1 || '',
        ad1: '',
        ok1: approved ? 1 : 0,
        kp: kp || '',
        kpd: '',
        okk: approved ? 1 : 0,
        cnt: cnt || 0,
      };
    }

    return parsed;
  } catch (e) {
    return null;
  }
}

export interface UniversalDocumentContainerProps {
  templateCode: string;
  templateOverride?: SingleDocumentTemplate;
  containerId?: string;
  documentId?: string; // ID unik dokumen untuk tautan verifikasi keabsahan (QR Code)
  verificationData?: DocumentVerificationData;
  documentTitle?: string;
  documentSubtitle?: string;
  documentDate?: string | Date | null; // Tanggal penetapan dokumen eksplisit
  isPreview?: boolean; // Mode pratinjau editor/customizer (jika true, tampilkan contoh ttd jika ada)
  studentInfo?: {
    name?: string;
    nim?: string;
    program?: string;
    sistem_kuliah?: string;
    semester?: string;
    academic_year?: string;
    [key: string]: any;
  };
  variables?: Record<string, any>;
  metadataItems?: { label: string; value: string | React.ReactNode }[];
  signaturesData?: Record<string, DocumentSignatureData>;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function UniversalDocumentContainer({
  templateCode,
  templateOverride,
  containerId = 'printable-document',
  documentId,
  verificationData,
  documentTitle,
  documentSubtitle,
  documentDate,
  isPreview = false,
  studentInfo,
  variables,
  metadataItems = [],
  signaturesData = {},
  children,
  onClose,
  className = '',
}: UniversalDocumentContainerProps) {
  const { settings: docSettings } = useDocumentSettings();
  const { getTemplate } = useDocumentTemplatesConfig();
  const template: SingleDocumentTemplate =
    templateOverride ||
    getTemplate(templateCode) ||
    defaultDocumentTemplates[templateCode] ||
    defaultDocumentTemplates.kartu_bimbingan_ta;

  const finalTitle = documentTitle || template.document_title;
  const finalSubtitle = documentSubtitle || template.document_subtitle;

  // Resolusi margin efektif dokumen (mengakomodasi tanpa kop surat vs dengan kop surat vs kustom template)
  const {
    isUsingKop,
    marginTop: effectiveMarginTop,
    marginBottom: effectiveMarginBottom,
    marginLeft: effectiveMarginLeft,
    marginRight: effectiveMarginRight,
  } = getEffectiveDocumentMargins(template, docSettings);

  const isA4 = docSettings.paper_size === 'A4';
  // Orientasi ditentukan oleh konfigurasi template dokumen yang diatur Admin (fallback ke global docSettings)
  const effectiveOrientation = template.orientation || docSettings.orientation || 'portrait';
  const isPortrait = effectiveOrientation === 'portrait';

  // Resolve effective date mechanism: 'last_signature' vs 'today'
  const effectiveDateSource = template.date_source || docSettings.date_source || 'last_signature';

  // Resolusi tata letak tanda tangan tunggal (kiri, tengah, kanan)
  const enabledSignatures = (template.signatures || []).filter((s) => s.enabled);
  const singleAlign = template.single_signature_align || 'center';
  const singleSignatureClass =
    singleAlign === 'right'
      ? 'justify-end pr-2 sm:pr-8'
      : singleAlign === 'left'
      ? 'justify-start pl-2 sm:pl-8'
      : 'justify-center';
  const signatureLayoutClass = enabledSignatures.length === 1 ? singleSignatureClass : 'justify-around';

  const resolvedDate = React.useMemo(() => {
    // 1. Jika mode paksa tanggal hari ini (real-time cetak)
    if (effectiveDateSource === 'today') {
      return new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    // 2. Jika mode 'last_signature':
    // Prioritas A: Explicit documentDate prop
    if (documentDate) {
      try {
        const d = new Date(documentDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        }
      } catch (e) {
        console.error('Invalid documentDate:', e);
      }
    }

    // Prioritas B: Cari timestamp tanda tangan/persetujuan paling akhir dari signaturesData YANG SUDAH DISETUJUI
    const signedTimestamps = Object.values(signaturesData)
      .filter((s) => s?.is_approved !== false && Boolean(s?.signed_at))
      .map((s) => s?.signed_at)
      .map((d) => new Date(d!).getTime())
      .filter((t) => !isNaN(t));

    if (signedTimestamps.length > 0) {
      const latestTs = Math.max(...signedTimestamps);
      return new Date(latestTs).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    // Prioritas C: Fallback jika belum ada tanda tangan resmi yang disetujui (mengambil tanggal hari ini)
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [effectiveDateSource, documentDate, signaturesData]);

  // Print Handler via isolated iframe printer
  const handlePrint = async () => {
    await printElementById(containerId, {
      paperSize: docSettings.paper_size,
      orientation: effectiveOrientation,
      marginTop: effectiveMarginTop,
      marginBottom: effectiveMarginBottom,
      marginLeft: effectiveMarginLeft,
      marginRight: effectiveMarginRight,
      title: finalTitle,
    });
  };

  // CSS Page sizing for @media print
  const pageSizeStyle = `@page { 
    size: ${docSettings.paper_size} ${effectiveOrientation}; 
    margin: ${effectiveMarginTop}mm ${effectiveMarginRight}mm ${effectiveMarginBottom}mm ${effectiveMarginLeft}mm; 
  }`;

  // Kamus lengkap variabel database yang siap diisi
  const resolvedVariables: Record<string, any> = {
    nama_mahasiswa: studentInfo?.name || '',
    nim: studentInfo?.nim || '',
    program_studi: studentInfo?.program || docSettings.program_name || '',
    fakultas: docSettings.faculty_name || '',
    sistem_kuliah: studentInfo?.sistem_kuliah || 'Reguler',
    semester: studentInfo?.semester || '',
    semester_aktif: studentInfo?.semester || '',
    tahun_akademik: studentInfo?.academic_year || '',
    tahun_angkatan: studentInfo?.academic_year?.split('/')[0] || studentInfo?.angkatan || '2023',
    nama_kampus: docSettings.institution_line_2 || '',
    kota_institusi: docSettings.default_city || 'Ponorogo',
    nama_kaprodi: docSettings.kaprodi_name || '',
    nidn_kaprodi: docSettings.kaprodi_nidn || '',
    nama_dekan: docSettings.dekan_name || '',
    nidn_dekan: docSettings.dekan_nidn || '',
    tanggal_cetak: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    ...Object.fromEntries(
      metadataItems
        .filter((m) => typeof m.value === 'string' || typeof m.value === 'number')
        .map((m) => [m.label.toLowerCase().replace(/\s+/g, '_'), String(m.value)])
    ),
    ...(variables || {}),
  };

  // Tautan URL resmi untuk pemindaian QR Code Verifikasi Keabsahan
  const verificationUrl = (() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;

    // Slug ringkas agar menghemat puluhan karakter URL (misal 'ta' atau 'krs')
    const shortDoc = (templateCode?.includes('ta') || templateCode?.includes('bimbingan')) ? 'ta' : templateCode;
    const shortId = documentId ? documentId.slice(0, 8) : 'sample';

    // 1. Opsi Ultra-Clean: Hanya URL ber-ID murni (menghasilkan matriks QR Code paling besar 25x25 hingga 29x29)
    if (docSettings.qr_code_density === 'ultra_clean') {
      return `${origin}/v?doc=${shortDoc}&id=${documentId || 'sample'}`;
    }

    // 2. Opsi Tradisional Padat (Legacy Object format)
    if (docSettings.qr_code_density === 'detailed') {
      const legacyBase = `${origin}/verifikasi-dokumen?doc=${templateCode}&id=${documentId || 'sample'}`;
      const legacyPayload = {
        id: shortId,
        fullId: documentId || '',
        doc: templateCode,
        nm: verificationData?.studentName || studentInfo?.name || '',
        nim: verificationData?.studentNim || studentInfo?.nim || '',
        pr: verificationData?.studentProgram || studentInfo?.program || '',
        tl: verificationData?.topicTitle || variables?.['topic_title'] || variables?.['submission_title'] || '',
        st: (verificationData?.isFullyApproved ?? (signaturesData?.kaprodi?.is_approved || false)) ? 'approved' : 'pending',
        a1: verificationData?.adv1Name || signaturesData?.advisor_1?.name || '',
        ad1: verificationData?.adv1Nidn || signaturesData?.advisor_1?.id_number || '',
        da1: verificationData?.adv1Date || (signaturesData?.advisor_1?.signed_at ? String(signaturesData.advisor_1.signed_at) : ''),
        ok1: (verificationData?.adv1Approved ?? signaturesData?.advisor_1?.is_approved) ? 1 : 0,
        kp: verificationData?.kaprodiName || signaturesData?.kaprodi?.name || docSettings.kaprodi_name || '',
        kpd: verificationData?.kaprodiNidn || signaturesData?.kaprodi?.id_number || docSettings.kaprodi_nidn || '',
        dkp: verificationData?.kaprodiDate || (signaturesData?.kaprodi?.signed_at ? String(signaturesData.kaprodi.signed_at) : ''),
        okk: (verificationData?.kaprodiApproved ?? signaturesData?.kaprodi?.is_approved) ? 1 : 0,
        cnt: verificationData?.activityCount ?? 0,
      };
      const token = encodeVerificationPayload(legacyPayload);
      return token ? `${legacyBase}&v=${token}` : legacyBase;
    }

    // 3. Default (Rekomendasi Utama): Payload Ringkas Dinamis yang Menghormati Sakelar Pengaturan Tampilan
    // JIKA PENGGUNA MEMATIKAN BEBERAPA PILIHAN DATA (MISAL JUDUL, PENGESAH, ATAU LOG AKTIVITAS),
    // DATA TERSEBUT DIBUANG DARI PAYLOAD SEHINGGA KOTAK-KOTAK BARCODE MENJADI JAUH LEBIH BESAR!
    const isApproved = (verificationData?.isFullyApproved ?? (signaturesData?.kaprodi?.is_approved || false)) ? 1 : 0;

    const studentName = docSettings.qr_verify_show_student_name !== false
      ? (verificationData?.studentName || studentInfo?.name || '').slice(0, 28)
      : '';
    const studentNim = docSettings.qr_verify_show_student_nim !== false
      ? (verificationData?.studentNim || studentInfo?.nim || '')
      : '';
    const studentProgram = docSettings.qr_verify_show_student_prodi !== false
      ? (verificationData?.studentProgram || studentInfo?.program || '')
      : '';

    const adv1Name = docSettings.qr_verify_show_signers !== false
      ? (verificationData?.adv1Name || signaturesData?.advisor_1?.name || '').slice(0, 24)
      : '';
    const kaprodiName = docSettings.qr_verify_show_signers !== false
      ? (verificationData?.kaprodiName || signaturesData?.kaprodi?.name || docSettings.kaprodi_name || '').slice(0, 24)
      : '';

    const activityCount = docSettings.qr_verify_show_activity_summary !== false
      ? (verificationData?.activityCount ?? 0)
      : 0;

    const shortTitle = docSettings.qr_verify_show_topic_title !== false
      ? (verificationData?.topicTitle || variables?.['topic_title'] || variables?.['submission_title'] || '').slice(0, 36)
      : '';

    // Susun array minimalis: [id, nm, nim, pr, isApproved, a1, kp, cnt, tl]
    const compactArray: (string | number)[] = [
      shortId,
      studentName,
      studentNim,
      studentProgram,
      isApproved,
      adv1Name,
      kaprodiName,
      activityCount,
      shortTitle
    ];

    // Pangkas trailing empty/zero values dari belakang agar muatan data sepadat dan seringkas mungkin
    while (
      compactArray.length > 2 &&
      (compactArray[compactArray.length - 1] === '' || compactArray[compactArray.length - 1] === 0)
    ) {
      compactArray.pop();
    }

    const token = encodeVerificationPayload(compactArray);
    const base = `${origin}/v?doc=${shortDoc}&id=${shortId}`;
    return token ? `${base}&v=${token}` : base;
  })();

  return (
    <div className={`relative min-h-screen bg-slate-100 dark:bg-slate-900/90 text-slate-900 py-6 px-2 sm:px-4 ${className}`}>
      <style>{pageSizeStyle}</style>

      {/* TOOLBAR AKSI (Sembunyi saat dicetak) */}
      <div className="no-print max-w-4xl mx-auto mb-6 bg-card border shadow-sm rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold">
            Format: {docSettings.paper_size} ({effectiveOrientation === 'portrait' ? 'Portrait' : 'Landscape'})
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Margin: T:{effectiveMarginTop} B:{effectiveMarginBottom} L:{effectiveMarginLeft} R:{effectiveMarginRight} mm {!isUsingKop ? '(Tanpa Kop)' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={handlePrint} className="gap-1.5 shadow-sm">
            <Printer className="h-4 w-4" />
            Cetak Dokumen / Simpan PDF
          </Button>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose} className="gap-1">
              <X className="h-4 w-4" />
              Tutup
            </Button>
          )}
        </div>
      </div>

      {/* LEMBAR DOKUMEN FISIK (A4 / F4) */}
      <div
        id={containerId}
        className={`bg-white text-slate-900 shadow-xl border mx-auto rounded-sm flex flex-col justify-between transition-all print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none ${
          isPortrait
            ? (isA4 ? 'w-[210mm] max-w-[210mm]' : 'w-[215mm] max-w-[215mm]')
            : (isA4 ? 'w-[297mm] max-w-[297mm]' : 'w-[330mm] max-w-[330mm]')
        }`}
        style={{
          minHeight: isPortrait ? (isA4 ? '297mm' : '330mm') : (isA4 ? '210mm' : '215mm'),
          paddingTop: `${effectiveMarginTop}mm`,
          paddingBottom: `${effectiveMarginBottom}mm`,
          paddingLeft: `${effectiveMarginLeft}mm`,
          paddingRight: `${effectiveMarginRight}mm`,
          fontFamily: template.font_family && template.font_family !== 'inherit'
            ? `"${template.font_family}", Times New Roman, Times, serif`
            : undefined,
        }}
      >
        <div className="w-full flex flex-col">
          {/* 1. KOP SURAT RESMI */}
          {template.show_kop && docSettings.header_mode !== 'none' && (
            <div className={`w-full ${docSettings.header_image_full_bleed ? 'mb-2' : 'mb-4'}`}>
              {/* Mode Gambar Banner Penuh */}
              {docSettings.header_mode === 'image' && docSettings.header_image_url && (
                <div
                  className={`overflow-hidden ${
                    docSettings.header_image_full_bleed ? 'header-full-bleed mb-3' : 'w-full mb-3'
                  }`}
                  style={
                    docSettings.header_image_full_bleed
                      ? {
                          marginTop: `-${effectiveMarginTop}mm`,
                          marginLeft: `-${effectiveMarginLeft}mm`,
                          marginRight: `-${effectiveMarginRight}mm`,
                          width: `calc(100% + ${effectiveMarginLeft + effectiveMarginRight}mm)`,
                          maxWidth: `calc(100% + ${effectiveMarginLeft + effectiveMarginRight}mm)`,
                        }
                      : undefined
                  }
                >
                  <img
                    src={docSettings.header_image_url}
                    alt="Kop Surat"
                    className={`w-full block ${
                      docSettings.header_image_height_mode === 'auto'
                        ? 'h-auto'
                        : 'object-cover object-top'
                    }`}
                    style={
                      docSettings.header_image_height_mode === 'auto'
                        ? { width: '100%' }
                        : { width: '100%', height: `${docSettings.header_image_height_mm || 35}mm` }
                    }
                  />
                </div>
              )}

              {/* Mode Gabungan Logo & Teks Dinamis */}
              {docSettings.header_mode === 'text' && (
                <div className="w-full border-b-[2.5px] border-b-slate-900 pb-2 mb-3">
                  <div className="flex items-center justify-between gap-4">
                    {/* Logo Kiri */}
                    {docSettings.header_logo_left_url ? (
                      <img
                        src={docSettings.header_logo_left_url}
                        alt="Logo Institusi"
                        className="h-16 w-16 sm:h-20 sm:w-20 object-contain shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 shrink-0" />
                    )}

                    {/* Teks Identitas Kampus */}
                    <div className="text-center flex-1 leading-tight px-2">
                      {docSettings.institution_line_1 && (
                        <p className="text-xs sm:text-sm font-semibold tracking-wider text-slate-700 uppercase">
                          {docSettings.institution_line_1}
                        </p>
                      )}
                      {docSettings.institution_line_2 && (
                        <p className="text-sm sm:text-base font-bold text-slate-900 uppercase">
                          {docSettings.institution_line_2}
                        </p>
                      )}
                      {(docSettings.faculty_name || docSettings.program_name) && (
                        <p className="text-xs sm:text-sm font-bold text-slate-800 uppercase">
                          {[docSettings.faculty_name, docSettings.program_name].filter(Boolean).join(' - ')}
                        </p>
                      )}
                      {docSettings.address_line && (
                        <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5">
                          {docSettings.address_line}
                        </p>
                      )}
                      {docSettings.contact_line && (
                        <p className="text-[9px] sm:text-[11px] text-slate-500">
                          {docSettings.contact_line}
                        </p>
                      )}
                    </div>

                    {/* Logo Kanan (Opsional) */}
                    {docSettings.header_logo_right_url ? (
                      <img
                        src={docSettings.header_logo_right_url}
                        alt="Logo Tambahan"
                        className="h-16 w-16 sm:h-20 sm:w-20 object-contain shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 shrink-0" />
                    )}
                  </div>
                  {/* Garis ganda tebal-tipis khas surat dinas */}
                  <div className="border-t border-slate-900 mt-1" />
                </div>
              )}
            </div>
          )}

          {/* 2. JUDUL DOKUMEN */}
          <div className="text-center my-3">
            <h1 className="text-base sm:text-lg font-bold tracking-wide uppercase text-slate-900">
              {finalTitle}
            </h1>
            {finalSubtitle && (
              <h2 className="text-xs sm:text-sm font-semibold tracking-normal text-slate-700 uppercase mt-0.5">
                {finalSubtitle}
              </h2>
            )}
          </div>

          {/* 3. BIODATA MAHASISWA & METADATA (DINAMIS DARI DATABASE) */}
          {template.show_student_info && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-300 rounded text-xs leading-relaxed">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {(template.student_bio_fields && template.student_bio_fields.length > 0
                  ? template.student_bio_fields
                  : defaultStudentBioFields
                ).map((field, idx) => {
                  const val =
                    resolvedVariables[field.key] ||
                    studentInfo?.[field.key] ||
                    studentInfo?.[field.key.replace('nama_mahasiswa', 'name')] ||
                    studentInfo?.[field.key.replace('program_studi', 'program')] ||
                    '-';
                  const isLongValue = String(val).length > 35;

                  return (
                    <div
                      key={idx}
                      className={`flex ${isLongValue ? 'col-span-2' : ''}`}
                    >
                      <span className="w-32 font-medium text-slate-600 shrink-0">
                        {field.label}
                      </span>
                      <span className="w-3 text-center shrink-0">:</span>
                      <span className="font-semibold text-slate-900 flex-1 break-words">
                        {val}
                      </span>
                    </div>
                  );
                })}

                {/* Additional Metadata Items (hanya jika template belum memiliki student_bio_fields yang dikonfigurasi Admin) */}
                {(!template.student_bio_fields || template.student_bio_fields.length === 0) &&
                  metadataItems.map((item, idx) => (
                    <div key={`meta_${idx}`} className="flex col-span-2">
                      <span className="w-32 font-medium text-slate-600 shrink-0">{item.label}</span>
                      <span className="w-3 text-center shrink-0">:</span>
                      <span className="text-slate-900 flex-1 font-medium">{item.value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 3.b TEKS NARASI / SURAT KETERANGAN */}
          {template.content_mode !== 'table_only' && template.body_text_enabled !== false && template.body_text_template && (
            template.body_text_template.includes('<') && template.body_text_template.includes('>') ? (
              <div
                className="my-3 text-xs sm:text-sm leading-relaxed text-slate-800 document-rich-content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    interpolateVariables(template.body_text_template, resolvedVariables)
                  ),
                }}
              />
            ) : (
              <div className="my-3 text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap text-justify">
                {interpolateVariables(template.body_text_template, resolvedVariables)}
              </div>
            )
          )}

          {/* 4. ISI UTAMA DOKUMEN (TABEL ATAU KONTEN DARI PROPS) */}
          {template.content_mode !== 'text_only' && template.table_enabled !== false && (
            <div className="w-full my-2 document-content">
              {children ? (
                children
              ) : (template.columns && template.columns.length > 0) ? (
                <div className="w-full overflow-hidden my-2">
                  <table className="w-full border-collapse border border-slate-300 text-xs [page-break-inside:auto] [break-inside:auto]">
                    <thead className="table-header-group">
                      <tr className="bg-slate-100 font-semibold text-slate-800 [page-break-inside:avoid] [break-inside:avoid]">
                        {(template.columns || []).map((c) => (
                          <th key={c.id} className="border border-slate-300 p-2 text-center text-xs">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="table-row-group">
                      {[1, 2, 3].map((rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/50 [page-break-inside:avoid] [break-inside:avoid]">
                          {(template.columns || []).map((c) => (
                            <td key={c.id} className="border border-slate-300 p-2 text-center text-xs text-slate-700">
                              {getDummyValueForColumn(c.id, c.label, rowIdx)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}

          {/* 5. SUB-BAB CATATAN & TATA TERTIB */}
          {template.rules_note_enabled && template.rules_note_text && (
            <div className="my-4 p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] sm:text-xs text-slate-700 leading-normal break-inside-avoid page-break-inside-avoid">
              <p className="font-bold text-slate-900 mb-1">{template.rules_note_title}</p>
              <div className="whitespace-pre-line space-y-0.5">
                {template.rules_note_text}
              </div>
            </div>
          )}

          {/* 6. BLOK TANDA TANGAN & PENGESAHAN (Mengalir proporsional beberapa cm setelah konten terakhir) */}
          {(template.signatures || []).filter((s) => s.enabled).length > 0 && (
            <div className={`${getSignatureSpacingClass(template.signature_spacing)} pt-2 break-inside-avoid page-break-inside-avoid text-xs signature-block`}>
              {template.show_signature_date !== false && docSettings.show_signature_date !== false && (
                <div className={`text-xs text-slate-700 mb-2 ${enabledSignatures.length === 1 && singleAlign === 'left' ? 'text-left pl-2 sm:pl-8' : enabledSignatures.length === 1 && singleAlign === 'center' ? 'text-center' : 'text-right'}`}>
                  {docSettings.default_city || 'Ponorogo'}, {resolvedDate}
                </div>
              )}

              {/* Grid Tanda Tangan */}
              <div className={`flex flex-wrap items-start gap-6 pt-1 text-center ${signatureLayoutClass}`}>
                {/* Stempel QR Code Verifikasi di Samping Tanda Tangan */}
                {docSettings.qr_code_enabled !== false && docSettings.qr_code_position !== 'footer' && (
                  <div className="min-w-[100px] max-w-[145px] flex flex-col items-center justify-center p-2 rounded-lg border border-slate-300 bg-white/80 print:bg-transparent text-center self-center signature-block shadow-2xs">
                    <QRCodeSVG
                      value={verificationUrl}
                      size={
                        docSettings.qr_code_size === 'small' ? 72 :
                        docSettings.qr_code_size === 'large' ? 112 : 92
                      }
                      level="L"
                      includeMargin={false}
                    />
                    {docSettings.qr_code_show_label !== false && (
                      <span className="text-[8px] text-slate-600 font-medium mt-1 leading-tight text-center max-w-[110px]">
                        Pindai untuk verifikasi keaslian
                      </span>
                    )}
                  </div>
                )}

                {(template.signatures || [])
                  .filter((s) => s.enabled)
                  .map((sig) => {
                    // Resolusi data tanda tangan secara cerdas berdasarkan ID, role_type, atau role_label
                    const getResolvedBaseData = (): DocumentSignatureData => {
                      if (!signaturesData) return { name: '' };
                      if (signaturesData[sig.id]) return signaturesData[sig.id];
                      if (sig.role_type && signaturesData[sig.role_type]) return signaturesData[sig.role_type];

                      const roleType = (sig.role_type || '').toLowerCase();
                      const roleLabel = (sig.role_label || '').toLowerCase();
                      const idLower = (sig.id || '').toLowerCase();

                      // Dosen Pembimbing 1 / Utama
                      if (
                        roleType === 'advisor_1' ||
                        idLower.includes('advisor_1') ||
                        idLower.includes('pembimbing_1') ||
                        idLower.includes('pembimbing1') ||
                        roleLabel.includes('pembimbing 1') ||
                        roleLabel.includes('pembimbing i') ||
                        roleLabel.includes('pembimbing utama')
                      ) {
                        return signaturesData['advisor_1'] || signaturesData['advisor1'] || { name: '' };
                      }

                      // Dosen Pembimbing 2 / Pendamping
                      if (
                        roleType === 'advisor_2' ||
                        idLower.includes('advisor_2') ||
                        idLower.includes('pembimbing_2') ||
                        idLower.includes('pembimbing2') ||
                        roleLabel.includes('pembimbing 2') ||
                        roleLabel.includes('pembimbing ii') ||
                        roleLabel.includes('pembimbing pendamping')
                      ) {
                        return signaturesData['advisor_2'] || signaturesData['advisor2'] || { name: '' };
                      }

                      // Kaprodi / Ketua Program Studi
                      if (
                        roleType === 'kaprodi' ||
                        idLower.includes('kaprodi') ||
                        roleLabel.includes('kaprodi') ||
                        roleLabel.includes('ketua program studi') ||
                        roleLabel.includes('ketua prodi')
                      ) {
                        return signaturesData['kaprodi'] || { name: '' };
                      }

                      // Dekan Fakultas
                      if (
                        roleType === 'dekan' ||
                        idLower.includes('dekan') ||
                        roleLabel.includes('dekan')
                      ) {
                        return signaturesData['dekan'] || { name: '' };
                      }

                      // Mahasiswa
                      if (
                        roleType === 'student' ||
                        idLower.includes('student') ||
                        idLower.includes('mahasiswa') ||
                        roleLabel.includes('mahasiswa') ||
                        roleLabel.includes('pemohon')
                      ) {
                        return signaturesData['student'] || { name: '' };
                      }

                      // DPA (Dosen Pembimbing Akademik)
                      if (
                        roleType === 'dpa' ||
                        idLower.includes('dpa') ||
                        roleLabel.includes('pembimbing akademik') ||
                        roleLabel.includes('perwalian')
                      ) {
                        return signaturesData['dpa'] || { name: '' };
                      }

                      return { name: '' };
                    };

                    const baseData = getResolvedBaseData();
                    const isKaprodi =
                      sig.id === 'kaprodi' ||
                      (sig as any).role_type === 'kaprodi' ||
                      (sig.role_label || '').toLowerCase().includes('kaprodi') ||
                      (sig.role_label || '').toLowerCase().includes('ketua pro');

                    const isDekan =
                      sig.id === 'dekan' ||
                      (sig as any).role_type === 'dekan' ||
                      (sig.role_label || '').toLowerCase().includes('dekan');

                    const resolvedName =
                      baseData.name ||
                      sig.custom_name ||
                      (isKaprodi
                        ? docSettings.kaprodi_name || 'Ketua Program Studi'
                        : isDekan
                        ? docSettings.dekan_name || 'Dekan Fakultas'
                        : '..................................');

                    const resolvedIdNumber =
                      baseData.id_number ||
                      sig.custom_id_number ||
                      (isKaprodi ? docSettings.kaprodi_nidn : isDekan ? docSettings.dekan_nidn : undefined);

                    // Tanda tangan digital hanya tertera JIKA:
                    // 1. Dokumen sedang di-preview di customizer (isPreview), ATAU
                    // 2. baseData.is_approved bernilai true (telah disahkan secara resmi oleh pemegang akun)
                    const isApproved = isPreview || baseData.is_approved === true;

                    let signatureImg: string | null = null;
                    if (sig.use_digital_signature && isApproved) {
                      const resolvedSignatureUrl =
                        baseData.signature_url ||
                        (isKaprodi ? docSettings.kaprodi_signature_url : isDekan ? docSettings.dekan_signature_url : undefined);
                      signatureImg = resolvedSignatureUrl || baseData.paraf_url || null;
                    }

                    return (
                      <div key={sig.id} className="min-w-[140px] max-w-[200px] flex flex-col items-center signature-block">
                        {sig.signer_status && sig.signer_status !== 'pemohon' && (
                          <p className="text-[10px] uppercase font-semibold text-slate-500 mb-0.5">
                            {sig.signer_status === 'mengetahui' ? 'Mengetahui,' : 'Menyetujui,'}
                          </p>
                        )}
                        <p className="text-xs text-slate-600 mb-1 font-medium">{sig.role_label},</p>

                        {/* Kotak Gambar Tanda Tangan */}
                        <div className="h-16 w-32 flex items-center justify-center my-1 relative">
                          {signatureImg ? (
                            <img
                              src={signatureImg}
                              alt="Tanda Tangan"
                              className="max-h-14 max-w-full object-contain filter drop-shadow-sm"
                            />
                          ) : (
                            <div className="h-12 w-full flex items-end justify-center">
                              <span className="text-[10px] text-slate-300 italic">(tanda tangan)</span>
                            </div>
                          )}
                        </div>

                        {/* Nama & NIP/NIM */}
                        <p className="font-bold text-slate-900 text-xs border-b border-slate-900 pb-0.5 px-1 inline-block">
                          {resolvedName}
                        </p>
                        {resolvedIdNumber && (() => {
                          const isStudent =
                            sig.id === 'student' ||
                            sig.role_type === 'student' ||
                            (sig.role_label || '').toLowerCase().includes('mahasiswa');
                          const prefix = isStudent ? 'NIM' : 'NIDN';
                          const cleanId = String(resolvedIdNumber).replace(/^(nidn|nim|nip|nuptk)[\s.:]*/i, '');
                          return (
                            <p className="text-[10px] text-slate-600 mt-0.5">
                              {prefix}. {cleanId}
                            </p>
                          );
                        })()}
                      </div>
                    );
                  })}
              </div>

              {/* 6.b TEMBUSAN (CARBON COPY / CC) */}
              {template.copies_enabled && template.copies_list && template.copies_list.length > 0 && (
                <div className="mt-5 pt-3 border-t text-[10px] text-slate-600 break-inside-avoid page-break-inside-avoid signature-block">
                  <p className="font-semibold text-slate-800 mb-1">Tembusan disampaikan kepada Yth:</p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    {template.copies_list.map((item, idx) => (
                      <li key={idx} className="text-slate-700">{item}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* QR CODE TEPAT 1 CM (10mm) DI ATAS SUDUT KIRI ATAS FOOTER */}
        {docSettings.qr_code_enabled !== false && docSettings.qr_code_position === 'footer' && (
          <div className="mt-auto mb-[10mm] flex justify-start items-end z-10 print:mb-[10mm] break-inside-avoid page-break-inside-avoid">
            <div className="flex items-center gap-2 p-1.5 rounded border border-slate-300 bg-white/95 print:bg-transparent print:border-slate-400 shadow-xs">
              <QRCodeSVG
                value={verificationUrl}
                size={
                  docSettings.qr_code_size === 'small' ? 52 :
                  docSettings.qr_code_size === 'large' ? 84 : 68
                }
                level="L"
                includeMargin={false}
              />
              {docSettings.qr_code_show_label !== false && (
                <div className="flex flex-col text-left">
                  <span className="text-[8px] font-bold text-slate-800 leading-tight">
                    Pindai Verifikasi
                  </span>
                  <span className="text-[7px] text-slate-500 leading-tight max-w-[95px]">
                    Keabsahan Dokumen Digital
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. FOOTER RESMI DOKUMEN */}
        {docSettings.footer_enabled && template.show_footer !== false && (
          <div
            className={`break-inside-avoid page-break-inside-avoid print-footer ${
              docSettings.footer_mode === 'image' && docSettings.footer_image_full_bleed
                ? 'footer-full-bleed overflow-hidden'
                : 'pt-2.5 border-t border-slate-300'
            }`}
            style={
              docSettings.footer_mode === 'image' && docSettings.footer_image_full_bleed
                ? {
                    marginBottom: `-${effectiveMarginBottom}mm`,
                    marginLeft: `-${effectiveMarginLeft}mm`,
                    marginRight: `-${effectiveMarginRight}mm`,
                    width: `calc(100% + ${effectiveMarginLeft + effectiveMarginRight}mm)`,
                    maxWidth: `calc(100% + ${effectiveMarginLeft + effectiveMarginRight}mm)`,
                  }
                : undefined
            }
          >
            {docSettings.footer_mode === 'text' ? (
              <div className="text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <p className="max-w-md truncate">{docSettings.footer_text}</p>
                {docSettings.show_page_number && (
                  <span className="font-medium">{docSettings.footer_watermark_text || 'Dokumen Sah Akademik'}</span>
                )}
              </div>
            ) : docSettings.footer_image_url ? (
              <div className="relative w-full">
                <img
                  src={docSettings.footer_image_url}
                  alt="Footer"
                  className={`w-full block ${
                    docSettings.footer_image_height_mode === 'auto'
                      ? 'h-auto'
                      : 'object-cover object-bottom'
                  }`}
                  style={
                    docSettings.footer_image_height_mode === 'auto'
                      ? undefined
                      : { height: `${docSettings.footer_image_height_mm || 20}mm` }
                  }
                />
                {docSettings.show_page_number && (
                  <div className="absolute bottom-1 right-3 text-[9px] text-slate-600 bg-white/80 px-1.5 py-0.5 rounded shadow-xs print:bg-transparent">
                    {docSettings.footer_watermark_text || 'Dokumen Sah Akademik'}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
