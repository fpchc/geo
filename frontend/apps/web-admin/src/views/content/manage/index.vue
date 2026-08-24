<script lang="ts" setup>
import type { VxeTableGridOptions } from '@frontend/plugins/vxe-table';

import type {
  AgentOut,
  ContentDetailOut,
  ContentListParams,
  ContentOut,
  ScoreOut,
} from '#/api';

import { computed, onMounted, ref } from 'vue';

import { Badge, Page, useVbenDrawer, VbenButton } from '@frontend/common-ui';
import { $t } from '@frontend/locales';

// 特例：ElMessage toast 消息服务，统一 UI 无替代
import { ElMessage } from 'element-plus';
// 特例：评分维度表格为非分页小数据只读表，符合 05-comp-table 规范特例
import { ElTable, ElTableColumn } from 'element-plus';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getAgentListApi,
  getContentApi,
  getLatestScoreApi,
  listContentsApi,
  retainContentApi,
} from '#/api';
import MarkdownPreview from '#/components/markdown-preview.vue';

defineOptions({ name: 'ContentManage' });

const RETAINED = 'retained';

// ---- 智能体 ----
const agents = ref<AgentOut[]>([]);
const agentMap = computed(
  () => new Map(agents.value.map((a) => [a.id, a.name])),
);
function agentName(id: null | number) {
  return id === null ? '-' : (agentMap.value.get(id) ?? `#${id}`);
}

// ---- 状态展示 ----
type TagVariant = 'default' | 'destructive' | 'secondary';
const STATUS_VARIANT: Record<string, TagVariant> = {
  failed: 'destructive',
  generated: 'secondary',
  generating: 'secondary',
  locked: 'secondary',
  retained: 'default',
  reviewed: 'default',
};
function statusText(s: string) {
  const key = `page.content.status.${s}`;
  const label = $t(key);
  return label === key ? s : label;
}
function statusVariant(s: string): TagVariant {
  return STATUS_VARIANT[s] ?? 'secondary';
}

// ---- 列表 Grid ----
const gridOptions: VxeTableGridOptions<ContentOut> = {
  columns: [
    { field: 'id', title: $t('page.content.managePage.id'), width: 80 },
    {
      field: 'agent_id',
      title: $t('page.content.managePage.agent'),
      width: 160,
      slots: { default: 'agent' },
    },
    {
      field: 'status',
      title: $t('page.content.managePage.status'),
      width: 120,
      slots: { default: 'status' },
    },
    {
      field: 'regen_count',
      title: $t('page.content.managePage.regenCount'),
      width: 120,
    },
    {
      title: $t('page.content.managePage.action'),
      width: 200,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const params: ContentListParams = {
          page: page.currentPage,
          page_size: page.pageSize,
          ...formValues,
        };
        return await listContentsApi(params);
      },
    },
  },
};

const formOptions = {
  schema: [
    {
      component: 'Select' as const,
      fieldName: 'agent_id',
      label: $t('page.content.managePage.filterAgentAll'),
      componentProps: () => ({
        options: [
          {
            label: $t('page.content.managePage.filterAgentAll'),
            value: undefined,
          },
          ...agents.value.map((a) => ({ label: a.name, value: a.id })),
        ],
        clearable: true,
      }),
      defaultValue: undefined,
    },
  ],
};

const [Grid, gridApi] = useVbenVxeGrid<ContentOut>({
  gridOptions,
  formOptions,
});

// ---- 详情抽屉 ----
const detailLoading = ref(false);
const detail = ref<ContentDetailOut | null>(null);
const detailScore = ref<null | ScoreOut>(null);

const [Drawer, drawerApi] = useVbenDrawer({
  onOpenChange: (isOpen) => {
    if (!isOpen) {
      detail.value = null;
      detailScore.value = null;
    }
  },
});

async function openDetail(row: ContentOut) {
  drawerApi.open();
  detailLoading.value = true;
  detail.value = null;
  detailScore.value = null;
  try {
    detail.value = await getContentApi(row.id);
    detailScore.value = await getLatestScoreApi(row.id).catch(() => null);
  } finally {
    detailLoading.value = false;
  }
}

