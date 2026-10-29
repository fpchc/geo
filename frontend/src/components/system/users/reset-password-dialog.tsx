'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
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
import type { User } from '@/lib/api/users-client';
import { buildResetPasswordSchema, type ResetPasswordValues } from '@/lib/system/user-schemas';

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  submitting,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (password: string) => void;
}) {
  const t = useTranslations('SystemUsers');
  const schema = useMemo(() => buildResetPasswordSchema(t), [t]);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ new_password: '', confirm_password: '' });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('resetTitle')}</DialogTitle>
          <DialogDescription>
            {t('resetDescription', { username: user?.username ?? '' })}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => onSubmit(values.new_password))}
        >
          <div className="space-y-2">
            <Label htmlFor="reset-new-password">{t('newPassword')}</Label>
            <Input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              {...form.register('new_password')}
            />
            {form.formState.errors.new_password ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.new_password.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">{t('confirmPassword')}</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              {...form.register('confirm_password')}
            />
            {form.formState.errors.confirm_password ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.confirm_password.message}
              </p>
            ) : null}
          </div>

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
              {submitting ? t('loading') : t('resetConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
