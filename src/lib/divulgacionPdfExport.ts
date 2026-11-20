import jsPDF from 'jspdf';
import type { Divulgacion } from './divulgacionStore';
import { loadLogoDataUrl } from './metrologyPdfHelpers';
import { COLUMN_FRACTIONS, COLUMN_HEADERS, KIND_LABELS, KIND_ORDER, SHEET_DATE, SHEET_SUBTITLE, SHEET_TITLE, SHEET_VERSION, divulgacionFileName, formatSheetDate, paginateAttendees } from './divulgacionShared';

/**
 * Genera la planilla "Asistencia a capacitación, divulgación y charla" en PDF con el diseño original: hoja
 * horizontal, encabezado con logo, título y versión, datos de la sesión, tabla de asistencia de 15 filas con la
 * firma de cada persona y pie de evaluación. Cada 15 asistentes se agrega una hoja nueva con el mismo formato.
 */

const PAGE_MARGIN = 8;
const LINE = 0.3;
const TEXT_SIZE = 9;
const HEADER_ROW_H = 8;
const INFO_ROW_H = 6.2;
const MAX_ROW_H = 7.6;
const MIN_ROW_H = 5.6;
const SIGNATURE_PADDING = 0.8;

type Attendee = Divulgacion['asistentes'][number];

class SheetWriter {
  private y = PAGE_MARGIN;
  private readonly w: number;
  private readonly pageH: number;

  constructor(private doc: jsPDF, private logo: string | null, private d: Divulgacion) {
    this.w = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
    this.pageH = doc.internal.pageSize.getHeight() - PAGE_MARGIN;
  }

  private box(x: number, y: number, w: number, h: number) {
    this.doc.setDrawColor(0, 0, 0).setLineWidth(LINE).rect(x, y, w, h);
  }

  private text(value: string, x: number, y: number, opts: { bold?: boolean; size?: number; align?: 'left' | 'center' | 'right' } = {}) {
    this.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal').setFontSize(opts.size ?? TEXT_SIZE).setTextColor(20, 20, 20);
    this.doc.text(value, x, y, { align: opts.align ?? 'left' });
  }

  private header() {
    const { doc } = this;
    const logoW = this.w * 0.14;
    const versionW = this.w * 0.19;
    const titleW = this.w - logoW - versionW;
    const x = PAGE_MARGIN;
    this.box(x, this.y, logoW, HEADER_ROW_H * 2);
    this.box(x + logoW, this.y, titleW, HEADER_ROW_H);
    this.box(x + logoW, this.y + HEADER_ROW_H, titleW, HEADER_ROW_H);
    this.box(x + logoW + titleW, this.y, versionW, HEADER_ROW_H);
    this.box(x + logoW + titleW, this.y + HEADER_ROW_H, versionW, HEADER_ROW_H);

    if (this.logo) {
      try {
        const { width, height } = doc.getImageProperties(this.logo);
        const scale = Math.min((logoW - 4) / width, (HEADER_ROW_H * 2 - 3) / height);
        doc.addImage(this.logo, 'PNG', x + (logoW - width * scale) / 2, this.y + (HEADER_ROW_H * 2 - height * scale) / 2, width * scale, height * scale);
      } catch {
        this.text('ALCO S.A.S', x + logoW / 2, this.y + 9.5, { bold: true, size: 12, align: 'center' });
      }
    }
    this.text(SHEET_TITLE, x + logoW + titleW / 2, this.y + 5.4, { bold: true, size: 10, align: 'center' });
    this.text(SHEET_SUBTITLE, x + logoW + titleW / 2, this.y + HEADER_ROW_H + 5.4, { bold: true, size: 9, align: 'center' });
    this.text(`VERSIÓN: ${SHEET_VERSION}`, x + logoW + titleW + 2, this.y + 5.4, { bold: true });
    this.text(`FECHA: ${SHEET_DATE}`, x + logoW + titleW + 2, this.y + HEADER_ROW_H + 5.4, { bold: true });
    this.y += HEADER_ROW_H * 2;
  }

