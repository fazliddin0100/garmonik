import QRCode from 'qrcode';
import {
  CLINICAL_PRINT_ADDRESS,
  CLINICAL_PRINT_CLINIC_NAME_LINES,
  CLINICAL_PRINT_COLORS,
  CLINICAL_PRINT_LOGO_PATH,
  CLINICAL_PRINT_PHONES,
} from '@/lib/patients/clinical-print-branding';

export type ClinicalPrintField = {
  label: string;
  value: string;
};

export type ClinicalPrintResultItem = {
  title: string;
  subtitle?: string;
  body: string;
  meta?: string;
  kind?: 'lab' | 'specialist' | 'text';
  /** Strukturaviy maydonlar (epikriz blankasi uchun) */
  fields?: ClinicalPrintField[];
};

export type ClinicalPrintDocumentInput = {
  patientName: string;
  patientId?: string;
  diseaseType?: string;
  documentTitle: string;
  printedAt?: string;
  items: ClinicalPrintResultItem[];
  /** Shifokor laboratoriya xulosasi */
  labConclusion?: string;
  /** QR uchun qiymat; bo‘sh bo‘lsa klinik manzil/telefon */
  qrValue?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrintDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function absoluteAssetUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return new URL(path, window.location.origin).toString();
}

async function buildQrDataUrl(value: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(value, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0B1F4A', light: '#ffffff' },
    });
  } catch {
    return null;
  }
}

function renderFieldsHtml(fields?: ClinicalPrintField[]): string {
  if (!fields || fields.length === 0) return '';
  return `
    <div class="field-grid">
      ${fields
        .map(
          (field) => `
        <div class="field-row">
          <div class="field-label">${escapeHtml(field.label)}</div>
          <div class="field-value">${escapeHtml(field.value).replace(/\n/g, '<br/>')}</div>
        </div>`,
        )
        .join('')}
    </div>`;
}

