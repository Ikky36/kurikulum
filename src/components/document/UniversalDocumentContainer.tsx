import React, { useRef } from 'react';
import { useDocumentSettings } from '@/lib/documentSettings';
import { useDocumentTemplatesConfig, SingleDocumentTemplate } from '@/lib/documentTemplateTypes';
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
  metadataItems?: { label: string; value: string | React.ReactNode }[];
  signaturesData?: Record<string, DocumentSignatureData>;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function UniversalDocumentContainer({
  templateCode,
  documentTitle,
  documentSubtitle,
  studentInfo,
  metadataItems = [],
  signaturesData = {},
  children,
  onClose,
  className = '',
}: UniversalDocumentContainerProps) {
  const { settings: docSettings } = useDocumentSettings();
  const { getTemplate } = useDocumentTemplatesConfig();
  const template: SingleDocumentTemplate = getTemplate(templateCode);

  const finalTitle = documentTitle || template.document_title;
  const finalSubtitle = documentSubtitle || template.document_subtitle;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  const isA4 = docSettings.paper_size === 'A4';
  const isPortrait = docSettings.orientation === 'portrait';

  // CSS Page sizing for @media print
  const pageSizeStyle = `@page { 
    size: ${docSettings.paper_size} ${docSettings.orientation}; 
    margin: ${docSettings.margin_top}mm ${docSettings.margin_right}mm ${docSettings.margin_bottom}mm ${docSettings.margin_left}mm; 
  }`;

  return (
    <div className={`relative min-h-screen bg-slate-100 dark:bg-slate-900/90 text-slate-900 py-6 px-2 sm:px-4 ${className}`}>
      <style>{pageSizeStyle}</style>

      {/* TOOLBAR AKSI (Sembunyi saat dicetak) */}
      <div className="no-print max-w-4xl mx-auto mb-6 bg-card border shadow-sm rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold">
            Format: {docSettings.paper_size} ({docSettings.orientation})
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
        id="printable-document"
        className={`bg-white text-slate-900 shadow-xl border mx-auto rounded-sm overflow-hidden flex flex-col justify-between transition-all print:shadow-none print:border-none print:m-0 print:p-0 print:w-full print:max-w-none ${
          isPortrait ? 'max-w-[215mm]' : 'max-w-[330mm]'
        }`}
        style={{
          minHeight: isPortrait ? (isA4 ? '297mm' : '330mm') : (isA4 ? '210mm' : '215mm'),
          paddingTop: `${docSettings.margin_top}mm`,
          paddingBottom: `${docSettings.margin_bottom}mm`,
          paddingLeft: `${docSettings.margin_left}mm`,
          paddingRight: `${docSettings.margin_right}mm`,
        }}
      >
        <div className="flex-1 flex flex-col">
          {/* 1. KOP SURAT RESMI */}
          {template.show_kop && docSettings.header_mode !== 'none' && (
            <div className="w-full mb-4">
              {/* Mode Gambar Banner Penuh */}
              {docSettings.header_mode === 'image' && docSettings.header_image_url && (
                <div className="w-full border-b pb-2 mb-2">
                  <img src={docSettings.header_image_url} alt="Kop Surat" className="w-full h-auto max-h-28 object-contain mx-auto" />
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

          {/* 3. BIODATA MAHASISWA & METADATA */}
          {template.show_student_info && (studentInfo || metadataItems.length > 0) && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-300 rounded text-xs leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {studentInfo?.name && (
                  <div className="flex">
                    <span className="w-28 font-medium text-slate-600">Nama Mahasiswa</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-semibold text-slate-900 flex-1">{studentInfo.name}</span>
                  </div>
                )}
                {studentInfo?.nim && (
                  <div className="flex">
                    <span className="w-28 font-medium text-slate-600">NIM</span>
                    <span className="w-3 text-center">:</span>
                    <span className="font-semibold text-slate-900 flex-1">{studentInfo.nim}</span>
                  </div>
                )}
                {studentInfo?.program && (
                  <div className="flex">
                    <span className="w-28 font-medium text-slate-600">Program Studi</span>
                    <span className="w-3 text-center">:</span>
                    <span className="text-slate-900 flex-1">{studentInfo.program}</span>
                  </div>
                )}
                {studentInfo?.sistem_kuliah && (
                  <div className="flex">
                    <span className="w-28 font-medium text-slate-600">Sistem Kuliah</span>
                    <span className="w-3 text-center">:</span>
                    <span className="text-slate-900 flex-1">{studentInfo.sistem_kuliah}</span>
                  </div>
                )}
                {studentInfo?.semester && (
                  <div className="flex">
                    <span className="w-28 font-medium text-slate-600">Semester</span>
                    <span className="w-3 text-center">:</span>
                    <span className="text-slate-900 flex-1">{studentInfo.semester}</span>
                  </div>
                )}
                {studentInfo?.academic_year && (
                  <div className="flex">
                    <span className="w-28 font-medium text-slate-600">Tahun Akademik</span>
                    <span className="w-3 text-center">:</span>
                    <span className="text-slate-900 flex-1">{studentInfo.academic_year}</span>
                  </div>
                )}

                {/* Additional Metadata Items */}
                {metadataItems.map((item, idx) => (
                  <div key={idx} className="flex col-span-1 sm:col-span-2">
                    <span className="w-28 font-medium text-slate-600 shrink-0">{item.label}</span>
                    <span className="w-3 text-center shrink-0">:</span>
                    <span className="text-slate-900 flex-1 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ISI UTAMA DOKUMEN (TABEL ATAU KONTEN DARI PROPS) */}
          <div className="flex-1 my-2 document-content">
            {children}
          </div>

          {/* 5. SUB-BAB CATATAN & TATA TERTIB */}
          {template.rules_note_enabled && template.rules_note_text && (
            <div className="my-4 p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] sm:text-xs text-slate-700 leading-normal">
              <p className="font-bold text-slate-900 mb-1">{template.rules_note_title}</p>
              <div className="whitespace-pre-line space-y-0.5">
                {template.rules_note_text}
              </div>
            </div>
          )}

          {/* 6. BLOK TANDA TANGAN & PENGESAHAN */}
          {template.signatures.filter((s) => s.enabled).length > 0 && (
            <div className="mt-6 pt-2 break-inside-avoid text-xs">
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
                      name: sig.id === 'kaprodi' ? docSettings.kaprodi_name || 'Dr. Fulan, M.Pd.' : '..................................',
                      id_number: sig.id === 'kaprodi' ? docSettings.kaprodi_nidn : undefined,
                    };

                    const signatureImg = sig.use_digital_signature ? (sigData.signature_url || sigData.paraf_url) : null;

                    return (
                      <div key={sig.id} className="min-w-[140px] max-w-[200px] flex flex-col items-center">
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
            </div>
          )}
        </div>

        {/* 7. FOOTER RESMI DOKUMEN */}
        {docSettings.footer_enabled && (
          <div className="mt-6 pt-2 border-t border-slate-300 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            {docSettings.footer_mode === 'text' ? (
              <p className="max-w-md truncate">{docSettings.footer_text}</p>
            ) : docSettings.footer_image_url ? (
              <img src={docSettings.footer_image_url} alt="Footer" className="max-h-8 object-contain" />
            ) : null}

            {docSettings.show_page_number && (
              <span className="font-medium">Dokumen Sah Akademik</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
