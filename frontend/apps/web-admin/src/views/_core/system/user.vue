<script lang="ts" setup>
import type { VxeTableGridOptions } from '@frontend/plugins/vxe-table';

import type { RoleOut, UserOut } from '#/api';

import { onMounted, ref } from 'vue';

import {
  Badge,
  confirm,
  Page,
  useVbenModal,
  VbenButton,
} from '@frontend/common-ui';
import { $t } from '@frontend/locales';

// 特例：ElMessage 为 toast 消息服务，统一 UI 无 toast 替代
import { ElMessage } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  assignUserRolesApi,
  deleteUserApi,
  getRoleListApi,
  getUserListApi,
  resetUserPasswordApi,
} from '#/api';

import UserFormModal from './user-form-modal.vue';

defineOptions({ name: 'SystemUser' });

// ---- 角色列表 ----
const allRoles = ref<RoleOut[]>([]);

async function loadAllRoles() {
  const res = await getRoleListApi({ page: 1, page_size: 100 });
  allRoles.value = res.items;
}

// ---- 列表 Grid ----
const gridOptions: VxeTableGridOptions<UserOut> = {
  columns: [
    { field: 'id', title: $t('page.system.id'), width: 70 },
    { field: 'username', title: $t('page.system.userPage.username') },
    { field: 'nickname', title: $t('page.system.userPage.nickname') },
    { field: 'email', title: $t('page.system.userPage.email') },
    { field: 'phone', title: $t('page.system.userPage.phone') },
    {
      field: 'is_active',
      title: $t('page.system.userPage.status'),
      width: 80,
      slots: { default: 'status' },
    },
    {
      field: 'is_superuser',
      title: $t('page.system.userPage.superAdmin'),
      width: 100,
      slots: { default: 'superuser' },
    },
    {
      title: $t('page.system.action'),
      width: 360,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const res = await getUserListApi({
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
      fieldName: 'username',
      label: $t('page.system.userPage.username'),
      componentProps: {
        placeholder: $t('page.system.userPage.searchPlaceholder'),
      },
    },
  ],
};

const [Grid, gridApi] = useVbenVxeGrid<UserOut>({ gridOptions, formOptions });

// ---- 用户表单 modal ----
const [UserFormModalComp, userFormModalApi] = useVbenModal({
  connectedComponent: UserFormModal,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      await gridApi.query();
    }
  },
});

function openCreate() {
  userFormModalApi.setData({ isEdit: false, allRoles: allRoles.value }).open();
}

function openEdit(row: UserOut) {
  userFormModalApi
    .setData({ isEdit: true, row, allRoles: allRoles.value })
    .open();
}

// ---- 分配角色 modal ----
const roleDialogUserId = ref(0);
const roleDialogUsername = ref('');
const selectedRoleIds = ref<number[]>([]);

const [RoleModal, roleModalApi] = useVbenModal({
  onConfirm: async () => {
    await assignUserRolesApi(roleDialogUserId.value, {
      role_ids: selectedRoleIds.value,
    });
    ElMessage.success($t('page.system.msg.assignSuccess'));
    roleModalApi.close();
    await gridApi.query();
  },
  onOpenChange: (isOpen) => {
    if (!isOpen) {
      selectedRoleIds.value = [];
    }
  },
});

function openRoleDialog(row: UserOut) {
  roleDialogUserId.value = row.id;
  roleDialogUsername.value = row.username;
  selectedRoleIds.value = [...(row.role_ids ?? [])];
  roleModalApi.open();
}

// ---- 行操作 ----
async function handleDelete(row: UserOut) {
  await confirm($t('page.system.userPage.deleteConfirm'));
  await deleteUserApi(row.id);
  ElMessage.success($t('page.system.msg.deleteSuccess'));
  await gridApi.query();
}

async function handleResetPwd(row: UserOut) {
  await resetUserPasswordApi(row.id, { new_password: '123456' });
  ElMessage.success($t('page.system.msg.resetPwdSuccess', { 0: '123456' }));
}

onMounted(() => {
  loadAllRoles();
});
</script>

<template>
  <Page auto-content-height>
    <UserFormModalComp />
    <RoleModal
      :title="
        $t('page.system.userPage.assignRoleTitle', { 0: roleDialogUsername })
      "
    >
      <div class="flex flex-col gap-2">
        <label
          v-for="role in allRoles"
          :key="role.id"
          class="flex items-center gap-2"
        >
          <input
            v-model="selectedRoleIds"
            type="checkbox"
            :value="role.id"
            class="accent-primary"
          />
          <span>{{ role.name }}</span>
          <span class="text-xs text-muted-foreground">({{ role.code }})</span>
        </label>
      </div>
    </RoleModal>

    <Grid>
      <template #toolbar-tools>
        <VbenButton variant="secondary" size="sm" @click="openCreate">
          {{ $t('page.system.userPage.add') }}
        </VbenButton>
      </template>

      <template #status="{ row }">
        <Badge :variant="row.is_active ? 'default' : 'destructive'">
          {{
            row.is_active ? $t('page.system.userPage.active') : $t('common.no')
          }}
        </Badge>
      </template>

      <template #superuser="{ row }">
        <Badge v-if="row.is_superuser" variant="secondary">
          {{ $t('common.yes') }}
        </Badge>
        <span v-else class="text-muted-foreground">{{ $t('common.no') }}</span>
      </template>

      <template #action="{ row }">
        <span v-if="row.is_superuser" class="text-muted-foreground text-sm">
          --
        </span>
        <template v-else>
          <VbenButton
            size="sm"
            variant="default"
            @click="openEdit(row as UserOut)"
          >
            {{ $t('common.edit') }}
          </VbenButton>
          <VbenButton
            size="sm"
            variant="secondary"
            class="ml-1"
            @click="openRoleDialog(row as UserOut)"
          >
            {{ $t('page.system.userPage.assignRole') }}
          </VbenButton>
          <VbenButton
            size="sm"
            variant="ghost"
            class="ml-1"
            @click="handleResetPwd(row as UserOut)"
          >
            {{ $t('page.system.userPage.resetPwd') }}
          </VbenButton>
          <VbenButton
            size="sm"
            variant="destructive"
            class="ml-1"
            @click="handleDelete(row as UserOut)"
          >
            {{ $t('common.delete') }}
          </VbenButton>
        </template>
      </template>
    </Grid>
  </Page>
</template>
