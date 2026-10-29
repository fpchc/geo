'use client';

import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ContentStatusBadge } from '@/components/content/content-status-badge';
import { KeywordInput } from '@/components/content/keyword-input';
import { MarkdownPreview } from '@/components/content/markdown-preview';
import { MaterialUpload } from '@/components/content/material-upload';
import { ScorePanel } from '@/components/content/score-panel';
import { PageHeader } from '@/components/page-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { BffError } from '@/lib/api/bff-client';
import {
  type GenerateRequest,
  generateContent,
  getAgentDetail,
  getAgents,
  getContentDetail,
  getContentScore,
  getCreationOptions,
  getGenerateTask,
  type Material,
  regenerateContent,
  retainContent,
  reviewContent,
} from '@/lib/api/content-client';
import { localizeError } from '@/lib/api/error-message';
import {
  initialStudioState,
  type StudioState,
  studioReducer,
} from '@/lib/content/generation-machine';
import { requestFromContentDetail } from '@/lib/content/regenerate-request';
import { toGenerateRequest } from '@/lib/content/studio-request';
import { createStudioSchema, defaultStudioValues } from '@/lib/content/studio-schema';
import { cn } from '@/lib/utils';

const PARAM_FIELDS = ['audience', 'platform', 'industry', 'angle'] as const;
const REGENERATION_LIMIT = 10;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mt-0 mb-3 text-2xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function buildInitialState(contentId: number | null, taskId: string | null): StudioState {
  if (taskId) {
    return {
      phase: 'generating',
      contentId,
      taskId,
      error: null,
      canRetry: false,
    };
  }

  if (contentId) {
    return {
      phase: 'generated',
      contentId,
      taskId: null,
      error: null,
      canRetry: false,
    };
  }

  return initialStudioState;
}

function syncUrl(contentId: number | null, taskId: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  const params = new URLSearchParams();

  if (contentId) {
    params.set('contentId', String(contentId));
  }

  if (taskId) {
    params.set('taskId', taskId);
  }

  const query = params.toString();
  window.history.replaceState(null, '', query ? `/content/studio?${query}` : '/content/studio');
}

function errorMessage(errors: unknown[]): string | null {
  const first = errors[0];

  if (!first) {
    return null;
  }

  if (typeof first === 'string') {
    return first;
  }

  if (typeof first === 'object' && first && 'message' in first) {
    return String((first as { message: unknown }).message);
  }

  return String(first);
}

