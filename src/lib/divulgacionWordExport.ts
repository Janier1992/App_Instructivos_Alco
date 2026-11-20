import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageBreak,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx';
import type { Divulgacion } from './divulgacionStore';
import { COLUMN_FRACTIONS, COLUMN_HEADERS, KIND_LABELS, KIND_ORDER, SHEET_DATE, SHEET_SUBTITLE, SHEET_TITLE, SHEET_VERSION, divulgacionFileName, formatSheetDate, paginateAttendees } from './divulgacionShared';
import { pngSize } from './communiqueShared';
import { dataUrlToBytes, loadLogoImage, type LoadedImage } from './supplierClaimShared';

/**
 * Genera la planilla "Asistencia a capacitación, divulgación y charla" en Word (.docx) con el diseño original:
 * hoja horizontal, encabezado con logo, título y versión, datos de la sesión, tabla de asistencia de 15 filas con
 * la firma de cada persona y pie de evaluación. Cada 15 asistentes se agrega una hoja nueva con el mismo formato.
 */

const FONT = 'Arial';
const SIZE = 18; // half-points: 9 pt
const PAGE_W = 15840; // Carta horizontal
const PAGE_H = 12240;
const MARGIN = 450;
const CONTENT_W = PAGE_W - MARGIN * 2;
const THIN = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const BOX = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const ROW_H = 410;
const SIGNATURE_MAX_W_PX = 120;
const SIGNATURE_MAX_H_PX = 24;

type Attendee = Divulgacion['asistentes'][number];

const run = (text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}) => new TextRun({ text, font: FONT, size: opts.size ?? SIZE, bold: opts.bold, italics: opts.italics });
const para = (children: (TextRun | ImageRun)[], align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) => new Paragraph({ alignment: align, children });

function cell(children: Paragraph[], width: number, opts: { span?: number; rowSpan?: number } = {}): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: opts.span,
    rowSpan: opts.rowSpan,
    borders: BOX,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 90, right: 90 },
    children
  });
}

/** Tabla de una sola fila o de varias, de ancho completo. */
const fullTable = (rows: TableRow[], columns: number[]) => new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: columns, rows });
const spacer = () => new Paragraph({ spacing: { before: 0, after: 0, line: 20 }, children: [] });

function headerTable(logo: LoadedImage | null): Table {
  const logoW = Math.round(CONTENT_W * 0.14);
  const versionW = Math.round(CONTENT_W * 0.19);
  const titleW = CONTENT_W - logoW - versionW;
  const logoParagraph = para(logo ? [new ImageRun({ type: 'png', data: logo.bytes, transformation: { width: 130, height: Math.round((130 * logo.h) / logo.w) } })] : [run('ALCO S.A.S', { bold: true, size: 26 })], AlignmentType.CENTER);
  return fullTable(
    [
      new TableRow({ height: { value: 360, rule: 'atLeast' }, children: [cell([logoParagraph], logoW, { rowSpan: 2 }), cell([para([run(SHEET_TITLE, { bold: true, size: 20 })], AlignmentType.CENTER)], titleW), cell([para([run(`VERSIÓN: ${SHEET_VERSION}`, { bold: true })])], versionW)] }),
      new TableRow({ height: { value: 360, rule: 'atLeast' }, children: [cell([para([run(SHEET_SUBTITLE, { bold: true })], AlignmentType.CENTER)], titleW), cell([para([run(`FECHA: ${SHEET_DATE}`, { bold: true })])], versionW)] })
    ],
    [logoW, titleW, versionW]
  );
}

function infoTable(d: Divulgacion): Table {
  const line = (label: string, value: string) => new TableRow({ height: { value: 330, rule: 'atLeast' }, children: [cell([para([run(`${label}: ${value}`)])], CONTENT_W)] });
  const third = Math.round(CONTENT_W / 3);
  const kindRuns: TextRun[] = [run('Marque con una '), run('X', { bold: true, size: 22 })];
  KIND_ORDER.forEach(kind => kindRuns.push(run(`          ${KIND_LABELS[kind]}  [ ${d.tipo === kind ? 'X' : '   '} ]`)));
  return fullTable(
    [
      line('Fecha', formatSheetDate(d.fecha)),
      line('Tema', d.tema),
      line('Objetivo', d.objetivo),
      new TableRow({
        height: { value: 330, rule: 'atLeast' },
        children: [cell([para([run(`Responsable del Tema: ${d.responsable}`)])], Math.round(CONTENT_W * 0.45)), cell([para([run(`Proceso/área: ${d.procesoArea}`)])], Math.round(CONTENT_W * 0.3)), cell([para([run(`Duración: ${d.duracion}`)])], CONTENT_W - Math.round(CONTENT_W * 0.45) - Math.round(CONTENT_W * 0.3))]
      }),
      new TableRow({ height: { value: 380, rule: 'atLeast' }, children: [cell([para(kindRuns)], CONTENT_W)] })
    ],
    [third, third, CONTENT_W - third * 2]
  );
}

