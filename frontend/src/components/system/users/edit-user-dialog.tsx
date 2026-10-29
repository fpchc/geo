'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { getUser, type User } from '@/lib/api/users-client';
import {
  buildEditUserSchema,
  type EditUserValues,
  isProtectedUser,
} from '@/lib/system/user-schemas';

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  canManageSuperuser,
  submitting,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  currentUserId: number;
  canManageSuperuser: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (values: EditUserValues) => void;
}) {
  const t = useTranslations('SystemUsers');
  const schema = useMemo(() => buildEditUserSchema(t), [t]);
  const form = useForm<EditUserValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nickname: '',
      email: '',
      phone: '',
      is_active: true,
      is_superuser: false,
    },
  });
  const userId = user?.id;
  const detailQuery = useQuery({
    queryKey: ['system-user', userId],
    queryFn: () => getUser(userId ?? 0),
    enabled: open && userId !== undefined,
    placeholderData: user ?? undefined,
  });
  const source = detailQuery.data ?? user;
  const isActive = useWatch({ control: form.control, name: 'is_active' }) ?? false;
  const isSuperuser = useWatch({ control: form.control, name: 'is_superuser' }) ?? false;
  const protectedUser = source ? isProtectedUser(source, currentUserId) : false;
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }

    const justOpened = !wasOpen.current;
    wasOpen.current = true;

    if (!source) {
      return;
    }

    if (!justOpened && form.formState.isDirty) {
      return;
    }

    form.reset({
      nickname: source.nickname ?? '',
      email: source.email ?? '',
      phone: source.phone ?? '',
      is_active: source.is_active,
      is_superuser: source.is_superuser,
    });
  }, [open, source, form, form.formState.isDirty]);

  const loadingDetail = Boolean(user) && detailQuery.isPlaceholderData && !detailQuery.isError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editTitle')}</DialogTitle>
          <DialogDescription>
            {t('editDescription', { username: source?.username ?? '' })}
          </DialogDescription>
        </DialogHeader>

        {loadingDetail ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
            <div className="space-y-2">
              <Label>{t('username')}</Label>
              <Input value={source?.username ?? ''} readOnly disabled />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-nickname">{t('nickname')}</Label>
                <Input id="edit-nickname" {...form.register('nickname')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">{t('phone')}</Label>
                <Input id="edit-phone" {...form.register('phone')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('email')}</Label>
              <Input id="edit-email" type="email" {...form.register('email')} />
              {form.formState.errors.email ? (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={protectedUser}
                  onChange={(event) =>
                    form.setValue('is_active', event.target.checked, { shouldDirty: true })
                  }
                />
                {t('isActive')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isSuperuser}
                  disabled={!canManageSuperuser || protectedUser}
                  onChange={(event) =>
                    form.setValue('is_superuser', event.target.checked, { shouldDirty: true })
                  }
                />
                {t('isSuperuser')}
              </label>
            </div>

            {protectedUser ? (
              <p className="text-sm text-muted-foreground">{t('protectedCurrent')}</p>
            ) : null}

            {detailQuery.isError ? (
              <Alert>
                <AlertDescription>{t('detailLoadError')}</AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{t('operationFailed')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t('loading') : t('save')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
