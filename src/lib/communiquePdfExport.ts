import jsPDF from 'jspdf';
import type { Communique } from './communiqueStore';
import { loadLogoDataUrl } from './metrologyPdfHelpers';
import { COMMUNIQUE_FOOTER, COMMUNIQUE_SUBTITLE, DEFAULT_CLOSING, KIND_CONFIG, TextSegment, cleanCommuniqueForExport, communiqueFileName, splitBold } from './communiqueShared';
import { LoadedImage, formatLongDate, loadClaimImages } from './supplierClaimShared';

/**
 * Genera el comunicado o procedimiento en PDF con la misma plantilla que el
 * Word: encabezado con logo, título y datos De / Para / Asunto, fecha,
 * introducción, instrucciones numeradas, imágenes con su pie, cierre, firmas
 * y pie de página. Se arma en el navegador: no requiere sesión del CRM.
 */

const MARGIN = 20;
const BODY_TOP = 58;
const BOTTOM_LIMIT = 262;
const LINE_H = 4.8;
const TEXT_SIZE = 10;
const MAX_IMAGE_W = 120;
const MAX_IMAGE_H = 90;

class CommuniqueWriter {
  y = BODY_TOP;
  readonly contentW: number;

  constructor(private doc: jsPDF, private logo: string | null, private c: Communique) {
    this.contentW = doc.internal.pageSize.getWidth() - MARGIN * 2;
    this.drawPageFrame();
  }

  /** Encabezado (logo, título, De, Para, Asunto) y pie de página; se repite en cada hoja. */
  private drawPageFrame() {
    const { doc, c } = this;
    const logoW = 52;
    const top = 10;
    const titleH = 15;
    const rowH = 8.5;
    const rightX = MARGIN + logoW;
    const rightW = this.contentW - logoW;

    doc.setDrawColor(0, 0, 0).setLineWidth(0.3);
    doc.rect(MARGIN, top, logoW, titleH + rowH * 3);
    doc.rect(rightX, top, rightW, titleH);
    [c.de, c.para, c.asunto].forEach((_, i) => doc.rect(rightX, top + titleH + rowH * i, rightW, rowH));

    if (this.logo) {
      try {
        doc.addImage(this.logo, 'PNG', MARGIN + 4, top + 5, logoW - 8, titleH + rowH * 3 - 10);
      } catch {
        doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(0, 51, 102).text('ALCO S.A.S', MARGIN + 6, top + 20);
      }
    }

    doc.setTextColor(0, 0, 0).setFont('helvetica', 'bold').setFontSize(11);
    doc.text(KIND_CONFIG[c.tipo].title, rightX + rightW / 2, top + 6.2, { align: 'center' });
    doc.text(COMMUNIQUE_SUBTITLE, rightX + rightW / 2, top + 11.6, { align: 'center' });
    [['DE:', c.de], ['PARA:', c.para], ['ASUNTO:', c.asunto]].forEach(([label, value], i) => {
      const baseline = top + titleH + rowH * i + 5.7;
      doc.setFont('helvetica', 'bold').setFontSize(9.5).text(label, rightX + 3, baseline);
      doc.setFont('helvetica', 'normal').text(doc.splitTextToSize(value, rightW - 24)[0], rightX + 3 + doc.getTextWidth(label) + 2, baseline);
    });

    doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(40, 40, 40).text(COMMUNIQUE_FOOTER, MARGIN, 272);
    doc.setTextColor(20, 20, 20);
    this.y = BODY_TOP;
  }

  ensureSpace(height: number) {
    if (this.y + height <= BOTTOM_LIMIT) return;
    this.doc.addPage();
    this.drawPageFrame();
  }

  gap(mm: number) {
    this.y += mm;
  }

  rightAlignedBold(text: string) {
    this.doc.setFont('helvetica', 'bold').setFontSize(TEXT_SIZE).text(text, MARGIN + this.contentW, this.y, { align: 'right' });
    this.y += 9;
  }

  /** Ancho de una palabra formada por tramos normales y en negrita (la puntuación pegada a una negrita no lleva espacio). */
  private wordWidth(word: TextSegment[], withSpace: boolean): number {
    const width = word.reduce((sum, seg) => sum + this.doc.setFont('helvetica', seg.bold ? 'bold' : 'normal').setFontSize(TEXT_SIZE).getTextWidth(seg.text), 0);
    return width + (withSpace ? this.doc.setFont('helvetica', 'normal').getTextWidth(' ') : 0);
  }

