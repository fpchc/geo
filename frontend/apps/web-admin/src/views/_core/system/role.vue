<script lang="ts" setup>
import type { VxeTableGridOptions } from '@frontend/plugins/vxe-table';

import type { MenuOut, RoleOut } from '#/api';

import { computed, nextTick, onMounted, ref } from 'vue';

import {
  Badge,
  confirm,
  Page,
  useVbenModal,
  VbenButton,
} from '@frontend/common-ui';
import { $t } from '@frontend/locales';

// 特例：ElTree 用于菜单分配弹窗的树形勾选，VbenTree API 差异较大暂保留
import { ElTree } from 'element-plus';
// 特例：ElMessage toast 消息服务，统一 UI 无替代
import { ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  assignRoleMenusApi,
  deleteRoleApi,
  getMenuFullTreeApi,
  getRoleListApi,
} from '#/api';

import RoleFormModal from './role-form-modal.vue';

defineOptions({ name: 'SystemRole' });

// ---- 菜单树数据 ----
const menuTree = ref<MenuOut[]>([]);

async function loadMenuTree() {
  const tree = (await getMenuFullTreeApi()) as any;
  menuTree.value = tree ?? [];
}

function flattenTree(nodes: any[]): any[] {
  const result: any[] = [];
  function walk(list: any[]) {
    for (const node of list) {
      result.push(node);
      if (node.children?.length) walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

const flatMenuMap = computed(() => {
  const map = new Map<number, any>();
  for (const node of flattenTree(menuTree.value)) {
    map.set(node.id, node);
  }
  return map;
});

// ---- 列表 Grid ----
const gridOptions: VxeTableGridOptions<RoleOut> = {
  columns: [
    { field: 'id', title: $t('page.system.id'), width: 70 },
    { field: 'code', title: $t('page.system.rolePage.code') },
    { field: 'name', title: $t('page.system.rolePage.name') },
    { field: 'description', title: $t('page.system.rolePage.description') },
    {
      field: 'menu_ids',
      title: $t('page.system.rolePage.menuPermission'),
      minWidth: 200,
      slots: { default: 'menu_ids' },
    },
    {
      title: $t('page.system.action'),
      width: 300,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const res = await getRoleListApi({
          page: page.currentPage,
          page_size: page.pageSize,
          ...formValues,
        });
        return res;
      },
    },
  },
};

const formOptions = {
  schema: [
    {
      component: 'Input' as const,
      fieldName: 'code',
      label: $t('page.system.rolePage.code'),
      componentProps: {
        placeholder: $t('page.system.rolePage.codePlaceholder'),
      },
    },
    {
      component: 'Input' as const,
      fieldName: 'name',
      label: $t('page.system.rolePage.name'),
      componentProps: {
        placeholder: $t('page.system.rolePage.namePlaceholder'),
      },
    },
  ],
};

const [Grid, gridApi] = useVbenVxeGrid<RoleOut>({ gridOptions, formOptions });

// ---- 角色表单 modal ----
const [RoleFormModalComp, roleFormModalApi] = useVbenModal({
  connectedComponent: RoleFormModal,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      await gridApi.query();
      await loadMenuTree();
    }
  },
});

function openCreate() {
  roleFormModalApi.setData({ isEdit: false, menuTree: menuTree.value }).open();
}

function openEdit(row: RoleOut) {
  roleFormModalApi
    .setData({ isEdit: true, row, menuTree: menuTree.value })
    .open();
}

// ---- 分配菜单 modal ----
const menuDialogRoleId = ref(0);
const menuDialogRoleName = ref('');
const menuTreeRef = ref<InstanceType<typeof ElTree>>();

const [MenuModal, menuModalApi] = useVbenModal({
  onConfirm: async () => {
    const checkedKeys = (menuTreeRef.value?.getCheckedKeys() as number[]) ?? [];
    const halfCheckedKeys =
      (menuTreeRef.value?.getHalfCheckedKeys() as number[]) ?? [];
    const allKeys = [...checkedKeys, ...halfCheckedKeys];
    await assignRoleMenusApi(menuDialogRoleId.value, { menu_ids: allKeys });
    ElMessage.success($t('page.system.msg.assignSuccess'));
    menuModalApi.close();
    await gridApi.query();
  },
});

function openMenuDialog(row: RoleOut) {
  menuDialogRoleId.value = row.id;
  menuDialogRoleName.value = row.name;
  menuModalApi.open();
  nextTick(() => {
    menuTreeRef.value?.setCheckedKeys(row.menu_ids ?? []);
  });
}

// ---- 行操作 ----
async function handleDelete(row: RoleOut) {
  await confirm($t('page.system.rolePage.deleteConfirm'));
  await deleteRoleApi(row.id);
  ElMessage.success($t('page.system.msg.deleteSuccess'));
  await gridApi.query();
}

onMounted(() => {
  loadMenuTree();
});
</script>

<template>
  <Page auto-content-height>
    <RoleFormModalComp />
    <!-- 特例：菜单分配弹窗，内嵌 ElTree 树形勾选 -->
    <MenuModal
      :title="
        $t('page.system.rolePage.assignMenuTitle', { 0: menuDialogRoleName })
      "
    >
      <ElTree
        ref="menuTreeRef"
        :data="menuTree"
        default-expand-all
        node-key="id"
        show-checkbox
        :props="{ children: 'children', label: 'name' }"
        class="max-h-96 overflow-auto rounded border p-2"
      />
    </MenuModal>

    <Grid>
      <template #toolbar-tools>
        <VbenButton variant="secondary" size="sm" @click="openCreate">
          {{ $t('page.system.rolePage.add') }}
        </VbenButton>
      </template>

      <template #menu_ids="{ row }">
        <template v-if="(row.menu_ids ?? []).length > 0">
          <Badge
            v-for="menuId in row.menu_ids ?? []"
            :key="menuId"
            variant="secondary"
            class="mb-1 mr-1"
          >
            {{ flatMenuMap.get(menuId)?.name ?? menuId }}
          </Badge>
        </template>
        <span v-else class="text-muted-foreground">
          {{ $t('page.system.rolePage.noPermission') }}
        </span>
      </template>

      <template #action="{ row }">
        <VbenButton
          size="sm"
          variant="default"
          @click="openEdit(row as RoleOut)"
        >
          {{ $t('common.edit') }}
        </VbenButton>
        <VbenButton
          size="sm"
          variant="secondary"
          class="ml-1"
          @click="openMenuDialog(row as RoleOut)"
        >
          {{ $t('page.system.rolePage.assignMenu') }}
        </VbenButton>
        <VbenButton
          size="sm"
          variant="destructive"
          class="ml-1"
          @click="handleDelete(row as RoleOut)"
        >
          {{ $t('common.delete') }}
        </VbenButton>
      </template>
    </Grid>
  </Page>
</template>
