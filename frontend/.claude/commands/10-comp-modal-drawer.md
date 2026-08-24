---
description: 弹窗与抽屉规范 - 写增删改弹窗/抽屉表单时加载
---

# 10 · 弹窗 / 抽屉（Modal / Drawer）约束

> `useVbenModal` / `useVbenDrawer` 来自 `@frontend-core/popup-ui`，经 `@frontend/common-ui` 重导出。

## ✅ 方案选择（硬性规则）

- **必须使用 `useVbenModal` / `useVbenDrawer` + `useVbenForm`**（方案 B）：抽离弹窗组件、`setData/getData` 传参、`onConfirm` 统一提交，配合 schema 表单。所有增删改弹窗/抽屉必须按此写。**禁止直接使用原生 `ElDialog`/`ElDrawer`。**
- **仅特例可用原生**（方案 A）：弹窗内嵌非标准控件（如 role 的 ElTree 菜单勾选）、schema 表达不了的定制布局。此时用 `useVbenModal` 外壳 + 内嵌原生控件。使用方案 A 必须在代码注释中说明原因。
- user/role/menu 页面已全部迁移到方案 B。
- Modal 用于常规表单，Drawer 用于宽表单/详情（用法同构）。

---

## 方案 B：useVbenModal（抽离式弹窗，新弹窗默认）

见文末「方案 B」完整骨架。要点：弹窗内容抽成独立 `xxx-modal.vue`，父组件通过 `connectedComponent` 连接并 `setData(row).open()`。

---

## 方案 A：ElDialog 骨架（特例场景用）

CRUD 三件套：列表 + 弹窗(ElDialog) + 表单(ElForm)。真实 role.vue 模式（表单内嵌菜单树时用）：

```vue
<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';
import type { RoleCreate, RoleOut } from '#/api';

import { nextTick, reactive, ref } from 'vue';
import { ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus';

import { createRoleApi, updateRoleApi } from '#/api';

const dialogVisible = ref(false);
const dialogTitle = ref('新增角色');
const isEdit = ref(false);
const editId = ref(0);
const formRef = ref<FormInstance>();
const form = reactive<RoleCreate>({ code: '', name: '', description: null });
const rules: FormRules = {
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
};

const emit = defineEmits<{ success: [] }>(); // 或直接调用父级 loadList

function openCreate() {
  dialogTitle.value = '新增角色';
  isEdit.value = false;
  editId.value = 0;
  Object.assign(form, { code: '', name: '', description: null }); // 重置
  dialogVisible.value = true;
}

function openEdit(row: RoleOut) {
  dialogTitle.value = '编辑角色';
  isEdit.value = true;
  editId.value = row.id;
  Object.assign(form, { code: row.code, name: row.name, description: row.description });
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  if (isEdit.value) {
    await updateRoleApi(editId.value, { name: form.name, description: form.description });
    ElMessage.success('更新成功');
  } else {
    await createRoleApi(form);
    ElMessage.success('创建成功');
  }
  dialogVisible.value = false;
  emit('success'); // 通知列表刷新
}

defineExpose({ openCreate, openEdit });
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    :close-on-click-modal="false"
    :title="dialogTitle"
    width="560px"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
      <ElFormItem label="角色编码" prop="code">
        <ElInput v-model="form.code" :disabled="isEdit" placeholder="请输入角色编码" />
      </ElFormItem>
      <ElFormItem label="角色名称" prop="name">
        <ElInput v-model="form.name" placeholder="请输入角色名称" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="handleSubmit">确定</ElButton>
    </template>
  </ElDialog>
</template>
```

**ElDialog 约定**：
- 恒定 `:close-on-click-modal="false"`，避免误关丢数据。
- 新增/编辑复用同一弹窗，`isEdit` + `dialogTitle` 区分；打开时 `Object.assign(form, {...})` 重置。
- footer 插槽放取消/确定；提交成功后关闭 + 刷新列表（`emit('success')` 或直接调用 `loadList`）。
- 涉及树/选中态回填用 `nextTick(() => treeRef.value?.setCheckedKeys(...))`。

---

## 方案 B 完整骨架：useVbenModal（抽离式弹窗）

```ts
import { useVbenModal } from '@frontend/common-ui';
```

**弹窗内容组件** `role-modal.vue`：
```vue
<script lang="ts" setup>
import { useVbenModal } from '@frontend/common-ui';
import { useVbenForm } from '#/adapter/form';

const [Form, formApi] = useVbenForm({ schema: [/* ... */], showDefaultActions: false });

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    // 提交...
    modalApi.close();
  },
  onOpenChange: (isOpen) => {
    if (isOpen) {
      const data = modalApi.getData(); // 打开时取父级传入的数据
      if (data) formApi.setValues(data);
    }
  },
});

defineExpose(modalApi); // 供外部拿到 api（可选）
</script>

<template>
  <Modal title="角色编辑">
    <Form />
  </Modal>
</template>
```

**父组件调用**（通过 `connectedComponent` 连接）：
```vue
<script lang="ts" setup>
import { useVbenModal } from '@frontend/common-ui';
import RoleModal from './role-modal.vue';

const [RoleModalComp, roleModalApi] = useVbenModal({ connectedComponent: RoleModal });

function openEdit(row) {
  roleModalApi.setData(row).open(); // 传数据并打开
}
</script>

<template>
  <RoleModalComp />
</template>
```

`modalApi` 常用：`open()` / `close()` / `setData(v)` / `getData()` / `setState({ loading, title })`。
`useVbenDrawer` 用法同构，把 `Modal` 换成 `Drawer` 即可（抽屉适合宽表单/详情）。

## 相关规范

- 弹窗里的表单 → `06-comp-form.md`
- 弹窗触发自列表 → `05-comp-table.md`
