import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:file-text',
      order: 2,
      title: $t('page.content.title'),
      // 目录：子页权限码并集，任一命中即可见（对应菜单 id=2 内容生产）
      authority: ['content:content:list', 'content:setting:query'],
    },
    name: 'Content',
    path: '/content',
    redirect: '/content/studio',
    children: [
      {
        name: 'ContentStudio',
        path: '/content/studio',
        component: () => import('#/views/content/studio/index.vue'),
        meta: {
          icon: 'lucide:pen-line',
          title: $t('page.content.studio'),
          // 内容创作（菜单 id=11）
          authority: ['content:content:list'],
        },
      },
      {
        name: 'ContentManage',
        path: '/content/manage',
        component: () => import('#/views/content/manage/index.vue'),
        meta: {
          icon: 'lucide:library',
          title: $t('page.content.manage'),
          // 内容库（菜单 id=12）
          authority: ['content:content:list'],
        },
      },
      {
        name: 'ContentSetting',
        path: '/content/setting',
        component: () => import('#/views/content/setting/index.vue'),
        meta: {
          icon: 'lucide:settings-2',
          title: $t('page.content.setting'),
          // 内容配置（菜单 id=13）
          authority: ['content:setting:query'],
        },
      },
    ],
  },
];

export default routes;
