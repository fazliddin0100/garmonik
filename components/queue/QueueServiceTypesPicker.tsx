'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  catalogRef,
  type LabCategory,
} from '@/lib/laboratory/catalog-types';
import { findMatchingLabCategories } from '@/lib/service-types/lab-match';
import type { ServiceTypeRow } from '@/lib/service-types/types';
import { serviceTypeOrderKey } from '@/lib/services/service-types-to-prices';
import { cn } from '@/lib/utils';
import { ChevronDown, FlaskConical, Tags } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

const ALL_TAB = 'all';

function formatUzs(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} so'm`;
}

function rowSearchHaystack(r: ServiceTypeRow): string {
  return [r.group, r.name, String(r.price), String(r.rowNum)]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ');
}

type QueueServiceTypesPickerProps = {
  rows: ServiceTypeRow[];
  labCatalog: LabCategory[];
  selectedKeys: Set<string>;
  onToggle: (key: string, checked: boolean) => void;
};

export default function QueueServiceTypesPicker({
  rows,
  labCatalog,
  selectedKeys,
  onToggle,
}: QueueServiceTypesPickerProps) {
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(
    () => new Set(),
  );

  const groupTabs = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.group.trim()) set.add(r.group.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'uz'));
  }, [rows]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const group = row.group.trim() || 'Boshqa';
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const list =
      activeTab === ALL_TAB ?
        [...rows]
      : rows.filter((r) => r.group.trim() === activeTab);
    const q = searchQuery.trim().toLowerCase();
    const searched =
      !q ? list : list.filter((r) => rowSearchHaystack(r).includes(q));
    return searched.sort(
      (a, b) => a.rowNum - b.rowNum || a.serviceId.localeCompare(b.serviceId),
    );
  }, [rows, activeTab, searchQuery]);

  function toggleExpandedRow(id: string) {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tabTriggerClass =
    'inline-flex !h-auto min-h-9 shrink-0 flex-none items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/60 data-[state=active]:border-violet-600 data-[state=active]:bg-violet-600 data-[state=active]:text-white';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Xizmatlar ro&apos;yxati
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Xizmat turlari katalogidagi xizmatlar. Belgilang — bemor qaysi
            xizmatlarni topshiradi. Laboratoriya blankasi parametrlari xizmatni
            ochganda ko&apos;rinadi.
          </p>
        </div>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Qidirish: guruh, nom, narx..."
          className="h-9 max-w-xs bg-white text-sm"
          aria-label="Xizmatlar bo‘yicha qidiruv"
          autoComplete="off"
        />
      </div>

      {rows.length === 0 ?
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          Xizmat turlari bo&apos;sh. Admin dashboardda «Xizmat turlari»
          bo&apos;limidan xizmat qo&apos;shishi kerak.
        </p>
      : <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <div className="overflow-x-auto pb-0.5">
            <TabsList className="!h-auto min-h-10 w-max max-w-full flex-wrap justify-start gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2">
              <TabsTrigger value={ALL_TAB} className={tabTriggerClass}>
                Barchasi
                <span className="rounded-full bg-black/10 px-1.5 text-[10px] font-semibold">
                  {rows.length}
                </span>
              </TabsTrigger>
              {groupTabs.map((group) => (
                <TabsTrigger
                  key={group}
                  value={group}
                  title={group}
                  className={cn(tabTriggerClass, 'max-w-48')}>
                  <span className="truncate">{group}</span>
                  <span className="rounded-full bg-black/10 px-1.5 text-[10px] font-semibold">
                    {groupCounts.get(group) ?? 0}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="max-h-[min(380px,46vh)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 w-10 text-xs"> </TableHead>
                    <TableHead className="h-9 w-10 text-xs"> </TableHead>
                    <TableHead className="h-9 min-w-28 text-xs">Guruh</TableHead>
                    <TableHead className="h-9 min-w-40 text-xs">Nomi</TableHead>
                    <TableHead className="h-9 min-w-24 text-right text-xs">
                      Narxi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ?
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-slate-500">
                        {searchQuery.trim() ?
                          'Qidiruv bo‘yicha natija topilmadi.'
                        : 'Bu guruhda xizmat yo‘q.'}
                      </TableCell>
                    </TableRow>
                  : filtered.map((r) => {
                      const key = serviceTypeOrderKey(r);
                      const selected = selectedKeys.has(key);
                      const open = expandedRowIds.has(r.id);
                      const matched = findMatchingLabCategories(r, labCatalog);
                      return (
                        <Fragment key={r.id}>
                          <TableRow
                            className={cn(
                              'border-slate-100',
                              selected && 'bg-violet-50/80',
                            )}>
                            <TableCell className="w-10 py-2">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(v) =>
                                  onToggle(key, v === true)
                                }
                                aria-label={`${r.name} — buyurtma`}
                              />
                            </TableCell>
                            <TableCell className="w-10 px-1 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-slate-500"
                                aria-expanded={open}
                                aria-label={
                                  open ?
                                    'Tahlil parametrlarini yopish'
                                  : 'Tahlil parametrlarini ochish'
                                }
                                onClick={() => toggleExpandedRow(r.id)}>
                                <ChevronDown
                                  className={cn(
                                    'size-4 transition-transform',
                                    open && 'rotate-180',
                                  )}
                                />
                              </Button>
                            </TableCell>
                            <TableCell className="max-w-40 py-2">
                              <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                                {r.group || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="py-2">
                              <p className="text-sm font-medium text-slate-900">
                                {r.name}
                              </p>
                            </TableCell>
                            <TableCell className="py-2 text-right text-sm tabular-nums text-slate-800">
                              {formatUzs(r.price)}
                            </TableCell>
                          </TableRow>
                          {open ?
                            <TableRow className="border-slate-100 bg-violet-50/20 hover:bg-violet-50/20">
                              <TableCell colSpan={5} className="p-0 align-top">
                                <div className="space-y-2 border-t border-violet-100 px-3 py-3">
                                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                                    <FlaskConical className="size-3.5" />
                                    Laboratoriya parametrlari
                                  </div>
                                  {matched.length === 0 ?
                                    <p className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
                                      Ushbu xizmat uchun mos laboratoriya
                                      blankasi topilmadi. Xizmatning o‘zini
                                      belgilash kifoya — kassaga shu nom bilan
                                      yuboriladi.
                                    </p>
                                  : <Accordion
                                      type="multiple"
                                      className="w-full rounded-lg border border-violet-100 bg-white px-2"
                                      defaultValue={matched.map((c) => c.id)}>
                                      {matched.map((cat) => (
                                        <AccordionItem
                                          key={cat.id}
                                          value={cat.id}
                                          className="border-violet-50">
                                          <AccordionTrigger className="py-2 text-xs hover:no-underline">
                                            <span className="text-left font-medium text-slate-800">
                                              {cat.title}
                                              <span className="ml-2 font-normal text-slate-500">
                                                ({cat.items.length} ta parametr)
                                              </span>
                                            </span>
                                          </AccordionTrigger>
                                          <AccordionContent className="pb-2">
                                            <div className="max-h-[min(220px,32vh)] overflow-auto rounded-lg border border-slate-100">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow className="hover:bg-transparent">
                                                    <TableHead className="h-8 w-10 text-xs">
                                                      {' '}
                                                    </TableHead>
                                                    <TableHead className="h-8 text-xs">
                                                      Parametr
                                                    </TableHead>
                                                    <TableHead className="h-8 text-xs">
                                                      Me&apos;yor
                                                    </TableHead>
                                                    <TableHead className="h-8 text-xs">
                                                      Birlik
                                                    </TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {cat.items.map((it) => {
                                                    const ref = catalogRef(
                                                      cat.id,
                                                      it.id,
                                                    );
                                                    const sel =
                                                      selectedKeys.has(ref);
                                                    return (
                                                      <TableRow
                                                        key={it.id}
                                                        className={cn(
                                                          'text-xs',
                                                          sel &&
                                                            'bg-violet-50/80',
                                                        )}>
                                                        <TableCell className="w-10">
                                                          <Checkbox
                                                            checked={sel}
                                                            onCheckedChange={(
                                                              v,
                                                            ) =>
                                                              onToggle(
                                                                ref,
                                                                v === true,
                                                              )
                                                            }
                                                            aria-label={`${it.name} — topshirish`}
                                                          />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                          {it.name}
                                                        </TableCell>
                                                        <TableCell>
                                                          {it.norm ?? '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                          {it.unit ?? '—'}
                                                        </TableCell>
                                                      </TableRow>
                                                    );
                                                  })}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      ))}
                                    </Accordion>
                                  }
                                </div>
                              </TableCell>
                            </TableRow>
                          : null}
                        </Fragment>
                      );
                    })
                  }
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Tags className="size-3.5" />
            {filtered.length} ta ko&apos;rsatilmoqda
            {activeTab !== ALL_TAB ? ` · ${activeTab}` : ''}
          </p>
        </Tabs>
      }
    </div>
  );
}
