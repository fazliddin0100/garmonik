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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import { loadLabCatalog } from '@/lib/laboratory/catalog-storage';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import type { MedicalServiceGroup } from '@/lib/service-groups/types';
import { SERVICE_GROUPS } from '@/lib/services/pricing-data';
import { serviceTypesToPriceRows } from '@/lib/services/service-types-to-prices';
import { findMatchingLabCategories } from '@/lib/service-types/lab-match';
import { type ServiceTypeRow } from '@/lib/service-types/types';
import {
  USERS_STAFF_FIELD_CLASS,
  UsersStaffFieldLabel,
  UsersStaffFormDialog,
  UsersStaffFormSection,
  UsersStaffHero,
} from '@/components/users/users-staff-ui';
import { cn } from '@/lib/utils';
import {
  Banknote,
  ChevronDown,
  Ellipsis,
  FlaskConical,
  Layers,
  Tags,
} from 'lucide-react';
import { Fragment, startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const BUILTIN_SERVICE_GROUP_LABELS = SERVICE_GROUPS.map((g) => g.label);

const ALL_TAB = 'all';
const LEGACY_RESET_KEY = 'garmonik-service-types-reset-v2';

function formatUzs(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} so'm`;
}

function normalizeServiceTypeRow(row: ServiceTypeRow): ServiceTypeRow {
  return {
    ...row,
    price: Number.isFinite(row.price) ? Math.max(0, row.price) : 0,
  };
}

const TAB_TRIGGER_CLASS =
  'inline-flex !h-auto min-h-11 shrink-0 flex-none items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/60 data-[state=active]:border-violet-600 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:hover:bg-violet-600 data-[state=active]:[&_.tab-count]:bg-white/20 data-[state=active]:[&_.tab-count]:text-white';

const TAB_COUNT_CLASS =
  'tab-count inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600';

const ROW_ACTION_BTN_CLASS =
  'size-10 shrink-0 rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700';

function rowSearchHaystack(r: ServiceTypeRow): string {
  return [r.group, r.name, String(r.price), String(r.rowNum)]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ');
}

type FormState = {
  group: string;
  name: string;
  price: string;
};

function emptyForm(): FormState {
  return {
    group: '',
    name: '',
    price: '',
  };
}

function nextRowNum(rows: ServiceTypeRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.rowNum), 0) + 1;
}

function nextServiceId(rows: ServiceTypeRow[]): string {
  const numericIds = rows
    .map((row) => Number.parseInt(row.serviceId, 10))
    .filter((value) => Number.isFinite(value));
  const max = numericIds.length > 0 ? Math.max(...numericIds) : 65_000;
  let candidate = max + 1;
  const taken = new Set(rows.map((row) => row.serviceId.trim()));
  while (taken.has(String(candidate))) candidate += 1;
  return String(candidate);
}

function isActiveGroupStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return (
    !normalized ||
    normalized === 'active' ||
    normalized === 'aktiv' ||
    normalized === 'актив'
  );
}

