import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType
} from 'docx';
import type { Communique } from './communiqueStore';
import { COMMUNIQUE_FOOTER, COMMUNIQUE_SUBTITLE, DEFAULT_CLOSING, KIND_CONFIG, cleanCommuniqueForExport, communiqueFileName, splitBold } from './communiqueShared';
import { LoadedImage, formatLongDate, loadClaimImages, loadLogoImage } from './supplierClaimShared';

/**
 * Genera el comunicado o procedimiento en Word (.docx) con la plantilla
 * oficial de Alco: encabezado con logo, título y datos De / Para / Asunto,
 * fecha, introducción, instrucciones numeradas, imágenes con su pie, cierre,
 * firmas y pie de página. Se arma en el navegador, no requiere sesión del CRM.
 */

const FONT = 'Arial';
const BODY_SIZE = 20; // half-points: 10 pt
const PAGE_CONTENT_DXA = 9974; // Carta con márgenes laterales de 20 mm
const LOGO_COL_DXA = 2632;
const THIN = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const BOX = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const TABLE_NO_BORDERS = { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };
const MAX_IMAGE_WIDTH_PX = 400;
const MAX_IMAGE_HEIGHT_PX = 300;

const run = (text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
  new TextRun({ text, font: FONT, size: opts.size ?? BODY_SIZE, bold: opts.bold, italics: opts.italics });

/** Texto con **negritas** convertido en corridas de Word. */
const richRuns = (text: string, baseBold = false): TextRun[] => splitBold(text).map(seg => run(seg.text, { bold: baseBold || seg.bold }));

const justified = (text: string, after = 120) =>
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after, line: 276 }, children: richRuns(text) });

function headerCell(children: Paragraph[], width: number, opts: { merge?: 'start' | 'continue' } = {}): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BOX,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 100, right: 100 },
    verticalMerge: opts.merge === 'start' ? VerticalMergeType.RESTART : opts.merge === 'continue' ? VerticalMergeType.CONTINUE : undefined,
    children
  });
}

function infoRow(label: string, value: string): TableRow {
  const width = PAGE_CONTENT_DXA - LOGO_COL_DXA;
  return new TableRow({
    height: { value: 380, rule: 'atLeast' },
    children: [headerCell([new Paragraph({})], LOGO_COL_DXA, { merge: 'continue' }), headerCell([new Paragraph({ children: [run(`${label} `, { bold: true }), run(value)] })], width)]
  });
}

/** Encabezado de todas las páginas: logo a la izquierda; título y datos De, Para y Asunto a la derecha. */
function buildHeader(c: Communique, logo: LoadedImage | null): Header {
  const width = PAGE_CONTENT_DXA - LOGO_COL_DXA;
  const logoParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: logo ? [new ImageRun({ type: 'png', data: logo.bytes, transformation: { width: 150, height: Math.round((150 * logo.h) / logo.w) } })] : [run('ALCO S.A.S', { bold: true, size: 28 })]
  });
  const titleParagraphs = [KIND_CONFIG[c.tipo].title, COMMUNIQUE_SUBTITLE].map(text => new Paragraph({ alignment: AlignmentType.CENTER, children: [run(text, { bold: true, size: 24 })] }));

  return new Header({
    children: [
      new Table({
        width: { size: PAGE_CONTENT_DXA, type: WidthType.DXA },
        columnWidths: [LOGO_COL_DXA, width],
        rows: [
          new TableRow({ height: { value: 700, rule: 'atLeast' }, children: [headerCell([logoParagraph], LOGO_COL_DXA, { merge: 'start' }), headerCell(titleParagraphs, width)] }),
          infoRow('DE:', c.de),
          infoRow('PARA:', c.para),
          infoRow('ASUNTO:', c.asunto)
        ]
      })
    ]
  });
}

function imageRun(img: LoadedImage): ImageRun {
  const scale = Math.min(MAX_IMAGE_WIDTH_PX / img.w, MAX_IMAGE_HEIGHT_PX / img.h, 1);
  return new ImageRun({ type: img.format === 'PNG' ? 'png' : 'jpg', data: img.bytes, transformation: { width: Math.round(img.w * scale), height: Math.round(img.h * scale) } });
}

