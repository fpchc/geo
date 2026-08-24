<script lang="ts" setup>
import type { RoleOut, UserCreate, UserOut } from '#/api';

import { ref } from 'vue';

import { useVbenModal } from '@frontend/common-ui';
import { $t } from '@frontend/locales';

import { useVbenForm, z } from '#/adapter/form';
import { createUserApi, updateUserApi } from '#/api';

interface ModalData {
  allRoles: RoleOut[];
  isEdit: boolean;
  row?: UserOut;
}

const isEdit = ref(false);
const editId = ref(0);
const allRoles = ref<RoleOut[]>([]);

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    try {
      if (isEdit.value) {
        await updateUserApi(editId.value, {
          nickname: values.nickname || null,
          email: values.email || null,
          phone: values.phone || null,
          is_active: values.is_active,
          is_superuser: values.is_superuser,
        });
      } else {
        await createUserApi(values as unknown as UserCreate);
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
      allRoles.value = data.allRoles;
      if (data.isEdit && data.row) {
        editId.value = data.row.id;
        await formApi.setValues({
          username: data.row.username,
          password: '',
          nickname: data.row.nickname || '',
          email: data.row.email || '',
          phone: data.row.phone || '',
          is_active: data.row.is_active,
          is_superuser: data.row.is_superuser,
          role_ids: data.row.role_ids ?? [],
        });
      } else {
        editId.value = 0;
        await formApi.reset({
          values: {
            username: '',
            password: '',
            nickname: '',
            email: '',
            phone: '',
            is_active: true,
            is_superuser: false,
            role_ids: [],
          },
        });
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
      fieldName: 'username',
      label: $t('page.system.userPage.username'),
      rules: 'required',
      componentProps: () => ({
        disabled: isEdit.value,
        placeholder: $t('page.system.userPage.usernameTip'),
      }),
    },
    {
      component: 'Input',
      fieldName: 'password',
      label: $t('page.system.userPage.password'),
      rules: z.string().min(6, $t('page.system.userPage.passwordRule')),
      componentProps: () => ({
        type: 'password',
        showPassword: true,
        placeholder: $t('page.system.userPage.passwordTip'),
      }),
      dependencies: {
        triggerFields: ['username'],
        resolve: () => ({
          required: !isEdit.value,
        }),
      },
    },
    {
      component: 'Input',
      fieldName: 'nickname',
      label: $t('page.system.userPage.nickname'),
      componentProps: {
        placeholder: $t('page.system.userPage.nicknameTip'),
      },
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('page.system.userPage.email'),
      componentProps: {
        placeholder: $t('page.system.userPage.emailTip'),
      },
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('page.system.userPage.phone'),
      componentProps: {
        placeholder: $t('page.system.userPage.phoneTip'),
      },
    },
    {
      component: 'Switch',
      fieldName: 'is_active',
      label: $t('page.system.userPage.status'),
    },
    {
      component: 'CheckboxGroup',
      fieldName: 'role_ids',
      label: $t('page.system.userPage.role'),
      componentProps: () => ({
        options: allRoles.value.map((r) => ({ label: r.name, value: r.id })),
      }),
    },
  ],
});

defineExpose(modalApi);
</script>

<template>
  <Modal
    :title="
      isEdit ? $t('page.system.userPage.edit') : $t('page.system.userPage.add')
    "
  >
    <Form />
  </Modal>
</template>
