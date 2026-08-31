import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { createImprovement, getPublicImprovements } from '@/src/lib/processImprovementsStore';

// Pública — para que el propio colaborador vea que su idea quedó registrada
// y en qué va (sin las rechazadas, ver processImprovementsStore).
export async function GET(request: NextRequest) {
  await ensureHydrated();
  const processSlug = request.nextUrl.searchParams.get('processSlug');
  if (!processSlug) {
    return NextResponse.json({ error: 'Se requiere el parámetro processSlug.' }, { status: 400 });
  }

  const improvements = await getPublicImprovements(processSlug);
  return NextResponse.json({ success: true, improvements, total: improvements.length });
}

// Pública, sin cuenta de usuario: cualquiera puede proponer una mejora.
export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const { processSlug, title, description, relatedCriterion, authorName } = await request.json();

    if (!processSlug || typeof processSlug !== 'string') {
      return NextResponse.json({ error: 'Se requiere processSlug.' }, { status: 400 });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Se requiere un título breve para tu idea.' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Se requiere describir la mejora que propones.' }, { status: 400 });
    }
    if (description.trim().length > 2000) {
      return NextResponse.json({ error: 'La descripción es demasiado larga (máximo 2000 caracteres).' }, { status: 400 });
    }

    const result = await createImprovement({ processSlug, title, description, relatedCriterion, authorName });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo enviar tu propuesta.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Gracias — tu propuesta quedó registrada y Calidad la va a revisar.',
      improvement: result.improvement
    });
  } catch (err: any) {
    console.error('Error creando propuesta de mejora:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
