import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MenuNode } from '@/lib/api/menus-client';
import zhCN from '@/messages/zh-CN.json';
import { collectDescendantIds, MenuTree } from './menu-tree';

const nodes: MenuNode[] = [
  {
    id: 1,
    name: 'System',
    type: 0,
    parent_id: 0,
    ancestors: '0',
    path: '/system',
    icon: null,
    perm_code: null,
    order_no: 1,
    visible: true,
    children: [
      {
        id: 2,
        name: 'Users',
        type: 1,
        parent_id: 1,
        ancestors: '0,1',
        path: '/system/users',
        icon: null,
        perm_code: null,
        order_no: 1,
        visible: true,
      },
      {
        id: 3,
        name: 'Roles',
        type: 1,
        parent_id: 1,
        ancestors: '0,1',
        path: '/system/roles',
        icon: null,
        perm_code: null,
        order_no: 2,
        visible: true,
      },
    ],
  },
];

function Harness() {
  const [selected, setSelected] = useState<Set<number>>(new Set());

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

  return <MenuTree nodes={nodes} selectedIds={selected} onToggle={toggle} />;
}

function renderTree() {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
      <Harness />
    </NextIntlClientProvider>,
  );
}

describe('MenuTree', () => {
  it('selects a parent together with its descendants', async () => {
    const user = userEvent.setup();
    renderTree();

    await user.click(screen.getByRole('checkbox', { name: 'System' }));

    expect(screen.getByRole('checkbox', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Users' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Roles' })).toBeChecked();
  });

  it('unselects a single child without clearing the parent', async () => {
    const user = userEvent.setup();
    renderTree();

    await user.click(screen.getByRole('checkbox', { name: 'System' }));
    await user.click(screen.getByRole('checkbox', { name: 'Users' }));

    expect(screen.getByRole('checkbox', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Users' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Roles' })).toBeChecked();
  });

  it('calls the toggle callback with the node', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
        <MenuTree nodes={nodes} selectedIds={new Set()} onToggle={onToggle} />
      </NextIntlClientProvider>,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Users' }));

    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 2, name: 'Users' }), true);
  });
});
