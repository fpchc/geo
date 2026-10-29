'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
import type { Role, User } from '@/lib/api/users-client';
import { RoleCheckboxes } from './role-checkboxes';

function AssignRolesForm({
  user,
  roles,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: {
  user: User;
  roles: Role[];
  submitting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (roleIds: number[]) => void;
}) {
  const t = useTranslations('SystemUsers');
  const [selected, setSelected] = useState<number[]>(user.role_ids ?? []);

  return (
    <>
      <RoleCheckboxes roles={roles} value={selected} onChange={setSelected} />

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
        <Button type="button" disabled={submitting} onClick={() => onSubmit(selected)}>
          {submitting ? t('loading') : t('save')}
        </Button>
      </DialogFooter>
    </>
  );
}

export function AssignRolesDialog({
  open,
  onOpenChange,
  user,
  roles,
  submitting,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  roles: Role[];
  submitting: boolean;
  error: string | null;
  onSubmit: (roleIds: number[]) => void;
}) {
  const t = useTranslations('SystemUsers');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('assignTitle')}</DialogTitle>
          <DialogDescription>
            {t('assignDescription', { username: user?.username ?? '' })}
          </DialogDescription>
        </DialogHeader>

        {open && user ? (
          <AssignRolesForm
            key={user.id}
            user={user}
            roles={roles}
            submitting={submitting}
            error={error}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
