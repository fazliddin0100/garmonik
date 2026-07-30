'use client';

import LaboratoryCatalogPanel from '@/components/laboratory/LaboratoryCatalogPanel';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchClinicResource } from '@/lib/clinic-data/client';
import {
  SERVICE_GROUPS,
  type ServiceGroupKey,
  type ServicePriceRow,
} from '@/lib/services/pricing-data';
import {
  FlaskConical,
  HeartPulse,
  Search,
  Stethoscope,
  Ticket,
  Waves,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const groupIcon: Record<
  ServiceGroupKey,
  React.ComponentType<{ className?: string }>
> = {
  fizioterapiya: Waves,
  kardiologiya: HeartPulse,
  laboratoriya: FlaskConical,
  'pullik-xizmat': Ticket,
  'shifokor-korigi': Stethoscope,
  uzi: Search,
};

function formatUzs(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} so'm`;
}

export default function ServicesPricingCatalog() {
  const [group, setGroup] = useState<ServiceGroupKey>('fizioterapiya');
  const [query, setQuery] = useState('');
  const [priceRows, setPriceRows] = useState<ServicePriceRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data =
          await fetchClinicResource<ServicePriceRow[]>('service-prices');
        if (!cancelled) setPriceRows(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setPriceRows([]);
          toast.error('Narxlar ro‘yxatini yuklab bo‘lmadi');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () =>
      priceRows.filter((item) => {
        if (item.group !== group) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          item.id.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q)
        );
      }),
    [group, query, priceRows],
  );

  const stats = useMemo(() => {
    if (rows.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...rows.map((r) => r.price)),
      max: Math.max(...rows.map((r) => r.price)),
    };
  }, [rows]);

  return (
    <div className="space-y-5 mt-3">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 p-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Xizmatlar va narxlar katalogi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Narxlar ro&apos;yxati bo&apos;limlar bo&apos;yicha ajratildi va
              qidiruv qo&apos;shildi.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
              Jami xizmat: {priceRows.length}
            </Badge>
          </div>
        </div>
        <Tabs
          value={group}
          onValueChange={(v) => setGroup(v as ServiceGroupKey)}>
          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            {SERVICE_GROUPS.map((g) => {
              const Icon = groupIcon[g.key];
              const count = priceRows.filter((r) => r.group === g.key).length;
              return (
                <TabsTrigger
                  key={g.key}
                  value={g.key}
                  className="h-auto rounded-xl border border-slate-200 bg-white px-3 py-2 data-[state=active]:border-violet-300 data-[state=active]:bg-violet-50">
                  <span className="inline-flex items-center gap-2 text-xs">
                    <Icon className="size-3.5" />
                    {g.label}
                    <Badge
                      variant="secondary"
                      className="h-5 rounded-full px-1.5 text-[10px]">
                      {count}
                    </Badge>
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {group === 'laboratoriya' ?
          <LaboratoryCatalogPanel title="Laboratoriya tahlillari — turkumlar (blanka)" />
        : null}

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Xizmat nomi, ID yoki kod bo'yicha qidirish..."
              className="pl-9"
            />
          </div>
          <Badge variant="secondary" className="justify-center">
            Min: {formatUzs(stats.min)}
          </Badge>
          <Badge variant="secondary" className="justify-center">
            Max: {formatUzs(stats.max)}
          </Badge>
        </div>

        <div className="max-h-[68vh] overflow-auto rounded-2xl border border-slate-100">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow className="border-slate-200/80 hover:bg-transparent">
                <TableHead className="w-16 text-xs font-semibold text-slate-600">
                  #
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  ID
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  Kod
                </TableHead>
                <TableHead className="min-w-[280px] text-xs font-semibold text-slate-600">
                  Xizmat nomi
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600">
                  Narxi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ?
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-slate-500">
                    Mos xizmat topilmadi.
                  </TableCell>
                </TableRow>
              : rows.map((row, idx) => (
                  <TableRow
                    key={`${row.id}-${row.code}`}
                    className="border-slate-100 text-sm text-slate-700">
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.code}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-violet-700">
                      {formatUzs(row.price)}
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
