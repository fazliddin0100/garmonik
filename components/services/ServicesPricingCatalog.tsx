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
import { serviceGroupLabelToKey } from '@/lib/services/service-types-to-prices';
import type { ServiceTypeRow } from '@/lib/service-types/types';
import { cn } from '@/lib/utils';
import {
  FlaskConical,
  HeartPulse,
  Layers,
  Search,
  Stethoscope,
  Tags,
  Ticket,
  Waves,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const ALL_TAB = 'all';

type CatalogRow = {
  id: string;
  code: string;
  group: string;
  name: string;
  price: number;
  rowNum: number;
};

const groupIconByKey: Record<
  ServiceGroupKey,
  React.ComponentType<{ className?: string }>
> = {
  fizioterapiya: Waves,
  kardiologiya: HeartPulse,
  laboratoriya: FlaskConical,
  'pullik-xizmat': Ticket,
  'shifokor-korigi': Stethoscope,
  uzi: Search,
  boshqa: Layers,
};

function formatUzs(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} so'm`;
}

function iconForGroupLabel(label: string) {
  const key = serviceGroupLabelToKey(label);
  if (key) return groupIconByKey[key];
  return Tags;
}

function serviceTypeToCatalogRow(row: ServiceTypeRow): CatalogRow | null {
  const group = row.group.trim();
  const name = row.name.trim();
  if (!group || !name) return null;
  return {
    id: (row.serviceId || row.id).trim() || row.id,
    code: (row.code || row.serviceId || '').trim(),
    group,
    name,
    price: Number.isFinite(row.price) ? row.price : 0,
    rowNum: row.rowNum || 0,
  };
}

function priceRowToCatalogRow(row: ServicePriceRow): CatalogRow {
  return {
    id: row.id,
    code: row.code,
    group: row.groupLabel?.trim() || row.group,
    name: row.name,
    price: row.price,
    rowNum: 0,
  };
}

