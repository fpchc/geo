import { notFound } from 'next/navigation';
import { ContentDetailView } from '@/components/content/content-detail-view';
import { requireAccess } from '@/lib/navigation/access';

function parseContentId(value: string): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess('/content/library');
  const { id } = await params;
  const contentId = parseContentId(id);

  if (!contentId) {
    notFound();
  }

  return <ContentDetailView contentId={contentId} />;
}
