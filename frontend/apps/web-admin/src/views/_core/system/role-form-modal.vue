<script lang="ts" setup>
import type { MenuOut, RoleCreate, RoleOut } from '#/api';

import { nextTick, ref } from 'vue';

import { useVbenModal } from '@frontend/common-ui';
import { $t } from '@frontend/locales';

// 特例：ElTree 用于表单内嵌的菜单树形勾选，VbenTree API 差异较大暂保留
import { ElTree } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createRoleApi, updateRoleApi } from '#/api';

interface ModalData {
  isEdit: boolean;
  menuTree: MenuOut[];
  row?: RoleOut;
}

const isEdit = ref(false);
const editId = ref(0);
const menuTree = ref<MenuOut[]>([]);
const formTreeRef = ref<InstanceType<typeof ElTree>>();

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();

    const checkedKeys = (formTreeRef.value?.getCheckedKeys() as number[]) ?? [];
    const halfCheckedKeys =
      (formTreeRef.value?.getHalfCheckedKeys() as number[]) ?? [];
    const menuIds = [...checkedKeys, ...halfCheckedKeys];

    try {
      if (isEdit.value) {
        await updateRoleApi(editId.value, {
          name: values.name,
          description: values.description || null,
        });
      } else {
        await createRoleApi({
          ...values,
          menu_ids: menuIds,
        } as unknown as RoleCreate);
      }
    } finally {
      modalApi.close();
    }
  },
  onOpenChange: async (isOpen) => {
    if (isOpen) {
      const data = modalApi.getData<ModalData>();
      if (!data) return;
      isEdit.value = data.isEdit;
      menuTree.value = data.menuTree;
      if (data.isEdit && data.row) {
        editId.value = data.row.id;
        await formApi.setValues({
          code: data.row.code,
          name: data.row.name,
          description: data.row.description || '',
        });
        await nextTick();
        formTreeRef.value?.setCheckedKeys(data.row.menu_ids ?? []);
      } else {
        editId.value = 0;
        await formApi.reset({
          values: { code: '', name: '', description: '' },
        });
        await nextTick();
        formTreeRef.value?.setCheckedKeys([]);
      }
    }
  },
});

const [Form, formApi] = useVbenForm({
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
  schema: [
    {
      component: 'Input',
      fieldName: 'code',
      label: $t('page.system.rolePage.code'),
      rules: 'required',
      componentProps: () => ({
        disabled: isEdit.value,
        placeholder: $t('page.system.rolePage.codeTip'),
      }),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('page.system.rolePage.name'),
      rules: 'required',
      componentProps: {
        placeholder: $t('page.system.rolePage.nameTip'),
      },
    },
    {
      component: 'Input',
      fieldName: 'description',
      label: $t('page.system.rolePage.description'),
      componentProps: {
        placeholder: $t('page.system.rolePage.descriptionTip'),
      },
    },
  ],
});

defineExpose(modalApi);
</script>

<template>
  <Modal
    :title="
      isEdit ? $t('page.system.rolePage.edit') : $t('page.system.rolePage.add')
    "
  >
    <Form />
    <!-- 特例：菜单权限树形勾选，VbenTree API 不支持 getCheckedKeys/halfChecked 暂保留 -->
    <div class="mt-4">
      <div class="mb-2 text-sm font-medium">
        {{ $t('page.system.rolePage.menuPermission') }}
      </div>
      <ElTree
        ref="formTreeRef"
        :data="menuTree"
        default-expand-all
        node-key="id"
        show-checkbox
        :props="{ children: 'children', label: 'name' }"
        class="max-h-60 overflow-auto rounded border p-2"
      />
    </div>
  </Modal>
</template>
