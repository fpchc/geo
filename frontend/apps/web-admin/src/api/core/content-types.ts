/**
 * 内容生产模块类型定义（POC）
 * 依据 .claude/feature/content/openapi.json 真实后端契约。
 * 与旧的 Content/Agent 类型（types.ts）无关，后者未被引用，后续可清理。
 */
import type { PaginationParams } from './types';

// ========== 智能体（F-01） ==========
export interface AgentOut {
  id: number;
  name: string;
  icon: null | string;
  description: null | string;
  enabled: boolean;
}

export interface AgentDetailOut extends AgentOut {
  /** 后台配置的基础提示词，仅展示只读 */
  prompt_template: null | string;
}

// ========== 创作选项（下拉框数据源，GET /creation-options） ==========
export interface CreationOptionsOut {
  audience: string[];
  platform: string[];
  industry: string[];
  angle: string[];
}

// ========== 创作参数（F-02，仅风格约束，不投放） ==========
export interface CreationParams {
  audience?: null | string;
  platform?: null | string;
  industry?: null | string;
  angle?: null | string;
}

// ========== SSE 流式生成事件 ==========
export interface SSEStartedEvent {
  content_id: number;
  regen_count: number;
}

export interface SSEProgressEvent {
  content_id: number;
  token: string;
}

/** 思考过程增量（仅深度思考模型 + qwen_enable_thinking=true 时出现，仅展示不入正文） */
export interface SSEThinkEvent {
  content_id: number;
  token: string;
}

export interface SSEDoneEvent {
  content_id: number;
  version_id: number;
  title: string;
  body: string;
  word_count: number;
}

export interface SSEErrorEvent {
  content_id: number;
  error: string;
}

// ========== 资料（F-07） ==========
export interface MaterialOut {
  id: number;
  user_id: number;
  filename: string;
  file_type: string;
  object_key: string;
  /** 解析后正文字符数 */
  char_count: number;
}

// ========== 生成（F-08 / F-09 / F-13） ==========
export interface GenerateRequest {
  /** 选中的智能体（F-01） */
  agent_id: number;
  /** 创作参数（F-02） */
  params?: CreationParams;
  /** 关键词：原样命中 + 自然融入，同时是评审基准（F-03） */
  keywords?: string[];
  /** 目标字数（F-04） */
  target_word_count?: number;
  /** 额外提示词，空则套用默认提示词（F-05） */
  extra_prompt?: null | string;
  /** 已上传资料 ID，全文注入（F-07） */
  material_ids?: number[];
}

export interface GenerateAccepted {
  content_id: number;
  task_id: string;
  status: string;
  regen_count: number;
}

/** 生成任务状态口径（后端返回泛型 dict，此处按约定字段宽松解析） */
export type TaskStatusLiteral =
  | 'completed'
  | 'failed'
  | 'pending'
  | 'running'
  | string;

export interface GenerateTaskOut {
  task_id?: string;
  status: TaskStatusLiteral;
  content_id?: null | number;
  version_id?: null | number;
  regen_count?: number;
  error_code?: null | string;
  error_msg?: null | string;
  [key: string]: unknown;
}

// ========== 版本 / 内容 ==========
export interface VersionOut {
  id: number;
  content_id: number;
  title: string;
  /** Markdown 正文 */
  body: string;
  word_count: number;
  source_type: string;
}

export interface ContentOut {
  id: number;
  agent_id: null | number;
  user_id: number;
  status: string;
  regen_count: number;
  current_version_id: null | number;
  params: CreationParams | null;
}

export interface ContentDetailOut extends ContentOut {
  current_version: null | VersionOut;
}

export interface ContentListParams extends PaginationParams {
  status?: string;
  agent_id?: number;
}

// ========== 评审 / 评分（F-11 / F-12） ==========
export interface ScoreDimensionOut {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

export interface ScoreOut {
  id: number;
  content_id: number;
  version_id: null | number;
  overall_score: number;
  grade: string;
  dimensions: ScoreDimensionOut[];
}

// ========== 系统配置（F-06 / F-12） ==========
export interface SettingOut {
  key: string;
  value: unknown;
  description: null | string;
}

export interface SettingUpdate {
  value: unknown;
  description?: null | string;
}
