import { NextRequest, NextResponse } from 'next/server';
import { deleteTaskAttachment } from '@/src/lib/qualityTaskAttachmentsStore';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const { attachmentId } = await params;
  const result = await deleteTaskAttachment(attachmentId);
  if (!result.success) {
    return NextResponse.json({ error: 'No se pudo eliminar la imagen.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
