import type {
  AgentDetailOut,
  AgentOut,
  ContentDetailOut,
  ContentListParams,
  ContentOut,
  CreationOptionsOut,
  GenerateAccepted,
  GenerateRequest,
  GenerateTaskOut,
  MaterialOut,
  ScoreOut,
  SettingOut,
  SettingUpdate,
  VersionOut,
} from './content-types';
import type { PaginatedResponse } from './types';

import { useAppConfig } from '@frontend/hooks';
import { useAccessStore } from '@frontend/stores';

import { requestClient } from '#/api/request';

const BASE = '/content';

// ========== 智能体（F-01） ==========
export async function getAgentListApi() {
  return requestClient.get<AgentOut[]>(`${BASE}/agents`);
}

export async function getAgentDetailApi(agentId: number) {
  return requestClient.get<AgentDetailOut>(`${BASE}/agents/${agentId}`);
}

// ========== 资料上传（F-07） ==========
export async function uploadMaterialApi(file: File) {
  return requestClient.upload<MaterialOut>(`${BASE}/materials`, { file });
}

// ========== 内容生成（F-08 / F-09） ==========
export async function generateContentApi(data: GenerateRequest) {
  return requestClient.post<GenerateAccepted>(
    `${BASE}/contents/generate`,
    data,
  );
}

/** 重新生成（受 10 次上限约束，达上限锁定，F-13） */
export async function regenerateContentApi(
  contentId: number,
  data: GenerateRequest,
) {
  return requestClient.post<GenerateAccepted>(
    `${BASE}/contents/${contentId}/regenerate`,
    data,
  );
}

/** 轮询生成任务状态 */
export async function getGenerateTaskApi(taskId: string) {
  return requestClient.get<GenerateTaskOut>(`${BASE}/contents/tasks/${taskId}`);
}

// ========== 内容 / 版本 ==========
export async function listContentsApi(params: ContentListParams) {
  return requestClient.get<PaginatedResponse<ContentOut>>(`${BASE}/contents`, {
    params,
  });
}

export async function getContentApi(contentId: number) {
  return requestClient.get<ContentDetailOut>(`${BASE}/contents/${contentId}`);
}

export async function listVersionsApi(contentId: number) {
  return requestClient.get<VersionOut[]>(
    `${BASE}/contents/${contentId}/versions`,
  );
}

/** 确认留存内容（内容留存态） */
export async function retainContentApi(contentId: number) {
  return requestClient.post<ContentOut>(`${BASE}/contents/${contentId}/retain`);
}

// ========== 评审 / 评分（F-11 / F-12） ==========
export async function reviewContentApi(contentId: number) {
  return requestClient.post<ScoreOut>(`${BASE}/contents/${contentId}/review`);
}

export async function getLatestScoreApi(contentId: number) {
  return requestClient.get<ScoreOut>(`${BASE}/contents/${contentId}/score`);
}

// ========== 系统配置（F-06 / F-12） ==========
export async function getSettingApi(key: string) {
  return requestClient.get<SettingOut>(`${BASE}/settings/${key}`);
}

export async function updateSettingApi(key: string, data: SettingUpdate) {
  return requestClient.put<SettingOut>(`${BASE}/settings/${key}`, data);
}

// ========== 创作选项（🆕 下拉数据源） ==========
export async function getCreationOptionsApi() {
  return requestClient.get<CreationOptionsOut>(
    `${BASE}/contents/creation-options`,
  );
}

// ========== 导出（F-14，GET 文件下载） ==========
export async function exportContentApi(
  contentId: number,
  format: 'md' | 'word',
): Promise<void> {
  const accessStore = useAccessStore();
  const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

  const res = await fetch(
    `${apiURL}${BASE}/contents/${contentId}/export?format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${accessStore.accessToken}`,
      },
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || `HTTP ${res.status}`,
    );
  }

  // 从 Content-Disposition 提取文件名；回退到默认名
  const disposition = res.headers.get('Content-Disposition');
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
  const filename =
    filenameMatch?.[1] ||
    `content-${contentId}.${format === 'word' ? 'docx' : 'md'}`;

  // 触发浏览器下载
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== 流式生成（🆕 SSE） ==========
interface StreamCallbacks {
  onStarted?: (contentId: number, regenCount: number) => void;
  /** 思考过程增量（think 事件），进思考区，不入正文 */
  onThink?: (token: string) => void;
  onProgress?: (token: string) => void;
  onDone?: (result: {
    body: string;
    content_id: number;
    title: string;
    version_id: number;
    word_count: number;
  }) => void;
  onError?: (error: string) => void;
}

function parseSSEEvent(raw: string): {
  data: Record<string, unknown>;
  type: string;
} {
  const lines = raw.split('\n');
  let type = '';
  let data = '';
  for (const line of lines) {
    if (line.startsWith('event: ')) type = line.slice(7);
    if (line.startsWith('data: ')) data = line.slice(6);
  }
  return { type, data: JSON.parse(data) };
}

function processSSEBuffer(buffer: string, callbacks: StreamCallbacks): string {
  // SSE 事件以 \n\n 分隔
  const parts = buffer.split('\n\n');
  const remainder = parts.pop() || ''; // 最后一个可能不完整，保留

  for (const part of parts) {
    if (!part.trim()) continue;
    const event = parseSSEEvent(part);
    switch (event.type) {
      case 'done': {
        callbacks.onDone?.({
          body: event.data.body as string,
          content_id: event.data.content_id as number,
          title: event.data.title as string,
          version_id: event.data.version_id as number,
          word_count: event.data.word_count as number,
        });
        break;
      }
      case 'error': {
        callbacks.onError?.(event.data.error as string);
        break;
      }
      case 'progress': {
        callbacks.onProgress?.(event.data.token as string);
        break;
      }
      case 'started': {
        callbacks.onStarted?.(
          event.data.content_id as number,
          event.data.regen_count as number,
        );
        break;
      }
      case 'think': {
        callbacks.onThink?.(event.data.token as string);
        break;
      }
    }
  }
  return remainder;
}

async function streamFromEndpoint(
  url: string,
  data: GenerateRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const accessStore = useAccessStore();
  const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

  const res = await fetch(`${apiURL}${url}`, {
    method: 'POST',
    headers: {
      'Accept-Language': 'zh-CN',
      Authorization: `Bearer ${accessStore.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    signal,
  });

  if (!res.ok) {
    const errData: { message?: string } = await res.json().catch(() => ({}));
    throw new Error(errData.message || `HTTP ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    // 先处理数据再检查 done —— 最后一个 chunk 可能同时携带数据和结束标志
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      buffer = processSSEBuffer(buffer, callbacks);
    }
    if (done) break;
  }

  // 流结束后处理缓冲区剩余数据（兜底）
  if (buffer.trim()) {
    processSSEBuffer(`${buffer}\n\n`, callbacks);
  }
}

/**
 * SSE 流式生成内容（首次生成）
 * 使用原生 fetch（POST + text/event-stream），替代"提交 → 轮询"模式
 */
export async function generateStreamApi(
  data: GenerateRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  return streamFromEndpoint(
    `${BASE}/contents/generate/stream`,
    data,
    callbacks,
    signal,
  );
}

/**
 * SSE 流式重新生成内容
 */
export async function regenerateStreamApi(
  contentId: number,
  data: GenerateRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  return streamFromEndpoint(
    `${BASE}/contents/${contentId}/regenerate`,
    data,
    callbacks,
    signal,
  );
}
