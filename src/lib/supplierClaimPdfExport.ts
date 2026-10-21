import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SupplierClaim } from './supplierClaimsStore';
import { loadLogoDataUrl } from './metrologyPdfHelpers';
import {
  DOC_DATE,
  DOC_VERSION,
  FOLLOW_UP,
  INTRO,
  NAVY_RGB as NAVY,
  LoadedImage,
  cleanClaimForExport,
  defectLine,
  formatLongDate,
  loadClaimImages,
  rejectIntro,
  safeFileName
} from './supplierClaimShared';

/**
 * Genera el "Informe Calidad Abastecimiento — No Conformidades Proveedor"
 * con la misma plantilla oficial de Alco (encabezado con logo, datos del
 * proveedor, barras azules por sección, fotos, tabla de rechazo, seguimiento
 * y firma). Se arma en el navegador: no requiere sesión del CRM.
 */

const BORDER: [number, number, number] = [150, 150, 150];
const MARGIN = 15;
const BODY_TOP = 44;
const BOTTOM_LIMIT = 280;
const LINE_H = 4.7;

class ReportWriter {
  y = BODY_TOP;
  readonly contentW: number;

  constructor(private doc: jsPDF, private logo: string | null, private proveedor: string) {
    this.contentW = doc.internal.pageSize.getWidth() - MARGIN * 2;
    this.drawHeader();
  }

  private drawHeader() {
    const { doc } = this;
    const logoW = 52;
    const versionW = 46;
    const titleW = this.contentW - logoW - versionW;
    const top = 10;
    const rowH = 13;

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, top, logoW, rowH * 2);
    doc.rect(MARGIN + logoW, top, titleW, rowH);
    doc.rect(MARGIN + logoW, top + rowH, titleW, rowH);
    doc.rect(MARGIN + logoW + titleW, top, versionW, rowH);
    doc.rect(MARGIN + logoW + titleW, top + rowH, versionW, rowH);

    if (this.logo) {
      try {
        doc.addImage(this.logo, 'PNG', MARGIN + 4, top + 3, logoW - 8, rowH * 2 - 6);
      } catch {
        doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(0, 51, 102).text('ALCO S.A.S', MARGIN + 6, top + 16);
      }
    }

    doc.setTextColor(20, 20, 20).setFont('helvetica', 'bold').setFontSize(7.5);
    const title = doc.splitTextToSize(`INFORME CALIDAD ABASTECIMIENTO NO CONFORMIDADES PROVEEDOR ${this.proveedor}`, titleW - 4);
    doc.text(title, MARGIN + logoW + titleW / 2, top + 5.5, { align: 'center' });
    doc.setFontSize(7.5).text('GESTIÓN CALIDAD', MARGIN + logoW + titleW / 2, top + rowH + 7.5, { align: 'center' });