export default function ServiceTypesPanel() {
  const [rows, setRows] = useState<ServiceTypeRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [clinicGroups, setClinicGroups] = useState<string[]>([]);
  const [labCatalog, setLabCatalog] = useState<LabCategory[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [searchQuery, setSearchQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const skipFirstPersist = useRef(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const [next, groupsRaw] = await Promise.all([
            fetchClinicResource<ServiceTypeRow[]>('service-types'),
            fetchClinicResource<MedicalServiceGroup[]>(
              'medical-service-groups',
            ).catch(() => [] as MedicalServiceGroup[]),
          ]);
          const shouldReset =
            typeof window !== 'undefined' &&
            !window.localStorage.getItem(LEGACY_RESET_KEY);
          if (shouldReset) {
            window.localStorage.setItem(LEGACY_RESET_KEY, '1');
            await saveClinicResource('service-types', []);
            startTransition(() => {
              if (cancelled) return;
              setRows([]);
              setClinicGroups(
                Array.isArray(groupsRaw) ?
                  groupsRaw
                    .filter((g) => g.name?.trim() && isActiveGroupStatus(g.status))
                    .map((g) => g.name.trim())
                : [],
              );
              setHydrated(true);
            });
            skipFirstPersist.current = true;
            return;
          }
          startTransition(() => {
            if (cancelled) return;
            const list = Array.isArray(next) ? next : [];
            setRows(list.map(normalizeServiceTypeRow));
            setClinicGroups(
              Array.isArray(groupsRaw) ?
                groupsRaw
                  .filter((g) => g.name?.trim() && isActiveGroupStatus(g.status))
                  .map((g) => g.name.trim())
              : [],
            );
            setHydrated(true);
          });
        } catch {
          startTransition(() => {
            if (cancelled) return;
            setRows([]);
            setClinicGroups([]);
            setHydrated(true);
          });
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadLabCatalog()
      .then((c) => setLabCatalog(Array.isArray(c) ? c : []))
      .catch(() => setLabCatalog([]));
  }, []);

  const groupSelectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const label of BUILTIN_SERVICE_GROUP_LABELS) {
      if (label.trim()) set.add(label.trim());
    }
    for (const name of clinicGroups) {
      if (name.trim()) set.add(name.trim());
    }
    for (const r of rows) {
      if (r.group.trim()) set.add(r.group.trim());
    }
    if (form.group.trim()) set.add(form.group.trim());
    return [...set].sort((a, b) => a.localeCompare(b, 'uz'));
  }, [clinicGroups, rows, form.group]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    void (async () => {
      try {
        await saveClinicResource('service-types', rows);
        // Katalog / kassa / navbat uchun service-prices sinxroni
        await saveClinicResource(
          'service-prices',
          serviceTypesToPriceRows(rows),
        ).catch(() => undefined);
      } catch {
        toast.error('Xizmat turlarini saqlab bo‘lmadi');
      }
    })();
  }, [rows, hydrated]);

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

  const matchedLabCount = useMemo(() => {
    return rows.filter((row) => findMatchingLabCategories(row, labCatalog).length > 0)
      .length;
  }, [rows, labCatalog]);

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

  const deleteTarget = useMemo(
    () => rows.find((r) => r.id === deleteId) ?? null,
    [rows, deleteId],
  );

  function openCreate() {
    setEditingId(null);
    setFormError('');
    setForm({
      ...emptyForm(),
      group: activeTab !== ALL_TAB ? activeTab : '',
    });
    setDialogOpen(true);
  }

  function openEdit(r: ServiceTypeRow) {
    setEditingId(r.id);
    setFormError('');
    setForm({
      group: r.group,
      name: r.name,
      price: r.price > 0 ? String(r.price) : '',
    });
    setDialogOpen(true);
  }

  function saveRow() {
    const group = form.group.trim();
    const name = form.name.trim();
    const price = Math.max(0, Number.parseFloat(form.price.replace(/\s/g, '')) || 0);

    if (!group) {
      setFormError('Guruh majburiy.');
      return;
    }
    if (!name) {
      setFormError('Nom majburiy.');
      return;
    }
    if (!form.price.trim()) {
      setFormError('Narx majburiy.');
      return;
    }

    const existing = editingId ? rows.find((r) => r.id === editingId) : null;

    setFormError('');
    const payload: ServiceTypeRow = {
      id: editingId ?? `svc-${crypto.randomUUID()}`,
      serviceId: existing?.serviceId ?? nextServiceId(rows),
      code: existing?.code ?? '',
      group,
      name,
      price,
      rowNum: existing?.rowNum ?? nextRowNum(rows),
    };

    if (editingId) {
      setRows((prev) => prev.map((r) => (r.id === editingId ? payload : r)));
    } else {
      setRows((prev) => [...prev, payload]);
    }
    setDialogOpen(false);
    setEditingId(null);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setRows((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
  }

  function toggleExpandedRow(id: string) {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-3 space-y-6">
      <UsersStaffHero
        eyebrow="Boshqaruv paneli"
        title="Xizmat turlari"
        subtitle={
          hydrated ?
            `${rows.length} ta xizmat · ${groupTabs.length} ta guruh · ${matchedLabCount} ta laboratoriya mosligi`
          : 'Yuklanmoqda…'
        }
        icon={Tags}
        addLabel="Yangi xizmat"
        onAdd={openCreate}
      />

      <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur md:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Xizmatlar ro&apos;yxati</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {filtered.length} ta ko&apos;rsatilmoqda
              {activeTab !== ALL_TAB ? ` · ${activeTab}` : ''}
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Qidirish: guruh, nom, narx..."
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-10 text-sm focus-visible:border-violet-400 focus-visible:bg-white"
              aria-label="Xizmat turlari bo‘yicha qidiruv"
              autoComplete="off"
            />
            <Tags className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-col gap-4">
          <div className="overflow-x-auto pb-1">
            <TabsList className="!h-auto min-h-12 w-max max-w-full flex-wrap justify-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <TabsTrigger value={ALL_TAB} className={TAB_TRIGGER_CLASS}>
                Barchasi
                <span className={TAB_COUNT_CLASS}>{rows.length}</span>
              </TabsTrigger>
              {groupTabs.map((group) => (
                <TabsTrigger
                  key={group}
                  value={group}
                  title={group}
                  className={cn(TAB_TRIGGER_CLASS, 'max-w-56')}>
                  <span className="truncate">{group}</span>
                  <span className={TAB_COUNT_CLASS}>{groupCounts.get(group) ?? 0}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <div className="max-h-[min(68vh,720px)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="w-14 px-2 text-xs font-semibold text-slate-500">
                      <span className="sr-only">Ochish</span>
                    </TableHead>
                    <TableHead className="min-w-36 text-xs font-semibold text-slate-500">
                      Guruh
                    </TableHead>
                    <TableHead className="min-w-52 text-xs font-semibold text-slate-500">
                      Nomi
                    </TableHead>
                    <TableHead className="min-w-32 text-right text-xs font-semibold text-slate-500">
                      Narxi
                    </TableHead>
                    <TableHead className="w-20 text-right text-xs font-semibold text-slate-500">
                      Amallar
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ?
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-14 text-center text-sm text-slate-500">
                        {searchQuery.trim() ?
                          'Qidiruv bo‘yicha natija topilmadi.'
                        : activeTab === ALL_TAB ?
                          'Hozircha xizmat yo‘q. «Yangi xizmat» tugmasi orqali qo‘shing.'
                        : 'Bu guruhda xizmat yo‘q. Yangi xizmat qo‘shing.'}
                      </TableCell>
                    </TableRow>
                  : filtered.map((r) => {
                      const open = expandedRowIds.has(r.id);
                      const matched = findMatchingLabCategories(r, labCatalog);
                      return (
                        <Fragment key={r.id}>
                          <TableRow className="border-slate-100 transition-colors hover:bg-violet-50/40">
                            <TableCell className="w-14 px-2 py-3 align-middle">
                              <Button
                                type="button"
                                variant="ghost"
                                className={ROW_ACTION_BTN_CLASS}
                                aria-expanded={open}
                                aria-label={
                                  open ?
                                    'Tahlil parametrlarini yopish'
                                  : 'Tahlil parametrlarini ochish'
                                }
                                onClick={() => toggleExpandedRow(r.id)}>
                                <ChevronDown
                                  className={cn(
                                    'size-5 transition-transform duration-200',
                                    open && 'rotate-180',
                                  )}
                                />
                              </Button>
                            </TableCell>
                            <TableCell className="max-w-56 whitespace-normal py-3">
                              <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                                {r.group || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xl whitespace-normal py-3">
                              <p className="font-medium text-slate-900">{r.name}</p>
                            </TableCell>
                            <TableCell className="py-3 text-right font-medium tabular-nums text-slate-800">
                              {formatUzs(r.price)}
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className={ROW_ACTION_BTN_CLASS}
                                    aria-label="Amallar"
                                    onClick={(e) => e.stopPropagation()}>
                                    <Ellipsis className="size-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="min-w-44 rounded-xl p-1">
                                  <DropdownMenuItem
                                    className="rounded-lg py-2.5 text-sm"
                                    onClick={() => openEdit(r)}>
                                    Tahrirlash
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="rounded-lg py-2.5 text-sm text-rose-600 focus:text-rose-600"
                                    onClick={() => setDeleteId(r.id)}>
                                    O‘chirish
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {open ?
                            <TableRow className="border-slate-100 bg-violet-50/20 hover:bg-violet-50/20">
                              <TableCell colSpan={5} className="p-0 align-top">
                                <div className="space-y-3 border-t border-violet-100 px-4 py-4">
                                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
                                    <FlaskConical className="size-4" />
                                    Laboratoriya parametrlari
                                  </div>
                                  {matched.length === 0 ?
                                    <p className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm leading-relaxed text-slate-600">
                                      Ushbu xizmat nomi bilan mos laboratoriya blankasi
                                      topilmadi. Laboratoriya tahlillari uchun nomni katalog
                                      turkumi bilan yaqin yozing yoki tizim ID ni blanka{' '}
                                      <span className="font-mono text-xs">id</span> bilan
                                      moslashtiring.
                                    </p>
                                  : <Accordion
                                      type="multiple"
                                      className="w-full rounded-2xl border border-violet-100 bg-white px-2"
                                      defaultValue={matched.map((c) => c.id)}>
                                      {matched.map((cat) => (
                                        <AccordionItem
                                          key={cat.id}
                                          value={cat.id}
                                          className="border-violet-50">
                                          <AccordionTrigger className="py-3 text-sm hover:no-underline">
                                            <span className="text-left font-medium text-slate-800">
                                              {cat.title}
                                              <span className="ml-2 text-xs font-normal text-slate-500">
                                                ({cat.items.length} ta parametr)
                                              </span>
                                            </span>
                                          </AccordionTrigger>
                                          <AccordionContent className="pb-3">
                                            <div className="max-h-[min(320px,50vh)] overflow-auto rounded-xl border border-slate-100">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow className="hover:bg-transparent">
                                                    <TableHead className="h-9 text-xs">
                                                      Parametr
                                                    </TableHead>
                                                    <TableHead className="h-9 text-xs">
                                                      Me&apos;yor
                                                    </TableHead>
                                                    <TableHead className="h-9 text-xs">
                                                      Birlik
                                                    </TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {cat.items.map((it) => (
                                                    <TableRow
                                                      key={it.id}
                                                      className="text-xs text-slate-700">
                                                      <TableCell className="font-medium">
                                                        {it.name}
                                                      </TableCell>
                                                      <TableCell className="text-slate-600">
                                                        {it.norm ?? '—'}
                                                      </TableCell>
                                                      <TableCell className="text-slate-600">
                                                        {it.unit ?? '—'}
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
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
        </Tabs>
      </section>

      <UsersStaffFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setFormError('');
        }}
        editing={!!editingId}
        icon={Tags}
        createTitle="Yangi xizmat"
        editTitle="Xizmatni tahrirlash"
        createDescription="Guruhni tanlang va xizmat ma’lumotlarini kiriting."
        editDescription="Guruh, nom va narxni yangilang."
        createSaveLabel="Xizmat qo‘shish"
        onSave={saveRow}
        error={formError || undefined}>
        <UsersStaffFormSection title="Asosiy ma’lumotlar" icon={Layers}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="st-group" icon={Layers}>
                Guruh / kategoriya
              </UsersStaffFieldLabel>
              <Select
                value={form.group || undefined}
                onValueChange={(group) =>
                  setForm((f) => ({ ...f, group }))
                }>
                <SelectTrigger
                  id="st-group"
                  className={cn(USERS_STAFF_FIELD_CLASS, 'w-full')}>
                  <SelectValue placeholder="Guruh tanlang" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {groupSelectOptions.length === 0 ?
                    <SelectItem value="__empty" disabled>
                      Guruhlar yo‘q
                    </SelectItem>
                  : groupSelectOptions.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="st-name" icon={Tags}>
                Nomi
              </UsersStaffFieldLabel>
              <Input
                id="st-name"
                className={USERS_STAFF_FIELD_CLASS}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="st-price" icon={Banknote}>
                Narxi (so&apos;m)
              </UsersStaffFieldLabel>
              <Input
                id="st-price"
                inputMode="decimal"
                className={USERS_STAFF_FIELD_CLASS}
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                placeholder="Masalan: 150000"
              />
            </div>
          </div>
        </UsersStaffFormSection>
      </UsersStaffFormDialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xizmatni o‘chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ?
                `“${deleteTarget.name}” o‘chirilsinmi?`
              : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDelete}>
              O‘chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
