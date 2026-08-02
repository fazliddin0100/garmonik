'use client';

import KadrlarEmployeeDialog from '@/components/kadrlar/KadrlarEmployeeDialog';
import { Button } from '@/components/ui/button';
import UsersOverviewGrid, {
  useUsersOverviewTotal,
} from '@/components/users/UsersOverviewGrid';
import type { KadrlarOverviewSection } from '@/lib/kadrlar/users-overview';
import { usersViewPath, type UsersViewId } from '@/lib/users/views';
import { Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { startTransition, useCallback, useEffect, useState } from 'react';

function sectionToUsersView(
  sectionId: KadrlarOverviewSection['id'],
): UsersViewId {
  switch (sectionId) {
    case 'admins':
      return 'admins';
    case 'office-support':
      return 'staff';
    case 'doctors':
      return 'doctors';
    case 'nurses':
      return 'nurses';
    case 'laboratory':
      return 'laboratory';
    case 'reception':
      return 'reception';
    case 'pharmacists':
      return 'pharmacists';
    case 'kitchen':
      return 'hub';
    default:
      return 'hub';
  }
}

export default function KadrlarStaffPanel() {
  const router = useRouter();
  const [sections, setSections] = useState<KadrlarOverviewSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const loadSections = useCallback(async () => {
    try {
      const res = await fetch('/api/kadrlar/users-overview', {
        credentials: 'include',
      });
      if (!res.ok) {
        setSections([]);
        return;
      }
      const data = (await res.json()) as {
        sections?: KadrlarOverviewSection[];
      };
      setSections(Array.isArray(data.sections) ? data.sections : []);
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      startTransition(() => {
        void (async () => {
          if (cancelled) return;
          await loadSections();
        })();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [loadSections]);

  const totalUsers = useUsersOverviewTotal(sections);

  function openEditSection(sectionId: KadrlarOverviewSection['id']) {
    const view = sectionToUsersView(sectionId);
    router.push(usersViewPath(view));
  }

  return (
    <div className="mt-3 space-y-6">
      <section className="rounded-3xl border border-violet-200/50 bg-linear-to-br from-white via-violet-50/30 to-indigo-50/40 p-6 shadow-xl shadow-violet-200/25 backdrop-blur md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30">
              <Users className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/90">
                Kadrlar bo‘limi
              </p>
              <h2 className="mt-1.5 text-2xl font-bold text-slate-900">
                Xodimlar ro‘yxati
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                {loading ?
                  'Yuklanmoqda…'
                : `${totalUsers} ta xodim · Yangi xodim qo‘shish yoki tahrirlash uchun bo‘limni oching`}
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="rounded-xl bg-violet-600 hover:bg-violet-700"
            onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Xodim qo‘shish
          </Button>
        </div>
      </section>

      <UsersOverviewGrid
        sections={sections}
        loading={loading}
        query={query}
        onQueryChange={setQuery}
        onSectionEdit={openEditSection}
        subtitle="Pastdagi bo‘lim tugmasini bosing — xodimlar jadvali ochiladi"
      />

      <KadrlarEmployeeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setLoading(true);
          void loadSections();
        }}
      />
    </div>
  );
}
