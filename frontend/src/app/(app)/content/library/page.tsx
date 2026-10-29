import { LibraryPage } from '@/components/content/library-page';
import { parseLibraryFilters } from '@/lib/content/library-filters';
import { requireAccess } from '@/lib/navigation/access';

export default async function ContentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    agent?: string | string[];
    keyword?: string | string[];
    page?: string | string[];
    status?: string | string[];
  }>;
}) {
  await requireAccess('/content/library');
  const { status, agent, keyword, page } = await searchParams;

  return <LibraryPage initialFilters={parseLibraryFilters({ status, agent, keyword, page })} />;
}
