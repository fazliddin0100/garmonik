'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Download, Loader2, Upload } from 'lucide-react';

type Accent = 'violet' | 'emerald';

const accentBorder: Record<Accent, string> = {
  violet: 'border-violet-100 hover:border-violet-200',
  emerald: 'border-emerald-100 hover:border-emerald-200',
};

interface DataModuleCardProps {
  label: string;
  description: string;
  meta?: string;
  loading?: boolean;
  canImport?: boolean;
  accent?: Accent;
  onExport: () => void;
  onImport?: () => void;
}

export function DataModuleCard({
  label,
  description,
  meta,
  loading,
  canImport,
  accent = 'violet',
  onExport,
  onImport,
}: DataModuleCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1.5 rounded-lg border bg-white p-2 transition-colors',
        accentBorder[accent],
      )}>
      <div className="min-w-0">
        <p className="truncate text-xs leading-tight font-semibold text-slate-800" title={label}>
          {label}
        </p>
        <p
          className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-slate-500"
          title={description}>
          {description}
        </p>
        {meta ?
          <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400" title={meta}>
            {meta}
          </p>
        : null}
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="h-6 flex-1 rounded-md px-1.5 text-[10px]"
          disabled={loading}
          onClick={onExport}>
          {loading ?
            <Loader2 className="size-3 animate-spin" />
          : <>
              <Download className="size-3" />
              <span className="hidden min-[420px]:inline">Yuklab</span>
            </>
          }
        </Button>
        {canImport && onImport ?
          <Button
            type="button"
            size="xs"
            variant="secondary"
            className="h-6 flex-1 rounded-md px-1.5 text-[10px]"
            disabled={loading}
            onClick={onImport}>
            <Upload className="size-3" />
            <span className="hidden min-[420px]:inline">Yuklash</span>
          </Button>
        : null}
      </div>
    </div>
  );
}

/** Modul kartalari grid */
export const DATA_MODULE_GRID =
  'grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

export const DATA_MODULE_SECTION = 'space-y-2';

export const DATA_MODULE_CATEGORY =
  'mb-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase';

export const DATA_MODULE_TOOLBAR = 'flex flex-wrap items-center gap-2';

export const DATA_MODULE_SEARCH = 'h-8 max-w-xs flex-1 rounded-lg text-xs';

export const DATA_MODULE_TOOLBAR_BTN = 'h-8 rounded-lg px-2.5 text-xs';

export const DATA_MODULE_HINT =
  'rounded-lg border px-2 py-1.5 text-[10px] leading-snug';

export const DATA_MODULE_QUICK_LINK =
  'rounded-lg border border-violet-100 bg-linear-to-br from-white to-violet-50/40 p-2 shadow-none transition hover:border-violet-200';

export const DATA_MODULE_QUICK_GRID =
  'grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