  /** Párrafo con **negritas** en línea: reparte las palabras en líneas según su ancho real. */
  richParagraph(text: string, opts: { bold?: boolean; indent?: number; after?: number } = {}) {
    const { doc } = this;
    const indent = opts.indent ?? 0;
    const maxW = this.contentW - indent;
    const words: TextSegment[][] = [];
    let current: TextSegment[] = [];
    splitBold(text).forEach(seg => {
      seg.text.split(/(\s+)/).forEach(piece => {
        if (/^\s+$/.test(piece)) {
          if (current.length) words.push(current);
          current = [];
        } else if (piece) current.push({ text: piece, bold: Boolean(opts.bold) || seg.bold });
      });
    });
    if (current.length) words.push(current);

    const lines: TextSegment[][][] = [[]];
    let lineW = 0;
    words.forEach(word => {
      const wordW = this.wordWidth(word, true);
      if (lineW + wordW > maxW && lines[lines.length - 1].length > 0) {
        lines.push([]);
        lineW = 0;
      }
      lines[lines.length - 1].push(word);
      lineW += wordW;
    });

    lines.forEach(line => {
      this.ensureSpace(LINE_H);
      let x = MARGIN + indent;
      line.forEach(word => {
        word.forEach(seg => {
          doc.setFont('helvetica', seg.bold ? 'bold' : 'normal').setFontSize(TEXT_SIZE).text(seg.text, x, this.y);
          x += doc.getTextWidth(seg.text);
        });
        x += doc.setFont('helvetica', 'normal').getTextWidth(' ');
      });
      this.y += LINE_H;
    });
    this.y += opts.after ?? 3;
  }

  steps() {
    const { c } = this;
    if (c.pasos.length === 0) return;
    this.ensureSpace(20);
    this.richParagraph(KIND_CONFIG[c.tipo].stepsHeading, { bold: true, after: 3 });
    c.pasos.forEach((step, i) => {
      this.ensureSpace(LINE_H * 3);
      this.richParagraph(`${i + 1}) ${step.titulo}`, { bold: true, after: 1 });
      this.richParagraph(step.detalle, { indent: 6, after: 3 });
    });
  }

  /** Cada imagen centrada, con su pie en negrita debajo. */
  images(images: LoadedImage[]) {
    images.forEach(img => {
      const scale = Math.min(MAX_IMAGE_W / img.w, MAX_IMAGE_H / img.h);
      const w = img.w * scale;
      const h = img.h * scale;
      const captionLines = img.caption ? this.doc.setFont('helvetica', 'bold').setFontSize(9.5).splitTextToSize(img.caption, this.contentW - 20) : [];
      this.ensureSpace(h + captionLines.length * 4.5 + 8);
      try {
        this.doc.addImage(img.dataUrl, img.format, MARGIN + (this.contentW - w) / 2, this.y, w, h);
      } catch {
        /* imagen ilegible: se omite sin romper el documento */
      }
      this.y += h + 4;
      this.doc.setFont('helvetica', 'bold').setFontSize(9.5);
      captionLines.forEach((line: string) => {
        this.doc.text(line, MARGIN + this.contentW / 2, this.y, { align: 'center' });
        this.y += 4.5;
      });
      this.y += 5;
    });
  }

  /** Firmas en filas de 2, con la línea de firma (X) y debajo nombre y cargo. */
  signatures() {
    const colW = this.contentW / 2;
    const lineW = colW - 12;
    for (let i = 0; i < this.c.firmantes.length; i += 2) {
      this.ensureSpace(24);
      this.c.firmantes.slice(i, i + 2).forEach((signer, col) => {
        const x = MARGIN + col * colW;
        this.doc.setDrawColor(0, 0, 0).setLineWidth(0.4).line(x, this.y + 8, x + lineW, this.y + 8);
        this.doc.setFont('helvetica', 'normal').setFontSize(14).text('X', x + 1, this.y + 6.5);
        this.doc.setFontSize(8).text(signer.nombre, x + 1, this.y + 12).text(signer.cargo, x + 1, this.y + 16);
      });
      this.y += 24;
    }
  }
}

export async function buildCommuniquePdf(rawCommunique: Communique): Promise<jsPDF> {
  const c = cleanCommuniqueForExport(rawCommunique);
  const [logo, images] = await Promise.all([loadLogoDataUrl(), loadClaimImages(c.fotoPaths, c.fotoMeta)]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const w = new CommuniqueWriter(doc, logo, c);

  w.rightAlignedBold(`Sabaneta, ${formatLongDate(c.fecha)}`);
  if (c.intro) c.intro.split(/\n\s*\n/).forEach(block => w.richParagraph(block.replace(/\n/g, ' ').trim()));
  w.steps();
  w.images(images);
  w.gap(3);
  w.richParagraph(c.cierre || DEFAULT_CLOSING, { after: 6 });
  w.ensureSpace(34);
  w.richParagraph('Atentamente,', { after: 4 });
  w.signatures();
  return doc;
}

export async function exportCommuniqueToPDF(communique: Communique): Promise<void> {
  const doc = await buildCommuniquePdf(communique);
  doc.save(communiqueFileName(communique, 'pdf'));
}
