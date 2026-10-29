import { ContentSettingsPage } from '@/components/content/content-settings-page';
import { requireAccess } from '@/lib/navigation/access';

export default async function ContentSettingsPageRoute() {
  const session = await requireAccess('/content/settings');
  const canUpdate =
    session.permissions.includes('*') || session.permissions.includes('content:setting:update');

  return <ContentSettingsPage canUpdate={canUpdate} />;
}