function renderLabTableHtml(items: ClinicalPrintResultItem[]): string {
  if (items.length === 0) return '';
  const rows = items
    .map((item, index) => {
      return `
      <tr>
        <td class="num">${index + 1}</td>
        <td>
          <div class="lab-name">${escapeHtml(item.title)}</div>
          ${item.subtitle ? `<div class="lab-cat">${escapeHtml(item.subtitle)}</div>` : ''}
        </td>
        <td class="value">${escapeHtml(item.body).replace(/\n/g, '<br/>')}</td>
        <td class="meta-cell">${item.meta ? escapeHtml(item.meta) : '—'}</td>
      </tr>`;
    })
    .join('');

  return `
    <table class="lab-table">
      <thead>
        <tr>
          <th class="num">№</th>
          <th>Tahlil nomi</th>
          <th>Natija</th>
          <th>Sana / kim kiritgan</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderSectionCardHtml(item: ClinicalPrintResultItem, variant: 'text' | 'specialist'): string {
  const hasFields = Boolean(item.fields && item.fields.length > 0);
  const bodyHtml =
    hasFields ? renderFieldsHtml(item.fields)
    : item.body.trim() ?
      `<div class="body">${escapeHtml(item.body).replace(/\n/g, '<br/>')}</div>`
    : '';

  return `
    <article class="section-block ${variant}">
      <div class="section-head">
        <h3>${escapeHtml(item.title)}</h3>
        ${item.subtitle ? `<p class="subtitle">${escapeHtml(item.subtitle)}</p>` : ''}
      </div>
      ${bodyHtml}
      ${item.meta ? `<p class="meta">${escapeHtml(item.meta)}</p>` : ''}
    </article>`;
}

function renderItemsHtml(items: ClinicalPrintResultItem[]): string {
  if (items.length === 0) {
    return `<p class="empty">Chop etish uchun natija tanlanmagan.</p>`;
  }

  const labItems = items.filter((item) => !item.kind || item.kind === 'lab');
  const textItems = items.filter((item) => item.kind === 'text');
  const specialistItems = items.filter((item) => item.kind === 'specialist');

  const parts: string[] = [];
  if (labItems.length > 0) {
    parts.push(renderLabTableHtml(labItems));
  }
  if (textItems.length > 0) {
    if (labItems.length > 0) {
      parts.push(`<h3 class="section-subtitle">Epikriz va tekshiruvlar</h3>`);
    }
    parts.push(
      `<div class="flow-list">${textItems.map((item) => renderSectionCardHtml(item, 'text')).join('')}</div>`,
    );
  }
  if (specialistItems.length > 0) {
    if (labItems.length > 0 || textItems.length > 0) {
      parts.push(`<h3 class="section-subtitle">Tor mutaxassis xulosalari</h3>`);
    }
    parts.push(
      `<div class="flow-list">${specialistItems.map((item) => renderSectionCardHtml(item, 'specialist')).join('')}</div>`,
    );
  }
  return parts.join('');
}

export async function buildClinicalPrintHtml(
  input: ClinicalPrintDocumentInput,
): Promise<string> {
  const logoUrl = absoluteAssetUrl(CLINICAL_PRINT_LOGO_PATH);
  const qrPayload =
    input.qrValue?.trim() ||
    [
      CLINICAL_PRINT_CLINIC_NAME_LINES.join(' '),
      `Manzil: ${CLINICAL_PRINT_ADDRESS}`,
      `Tel: ${CLINICAL_PRINT_PHONES}`,
      input.patientName ? `Bemor: ${input.patientName}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  const qrDataUrl = await buildQrDataUrl(qrPayload);
  const printedAt = formatPrintDate(input.printedAt);
  const [line1, line2] = CLINICAL_PRINT_CLINIC_NAME_LINES;
  const c = CLINICAL_PRINT_COLORS;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.documentTitle)} — ${escapeHtml(input.patientName)}</title>
  <style>
    @page { size: A4; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: ${c.text};
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      background: #fff;
      font-size: 11px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      width: 100%;
      max-width: 186mm;
      margin: 0 auto;
      padding: 0;
    }

    /* —— Header —— */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${c.bar};
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .brand img {
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    .brand-text .name {
      margin: 0;
      color: ${c.bar};
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.06em;
      line-height: 1.05;
    }
    .brand-text .sub {
      margin: 2px 0 0;
      color: ${c.brand};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .qr-wrap {
      text-align: center;
      flex-shrink: 0;
    }
    .qr-wrap img {
      width: 48px;
      height: 48px;
      display: block;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }

    .info-bar {
      margin-top: 0;
      background: linear-gradient(90deg, ${c.bar} 0%, #123a7a 100%);
      color: #fff;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 10px;
      font-size: 8.5px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      line-height: 1.35;
    }
    .info-bar span { display: block; }

    .meta-row {
      margin: 8px 0 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 18px;
      padding: 7px 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 11px;
      line-height: 1.35;
    }
    .meta-row strong {
      font-weight: 700;
      color: ${c.bar};
    }

    .doc-title {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 800;
      color: ${c.bar};
      letter-spacing: 0.01em;
      padding-bottom: 4px;
      border-bottom: 2px solid ${c.brand};
    }

    .results { margin: 0; }

    /* —— Lab table —— */
    .lab-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin: 0 0 6px;
    }
    .lab-table th,
    .lab-table td {
      border: 1px solid #dbe3ef;
      padding: 5px 7px;
      vertical-align: top;
      text-align: left;
    }
    .lab-table thead th {
      background: ${c.bar};
      color: #fff;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .lab-table .num {
      width: 28px;
      text-align: center;
      color: ${c.muted};
    }
    .lab-table .value {
      font-weight: 700;
      color: #0f766e;
      white-space: pre-wrap;
    }
    .lab-table .meta-cell {
      font-size: 10px;
      color: ${c.muted};
      min-width: 90px;
    }
    .lab-name { font-weight: 600; color: ${c.text}; }
    .lab-cat { margin-top: 1px; font-size: 9.5px; color: ${c.muted}; }

    .section-subtitle {
      margin: 8px 0 4px;
      font-size: 11px;
      font-weight: 800;
      color: ${c.bar};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* —— Continuous flow sections (no forced page breaks) —— */
    .flow-list { display: block; }
    .section-block {
      margin: 0 0 6px;
      padding: 7px 9px;
      border: 1px solid #e2e8f0;
      border-left: 3px solid ${c.brand};
      border-radius: 0 6px 6px 0;
      background: #fff;
      break-inside: auto;
      page-break-inside: auto;
    }
    .section-block.specialist {
      border-left-color: #6366f1;
      background: #fafbff;
    }
    .section-head h3 {
      margin: 0;
      font-size: 11.5px;
      font-weight: 800;
      color: ${c.bar};
      line-height: 1.3;
    }
    .section-head .subtitle {
      margin: 1px 0 0;
      font-size: 9.5px;
      color: ${c.muted};
    }
    .section-block .body {
      margin-top: 5px;
      font-size: 10.5px;
      line-height: 1.45;
      white-space: pre-wrap;
      color: ${c.text};
    }
    .section-block .meta {
      margin: 4px 0 0;
      font-size: 9px;
      color: ${c.muted};
    }

    .field-grid {
      margin-top: 5px;
      display: block;
    }
    .field-row {
      display: grid;
      grid-template-columns: 38% 1fr;
      gap: 6px 10px;
      padding: 3px 0;
      border-bottom: 1px solid #f1f5f9;
      break-inside: auto;
      page-break-inside: auto;
    }
    .field-row:last-child { border-bottom: 0; }
    .field-label {
      font-size: 9.5px;
      font-weight: 700;
      color: ${c.muted};
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 1.35;
      padding-top: 1px;
    }
    .field-value {
      font-size: 10.5px;
      line-height: 1.45;
      color: ${c.text};
      white-space: pre-wrap;
    }

    .empty { color: ${c.muted}; font-size: 11px; margin: 4px 0; }

    /* Lab conclusion — flows with content, no orphan page gap */
    .lab-conclusion {
      margin: 6px 0 0;
      padding: 7px 9px;
      border: 1px solid #fde68a;
      border-left: 3px solid #d97706;
      border-radius: 0 6px 6px 0;
      background: #fffbeb;
      break-inside: auto;
      page-break-inside: auto;
      page-break-before: auto;
    }
    .lab-conclusion h3 {
      margin: 0 0 3px;
      font-size: 10.5px;
      font-weight: 800;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .lab-conclusion p {
      margin: 0;
      font-size: 10.5px;
      line-height: 1.45;
      white-space: pre-wrap;
      color: ${c.text};
    }

    .footer-note {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #cbd5e1;
      font-size: 9.5px;
      color: ${c.muted};
      display: flex;
      justify-content: space-between;
      gap: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    @media print {
      html, body { margin: 0 !important; padding: 0 !important; }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print { display: none !important; }
      .sheet { margin: 0 !important; padding: 0 !important; max-width: none; }
      .section-block,
      .lab-conclusion,
      .field-row,
      .lab-table tr {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="header">
      <div class="brand">
        <img src="${escapeHtml(logoUrl)}" alt="Gormonik logo" />
        <div class="brand-text">
          <p class="name">${escapeHtml(line1)}</p>
          <p class="sub">${escapeHtml(line2)}</p>
        </div>
      </div>
      <div class="qr-wrap">
        ${
          qrDataUrl ?
            `<img src="${qrDataUrl}" alt="QR kod" />`
          : `<div style="width:48px;height:48px;border:1px solid #e2e8f0;border-radius:4px"></div>`
        }
      </div>
    </header>

    <div class="info-bar">
      <span>MANZIL: ${escapeHtml(CLINICAL_PRINT_ADDRESS)}</span>
      <span>MUROJAAT UCHUN: ${escapeHtml(CLINICAL_PRINT_PHONES)}</span>
    </div>

    <div class="meta-row">
      <div><strong>Bemor:</strong> ${escapeHtml(input.patientName)}</div>
      ${
        input.diseaseType ?
          `<div><strong>Kasallik turi:</strong> ${escapeHtml(input.diseaseType)}</div>`
        : ''
      }
      ${printedAt ? `<div><strong>Chop etilgan:</strong> ${escapeHtml(printedAt)}</div>` : ''}
    </div>

    <h2 class="doc-title">${escapeHtml(input.documentTitle)}</h2>
    <div class="results">
      ${renderItemsHtml(input.items)}
    </div>
    ${
      input.labConclusion?.trim() ?
        `<section class="lab-conclusion">
          <h3>Laboratoriya xulosasi (shifokor)</h3>
          <p>${escapeHtml(input.labConclusion.trim()).replace(/\n/g, '<br/>')}</p>
        </section>`
      : ''
    }

    <div class="footer-note">
      <span>${escapeHtml(CLINICAL_PRINT_CLINIC_NAME_LINES.join(' '))}</span>
      <span>Shifokor imzosi: ________________</span>
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;
}

function printHtmlViaHiddenIframe(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Chop etish');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const cleanup = () => {
      try {
        iframe.remove();
      } catch {
        /* ignore */
      }
    };

    const frameWindow = iframe.contentWindow;
    const frameDoc = iframe.contentDocument || frameWindow?.document;
    if (!frameWindow || !frameDoc) {
      cleanup();
      reject(new Error('Chop etish iframe ochilmadi'));
      return;
    }

    frameDoc.open();
    frameDoc.write(html.replace(/window\.print\(\);?/g, ''));
    frameDoc.close();

    const runPrint = () => {
      try {
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(cleanup, 1500);
        resolve();
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error('Chop etishda xatolik'));
      }
    };

    window.setTimeout(runPrint, 350);
  });
}

export async function printClinicalDocument(
  input: ClinicalPrintDocumentInput,
): Promise<void> {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=900,height=1100');

  if (printWindow) {
    try {
      printWindow.document.open();
      printWindow.document.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Chop etish…</title></head><body style="font-family:sans-serif;padding:24px;color:#475569">Blank tayyorlanmoqda…</body></html>`,
      );
      printWindow.document.close();
    } catch {
      /* ignore */
    }

    try {
      const html = await buildClinicalPrintHtml(input);
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      try {
        printWindow.opener = null;
      } catch {
        /* ignore */
      }
      return;
    } catch (error) {
      try {
        printWindow.close();
      } catch {
        /* ignore */
      }
      throw error;
    }
  }

  const html = await buildClinicalPrintHtml(input);
  await printHtmlViaHiddenIframe(html);
}

function safeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'natija';
}

/** Word ochib tahrirlash uchun .doc (HTML Word format) yuklab olish */
export async function downloadClinicalDocumentAsWord(
  input: ClinicalPrintDocumentInput,
): Promise<void> {
  if (typeof window === 'undefined') return;
  const html = await buildClinicalPrintHtml({
    ...input,
  });
  const wordHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(
      '<html lang="uz">',
      `<html lang="uz" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">`,
    );

  const blob = new Blob(['\ufeff', wordHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${safeFileName(input.patientName)}_${safeFileName(input.documentTitle)}_${stamp}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
