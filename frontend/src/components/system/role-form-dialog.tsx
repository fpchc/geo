'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { createRole, getRole, type Role, updateRole } from '@/lib/api/roles-client';
import { buildRoleSchema, isDuplicateRoleCode, type RoleValues } from '@/lib/system/role-schema';

export function RoleFormDialog({
  open,
  role,
  existingRoles,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  role: Role | null;
  existingRoles: Role[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations('SystemRoles');
  const schema = useMemo(() => buildRoleSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<RoleValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', description: '' },
  });

  const roleId = role?.id;
  const detailQuery = useQuery({
    queryKey: ['system-role', roleId],
    queryFn: () => getRole(roleId ?? 0),
    enabled: open && roleId !== undefined,
    placeholderData: role ?? undefined,
  });
  const source = detailQuery.data ?? role;
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }

    const justOpened = !wasOpen.current;
    wasOpen.current = true;

    if (!justOpened && isDirty) {
      return;
    }

    reset({
      code: source?.code ?? '',
      name: source?.name ?? '',
      description: source?.description ?? '',
    });
  }, [open, source, reset, isDirty]);

  const loadingDetail = Boolean(role) && detailQuery.isPlaceholderData && !detailQuery.isError;

  const mutation = useMutation({
    mutationFn: async (values: RoleValues) => {
      if (isDuplicateRoleCode(values.code, existingRoles, source?.id)) {
        throw new Error(t('uniqueCode'));
      }

      if (source) {
        return updateRole(source.id, {
          name: values.name,
          description: values.description || null,
        });
      }

      return createRole({
        code: values.code,
        name: values.name,
        description: values.description || null,
        menu_ids: [],
      });
    },
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{source ? t('editTitle') : t('createTitle')}</DialogTitle>
          <DialogDescription>{t('formDescription')}</DialogDescription>
        </DialogHeader>

        {loadingDetail ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
            <div className="space-y-2">
              <Label htmlFor="role-code">{t('code')}</Label>
              <Input
                id="role-code"
                disabled={Boolean(source)}
                {...register('code')}
                aria-invalid={Boolean(errors.code)}
              />
              {errors.code ? (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-name">{t('name')}</Label>
              <Input id="role-name" {...register('name')} aria-invalid={Boolean(errors.name)} />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">{t('descriptionField')}</Label>
              <Textarea id="role-description" {...register('description')} />
              {errors.description ? (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              ) : null}
            </div>

            {detailQuery.isError ? (
              <Alert>
                <AlertDescription>{t('detailLoadError')}</AlertDescription>
              </Alert>
            ) : null}

            {mutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>{t('saveError')}</AlertTitle>
                <AlertDescription>{mutation.error.message}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? t('saving') : t('save')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
