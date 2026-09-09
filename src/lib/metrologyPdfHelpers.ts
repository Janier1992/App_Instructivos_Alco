import jsPDF from 'jspdf';

export const BRAND_COLOR: [number, number, number] = [0, 51, 102];
export const DARK: [number, number, number] = [15, 23, 42];
export const MUTED: [number, number, number] = [100, 116, 139];
export const LIGHT_BG: [number, number, number] = [241, 245, 249];
export const SUCCESS: [number, number, number] = [5, 150, 105];

/** Carga /logo-alco.png y lo convierte a un data URL para insertarlo en el PDF (jsPDF no puede pedir URLs remotas). */
export function loadLogoDataUrl(): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/logo-alco.png';
  });
}

export function addPdfHeader(doc: jsPDF, title: string, subtitle: string, docId: string, logoDataUrl: string | null) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageW, 22, 'F');

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 14, 3, 35, 16);
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ALCO S.A.S', 14, 13);
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ALCO S.A.S', 14, 13);
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Sistema de Gestión de Calidad · SGC', pageW - 14, 13, { align: 'right' });

  doc.setTextColor(...DARK);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(subtitle, 14, 40);

  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.5);
  doc.line(14, 44, pageW - 14, 44);

  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`ID: ${docId}`, pageW - 14, 40, { align: 'right' });
}

export function addPdfSectionLabel(doc: jsPDF, label: string, y: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(14, y, pageW - 28, 7, 1, 1, 'F');
  doc.setTextColor(...BRAND_COLOR);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(label.toUpperCase(), 17, y + 5);
  return y + 12;
}

export function addPdfInfoGrid(doc: jsPDF, fields: { label: string; value: string }[], startY: number, cols = 3): number {
  const pageW = doc.internal.pageSize.getWidth();
  const colW = (pageW - 28) / cols;
  let row = 0;
  let col = 0;
  let maxY = startY;

  fields.forEach(({ label, value }) => {
    const x = 14 + col * colW;
    const y = startY + row * 18;

    doc.setTextColor(...MUTED);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), x, y);

    doc.setTextColor(...DARK);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value || '—', colW - 4);
    doc.text(lines, x, y + 4.5);

    maxY = Math.max(maxY, y + 4.5 + lines.length * 4);

    col++;
    if (col >= cols) { col = 0; row++; }
  });

  return maxY + 6;
}

export function addPdfSignature(doc: jsPDF, label: string, sigData: string | null, x: number, y: number, w: number) {
  const h = 28;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2);

  doc.setTextColor(...MUTED);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(label.toUpperCase(), x + 3, y + 5);

  if (sigData && sigData.startsWith('data:')) {
    try {
      doc.addImage(sigData, 'PNG', x + 2, y + 7, w - 4, h - 10);
    } catch {
      doc.setTextColor(...SUCCESS);
      doc.setFontSize(7);
      doc.text('✓ Firmado digitalmente', x + 4, y + h / 2 + 2);
    }
  } else {
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(7);
    doc.text('Sin firma', x + 4, y + h / 2 + 2);
  }
}
