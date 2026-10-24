/**
 * printUtils.ts
 * Utilitas cetak dokumen resmi yang mengisolasi lembar dokumen ke dalam iframe terpisah.
 * Menjamin 100% hanya lembar dokumen A4/F4 yang dicetak tanpa menyertakan elemen dashboard admin,
 * navbar, sidebar, tabs, modal backdrop, maupun URL browser.
 * 
 * Melakukan inlining seluruh stylesheet terkompilasi (Tailwind CSS) ke dalam iframe agar tampilan
 * cetak (Uji Cetak / Print dialog) 100% identik dan presisi dengan pratinjau di layar.
 */

export interface PrintOptions {
  paperSize?: 'A4' | 'F4';
  orientation?: 'portrait' | 'landscape';
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  title?: string;
  removeShadowAndBorder?: boolean;
}

export async function printElementById(
  elementId: string,
  options: PrintOptions = {}
): Promise<boolean> {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    console.warn(`[printUtils] Element dengan ID "${elementId}" tidak ditemukan.`);
    window.print();
    return false;
  }

  return printHtml(sourceEl.outerHTML, options);
}

export async function printHtml(
  htmlContent: string,
  options: PrintOptions = {}
): Promise<boolean> {
  const {
    paperSize = 'A4',
    orientation = 'portrait',
    marginTop = 40,
    marginBottom = 10,
    marginLeft = 20,
    marginRight = 20,
    title = 'Dokumen',
    removeShadowAndBorder = true,
  } = options;

  // Ukuran kertas fisik standar dalam milimeter:
  // A4: 210mm x 297mm
  // F4 (Folio): 215mm x 330mm
  const isA4 = paperSize === 'A4';
  const isPortrait = orientation === 'portrait';
  const widthMm = isPortrait ? (isA4 ? 210 : 215) : (isA4 ? 297 : 330);
  const heightMm = isPortrait ? (isA4 ? 297 : 330) : (isA4 ? 210 : 215);

  // 1. Ekstrak seluruh aturan CSS dari document.styleSheets (Tailwind CSS yang aktif di runtime)
  let inlinedStyles = '';
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            inlinedStyles += rules[j].cssText + '\n';
          }
        }
      } catch (_e) {
        // Abaikan CORS SecurityError pada stylesheet eksternal (misal font google)
      }
    }
  } catch (err) {
    console.warn('[printUtils] Gagal mengekstrak document.styleSheets:', err);
  }

  // 2. CSS Khusus Pengaturan Lembar Cetak & Fallback Utilitas
  const pageCss = `
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      width: ${widthMm}mm !important;
      min-height: ${heightMm}mm !important;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: inherit !important;
    }
    .no-print {
      display: none !important;
    }
    ${
      removeShadowAndBorder
        ? `
      #printable-document,
      #admin-test-printable-document,
      #admin-modal-printable-document,
      #admin-kop-printable-sheet,
      .printable-sheet,
      [data-printable-sheet] {
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: none !important;
        min-height: ${heightMm}mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-sizing: border-box !important;
      }
    `
        : ''
    }

    /* Full-bleed header & footer: Menjangkau 100% lebar kertas dari tepi ke tepi tanpa celah putih samping */
    .header-full-bleed {
      width: calc(100% + ${marginLeft + marginRight}mm) !important;
      max-width: none !important;
      margin-left: -${marginLeft}mm !important;
      margin-right: -${marginRight}mm !important;
      margin-top: -${marginTop}mm !important;
      box-sizing: border-box !important;
    }
    .footer-full-bleed {
      width: calc(100% + ${marginLeft + marginRight}mm) !important;
      max-width: none !important;
      margin-left: -${marginLeft}mm !important;
      margin-right: -${marginRight}mm !important;
      margin-bottom: -${marginBottom}mm !important;
      box-sizing: border-box !important;
    }

    /* Fallback Utilitas Dokumen & Tabel */
    .grid { display: grid !important; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .col-span-1 { grid-column: span 1 / span 1 !important; }
    .col-span-2 { grid-column: span 2 / span 2 !important; }
    .gap-x-6 { column-gap: 1.5rem !important; }
    .gap-y-1 { row-gap: 0.25rem !important; }
    .gap-y-1\\.5 { row-gap: 0.375rem !important; }
    .gap-2 { gap: 0.5rem !important; }
    .gap-4 { gap: 1rem !important; }
    .gap-6 { gap: 1.5rem !important; }
    
    .flex { display: flex !important; }
    .flex-col { flex-direction: column !important; }
    .flex-row { flex-direction: row !important; }
    .flex-wrap { flex-wrap: wrap !important; }
    .flex-1 { flex: 1 1 0% !important; }
    .shrink-0 { flex-shrink: 0 !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .items-end { align-items: flex-end !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-around { justify-content: space-around !important; }
    .justify-center { justify-content: center !important; }
    .justify-end { justify-content: flex-end !important; }

    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .text-justify { text-align: justify !important; }

    .font-bold { font-weight: 700 !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-medium { font-weight: 500 !important; }
    .uppercase { text-transform: uppercase !important; }

    .border { border: 1px solid #cbd5e1 !important; }
    .border-b { border-bottom: 1px solid #cbd5e1 !important; }
    .border-t { border-top: 1px solid #cbd5e1 !important; }
    .border-slate-200 { border-color: #e2e8f0 !important; }
    .border-slate-300 { border-color: #cbd5e1 !important; }
    .border-slate-400 { border-color: #94a3b8 !important; }
    .border-slate-900 { border-color: #0f172a !important; }
    .bg-slate-50 { background-color: #f8fafc !important; }
    .bg-slate-100 { background-color: #f1f5f9 !important; }
    .bg-white { background-color: #ffffff !important; }
    .rounded { border-radius: 0.25rem !important; }

    /* Dimensi tanpa !important agar style atribut dinamis dapat menimpa dengan wajar */
    .w-full { width: 100%; }
    .w-32 { width: 8rem; }
    .w-3 { width: 0.75rem; }
    .w-10 { width: 2.5rem; }
    .w-28 { width: 7rem; }
    .w-36 { width: 9rem; }
    .min-w-\\[140px\\] { min-width: 140px; }
    .max-w-\\[200px\\] { max-width: 200px; }
    .h-16 { height: 4rem; }
    .h-12 { height: 3rem; }

    table {
      width: 100% !important;
      border-collapse: collapse !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    thead {
      display: table-header-group !important;
    }
    tbody {
      display: table-row-group !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    th, td {
      border: 1px solid #94a3b8 !important;
      padding: 0.5rem !important;
    }
    th {
      background-color: #f1f5f9 !important;
      font-weight: 600 !important;
    }
    .signature-block {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .print-footer {
      margin-top: auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  `;

  // 3. Kumpulkan tag link stylesheet dan style yang ada di dokumen induk
  const headElements = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style:not(#inlined-app-styles):not(#page-print-rules)')
  );
  const headHtml = headElements.map((el) => el.outerHTML).join('\n');

  // 4. Buat iframe tersembunyi dengan ukuran viewport nyata (1024px) agar kalkulasi layout & media queries tepat
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-99999px';
  iframe.style.top = '0';
  iframe.style.width = '1024px';
  iframe.style.height = '1024px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    window.print();
    return false;
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8">
        <base href="${window.location.origin}/">
        <title>${title}</title>
        ${headHtml}
        ${inlinedStyles ? `<style id="inlined-app-styles">${inlinedStyles}</style>` : ''}
        <style id="page-print-rules">
          ${pageCss}
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  iframeDoc.close();

  // 5. Tunggu font termuat
  try {
    if (iframeDoc.fonts) {
      await iframeDoc.fonts.ready;
    }
  } catch (_) {}

  // 6. Tunggu stylesheet eksternal jika ada yang dimuat via <link>
  const linkElements = Array.from(iframeDoc.querySelectorAll('link[rel="stylesheet"]'));
  if (linkElements.length > 0) {
    await Promise.all(
      linkElements.map(
        (link) =>
          new Promise((resolve) => {
            const linkEl = link as HTMLLinkElement;
            if (linkEl.sheet) {
              resolve(null);
            } else {
              linkEl.onload = () => resolve(null);
              linkEl.onerror = () => resolve(null);
              setTimeout(() => resolve(null), 1000);
            }
          })
      )
    );
  }

  // 7. Tunggu semua gambar (logo kop surat, gambar tanda tangan, footer)
  const images = Array.from(iframeDoc.images);
  if (images.length > 0) {
    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve(null);
            } else {
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
              setTimeout(() => resolve(null), 2000);
            }
          })
      )
    );
  }

  // 8. Beri jeda render reflow engine browser (requestAnimationFrame ganda)
  await new Promise((resolve) => {
    if (iframe.contentWindow?.requestAnimationFrame) {
      iframe.contentWindow.requestAnimationFrame(() => {
        iframe.contentWindow?.requestAnimationFrame(() => {
          setTimeout(resolve, 150);
        });
      });
    } else {
      setTimeout(resolve, 200);
    }
  });

  // 9. Eksekusi dialog cetak
  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } catch (err) {
    console.error('[printUtils] Print error:', err);
    window.print();
  } finally {
    // Bersihkan iframe setelah jeda waktu aman
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch (_) {}
    }, 5000);
  }

  return true;
}
