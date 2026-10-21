/**
 * printUtils.ts
 * Utilitas cetak dokumen resmi yang mengisolasi lembar dokumen ke dalam iframe terpisah.
 * Menjamin 100% hanya lembar dokumen A4/F4 yang dicetak tanpa menyertakan elemen dashboard admin,
 * navbar, sidebar, tabs, modal backdrop, maupun URL browser.
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
    marginTop = 20,
    marginBottom = 20,
    marginLeft = 25,
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
      color: #000000 !important;
      width: ${widthMm}mm !important;
      min-height: ${heightMm}mm !important;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    .no-print {
      display: none !important;
    }
    ${
      removeShadowAndBorder
        ? `
      #printable-document,
      #admin-test-printable-document,
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
    table {
      width: 100%;
      border-collapse: collapse;
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

  // Mengumpulkan seluruh link stylesheet dan tag style aplikasi
  const headElements = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  );
  const headHtml = headElements.map((el) => el.outerHTML).join('\n');

  // Membuat iframe tersembunyi
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
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
        <title>${title}</title>
        ${headHtml}
        <style>
          ${pageCss}
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Menunggu fonts dan gambar kop/logo termuat sempurna
  try {
    if (iframeDoc.fonts) {
      await iframeDoc.fonts.ready;
    }
  } catch (_) {}

  const images = Array.from(iframeDoc.images);
  if (images.length > 0) {
    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) {
              resolve(null);
            } else {
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
            }
          })
      )
    );
  }

  // Jeda singkat untuk rendering final browser engine
  await new Promise((r) => setTimeout(r, 200));

  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } catch (err) {
    console.error('[printUtils] Print error:', err);
    window.print();
  } finally {
    // Iframe dibersihkan setelah proses dialog cetak selesai
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch (_) {}
    }, 2000);
  }

  return true;
}
