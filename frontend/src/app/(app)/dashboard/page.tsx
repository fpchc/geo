import { DashboardView } from '@/components/dashboard/dashboard-view';
import { requireAccess } from '@/lib/navigation/access';

export default async function DashboardPage() {
  const session = await requireAccess('/dashboard');
  const canListAgents =
    session.permissions.includes('*') || session.permissions.includes('content:agent:list');
  const canListContents =
    session.permissions.includes('*') || session.permissions.includes('content:content:list');

  return <DashboardView canListAgents={canListAgents} canListContents={canListContents} />;
}
