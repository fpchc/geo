'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuIcon } from '@/components/app-shell/menu-icon';
import type { MenuNode } from '@/lib/navigation/types';
import { cn } from '@/lib/utils';

function isActive(pathname: string, item: MenuNode): boolean {
  if (item.path) {
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  }

  return item.children?.some((child) => isActive(pathname, child)) ?? false;
}

function NavItem({
  item,
  pathname,
  collapsed,
}: {
  item: MenuNode;
  pathname: string;
  collapsed: boolean;
}) {
  const active = isActive(pathname, item);

  return (
    <Link
      href={item.path ?? '/'}
      aria-current={active ? 'page' : undefined}
      title={item.label}
      className={cn(
        'relative flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] whitespace-nowrap transition-[background-color,color,transform] duration-200 ease-swift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'font-medium text-primary [background:linear-gradient(90deg,var(--nav-active-from),var(--nav-active-to))]'
          : 'text-foreground/65 hover:translate-x-0.5 hover:bg-foreground/[0.04] hover:text-foreground',
        collapsed && 'justify-center px-0',
        'max-sm:justify-center max-sm:px-0',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1/2 -left-0.5 w-[3px] rounded-full bg-primary transition-[height] duration-[250ms] ease-spring',
          active ? 'h-[18px]' : 'h-0',
        )}
      />
      <MenuIcon name={item.icon} className="size-[17px]" />
      <span className={cn('truncate', collapsed && 'hidden', 'max-sm:hidden')}>{item.label}</span>
    </Link>
  );
}

function NavList({
  items,
  pathname,
  collapsed,
  nested = false,
}: {
  items: MenuNode[];
  pathname: string;
  collapsed: boolean;
  nested?: boolean;
}) {
  return (
    <ul className={cn('flex flex-col gap-0.5', nested && 'pl-1')}>
      {items.map((item) => {
        if (item.children && item.children.length > 0) {
          return (
            <li key={item.id}>
              <p
                className={cn(
                  'mx-2 mt-3.5 mb-1.5 text-2xs font-medium tracking-[0.14em] text-muted-foreground uppercase first:mt-1',
                  collapsed && 'hidden',
                  'max-sm:hidden',
                )}
              >
                {item.label}
              </p>
              <NavList items={item.children} pathname={pathname} collapsed={collapsed} nested />
            </li>
          );
        }

        return (
          <li key={item.id}>
            <NavItem item={item} pathname={pathname} collapsed={collapsed} />
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarNav({
  menu,
  label,
  collapsed = false,
}: {
  menu: MenuNode[];
  label: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <NavList items={menu} pathname={pathname} collapsed={collapsed} />
    </nav>
  );
}
