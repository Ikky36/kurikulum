import React, { useRef } from 'react';
import { useDocumentSettings } from '@/lib/documentSettings';
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
import { Printer, X, Download, ShieldCheck, Info } from 'lucide-react';

export interface DocumentSignatureData {
  name: string;
  id_number?: string; // NIP, NIDN, or NIM
  signature_url?: string | null;
  paraf_url?: string | null;
}

export interface UniversalDocumentContainerProps {
  templateCode: string;
  templateOverride?: SingleDocumentTemplate;
  containerId?: string;
  documentTitle?: string;
  documentSubtitle?: string;
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
  documentTitle,
  documentSubtitle,
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
  const template: SingleDocumentTemplate = templateOverride || getTemplate(templateCode);

  const finalTitle = documentTitle || template.document_title;
  const finalSubtitle = documentSubtitle || template.document_subtitle;

  const isA4 = docSettings.paper_size === 'A4';
  // Orientasi ditentukan oleh konfigurasi template dokumen yang diatur Admin (fallback ke global docSettings)
  const effectiveOrientation = template.orientation || docSettings.orientation || 'portrait';
  const isPortrait = effectiveOrientation === 'portrait';

  // Print Handler via isolated iframe printer
  const handlePrint = async () => {
    await printElementById(containerId, {
      paperSize: docSettings.paper_size,
      orientation: effectiveOrientation,
      marginTop: docSettings.margin_top,
      marginBottom: docSettings.margin_bottom,
      marginLeft: docSettings.margin_left,
      marginRight: docSettings.margin_right,
      title: finalTitle,
    });
  };

  // CSS Page sizing for @media print
  const pageSizeStyle = `@page { 
    size: ${docSettings.paper_size} ${effectiveOrientation}; 
    margin: ${docSettings.margin_top}mm ${docSettings.margin_right}mm ${docSettings.margin_bottom}mm ${docSettings.margin_left}mm; 
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
            Margin: T:{docSettings.margin_top} B:{docSettings.margin_bottom} L:{docSettings.margin_left} R:{docSettings.margin_right} mm
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
          paddingTop: `${docSettings.margin_top}mm`,
          paddingBottom: `${docSettings.margin_bottom}mm`,
          paddingLeft: `${docSettings.margin_left}mm`,
          paddingRight: `${docSettings.margin_right}mm`,
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
                          marginTop: `-${docSettings.margin_top}mm`,
                          marginLeft: `-${docSettings.margin_left}mm`,
                          marginRight: `-${docSettings.margin_right}mm`,
                          width: `calc(100% + ${docSettings.margin_left + docSettings.margin_right}mm)`,
                          maxWidth: `calc(100% + ${docSettings.margin_left + docSettings.margin_right}mm)`,
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

                {/* Additional Metadata Items */}
                {metadataItems.map((item, idx) => (
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
            <div className="my-3 text-xs leading-relaxed text-slate-800 text-justify whitespace-pre-line">
              {interpolateVariables(template.body_text_template, resolvedVariables)}
            </div>
          )}

          {/* 4. ISI UTAMA DOKUMEN (TABEL ATAU KONTEN DARI PROPS) */}
          {template.content_mode !== 'text_only' && template.table_enabled !== false && (
            <div className="w-full my-2 document-content">
              {children ? (
                children
              ) : template.columns && template.columns.length > 0 ? (
                <div className="w-full overflow-hidden my-2">
                  <table className="w-full border-collapse border border-slate-300 text-xs [page-break-inside:auto] [break-inside:auto]">
                    <thead className="table-header-group">
                      <tr className="bg-slate-100 font-semibold text-slate-800 [page-break-inside:avoid] [break-inside:avoid]">
                        {template.columns.map((c) => (
                          <th key={c.id} className="border border-slate-300 p-2 text-center text-xs">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="table-row-group">
                      {[1, 2, 3].map((rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/50 [page-break-inside:avoid] [break-inside:avoid]">
                          {template.columns.map((c) => (
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
          {template.signatures.filter((s) => s.enabled).length > 0 && (
            <div className={`${getSignatureSpacingClass(template.signature_spacing)} pt-2 break-inside-avoid page-break-inside-avoid text-xs signature-block`}>
              <div className="text-right text-xs text-slate-700 mb-2">
                {docSettings.default_city || 'Ponorogo'},{' '}
                {new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>

              {/* Grid Tanda Tangan */}
              <div className="flex flex-wrap items-start justify-around gap-6 pt-1 text-center">
                {template.signatures
                  .filter((s) => s.enabled)
                  .map((sig) => {
                    const sigData = signaturesData[sig.id] || {
                      name: sig.custom_name || (sig.id === 'kaprodi' ? docSettings.kaprodi_name || 'Dr. Fulan, M.Pd.' : '..................................'),
                      id_number: sig.custom_id_number || (sig.id === 'kaprodi' ? docSettings.kaprodi_nidn : undefined),
                    };

                    const signatureImg = sig.use_digital_signature ? (sigData.signature_url || sigData.paraf_url) : null;

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
                          {sigData.name}
                        </p>
                        {sigData.id_number && (
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            NIDN/NIM. {sigData.id_number}
                          </p>
                        )}
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

        {/* 7. FOOTER RESMI DOKUMEN */}
        {docSettings.footer_enabled && template.show_footer !== false && (
          <div
            className={`mt-auto break-inside-avoid page-break-inside-avoid print-footer ${
              docSettings.footer_mode === 'image' && docSettings.footer_image_full_bleed
                ? 'footer-full-bleed overflow-hidden'
                : 'pt-2.5 border-t border-slate-300'
            }`}
            style={
              docSettings.footer_mode === 'image' && docSettings.footer_image_full_bleed
                ? {
                    marginBottom: `-${docSettings.margin_bottom}mm`,
                    marginLeft: `-${docSettings.margin_left}mm`,
                    marginRight: `-${docSettings.margin_right}mm`,
                    width: `calc(100% + ${docSettings.margin_left + docSettings.margin_right}mm)`,
                    maxWidth: `calc(100% + ${docSettings.margin_left + docSettings.margin_right}mm)`,
                  }
                : undefined
            }
          >
            {docSettings.footer_mode === 'text' ? (
              <div className="text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <p className="max-w-md truncate">{docSettings.footer_text}</p>
                {docSettings.show_page_number && (
                  <span className="font-medium">Dokumen Sah Akademik</span>
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
                    Dokumen Sah Akademik
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
