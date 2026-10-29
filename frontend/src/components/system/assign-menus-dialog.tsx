'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { collectDescendantIds, MenuTree } from '@/components/system/menu-tree';
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
import { Skeleton } from '@/components/ui/skeleton';
import { getMenuTree, type MenuNode } from '@/lib/api/menus-client';
import { assignRoleMenus, type Role } from '@/lib/api/roles-client';

export function AssignMenusDialog({
  open,
  role,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  role: Role | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations('SystemRoles');
  const [selected, setSelected] = useState<Set<number>>(() => new Set(role?.menu_ids ?? []));
  const menuQuery = useQuery({
    queryKey: ['menu-tree'],
    queryFn: getMenuTree,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!role) {
        throw new Error(t('assignError'));
      }

      return assignRoleMenus(role.id, Array.from(selected));
    },
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
    },
  });

  function toggle(node: MenuNode, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);

      for (const id of collectDescendantIds(node)) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }

      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('assignTitle')}</DialogTitle>
          <DialogDescription>
            {role ? t('assignDescription', { name: role.name }) : t('assignDescriptionEmpty')}
          </DialogDescription>
        </DialogHeader>

        {menuQuery.isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-4/6" />
          </div>
        ) : menuQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>{t('menuLoadError')}</AlertTitle>
            <AlertDescription>
              <Button
                className="mt-3"
                variant="outline"
                size="sm"
                onClick={() => void menuQuery.refetch()}
              >
                {t('retry')}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border p-2">
            <MenuTree nodes={menuQuery.data ?? []} selectedIds={selected} onToggle={toggle} />
          </div>
        )}

        {mutation.error ? (
          <Alert variant="destructive">
            <AlertTitle>{t('assignError')}</AlertTitle>
            <AlertDescription>{mutation.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={!role || mutation.isPending || Boolean(menuQuery.error)}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? t('saving') : t('saveMenus')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
