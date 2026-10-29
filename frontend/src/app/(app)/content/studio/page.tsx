import { StudioPage } from '@/components/content/studio-page';
import { requireAccess } from '@/lib/navigation/access';

function parseContentId(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseTaskId(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}

export default async function ContentStudioPage({
  searchParams,
}: {
  searchParams: Promise<{
    contentId?: string | string[];
    taskId?: string | string[];
  }>;
}) {
  const session = await requireAccess('/content/studio');
  const canReview =
    session.permissions.includes('*') || session.permissions.includes('content:review:score');
  const canRetain =
    session.permissions.includes('*') ||
    session.permissions.includes('content:content:create') ||
    session.permissions.includes('content:content:generate');
  const { contentId, taskId } = await searchParams;

  return (
    <StudioPage
      canRetain={canRetain}
      canReview={canReview}
      initialContentId={parseContentId(contentId)}
      initialTaskId={parseTaskId(taskId)}
    />
  );
}
