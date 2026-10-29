import {
  FileText,
  Folder,
  LayoutDashboard,
  Library,
  Menu,
  PenLine,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  dashboard: LayoutDashboard,
  file: FileText,
  'file-text': FileText,
  folder: Folder,
  library: Library,
  menu: Menu,
  pen: PenLine,
  setting: Settings,
  settings: Settings,
  shield: Shield,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  users: Users,
};

export function MenuIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = name ? ICONS[name] : undefined;

  if (!Icon) {
    return null;
  }

  return <Icon className={cn('size-4 shrink-0', className)} aria-hidden={true} />;
}
