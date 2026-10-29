'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, RotateCcw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-shell';
import { AssignRolesDialog } from '@/components/system/users/assign-roles-dialog';
import { CreateUserDialog } from '@/components/system/users/create-user-dialog';
import { DeleteUserDialog } from '@/components/system/users/delete-user-dialog';
import { EditUserDialog } from '@/components/system/users/edit-user-dialog';
import { ResetPasswordDialog } from '@/components/system/users/reset-password-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import {
  assignUserRoles,
  createUser,
  deleteUser,
  listRolesForUsers,
  listUsers,
  resetUserPassword,
  type User,
  type UserCreate,
  type UserUpdate,
  updateUser,
} from '@/lib/api/users-client';
import {
  type CreateUserValues,
  type EditUserValues,
  isProtectedUser,
} from '@/lib/system/user-schemas';

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; user: User }
  | { type: 'roles'; user: User }
  | { type: 'reset'; user: User }
  | { type: 'delete'; user: User }
  | null;

type StatusFilter = 'active' | 'all' | 'inactive';

function toCreatePayload(values: CreateUserValues): UserCreate {
  return {
    username: values.username.trim(),
    password: values.password,
    nickname: values.nickname?.trim() || null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    is_active: values.is_active,
    is_superuser: values.is_superuser,
    role_ids: values.role_ids,
  };
}

function toUpdatePayload(values: EditUserValues): UserUpdate {
  return {
    nickname: values.nickname?.trim() || null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    is_active: values.is_active,
    is_superuser: values.is_superuser,
  };
}

function userInitial(user: User): string {
  return (user.nickname?.trim() || user.username).slice(0, 1).toUpperCase();
}

