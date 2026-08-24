<script lang="ts" setup>
import type { MenuCreate, MenuOut } from '#/api';

import { ref } from 'vue';

import { useVbenModal } from '@frontend/common-ui';
import { $t } from '@frontend/locales';

import { useVbenForm } from '#/adapter/form';
import { createMenuApi, updateMenuApi } from '#/api';

interface ModalData {
  isEdit: boolean;
  parentId: number;
  parentOptions: { label: string; value: number }[];
  row?: MenuOut;
}

const isEdit = ref(false);
const editId = ref(0);
const parentOptions = ref<{ label: string; value: number }[]>([]);

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    try {
      if (isEdit.value) {
        await updateMenuApi(editId.value, {
          name: values.name,
          type: values.type,
          parent_id: values.parent_id,
          path: values.path,
          icon: values.icon || null,
          perm_code: values.perm_code || null,
          order_no: values.order_no ?? 0,
          visible: values.visible,
        });
      } else {
        await createMenuApi(values as unknown as MenuCreate);
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
      parentOptions.value = data.parentOptions;
      if (data.isEdit && data.row) {
        editId.value = data.row.id;
        await formApi.setValues({
          name: data.row.name,
          type: data.row.type,
          parent_id: data.row.parent_id,
          path: data.row.path,
          icon: data.row.icon ?? '',
          perm_code: data.row.perm_code ?? '',
          order_no: data.row.order_no,
          visible: data.row.visible,
        });
      } else {
        editId.value = 0;
        await formApi.reset({
          values: {
            name: '',
            type: 1,
            parent_id: data.parentId,
            path: '',
            icon: '',
            perm_code: '',
            order_no: 0,
            visible: true,
          },
        });
      }
    }
  },
});

const typeOptions = [
  { label: $t('page.system.menuPage.typeDir'), value: 0 },
  { label: $t('page.system.menuPage.typeMenu'), value: 1 },
  { label: $t('page.system.menuPage.typeButton'), value: 2 },
];

const [Form, formApi] = useVbenForm({
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
  schema: [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('page.system.menuPage.nameLabel'),
      rules: 'required',
      componentProps: {
        placeholder: $t('page.system.menuPage.nameTip'),
      },
    },
    {
      component: 'Select',
      fieldName: 'type',
      label: $t('page.system.menuPage.typeLabel'),
      componentProps: {
        options: typeOptions,
      },
    },
    {
      component: 'Select',
      fieldName: 'parent_id',
      label: $t('page.system.menuPage.parent'),
      componentProps: () => ({
        options: parentOptions.value,
      }),
    },
    {
      component: 'Input',
      fieldName: 'path',
      label: $t('page.system.menuPage.pathLabel'),
      componentProps: {
        placeholder: $t('page.system.menuPage.pathTip'),
      },
      dependencies: {
        triggerFields: ['type'],
        resolve: ({ values }) => ({
          show: values.type !== 2,
        }),
      },
    },
    {
      component: 'Input',
      fieldName: 'icon',
      label: $t('page.system.menuPage.icon'),
      componentProps: {
        placeholder: $t('page.system.menuPage.iconTip'),
      },
      dependencies: {
        triggerFields: ['type'],
        resolve: ({ values }) => ({
          show: values.type !== 2,
        }),
      },
    },
    {
      component: 'Input',
      fieldName: 'perm_code',
      label: $t('page.system.menuPage.permCode'),
      componentProps: {
        placeholder: $t('page.system.menuPage.permCodeTip'),
      },
      dependencies: {
        triggerFields: ['type'],
        resolve: ({ values }) => ({
          show: values.type !== 0,
          required: values.type === 2,
        }),
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'order_no',
      label: $t('page.system.menuPage.order'),
      componentProps: {
        min: 0,
      },
    },
    {
      component: 'Switch',
      fieldName: 'visible',
      label: $t('page.system.menuPage.visibleLabel'),
    },
  ],
});

defineExpose(modalApi);
</script>

<template>
  <Modal
    :title="
      isEdit ? $t('page.system.menuPage.edit') : $t('page.system.menuPage.add')
    "
  >
    <Form />
  </Modal>
</template>
