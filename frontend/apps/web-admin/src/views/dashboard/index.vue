<script lang="ts" setup>
import { Page } from '@frontend/common-ui';

defineOptions({ name: 'Dashboard' });

const stats = [
  { title: '用户数', value: 1280 },
  { title: '角色数', value: 15 },
  { title: '菜单数', value: 45 },
  { title: '在线用户', value: 8 },
];
</script>

<template>
  <Page title="仪表盘" description="欢迎使用管理系统">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="s in stats"
        :key="s.title"
        class="rounded-[var(--radius)] border bg-card p-5 shadow-sm"
      >
        <div class="text-sm text-muted-foreground">{{ s.title }}</div>
        <div class="mt-1 text-2xl font-semibold text-card-foreground">
          {{ s.value }}
        </div>
      </div>
    </div>
  </Page>
</template>