export function UsersPage({
  canAssign,
  canCreate,
  canDelete,
  canManageSuperuser,
  canReset,
  canUpdate,
  currentUserId,
}: {
  canAssign: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canManageSuperuser: boolean;
  canReset: boolean;
  canUpdate: boolean;
  currentUserId: number;
}) {
  const t = useTranslations('SystemUsers');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [usernameInput, setUsernameInput] = useState('');
  const [statusInput, setStatusInput] = useState<StatusFilter>('all');
  const [filters, setFilters] = useState<{
    is_active?: boolean;
    username?: string;
  }>({});
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['system-users', page, filters],
    queryFn: () =>
      listUsers({
        page,
        page_size: 20,
        ...filters,
      }),
    placeholderData: keepPreviousData,
  });
  const rolesQuery = useQuery({
    queryKey: ['system-user-roles'],
    queryFn: listRolesForUsers,
  });

  const users = usersQuery.data?.items ?? [];
  const roles = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data?.items]);
  const totalPages = Math.max(usersQuery.data?.total_pages ?? 1, 1);
  const roleNames = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);

  const openDialog = useCallback((next: DialogState) => {
    setDialogError(null);
    setDialog(next);
  }, []);

  const closeDialog = useCallback((open: boolean) => {
    if (!open) {
      setDialog(null);
      setDialogError(null);
    }
  }, []);

  const invalidateUsers = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['system-users'] });
  }, [queryClient]);

  const handleError = useCallback(
    (error: unknown) => {
      setDialogError(error instanceof Error ? error.message : t('operationFailed'));
    },
    [t],
  );

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      setDialog(null);
      toast(t('createSuccess'));
      invalidateUsers();
    },
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: (input: { userId: number; values: UserUpdate }) =>
      updateUser(input.userId, input.values),
    onSuccess: () => {
      setDialog(null);
      toast(t('updateSuccess'));
      invalidateUsers();
    },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      setDialog(null);
      toast(t('deleteSuccess'));
      invalidateUsers();
    },
    onError: handleError,
  });

  const resetMutation = useMutation({
    mutationFn: (input: { userId: number; password: string }) =>
      resetUserPassword(input.userId, input.password),
    onSuccess: () => {
      setDialog(null);
      toast(t('resetSuccess'));
    },
    onError: handleError,
  });

  const rolesMutation = useMutation({
    mutationFn: (input: { userId: number; roleIds: number[] }) =>
      assignUserRoles(input.userId, input.roleIds),
    onSuccess: () => {
      setDialog(null);
      toast(t('rolesSuccess'));
      invalidateUsers();
    },
    onError: handleError,
  });

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters({
      username: usernameInput.trim() || undefined,
      is_active: statusInput === 'all' ? undefined : statusInput === 'active',
    });
  }

  function resetFilters() {
    setUsernameInput('');
    setStatusInput('all');
    setFilters({});
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        description={t('description', {
          total: usersQuery.data?.total ?? 0,
          roles: roles.length,
        })}
        actions={
          canCreate ? (
            <Button onClick={() => openDialog({ type: 'create' })}>
              <Plus className="size-4" aria-hidden="true" />
              {t('createUser')}
            </Button>
          ) : null
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5">
          <h2 className="m-0 text-sm font-medium">{t('allUsers')}</h2>
          <form className="flex flex-wrap items-center justify-end gap-2" onSubmit={applyFilters}>
            <div className="relative w-56">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint"
                aria-hidden="true"
              />
              <Input
                id="user-search"
                aria-label={t('searchPlaceholder')}
                className="pl-8"
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                placeholder={t('searchPlaceholder')}
              />
            </div>
            <div className="w-32">
              <Select
                aria-label={t('statusFilter')}
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value as StatusFilter)}
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="active">{t('active')}</option>
                <option value="inactive">{t('inactive')}</option>
              </Select>
            </div>
            <Button type="submit" variant="outline" size="sm">
              {t('search')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {t('resetFilters')}
            </Button>
          </form>
        </div>

        {rolesQuery.error ? (
          <div className="p-4 pb-0">
            <Alert>
              <AlertTitle>{t('rolesLoadError')}</AlertTitle>
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
          </div>
        ) : null}

        {usersQuery.error ? (
          <div className="p-4 pb-0">
            <Alert variant="destructive">
              <AlertTitle>{t('loadError')}</AlertTitle>
              <AlertDescription>
                <p>{usersQuery.error.message}</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => void usersQuery.refetch()}
                >
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : usersQuery.isLoading ? (
          <div className="space-y-2 p-4" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-4">
            <EmptyState message={t('empty')} />
          </div>
        ) : (
          <Table containerClassName="rounded-none border-0">
            <TableHeader>
              <tr>
                <TableHead>{t('columns.user')}</TableHead>
                <TableHead>{t('columns.roles')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead className="text-right">{t('columns.lastLogin')}</TableHead>
                <TableHead className="text-right">{t('columns.actions')}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roleIds = user.role_ids ?? [];
                const protectedUser = isProtectedUser(user, currentUserId);
                const protectedReason =
                  user.id === currentUserId ? t('protectedCurrent') : t('protectedSuperuser');

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <span
                          className="grid size-[26px] shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-primary-strong [background:linear-gradient(135deg,var(--accent),var(--nav-active-to))]"
                          aria-hidden="true"
                        >
                          {userInitial(user)}
                        </span>
                        <span className="min-w-0">
                          <b className="block truncate font-medium">
                            {user.nickname?.trim() || user.username}
                          </b>
                          <small className="mt-0.5 block text-[11px] text-muted-foreground">
                            {user.username}
                          </small>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {roleIds.length === 0 ? (
                        <span className="text-muted-foreground">{t('noRoles')}</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {roleIds.map((id) => (
                            <Badge key={id} variant="secondary">
                              {roleNames.get(id) ?? `#${id}`}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        <Badge variant={user.is_active ? 'success' : 'secondary'}>
                          {user.is_active ? t('active') : t('inactive')}
                        </Badge>
                        {user.is_superuser ? (
                          <Badge variant="outline">{t('superuser')}</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {t('neverLoggedIn')}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex justify-end gap-0.5">
                        {canUpdate ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('actions.edit')}
                            aria-label={t('aria.edit', { username: user.username })}
                            onClick={() => openDialog({ type: 'edit', user })}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Button>
                        ) : null}
                        {canAssign ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('actions.assignRoles')}
                            aria-label={t('aria.assignRoles', { username: user.username })}
                            onClick={() => openDialog({ type: 'roles', user })}
                          >
                            <ShieldCheck className="size-3.5" aria-hidden="true" />
                          </Button>
                        ) : null}
                        {canReset ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={protectedUser}
                            title={protectedUser ? protectedReason : t('actions.resetPassword')}
                            aria-label={t('aria.resetPassword', { username: user.username })}
                            onClick={() => openDialog({ type: 'reset', user })}
                          >
                            <KeyRound className="size-3.5" aria-hidden="true" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={protectedUser}
                            title={protectedUser ? protectedReason : t('actions.delete')}
                            aria-label={t('aria.delete', { username: user.username })}
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDialog({ type: 'delete', user })}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        ) : null}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {t('pageInfo', { page, total: totalPages })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t('next')}
            </Button>
          </div>
        </div>
      </Card>

      <CreateUserDialog
        open={dialog?.type === 'create'}
        onOpenChange={closeDialog}
        roles={roles}
        submitting={createMutation.isPending}
        error={dialog?.type === 'create' ? dialogError : null}
        canManageSuperuser={canManageSuperuser}
        onSubmit={(values) => createMutation.mutate(toCreatePayload(values))}
      />

      <EditUserDialog
        open={dialog?.type === 'edit'}
        onOpenChange={closeDialog}
        user={dialog?.type === 'edit' ? dialog.user : null}
        currentUserId={currentUserId}
        canManageSuperuser={canManageSuperuser}
        submitting={updateMutation.isPending}
        error={dialog?.type === 'edit' ? dialogError : null}
        onSubmit={(values) => {
          if (dialog?.type === 'edit') {
            updateMutation.mutate({
              userId: dialog.user.id,
              values: toUpdatePayload(values),
            });
          }
        }}
      />

      <AssignRolesDialog
        open={dialog?.type === 'roles'}
        onOpenChange={closeDialog}
        user={dialog?.type === 'roles' ? dialog.user : null}
        roles={roles}
        submitting={rolesMutation.isPending}
        error={dialog?.type === 'roles' ? dialogError : null}
        onSubmit={(roleIds) => {
          if (dialog?.type === 'roles') {
            rolesMutation.mutate({ userId: dialog.user.id, roleIds });
          }
        }}
      />

      <ResetPasswordDialog
        open={dialog?.type === 'reset'}
        onOpenChange={closeDialog}
        user={dialog?.type === 'reset' ? dialog.user : null}
        submitting={resetMutation.isPending}
        error={dialog?.type === 'reset' ? dialogError : null}
        onSubmit={(password) => {
          if (dialog?.type === 'reset') {
            resetMutation.mutate({ userId: dialog.user.id, password });
          }
        }}
      />

      <DeleteUserDialog
        open={dialog?.type === 'delete'}
        onOpenChange={closeDialog}
        user={dialog?.type === 'delete' ? dialog.user : null}
        submitting={deleteMutation.isPending}
        error={dialog?.type === 'delete' ? dialogError : null}
        onConfirm={() => {
          if (dialog?.type === 'delete') {
            deleteMutation.mutate(dialog.user.id);
          }
        }}
      />
    </div>
  );
}
