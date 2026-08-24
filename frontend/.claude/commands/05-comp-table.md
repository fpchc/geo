---
description: 列表/表格页规范 - 写列表页、CRUD 列表时加载
---

# 05 · 表格组件约束

> 依据 `apps/web-admin/src/views/_core/system/{user,role,menu}.vue` 与 `apps/web-admin/src/adapter/vxe-table.ts`。

## ✅ 方案选择（硬性规则）

项目里有两套表格能力：

1. **`useVbenVxeGrid`（封装 vxe-table）** —— `adapter/vxe-table.ts` 已完整适配 Element Plus，且全局 `proxyConfig.response` 已对齐后端分页契约（`items`/`total`）。**所有分页列表页必须用它。**
2. **原生 Element Plus `ElTable`** —— **仅限以下特例场景**（需在代码注释标注原因）。

**硬性规则**：
- **必须使用 `useVbenVxeGrid` + `useVbenForm`**（方案 B）：所有分页列表页，搜索+表格+分页联动。**禁止直接使用原生 `ElTable`。**
- **仅特例可用原生 ElTable**（方案 A）：树形表格（如 menu 菜单树）、非分页小数据（≤20 行，如评分维度表）、强定制单元格交互等 vxe-grid 不擅长的场景。使用方案 A 必须在代码注释中说明原因。
- user/role/menu 页面已全部迁移到方案 B。违反本规则的新代码不予合入。

---

## 方案 B：useVbenVxeGrid 骨架（新列表页默认）

从 app 的 adapter 导入（**不要**直接从 `@frontend/plugins/vxe-table` 导，adapter 已注入 Element Plus 组件与全局配置）：

```vue
<script lang="ts" setup>
import type { VxeTableGridOptions } from '@frontend/plugins/vxe-table';
import type { UserOut } from '#/api';

import { Page } from '@frontend/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getUserListApi } from '#/api';

defineOptions({ name: 'SystemUser' });

const gridOptions: VxeTableGridOptions<UserOut> = {
  columns: [
    { field: 'id', title: 'ID', width: 70 },
    { field: 'username', title: '用户名' },
    { field: 'is_active', title: '状态', slots: { default: 'status' } },
    { title: '操作', width: 200, fixed: 'right', slots: { default: 'action' } },
  ],
  // 全局已约定 proxyConfig.response: { result: 'items', total: 'total' }
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        return await getUserListApi({
          page: page.currentPage,
          page_size: page.pageSize,
          ...formValues,
        });
      },
    },
  },
  pagerConfig: {},
};

// 搜索表单走 formOptions（schema 写法见 06-comp-form.md）
const formOptions = {
  schema: [
    { component: 'Input', fieldName: 'username', label: '用户名' },
  ],
};

const [Grid, gridApi] = useVbenVxeGrid<UserOut>({ gridOptions, formOptions });

// 增删改后刷新：gridApi.query()
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #status="{ row }">{{ row.is_active ? '启用' : '禁用' }}</template>
      <template #action="{ row }">
        <!-- 操作按钮，配合 10-comp-modal-drawer 打开弹窗 -->
      </template>
    </Grid>
  </Page>
</template>
```

`useVbenVxeGrid` 返回 `[Grid组件, gridApi]`，`gridApi` 常用：`gridApi.query()` 刷新、`gridApi.reload()`、`gridApi.formApi` 操作搜索表单。全局 `proxyConfig.response` 已约定 `{ result: 'items', total: 'total' }`，与后端分页契约对齐，无需每页重复配。

---

## 方案 A：ElTable 骨架（特例场景用）

搜索区 + 表格 + 分页三段式，配合 `ElDialog` 做增删改（弹窗见 `10-comp-modal-drawer.md`）。

```vue
<script lang="ts" setup>
import type { UserOut } from '#/api';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@frontend/common-ui';
import {
  ElButton, ElCard, ElInput, ElMessage,
  ElPagination, ElPopconfirm, ElTable, ElTableColumn, ElTag,
} from 'element-plus';

import { deleteUserApi, getUserListApi } from '#/api';

defineOptions({ name: 'SystemUser' });

const loading = ref(false);
const list = ref<UserOut[]>([]);
const total = ref(0);
// 分页参数用后端字段名 page / page_size
const query = reactive({ page: 1, page_size: 10, username: '' });

async function loadList() {
  loading.value = true;
  try {
    const res = await getUserListApi({ ...query });
    list.value = res.items;   // 分页响应固定 items / total
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.page = 1;
  loadList();
}

async function handleDelete(row: UserOut) {
  await deleteUserApi(row.id);
  ElMessage.success('已删除');
  loadList();
}

onMounted(loadList);
</script>

<template>
  <Page title="用户管理" description="管理系统用户">
    <ElCard>
      <!-- 搜索区 -->
      <div class="mb-4 flex items-center gap-3">
        <ElInput
          v-model="query.username"
          class="!w-52"
          clearable
          placeholder="搜索用户名"
          @keyup.enter="handleSearch"
        />
        <ElButton type="primary" @click="handleSearch">搜索</ElButton>
        <ElButton type="success" @click="/* openCreate */">新增</ElButton>
      </div>

      <!-- 表格 -->
      <ElTable v-loading="loading" :data="list" border stripe>
        <ElTableColumn label="ID" prop="id" width="70" />
        <ElTableColumn label="用户名" prop="username" />
        <ElTableColumn label="状态" width="80">
          <template #default="{ row }">
            <ElTag :type="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? '启用' : '禁用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton size="small" type="primary" @click="/* openEdit(row) */">编辑</ElButton>
            <ElPopconfirm title="确认删除？" @confirm="handleDelete(row as UserOut)">
              <template #reference>
                <ElButton size="small" type="danger">删除</ElButton>
              </template>
            </ElPopconfirm>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="query.page"
          v-model:page-size="query.page_size"
          :total="total"
          background
          layout="total, prev, pager, next"
          @change="loadList"
        />
      </div>
    </ElCard>
  </Page>
</template>
```

**ElTable 约定**：
- 表格默认 `border stripe`，`v-loading` 绑加载态。
- 操作列 `fixed="right"`，删除用 `ElPopconfirm` 二次确认。
- 自定义单元格用 `#default="{ row }"` 插槽 + `ElTag` 表达状态。
- 分页参数用后端契约字段 `page` / `page_size`，响应解构 `items` / `total`。

## 相关规范

- 分页/列表响应类型 → `08-ts-types.md`
- 搜索表单 / 弹窗表单 schema → `06-comp-form.md`
- 增删改弹窗 → `10-comp-modal-drawer.md`
