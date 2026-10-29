'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PageHeader } from '@/components/page-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  DEFAULT_PROMPT_KEY,
  getSetting,
  SCORING_RULE_KEY,
  updateSetting,
} from '@/lib/api/settings-client';

const dimensionSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(1),
  detail: z.string().optional(),
});

const scoringRuleSchema = z.object({
  full_score: z.number().positive(),
  pass_line: z.number().nullable().optional(),
  dimensions: z.array(dimensionSchema).min(1),
});

const settingsSchema = z.object({
  defaultPrompt: z.string().trim().min(1, 'promptRequired').max(20000),
  scoringRule: z
    .string()
    .trim()
    .min(1, 'scoringRuleInvalidJson')
    .superRefine((value, ctx) => {
      let parsed: unknown;

      try {
        parsed = JSON.parse(value);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'scoringRuleInvalidJson' });
        return;
      }

      if (!scoringRuleSchema.safeParse(parsed).success) {
        ctx.addIssue({ code: 'custom', message: 'scoringRuleInvalidShape' });
      }
    }),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export function ContentSettingsPage({ canUpdate }: { canUpdate: boolean }) {
  const t = useTranslations('ContentSettings');
  const isMobile = useIsMobile();
  const editable = canUpdate && !isMobile;
  const queryClient = useQueryClient();
  const [saveState, setSaveState] = useState<{
    message?: string;
    type: 'error' | 'success';
  } | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['content-settings'],
    queryFn: async () => {
      const [prompt, rule] = await Promise.all([
        getSetting(DEFAULT_PROMPT_KEY),
        getSetting(SCORING_RULE_KEY),
      ]);

      return { prompt, rule };
    },
    retry: 1,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { defaultPrompt: '', scoringRule: '{}' },
  });

  useEffect(() => {
    const data = settingsQuery.data;

    if (!data) {
      return;
    }

    reset({
      defaultPrompt:
        typeof data.prompt.value === 'string' ? data.prompt.value : String(data.prompt.value ?? ''),
      scoringRule: JSON.stringify(data.rule.value ?? {}, null, 2),
    });
  }, [settingsQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: SettingsValues) => {
      const scoringRule = JSON.parse(values.scoringRule) as unknown;
      await updateSetting(DEFAULT_PROMPT_KEY, values.defaultPrompt);
      await updateSetting(SCORING_RULE_KEY, scoringRule);
    },
    onSuccess: () => {
      setSaveState({ type: 'success' });
      void queryClient.invalidateQueries({ queryKey: ['content-settings'] });
    },
    onError: (error) => {
      setSaveState({
        type: 'error',
        message: error instanceof Error ? error.message : t('saveError'),
      });
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSaveState(null);
    saveMutation.mutate(values);
  });

  const saving = isSubmitting || saveMutation.isPending;
  const promptError = errors.defaultPrompt?.message ? t(errors.defaultPrompt.message) : null;
  const scoringRuleError = errors.scoringRule?.message ? t(errors.scoringRule.message) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          editable ? null : (
            <Badge variant="secondary">{isMobile ? t('mobileReadOnly') : t('readOnly')}</Badge>
          )
        }
      />

      {settingsQuery.isLoading ? <Skeleton className="h-64 w-full" /> : null}

      {settingsQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('loadError')}</AlertTitle>
          <AlertDescription>
            <p>
              {settingsQuery.error instanceof Error ? settingsQuery.error.message : t('loadError')}
            </p>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={() => void settingsQuery.refetch()}
            >
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {settingsQuery.data ? (
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <Card>
            <CardHeader>
              <CardTitle>{t('promptTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('promptHint')}</p>
              <Label htmlFor="setting-default-prompt">{t('promptLabel')}</Label>
              <Textarea
                id="setting-default-prompt"
                rows={8}
                readOnly={!editable}
                className={editable ? undefined : 'bg-muted'}
                aria-invalid={Boolean(errors.defaultPrompt)}
                {...register('defaultPrompt')}
              />
              {promptError ? <p className="text-sm text-destructive">{promptError}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('scoringRuleTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('scoringRuleHint')}</p>
              <Label htmlFor="setting-scoring-rule">{t('scoringRuleLabel')}</Label>
              <Textarea
                id="setting-scoring-rule"
                rows={14}
                readOnly={!editable}
                className={editable ? 'font-mono text-xs' : 'bg-muted font-mono text-xs'}
                aria-invalid={Boolean(errors.scoringRule)}
                {...register('scoringRule')}
              />
              {scoringRuleError ? (
                <p className="text-sm text-destructive">{scoringRuleError}</p>
              ) : null}
            </CardContent>
          </Card>

          {!canUpdate ? (
            <Alert>
              <AlertDescription>{t('readOnly')}</AlertDescription>
            </Alert>
          ) : null}

          {saveState?.type === 'success' ? (
            <Alert role="status">
              <AlertDescription>{t('saved')}</AlertDescription>
            </Alert>
          ) : null}

          {saveState?.type === 'error' ? (
            <Alert variant="destructive">
              <AlertTitle>{t('saveError')}</AlertTitle>
              <AlertDescription>{saveState.message}</AlertDescription>
            </Alert>
          ) : null}

          {editable ? (
            <Button type="submit" disabled={saving}>
              {saving ? t('saving') : t('save')}
            </Button>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
