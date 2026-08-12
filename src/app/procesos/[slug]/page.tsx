import { ProcessDetail } from '@/src/components/ProcessDetail';

export default async function ProcessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProcessDetail slug={slug} />;
}
