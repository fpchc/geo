---
description: 表单规范 - 写表单、表单联动、校验时加载
---

# 06 · 表单组件约束

> 依据 `apps/web-admin/src/adapter/form.ts`、`packages/@core/ui-kit/form-ui/src/types.ts` 与真实页面。

## ✅ 方案选择（硬性规则）

项目里有两套：

1. **`useVbenForm`（schema 驱动）** —— `adapter/form.ts` 已注册 16 个 Element Plus 组件到 `ComponentType`，支持联动/校验/栅格。**所有表单必须用它。**
2. **原生 `ElForm` + `FormRules`** —— **仅限以下特例场景**（需在代码注释标注原因）。

**硬性规则**：

- **必须使用 `useVbenForm`**（方案 B）：搜索表单、增删改弹窗表单、有联动/动态校验的表单、独立表单页。**禁止直接使用原生 `ElForm`/`ElFormItem`。**
- **仅特例可用原生 ElForm**（方案 A）：表单内嵌非标准控件（如 ElTree 菜单勾选）、schema 表达不了的高度定制布局（如 studio 智能体卡片/关键词标签/上传区）。使用方案 A 必须在代码注释中说明原因。
- 与 05 表格方案对应：`useVbenVxeGrid` 的搜索区 `formOptions` 本质就是 `useVbenForm` 的 schema。
- **弃用提醒**：`componentProps` 的函数形式 `() => ...` 已废弃，新代码一律用 `dependencies.resolve` 替代。

---

## 方案 B：useVbenForm schema（新表单默认）

从 app adapter 导入，**不要**直接从 core 包导：
```ts
import { useVbenForm, z } from '#/adapter/form';
```

Schema 每一项字段（真实类型 `FormSchema`，见 form-ui/types.ts）：

| 字段 | 说明 |
| --- | --- |
| `fieldName` | 字段名（必填） |
| `label` | 标签 |
| `component` | 组件类型，取自 adapter 注册的 `ComponentType`：`Input` `InputNumber` `Select` `ApiSelect` `RadioGroup` `Checkbox` `CheckboxGroup` `Switch` `DatePicker` `TimePicker` `TreeSelect` `ApiTreeSelect` `IconPicker` `Upload` 等 |
| `componentProps` | 组件参数，**支持对象或函数** `(ctx) => props` |
| `rules` | 校验：`'required'` / `'selectRequired'` / 或 zod（`z.string().min(1)`） |
| `defaultValue` | 默认值 |
| `dependencies` | 联动配置（见下） |
| `formItemClass` | 栅格：`'col-span-2'` 等 Tailwind 类 |
| `hide` | 静态隐藏 |

```vue
<script lang="ts" setup>
import { useVbenForm, z } from '#/adapter/form';

const [Form, formApi] = useVbenForm({
  // 全局栅格布局
  wrapperClass: 'grid-cols-2',
  schema: [
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名',
      rules: 'required',
    },
    {
      component: 'Select',
      fieldName: 'type',
      label: '类型',
      componentProps: {
        options: [
          { label: '目录', value: 0 },
          { label: '菜单', value: 1 },
        ],
      },
    },
    {
      component: 'Input',
      fieldName: 'path',
      label: '路由路径',
      // ⭐ 联动：type === 1(菜单) 才显示，并动态必填
      dependencies: {
        triggerFields: ['type'],
        resolve: ({ values }) => ({
          show: values.type === 1,
          required: values.type === 1,
        }),
      },
    },
  ],
  handleSubmit: async (values) => {
    // values 为编解码后的提交值
  },
});
</script>

<template>
  <Form />
</template>
```

---

## 方案 A：ElForm 骨架（特例场景用）

```vue
<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';
import type { UserCreate } from '#/api';

import { reactive, ref } from 'vue';
import { ElForm, ElFormItem, ElInput, ElSwitch, ElMessage } from 'element-plus';

const formRef = ref<FormInstance>();
const isEdit = ref(false);
const form = reactive<UserCreate>({
  username: '', password: '', is_active: true, role_ids: [],
});

// 校验规则用 FormRules
const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, min: 6, message: '密码至少6位', trigger: 'blur' }],
};

async function handleSubmit() {
  if (!formRef.value) return;
  // validate 用 .catch(() => false) 兜底，避免抛异常
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  // ...提交
  ElMessage.success('保存成功');
}
</script>

<template>
  <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
    <ElFormItem label="用户名" prop="username">
      <!-- 编辑态禁用不可变字段 -->
      <ElInput v-model="form.username" :disabled="isEdit" placeholder="请输入用户名" />
    </ElFormItem>
    <!-- 条件校验：编辑时免密码校验 -->
    <ElFormItem :rules="isEdit ? [] : rules.password" label="密码" prop="password">
      <ElInput v-model="form.password" show-password placeholder="请输入密码" />
    </ElFormItem>
    <ElFormItem label="启用状态" prop="is_active">
      <ElSwitch v-model="form.is_active" />
    </ElFormItem>
  </ElForm>
</template>
```

**ElForm 约定**：

- `:model` + `:rules` + 每项 `prop`，`ref<FormInstance>` 提交前 `validate()`。
- 编辑态不可变字段（username/code）用 `:disabled="isEdit"`。
- 按条件切换校验用 `:rules="isEdit ? [] : rules.xxx"`。
- 表单 model 用 `reactive`，初始化/重置用 `Object.assign(form, {...})`。

## 表单联动（dependencies）—— 重点

新代码统一用 **`dependencies.resolve`**（旧的 `ifShow` / `dynamicDisabled` / 顶层 `componentProps` 函数 / `if` 等已标记 `@deprecated`）：

```ts
dependencies: {
  triggerFields: ['type', 'parentId'], // 监听哪些字段变化
  resolve: ({ values, actions, controller }) => ({
    show: values.type === 1,        // 是否显示（不渲染 DOM 用 if）
    if: true,                        // 是否渲染 DOM
    disabled: values.type === 0,     // 是否禁用
    required: values.type === 1,     // 是否必填
    rules: values.type === 1 ? 'required' : null,
    componentProps: { options: [] }, // 动态改组件参数
  }),
}
```

- `show` = CSS 隐藏（保留值）；`if` = 移除 DOM（不保留值）。按需求选。
- `resolve` 支持 async，可在里面请求接口再返回 `componentProps`。
- 避免用已废弃的 legacy 写法（`componentProps` 作为顶层函数、`ifShow`），会有 deprecation 警告。

## formApi 常用方法

`useVbenForm` 返回 `[Form组件, formApi]`：
- `formApi.getValues()` / `formApi.setValues(obj)` / `formApi.setFieldValue(name, val)`
- `formApi.validate()` → `{ valid, errors }`
- `formApi.resetForm()`（或 `reset()`）
- `formApi.submitForm()`（或 `submit()`）

## 相关规范

- 作为表格搜索区 → `05-comp-table.md`
- 放进弹窗提交 → `10-comp-modal-drawer.md`
- 表单里的模型类型 → `08-ts-types.md`
