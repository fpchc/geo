<script lang="ts" setup>
import type { VbenDropdownMenuItem } from '@frontend/common-ui';

import type {
  AgentDetailOut,
  AgentOut,
  CreationOptionsOut,
  CreationParams,
  GenerateRequest,
  ScoreOut,
} from '#/api';

import { computed, onMounted, onUnmounted, ref } from 'vue';

import { Badge, Page, VbenButton, VbenDropdownMenu } from '@frontend/common-ui';
import { $t } from '@frontend/locales';

// 特例：ElUpload 需要 before-upload 钩子定制交互，统一 UI 无对应替代
import { ElUpload } from 'element-plus';
// 特例：ElMessage toast 消息服务，统一 UI 无替代
import { ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import {
  exportContentApi,
  generateStreamApi,
  getAgentDetailApi,
  getAgentListApi,
  getCreationOptionsApi,
  regenerateStreamApi,
  retainContentApi,
  reviewContentApi,
  uploadMaterialApi,
} from '#/api';
import MarkdownPreview from '#/components/markdown-preview.vue';

defineOptions({ name: 'ContentStudio' });

const MAX_REGEN = 10;

type StudioStatus =
  | 'failed'
  | 'generating'
  | 'idle'
  | 'locked'
  | 'ready'
  | 'retained'
  | 'reviewed';

// ---- 智能体 ----
const agents = ref<AgentOut[]>([]);
const selectedAgentId = ref<null | number>(null);
const agentDetail = ref<AgentDetailOut | null>(null);

async function loadAgents() {
  agents.value = await getAgentListApi();
}

async function selectAgent(agentId: number) {
  selectedAgentId.value = agentId;
  agentDetail.value = await getAgentDetailApi(agentId);
}

// ---- 创作参数 ----
const creationOptions = ref<CreationOptionsOut>({
  audience: [],
  platform: [],
  industry: [],
  angle: [],
});

const [Form, formApi] = useVbenForm({
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
  schema: [
    {
      component: 'Select',
      fieldName: 'audience',
      label: $t('page.content.studioPage.audience'),
      componentProps: () => ({
        options: creationOptions.value.audience.map((v) => ({
          label: v,
          value: v,
        })),
        placeholder: $t('page.content.studioPage.audienceTip'),
        clearable: true,
      }),
    },
    {
      component: 'Select',
      fieldName: 'platform',
      label: $t('page.content.studioPage.platform'),
      componentProps: () => ({
        options: creationOptions.value.platform.map((v) => ({
          label: v,
          value: v,
        })),
        placeholder: $t('page.content.studioPage.platformTip'),
        clearable: true,
      }),
    },
    {
      component: 'Select',
      fieldName: 'industry',
      label: $t('page.content.studioPage.industry'),
      componentProps: () => ({
        options: creationOptions.value.industry.map((v) => ({
          label: v,
          value: v,
        })),
        placeholder: $t('page.content.studioPage.industryTip'),
        clearable: true,
      }),
    },
    {
      component: 'Select',
      fieldName: 'angle',
      label: $t('page.content.studioPage.angle'),
      componentProps: () => ({
        options: creationOptions.value.angle.map((v) => ({
          label: v,
          value: v,
        })),
        placeholder: $t('page.content.studioPage.angleTip'),
        clearable: true,
      }),
    },
    {
      component: 'Input',
      fieldName: 'extraPrompt',
      label: $t('page.content.studioPage.extraPrompt'),
      componentProps: {
        type: 'textarea',
        rows: 3,
        placeholder: $t('page.content.studioPage.extraPromptTip'),
      },
    },
  ],
});

// ---- 关键词 ----
const keywords = ref<string[]>([]);
const keywordInput = ref('');

function addKeyword() {
  const val = keywordInput.value.trim();
  if (val && !keywords.value.includes(val)) {
    keywords.value.push(val);
  }
  keywordInput.value = '';
}

function removeKeyword(kw: string) {
  keywords.value = keywords.value.filter((k) => k !== kw);
}

// ---- 目标字数 ----
const targetWordCount = ref(800);

// ---- 上传资料 ----
interface UploadedMaterial {
  id: number;
  filename: string;
  char_count: number;
}
const materials = ref<UploadedMaterial[]>([]);

async function handleUpload(file: any) {
  const res = await uploadMaterialApi(file as File);
  materials.value.push({
    id: res.id,
    filename: res.filename,
    char_count: res.char_count,
  });
  ElMessage.success($t('page.content.studioPage.msg.uploadSuccess'));
  return false;
}

function removeMaterial(id: number) {
  materials.value = materials.value.filter((m) => m.id !== id);
}

// ---- 生成状态机 ----
const status = ref<StudioStatus>('idle');
const contentId = ref<null | number>(null);
const regenCount = ref(0);
const previewBody = ref('');
const thinking = ref('');
const thinkingCollapsed = ref(false);
const score = ref<null | ScoreOut>(null);
let abortController: AbortController | null = null;

const isBusy = computed(() => status.value === 'generating');
const isLocked = computed(() => status.value === 'locked');
const canReview = computed(() =>
  ['locked', 'ready', 'reviewed'].includes(status.value),
);
const canRetain = computed(() =>
  ['locked', 'ready', 'reviewed'].includes(status.value),
);
const canRegen = computed(
  () =>
    ['failed', 'ready', 'reviewed'].includes(status.value) &&
    regenCount.value < MAX_REGEN,
);
const canExport = computed(
  () =>
    contentId.value !== null &&
    ['locked', 'ready', 'retained', 'reviewed'].includes(status.value),
);

async function getFormParams(): Promise<CreationParams> {
  const values = await formApi.getValues();
  return {
    audience: values.audience || null,
    platform: values.platform || null,
    industry: values.industry || null,
    angle: values.angle || null,
  };
}

async function handleGenerateStream() {
  abortController = new AbortController();
  previewBody.value = '';
  thinking.value = '';
  thinkingCollapsed.value = false;

  const formValues = await getFormParams();
  const extra = (await formApi.getValues()).extraPrompt?.trim() || null;
  const payload: GenerateRequest = {
    agent_id: selectedAgentId.value as number,
    params: formValues,
    keywords: [...keywords.value],
    target_word_count: targetWordCount.value,
    extra_prompt: extra,
    material_ids: materials.value.map((m) => m.id),
  };

  const callbacks = {
    onStarted(cId: number, rCount: number) {
      contentId.value = cId;
      regenCount.value = rCount;
    },
    onThink(token: string) {
      if (status.value === 'generating') thinking.value += token;
    },
    onProgress(token: string) {
      if (status.value === 'generating') {
        if (!previewBody.value && thinking.value)
          thinkingCollapsed.value = true;
        previewBody.value += token;
      }
    },
    onDone(result: { body: string; content_id: number }) {
      if (result.body) previewBody.value = result.body;
      if (result.content_id && contentId.value === null)
        contentId.value = result.content_id;
      score.value = null;
      status.value = regenCount.value >= MAX_REGEN ? 'locked' : 'ready';
      ElMessage.success($t('page.content.studioPage.msg.generateSuccess'));
    },
    onError(error: string) {
      status.value = 'failed';
      ElMessage.error(error);
    },
  };

  try {
    if (contentId.value === null) {
      await generateStreamApi(payload, callbacks, abortController.signal);
    } else {
      await regenerateStreamApi(
        contentId.value,
        payload,
        callbacks,
        abortController.signal,
      );
    }
  } catch (error: unknown) {
    if ((error as Error)?.name !== 'AbortError') {
      status.value = 'failed';
      ElMessage.error($t('page.content.studioPage.msg.generateFailed'));
    }
  }
}

async function handleGenerate() {
  if (!selectedAgentId.value) {
    ElMessage.warning($t('page.content.studioPage.msg.agentRequired'));
    return;
  }
  if (isLocked.value) {
    ElMessage.warning($t('page.content.studioPage.msg.lockedTip'));
    return;
  }
  status.value = 'generating';
  score.value = null;
  await handleGenerateStream();
}

async function handleReview() {
  if (!contentId.value) return;
  score.value = await reviewContentApi(contentId.value);
  if (status.value !== 'locked') status.value = 'reviewed';
  ElMessage.success($t('page.content.studioPage.msg.reviewSuccess'));
}

async function handleRetain() {
  if (!contentId.value) return;
  await retainContentApi(contentId.value);
  status.value = 'retained';
  ElMessage.success($t('page.content.studioPage.msg.retainSuccess'));
}

const exporting = ref(false);
async function handleExport(format: 'md' | 'word') {
  if (!contentId.value || exporting.value) return;
  exporting.value = true;
  try {
    await exportContentApi(contentId.value, format);
    ElMessage.success($t('page.content.studioPage.msg.exportSuccess'));
  } catch {
    ElMessage.error($t('page.content.studioPage.msg.exportFailed'));
  } finally {
    exporting.value = false;
  }
}

const exportMenus: VbenDropdownMenuItem[] = [
  {
    value: 'word',
    label: `${$t('page.content.studioPage.exportWord')} .docx`,
    handler: () => handleExport('word'),
  },
  {
    value: 'md',
    label: `${$t('page.content.studioPage.exportMd')} .md`,
    handler: () => handleExport('md'),
  },
];

const statusText = computed(() => {
  const p = 'page.content.studioPage.';
  switch (status.value) {
    case 'failed': {
      return $t(`${p}statusFailed`);
    }
    case 'generating': {
      return $t(`${p}statusGenerating`);
    }
    case 'locked':
    case 'ready': {
      return $t(`${p}statusReady`);
    }
    case 'retained': {
      return $t(`${p}statusRetained`);
    }
    case 'reviewed': {
      return $t(`${p}statusReviewed`);
    }
    default: {
      return '';
    }
  }
});

const statusBadgeVariant = computed(() => {
  switch (status.value) {
    case 'failed': {
      return 'destructive';
    }
    case 'generating': {
      return 'secondary';
    }
    case 'retained': {
      return 'default';
    }
    default: {
      return 'secondary';
    }
  }
});

async function loadCreationOptions() {
  try {
    creationOptions.value = await getCreationOptionsApi();
  } catch {
    // ignore
  }
}

onMounted(() => {
  loadAgents();
  loadCreationOptions();
});
onUnmounted(() => {
  if (abortController) abortController.abort();
});
</script>

<template>
  <Page
    :title="$t('page.content.studioPage.title')"
    :description="$t('page.content.studioPage.description')"
  >
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
      <!-- ============ 左栏：配置区 ============ -->
      <div class="self-start rounded-[var(--radius)] border bg-card p-4">
        <!-- 智能体选择 -->
        <div class="mb-4">
          <div class="mb-2 text-sm font-medium">
            {{ $t('page.content.studioPage.agent') }}
          </div>
          <div class="grid w-full grid-cols-2 gap-2">
            <div
              v-for="agent in agents"
              :key="agent.id"
              class="cursor-pointer rounded-md border p-2 text-sm transition-colors"
              :class="
                selectedAgentId === agent.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              "
              @click="selectAgent(agent.id)"
            >
              <div class="font-medium">{{ agent.name }}</div>
              <div class="mt-0.5 truncate text-xs text-muted-foreground">
                {{ agent.description }}
              </div>
            </div>
          </div>
        </div>

        <!-- 创作参数表单 -->
        <Form />

        <!-- 关键词 -->
        <div class="mb-4">
          <div class="mb-2 text-sm font-medium">
            {{ $t('page.content.studioPage.keywords') }}
          </div>
          <div v-if="keywords.length" class="mb-2 flex flex-wrap gap-1">
            <Badge
              v-for="kw in keywords"
              :key="kw"
              variant="secondary"
              class="cursor-pointer"
              @click="removeKeyword(kw)"
            >
              {{ kw }} &times;
            </Badge>
          </div>
          <div class="flex gap-2">
            <input
              v-model="keywordInput"
              :placeholder="$t('page.content.studioPage.keywordsTip')"
              class="flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
              @keyup.enter="addKeyword"
            />
            <VbenButton size="sm" variant="ghost" @click="addKeyword">
              {{ $t('page.content.studioPage.addKeyword') }}
            </VbenButton>
          </div>
        </div>

        <!-- 目标字数 -->
        <div class="mb-4">
          <div class="mb-2 text-sm font-medium">
            {{ $t('page.content.studioPage.wordCount') }}:
            {{ targetWordCount }}
          </div>
          <input
            v-model.number="targetWordCount"
            type="range"
            min="200"
            max="5000"
            step="100"
            class="w-full accent-primary"
          />
        </div>

        <!-- 上传资料 -->
        <div class="mb-4">
          <div class="mb-2 text-sm font-medium">
            {{ $t('page.content.studioPage.material') }}
          </div>
          <ElUpload
            v-access:code="['content:material:create']"
            :before-upload="handleUpload"
            :show-file-list="false"
            accept=".pdf,.docx,.txt,.md"
            multiple
          >
            <VbenButton variant="outline" size="sm">
              {{ $t('page.content.studioPage.material') }}
            </VbenButton>
            <template #tip>
              <div class="text-xs text-muted-foreground">
                {{ $t('page.content.studioPage.materialTip') }}
              </div>
            </template>
          </ElUpload>
          <div v-if="materials.length" class="mt-2 flex flex-col gap-1">
            <div
              v-for="m in materials"
              :key="m.id"
              class="flex items-center justify-between rounded bg-muted px-2 py-1 text-xs"
            >
              <span class="truncate">{{ m.filename }}</span>
              <span class="ml-2 shrink-0 text-muted-foreground">
                {{
                  $t('page.content.studioPage.materialChars', [m.char_count])
                }}
              </span>
              <button
                class="ml-2 text-destructive hover:underline"
                @click="removeMaterial(m.id)"
              >
                {{ $t('common.delete') }}
              </button>
            </div>
          </div>
        </div>

        <VbenButton
          v-access:code="['content:content:generate']"
          :loading="isBusy"
          class="w-full"
          variant="default"
          @click="handleGenerate"
        >
          {{ $t('page.content.studioPage.generate') }}
        </VbenButton>
      </div>

      <!-- ============ 右栏：结果区 ============ -->
      <div class="self-start rounded-[var(--radius)] border bg-card p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-base font-medium">
              {{ $t('page.content.studioPage.preview') }}
            </span>
            <Badge v-if="statusText" :variant="statusBadgeVariant">
              {{ statusText }}
            </Badge>
            <span v-if="contentId" class="text-xs text-muted-foreground">
              {{
                $t('page.content.studioPage.regenCount', [
                  regenCount,
                  MAX_REGEN,
                ])
              }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <VbenButton
              v-access:code="['content:review:score']"
              :disabled="!canReview"
              size="sm"
              variant="ghost"
              @click="handleReview"
            >
              {{ $t('page.content.studioPage.review') }}
            </VbenButton>
            <VbenButton
              v-access:code="['content:content:generate']"
              :disabled="!canRegen"
              :loading="isBusy"
              size="sm"
              variant="default"
              @click="handleGenerate"
            >
              {{
                status === 'failed'
                  ? $t('page.content.studioPage.retry')
                  : $t('page.content.studioPage.regenerate')
              }}
            </VbenButton>
            <VbenButton
              v-access:code="['content:content:create']"
              :disabled="!canRetain"
              size="sm"
              variant="secondary"
              @click="handleRetain"
            >
              {{ $t('page.content.studioPage.retain') }}
            </VbenButton>
            <VbenDropdownMenu
              :menus="exportMenus"
              :disabled="!canExport || exporting"
            >
              <VbenButton
                v-access:code="['content:content:query']"
                :disabled="!canExport"
                :loading="exporting"
                size="sm"
                variant="outline"
              >
                {{ $t('page.content.studioPage.export') }}
              </VbenButton>
            </VbenDropdownMenu>
          </div>
        </div>

        <div v-if="isLocked" class="mb-3 text-xs text-orange-500">
          {{ $t('page.content.studioPage.locked') }}
        </div>

        <!-- 思考过程 -->
        <div v-if="thinking" class="thinking-panel mb-4">
          <button
            type="button"
            class="thinking-header"
            @click="thinkingCollapsed = !thinkingCollapsed"
          >
            <span
              class="thinking-dot"
              :class="{ 'thinking-dot--active': status === 'generating' }"
            ></span>
            <span class="thinking-title">
              {{
                status === 'generating'
                  ? $t('page.content.studioPage.thinkingLive')
                  : $t('page.content.studioPage.thinkingDone')
              }}
            </span>
            <span class="thinking-caret">{{
              thinkingCollapsed ? '▸' : '▾'
            }}</span>
          </button>
          <div v-show="!thinkingCollapsed" class="thinking-body">
            {{ thinking }}
          </div>
        </div>

        <!-- 生成中进度条 -->
        <div
          v-if="status === 'generating' && !previewBody && !thinking"
          class="flex min-h-[300px] flex-col items-center justify-center gap-3"
        >
          <div class="h-1 w-48 overflow-hidden rounded-full bg-muted">
            <div class="h-full animate-progress bg-primary"></div>
          </div>
          <span class="text-sm text-muted-foreground">
            {{ $t('page.content.studioPage.statusGenerating') }}
          </span>
        </div>

        <MarkdownPreview v-else-if="previewBody" :content="previewBody" />

        <div
          v-else-if="status !== 'generating'"
          class="flex min-h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          <span class="text-sm">
            {{ $t('page.content.studioPage.emptyPreview') }}
          </span>
        </div>

        <!-- 评分表格 -->
        <div v-if="score" class="mt-5 border-t pt-4">
          <div class="mb-3 flex items-center gap-3">
            <span class="text-base font-medium">
              {{ $t('page.content.studioPage.score') }}
            </span>
            <Badge variant="default">
              {{ $t('page.content.studioPage.overallScore') }}:
              {{ score.overall_score }}
            </Badge>
            <Badge variant="secondary">
              {{ $t('page.content.studioPage.grade') }}: {{ score.grade }}
            </Badge>
          </div>
          <!-- 特例：评分维度表格，非分页小数据只读 -->
          <table class="w-full border text-sm">
            <thead>
              <tr class="bg-muted">
                <th class="border px-3 py-2 text-left">
                  {{ $t('page.content.studioPage.dimension') }}
                </th>
                <th class="border px-3 py-2 text-left">
                  {{ $t('page.content.studioPage.score') }}
                </th>
                <th class="border px-3 py-2 text-left">
                  {{ $t('page.content.studioPage.weight') }}
                </th>
                <th class="border px-3 py-2 text-left">
                  {{ $t('page.content.studioPage.detail') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in score.dimensions" :key="d.name">
                <td class="border px-3 py-2">{{ d.name }}</td>
                <td class="border px-3 py-2">{{ d.score }}</td>
                <td class="border px-3 py-2">{{ d.weight }}</td>
                <td class="border px-3 py-2">{{ d.detail }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Page>
</template>

<style scoped>
@keyframes progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(400%);
  }
}

.animate-progress {
  width: 25%;
  animation: progress-indeterminate 1.5s ease-in-out infinite;
}

.thinking-panel {
  overflow: hidden;
  background-color: hsl(var(--muted) / 50%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.thinking-header {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: none;
}

.thinking-title {
  flex: 1;
  text-align: left;
}

.thinking-caret {
  font-size: 11px;
  opacity: 0.7;
}

.thinking-dot {
  width: 7px;
  height: 7px;
  background-color: hsl(var(--muted-foreground));
  border-radius: 50%;
}

.thinking-dot--active {
  background-color: hsl(var(--primary));
  animation: thinking-pulse 1.2s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.4;
    transform: scale(0.7);
  }
}

.thinking-body {
  max-height: 260px;
  padding: 4px 12px 12px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.7;
  color: hsl(var(--muted-foreground));
  overflow-wrap: break-word;
  white-space: pre-wrap;
  border-top: 1px solid hsl(var(--border));
}
</style>
