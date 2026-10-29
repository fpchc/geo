'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
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
import type { Role } from '@/lib/api/users-client';
import { buildCreateUserSchema, type CreateUserValues } from '@/lib/system/user-schemas';
import { RoleCheckboxes } from './role-checkboxes';

const defaults: CreateUserValues = {
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
  is_active: true,
  is_superuser: false,
  role_ids: [],
};

export function CreateUserDialog({
  open,
  onOpenChange,
  roles,
  submitting,
  error,
  canManageSuperuser,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  submitting: boolean;
  error: string | null;
  canManageSuperuser: boolean;
  onSubmit: (values: CreateUserValues) => void;
}) {
  const t = useTranslations('SystemUsers');
  const schema = useMemo(() => buildCreateUserSchema(t), [t]);
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const roleIds = useWatch({ control: form.control, name: 'role_ids' }) ?? [];
  const isActive = useWatch({ control: form.control, name: 'is_active' }) ?? false;
  const isSuperuser = useWatch({ control: form.control, name: 'is_superuser' }) ?? false;

  useEffect(() => {
    if (open) {
      form.reset(defaults);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('createDescription')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
          <div className="space-y-2">
            <Label htmlFor="create-username">{t('username')}</Label>
            <Input id="create-username" autoComplete="off" {...form.register('username')} />
            {form.formState.errors.username ? (
              <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-password">{t('password')}</Label>
            <Input
              id="create-password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-nickname">{t('nickname')}</Label>
              <Input id="create-nickname" {...form.register('nickname')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">{t('phone')}</Label>
              <Input id="create-phone" {...form.register('phone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-email">{t('email')}</Label>
            <Input id="create-email" type="email" {...form.register('email')} />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => form.setValue('is_active', event.target.checked)}
              />
              {t('isActive')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isSuperuser}
                disabled={!canManageSuperuser}
                onChange={(event) => form.setValue('is_superuser', event.target.checked)}
              />
              {t('isSuperuser')}
            </label>
          </div>

          <div className="space-y-2">
            <Label>{t('selectRoles')}</Label>
            <RoleCheckboxes
              roles={roles}
              value={roleIds}
              onChange={(next) => form.setValue('role_ids', next)}
            />
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
              {submitting ? t('loading') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
