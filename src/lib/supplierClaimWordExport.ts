import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  LevelFormat
} from 'docx';
import type { SupplierClaim } from './supplierClaimsStore';
import {
  DOC_DATE,
  DOC_VERSION,
  FOLLOW_UP,
  INTRO,
  NAVY_HEX,
  LoadedImage,
  cleanClaimForExport,
  defectLine,
  formatLongDate,
  loadClaimImages,
  loadLogoImage,
  rejectIntro,
  safeFileName
} from './supplierClaimShared';

/**
 * Genera el informe de reclamo a proveedor en Word (.docx) con la misma
 * plantilla del PDF, para que se pueda corregir directamente en Word antes
 * de enviarlo. Se arma en el navegador, no requiere sesión del CRM.
 */

const FONT = 'Arial';
const BODY_SIZE = 20; // half-points: 10 pt
const PAGE_CONTENT_DXA = 9638; // A4 con márgenes de 15 mm
const THIN = { style: BorderStyle.SINGLE, size: 4, color: '969696' };
const CELL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const MAX_IMAGE_WIDTH_PX = 330;
const MAX_IMAGE_HEIGHT_PX = 260;

const run = (text: string, opts: { bold?: boolean; color?: string; size?: number } = {}) =>
  new TextRun({ text, font: FONT, size: opts.size ?? BODY_SIZE, bold: opts.bold, color: opts.color });

function body(text: string, opts: { bold?: boolean; justify?: boolean } = {}): Paragraph[] {
  return text
    .split(/\n\s*\n/)
    .map(block => block.replace(/\n/g, ' ').trim())
    .filter(Boolean)
    .map(
      block =>
        new Paragraph({
          alignment: opts.justify === false ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
          spacing: { after: 120, line: 276 },
          children: [run(block, { bold: opts.bold })]
        })
    );
}

function bullet(detail: string, title?: string): Paragraph {
  return new Paragraph({
    numbering: { reference: 'claim-bullets', level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 80, line: 276 },
    children: title ? [run(`${title}: `, { bold: true }), run(detail)] : [run(detail)]
  });
}

function sectionBar(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 140 },
    shading: { type: ShadingType.CLEAR, fill: NAVY_HEX, color: 'auto' },
    indent: { left: 0 },
    children: [run(`  ${title}`, { bold: true, color: 'FFFFFF', size: 21 })]
  });
}

function imageRun(img: LoadedImage, maxWidthPx: number): ImageRun {
  const scale = Math.min(maxWidthPx / img.w, MAX_IMAGE_HEIGHT_PX / img.h, 1);
  return new ImageRun({
    type: img.format === 'PNG' ? 'png' : 'jpg',
    data: img.bytes,
    transformation: { width: Math.round(img.w * scale), height: Math.round(img.h * scale) }
  });
}

/** Fotos en filas de hasta 2, centradas, cada una con su comentario debajo. */
function imageRows(images: LoadedImage[]): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];
  const perRow = images.length === 1 ? 1 : 2;
  const maxWidthPx = perRow === 1 ? 400 : 300;
  const colW = Math.floor(PAGE_CONTENT_DXA / perRow);

  for (let i = 0; i < images.length; i += perRow) {
    const row = images.slice(i, i + perRow);
    blocks.push(
      new Table({
        width: { size: PAGE_CONTENT_DXA, type: WidthType.DXA },
        columnWidths: Array(perRow).fill(colW),
        alignment: AlignmentType.CENTER,
        borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
        rows: [
          new TableRow({
            children: row.map(img => {
              const content: Paragraph[] = [new Paragraph({ alignment: AlignmentType.CENTER, children: [imageRun(img, maxWidthPx)] })];
              if (img.caption) {
                content.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 80 }, children: [new TextRun({ text: img.caption, font: FONT, size: 17, italics: true, color: '3C3C3C' })] }));
              }
              return cell(content, colW, { borders: NO_BORDERS });
            })
          })
        ]
      }),
      new Paragraph({ spacing: { after: 80 }, children: [] })
    );
  }
  return blocks;
}

