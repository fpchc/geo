import { MenusPage } from '@/components/system/menus-page';
import { requireAccess } from '@/lib/navigation/access';

export default async function SystemMenusPage() {
  const session = await requireAccess('/system/menus');

  return <MenusPage permissions={session.permissions} />;
}