export default function ServicesPricingCatalog() {
  const [activeGroup, setActiveGroup] = useState(ALL_TAB);
  const [query, setQuery] = useState('');
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [typesRaw, pricesRaw] = await Promise.all([
          fetchClinicResource<ServiceTypeRow[]>('service-types').catch(
            () => [] as ServiceTypeRow[],
          ),
          fetchClinicResource<ServicePriceRow[]>('service-prices').catch(
            () => [] as ServicePriceRow[],
          ),
        ]);

        const fromTypes = (Array.isArray(typesRaw) ? typesRaw : [])
          .map(serviceTypeToCatalogRow)
          .filter((r): r is CatalogRow => r !== null);

        // Asosiy manba — dashboard «Xizmat turlari». Bo‘sh bo‘lsa, eski service-prices.
        const next =
          fromTypes.length > 0 ?
            fromTypes
          : (Array.isArray(pricesRaw) ? pricesRaw : []).map(priceRowToCatalogRow);

        if (!cancelled) setCatalogRows(next);
      } catch {
        if (!cancelled) {
          setCatalogRows([]);
          toast.error('Narxlar ro‘yxatini yuklab bo‘lmadi');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groupTabs = useMemo(() => {
    const fromData = new Set<string>();
    for (const row of catalogRows) {
      if (row.group) fromData.add(row.group);
    }

    // Avval standart klinik guruhlar (tartib saqlanadi), keyin qo‘shimcha guruhlar
    const ordered: string[] = [];
    for (const g of SERVICE_GROUPS) {
      if (fromData.has(g.label) || catalogRows.some((r) => serviceGroupLabelToKey(r.group) === g.key)) {
        // Prefer the actual label used in data if present
        const dataLabel =
          [...fromData].find((label) => serviceGroupLabelToKey(label) === g.key) ||
          g.label;
        if (!ordered.includes(dataLabel)) ordered.push(dataLabel);
        fromData.delete(dataLabel);
        for (const label of [...fromData]) {
          if (serviceGroupLabelToKey(label) === g.key) fromData.delete(label);
        }
      }
    }
    const extras = [...fromData].sort((a, b) => a.localeCompare(b, 'uz'));
    return [...ordered, ...extras];
  }, [catalogRows]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of catalogRows) {
      counts.set(row.group, (counts.get(row.group) ?? 0) + 1);
    }
    // Merge counts for labels that map to same builtin key
    const byKey = new Map<string, number>();
    for (const [label, count] of counts) {
      const key = serviceGroupLabelToKey(label) || label;
      byKey.set(key, (byKey.get(key) ?? 0) + count);
    }
    const result = new Map<string, number>();
    for (const tab of groupTabs) {
      const key = serviceGroupLabelToKey(tab) || tab;
      result.set(tab, byKey.get(key) ?? counts.get(tab) ?? 0);
    }
    return result;
  }, [catalogRows, groupTabs]);

  const rows = useMemo(() => {
    const filtered = catalogRows.filter((item) => {
      if (activeGroup !== ALL_TAB) {
        const activeKey = serviceGroupLabelToKey(activeGroup);
        const itemKey = serviceGroupLabelToKey(item.group);
        if (activeKey && itemKey) {
          if (activeKey !== itemKey) return false;
        } else if (item.group !== activeGroup) {
          return false;
        }
      }
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.id.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
      );
    });
    return filtered.sort((a, b) => {
      if (a.rowNum && b.rowNum && a.rowNum !== b.rowNum) return a.rowNum - b.rowNum;
      return a.name.localeCompare(b.name, 'uz');
    });
  }, [activeGroup, query, catalogRows]);

  const stats = useMemo(() => {
    if (rows.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...rows.map((r) => r.price)),
      max: Math.max(...rows.map((r) => r.price)),
    };
  }, [rows]);

  const showLabPanel =
    activeGroup !== ALL_TAB &&
    serviceGroupLabelToKey(activeGroup) === 'laboratoriya';

  return (
    <div className="mt-3 space-y-5">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 p-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Xizmatlar va narxlar katalogi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Dashboard → Xizmat turlari bo&apos;limida kiritilgan barcha xizmat
              va narxlar shu yerda ko&apos;rinadi.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
              Jami xizmat: {catalogRows.length}
            </Badge>
            <Badge variant="secondary">
              {groupTabs.length} ta guruh
            </Badge>
          </div>
        </div>

        <Tabs value={activeGroup} onValueChange={setActiveGroup}>
          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger
              value={ALL_TAB}
              className="h-auto rounded-xl border border-slate-200 bg-white px-3 py-2 data-[state=active]:border-violet-300 data-[state=active]:bg-violet-50">
              <span className="inline-flex items-center gap-2 text-xs">
                <Layers className="size-3.5" />
                Barchasi
                <Badge
                  variant="secondary"
                  className="h-5 rounded-full px-1.5 text-[10px]">
                  {catalogRows.length}
                </Badge>
              </span>
            </TabsTrigger>
            {groupTabs.map((group) => {
              const Icon = iconForGroupLabel(group);
              const count = groupCounts.get(group) ?? 0;
              return (
                <TabsTrigger
                  key={group}
                  value={group}
                  className={cn(
                    'h-auto rounded-xl border border-slate-200 bg-white px-3 py-2 data-[state=active]:border-violet-300 data-[state=active]:bg-violet-50',
                  )}>
                  <span className="inline-flex items-center gap-2 text-xs">
                    <Icon className="size-3.5" />
                    {group}
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

        {showLabPanel ?
          <LaboratoryCatalogPanel title="Laboratoriya tahlillari — turkumlar (blanka)" />
        : null}

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Xizmat nomi, ID, kod yoki guruh bo'yicha qidirish..."
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
                {activeGroup === ALL_TAB ?
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Guruh
                  </TableHead>
                : null}
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
                    colSpan={activeGroup === ALL_TAB ? 6 : 5}
                    className="py-8 text-center text-sm text-slate-500">
                    {catalogRows.length === 0 ?
                      'Hozircha xizmat yo‘q. Dashboard → Xizmat turlari bo‘limida qo‘shing.'
                    : 'Mos xizmat topilmadi.'}
                  </TableCell>
                </TableRow>
              : rows.map((row, idx) => (
                  <TableRow
                    key={`${row.id}-${row.code}-${row.name}-${idx}`}
                    className="border-slate-100 text-sm text-slate-700">
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.code || '—'}
                    </TableCell>
                    {activeGroup === ALL_TAB ?
                      <TableCell>
                        <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                          {row.group}
                        </span>
                      </TableCell>
                    : null}
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
