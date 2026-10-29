'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MenuNode } from '@/lib/api/menus-client';
import { cn } from '@/lib/utils';

export function collectDescendantIds(node: MenuNode): number[] {
  const ids = [node.id];

  for (const child of node.children ?? []) {
    ids.push(...collectDescendantIds(child));
  }

  return ids;
}

export function flattenMenuIds(nodes: MenuNode[]): number[] {
  return nodes.flatMap((node) => collectDescendantIds(node));
}

function MenuTypeBadge({ type }: { type: number }) {
  const t = useTranslations('SystemMenus');

  const label = type === 0 ? t('typeDirectory') : type === 1 ? t('typeMenu') : t('typeButton');
  const variant = type === 0 ? 'secondary' : type === 1 ? 'info' : 'outline';

  return (
    <Badge variant={variant} className="shrink-0">
      {label}
    </Badge>
  );
}

function TreeNode({
  node,
  depth,
  selectedIds,
  onToggle,
  actions,
}: {
  node: MenuNode;
  depth: number;
  selectedIds?: Set<number>;
  onToggle?: (node: MenuNode, checked: boolean) => void;
  actions?: (node: MenuNode) => ReactNode;
}) {
  const t = useTranslations('Common');
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const checked = selectedIds ? selectedIds.has(node.id) : false;

  return (
    <li>
      <div
        className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5 text-sm transition-colors hover:bg-accent/30"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label={expanded ? t('collapse') : t('expand')}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        ) : (
          <span className="size-6" />
        )}

        {onToggle ? (
          <input
            type="checkbox"
            className="size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            checked={checked}
            aria-label={node.name}
            onChange={(event) => onToggle(node, event.target.checked)}
          />
        ) : null}

        <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>
        <MenuTypeBadge type={node.type} />
        {node.path ? (
          <span className="hidden max-w-40 truncate font-mono text-2xs text-muted-foreground sm:inline">
            {node.path}
          </span>
        ) : null}
        {node.perm_code ? (
          <code className="hidden max-w-48 truncate rounded-sm bg-muted/70 px-1.5 py-0.5 font-mono text-2xs text-muted-foreground md:inline">
            {node.perm_code}
          </code>
        ) : null}
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions(node)}</div> : null}
      </div>

      {hasChildren && expanded ? (
        <ul className={cn('space-y-0.5')}>
          {node.children?.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              onToggle={onToggle}
              actions={actions}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function MenuTree({
  nodes,
  selectedIds,
  onToggle,
  actions,
}: {
  nodes: MenuNode[];
  selectedIds?: Set<number>;
  onToggle?: (node: MenuNode, checked: boolean) => void;
  actions?: (node: MenuNode) => ReactNode;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedIds={selectedIds}
          onToggle={onToggle}
          actions={actions}
        />
      ))}
    </ul>
  );
}