    const vx = MARGIN + logoW + titleW + 2.5;
    doc.setFontSize(7.5).text('VERSIÓN:', vx, top + 8).text('FECHA:', vx, top + rowH + 8);
    doc.setFont('helvetica', 'normal').text(DOC_VERSION, vx + 14, top + 8).text(DOC_DATE, vx + 11, top + rowH + 8);
    this.y = BODY_TOP;
  }

  ensureSpace(height: number) {
    if (this.y + height <= BOTTOM_LIMIT) return;
    this.doc.addPage();
    this.drawHeader();
  }

  gap(mm: number) {
    this.y += mm;
  }

  rightAlignedBold(text: string) {
    this.doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(20, 20, 20);
    this.doc.text(text, MARGIN + this.contentW, this.y, { align: 'right' });
    this.y += 7;
  }

  infoTable(rows: [string, string][]) {
    const labelW = this.contentW * 0.42;
    const rowH = 8;
    this.ensureSpace(rows.length * rowH);
    this.doc.setDrawColor(...BORDER).setLineWidth(0.2);
    rows.forEach(([label, value]) => {
      this.doc.rect(MARGIN, this.y, labelW, rowH).rect(MARGIN + labelW, this.y, this.contentW - labelW, rowH);
      this.doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(20, 20, 20).text(label, MARGIN + 3, this.y + 5.5);
      this.doc.setFont('helvetica', 'normal').text(this.doc.splitTextToSize(value || 'No indicado', this.contentW - labelW - 6)[0], MARGIN + labelW + 3, this.y + 5.5);
      this.y += rowH;
    });
    this.y += 5;
  }

  sectionBar(title: string) {
    this.ensureSpace(20);
    this.doc.setFillColor(...NAVY).rect(MARGIN, this.y, this.contentW, 8, 'F');
    this.doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(255, 255, 255).text(title, MARGIN + 3, this.y + 5.6);
    this.y += 12;
  }

  /** Dibuja una línea repartiendo el espacio sobrante entre las palabras (texto justificado). */
  private justifiedLine(line: string, x: number, width: number, justify: boolean) {
    const words = line.split(' ').filter(Boolean);
    if (!justify || words.length < 2) {
      this.doc.text(line, x, this.y);
      return;
    }
    const wordsWidth = words.reduce((acc, w) => acc + this.doc.getTextWidth(w), 0);
    const space = (width - wordsWidth) / (words.length - 1);
    let cursor = x;
    words.forEach(word => {
      this.doc.text(word, cursor, this.y);
      cursor += this.doc.getTextWidth(word) + space;
    });
  }

  private bodyFont(bold = false) {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(10).setTextColor(20, 20, 20);
  }

  paragraph(text: string, bold = false, justify = true) {
    text.split(/\n\s*\n/).forEach(block => {
      this.bodyFont(bold);
      const lines = this.doc.splitTextToSize(block.replace(/\n/g, ' ').trim(), this.contentW) as string[];
      lines.forEach((line, idx) => {
        this.ensureSpace(LINE_H + 1);
        this.bodyFont(bold);
        this.justifiedLine(line, MARGIN, this.contentW, justify && idx < lines.length - 1);
        this.y += LINE_H;
      });
      this.y += 2.5;
    });
  }

  /** Viñeta justificada, con título en negrita opcional ("Título: detalle"). */
  bullet(detail: string, title?: string) {
    const indent = 7;
    const width = this.contentW - indent;
    const head = title ? `${title}: ` : '';
    this.bodyFont(true);
    const headW = head ? this.doc.getTextWidth(head) : 0;
    this.bodyFont();
    const words = detail.split(/\s+/).filter(Boolean);

    // La primera línea comparte renglón con el título; el resto usa el ancho completo.
    const lines: { text: string; width: number }[] = [];
    let current = '';
    let currentWidth = width - headW;
    words.forEach(word => {
      const candidate = current ? `${current} ${word}` : word;
      if (this.doc.getTextWidth(candidate) <= currentWidth || !current) {
        current = candidate;
      } else {
        lines.push({ text: current, width: currentWidth });
        current = word;
        currentWidth = width;
      }
    });
    if (current) lines.push({ text: current, width: currentWidth });

    lines.forEach((line, idx) => {
      this.ensureSpace(LINE_H + 1);
      this.bodyFont();
      if (idx === 0) this.doc.text('•', MARGIN + 2.5, this.y);
      const x = MARGIN + indent + (idx === 0 ? headW : 0);
      if (idx === 0 && head) {
        this.bodyFont(true);
        this.doc.text(head, MARGIN + indent, this.y);
        this.bodyFont();
      }
      this.justifiedLine(line.text, x, line.width, idx < lines.length - 1);
      this.y += LINE_H;
    });
    this.y += 1.5;
  }

  /** Fotos en filas de hasta 2, conservando proporción. */
  images(images: LoadedImage[]) {
    const gap = 3;
    const perRow = images.length === 1 ? 1 : 2;
    const maxH = 80;
    const cellW = perRow === 1 ? this.contentW * 0.6 : (this.contentW - gap) / 2;

    for (let i = 0; i < images.length; i += perRow) {
      const row = images.slice(i, i + perRow);
      const sizes = row.map(img => {
        const scale = Math.min(cellW / img.w, maxH / img.h);
        return { w: img.w * scale, h: img.h * scale };
      });
      const rowH = Math.max(...sizes.map(s => s.h));
      this.ensureSpace(rowH + 4);
      const totalW = sizes.reduce((acc, s) => acc + s.w, 0) + gap * (row.length - 1);
      let x = MARGIN + (this.contentW - totalW) / 2;
      row.forEach((img, idx) => {
        try {
          this.doc.addImage(img.dataUrl, img.format, x, this.y, sizes[idx].w, sizes[idx].h);
          this.doc.setDrawColor(91, 155, 213).setLineWidth(0.3).rect(x, this.y, sizes[idx].w, sizes[idx].h);
        } catch {
          /* imagen ilegible: se omite sin romper el informe */
        }
        x += sizes[idx].w + gap;
      });
      this.y += rowH + 4;
    }
  }

  rejectTable(items: SupplierClaim['rechazoItems']) {
    this.ensureSpace(14 + items.length * 8);
    autoTable(this.doc, {
      startY: this.y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Cantidad de perfiles', 'Acabado', 'Medida (mm)']],
      body: items.map(i => [String(i.cantidad), i.acabado, i.medidaMm]),
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2, textColor: [20, 20, 20], lineColor: [190, 190, 190] },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' }
    });
    this.y = (this.doc as any).lastAutoTable.finalY + 6;
  }

  signature(name: string, role: string) {
    this.ensureSpace(24);
    const w = 90;
    const x = MARGIN + this.contentW - w;
    const labelW = 22;
    this.doc.setDrawColor(20, 20, 20).setLineWidth(0.3);
    this.doc.rect(x + labelW, this.y, w - labelW, 6);
    this.doc.rect(x, this.y + 6, labelW, 6).rect(x + labelW, this.y + 6, w - labelW, 6);
    this.doc.rect(x, this.y + 12, labelW, 6).rect(x + labelW, this.y + 12, w - labelW, 6);
    this.doc.setFont('helvetica', 'bold').setFontSize(11).text('REALIZÓ', x + labelW + (w - labelW) / 2, this.y + 4.5, { align: 'center' });
    this.doc.setFont('helvetica', 'normal').setFontSize(10);
    this.doc.text('Nombre:', x + 1.5, this.y + 10.5).text('Cargo:', x + 1.5, this.y + 16.5);
    this.doc.text(name, x + labelW + (w - labelW) / 2, this.y + 10.5, { align: 'center' });
    this.doc.text(role, x + labelW + (w - labelW) / 2, this.y + 16.5, { align: 'center' });
    this.y += 20;
  }
}

