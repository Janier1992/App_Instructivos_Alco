import { NextRequest, NextResponse } from 'next/server';
import { updateSupplierClaim, deleteSupplierClaim, validateClaimInput, SupplierClaimInput } from '@/src/lib/supplierClaimsStore';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: SupplierClaimInput = await request.json();

  const validationError = validateClaimInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const result = await updateSupplierClaim(id, body);
  if (!result.success) return NextResponse.json({ error: result.error || 'No se pudo actualizar el informe.' }, { status: 500 });
  return NextResponse.json({ success: true, claim: result.claim });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteSupplierClaim(id);
  if (!result.success) return NextResponse.json({ error: 'No se pudo eliminar el informe.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
