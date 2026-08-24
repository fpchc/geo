import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 1,
      title: $t('page.system.title'),
    },
    name: 'System',
    path: '/system',
    redirect: '/system/user',
    children: [
      {
        name: 'SystemUser',
        path: '/system/user',
        component: () => import('#/views/_core/system/user.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.system.user'),
        },
      },
      {
        name: 'SystemRole',
        path: '/system/role',
        component: () => import('#/views/_core/system/role.vue'),
        meta: {
          icon: 'lucide:shield',
          title: $t('page.system.role'),
        },
      },
      {
        name: 'SystemMenu',
        path: '/system/menu',
        component: () => import('#/views/_core/system/menu.vue'),
        meta: {
          icon: 'lucide:menu',
          title: $t('page.system.menu'),
        },
      },
    ],
  },
];

export default routes;
