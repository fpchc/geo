<script lang="ts" setup>
import type { MenuOut } from '#/api';

import { onMounted, ref } from 'vue';

import {
  Badge,
  confirm,
  Page,
  useVbenModal,
  VbenButton,
} from '@frontend/common-ui';
import { $t } from '@frontend/locales';

// 特例：树形表格无分页，属于 05-comp-table 规范允许的特例
import { ElTable, ElTableColumn } from 'element-plus';
// 特例：ElMessage toast 消息服务，统一 UI 无替代
import { ElMessage } from 'element-plus';

import { deleteMenuApi, getMenuFullTreeApi } from '#/api';

import MenuFormModal from './menu-form-modal.vue';

defineOptions({ name: 'SystemMenu' });

// ---- 树形数据 ----
const loading = ref(false);
const tree = ref<MenuOut[]>([]);

async function loadTree() {
  loading.value = true;
  try {
    tree.value = (await getMenuFullTreeApi()) as any;
  } finally {
    loading.value = false;
  }
}

function buildParentOptions() {
  return [
    { label: $t('page.system.menuPage.topMenu'), value: 0 },
    ...tree.value.map((m) => ({ label: m.name, value: m.id })),
  ];
}

// ---- 菜单表单 modal ----
const [MenuFormModalComp, menuFormModalApi] = useVbenModal({
  connectedComponent: MenuFormModal,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      await loadTree();
    }
  },
});

function openCreate(parentId = 0) {
  menuFormModalApi
    .setData({
      isEdit: false,
      parentId,
      parentOptions: buildParentOptions(),
    })
    .open();
}

function openEdit(row: MenuOut) {
  menuFormModalApi
    .setData({
      isEdit: true,
      parentId: 0,
      parentOptions: buildParentOptions(),
      row,
    })
    .open();
}

// ---- 删除 ----
async function handleDelete(row: MenuOut) {
  await confirm($t('page.system.menuPage.deleteConfirm'));
  await deleteMenuApi(row.id);
  ElMessage.success($t('page.system.msg.deleteSuccess'));
  loadTree();
}

// ---- 类型映射 ----
const typeMap: Record<number, string> = {
  0: $t('page.system.menuPage.typeDir'),
  1: $t('page.system.menuPage.typeMenu'),
  2: $t('page.system.menuPage.typeButton'),
};
const typeVariantMap: Record<number, string> = {
  0: 'secondary',
  1: 'default',
  2: 'secondary',
};

onMounted(() => loadTree());
</script>

<template>
  <Page
    :title="$t('page.system.menu')"
    :description="$t('page.system.menuPage.description')"
  >
    <MenuFormModalComp />

    <div class="rounded-[var(--radius)] border bg-card p-4">
      <div class="mb-4">
        <VbenButton variant="secondary" size="sm" @click="openCreate(0)">
          {{ $t('page.system.menuPage.addTop') }}
        </VbenButton>
      </div>

      <!-- 特例：树形表格，useVbenVxeGrid 不适用于树形数据展示 -->
      <ElTable
        v-loading="loading"
        :data="tree"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        border
        row-key="id"
        stripe
      >
        <ElTableColumn
          :label="$t('page.system.menuPage.name')"
          prop="name"
          min-width="200"
        />
        <ElTableColumn
          :label="$t('page.system.menuPage.type')"
          prop="type"
          width="80"
        >
          <template #default="{ row }">
            <Badge :variant="typeVariantMap[row.type] as any">
              {{ typeMap[row.type] ?? row.type }}
            </Badge>
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('page.system.menuPage.path')"
          prop="path"
          width="150"
        />
        <ElTableColumn
          :label="$t('page.system.menuPage.icon')"
          prop="icon"
          width="80"
        />
        <ElTableColumn
          :label="$t('page.system.menuPage.permCode')"
          prop="perm_code"
          width="150"
        />
        <ElTableColumn
          :label="$t('page.system.menuPage.order')"
          prop="order_no"
          width="70"
        />
        <ElTableColumn :label="$t('page.system.menuPage.visible')" width="70">
          <template #default="{ row }">
            <Badge :variant="row.visible ? 'default' : 'secondary'">
              {{ row.visible ? $t('common.yes') : $t('common.no') }}
            </Badge>
          </template>
        </ElTableColumn>
        <ElTableColumn
          :label="$t('page.system.action')"
          width="240"
          fixed="right"
        >
          <template #default="{ row }">
            <VbenButton
              v-if="row.type !== 2"
              size="sm"
              variant="ghost"
              @click="openCreate(row.id)"
            >
              {{ $t('page.system.menuPage.addChild') }}
            </VbenButton>
            <VbenButton
              size="sm"
              variant="default"
              class="ml-1"
              @click="openEdit(row as MenuOut)"
            >
              {{ $t('common.edit') }}
            </VbenButton>
            <VbenButton
              size="sm"
              variant="destructive"
              class="ml-1"
              @click="handleDelete(row as MenuOut)"
            >
              {{ $t('common.delete') }}
            </VbenButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>
  </Page>
</template>
