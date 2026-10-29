import { describe, expect, it } from 'vitest';
import { initialStudioState, studioReducer } from './generation-machine';

describe('studioReducer', () => {
  it('moves to generating on submit', () => {
    const state = studioReducer(initialStudioState, {
      type: 'submit',
      contentId: 10,
      taskId: 'task-1',
    });

    expect(state).toMatchObject({
      phase: 'generating',
      contentId: 10,
      taskId: 'task-1',
      canRetry: false,
    });
  });

  it('moves to generated on completion', () => {
    const generating = {
      ...initialStudioState,
      phase: 'generating' as const,
      contentId: 10,
      taskId: 'task-1',
    };
    const state = studioReducer(generating, { type: 'task_completed', contentId: 10 });

    expect(state).toMatchObject({
      phase: 'generated',
      contentId: 10,
      taskId: null,
      error: null,
    });
  });

  it('marks a failed task retryable when content exists', () => {
    const generating = {
      ...initialStudioState,
      phase: 'generating' as const,
      contentId: 10,
      taskId: 'task-1',
    };
    const state = studioReducer(generating, {
      type: 'task_failed',
      message: 'model error',
      retryable: true,
    });

    expect(state).toMatchObject({
      phase: 'generate_failed',
      error: 'model error',
      canRetry: true,
    });
  });

  it('does not retry without a content id', () => {
    const generating = {
      ...initialStudioState,
      phase: 'generating' as const,
      contentId: null,
      taskId: 'task-1',
    };
    const state = studioReducer(generating, {
      type: 'task_failed',
      message: 'model error',
      retryable: true,
    });

    expect(state.canRetry).toBe(false);
  });

  it('keeps the expired task retryable when content exists', () => {
    const generating = {
      ...initialStudioState,
      phase: 'generating' as const,
      contentId: 10,
      taskId: 'task-1',
    };
    const state = studioReducer(generating, { type: 'task_expired' });

    expect(state).toMatchObject({
      phase: 'generate_failed',
      error: 'task_expired',
      canRetry: true,
    });
  });

  it('marks a timeout as retryable when content exists', () => {
    const generating = {
      ...initialStudioState,
      phase: 'generating' as const,
      contentId: 11,
      taskId: 'task-1',
    };
    const state = studioReducer(generating, { type: 'timeout' });

    expect(state).toMatchObject({
      phase: 'generate_failed',
      error: 'timeout',
      canRetry: true,
    });
  });

  it('recovers a generating task', () => {
    const state = studioReducer(initialStudioState, {
      type: 'recover',
      contentId: 12,
      taskId: 'task-2',
    });

    expect(state).toMatchObject({
      phase: 'generating',
      contentId: 12,
      taskId: 'task-2',
    });
  });

  it('syncs terminal backend statuses', () => {
    const generated = {
      ...initialStudioState,
      phase: 'generated' as const,
      contentId: 10,
    };

    for (const status of ['reviewed', 'locked', 'retained'] as const) {
      expect(studioReducer(generated, { type: 'status_synced', status }).phase).toBe(status);
    }
  });

  it('ignores completion when not generating', () => {
    const state = studioReducer(initialStudioState, {
      type: 'task_completed',
      contentId: 10,
    });

    expect(state).toBe(initialStudioState);
  });

  it('resets to the initial state', () => {
    const generating = {
      ...initialStudioState,
      phase: 'generating' as const,
      contentId: 10,
      taskId: 'task-1',
    };

    expect(studioReducer(generating, { type: 'reset' })).toEqual(initialStudioState);
  });
});
