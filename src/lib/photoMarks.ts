/**
 * Marcas sobre las fotos del informe (círculo, recuadro y flecha). Se guardan
 * como vectores normalizados (0 a 1 sobre el ancho/alto de la foto), así la
 * foto original no se altera, se pueden editar y se dibujan igual en la
 * pantalla (SVG) y en el PDF/Word (canvas).
 */

export type MarkType = 'circle' | 'rect' | 'arrow' | 'label';

export interface PhotoMark {
  type: MarkType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Solo para type 'label': texto de la etiqueta; (x1, y1) es su esquina superior izquierda. */
  text?: string;
}

export interface PhotoMeta {
  comentario: string;
  marcas: PhotoMark[];
}

export const MARK_COLOR = '#E11D2E';

/** Grosor de línea proporcional al tamaño de la foto, para que se vea igual en miniatura y en el documento. */
export function markStrokeWidth(w: number, h: number): number {
  return Math.max(3, Math.max(w, h) * 0.007);
}

/** Puntos de la punta de la flecha (triángulo) en coordenadas de la foto. */
export function arrowHead(mark: PhotoMark, w: number, h: number): [number, number][] {
  const x1 = mark.x1 * w;
  const y1 = mark.y1 * h;
  const x2 = mark.x2 * w;
  const y2 = mark.y2 * h;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = Math.max(14, Math.max(w, h) * 0.035);
  const spread = Math.PI / 7;
  return [
    [x2, y2],
    [x2 - size * Math.cos(angle - spread), y2 - size * Math.sin(angle - spread)],
    [x2 - size * Math.cos(angle + spread), y2 - size * Math.sin(angle + spread)]
  ];
}

export function isMeaningfulMark(mark: PhotoMark): boolean {
  if (mark.type === 'label') return Boolean(mark.text?.trim());
  return Math.abs(mark.x2 - mark.x1) > 0.01 || Math.abs(mark.y2 - mark.y1) > 0.01;
}

let measureCtx: CanvasRenderingContext2D | null = null;

export interface LabelLayout {
  x: number;
  y: number;
  boxW: number;
  boxH: number;
  fontSize: number;
  pad: number;
  lines: string[];
}

/** Calcula el recuadro de una etiqueta de texto (ajusta el texto en varias líneas y la mantiene dentro de la foto). */
export function labelLayout(mark: PhotoMark, w: number, h: number): LabelLayout {
  const fontSize = Math.max(14, Math.max(w, h) * 0.034);
  const pad = fontSize * 0.45;
  const maxTextW = w * 0.5;
  if (!measureCtx && typeof document !== 'undefined') measureCtx = document.createElement('canvas').getContext('2d');
  const measure = (text: string) => {
    if (!measureCtx) return text.length * fontSize * 0.55;
    measureCtx.font = `${fontSize}px Arial, sans-serif`;
    return measureCtx.measureText(text).width;
  };

  const lines: string[] = [];
  let current = '';
  (mark.text || '').split(/\s+/).filter(Boolean).forEach(word => {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measure(candidate) <= maxTextW) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);

  const boxW = Math.max(...lines.map(measure), 1) + pad * 2;
  const boxH = lines.length * fontSize * 1.25 + pad * 2;
  return {
    x: Math.min(Math.max(mark.x1 * w, 0), Math.max(w - boxW, 0)),
    y: Math.min(Math.max(mark.y1 * h, 0), Math.max(h - boxH, 0)),
    boxW,
    boxH,
    fontSize,
    pad,
    lines
  };
}

export function drawMarksOnCanvas(ctx: CanvasRenderingContext2D, marks: PhotoMark[], w: number, h: number): void {
  ctx.strokeStyle = MARK_COLOR;
  ctx.fillStyle = MARK_COLOR;
  ctx.lineWidth = markStrokeWidth(w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  marks.forEach(mark => {
    const x1 = mark.x1 * w;
    const y1 = mark.y1 * h;
    const x2 = mark.x2 * w;
    const y2 = mark.y2 * h;
    ctx.beginPath();
    if (mark.type === 'label') {
      const box = labelLayout(mark, w, h);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = Math.max(2, box.fontSize * 0.07);
      ctx.fillRect(box.x, box.y, box.boxW, box.boxH);
      ctx.strokeRect(box.x, box.y, box.boxW, box.boxH);
      ctx.fillStyle = '#111111';
      ctx.font = `${box.fontSize}px Arial, sans-serif`;
      ctx.textBaseline = 'top';
      box.lines.forEach((line, i) => ctx.fillText(line, box.x + box.pad, box.y + box.pad + i * box.fontSize * 1.25));
      ctx.fillStyle = MARK_COLOR;
      ctx.strokeStyle = MARK_COLOR;
      ctx.lineWidth = markStrokeWidth(w, h);
    } else if (mark.type === 'rect') {
      ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.stroke();
    } else if (mark.type === 'circle') {
      ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const [tip, left, right] = arrowHead(mark, w, h);
      ctx.beginPath();
      ctx.moveTo(tip[0], tip[1]);
      ctx.lineTo(left[0], left[1]);
      ctx.lineTo(right[0], right[1]);
      ctx.closePath();
      ctx.fill();
    }
  });
}
