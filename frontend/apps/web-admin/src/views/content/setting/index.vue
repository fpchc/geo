<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@frontend/common-ui';
import { $t } from '@frontend/locales';

// 特例：ElMessage toast 消息服务，统一 UI 无替代
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { getSettingApi, updateSettingApi } from '#/api';

defineOptions({ name: 'ContentSetting' });

const KEY_DEFAULT_PROMPT = 'default_prompt';
const KEY_SCORE_RULE = 'score_rule';

const loading = ref(false);
const saving = ref(false);

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
  schema: [
    {
      component: 'Input',
      fieldName: 'defaultPrompt',
      label: $t('page.content.settingPage.defaultPrompt'),
      componentProps: {
        type: 'textarea',
        autosize: { minRows: 4, maxRows: 10 },
        placeholder: $t('page.content.settingPage.defaultPromptPlaceholder'),
      },
    },
    {
      component: 'Input',
      fieldName: 'scoreRuleText',
      label: $t('page.content.settingPage.scoreRule'),
      componentProps: {
        type: 'textarea',
        autosize: { minRows: 6, maxRows: 16 },
        placeholder: $t('page.content.settingPage.scoreRulePlaceholder'),
      },
    },
  ],
});

async function loadSettings() {
  loading.value = true;
  try {
    const [prompt, rule] = await Promise.all([
      getSettingApi(KEY_DEFAULT_PROMPT).catch(() => null),
      getSettingApi(KEY_SCORE_RULE).catch(() => null),
    ]);
    await formApi.setValues({
      defaultPrompt: toText(prompt?.value),
      scoreRuleText: toText(rule?.value),
    });
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  const values = await formApi.getValues();

  let scoreRuleValue: unknown;
  try {
    scoreRuleValue = values.scoreRuleText.trim()
      ? JSON.parse(values.scoreRuleText)
      : {};
  } catch {
    ElMessage.error($t('page.content.settingPage.invalidJson'));
    return;
  }

  saving.value = true;
  try {
    await Promise.all([
      updateSettingApi(KEY_DEFAULT_PROMPT, { value: values.defaultPrompt }),
      updateSettingApi(KEY_SCORE_RULE, { value: scoreRuleValue }),
    ]);
    ElMessage.success($t('page.content.settingPage.saveSuccess'));
  } finally {
    saving.value = false;
  }
}

onMounted(loadSettings);
</script>

<template>
  <Page
    :title="$t('page.content.settingPage.title')"
    :description="$t('page.content.settingPage.description')"
  >
    <div v-loading="loading" class="rounded-[var(--radius)] border bg-card p-4">
      <Form>
        <template #defaultPrompt-after>
          <div class="mt-1 text-xs text-muted-foreground">
            {{ $t('page.content.settingPage.defaultPromptTip') }}
          </div>
        </template>
        <template #scoreRuleText-after>
          <div class="mt-1 text-xs text-muted-foreground">
            {{ $t('page.content.settingPage.scoreRuleTip') }}
          </div>
        </template>
      </Form>

      <div class="mt-4 flex gap-2">
        <button
          v-access:code="['content:setting:update']"
          :disabled="saving"
          class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          @click="handleSave"
        >
          {{ $t('page.content.settingPage.save') }}
        </button>
        <button
          class="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          @click="loadSettings"
        >
          {{ $t('page.content.settingPage.reset') }}
        </button>
      </div>
    </div>
  </Page>
</template>
