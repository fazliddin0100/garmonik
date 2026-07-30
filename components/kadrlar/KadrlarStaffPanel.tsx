'use client';

import { Button } from '@/components/ui/button';
import UsersOverviewGrid, {
  useUsersOverviewTotal,
} from '@/components/users/UsersOverviewGrid';
import type { KadrlarOverviewSection } from '@/lib/kadrlar/users-overview';
import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';

export default function KadrlarStaffPanel() {
  const [sections, setSections] = useState<KadrlarOverviewSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      startTransition(() => {
        void (async () => {
          try {
            const res = await fetch('/api/kadrlar/users-overview', {
              credentials: 'include',
            });
            if (!res.ok) {
              if (!cancelled) setSections([]);
              return;
            }
            const data = (await res.json()) as {
              sections?: KadrlarOverviewSection[];
            };
            if (!cancelled) {
              setSections(Array.isArray(data.sections) ? data.sections : []);
            }
          } catch {
            if (!cancelled) setSections([]);
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUsers = useUsersOverviewTotal(sections);

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
                : `${totalUsers} ta xodim · Xodimlar bo‘limida ro‘yxatdan o‘tganlar`}
              </p>
            </div>
          </div>
          <Button
            asChild
            type="button"
            className="rounded-xl bg-violet-600 hover:bg-violet-700">
            <Link href="/users">
              <Plus className="size-4" />
              Xodim qo‘shish / tahrirlash
            </Link>
          </Button>
        </div>
      </section>

      <UsersOverviewGrid
        sections={sections}
        loading={loading}
        query={query}
        onQueryChange={setQuery}
      />
    </div>
  );
}
