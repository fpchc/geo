import { RolesPage } from '@/components/system/roles-page';
import { requireAccess } from '@/lib/navigation/access';

export default async function SystemRolesPage() {
  const session = await requireAccess('/system/roles');

  return <RolesPage permissions={session.permissions} />;
}