/** Cada imagen centrada, con su pie en negrita debajo, como en la plantilla. */
function imageBlocks(images: LoadedImage[]): Paragraph[] {
  return images.flatMap(img => {
    const block = [new Paragraph({ alignment: AlignmentType.CENTER, keepNext: Boolean(img.caption), spacing: { before: 120, after: 40 }, children: [imageRun(img)] })];
    if (img.caption) block.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [run(img.caption, { bold: true })] }));
    return block;
  });
}

function stepParagraphs(c: Communique): Paragraph[] {
  if (c.pasos.length === 0) return [];
  return [
    new Paragraph({ spacing: { before: 120, after: 120 }, keepNext: true, children: [run(KIND_CONFIG[c.tipo].stepsHeading, { bold: true })] }),
    ...c.pasos.flatMap(step => [
      new Paragraph({ numbering: { reference: 'communique-steps', level: 0 }, keepNext: true, spacing: { after: 40 }, children: [run(step.titulo, { bold: true })] }),
      new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { left: 360 }, spacing: { after: 120, line: 276 }, children: richRuns(step.detalle) })
    ])
  ];
}

/** Firmas en filas de 2, con la línea de firma (X) y debajo nombre y cargo. */
function signatureTable(c: Communique): Table | null {
  if (c.firmantes.length === 0) return null;
  const colW = Math.floor(PAGE_CONTENT_DXA / 2);
  const cell = (signer?: Communique['firmantes'][number]) =>
    new TableCell({
      width: { size: colW, type: WidthType.DXA },
      borders: NO_BORDERS,
      margins: { top: 200, bottom: 60, left: 100, right: 500 },
      children: signer
        ? [
            new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 1 } }, children: [run('X', { size: 32 })] }),
            new Paragraph({ children: [run(signer.nombre, { size: 16 })] }),
            new Paragraph({ children: [run(signer.cargo, { size: 16 })] })
          ]
        : [new Paragraph({})]
    });
  const rows: TableRow[] = [];
  for (let i = 0; i < c.firmantes.length; i += 2) {
    rows.push(new TableRow({ cantSplit: true, children: [cell(c.firmantes[i]), cell(c.firmantes[i + 1])] }));
  }
  return new Table({ width: { size: PAGE_CONTENT_DXA, type: WidthType.DXA }, columnWidths: [colW, colW], borders: TABLE_NO_BORDERS, rows });
}

export async function buildCommuniqueWord(rawCommunique: Communique): Promise<Blob> {
  const c = cleanCommuniqueForExport(rawCommunique);
  const [logo, images] = await Promise.all([loadLogoImage(), loadClaimImages(c.fotoPaths, c.fotoMeta)]);

  const children: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 240 }, children: [run(`Sabaneta, ${formatLongDate(c.fecha)}`, { bold: true })] }),
    ...(c.intro ? c.intro.split(/\n\s*\n/).map(block => justified(block.replace(/\n/g, ' ').trim())) : []),
    ...stepParagraphs(c),
    ...imageBlocks(images),
    new Paragraph({ spacing: { before: 200, after: 200 }, keepNext: true, children: richRuns(c.cierre || DEFAULT_CLOSING) }),
    new Paragraph({ spacing: { after: 120 }, keepNext: true, children: [run('Atentamente,')] })
  ];
  const signatures = signatureTable(c);
  if (signatures) children.push(signatures);

  const doc = new Document({
    creator: 'ALCO S.A.S. Gestión Calidad',
    title: `${KIND_CONFIG[c.tipo].label} ${c.asunto}`,
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
    numbering: {
      config: [
        {
          reference: 'communique-steps',
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1)', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } } } }]
        }
      ]
    },
    sections: [
      {
        properties: { page: { size: { width: 12242, height: 15842 }, margin: { top: 2900, bottom: 1134, left: 1134, right: 1134, header: 500, footer: 500 } } },
        headers: { default: buildHeader(c, logo) },
        footers: { default: new Footer({ children: [new Paragraph({ children: [run(COMMUNIQUE_FOOTER, { italics: true })] })] }) },
        children
      }
    ]
  });

  return Packer.toBlob(doc);
}

export async function exportCommuniqueToWord(communique: Communique): Promise<void> {
  const blob = await buildCommuniqueWord(communique);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = communiqueFileName(communique, 'docx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
