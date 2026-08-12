import { NextRequest, NextResponse } from 'next/server';
import { generateProcessQRSVG, generateProcessQRDataURL } from '@/src/lib/qrService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const domain = request.nextUrl.searchParams.get('domain') || request.nextUrl.origin;
    const format = request.nextUrl.searchParams.get('format') || 'svg';

    if (format === 'png') {
      const dataUrl = await generateProcessQRDataURL(slug, { domain });
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const imgBuffer = Buffer.from(base64Data, 'base64');
      return new NextResponse(new Uint8Array(imgBuffer), {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `inline; filename="qr-${slug}.png"`
        }
      });
    }

    const svg = await generateProcessQRSVG(slug, { domain });
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `inline; filename="qr-${slug}.svg"`
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error generando código QR' }, { status: 500 });
  }
}
