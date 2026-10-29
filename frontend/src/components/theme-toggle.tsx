'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const t = useTranslations('Theme');

  function toggle() {
    const root = document.documentElement;
    const next = root.classList.contains('dark') ? 'light' : 'dark';

    root.classList.toggle('dark', next === 'dark');
    root.style.colorScheme = next;

    try {
      window.localStorage.setItem('geo-theme', next);
    } catch {
      // Preference persistence is best-effort.
    }

    window.dispatchEvent(new Event('geo:theme-change'));
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t('toggle')}
      title={t('toggle')}
      onClick={toggle}
    >
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
    </Button>
  );
}
