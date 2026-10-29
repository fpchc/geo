import { UsersPage } from '@/components/system/users/users-page';
import { requireAccess } from '@/lib/navigation/access';

export default async function SystemUsersPage() {
  const session = await requireAccess('/system/users');
  const can = (permission: string) =>
    session.permissions.includes('*') || session.permissions.includes(permission);

  return (
    <UsersPage
      currentUserId={session.user_id}
      canCreate={can('system:user:create')}
      canUpdate={can('system:user:update')}
      canDelete={can('system:user:delete')}
      canReset={can('system:user:resetpwd')}
      canAssign={can('system:user:assign')}
      canManageSuperuser={session.permissions.includes('*')}
    />
  );
}
