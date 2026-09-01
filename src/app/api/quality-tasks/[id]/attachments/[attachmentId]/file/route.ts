import { NextRequest, NextResponse } from 'next/server';
import { getTaskAttachmentBuffer } from '@/src/lib/qualityTaskAttachmentsStore';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const { attachmentId } = await params;
  const file = await getTaskAttachmentBuffer(attachmentId);
  if (!file) {
    return NextResponse.json({ error: 'Adjunto no encontrado.' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`
    }
  });
}
