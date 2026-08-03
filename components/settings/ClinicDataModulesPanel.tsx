'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DATA_MODULE_CATEGORY,
  DATA_MODULE_GRID,
  DATA_MODULE_HINT,
  DATA_MODULE_SEARCH,
  DATA_MODULE_SECTION,
  DATA_MODULE_TOOLBAR,
  DATA_MODULE_TOOLBAR_BTN,
  DataModuleCard,
} from '@/components/settings/DataModuleCard';
import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import {
  buildExportFile,
  describePayload,
  downloadJsonFile,
  exportFilename,
  parseImportPayload,
} from '@/lib/clinic-data/export-import';
import {
  DATA_MODULE_CATEGORIES,
  type DataModuleDef,
  isClinicResourceModule,
  modulesByCategory,
  type DataModuleId,
} from '@/lib/clinic-data/module-catalog';
import { Download, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface PendingImport {
  module: DataModuleDef;
  data: unknown;
  summary: string;
}

async function fetchModuleData(mod: DataModuleDef): Promise<unknown> {
  if (mod.kind === 'patients-registry') {
    const res = await fetch('/api/admin/data-modules/patients-registry', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    const json = (await res.json()) as { items?: unknown[] };
    return json.items ?? [];
  }
  return fetchClinicResource(mod.id);
}

async function saveModuleData(mod: DataModuleDef, data: unknown): Promise<void> {
  if (mod.kind === 'patients-registry') {
    const res = await fetch('/api/admin/data-modules/patients-registry', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: data }),
    });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = (await res.json()) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const result = (await res.json()) as {
      imported?: number;
      updated?: number;
      skipped?: number;
    };
    toast.success('Kartoteka import qilindi', {
      description: `Yangi: ${result.imported ?? 0}, yangilangan: ${result.updated ?? 0}`,
    });
    return;
  }
  if (isClinicResourceModule(mod)) {
    await saveClinicResource(mod.id, data);
  }
}

interface ClinicDataModulesPanelProps {
  canImport: boolean;
}

