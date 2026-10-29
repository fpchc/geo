import { BffError, bffRequest } from './bff-client';
import type { components } from './generated';

export type Agent = components['schemas']['AgentOut'];
export type AgentDetail = components['schemas']['AgentDetailOut'];
export type GenerateRequest = components['schemas']['GenerateRequest'];
export type GenerateAccepted = components['schemas']['GenerateAccepted'];
export type ContentDetail = components['schemas']['ContentDetailOut'];
export type ContentStatus = components['schemas']['ContentOut']['status'];
export type Material = components['schemas']['MaterialOut'];
export type Score = components['schemas']['ScoreOut'];
export type ContentRecord = components['schemas']['ContentOut'];
export type ContentPage = components['schemas']['PaginatedResponse_ContentOut_'];
export type ContentVersion = components['schemas']['VersionOut'];
export type CreationOptions = components['schemas']['CreationOptionsOut'];

export interface ContentListParams {
  agent_id?: number;
  keyword?: string;
  page?: number;
  page_size?: number;
  status?: string;
}

export interface GenerateTaskResult {
  content_id?: number;
  version_id?: number;
  title?: string;
}

export interface GenerateTask {
  status: components['schemas']['TaskStatus'];
  result?: GenerateTaskResult | null;
  error?: string | null;
}

export function getAgents(): Promise<Agent[]> {
  return bffRequest<Agent[]>('content/agents');
}

export function getAgentDetail(agentId: number): Promise<AgentDetail> {
  return bffRequest<AgentDetail>(`content/agents/${agentId}`);
}

export function getCreationOptions(): Promise<CreationOptions> {
  return bffRequest<CreationOptions>('content/contents/creation-options');
}

export function generateContent(
  body: GenerateRequest,
  idempotencyKey: string,
): Promise<GenerateAccepted> {
  return bffRequest<GenerateAccepted>('content/contents/generate', {
    method: 'POST',
    body,
    idempotencyKey,
  });
}

export function regenerateContent(
  contentId: number,
  body: GenerateRequest,
  idempotencyKey: string,
): Promise<GenerateAccepted> {
  return bffRequest<GenerateAccepted>(`content/contents/${contentId}/regenerate`, {
    method: 'POST',
    body,
    idempotencyKey,
  });
}

export function getGenerateTask(taskId: string): Promise<GenerateTask> {
  return bffRequest<GenerateTask>(`content/contents/tasks/${taskId}`);
}

export function getContentDetail(contentId: number): Promise<ContentDetail> {
  return bffRequest<ContentDetail>(`content/contents/${contentId}`);
}

export function getContents(params: ContentListParams = {}): Promise<ContentPage> {
  const query = new URLSearchParams();

  if (params.status) {
    query.set('status', params.status);
  }

  if (params.agent_id) {
    query.set('agent_id', String(params.agent_id));
  }

  if (params.keyword) {
    query.set('keyword', params.keyword);
  }

  query.set('page', String(params.page ?? 1));
  query.set('page_size', String(params.page_size ?? 20));

  return bffRequest<ContentPage>(`content/contents?${query.toString()}`);
}

export function getContentVersions(contentId: number): Promise<ContentVersion[]> {
  return bffRequest<ContentVersion[]>(`content/contents/${contentId}/versions`);
}

export function reviewContent(contentId: number): Promise<Score> {
  return bffRequest<Score>(`content/contents/${contentId}/review`, { method: 'POST' });
}

export function getContentScore(contentId: number): Promise<Score> {
  return bffRequest<Score>(`content/contents/${contentId}/score`);
}

export function retainContent(contentId: number): Promise<ContentRecord> {
  return bffRequest<ContentRecord>(`content/contents/${contentId}/retain`, {
    method: 'POST',
  });
}

interface UploadEnvelope {
  code?: number;
  message?: string;
  data?: Material;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function uploadMaterial(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Material> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/bff/content/materials');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new BffError('Upload failed', 0));
    xhr.onload = () => {
      const body = parseJson(xhr.responseText) as UploadEnvelope | Material | null;

      if (xhr.status < 200 || xhr.status >= 300) {
        const envelope = body as UploadEnvelope | null;
        reject(
          new BffError(
            envelope?.message ?? `Upload failed with status ${xhr.status}`,
            xhr.status,
            envelope?.code,
          ),
        );
        return;
      }

      if (body && typeof body === 'object' && 'code' in body) {
        const envelope = body as UploadEnvelope;

        if (typeof envelope.code === 'number' && envelope.code !== 0) {
          reject(new BffError(envelope.message ?? 'Upload failed', xhr.status, envelope.code));
          return;
        }

        if (typeof envelope.code === 'number') {
          resolve(envelope.data as Material);
          return;
        }
      }

      resolve(body as Material);
    };

    xhr.send(form);
  });
}