function cell(children: Paragraph[], widthDxa: number, opts: { fill?: string; borders?: typeof CELL_BORDERS | typeof NO_BORDERS } = {}): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    borders: opts.borders ?? CELL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: 'auto' } : undefined,
    children
  });
}

const cellText = (text: string, opts: { bold?: boolean; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number } = {}) =>
  new Paragraph({ alignment: opts.align ?? AlignmentType.LEFT, children: [run(text, { bold: opts.bold, color: opts.color, size: opts.size })] });

function infoTable(rows: [string, string][]): Table {
  const labelW = Math.round(PAGE_CONTENT_DXA * 0.42);
  return new Table({
    width: { size: PAGE_CONTENT_DXA, type: WidthType.DXA },
    columnWidths: [labelW, PAGE_CONTENT_DXA - labelW],
    rows: rows.map(([label, value]) => new TableRow({ children: [cell([cellText(label, { bold: true })], labelW), cell([cellText(value)], PAGE_CONTENT_DXA - labelW)] }))
  });
}

function rejectTable(items: SupplierClaim['rechazoItems']): Table {
  const widths = [Math.round(PAGE_CONTENT_DXA / 3), Math.round(PAGE_CONTENT_DXA / 3), PAGE_CONTENT_DXA - 2 * Math.round(PAGE_CONTENT_DXA / 3)];
  const head = ['Cantidad de perfiles', 'Acabado', 'Medida (mm)'];
  return new Table({
    width: { size: PAGE_CONTENT_DXA, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell([cellText(h, { bold: true, color: 'FFFFFF' })], widths[i], { fill: NAVY_HEX })) }),
      ...items.map(item => new TableRow({ children: [String(item.cantidad), item.acabado, item.medidaMm].map((v, i) => cell([cellText(v)], widths[i])) }))
    ]
  });
}

function signatureTable(name: string, role: string): Table {
  const labelW = 1300;
  const valueW = 3000;
  const row = (label: string, value: string) => new TableRow({ children: [cell([cellText(label)], labelW), cell([cellText(value, { align: AlignmentType.CENTER })], valueW)] });
  return new Table({
    alignment: AlignmentType.RIGHT,
    width: { size: labelW + valueW, type: WidthType.DXA },
    columnWidths: [labelW, valueW],
    rows: [
      new TableRow({ children: [cell([cellText('')], labelW, { borders: NO_BORDERS }), cell([cellText('REALIZÓ', { bold: true, align: AlignmentType.CENTER, size: 22 })], valueW)] }),
      row('Nombre:', name),
      row('Cargo:', role)
    ]
  });
}

function buildHeader(proveedor: string, logo: LoadedImage | null): Header {
  const logoW = 2600;
  const versionW = 2300;
  const titleW = PAGE_CONTENT_DXA - logoW - versionW;
  const logoScale = logo ? Math.min(150 / logo.w, 60 / logo.h) : 1;
  const logoPara = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: logo
      ? [new ImageRun({ type: 'png', data: logo.bytes, transformation: { width: Math.round(logo.w * logoScale), height: Math.round(logo.h * logoScale) } })]
      : [run('ALCO S.A.S', { bold: true, size: 28 })]
  });
  const versionCell = (label: string, value: string) =>
    cell([new Paragraph({ children: [run(`${label} `, { bold: true, size: 16 }), run(value, { size: 16 })] })], versionW);

  return new Header({
    children: [
      new Table({
        width: { size: PAGE_CONTENT_DXA, type: WidthType.DXA },
        columnWidths: [logoW, titleW, versionW],
        rows: [
          new TableRow({
            children: [
              new TableCell({ rowSpan: 2, width: { size: logoW, type: WidthType.DXA }, borders: CELL_BORDERS, verticalAlign: VerticalAlign.CENTER, children: [logoPara] }),
              cell([cellText(`INFORME CALIDAD ABASTECIMIENTO NO CONFORMIDADES PROVEEDOR ${proveedor}`, { bold: true, align: AlignmentType.CENTER, size: 16 })], titleW),
              versionCell('VERSIÓN:', DOC_VERSION)
            ]
          }),
          new TableRow({ children: [cell([cellText('GESTIÓN CALIDAD', { bold: true, align: AlignmentType.CENTER, size: 16 })], titleW), versionCell('FECHA:', DOC_DATE)] })
        ]
      }),
      new Paragraph({ children: [] })
    ]
  });
}