export default function ClinicDataModulesPanel({ canImport }: ClinicDataModulesPanelProps) {
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<DataModuleId | 'all' | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const importTarget = useRef<DataModuleDef | null>(null);

  const grouped = useMemo(() => modulesByCategory(), []);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DATA_MODULE_CATEGORIES;
    return DATA_MODULE_CATEGORIES.filter((cat) => {
      const mods = grouped.get(cat) ?? [];
      return mods.some(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q),
      );
    });
  }, [grouped, query]);

  const exportModule = useCallback(async (mod: DataModuleDef) => {
    setBusyId(mod.id);
    try {
      const data = await fetchModuleData(mod);
      const file = buildExportFile(mod.id, data);
      downloadJsonFile(exportFilename(mod.id), file);
      toast.success(`${mod.label} yuklab olindi`, {
        description: describePayload(data),
      });
    } catch (e) {
      toast.error('Eksport muvaffaqiyatsiz', {
        description: e instanceof Error ? e.message : 'Xatolik',
      });
    } finally {
      setBusyId(null);
    }
  }, []);

  const exportAll = useCallback(async () => {
    setBusyId('all');
    try {
      const entries: Record<string, unknown> = {};
      for (const mod of grouped.values()) {
        for (const m of mod) {
          entries[m.id] = await fetchModuleData(m);
        }
      }
      const file = {
        format: 'garmonik-full-export',
        version: 1,
        exportedAt: new Date().toISOString(),
        modules: entries,
      };
      const date = new Date().toISOString().slice(0, 10);
      downloadJsonFile(`garmonik-barcha-modullar-${date}.json`, file);
      toast.success('Barcha modullar yuklab olindi');
    } catch (e) {
      toast.error('To\'liq eksport muvaffaqiyatsiz', {
        description: e instanceof Error ? e.message : 'Xatolik',
      });
    } finally {
      setBusyId(null);
    }
  }, [grouped]);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const mod = importTarget.current;
    e.target.value = '';
    importTarget.current = null;
    if (!file || !mod) return;

    setBusyId(mod.id);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const data = parseImportPayload(parsed, mod.id);
      setPending({
        module: mod,
        data,
        summary: describePayload(data),
      });
      setConfirmText('');
    } catch (err) {
      toast.error('Faylni o\'qib bo\'lmadi', {
        description: err instanceof Error ? err.message : 'JSON noto\'g\'ri',
      });
    } finally {
      setBusyId(null);
    }
  }, []);

  const confirmImport = useCallback(async () => {
    if (!pending) return;
    setBusyId(pending.module.id);
    try {
      await saveModuleData(pending.module, pending.data);
      if (pending.module.kind === 'clinic-resource') {
        toast.success(`${pending.module.label} import qilindi`, {
          description: pending.summary,
        });
      }
      setPending(null);
      setConfirmText('');
    } catch (e) {
      toast.error('Import muvaffaqiyatsiz', {
        description: e instanceof Error ? e.message : 'Xatolik',
      });
    } finally {
      setBusyId(null);
    }
  }, [pending]);

  const startImport = useCallback((mod: DataModuleDef) => {
    importTarget.current = mod;
    fileRef.current?.click();
  }, []);

  useEffect(() => {
    if (!pending) setConfirmText('');
  }, [pending]);

  const confirmOk =
    pending !== null &&
    confirmText.trim().toLowerCase() === pending.module.id.toLowerCase();

  return (
    <div className={DATA_MODULE_SECTION}>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFileChange}
      />

      <div className={DATA_MODULE_TOOLBAR}>
        <div className="relative min-w-[140px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Qidirish..."
            className={`${DATA_MODULE_SEARCH} border-violet-200/80 pl-7`}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className={`${DATA_MODULE_TOOLBAR_BTN} border-violet-200`}
          disabled={busyId !== null}
          onClick={() => void exportAll()}>
          {busyId === 'all' ?
            <Loader2 className="mr-1 size-3 animate-spin" />
          : <Download className="mr-1 size-3" />}
          Hammasi
        </Button>
      </div>

      {!canImport && (
        <p className={`${DATA_MODULE_HINT} border-amber-200/80 bg-amber-50/80 text-amber-900`}>
          Faqat eksport. Import — admin uchun.
        </p>
      )}

      {filteredCategories.map((category) => {
        const mods = (grouped.get(category) ?? []).filter((m) => {
          const q = query.trim().toLowerCase();
          if (!q) return true;
          return (
            m.label.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.id.toLowerCase().includes(q)
          );
        });
        if (mods.length === 0) return null;

        return (
          <section key={category}>
            <h3 className={`${DATA_MODULE_CATEGORY} text-violet-700`}>{category}</h3>
            <div className={DATA_MODULE_GRID}>
              {mods.map((mod) => {
                const loading = busyId === mod.id;
                return (
                  <DataModuleCard
                    key={mod.id}
                    label={mod.label}
                    description={mod.description}
                    meta={mod.id}
                    loading={loading}
                    canImport={canImport}
                    accent="violet"
                    onExport={() => void exportModule(mod)}
                    onImport={() => startImport(mod)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <div className={`${DATA_MODULE_HINT} border-rose-200/70 bg-rose-50/50 text-rose-900`}>
        Import mavjud ma&apos;lumotlarni almashtiradi. Max fayl ~4 MB.
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modul importini tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  <strong>{pending?.module.label}</strong> moduli yangilanadi. Fayl tarkibi:{' '}
                  {pending?.summary}.
                </p>
                <p className="text-rose-700">
                  Davom etish uchun quyidagi modul nomini kiriting:{' '}
                  <code className="rounded bg-slate-100 px-1">{pending?.module.id}</code>
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={pending?.module.id}
                  className="rounded-lg"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction disabled={!confirmOk} onClick={() => void confirmImport()}>
              Import qilish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
