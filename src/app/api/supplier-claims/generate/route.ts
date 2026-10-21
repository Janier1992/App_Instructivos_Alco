import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/src/lib/supabaseService';
import { SUPPLIER_CLAIM_PHOTO_BUCKET } from '@/src/lib/supplierClaimsStore';
import { generateSupplierClaimDraft } from '@/src/lib/supplierClaimAi';

export const maxDuration = 60;

const PATH_PATTERN = /^claim-[\w-]+\.(jpe?g|png|webp)$/;
const MAX_IMAGES_FOR_AI = 4;

function mimeFromPath(path: string): string {
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/** Pública — redacta el texto del informe con Gemini a partir de la novedad del inspector y las fotos del defecto ya subidas. */
export async function POST(request: NextRequest) {
  try {
    const { proveedor, materiaPrima, referencias, lotes, observacionInspector, fotoDefectoPaths } = await request.json();
    if (!proveedor || !materiaPrima || !referencias || !observacionInspector?.trim()) {
      return NextResponse.json({ error: 'Se requiere proveedor, materia prima, referencia y la novedad encontrada.' }, { status: 400 });
    }

    const images: { buffer: Buffer; mimeType: string }[] = [];
    const supabase = getSupabaseClient();
    const paths: string[] = Array.isArray(fotoDefectoPaths) ? fotoDefectoPaths.filter((p: unknown) => typeof p === 'string' && PATH_PATTERN.test(p)) : [];

    if (supabase) {
      for (const path of paths.slice(0, MAX_IMAGES_FOR_AI)) {
        const { data } = await supabase.storage.from(SUPPLIER_CLAIM_PHOTO_BUCKET).download(path);
        if (data) images.push({ buffer: Buffer.from(await data.arrayBuffer()), mimeType: mimeFromPath(path) });
      }
    }

    const draft = await generateSupplierClaimDraft({ proveedor, materiaPrima, referencias, lotes: lotes || '', observacionInspector, images });
    return NextResponse.json({ success: true, draft });
  } catch (err: any) {
    console.error('Error generando informe de reclamo a proveedor:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
