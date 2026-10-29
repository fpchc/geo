'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PageHeader } from '@/components/page-shell';
import { MenuFormDialog } from '@/components/system/menu-form-dialog';
import { MenuTable } from '@/components/system/menu-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { deleteMenu, getMenuTree, type MenuNode } from '@/lib/api/menus-client';

function countNodes(nodes: MenuNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children ?? []), 0);
}

export function MenusPage({ permissions }: { permissions: string[] }) {
  const t = useTranslations('SystemMenus');
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const can = (permission: string) => permissions.includes('*') || permissions.includes(permission);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuNode | null>(null);
  const [formParentId, setFormParentId] = useState(0);
  const [deletingMenu, setDeletingMenu] = useState<MenuNode | null>(null);

  const menuQuery = useQuery({ queryKey: ['menu-tree'], queryFn: getMenuTree });

  const deleteMutation = useMutation({
    mutationFn: (menu: MenuNode) => deleteMenu(menu.id),
    onSuccess: () => {
      setDeletingMenu(null);
      toast(t('deleted'));
      void queryClient.invalidateQueries({ queryKey: ['menu-tree'] });
      router.refresh();
    },
  });

  function openCreate(parentId: number) {
    setEditingMenu(null);
    setFormParentId(parentId);
    setFormOpen(true);
  }

  function openEdit(menu: MenuNode) {
    setEditingMenu(menu);
    setFormParentId(menu.parent_id);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          can('system:menu:create') ? (
            <Button onClick={() => openCreate(0)}>
              <Plus className="size-4" aria-hidden="true" />
              {t('createRoot')}
            </Button>
          ) : null
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5">
          <h2 className="m-0 text-sm font-medium">{t('navigationTree')}</h2>
          <Badge variant="secondary">
            {t('nodeCount', { count: countNodes(menuQuery.data ?? []) })}
          </Badge>
        </div>

        {menuQuery.error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>{t('loadError')}</AlertTitle>
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
          </div>
        ) : menuQuery.isLoading ? (
          <div className="space-y-2 p-4" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (menuQuery.data?.length ?? 0) === 0 ? (
          <div className="p-4">
            <EmptyState message={t('empty')} />
          </div>
        ) : (
          <MenuTable
            nodes={menuQuery.data ?? []}
            actions={(node) => (
              <>
                {can('system:menu:create') ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('addChild', { name: node.name })}
                    title={t('addChild', { name: node.name })}
                    onClick={() => openCreate(node.id)}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </Button>
                ) : null}
                {can('system:menu:update') ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('editNode', { name: node.name })}
                    title={t('editNode', { name: node.name })}
                    onClick={() => openEdit(node)}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                ) : null}
                {can('system:menu:delete') ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    aria-label={t('deleteNode', { name: node.name })}
                    title={t('deleteNode', { name: node.name })}
                    onClick={() => setDeletingMenu(node)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                ) : null}
              </>
            )}
          />
        )}
      </Card>

      <MenuFormDialog
        open={formOpen}
        menu={editingMenu}
        parentId={formParentId}
        tree={menuQuery.data ?? []}
        onOpenChange={setFormOpen}
        onSaved={() => {
          toast(t('saved'));
          void queryClient.invalidateQueries({ queryKey: ['menu-tree'] });
          router.refresh();
        }}
      />

      <Dialog
        open={Boolean(deletingMenu)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingMenu(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteDescription', { name: deletingMenu?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('deleteImpact')}</p>
          {deleteMutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>{t('deleteError')}</AlertTitle>
              <AlertDescription>{deleteMutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMenu(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingMenu) {
                  deleteMutation.mutate(deletingMenu);
                }
              }}
            >
              {deleteMutation.isPending ? t('deleting') : t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
