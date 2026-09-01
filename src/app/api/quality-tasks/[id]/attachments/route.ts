import { NextRequest, NextResponse } from 'next/server';
import { getTaskAttachments, addTaskAttachment, MAX_ATTACHMENT_BYTES } from '@/src/lib/qualityTaskAttachmentsStore';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attachments = await getTaskAttachments(id);
  return NextResponse.json({ success: true, attachments });
}

// Subida directa (no signed URL): las imágenes están topadas a 3 MB, muy
// por debajo del límite de 4.5 MB por request de las funciones serverless
// de Vercel, así que no hace falta el mecanismo de subida firmada que usan
// Documentos y Videos.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Se requiere un archivo.' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes.' }, { status: 400 });
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: 'La imagen supera el límite de 3 MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await addTaskAttachment({
      taskId: id,
      fileBuffer: Buffer.from(arrayBuffer),
      fileName: file.name,
      contentType: file.type
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'No se pudo subir la imagen.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, attachment: result.attachment });
  } catch (err: any) {
    console.error('Error subiendo adjunto de tarea:', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
