'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MenuNode } from '@/lib/navigation/types';

function findTrail(items: MenuNode[], pathname: string, trail: MenuNode[] = []): MenuNode[] {
  for (const item of items) {
    if (item.path && (pathname === item.path || pathname.startsWith(`${item.path}/`))) {
      return [...trail, item];
    }

    if (item.children) {
      const found = findTrail(item.children, pathname, [...trail, item]);

      if (found.length > 0) {
        return found;
      }
    }
  }

  return [];
}

export function Breadcrumbs({ menu, homeLabel }: { menu: MenuNode[]; homeLabel: string }) {
  const pathname = usePathname();
  const trail = findTrail(menu, pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden min-w-0 items-center gap-2 text-[13px] text-muted-foreground sm:flex"
    >
      <Link
        href="/dashboard"
        className="inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {homeLabel}
      </Link>
      {trail.map((item, index) => {
        const last = index === trail.length - 1;

        return (
          <span key={item.id} className="flex min-w-0 items-center gap-2">
            <span className="text-foreground/20" aria-hidden="true">
              /
            </span>
            {item.path && !last ? (
              <Link
                href={item.path}
                className="inline-flex min-h-8 min-w-8 items-center justify-center truncate transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={last ? 'page' : undefined}
                className="truncate font-medium text-foreground"
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