// ---- 留存操作 ----
async function handleRetain(row: ContentOut) {
  await retainContentApi(row.id);
  ElMessage.success($t('page.content.managePage.retainSuccess'));
  await gridApi.query();
}

onMounted(async () => {
  agents.value = await getAgentListApi();
});
</script>

<template>
  <Page
    :title="$t('page.content.managePage.title')"
    :description="$t('page.content.managePage.description')"
  >
    <Grid>
      <template #agent="{ row }">
        {{ agentName(row.agent_id) }}
      </template>

      <template #status="{ row }">
        <Badge :variant="statusVariant(row.status)">
          {{ statusText(row.status) }}
        </Badge>
      </template>

      <template #action="{ row }">
        <VbenButton
          v-access:code="['content:content:query']"
          size="sm"
          variant="default"
          @click="openDetail(row as ContentOut)"
        >
          {{ $t('page.content.managePage.detail') }}
        </VbenButton>
        <VbenButton
          v-if="row.status !== RETAINED"
          v-access:code="['content:content:create']"
          size="sm"
          variant="secondary"
          class="ml-1"
          @click="handleRetain(row as ContentOut)"
        >
          {{ $t('page.content.managePage.retain') }}
        </VbenButton>
      </template>
    </Grid>

    <!-- 详情抽屉 -->
    <Drawer
      :title="$t('page.content.managePage.detailTitle')"
      class="!w-[640px]"
    >
      <div v-loading="detailLoading">
        <template v-if="detail">
          <div class="mb-4 rounded-[var(--radius)] border p-4">
            <dl class="grid grid-cols-2 gap-3">
              <div>
                <dt class="text-xs text-muted-foreground">
                  {{ $t('page.content.managePage.id') }}
                </dt>
                <dd>{{ detail.id }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">
                  {{ $t('page.content.managePage.agent') }}
                </dt>
                <dd>{{ agentName(detail.agent_id) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">
                  {{ $t('page.content.managePage.status') }}
                </dt>
                <dd>
                  <Badge :variant="statusVariant(detail.status)">
                    {{ statusText(detail.status) }}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">
                  {{ $t('page.content.managePage.regenCount') }}
                </dt>
                <dd>{{ detail.regen_count }}</dd>
              </div>
              <div v-if="detail.current_version">
                <dt class="text-xs text-muted-foreground">
                  {{ $t('page.content.managePage.wordCount') }}
                </dt>
                <dd>{{ detail.current_version.word_count }}</dd>
              </div>
            </dl>
          </div>

          <MarkdownPreview
            v-if="detail.current_version?.body"
            :content="detail.current_version.body"
          />
          <div
            v-else
            class="flex flex-col items-center gap-2 py-8 text-muted-foreground"
          >
            <span class="text-sm">
              {{ $t('page.content.managePage.noVersion') }}
            </span>
          </div>

          <!-- 评分 -->
          <div class="mt-5 border-t pt-4">
            <div class="mb-3 flex items-center gap-3">
              <span class="text-base font-medium">
                {{ $t('page.content.managePage.score') }}
              </span>
              <template v-if="detailScore">
                <Badge variant="default">
                  {{ $t('page.content.managePage.overallScore') }}:
                  {{ detailScore.overall_score }}
                </Badge>
                <Badge variant="secondary">
                  {{ $t('page.content.managePage.grade') }}:
                  {{ detailScore.grade }}
                </Badge>
              </template>
            </div>
            <!-- 特例：评分维度表格，非分页小数据只读 -->
            <ElTable
              v-if="detailScore"
              :data="detailScore.dimensions"
              border
              size="small"
            >
              <ElTableColumn
                :label="$t('page.content.managePage.dimension')"
                prop="name"
                width="140"
              />
              <ElTableColumn
                :label="$t('page.content.managePage.score')"
                prop="score"
                width="80"
              />
              <ElTableColumn
                :label="$t('page.content.managePage.weight')"
                prop="weight"
                width="80"
              />
              <ElTableColumn
                :label="$t('page.content.managePage.scoreDetail')"
                prop="detail"
              />
            </ElTable>
            <div
              v-else
              class="flex flex-col items-center gap-2 py-8 text-muted-foreground"
            >
              <span class="text-sm">
                {{ $t('page.content.managePage.noScore') }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </Drawer>
  </Page>
</template>
