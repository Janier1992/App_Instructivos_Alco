import { getGeminiClient } from './geminiClient';

/**
 * Convierte un PDF a Markdown para la Base de Conocimiento: extrae texto
 * normal página por página (rápido, gratis) y, solo en las páginas con
 * poco texto — típicamente diagramas, cortes de sección, tablas dibujadas
 * con líneas vectoriales — renderiza la página como imagen y le pide a
 * Gemini (visión) que la transcriba a Markdown. Así no se paga el costo de
 * visión en páginas de puro texto, que ya se extraen bien solas.
 *
 * Verificado contra un PDF real de fichas técnicas de Alco: páginas de
 * descripción extraen 1000+ caracteres de texto limpio; páginas de cortes
 * de sección (dimensiones en un plano) extraen menos de 250 caracteres —
 * ese es el umbral usado para decidir qué página necesita visión.
 */

const LOW_TEXT_THRESHOLD = 250;
const MAX_VISION_PAGES = 40;
const VISION_CONCURRENCY = 5;
const VISION_MODEL = 'gemini-3.6-flash';

const VISION_PROMPT = `Transcribe TODO el contenido visible de esta página a Markdown limpio y estructurado. Es una página de una ficha técnica o instructivo de manufactura de ventanas/puertas de aluminio.

Reglas:
- Si hay una tabla (aunque no tenga bordes dibujados, o esté implícita en la alineación), transcríbela como tabla Markdown real (con | separadores), nunca como texto suelto.
- Si es un plano o corte de sección con cotas/dimensiones, describe cada pieza etiquetada (ej. "Jamba", "Cabezal", "Divisor", "Sillar") junto con TODOS los valores numéricos y sus unidades que aparezcan asociados a ella — no omitas ningún número visible.
- Conserva nombres de piezas, códigos, materiales y unidades exactamente como aparecen.
- No inventes ni completes valores que no puedas leer con certeza — si un número es ilegible, escribe "[ilegible]" en su lugar en vez de adivinar.
- No agregues comentarios, interpretaciones ni texto que no esté en la página. Responde solo con el Markdown transcrito, sin explicaciones adicionales.`;

export interface KnowledgeExtractionResult {
  markdown: string;
  pageCount: number;
  visionPagesUsed: number;
  visionPagesSkipped: number;
}

async function transcribePageImage(imageBuffer: Uint8Array): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/png', data: Buffer.from(imageBuffer).toString('base64') } },
            { text: VISION_PROMPT }
          ]
        }
      ]
    });
    return response.text?.trim() || null;
  } catch (err: any) {
    console.warn('⚠️ Error transcribiendo página por visión:', err?.message || err);
    return null;
  }
}

async function transcribeInBatches(pageNumbers: number[], render: (pageNum: number) => Promise<Uint8Array | null>): Promise<Map<number, string>> {
  const results = new Map<number, string>();

  for (let i = 0; i < pageNumbers.length; i += VISION_CONCURRENCY) {
    const batch = pageNumbers.slice(i, i + VISION_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async pageNum => {
        const image = await render(pageNum);
        if (!image) return null;
        const markdown = await transcribePageImage(image);
        return markdown ? { pageNum, markdown } : null;
      })
    );
    for (const r of batchResults) {
      if (r) results.set(r.pageNum, r.markdown);
    }
  }

  return results;
}

export async function extractMarkdownFromPdf(fileBuffer: Buffer, forceVisionAllPages = false): Promise<KnowledgeExtractionResult> {
  const { CanvasFactory } = await import('pdf-parse/worker');
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: fileBuffer, CanvasFactory });

  try {
    const textResult = await parser.getText();
    const pageCount = textResult.total || textResult.pages.length;

    // El umbral de caracteres detecta páginas casi en blanco (diagramas
    // puros), pero no una tabla densa cuyo texto extraído queda en el orden
    // equivocado (columnas mezcladas) — ahí la cantidad de texto es alta
    // pero el contenido queda inservible. Calidad puede forzar visión en
    // todas las páginas para ese caso, sin depender del umbral automático.
    const candidatePages = forceVisionAllPages
      ? textResult.pages.map(p => p.num)
      : textResult.pages.filter(p => p.text.trim().length < LOW_TEXT_THRESHOLD).map(p => p.num);

    const pagesToProcess = candidatePages.slice(0, MAX_VISION_PAGES);
    const visionPagesSkipped = Math.max(0, candidatePages.length - pagesToProcess.length);

    const visionResults = pagesToProcess.length > 0
      ? await transcribeInBatches(pagesToProcess, async pageNum => {
          try {
            const shot = await parser.getScreenshot({ partial: [pageNum], scale: 2.0, imageBuffer: true, imageDataUrl: false });
            return shot.pages[0]?.data || null;
          } catch (err: any) {
            console.warn(`⚠️ Error renderizando página ${pageNum} para visión:`, err?.message || err);
            return null;
          }
        })
      : new Map<number, string>();

    const sections: string[] = [];
    for (const page of textResult.pages) {
      const visionMarkdown = visionResults.get(page.num);
      if (visionMarkdown) {
        sections.push(`## Página ${page.num}\n\n${visionMarkdown}`);
      } else if (page.text.trim()) {
        sections.push(`## Página ${page.num}\n\n${page.text.trim()}`);
      }
    }

    return {
      markdown: sections.join('\n\n---\n\n'),
      pageCount,
      visionPagesUsed: visionResults.size,
      visionPagesSkipped
    };
  } finally {
    await parser.destroy();
  }
}