export async function buildSupplierClaimPdf(rawClaim: SupplierClaim): Promise<jsPDF> {
  const claim = cleanClaimForExport(rawClaim);
  const [logo, etiquetaImgs, defectoImgs] = await Promise.all([
    loadLogoDataUrl(),
    loadClaimImages(claim.fotoEtiquetaPaths),
    loadClaimImages(claim.fotoDefectoPaths)
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = new ReportWriter(doc, logo, claim.proveedor);

  w.rightAlignedBold(`Sabaneta, ${formatLongDate(claim.fechaInforme)}`);
  w.infoTable([
    ['PROVEEDOR:', claim.proveedor],
    ['MATERIA PRIMA / INSUMO:', claim.materiaPrima],
    ['REFERENCIA(S):', claim.referencias],
    ['NÚMERO(S) DE LOTE:', claim.lotes || 'No indicado']
  ]);
  w.paragraph(INTRO);

  w.sectionBar('TRAZABILIDAD');
  w.paragraph(etiquetaImgs.length > 0 ? 'Adjunto imágenes de la etiqueta del material recibido.' : 'No se adjuntó imagen de la etiqueta del material recibido.');
  w.images(etiquetaImgs);

  w.sectionBar('DESCRIPCIÓN DE LA NO CONFORMIDAD O ANOMALÍA');
  w.paragraph(defectLine(claim), true, false);
  w.paragraph(claim.descripcionNc || claim.observacionInspector);
  if (claim.observacionesTecnicas.length > 0) {
    w.paragraph('Observaciones técnicas:', true, false);
    claim.observacionesTecnicas.forEach(o => w.bullet(o));
  }
  w.images(defectoImgs);

  if (claim.rechazoItems.length > 0) {
    const total = claim.rechazoItems.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);
    w.sectionBar('ACCIONES INMEDIATAS');
    w.paragraph(rejectIntro(total));
    w.rejectTable(claim.rechazoItems);
  }

  if (claim.accionesCorrectivas.length > 0) {
    w.sectionBar('ACCIONES CORRECTIVAS SOLICITADAS AL PROVEEDOR');
    claim.accionesCorrectivas.forEach(a => w.bullet(a.detalle, a.titulo));
  }

  w.gap(2);
  w.sectionBar('SEGUIMIENTO');
  w.paragraph(FOLLOW_UP(claim.proveedor));
  w.gap(8);
  w.signature(claim.realizadoPor, claim.cargo || '');
  return doc;
}

export async function exportSupplierClaimToPDF(claim: SupplierClaim): Promise<void> {
  const doc = await buildSupplierClaimPdf(claim);
  doc.save(safeFileName(claim, 'pdf'));
}
