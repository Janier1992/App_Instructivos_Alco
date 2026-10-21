import { NextRequest, NextResponse } from 'next/server';
import { ensureHydrated } from '@/src/lib/hydrate';
import { getSupplierClaims, createSupplierClaim, validateClaimInput, SupplierClaimInput } from '@/src/lib/supplierClaimsStore';

/** Pública — lista de informes de reclamo a proveedores, desde el módulo de Control Calidad. */
export async function GET() {
  await ensureHydrated();
  const claims = await getSupplierClaims();
  return NextResponse.json({ success: true, claims });
}

export async function POST(request: NextRequest) {
  await ensureHydrated();

  try {
    const body: SupplierClaimInput = await request.json();
    const validationError = validateClaimInput(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const result = await createSupplierClaim(body);
    if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo guardar el informe.' }, { status: 500 });

    return NextResponse.json({ success: true, claim: result.claim });
  } catch (err: any) {
    console.error('Error creando informe de reclamo a proveedor:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
