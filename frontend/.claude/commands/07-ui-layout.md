---
description: 页面布局、样式 token、图标与 i18n 规范 - 搭页面、写样式、用图标、加翻译时加载
---

# 07 · 布局 / 样式 / 图标 / i18n 约束

> 依据 `packages/effects/common-ui/.../page`、`packages/@core/base/design`、`internal/tailwind-config`、`apps/web-admin/src/locales`。

## 0. 禁止直接引入 Element Plus 组件（硬性规则）

**所有页面组件必须使用统一 UI 层**，禁止在 pages/views 中直接 import Element Plus 组件：

| 用途 | 必须用 | 来源 |
| ---- | ------ | ---- |
| 页面容器 | `Page`、`Fallback` | `@frontend/common-ui` |
| 表格（分页列表） | `useVbenVxeGrid` | `#/adapter/vxe-table` |
| 表单 | `useVbenForm` | `#/adapter/form` |
| 弹窗 | `useVbenModal` | `@frontend/common-ui` |
| 抽屉 | `useVbenDrawer` | `@frontend/common-ui` |

**仅以下 EP 组件可作为特例保留**（统一 UI 无等价物，需在代码注释标注原因）：
`ElMessage` / `ElNotification`（服务函数）、`ElTree`（API 差异待迁移）、`ElTable`+`ElTableColumn`（树形表格/非分页小数据）、`ElUpload`（定制上传交互）。

`ElMessage` / `ElNotification` 属服务函数，不受此限。

**禁止列表**：`ElForm`、`ElFormItem`、`ElInput`、`ElInputNumber`、`ElSelect`、`ElOption`、`ElSwitch`、`ElCheckbox`、`ElCheckboxGroup`、`ElRadioGroup`、`ElDatePicker`、`ElTimePicker`、`ElUpload`、`ElTable`、`ElTableColumn`、`ElPagination`、`ElDialog`、`ElDrawer` 等结构类 EP 组件一律禁止直接使用。

## 1. 页面顶层容器 `Page`

所有页面用 `Page` 作为顶层容器（**不是** PageWrapper）：

```ts
import { Page } from '@frontend/common-ui';
```

真实 props（`PageProps`）：

| prop | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 页面标题（也可用 `#title` 插槽） |
| `description` | string | 副标题描述（也可用 `#description` 插槽） |
| `contentClass` | string | 内容区自定义 class |
| `autoContentHeight` | boolean | 内容区按可见高度自适应（表格全屏场景常用） |
| `headerClass` / `footerClass` | string | 头/脚 class |
| `heightOffset` | number | 配合 autoContentHeight 的高度偏移 |

标准用法：
```vue
<template>
  <Page title="用户管理" description="管理系统用户">
    <ElCard>
      <!-- 页面内容 -->
    </ElCard>
  </Page>
</template>
```
表格全屏自适应：`<Page auto-content-height>`。

## 2. 样式：Tailwind 4 + Design Token（禁止硬编码颜色）

项目用 **Tailwind 4**（不是 UnoCSS），主题色由 `@core/base/design` 的 CSS 变量定义，经 `internal/tailwind-config/src/theme.css` 映射为原子类。

### 硬性规则：禁止写死 hex/rgb 颜色

```vue
<!-- ❌ 错误：写死颜色，不随主题/暗黑模式切换 -->
<div style="color: #333; background: #fff;" />
<div class="text-[#666] bg-[#f5f5f5]" />

<!-- ✅ 正确：用 design token 原子类 -->
<div class="text-foreground bg-background" />
<div class="text-muted-foreground border-border" />
```

### 可用 token 原子类（来自真实 token 定义）

| 类别 | Tailwind 类 | 对应 token |
| --- | --- | --- |
| 背景 | `bg-background` `bg-background-deep` `bg-card` `bg-popover` | `--background` 等 |
| 文字 | `text-foreground` `text-muted-foreground` `text-card-foreground` | `--foreground` 等 |
| 主色 | `bg-primary` `text-primary` `text-primary-foreground` `bg-primary-50~900` | `--primary` |
| 语义色 | `bg-success` `bg-warning` `bg-destructive` `bg-info`（含 `-foreground`） | `--success` 等 |
| 强调/交互 | `bg-accent` `bg-accent-hover` `text-accent-foreground` | `--accent` |
| 边框/输入 | `border-border` `ring-ring` `bg-input-background` | `--border` `--ring` |
| 圆角 | `rounded-[var(--radius)]` 或对应 radius 类 | `--radius` |

> 完整 token 见 `packages/@core/base/design/src/design-tokens/default.css`（亮色）与 `dark.css`（暗色）。所有 token 用 HSL 分量存储（`--primary: 245 82% 67%`），tailwind 侧包 `hsl(var(--x))`。**新增颜色先在 design token 定义，再映射为类，禁止行内硬编码。**

### 布局常用类

真实页面大量使用：`flex items-center gap-3`、`mb-4`、`mt-4 flex justify-end`、`!w-40`（`!` 强制覆盖 Element Plus 宽度）、`max-h-60 overflow-auto`、暗色适配 `dark:border-gray-700`。间距/布局用 Tailwind，颜色务必用 token。

## 3. 图标

图标来自 `@frontend/icons`（封装 `@iconify/vue` + lucide）：

- **路由/菜单 meta**：用字符串 `集合:名称`，项目统一 `lucide:*`。示例 `icon: 'lucide:users'`。
- **组件内用图标**：从 `@frontend/icons` 导入预置 lucide 组件（PascalCase），如：
  ```ts
  import { Bell, Check, ArrowLeft } from '@frontend/icons';
  ```
- **动态/任意 iconify 图标**：用 `IconifyIcon` 组件：
  ```vue
  <script setup>
  import { IconifyIcon } from '@frontend/icons';
  </script>
  <template>
    <IconifyIcon icon="lucide:settings" />
  </template>
  ```
- 禁止直接引入图片/svg 当图标，统一走 iconify 体系保证主题一致。

## 4. 国际化 i18n

`$t` 来自 app 的 `#/locales`（底层 `@frontend/locales`）：

```ts
import { $t } from '#/locales';
```

### 语言文件

- 位置：`apps/web-admin/src/locales/langs/<lang>/<域>.json`，如 `zh-CN/page.json`、`en-US/page.json`。
- 通过 `import.meta.glob('./langs/**/*.json')` 自动加载。
- 支持语言：`zh-CN`（默认）、`en-US`。第三方库（Element Plus / dayjs）语言包已自动联动。

### 新增翻译 key

在**每个语言目录**同名 json 里补齐同一 key（结构对齐），如 `page.json`：
```json
{
  "system": { "title": "系统管理", "user": "用户管理" }
}
```

### 使用

```ts
// 路由 meta（必须用 $t，禁止硬编码文案）
meta: { title: $t('page.system.user') }
```
```vue
<!-- 模板 -->
<span>{{ $t('page.system.title') }}</span>
```
```ts
// 带参数（数组占位）
$t('ui.formRules.required', [label])
```

> 现有业务页面（user/role/menu）弹窗内文案有中文硬编码（如「新增角色」），属历史遗留。**新代码文案统一走 `$t`**，尤其是路由 title、菜单、通用提示。

## 相关规范

- Page 内放表格 → `05-comp-table.md`
- 路由 meta.title 用 $t → `02-router-meta.md`
