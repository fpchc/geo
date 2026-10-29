'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/page-shell';
import { collectDescendantIds } from '@/components/system/menu-tree';
import { RoleFormDialog } from '@/components/system/role-form-dialog';
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { getMenuTree, type MenuNode } from '@/lib/api/menus-client';
import { assignRoleMenus, deleteRole, getRoles, type Role } from '@/lib/api/roles-client';
import { cn } from '@/lib/utils';

function flattenPermissionNodes(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap((node) => [node, ...flattenPermissionNodes(node.children ?? [])]);
}

function PermissionGroup({
  disabled,
  onToggleGroup,
  onToggleNode,
  root,
  selected,
}: {
  disabled: boolean;
  onToggleGroup: (root: MenuNode, checked: boolean) => void;
  onToggleNode: (node: MenuNode, checked: boolean) => void;
  root: MenuNode;
  selected: Set<number>;
}) {
  const groupIds = collectDescendantIds(root);
  const checkedCount = groupIds.filter((id) => selected.has(id)).length;
  const allChecked = checkedCount === groupIds.length;
  const partiallyChecked = checkedCount > 0 && !allChecked;
  const checkboxRef = useRef<HTMLInputElement>(null);
  const nodes = flattenPermissionNodes(root.children ?? []);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = partiallyChecked;
    }
  }, [partiallyChecked]);

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            ref={checkboxRef}
            type="checkbox"
            className="size-[15px] accent-primary"
            aria-label={root.name}
            checked={allChecked}
            disabled={disabled}
            onChange={(event) => onToggleGroup(root, event.target.checked)}
          />
          <h3 className="m-0 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {root.name}
          </h3>
        </label>
        <Badge variant="info">{checkedCount}</Badge>
      </div>

      {nodes.length > 0 ? (
        <div className="grid gap-x-3 gap-y-0.5 sm:grid-cols-2">
          {nodes.map((node) => {
            const checked = selected.has(node.id);

            return (
              <label
                key={node.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-foreground/75 transition-colors hover:bg-foreground/[0.035]"
              >
                <input
                  type="checkbox"
                  className="size-[15px] accent-primary"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => onToggleNode(node, event.target.checked)}
                />
                {node.name}
              </label>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function RolesPage({ permissions }: { permissions: string[] }) {
  const t = useTranslations('SystemRoles');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const can = (permission: string) => permissions.includes('*') || permissions.includes(permission);

  const [page, setPage] = useState(1);
  const [draftCode, setDraftCode] = useState('');
  const [draftName, setDraftName] = useState('');
  const [filters, setFilters] = useState({ code: '', name: '' });
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Set<number>>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['roles', page, filters],
    queryFn: () =>
      getRoles({
        page,
        page_size: 20,
        code: filters.code || undefined,
        name: filters.name || undefined,
      }),
  });
  const menuQuery = useQuery({ queryKey: ['menu-tree'], queryFn: getMenuTree });
  const roles = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data?.items]);
  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null,
    [roles, selectedRoleId],
  );
  const draft = useMemo(
    () =>
      selectedRole
        ? (drafts[selectedRole.id] ?? new Set(selectedRole.menu_ids ?? []))
        : new Set<number>(),
    [drafts, selectedRole],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) {
        throw new Error(t('assignDescriptionEmpty'));
      }

      return assignRoleMenus(selectedRole.id, Array.from(draft));
    },
    onSuccess: () => {
      toast(t('saved'));
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (role: Role) => deleteRole(role.id),
    onSuccess: () => {
      setDeletingRole(null);
      setSelectedRoleId(null);
      toast(t('deleteSuccess'));
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  function updateDraft(role: Role, updater: (next: Set<number>) => Set<number>) {
    setDrafts((current) => {
      const base = current[role.id] ?? new Set(role.menu_ids ?? []);
      return { ...current, [role.id]: updater(new Set(base)) };
    });
  }

  function toggleGroup(root: MenuNode, checked: boolean) {
    if (!selectedRole) {
      return;
    }

    updateDraft(selectedRole, (current) => {
      for (const id of collectDescendantIds(root)) {
        if (checked) {
          current.add(id);
        } else {
          current.delete(id);
        }
      }

      return current;
    });
  }

  function toggleNode(node: MenuNode, checked: boolean) {
    if (!selectedRole) {
      return;
    }

    updateDraft(selectedRole, (current) => {
      for (const id of collectDescendantIds(node)) {
        if (checked) {
          current.add(id);
        } else {
          current.delete(id);
        }
      }

      return current;
    });
  }

  const totalPages = rolesQuery.data?.total_pages ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex items-center gap-2">
            {can('system:role:create') ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRole(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                {t('create')}
              </Button>
            ) : null}
            {can('system:role:assign') ? (
              <Button
                disabled={!selectedRole || saveMutation.isPending || Boolean(menuQuery.error)}
                onClick={() => saveMutation.mutate()}
              >
                <Save className="size-4" aria-hidden="true" />
                {saveMutation.isPending ? t('saving') : t('saveAuthorization')}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid items-start gap-4 md:grid-cols-[230px_minmax(0,1fr)]">
        <Card className="p-4">
          <p className="mb-3 mt-0 text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {t('roleList')}
          </p>

          <form
            className="mb-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setFilters({ code: draftCode.trim(), name: draftName.trim() });
            }}
          >
            <Input
              aria-label={t('searchCode')}
              placeholder={t('searchCode')}
              value={draftCode}
              onChange={(event) => setDraftCode(event.target.value)}
            />
            <Input
              aria-label={t('searchName')}
              placeholder={t('searchName')}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
            <Button type="submit" variant="outline" size="sm" className="w-full">
              {t('search')}
            </Button>
          </form>

          {rolesQuery.error ? (
            <Alert variant="destructive">
              <AlertTitle>{t('loadError')}</AlertTitle>
              <AlertDescription>
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => void rolesQuery.refetch()}
                >
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          ) : rolesQuery.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : roles.length === 0 ? (
            <EmptyState message={t('empty')} className="py-6" />
          ) : (
            <div className="-mx-1.5 flex flex-col gap-0.5">
              {roles.map((role) => {
                const active = role.id === selectedRole?.id;

                return (
                  <button
                    key={role.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      'flex items-center justify-between rounded-[9px] px-2 py-2.5 text-left text-[13px] text-foreground/70 transition-[background,color,transform] duration-200 hover:translate-x-0.5 hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active &&
                        'font-medium text-primary [background:linear-gradient(90deg,var(--nav-active-from),var(--nav-active-to))] shadow-[inset_0_0_0_1px_var(--border)]',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{role.name}</span>
                      <small className="mt-px block text-[11px] font-normal text-muted-foreground">
                        {role.code}
                        {role.description ? ` · ${role.description}` : ''}
                      </small>
                    </span>
                    <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                      {role.menu_ids?.length ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span>{t('pageInfo', { page: rolesQuery.data?.page ?? page, total: totalPages })}</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {t('previous')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={totalPages === 0 || page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          {!selectedRole ? (
            <EmptyState message={t('assignDescriptionEmpty')} className="py-10" />
          ) : menuQuery.isLoading ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
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
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="m-0 text-sm font-medium">
                    {t('permissionTitle', { name: selectedRole.name })}
                  </h2>
                  <Badge variant="info">{t('permissionCount', { count: draft.size })}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  {can('system:role:update') ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('editRole')}
                      aria-label={t('editRole')}
                      onClick={() => {
                        setEditingRole(selectedRole);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                  ) : null}
                  {can('system:role:delete') ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('deleteRole')}
                      aria-label={t('deleteRole')}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingRole(selectedRole)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </div>

              <p className="mb-0 mt-1 text-xs text-muted-foreground">{t('unsavedHint')}</p>

              {(menuQuery.data ?? []).map((root) => (
                <PermissionGroup
                  key={root.id}
                  root={root}
                  selected={draft}
                  disabled={!can('system:role:assign')}
                  onToggleGroup={toggleGroup}
                  onToggleNode={toggleNode}
                />
              ))}

              {saveMutation.error ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>{t('saveError')}</AlertTitle>
                  <AlertDescription>{saveMutation.error.message}</AlertDescription>
                </Alert>
              ) : null}
            </>
          )}
        </Card>
      </div>

      <RoleFormDialog
        open={formOpen}
        role={editingRole}
        existingRoles={roles}
        onOpenChange={setFormOpen}
        onSaved={() => {
          toast(t('roleSaved'));
          void queryClient.invalidateQueries({ queryKey: ['roles'] });
        }}
      />

      <Dialog
        open={Boolean(deletingRole)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingRole(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteDescription', { name: deletingRole?.name ?? '' })}
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
            <Button variant="outline" onClick={() => setDeletingRole(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingRole) {
                  deleteMutation.mutate(deletingRole);
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
