/**
 * Prepara una firma dibujada para guardarla: la recorta a su trazo (con un margen) y la reduce hasta que la imagen
 * sea liviana, así no se guarda en la base de datos un lienzo completo casi vacío. Solo funciona en el navegador.
 */

const PADDING_PX = 10;
const MAX_WIDTH_PX = 480;
// Tope del data URL guardado; coincide con el que valida el servidor (MAX_SIGNATURE_CHARS).
const MAX_DATA_URL_CHARS = 50000;
const ALPHA_THRESHOLD = 8;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la firma.'));
    img.src = dataUrl;
  });
}

/** Rectángulo mínimo que contiene los píxeles con tinta; null si el lienzo está vacío. */
function inkBounds(ctx: CanvasRenderingContext2D, width: number, height: number): { x: number; y: number; w: number; h: number } | null {
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const x = Math.max(0, minX - PADDING_PX);
  const y = Math.max(0, minY - PADDING_PX);
  return { x, y, w: Math.min(width, maxX + PADDING_PX) - x, h: Math.min(height, maxY + PADDING_PX) - y };
}

export async function compactSignature(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const source = document.createElement('canvas');
  source.width = img.naturalWidth;
  source.height = img.naturalHeight;
  const sourceCtx = source.getContext('2d');
  if (!sourceCtx) throw new Error('No se pudo preparar la firma.');
  sourceCtx.drawImage(img, 0, 0);

  const bounds = inkBounds(sourceCtx, source.width, source.height);
  if (!bounds) throw new Error('Dibuja tu firma antes de guardarla.');

  let scale = Math.min(1, MAX_WIDTH_PX / bounds.w);
  for (let attempt = 0; attempt < 5; attempt++) {
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(bounds.w * scale));
    out.height = Math.max(1, Math.round(bounds.h * scale));
    out.getContext('2d')?.drawImage(source, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, out.width, out.height);
    const result = out.toDataURL('image/png');
    if (result.length <= MAX_DATA_URL_CHARS) return result;
    scale *= 0.75;
  }
  throw new Error('La firma es demasiado compleja. Hazla más simple y vuelve a intentar.');
}
