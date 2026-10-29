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
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createMenu,
  getMenu,
  type MenuNode,
  type MenuType,
  updateMenu,
} from '@/lib/api/menus-client';
import {
  buildMenuSchema,
  defaultMenuValues,
  flattenMenuOptions,
  isDescendant,
  type MenuValues,
} from '@/lib/system/menu-schema';

export function MenuFormDialog({
  open,
  menu,
  parentId,
  tree,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  menu: MenuNode | null;
  parentId: number;
  tree: MenuNode[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations('SystemMenus');
  const schema = useMemo(() => buildMenuSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<MenuValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultMenuValues,
  });

  const menuId = menu?.id;
  const detailQuery = useQuery({
    queryKey: ['system-menu', menuId],
    queryFn: () => getMenu(menuId ?? 0),
    enabled: open && menuId !== undefined,
    placeholderData: menu ?? undefined,
  });
  const source = detailQuery.data ?? menu;
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }

    const justOpened = !wasOpen.current;
    wasOpen.current = true;

    if (!source) {
      if (justOpened) {
        reset({ ...defaultMenuValues, parent_id: parentId });
      }

      return;
    }

    if (!justOpened && isDirty) {
      return;
    }

    reset({
      name: source.name,
      type: source.type,
      parent_id: source.parent_id,
      path: source.path,
      icon: source.icon ?? '',
      perm_code: source.perm_code ?? '',
      order_no: source.order_no,
      visible: source.visible,
    });
  }, [open, source, parentId, reset, isDirty]);

  const parentOptions = flattenMenuOptions(tree).filter(
    (option) => !source || (option.id !== source.id && !isDescendant(tree, source.id, option.id)),
  );

  const loadingDetail = Boolean(menu) && detailQuery.isPlaceholderData && !detailQuery.isError;

  const mutation = useMutation({
    mutationFn: async (values: MenuValues) => {
      const payload = {
        name: values.name,
        type: values.type as MenuType,
        parent_id: values.parent_id,
        path: values.path,
        icon: values.icon || null,
        perm_code: values.perm_code || null,
        order_no: values.order_no,
        visible: values.visible,
      };

      if (source) {
        return updateMenu(source.id, payload);
      }

      return createMenu(payload);
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
          <Skeleton className="h-72 w-full" />
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
            <div className="space-y-2">
              <Label htmlFor="menu-name">{t('name')}</Label>
              <Input id="menu-name" {...register('name')} />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="menu-type">{t('type')}</Label>
                <Select id="menu-type" {...register('type', { valueAsNumber: true })}>
                  <option value={0}>{t('typeDirectory')}</option>
                  <option value={1}>{t('typeMenu')}</option>
                  <option value={2}>{t('typeButton')}</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="menu-parent">{t('parent')}</Label>
                <Select id="menu-parent" {...register('parent_id', { valueAsNumber: true })}>
                  <option value={0}>{t('rootParent')}</option>
                  {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {'—'.repeat(option.depth)} {option.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="menu-path">{t('path')}</Label>
                <Input id="menu-path" placeholder="/system/example" {...register('path')} />
                {errors.path ? (
                  <p className="text-sm text-destructive">{errors.path.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="menu-icon">{t('icon')}</Label>
                <Input id="menu-icon" placeholder="settings" {...register('icon')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="menu-perm-code">{t('permCode')}</Label>
                <Input
                  id="menu-perm-code"
                  placeholder="system:menu:list"
                  {...register('perm_code')}
                />
                {errors.perm_code ? (
                  <p className="text-sm text-destructive">{errors.perm_code.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="menu-order">{t('orderNo')}</Label>
                <Input
                  id="menu-order"
                  type="number"
                  min={0}
                  {...register('order_no', { valueAsNumber: true })}
                />
                {errors.order_no ? (
                  <p className="text-sm text-destructive">{errors.order_no.message}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="menu-visible"
                type="checkbox"
                className="size-4 rounded border-input"
                {...register('visible')}
              />
              <Label htmlFor="menu-visible">{t('visible')}</Label>
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