function signatureRun(firma: string): ImageRun | null {
  try {
    const bytes = dataUrlToBytes(firma);
    const { w, h } = pngSize(bytes);
    const scale = Math.min(SIGNATURE_MAX_W_PX / w, SIGNATURE_MAX_H_PX / h, 1);
    return new ImageRun({ type: 'png', data: bytes, transformation: { width: Math.round(w * scale), height: Math.round(h * scale) } });
  } catch {
    return null;
  }
}

function attendanceTable(rows: { number: number; row: Attendee | null }[]): Table {
  const widths = COLUMN_FRACTIONS.map(f => Math.round(f * CONTENT_W));
  widths[4] = CONTENT_W - widths.slice(0, 4).reduce((a, b) => a + b, 0);
  const text = (value: string, width: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) => cell([para([run(value)], align)], width);

  return fullTable(
    [
      new TableRow({ height: { value: 300, rule: 'atLeast' }, children: [cell([para([run('ASISTENCIA', { bold: true })], AlignmentType.CENTER)], CONTENT_W, { span: 5 })] }),
      new TableRow({ height: { value: 300, rule: 'atLeast' }, children: COLUMN_HEADERS.map((h, i) => cell([para([run(h, { bold: true, size: 17 })], AlignmentType.CENTER)], widths[i])) }),
      ...rows.map(
        ({ number, row }) =>
          new TableRow({
            height: { value: ROW_H, rule: 'atLeast' },
            cantSplit: true,
            children: [
              text(String(number), widths[0], AlignmentType.CENTER),
              text(row?.nombre ?? '', widths[1]),
              text(row?.cedula ?? '', widths[2]),
              cell([para(row?.firma ? [signatureRun(row.firma) ?? run('')] : [run('')], AlignmentType.CENTER)], widths[3]),
              text(row?.procesoSeccion ?? '', widths[4])
            ]
          })
      )
    ],
    widths
  );
}

function footerTable(d: Divulgacion): Table {
  const line = (children: TextRun[]) => new TableRow({ height: { value: 300, rule: 'atLeast' }, children: [cell([para(children)], CONTENT_W)] });
  return fullTable(
    [
      line([run('Esta capacitación o divulgación será evaluada en ', { bold: true }), run(`  ${d.evaluacionDias || '      '}  `), run(' Días', { bold: true })]),
      line([run('Nombre del responsable de realizar la evaluación: ', { bold: true }), run(d.evaluador)]),
      line([run('Resultados de la evaluación: ', { bold: true }), run(d.resultados)]),
      line([run('')])
    ],
    [CONTENT_W]
  );
}

export async function buildDivulgacionWord(divulgacion: Divulgacion): Promise<Blob> {
  const logo = await loadLogoImage();
  const pages = paginateAttendees(divulgacion);
  const children: (Paragraph | Table)[] = pages.flatMap((rows, page) => [
    ...(page > 0 ? [new Paragraph({ children: [new PageBreak()] })] : []),
    headerTable(logo),
    spacer(),
    infoTable(divulgacion),
    spacer(),
    attendanceTable(rows),
    spacer(),
    footerTable(divulgacion)
  ]);

  const doc = new Document({
    creator: 'ALCO S.A.S. Gestión Calidad',
    title: `Asistencia ${divulgacion.tema}`,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{ properties: { page: { size: { width: PAGE_H, height: PAGE_W, orientation: PageOrientation.LANDSCAPE }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, children }]
  });
  return Packer.toBlob(doc);
}

export async function exportDivulgacionToWord(divulgacion: Divulgacion): Promise<void> {
  const blob = await buildDivulgacionWord(divulgacion);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = divulgacionFileName(divulgacion, 'docx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
