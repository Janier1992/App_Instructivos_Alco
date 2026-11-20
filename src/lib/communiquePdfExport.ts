import jsPDF from 'jspdf';
import type { Communique } from './communiqueStore';
import { loadLogoDataUrl } from './metrologyPdfHelpers';
import { COMMUNIQUE_FOOTER, COMMUNIQUE_SUBTITLE, DEFAULT_CLOSING, KIND_CONFIG, TextSegment, cleanCommuniqueForExport, communiqueFileName, pngSize, signatureDateLabel, splitBold } from './communiqueShared';
import { LoadedImage, dataUrlToBytes, formatLongDate, loadClaimImages } from './supplierClaimShared';

/**
 * Genera el comunicado o procedimiento en PDF con la misma plantilla que el
 * Word: encabezado con logo, título y datos De / Para / Asunto, fecha,
 * introducción, instrucciones numeradas, imágenes con su pie, cierre, firmas
 * y pie de página. Se arma en el navegador: no requiere sesión del CRM.
 */

const MARGIN = 20;
const INFO_SIZE = 12;
const BOTTOM_LIMIT = 262;
const LINE_H = 5.8;
const TEXT_SIZE = 12; // Arial 12 pt, como el Word
const MAX_IMAGE_W = 120;
const MAX_IMAGE_H = 90;
const MAX_SIGNATURE_W = 55;
const MAX_SIGNATURE_H = 15;

class CommuniqueWriter {
  y = 0;
  readonly contentW: number;

  constructor(private doc: jsPDF, private logo: string | null, private c: Communique) {
    this.contentW = doc.internal.pageSize.getWidth() - MARGIN * 2;
    this.drawPageFrame();
  }