  /** Fila de ancho completo con una etiqueta y su valor; crece según las líneas que ocupe el valor. */
  private infoRow(label: string, value: string) {
    const prefix = `${label}: `;
    this.doc.setFont('helvetica', 'normal').setFontSize(TEXT_SIZE);
    const lines: string[] = this.doc.splitTextToSize(`${prefix}${value}`, this.w - 4);
    const h = Math.max(INFO_ROW_H, lines.length * 4 + 2.2);
    this.box(PAGE_MARGIN, this.y, this.w, h);
    lines.forEach((line, i) => this.text(line, PAGE_MARGIN + 2, this.y + 4.4 + i * 4));
    this.y += h;
  }

  private responsibleRow() {
    this.box(PAGE_MARGIN, this.y, this.w, INFO_ROW_H);
    this.text(`Responsable del Tema: ${this.d.responsable}`, PAGE_MARGIN + 2, this.y + 4.4);
    this.text(`Proceso/área: ${this.d.procesoArea}`, PAGE_MARGIN + this.w * 0.45, this.y + 4.4);
    this.text(`Duración: ${this.d.duracion}`, PAGE_MARGIN + this.w * 0.75, this.y + 4.4);
    this.y += INFO_ROW_H;
  }

  /** "Marque con una X": las tres casillas, con la X en la del tipo de sesión. */
  private kindRow() {
    const h = 7.2;
    this.box(PAGE_MARGIN, this.y, this.w, h);
    this.text('Marque con una', PAGE_MARGIN + 2, this.y + 4.9);
    this.text('X', PAGE_MARGIN + 2 + this.doc.getTextWidth('Marque con una ') + 0.5, this.y + 5, { bold: true, size: 11 });
    KIND_ORDER.forEach((kind, i) => {
      const x = PAGE_MARGIN + this.w * (0.22 + i * 0.2);
      this.text(KIND_LABELS[kind], x, this.y + 4.9);
      const boxX = x + this.doc.getTextWidth(`${KIND_LABELS[kind]}  `);
      this.doc.setDrawColor(0, 0, 0).setLineWidth(0.2).rect(boxX, this.y + 1.2, 6.5, 4.8);
      if (this.d.tipo === kind) this.text('X', boxX + 3.25, this.y + 5, { align: 'center', size: 10 });
    });
    this.y += h;
  }

  private columns(): number[] {
    const widths = COLUMN_FRACTIONS.map(f => f * this.w);
    return widths.reduce<number[]>((acc, cw) => [...acc, acc[acc.length - 1] + cw], [PAGE_MARGIN]);
  }

  private attendeeText(value: string, x: number, width: number, baseline: number) {
    let size = TEXT_SIZE;
    this.doc.setFont('helvetica', 'normal');
    while (size > 6 && this.doc.setFontSize(size).getTextWidth(value) > width - 3) size -= 0.5;
    this.doc.setFontSize(size);
    const fitted: string = this.doc.splitTextToSize(value, width - 2)[0] ?? '';
    this.doc.text(fitted, x + 1.5, baseline);
  }

  private signature(firma: string, x: number, y: number, w: number, h: number) {
    try {
      const { width, height } = this.doc.getImageProperties(firma);
      const scale = Math.min((w - 2 * SIGNATURE_PADDING) / width, (h - 2 * SIGNATURE_PADDING) / height);
      this.doc.addImage(firma, 'PNG', x + (w - width * scale) / 2, y + (h - height * scale) / 2, width * scale, height * scale);
    } catch {
      /* firma ilegible: la celda queda vacía sin romper la planilla */
    }
  }