export function StudioPage({
  canRetain,
  canReview,
  initialContentId,
  initialTaskId,
}: {
  canRetain: boolean;
  canReview: boolean;
  initialContentId: number | null;
  initialTaskId: string | null;
}) {
  const t = useTranslations('Studio');
  const errorT = useTranslations('Errors');
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const validationSchema = useMemo(() => createStudioSchema(t), [t]);
  const [state, dispatch] = useReducer(
    studioReducer,
    buildInitialState(initialContentId, initialTaskId),
  );
  const [selectedAgentId, setSelectedAgentId] = useState(0);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [retainError, setRetainError] = useState<string | null>(null);
  const [regenCount, setRegenCount] = useState<number | null>(null);
  const [retainOpen, setRetainOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const lastPayloadRef = useRef<GenerateRequest | null>(null);

  const agentsQuery = useQuery({ queryKey: ['agents'], queryFn: getAgents });
  const paramsQuery = useQuery({
    queryKey: ['creation-options'],
    queryFn: getCreationOptions,
  });
  const enabledAgents = (agentsQuery.data ?? []).filter((agent) => agent.enabled);
  const agentDetailQuery = useQuery({
    queryKey: ['agent-detail', selectedAgentId],
    queryFn: () => getAgentDetail(selectedAgentId),
    enabled: selectedAgentId > 0,
  });

  const submitMutation = useMutation({
    mutationFn: async (input: {
      contentId?: number;
      idempotencyKey: string;
      payload: GenerateRequest;
    }) => {
      if (input.contentId) {
        return regenerateContent(input.contentId, input.payload, input.idempotencyKey);
      }

      return generateContent(input.payload, input.idempotencyKey);
    },
    onSuccess: (accepted, input) => {
      startedAtRef.current = Date.now();
      setElapsed(0);
      setSubmitError(null);
      setRegenCount(accepted.regen_count);

      if (input.contentId) {
        queryClient.removeQueries({ queryKey: ['content-score', accepted.content_id] });
        void queryClient.invalidateQueries({
          queryKey: ['content-detail', accepted.content_id],
        });
      }

      dispatch({
        type: 'submit',
        contentId: accepted.content_id,
        taskId: accepted.task_id,
      });
      syncUrl(accepted.content_id, accepted.task_id);
    },
    onError: (error) => {
      if (error instanceof BffError && error.status === 409) {
        dispatch({ type: 'status_synced', status: 'locked' });
        setSubmitError(t('lockReached'));
        return;
      }

      setSubmitError(localizeError(error, errorT, t('submitError')));
    },
  });

  const taskQuery = useQuery({
    queryKey: ['generation-task', state.taskId],
    queryFn: () => getGenerateTask(state.taskId as string),
    enabled: state.phase === 'generating' && Boolean(state.taskId),
    retry: 1,
    refetchInterval: (query) => {
      const data = query.state.data;

      if (!data) {
        return 1000;
      }

      if (data.status === 'completed' || data.status === 'failed') {
        return false;
      }

      return Math.min(1000 * 2 ** Math.min(query.state.dataUpdateCount, 3), 5000);
    },
  });

  const detailQuery = useQuery({
    queryKey: ['content-detail', state.contentId],
    queryFn: () => getContentDetail(state.contentId as number),
    enabled:
      Boolean(state.contentId) && state.phase !== 'configuring' && state.phase !== 'generating',
    retry: 1,
  });

  const scoreQuery = useQuery({
    queryKey: ['content-score', state.contentId],
    queryFn: async () => {
      try {
        return await getContentScore(state.contentId as number);
      } catch (error) {
        if (error instanceof BffError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled:
      Boolean(state.contentId) &&
      (state.phase === 'generated' ||
        state.phase === 'generate_failed' ||
        state.phase === 'reviewed' ||
        state.phase === 'locked' ||
        state.phase === 'retained'),
    retry: 1,
  });

  const reviewMutation = useMutation({
    mutationFn: (contentId: number) => reviewContent(contentId),
    onSuccess: (score) => {
      setReviewError(null);

      if (state.contentId) {
        queryClient.setQueryData(['content-score', state.contentId], score);
        void queryClient.invalidateQueries({
          queryKey: ['content-detail', state.contentId],
        });
      }

      dispatch({ type: 'status_synced', status: 'reviewed' });
    },
    onError: (error) => {
      setReviewError(localizeError(error, errorT, t('reviewError')));
    },
  });

  const retainMutation = useMutation({
    mutationFn: (contentId: number) => retainContent(contentId),
    onSuccess: () => {
      setRetainOpen(false);
      setRetainError(null);
      dispatch({ type: 'status_synced', status: 'retained' });

      if (state.contentId) {
        void queryClient.invalidateQueries({
          queryKey: ['content-detail', state.contentId],
        });
      }
    },
    onError: (error) => {
      setRetainError(localizeError(error, errorT, t('retainError')));
    },
  });

  const form = useForm({
    defaultValues: defaultStudioValues,
    validators: {
      onChange: validationSchema,
      onSubmit: validationSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = toGenerateRequest(
        value,
        materials.map((material) => material.id),
      );
      lastPayloadRef.current = payload;
      submitMutation.mutate({
        idempotencyKey: crypto.randomUUID(),
        payload,
      });
    },
  });

  useEffect(() => {
    if (state.phase === 'generating' && !startedAtRef.current) {
      startedAtRef.current = Date.now();
    }
  }, [state.phase]);

  useEffect(() => {
    const status = detailQuery.data?.status;

    if (!status || state.phase === 'configuring' || state.phase === 'generating') {
      return;
    }

    if (status === 'reviewed' || status === 'locked' || status === 'retained') {
      if (state.phase !== status) {
        dispatch({ type: 'status_synced', status });
      }
    }
  }, [detailQuery.data?.status, state.phase]);

  useEffect(() => {
    const task = taskQuery.data;

    if (!task || state.phase !== 'generating') {
      return;
    }

    if (task.status === 'completed') {
      const contentId = task.result?.content_id ?? state.contentId;

      if (contentId) {
        dispatch({ type: 'task_completed', contentId });
      } else {
        dispatch({
          type: 'task_failed',
          message: t('detailError'),
          retryable: Boolean(state.contentId),
        });
      }
      return;
    }

    if (task.status === 'failed') {
      dispatch({
        type: 'task_failed',
        message: task.error ?? t('submitError'),
        retryable: Boolean(state.contentId),
      });
    }
  }, [taskQuery.data, state.phase, state.contentId, t]);

  useEffect(() => {
    if (!taskQuery.error || state.phase !== 'generating') {
      return;
    }

    if (taskQuery.error instanceof BffError && taskQuery.error.status === 404) {
      dispatch({ type: 'task_expired' });
      return;
    }

    dispatch({
      type: 'task_failed',
      message: localizeError(taskQuery.error, errorT, t('submitError')),
      retryable: Boolean(state.contentId),
    });
  }, [taskQuery.error, state.phase, state.contentId, t, errorT]);

  useEffect(() => {
    if (state.phase !== 'generating') {
      return;
    }

    const timer = window.setTimeout(() => dispatch({ type: 'timeout' }), 5 * 60 * 1000);

    return () => window.clearTimeout(timer);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === 'generating') {
      return;
    }

    syncUrl(state.contentId, null);
  }, [state.phase, state.contentId]);

  useEffect(() => {
    if (state.phase !== 'generating' || !startedAtRef.current) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state.phase]);

  const errorText =
    state.error === 'timeout'
      ? t('timeout')
      : state.error === 'task_expired'
        ? t('taskExpired')
        : state.error;
  const detail = detailQuery.data;
  const body = detail?.current_version?.body ?? '';
  const score = scoreQuery.data ?? null;
  const readyToReview =
    Boolean(detail?.current_version_id) &&
    (state.phase === 'generated' || state.phase === 'reviewed');
  const scoreLoading = scoreQuery.isLoading || reviewMutation.isPending;
  const panelError = reviewError
    ? { title: t('reviewError'), message: reviewError }
    : scoreQuery.error
      ? {
          title: t('scoreLoadError'),
          message:
            scoreQuery.error instanceof Error ? scoreQuery.error.message : t('scoreLoadError'),
        }
      : null;
  const currentRegenCount = regenCount ?? detail?.regen_count ?? 0;
  const remainingRegenerations = Math.max(0, REGENERATION_LIMIT - currentRegenCount);
  const canRegenerate =
    Boolean(state.contentId) &&
    (state.phase === 'generated' || state.phase === 'reviewed') &&
    remainingRegenerations > 0;
  const canRetainNow =
    canRetain &&
    Boolean(state.contentId) &&
    (state.phase === 'generated' || state.phase === 'reviewed' || state.phase === 'locked');

  function retry() {
    if (!lastPayloadRef.current || !state.contentId) {
      return;
    }

    submitMutation.mutate({
      contentId: state.contentId,
      idempotencyKey: crypto.randomUUID(),
      payload: lastPayloadRef.current,
    });
  }

  function reset() {
    dispatch({ type: 'reset' });
    setSubmitError(null);
  }

  function review() {
    if (state.contentId) {
      reviewMutation.mutate(state.contentId);
    }
  }

  function retryScore() {
    if (reviewError && state.contentId) {
      reviewMutation.mutate(state.contentId);
      return;
    }

    void scoreQuery.refetch();
  }

  function regenerate() {
    if (!state.contentId) {
      return;
    }

    const payload = lastPayloadRef.current ?? (detail ? requestFromContentDetail(detail) : null);

    if (!payload) {
      setSubmitError(t('regenerateUnavailable'));
      return;
    }

    lastPayloadRef.current = payload;
    submitMutation.mutate({
      contentId: state.contentId,
      idempotencyKey: crypto.randomUUID(),
      payload,
    });
  }

  function retain() {
    if (state.contentId) {
      retainMutation.mutate(state.contentId);
    }
  }

  const keywordList = Array.isArray(detail?.params?.keywords)
    ? detail.params.keywords.filter((keyword): keyword is string => typeof keyword === 'string')
    : [];

  async function copyBody() {
    if (!body) {
      return;
    }

    try {
      await navigator.clipboard.writeText(body);
      toast(t('copySuccess'));
    } catch {
      toast(t('copyError'));
    }
  }

  function favorite() {
    toast(t('favoriteSuccess'));
  }

  function loadLastConfig() {
    toast(t('loadLastConfigUnavailable'));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button type="button" variant="ghost" disabled={isMobile} onClick={loadLastConfig}>
            {t('loadLastConfig')}
          </Button>
        }
      />

      {isMobile ? (
        <Alert>
          <AlertDescription>{t('mobileReadOnly')}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-4 min-[900px]:grid-cols-[280px_minmax(0,1fr)] min-[1240px]:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <fieldset className="contents" disabled={isMobile}>
            <form
              id="studio-form"
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <Card className="p-5">
                <SectionTitle>{t('agent')}</SectionTitle>
                <form.Field name="agentId">
                  {(field) => (
                    <fieldset className="m-0 min-w-0 border-0 p-0">
                      <legend className="sr-only">{t('agent')}</legend>
                      {agentsQuery.isLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : (
                        <div className="-mx-1.5 flex flex-col gap-0.5">
                          {enabledAgents.map((agent) => {
                            const active = field.state.value === agent.id;

                            return (
                              <button
                                key={agent.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => {
                                  field.handleChange(agent.id);
                                  field.handleBlur();
                                  setSelectedAgentId(agent.id);
                                }}
                                className={cn(
                                  'flex w-full items-start gap-2.5 rounded-[9px] px-1.5 py-2 text-left transition-[background-color,transform] duration-200 ease-swift hover:translate-x-0.5 hover:bg-foreground/[0.03]',
                                  active &&
                                    'shadow-[inset_0_0_0_1px_rgba(79,70,229,0.12)] [background:linear-gradient(90deg,var(--nav-active-from),var(--nav-active-to))]',
                                )}
                              >
                                <span
                                  className={cn(
                                    'grid size-[26px] shrink-0 place-items-center rounded-lg bg-foreground/[0.05] text-muted-foreground transition-[background-color,color,transform,box-shadow] duration-200 ease-spring',
                                    active &&
                                      'rotate-[-4deg] scale-[1.06] text-white shadow-primary [background:var(--accent-grad)]',
                                  )}
                                >
                                  <Sparkles className="size-3.5" aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                  <b className="block text-xs font-medium">{agent.name}</b>
                                  <small className="mt-px block truncate text-2xs text-muted-foreground">
                                    {agent.description ?? t('agentPlaceholder')}
                                  </small>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {agentsQuery.error ? (
                        <Alert variant="destructive" className="mt-3">
                          <AlertTitle>{t('agentsError')}</AlertTitle>
                          <AlertDescription>
                            <Button
                              className="mt-3"
                              variant="outline"
                              size="sm"
                              onClick={() => void agentsQuery.refetch()}
                            >
                              {t('retry')}
                            </Button>
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      {errorMessage(field.state.meta.errors) ? (
                        <p className="mt-2 text-xs text-destructive">
                          {errorMessage(field.state.meta.errors)}
                        </p>
                      ) : null}
                      {selectedAgentId > 0 ? (
                        agentDetailQuery.isLoading ? (
                          <Skeleton className="mt-3 h-16 w-full" />
                        ) : agentDetailQuery.data?.prompt_template ? (
                          <details className="mt-3 rounded-[10px] border border-border bg-muted/30 p-3 text-xs">
                            <summary className="cursor-pointer font-medium">
                              {t('agentPrompt')}
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap text-[11px] text-muted-foreground">
                              {agentDetailQuery.data.prompt_template}
                            </pre>
                          </details>
                        ) : null
                      ) : null}
                    </fieldset>
                  )}
                </form.Field>
              </Card>

              <Card className="p-5">
                <SectionTitle>{t('paramsTitle')}</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {PARAM_FIELDS.map((name) => (
                    <form.Field key={name} name={name}>
                      {(field) => {
                        const options = paramsQuery.data?.[name] ?? [];
                        const current = field.state.value;
                        const showCurrent = current.length > 0 && !options.includes(current);

                        return (
                          <div className="flex flex-col gap-1">
                            <Label
                              htmlFor={`studio-${name}`}
                              className="text-2xs text-muted-foreground"
                            >
                              {t(name)}
                            </Label>
                            <Select
                              id={`studio-${name}`}
                              value={current}
                              disabled={paramsQuery.isLoading}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                            >
                              <option value="">{t('paramsPlaceholder')}</option>
                              {showCurrent ? <option value={current}>{current}</option> : null}
                              {options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </Select>
                            {errorMessage(field.state.meta.errors) ? (
                              <p className="text-xs text-destructive">
                                {errorMessage(field.state.meta.errors)}
                              </p>
                            ) : null}
                          </div>
                        );
                      }}
                    </form.Field>
                  ))}
                </div>
                {paramsQuery.error ? (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTitle>{t('paramsError')}</AlertTitle>
                    <AlertDescription>
                      <Button
                        className="mt-3"
                        variant="outline"
                        size="sm"
                        onClick={() => void paramsQuery.refetch()}
                      >
                        {t('retry')}
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
              </Card>

              <Card className="p-5">
                <SectionTitle>{t('keywords')}</SectionTitle>
                <form.Field name="keywords">
                  {(field) => (
                    <div>
                      <KeywordInput
                        value={field.state.value}
                        onChange={(next) => field.handleChange(next)}
                        onBlur={field.handleBlur}
                        placeholder={t('keywordPlaceholder')}
                        addLabel={t('keywordAdd')}
                        removeLabel={(keyword) => t('keywordRemove', { keyword })}
                      />
                      {errorMessage(field.state.meta.errors) ? (
                        <p className="mt-2 text-xs text-destructive">
                          {errorMessage(field.state.meta.errors)}
                        </p>
                      ) : null}
                    </div>
                  )}
                </form.Field>
              </Card>

              <Card className="p-5">
                <SectionTitle>{t('targetWordCount')}</SectionTitle>
                <form.Field name="targetWordCount">
                  {(field) => (
                    <div>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="range"
                          min={100}
                          max={5000}
                          step={100}
                          value={Math.min(5000, Math.max(100, field.state.value))}
                          onChange={(event) => field.handleChange(event.target.valueAsNumber)}
                          onBlur={field.handleBlur}
                          aria-label={t('targetWordCount')}
                          className="h-8 flex-1 cursor-pointer accent-[var(--primary)]"
                        />
                        <Input
                          id="studio-target-word-count"
                          aria-label={t('targetWordCount')}
                          type="number"
                          min={1}
                          max={100000}
                          className="tnum w-[76px] text-right"
                          value={field.state.value}
                          onChange={(event) => {
                            const next = event.target.valueAsNumber;
                            field.handleChange(Number.isNaN(next) ? 0 : next);
                          }}
                          onBlur={field.handleBlur}
                        />
                      </div>
                      {errorMessage(field.state.meta.errors) ? (
                        <p className="mt-2 text-xs text-destructive">
                          {errorMessage(field.state.meta.errors)}
                        </p>
                      ) : null}
                    </div>
                  )}
                </form.Field>
              </Card>

              <Card className="p-5">
                <form.Field name="extraPrompt">
                  {(field) => (
                    <details>
                      <summary className="cursor-pointer list-none text-2xs font-medium tracking-[0.08em] text-muted-foreground uppercase select-none">
                        {t('extraPrompt')}
                      </summary>
                      <div className="mt-2">
                        <Label htmlFor="studio-extra-prompt" className="sr-only">
                          {t('extraPrompt')}
                        </Label>
                        <Textarea
                          id="studio-extra-prompt"
                          aria-label={t('extraPrompt')}
                          maxLength={4000}
                          placeholder={t('extraPromptPlaceholder')}
                          value={field.state.value}
                          onChange={(event) => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                        />
                        {errorMessage(field.state.meta.errors) ? (
                          <p className="mt-2 text-xs text-destructive">
                            {errorMessage(field.state.meta.errors)}
                          </p>
                        ) : null}
                      </div>
                    </details>
                  )}
                </form.Field>
              </Card>

              <Card className="p-5">
                <SectionTitle>{t('materials')}</SectionTitle>
                <MaterialUpload materials={materials} onChange={setMaterials} />
              </Card>
            </form>
          </fieldset>

          <p className="text-[11px] text-muted-foreground">{t('idempotentHint')}</p>
        </div>

        <div className="grid min-w-0 gap-4 min-[1240px]:grid-cols-[minmax(0,1fr)_300px]">
          <Card id="studio-canvas" className="flex min-w-0 flex-col p-5">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3.5">
              <div className="min-w-0">
                <h2 className="m-0 text-[17px] font-semibold">
                  {detail?.current_version?.title || detail?.title || t('preview')}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <ContentStatusBadge status={state.phase} />
                  {detail?.current_version ? (
                    <>
                      <span>{t('wordCount', { count: detail.current_version.word_count })}</span>
                      <span>·</span>
                      <span>{t('versionLabel', { id: detail.current_version.id })}</span>
                      <span>·</span>
                    </>
                  ) : null}
                  <span>{t('regeneratedCount', { count: currentRegenCount })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!body || isMobile}
                  onClick={() => void copyBody()}
                >
                  {t('copy')}
                </Button>
                <Button
                  type="submit"
                  form="studio-form"
                  disabled={isMobile || state.phase === 'generating' || submitMutation.isPending}
                >
                  {state.phase === 'generating' || submitMutation.isPending
                    ? t('submitting')
                    : t('submit')}
                </Button>
              </div>
            </div>

            {state.phase === 'generating' ? (
              <div className="mt-3.5 h-0.5 overflow-hidden rounded-full bg-primary/[0.08]">
                <i className="block h-full w-[38%] animate-[genSlide_1.2s_ease-in-out_infinite] rounded-full [background:var(--accent-grad)]" />
              </div>
            ) : null}

            <div
              className={cn(
                'flex-1 py-2',
                state.phase === 'generating' && 'opacity-45 blur-[0.3px]',
              )}
            >
              {submitError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>{t('errorTitle')}</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              {state.phase === 'generating' ? (
                <div className="space-y-3 py-4" aria-busy="true">
                  <p className="text-sm text-muted-foreground">
                    {t('elapsed', { seconds: elapsed })}
                  </p>
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : null}

              {state.phase === 'generate_failed' ? (
                <Alert variant="destructive">
                  <AlertTitle>{t('errorTitle')}</AlertTitle>
                  <AlertDescription>
                    <p>{errorText}</p>
                    <p className="mt-1 text-xs">
                      {state.canRetry ? t('retryableHint') : t('nonRetryableHint')}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {state.canRetry ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={submitMutation.isPending}
                          onClick={retry}
                        >
                          {t('retry')}
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={reset}>
                        {t('reset')}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              {state.phase === 'generate_failed' && detail && body ? (
                <div className="mt-4">
                  <p className="text-sm font-medium">{t('preview')}</p>
                  <MarkdownPreview markdown={body} />
                </div>
              ) : null}

              {state.phase === 'generated' ||
              state.phase === 'reviewed' ||
              state.phase === 'locked' ||
              state.phase === 'retained' ? (
                detailQuery.isLoading ? (
                  <div className="space-y-3 py-4" aria-busy="true">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : detailQuery.error ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t('detailError')}</AlertTitle>
                    <AlertDescription>
                      <Button
                        className="mt-3"
                        variant="outline"
                        size="sm"
                        onClick={() => void detailQuery.refetch()}
                      >
                        {t('retry')}
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : body ? (
                  <MarkdownPreview markdown={body} />
                ) : (
                  <EmptyState message={t('previewEmpty')} />
                )
              ) : null}

              {state.phase === 'configuring' ? (
                <EmptyState message={t('previewEmpty')} className="my-6" />
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-3.5">
              <span className="text-[11px] text-muted-foreground">{t('canvasHint')}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isMobile}
                onClick={favorite}
              >
                {t('favorite')}
              </Button>
            </div>
          </Card>

          <ScorePanel
            className="min-[1240px]:sticky min-[1240px]:top-[76px]"
            canReview={canReview && !isMobile}
            ready={readyToReview}
            reviewed={
              state.phase === 'reviewed' || state.phase === 'locked' || state.phase === 'retained'
            }
            score={score}
            loading={scoreLoading}
            error={panelError}
            keywords={keywordList}
            onReview={review}
            onRetry={retryScore}
            contentPresent={Boolean(state.contentId)}
            canRegenerate={canRegenerate && !isMobile}
            regenerating={submitMutation.isPending}
            remaining={remainingRegenerations}
            locked={state.phase === 'locked'}
            onRegenerate={regenerate}
            canRetain={canRetainNow && !isMobile}
            retaining={retainMutation.isPending}
            retained={state.phase === 'retained'}
            retainError={retainError}
            onRetain={() => setRetainOpen(true)}
          />
        </div>
      </div>

      <ConfirmDialog
        open={retainOpen}
        onOpenChange={setRetainOpen}
        title={t('retainConfirmTitle')}
        description={t('retainConfirmDescription')}
        confirmLabel={t('retainConfirm')}
        cancelLabel={t('cancel')}
        pending={retainMutation.isPending}
        onConfirm={retain}
      />
    </div>
  );
}
