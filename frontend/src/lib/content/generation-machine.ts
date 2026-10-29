export type StudioPhase =
  | 'configuring'
  | 'generate_failed'
  | 'generated'
  | 'generating'
  | 'locked'
  | 'retained'
  | 'reviewed';

export interface StudioState {
  phase: StudioPhase;
  contentId: number | null;
  taskId: string | null;
  error: string | null;
  canRetry: boolean;
}

export type StudioEvent =
  | { type: 'submit'; contentId: number; taskId: string }
  | { type: 'task_completed'; contentId: number }
  | { type: 'task_failed'; message: string; retryable: boolean }
  | { type: 'task_expired' }
  | { type: 'timeout' }
  | { type: 'recover'; contentId: number | null; taskId: string }
  | { type: 'status_synced'; status: 'generated' | 'locked' | 'retained' | 'reviewed' }
  | { type: 'reset' };

export const initialStudioState: StudioState = {
  phase: 'configuring',
  contentId: null,
  taskId: null,
  error: null,
  canRetry: false,
};

export function studioReducer(state: StudioState, event: StudioEvent): StudioState {
  switch (event.type) {
    case 'submit':
      return {
        phase: 'generating',
        contentId: event.contentId,
        taskId: event.taskId,
        error: null,
        canRetry: false,
      };
    case 'task_completed':
      if (state.phase !== 'generating') {
        return state;
      }

      return {
        phase: 'generated',
        contentId: event.contentId,
        taskId: null,
        error: null,
        canRetry: false,
      };
    case 'task_failed':
      if (state.phase !== 'generating') {
        return state;
      }

      return {
        ...state,
        phase: 'generate_failed',
        taskId: null,
        error: event.message,
        canRetry: event.retryable && Boolean(state.contentId),
      };
    case 'task_expired':
      return {
        ...state,
        phase: 'generate_failed',
        taskId: null,
        error: 'task_expired',
        canRetry: Boolean(state.contentId),
      };
    case 'timeout':
      return {
        ...state,
        phase: 'generate_failed',
        taskId: null,
        error: 'timeout',
        canRetry: Boolean(state.contentId),
      };
    case 'recover':
      return {
        phase: 'generating',
        contentId: event.contentId,
        taskId: event.taskId,
        error: null,
        canRetry: false,
      };
    case 'status_synced':
      return {
        ...state,
        phase: event.status,
        taskId: null,
        error: null,
        canRetry: false,
      };
    case 'reset':
      return initialStudioState;
    default:
      return state;
  }
}