export async function buildSupplierClaimWord(rawClaim: SupplierClaim): Promise<Blob> {
  const claim = cleanClaimForExport(rawClaim);
  const [logo, etiquetaImgs, defectoImgs] = await Promise.all([loadLogoImage(), loadClaimImages(claim.fotoEtiquetaPaths, claim.fotoMeta), loadClaimImages(claim.fotoDefectoPaths, claim.fotoMeta)]);
  const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] });

  const children: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 160 }, children: [run(`Sabaneta, ${formatLongDate(claim.fechaInforme)}`, { bold: true, size: 21 })] }),
    infoTable([
      ['PROVEEDOR:', claim.proveedor],
      ['MATERIA PRIMA / INSUMO:', claim.materiaPrima],
      ['REFERENCIA(S):', claim.referencias],
      ['NÚMERO(S) DE LOTE:', claim.lotes || 'No indicado']
    ]),
    spacer(),
    ...body(INTRO),
    sectionBar('TRAZABILIDAD'),
    ...body(etiquetaImgs.length > 0 ? 'Adjunto imágenes de la etiqueta del material recibido.' : 'No se adjuntó imagen de la etiqueta del material recibido.'),
    ...imageRows(etiquetaImgs),
    sectionBar('DESCRIPCIÓN DE LA NO CONFORMIDAD O ANOMALÍA'),
    ...body(defectLine(claim), { bold: true, justify: false }),
    ...body(claim.descripcionNc || claim.observacionInspector)
  ];

  if (claim.observacionesTecnicas.length > 0) {
    children.push(...body('Observaciones técnicas:', { bold: true, justify: false }), ...claim.observacionesTecnicas.map(o => bullet(o)));
  }
  children.push(...imageRows(defectoImgs));

  if (claim.rechazoItems.length > 0) {
    const total = claim.rechazoItems.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);
    children.push(sectionBar('ACCIONES INMEDIATAS'), ...body(rejectIntro(total)), rejectTable(claim.rechazoItems), spacer());
  }

  if (claim.accionesCorrectivas.length > 0) {
    children.push(sectionBar('ACCIONES CORRECTIVAS SOLICITADAS AL PROVEEDOR'), ...claim.accionesCorrectivas.map(a => bullet(a.detalle, a.titulo)));
  }

  children.push(sectionBar('SEGUIMIENTO'), ...body(FOLLOW_UP(claim.proveedor)), spacer(), spacer(), signatureTable(claim.realizadoPor, claim.cargo || ''));

  const doc = new Document({
    creator: 'ALCO S.A.S. Gestión Calidad',
    title: `Informe NC ${claim.proveedor} ${claim.referencias}`,
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
    numbering: {
      config: [
        {
          reference: 'claim-bullets',
          levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 250 } } } }]
        }
      ]
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1900, bottom: 1000, left: 1134, right: 1134, header: 500 } } },
        headers: { default: buildHeader(claim.proveedor, logo) },
        children
      }
    ]
  });

  return Packer.toBlob(doc);
}

export async function exportSupplierClaimToWord(claim: SupplierClaim): Promise<void> {
  const blob = await buildSupplierClaimWord(claim);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFileName(claim, 'docx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