  /**
   * Encabezado igual al de la plantilla: una fila con el logo y el título (COMUNICADO / CALIDAD PRODUCCIÓN)
   * y debajo las filas De, Para y Asunto, con la columna de etiquetas más angosta que la del logo. Pie de página en cada hoja.
   */
  private drawPageFrame() {
    const { doc, c } = this;
    const logoW = this.contentW * 0.264;
    const labelW = this.contentW * 0.141;
    const top = 10;
    const titleH = 22;

    doc.setDrawColor(0, 0, 0).setLineWidth(0.3);
    doc.rect(MARGIN, top, logoW, titleH).rect(MARGIN + logoW, top, this.contentW - logoW, titleH);

    if (this.logo) {
      try {
        const { width, height } = doc.getImageProperties(this.logo);
        const scale = Math.min((logoW - 6) / width, (titleH - 6) / height);
        doc.addImage(this.logo, 'PNG', MARGIN + (logoW - width * scale) / 2, top + (titleH - height * scale) / 2, width * scale, height * scale);
      } catch {
        doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(0, 51, 102).text('ALCO S.A.S', MARGIN + 6, top + 13);
      }
    }

    const titleX = MARGIN + logoW + (this.contentW - logoW) / 2;
    doc.setTextColor(0, 0, 0).setFont('helvetica', 'bold').setFontSize(18);
    doc.text(KIND_CONFIG[c.tipo].title, titleX, top + 9.5, { align: 'center' }).text(COMMUNIQUE_SUBTITLE, titleX, top + 16.5, { align: 'center' });

    // Cada fila crece según las líneas que ocupe su valor, como la tabla de Word.
    let rowTop = top + titleH;
    [['DE:', c.de], ['PARA:', c.para], ['ASUNTO:', c.asunto]].forEach(([label, value]) => {
      const lines: string[] = doc.setFont('helvetica', 'normal').setFontSize(INFO_SIZE).splitTextToSize(value, this.contentW - labelW - 6);
      const rowH = Math.max(9, lines.length * 5.2 + 3.8);
      doc.rect(MARGIN, rowTop, labelW, rowH).rect(MARGIN + labelW, rowTop, this.contentW - labelW, rowH);
      doc.setFont('helvetica', 'bolditalic').setFontSize(INFO_SIZE).text(label, MARGIN + 3, rowTop + 6);
      doc.setFont('helvetica', 'normal').text(lines, MARGIN + labelW + 3, rowTop + 6, { lineHeightFactor: 1.2 });
      rowTop += rowH;
    });

    doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(40, 40, 40).text(COMMUNIQUE_FOOTER, MARGIN, 272);
    doc.setTextColor(20, 20, 20);
    this.y = rowTop + 8;
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

  /** Párrafo con **negritas** en línea, justificado: reparte las palabras en líneas según su ancho real y estira los espacios de cada línea menos la última. */
  richParagraph(text: string, opts: { bold?: boolean; indent?: number; after?: number; justify?: boolean } = {}) {
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

    const spaceW = this.wordWidth([], true);
    lines.forEach((line, lineIndex) => {
      this.ensureSpace(LINE_H);
      const isLast = lineIndex === lines.length - 1;
      const wordsW = line.reduce((sum, word) => sum + this.wordWidth(word, false), 0);
      const gap = opts.justify !== false && !isLast && line.length > 1 ? (maxW - wordsW) / (line.length - 1) : spaceW;
      let x = MARGIN + indent;
      line.forEach(word => {
        word.forEach(seg => {
          doc.setFont('helvetica', seg.bold ? 'bold' : 'normal').setFontSize(TEXT_SIZE).text(seg.text, x, this.y);
          x += doc.getTextWidth(seg.text);
        });
        x += gap;
      });
      this.y += LINE_H;
    });
    this.y += opts.after ?? 3;
  }

  steps() {
    const { c } = this;
    if (c.pasos.length === 0) return;
    this.ensureSpace(20);
    this.richParagraph(KIND_CONFIG[c.tipo].stepsHeading, { bold: true, after: 3, justify: false });
    c.pasos.forEach((step, i) => {
      this.ensureSpace(LINE_H * 3);
      this.richParagraph(`${i + 1}) ${step.titulo}`, { bold: true, after: 1, justify: false });
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

  /** Firma dibujada sobre la línea de firma; si el PNG no se puede leer, queda la X de la plantilla. */
  private drawSignature(firma: string, x: number, lineY: number): boolean {
    try {
      const { w, h } = pngSize(dataUrlToBytes(firma));
      const scale = Math.min(MAX_SIGNATURE_W / w, MAX_SIGNATURE_H / h);
      this.doc.addImage(firma, 'PNG', x + 2, lineY - h * scale - 0.5, w * scale, h * scale);
      return true;
    } catch {
      return false;
    }
  }

  /** Firmas en filas de 2, con la línea de firma (la firma o una X) y debajo nombre, cargo y fecha de firma. */
  signatures() {
    const colW = this.contentW / 2;
    const lineW = colW - 12;
    for (let i = 0; i < this.c.firmantes.length; i += 2) {
      this.ensureSpace(26);
      this.c.firmantes.slice(i, i + 2).forEach((signer, col) => {
        const x = MARGIN + col * colW;
        this.doc.setDrawColor(0, 0, 0).setLineWidth(0.4).line(x, this.y + 8, x + lineW, this.y + 8);
        const signed = Boolean(signer.firma) && this.drawSignature(signer.firma as string, x, this.y + 8);
        if (!signed) this.doc.setFont('helvetica', 'normal').setFontSize(14).text('X', x + 1, this.y + 6.5);
        this.doc.setFont('helvetica', 'normal').setFontSize(8).text(signer.nombre, x + 1, this.y + 12).text(signer.cargo, x + 1, this.y + 16);
        if (signed) this.doc.setFont('helvetica', 'italic').setFontSize(7).text(signatureDateLabel(signer.firmadoEn), x + 1, this.y + 19.5);
      });
      this.y += 26;
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
  w.richParagraph('Atentamente,', { after: 4, justify: false });
  w.signatures();
  return doc;
}

export async function exportCommuniqueToPDF(communique: Communique): Promise<void> {
  const doc = await buildCommuniquePdf(communique);
  doc.save(communiqueFileName(communique, 'pdf'));
}
