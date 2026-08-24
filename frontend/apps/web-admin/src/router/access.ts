import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@frontend/types';

import { generateAccessible } from '@frontend/access';
import { preferences } from '@frontend/preferences';

import { ElMessage } from 'element-plus';

import { getMenuNavTreeApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      ElMessage({
        duration: 1500,
        message: `${$t('common.loadingMenu')}...`,
      });
      return (await getMenuNavTreeApi()) as any;
    },
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
