import type { SupplierClaim } from './supplierClaimsStore';

/** Piezas compartidas por la exportación a PDF y a Word del informe de reclamo a proveedor. */

export const DOC_VERSION = '1';
export const DOC_DATE = '28/02/2023';
export const NAVY_HEX = '1F3864';
export const NAVY_RGB: [number, number, number] = [31, 56, 100];

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const INTRO =
  'En el presente informe se detallan las condiciones observadas durante el proceso de recepción de materias primas e insumos, con el fin de documentar posibles incidencias y contribuir al cumplimiento de los estándares de calidad establecidos por ALCO S.A.S.';

export const FOLLOW_UP = (proveedor: string) =>
  `Agradecemos a ${proveedor} su atención a esta comunicación y quedamos atentos a recibir la notificación formal de las acciones adoptadas. Realizaremos el seguimiento correspondiente para confirmar la implementación de las correcciones, con el propósito de seguir fortaleciendo nuestra relación comercial y garantizar la calidad del suministro.`;

export function rejectIntro(total: number): string {
  return `Con el fin de dar solución a la novedad, se rechazan ${total} unidades en total (detalle en la tabla adjunta), las cuales serán devueltas al proveedor para su revisión.`;
}

export function defectLine(claim: SupplierClaim): string {
  return `Reporte de No Conformidad, Defecto: ${claim.defectoTitulo || 'Novedad en recepción'}`;
}

/** Quita guiones largos y medios (—, –): se reemplazan por coma para que el texto no parezca generado automáticamente. */
export function stripDashes(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');
}

export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

/** Copia del informe con todos los textos libres sin guiones largos, lista para exportar. */
export function cleanClaimForExport(claim: SupplierClaim): SupplierClaim {
  return {
    ...claim,
    proveedor: stripDashes(claim.proveedor),
    materiaPrima: stripDashes(claim.materiaPrima),
    referencias: stripDashes(claim.referencias),
    lotes: claim.lotes ? stripDashes(claim.lotes) : null,
    defectoTitulo: claim.defectoTitulo ? stripDashes(claim.defectoTitulo) : null,
    observacionInspector: stripDashes(claim.observacionInspector),
    descripcionNc: claim.descripcionNc ? stripDashes(claim.descripcionNc) : null,
    observacionesTecnicas: claim.observacionesTecnicas.map(stripDashes),
    accionesCorrectivas: claim.accionesCorrectivas.map(a => ({ titulo: stripDashes(a.titulo), detalle: stripDashes(a.detalle) })),
    rechazoItems: claim.rechazoItems.map(r => ({ ...r, acabado: stripDashes(r.acabado) })),
    realizadoPor: stripDashes(claim.realizadoPor),
    cargo: claim.cargo ? stripDashes(claim.cargo) : null
  };
}

export interface LoadedImage {
  dataUrl: string;
  bytes: Uint8Array;
  w: number;
  h: number;
  format: 'JPEG' | 'PNG';
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function measureImage(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function blobToLoadedImage(blob: Blob): Promise<LoadedImage> {
  const dataUrl = await readBlobAsDataUrl(blob);
  const dims = await measureImage(dataUrl);
  return { dataUrl, bytes: new Uint8Array(await blob.arrayBuffer()), ...dims, format: blob.type === 'image/png' ? 'PNG' : 'JPEG' };
}

/** Foto del informe leída desde el mismo origen (sin problemas de CORS). */
export async function loadClaimImage(path: string): Promise<LoadedImage | null> {
  try {
    const res = await fetch(`/api/supplier-claims/photo?path=${encodeURIComponent(path)}`);
    return res.ok ? await blobToLoadedImage(await res.blob()) : null;
  } catch {
    return null;
  }
}

export async function loadLogoImage(): Promise<LoadedImage | null> {
  try {
    const res = await fetch('/logo-alco.png');
    return res.ok ? await blobToLoadedImage(await res.blob()) : null;
  } catch {
    return null;
  }
}

export async function loadClaimImages(paths: string[]): Promise<LoadedImage[]> {
  const loaded = await Promise.all(paths.map(loadClaimImage));
  return loaded.filter((i): i is LoadedImage => i !== null);
}

export function safeFileName(claim: SupplierClaim, extension: string): string {
  const safe = (text: string) => text.replace(/[^\w-]+/g, '-').replace(/-+/g, '-');
  return `Informe-NC-${safe(claim.proveedor)}-${safe(claim.referencias)}-${claim.fechaInforme}.${extension}`;
}
