import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MetrologyDelivery } from './metrologyDeliveriesStore';

const BRAND_COLOR: [number, number, number] = [0, 51, 102];
const DARK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const LIGHT_BG: [number, number, number] = [241, 245, 249];
const SUCCESS: [number, number, number] = [5, 150, 105];

function loadLogoDataUrl(): Promise<string | null> {
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

function addHeader(doc: jsPDF, title: string, subtitle: string, docId: string, logoDataUrl: string | null) {
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

function addSectionLabel(doc: jsPDF, label: string, y: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(14, y, pageW - 28, 7, 1, 1, 'F');
  doc.setTextColor(...BRAND_COLOR);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(label.toUpperCase(), 17, y + 5);
  return y + 12;
}

function addInfoGrid(doc: jsPDF, fields: { label: string; value: string }[], startY: number, cols = 3): number {
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

function addSignature(doc: jsPDF, label: string, sigData: string | null, x: number, y: number, w: number) {
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

/** Exporta un acta de entrega de Metrología Pro a PDF — se genera en el navegador, no requiere sesión del CRM. */
export async function exportMetrologyDeliveryToPDF(record: MetrologyDelivery): Promise<void> {
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  addHeader(doc, 'ACTA DE ENTREGA DE EQUIPOS', 'Gestión de Herramientas y Activos · Metrología Pro', record.id.slice(0, 8).toUpperCase(), logoDataUrl);

  let y = 52;
  y = addSectionLabel(doc, '1. Datos Generales', y);
  y = addInfoGrid(doc, [
    { label: 'Fecha', value: record.fecha },
    { label: 'Área', value: record.area },
    { label: 'Sede', value: record.sede }
  ], y, 3);

  y += 4;
  y = addSectionLabel(doc, '2. Datos del Receptor', y);
  y = addInfoGrid(doc, [
    { label: 'Nombre y Apellidos', value: record.receptorNombre },
    { label: 'Cédula', value: record.receptorCedula },
    { label: 'Cargo', value: record.receptorCargo || '' }
  ], y, 3);

  y += 4;
  y = addSectionLabel(doc, '3. Equipos / Herramientas Entregadas', y);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Equipo / Herramienta', 'Marca', 'Cant.', 'Observaciones']],
    body: record.items.map((item, i) => {
      const nameWithDetails = [
        item.equipoNombre,
        item.codigo ? `(Cód: ${item.codigo})` : '',
        item.longitud ? `[Long: ${item.longitud}]` : ''
      ].filter(Boolean).join(' ');
      return [String(i + 1), nameWithDetails, item.marca, String(item.cantidad), item.observaciones];
    }),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, font: 'helvetica', textColor: DARK },
    headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { cellWidth: 8 }, 3: { cellWidth: 12, halign: 'center' } },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 230) { doc.addPage(); y = 20; }

  y = addSectionLabel(doc, '4. Firmas del Acta', y);
  const pageW = doc.internal.pageSize.getWidth();
  const sigW = (pageW - 28 - 10) / 2;
  addSignature(doc, 'Firma quien entrega (Gestor SGC)', record.firmaEntrega, 14, y, sigW);
  addSignature(doc, 'Firma quien recibe (Colaborador)', record.firmaRecibe, 14 + sigW + 10, y, sigW);

  doc.save(`Acta-Entrega-${record.receptorNombre.replace(/\s+/g, '-')}-${record.fecha}.pdf`);
}
