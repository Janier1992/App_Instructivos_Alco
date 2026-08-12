import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { processQualityQueryServer } from '@/src/lib/geminiClient';
import { getCustomRagDocuments } from '@/src/lib/customRagStore';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const { processSlug, question, customPrompt } = await request.json();
    if (!question) {
      return NextResponse.json({ error: 'El campo "question" es obligatorio.' }, { status: 400 });
    }

    const result = await processQualityQueryServer(
      processSlug || 'corte-perfileria',
      question,
      [],
      customPrompt
    );

    const customPdfs = getCustomRagDocuments(processSlug);

    return NextResponse.json({
      success: true,
      query: question,
      processSlug: processSlug || 'corte-perfileria',
      reply: result.reply,
      classification: result.classification,
      sources: result.sourceReferences,
      customPdfDocsCount: customPdfs.length,
      customPdfsUsed: customPdfs.map(d => ({ title: d.title, fileName: d.fileName, code: d.code }))
    });
  } catch (err: any) {
    console.error('Error en consulta RAG Sandbox:', err);
    return NextResponse.json({ error: err.message || 'Error al procesar consulta RAG.' }, { status: 500 });
  }
}