  private table(rows: { number: number; row: Attendee | null }[], rowH: number) {
    const xs = this.columns();
    this.box(PAGE_MARGIN, this.y, this.w, 6);
    this.text('ASISTENCIA', PAGE_MARGIN + this.w / 2, this.y + 4.3, { bold: true, align: 'center' });
    this.y += 6;

    COLUMN_HEADERS.forEach((header, i) => {
      this.box(xs[i], this.y, xs[i + 1] - xs[i], 6);
      this.text(header, (xs[i] + xs[i + 1]) / 2, this.y + 4.3, { bold: true, align: 'center', size: 8.5 });
    });
    this.y += 6;

    rows.forEach(({ number, row }) => {
      xs.slice(0, -1).forEach((x, i) => this.box(x, this.y, xs[i + 1] - x, rowH));
      this.text(String(number), (xs[0] + xs[1]) / 2, this.y + rowH / 2 + 1.2, { align: 'center', size: 8.5 });
      if (row) {
        const baseline = this.y + rowH / 2 + 1.2;
        this.attendeeText(row.nombre, xs[1], xs[2] - xs[1], baseline);
        this.attendeeText(row.cedula, xs[2], xs[3] - xs[2], baseline);
        if (row.firma) this.signature(row.firma, xs[3], this.y, xs[4] - xs[3], rowH);
        this.attendeeText(row.procesoSeccion, xs[4], xs[5] - xs[4], baseline);
      }
      this.y += rowH;
    });
  }

  /** Pie de la planilla: plazo, responsable y resultados de la evaluación, con dos líneas libres. */
  private footer() {
    const lineH = 5.2;
    const underline = (x1: number, x2: number, y: number) => this.doc.setDrawColor(0, 0, 0).setLineWidth(0.2).line(x1, y, x2, y);
    this.box(PAGE_MARGIN, this.y, this.w, lineH * 3 + 8);
    const days = this.d.evaluacionDias || '';
    this.text('Esta capacitación o divulgación será evaluada en', PAGE_MARGIN + 6, this.y + 4, { bold: true });
    const x = PAGE_MARGIN + 6 + this.doc.getTextWidth('Esta capacitación o divulgación será evaluada en ');
    underline(x, x + 22, this.y + 4.4);
    this.text(days, x + 11, this.y + 3.6, { align: 'center' });
    this.text('Días', x + 24, this.y + 4, { bold: true });
    this.text(`Nombre del responsable de realizar la evaluación: ${this.d.evaluador}`, PAGE_MARGIN + 6, this.y + 4 + lineH, { bold: true });
    this.text(`Resultados de la evaluación: ${this.d.resultados}`, PAGE_MARGIN + 6, this.y + 4 + lineH * 2, { bold: true });
    underline(PAGE_MARGIN, PAGE_MARGIN + this.w, this.y + lineH * 3 + 3);
    this.y += lineH * 3 + 8;
  }

  /** Dibuja una hoja completa. Las filas se achican lo necesario para que la hoja entre en una página. */
  sheet(rows: { number: number; row: Attendee | null }[]) {
    this.y = PAGE_MARGIN;
    this.header();
    this.infoRow('Fecha', formatSheetDate(this.d.fecha));
    this.infoRow('Tema', this.d.tema);
    this.infoRow('Objetivo', this.d.objetivo);
    this.responsibleRow();
    this.kindRow();
    const reserved = 6 + 6 + 5.2 * 3 + 8;
    const rowH = Math.max(MIN_ROW_H, Math.min(MAX_ROW_H, (this.pageH - this.y - reserved) / rows.length));
    this.table(rows, rowH);
    this.footer();
  }
}

export async function buildDivulgacionPdf(divulgacion: Divulgacion): Promise<jsPDF> {
  const logo = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const writer = new SheetWriter(doc, logo, divulgacion);
  paginateAttendees(divulgacion).forEach((rows, page) => {
    if (page > 0) doc.addPage();
    writer.sheet(rows);
  });
  return doc;
}

export async function exportDivulgacionToPDF(divulgacion: Divulgacion): Promise<void> {
  const doc = await buildDivulgacionPdf(divulgacion);
  doc.save(divulgacionFileName(divulgacion, 'pdf'));
}
