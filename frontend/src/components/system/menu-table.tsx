'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { MenuIcon } from '@/components/app-shell/menu-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MenuNode } from '@/lib/api/menus-client';
import { cn } from '@/lib/utils';

function MenuTypeBadge({ type }: { type: number }) {
  const t = useTranslations('SystemMenus');
  const label = type === 0 ? t('typeDirectory') : type === 1 ? t('typeMenu') : t('typeButton');
  const variant = type === 0 ? 'secondary' : type === 1 ? 'info' : 'outline';

  return <Badge variant={variant}>{label}</Badge>;
}

export function MenuTable({
  nodes,
  actions,
}: {
  nodes: MenuNode[];
  actions: (node: MenuNode) => ReactNode;
}) {
  const t = useTranslations('SystemMenus');
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());

  function toggle(id: number) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function renderNode(node: MenuNode, depth: number): ReactNode {
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isCollapsed = collapsed.has(node.id);
    const isGroup = node.type === 0;

    return (
      <FragmentRow key={node.id}>
        <TableRow className={cn(isGroup && 'bg-muted/35 hover:bg-muted/50')}>
          <TableCell>
            <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 20 }}>
              {hasChildren ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg"
                  aria-label={
                    isCollapsed
                      ? t('expandGroup', { name: node.name })
                      : t('collapseGroup', { name: node.name })
                  }
                  onClick={() => toggle(node.id)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-4" aria-hidden="true" />
                  )}
                </Button>
              ) : (
                <span className="size-[18px] shrink-0" />
              )}
              <span className="min-w-0">
                <b className={cn('block truncate', isGroup && 'font-semibold')}>{node.name}</b>
                {node.perm_code ? (
                  <small className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                    {node.perm_code}
                  </small>
                ) : null}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <MenuTypeBadge type={node.type} />
          </TableCell>
          <TableCell className="font-mono text-xs text-muted-foreground">
            {node.path || t('emptyValue')}
          </TableCell>
          <TableCell>
            {node.icon ? (
              <span
                className="inline-grid size-[26px] place-items-center rounded-lg bg-primary/[0.08] text-primary"
                title={node.icon}
              >
                <MenuIcon name={node.icon} className="size-3.5" />
              </span>
            ) : (
              <span className="text-faint">{t('emptyValue')}</span>
            )}
          </TableCell>
          <TableCell className="text-right">
            <span className="flex justify-end gap-0.5">{actions(node)}</span>
          </TableCell>
        </TableRow>

        {hasChildren && !isCollapsed
          ? node.children?.map((child) => renderNode(child, depth + 1))
          : null}
      </FragmentRow>
    );
  }

  return (
    <Table containerClassName="rounded-none border-0">
      <TableHeader>
        <tr>
          <TableHead>{t('name')}</TableHead>
          <TableHead>{t('type')}</TableHead>
          <TableHead>{t('path')}</TableHead>
          <TableHead>{t('icon')}</TableHead>
          <TableHead className="text-right">{t('actions')}</TableHead>
        </tr>
      </TableHeader>
      <TableBody>{nodes.map((node) => renderNode(node, 0))}</TableBody>
    </Table>
  );
}

function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
