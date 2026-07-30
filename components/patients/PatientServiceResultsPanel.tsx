'use client';

import { Button } from '@/components/ui/button';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import { resultByOrderKey } from '@/lib/patients/laboratory-results';
import {
  downloadClinicalDocumentAsWord,
  printClinicalDocument,
  type ClinicalPrintResultItem,
} from '@/lib/patients/print-clinical-document';
import { resolveLabOrders } from '@/lib/patients/resolve-order-labels';
import {
  addSelectedServiceResults,
  areAllServiceResultsSelected,
  isServiceResultSelected,
  removeSelectedServiceResults,
  selectedServiceResultKey,
  toggleSelectedServiceResult,
  type SelectedServiceResultRef,
} from '@/lib/patients/selected-service-results';
import {
  findNarrowSpecialist,
  NARROW_SPECIALISTS,
} from '@/lib/patients/specialist-consultation';
import type { PatientRow } from '@/lib/patients/types';
import type { ServicePriceRow } from '@/lib/services/pricing-data';
import { Check, FileDown, FlaskConical, Printer, Stethoscope } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function formatEnteredAt(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type CategoryTab =
  | { id: 'lab'; label: string; kind: 'lab' }
  | { id: string; label: string; kind: 'specialist'; specialistId: string };

type PatientServiceResultsPanelProps = {
  patient: PatientRow;
  labCatalog: LabCategory[];
  priceRows: ServicePriceRow[];
  saving?: boolean;
  onSaveSelected: (selected: SelectedServiceResultRef[] | undefined) => void | Promise<void>;
};

export default function PatientServiceResultsPanel({
  patient,
  labCatalog,
  priceRows,
  saving = false,
  onSaveSelected,
}: PatientServiceResultsPanelProps) {
  const [draftSelected, setDraftSelected] = useState<SelectedServiceResultRef[] | undefined>(
    patient.selectedServiceResults,
  );

  useEffect(() => {
    setDraftSelected(patient.selectedServiceResults);
  }, [patient.selectedServiceResults]);

  const orders = useMemo(
    () => resolveLabOrders(patient.orderedLaboratoryKeys ?? [], labCatalog, priceRows),
    [patient.orderedLaboratoryKeys, labCatalog, priceRows],
  );

  /** Tahlillar bo‘limidagi bilan bir xil: buyurtmalar + kiritilgan natijalar */
  const labOptions = useMemo(() => {
    const resultKeys = (patient.laboratoryResults ?? [])
      .filter((r) => r.value.trim().length > 0)
      .map((r) => r.orderKey);
    const allKeys = [
      ...new Set([...(patient.orderedLaboratoryKeys ?? []), ...resultKeys]),
    ];
    const resolved = resolveLabOrders(allKeys, labCatalog, priceRows);
    const byKey = new Map(resolved.map((o) => [o.key, o]));

    // Avval buyurtma tartibida, keyin faqat natijasi bor qo‘shimcha kalitlar
    const orderedWithResults = resolved
      .map((order) => {
        const entry = resultByOrderKey(patient.laboratoryResults, order.key);
        const value = entry?.value?.trim() ?? '';
        if (!value) return null;
        return { order, entry, value };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Agar resolved bo‘sh bo‘lsa-yu natija bo‘lsa (kalit topilmasa)
    if (orderedWithResults.length === 0 && resultKeys.length > 0) {
      return resultKeys.map((key) => {
        const order = byKey.get(key) ?? {
          key,
          label: key,
          kind: 'service' as const,
          categoryTitle: undefined as string | undefined,
        };
        const entry = resultByOrderKey(patient.laboratoryResults, key);
        return {
          order,
          entry,
          value: entry?.value?.trim() ?? '',
        };
      }).filter((x) => x.value.length > 0);
    }

    return orderedWithResults;
  }, [patient.orderedLaboratoryKeys, patient.laboratoryResults, labCatalog, priceRows]);

  /** Buyurtma bor, lekin hali natija yo‘q — ma’lumot uchun */
  const pendingLabOrders = useMemo(() => {
    const withValue = new Set(labOptions.map((x) => x.order.key));
    return orders.filter((o) => !withValue.has(o.key));
  }, [orders, labOptions]);

  const specialistOptions = useMemo(
    () =>
      (patient.specialistConsultations ?? []).filter(
        (c) => c.consultationText.trim().length > 0,
      ),
    [patient.specialistConsultations],
  );

  const categoryTabs = useMemo((): CategoryTab[] => {
    const tabs: CategoryTab[] = [
      { id: 'lab', label: 'Laboratoriya', kind: 'lab' },
    ];

    for (const item of NARROW_SPECIALISTS) {
      tabs.push({
        id: `specialist:${item.id}`,
        label: item.label,
        kind: 'specialist',
        specialistId: item.id,
      });
    }

    // Katalogda yo‘q, lekin natijasi bor mutaxassis turlari
    for (const c of specialistOptions) {
      const sid = c.specialistId.trim();
      if (!sid || findNarrowSpecialist(sid)) continue;
      if (tabs.some((t) => t.kind === 'specialist' && t.specialistId === sid)) continue;
      tabs.push({
        id: `specialist:${sid}`,
        label: c.specialistLabel || sid,
        kind: 'specialist',
        specialistId: sid,
      });
    }

    return tabs;
  }, [specialistOptions]);

  const [activeTabId, setActiveTabId] = useState<string>('');

  useEffect(() => {
    if (categoryTabs.length === 0) return;
    if (!categoryTabs.some((t) => t.id === activeTabId)) {
      setActiveTabId(categoryTabs[0].id);
    }
  }, [categoryTabs, activeTabId]);

  const activeTab = categoryTabs.find((t) => t.id === activeTabId) ?? categoryTabs[0];

  const selectedItems = useMemo(() => {
    const refs = draftSelected ?? [];
    return refs
      .map((ref) => {
        if (ref.kind === 'lab') {
          const item = labOptions.find((x) => x.order.key === ref.orderKey);
          if (!item) return null;
          return { ref, kind: 'lab' as const, ...item };
        }
        const consultation = specialistOptions.find((c) => c.id === ref.consultationId);
        if (!consultation) return null;
        return { ref, kind: 'specialist' as const, consultation };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [draftSelected, labOptions, specialistOptions]);

  async function applySelection(next: SelectedServiceResultRef[] | undefined) {
    setDraftSelected(next);
    await onSaveSelected(next);
  }

  async function handleToggle(ref: SelectedServiceResultRef) {
    await applySelection(toggleSelectedServiceResult(draftSelected, ref));
  }

  const [exporting, setExporting] = useState(false);

  function buildDocInput(items: ClinicalPrintResultItem[], documentTitle: string) {
    return {
      patientName: patient.fullName,
      patientId: patient.id,
      diseaseType: patient.diseaseType,
      documentTitle,
      items,
      labConclusion: patient.labConclusion?.text,
    };
  }

  async function handlePrint(items: ClinicalPrintResultItem[], documentTitle: string) {
    if (items.length === 0) {
      toast.error('Chop etish uchun natija yo‘q');
      return;
    }
    setExporting(true);
    try {
      await printClinicalDocument(buildDocInput(items, documentTitle));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Chop etishda xatolik yuz berdi',
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleWord(items: ClinicalPrintResultItem[], documentTitle: string) {
    if (items.length === 0) {
      toast.error('Word uchun natija yo‘q');
      return;
    }
    setExporting(true);
    try {
      await downloadClinicalDocumentAsWord(buildDocInput(items, documentTitle));
      toast.success('Word fayl yuklab olindi — tahrirlashingiz mumkin');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Word yuklashda xatolik yuz berdi',
      );
    } finally {
      setExporting(false);
    }
  }

  function labItemToPrint(
    item: (typeof labOptions)[number],
  ): ClinicalPrintResultItem {
    return {
      kind: 'lab',
      title: item.order.label,
      subtitle: item.order.categoryTitle,
      body: item.value,
      meta:
        item.entry?.enteredAt ?
          `${formatEnteredAt(item.entry.enteredAt)}${
            item.entry.enteredByName ? ` · ${item.entry.enteredByName}` : ''
          }`
        : undefined,
    };
  }

  function specialistItemToPrint(
    consultation: (typeof specialistOptions)[number],
  ): ClinicalPrintResultItem {
    return {
      kind: 'specialist',
      title: consultation.specialistLabel || 'Mutaxassis',
      body: consultation.consultationText,
      meta:
        (consultation.consultationDate ||
          formatEnteredAt(consultation.updatedAt || consultation.createdAt)) +
        (consultation.createdByName ? ` · ${consultation.createdByName}` : ''),
    };
  }

  const activeLabList = activeTab?.kind === 'lab' ? labOptions : [];
  const activeSpecialistList =
    activeTab?.kind === 'specialist' ?
      specialistOptions.filter((c) => c.specialistId === activeTab.specialistId)
    : [];

  const activeCategoryRefs: SelectedServiceResultRef[] =
    activeTab?.kind === 'lab' ?
      activeLabList.map((item) => ({ kind: 'lab' as const, orderKey: item.order.key }))
    : activeSpecialistList.map((c) => ({
        kind: 'specialist' as const,
        consultationId: c.id,
      }));

  const allActiveSelected = areAllServiceResultsSelected(
    draftSelected,
    activeCategoryRefs,
  );
  const someActiveSelected = activeCategoryRefs.some((ref) =>
    isServiceResultSelected(draftSelected, ref),
  );

  const activeCategoryPrintItems: ClinicalPrintResultItem[] =
    activeTab?.kind === 'lab' ?
      activeLabList.map(labItemToPrint)
    : activeSpecialistList.map(specialistItemToPrint);

  const selectedPrintItems: ClinicalPrintResultItem[] = selectedItems.map((item) =>
    item.kind === 'lab' ? labItemToPrint(item) : specialistItemToPrint(item.consultation),
  );

  async function handleSelectAllActive() {
    if (activeCategoryRefs.length === 0) return;
    if (allActiveSelected) {
      await applySelection(
        removeSelectedServiceResults(draftSelected, activeCategoryRefs),
      );
      return;
    }
    await applySelection(addSelectedServiceResults(draftSelected, activeCategoryRefs));
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-sky-200/70 bg-linear-to-br from-sky-50/50 to-white p-5 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sky-900">
            <FlaskConical className="size-5" />
            <h3 className="font-semibold">Tibbiy xizmat natijalari</h3>
          </div>
          {activeTab && activeCategoryPrintItems.length > 0 ?
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-sky-200 text-sky-800"
                disabled={exporting}
                onClick={() =>
                  void handlePrint(
                    activeCategoryPrintItems,
                    `${activeTab.label} natijalari`,
                  )
                }>
                <Printer className="mr-1.5 size-4" />
                Chop etish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-sky-200 text-sky-800"
                disabled={exporting}
                onClick={() =>
                  void handleWord(
                    activeCategoryPrintItems,
                    `${activeTab.label} natijalari`,
                  )
                }>
                <FileDown className="mr-1.5 size-4" />
                Word
              </Button>
            </div>
          : null}
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Laboratoriya va tor mutaxassis bergan natijalarni bittadan yoki hammasini tanlang —
          ular «Tahlil natijalari» pastida ko‘rinadi. Kerak bo‘lsa Wordda yuklab tahrirlang.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {categoryTabs.map((tab) => {
            const selected = tab.id === activeTab?.id;
            const count =
              tab.kind === 'lab' ?
                labOptions.length
              : specialistOptions.filter((c) => c.specialistId === tab.specialistId).length;
            return (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className={
                  selected ?
                    tab.kind === 'lab' ?
                      'h-auto min-h-8 max-w-full whitespace-normal rounded-xl bg-emerald-700 px-3 py-1.5 text-left text-xs leading-snug hover:bg-emerald-800'
                    : 'h-auto min-h-8 max-w-full whitespace-normal rounded-xl bg-violet-700 px-3 py-1.5 text-left text-xs leading-snug hover:bg-violet-800'
                  : 'h-auto min-h-8 max-w-full whitespace-normal rounded-xl border-slate-200 px-3 py-1.5 text-left text-xs leading-snug text-slate-700'
                }
                onClick={() => setActiveTabId(tab.id)}>
                {tab.label}
                {count > 0 ?
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                    {count}
                  </span>
                : null}
              </Button>
            );
          })}
        </div>

        {!activeTab ?
          null
        : activeTab.kind === 'lab' ?
          activeLabList.length === 0 ?
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                {orders.length === 0 ?
                  'Tahlillar bo‘limida laboratoriya buyurtmasi yoki natija yo‘q.'
                : 'Laboratoriya natijalari hali kiritilmagan. Natijalar «Tahlillar»ga kiritilgach shu yerda ham chiqadi.'}
              </p>
              {pendingLabOrders.length > 0 ?
                <ul className="space-y-2">
                  {pendingLabOrders.map((order) => (
                    <li
                      key={order.key}
                      className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2">
                      <p className="text-sm font-medium text-slate-800">{order.label}</p>
                      {order.categoryTitle ?
                        <p className="text-xs text-slate-500">{order.categoryTitle}</p>
                      : null}
                      <p className="mt-1 text-xs text-amber-700">Natija kutilmoqda</p>
                    </li>
                  ))}
                </ul>
              : null}
            </div>
          : <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
                <p className="text-xs text-slate-600">
                  {activeTab.label}: {activeCategoryRefs.length} ta natija
                  {someActiveSelected ?
                    ` · ${activeCategoryRefs.filter((ref) => isServiceResultSelected(draftSelected, ref)).length} ta tanlangan`
                  : ''}
                  {pendingLabOrders.length > 0 ?
                    ` · ${pendingLabOrders.length} ta kutilmoqda`
                  : ''}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg border-emerald-200 text-emerald-900"
                  disabled={saving || activeCategoryRefs.length === 0}
                  onClick={() => void handleSelectAllActive()}>
                  <Check className="mr-1.5 size-3.5" />
                  {allActiveSelected ? 'Hammasini bekor qilish' : 'Hammasini belgilash'}
                </Button>
              </div>
              <ul className="space-y-2">
              {activeLabList.map((labItem) => {
                const { order, entry, value } = labItem;
                const ref: SelectedServiceResultRef = {
                  kind: 'lab',
                  orderKey: order.key,
                };
                const selected = isServiceResultSelected(draftSelected, ref);
                return (
                  <li
                    key={order.key}
                    className={
                      selected ?
                        'flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 shadow-sm'
                      : 'flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3'
                    }>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleToggle(ref)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <span
                        className={
                          selected ?
                            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white'
                          : 'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white'
                        }>
                        {selected ? <Check className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">
                          {order.label}
                        </span>
                        {order.categoryTitle ?
                          <span className="block text-xs text-slate-500">
                            {order.categoryTitle}
                          </span>
                        : null}
                        <span className="mt-1 block text-sm font-semibold text-emerald-900">
                          {value}
                        </span>
                        {entry?.enteredAt ?
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {formatEnteredAt(entry.enteredAt)}
                            {entry.enteredByName ? ` · ${entry.enteredByName}` : ''}
                          </span>
                        : null}
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8 rounded-lg border-emerald-200 text-emerald-800"
                        disabled={exporting}
                        title="Chop etish"
                        onClick={() =>
                          void handlePrint(
                            [labItemToPrint(labItem)],
                            order.label || 'Laboratoriya natijasi',
                          )
                        }>
                        <Printer className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8 rounded-lg border-sky-200 text-sky-800"
                        disabled={exporting}
                        title="Word yuklab olish"
                        onClick={() =>
                          void handleWord(
                            [labItemToPrint(labItem)],
                            order.label || 'Laboratoriya natijasi',
                          )
                        }>
                        <FileDown className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
              </ul>
              {pendingLabOrders.length > 0 ?
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-amber-800">Natija kutilayotganlar</p>
                  <ul className="space-y-2">
                    {pendingLabOrders.map((order) => (
                      <li
                        key={`pending-${order.key}`}
                        className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2">
                        <p className="text-sm font-medium text-slate-800">{order.label}</p>
                        {order.categoryTitle ?
                          <p className="text-xs text-slate-500">{order.categoryTitle}</p>
                        : null}
                      </li>
                    ))}
                  </ul>
                </div>
              : null}
            </div>
        : activeSpecialistList.length === 0 ?
          <p className="text-sm text-slate-500">
            {activeTab.label} bo‘yicha mutaxassis xulosasi hali kiritilmagan.
          </p>
        : <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2">
              <p className="text-xs text-slate-600">
                {activeTab.label}: {activeCategoryRefs.length} ta natija
                {someActiveSelected ?
                  ` · ${activeCategoryRefs.filter((ref) => isServiceResultSelected(draftSelected, ref)).length} ta tanlangan`
                : ''}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg border-violet-200 text-violet-900"
                disabled={saving || activeCategoryRefs.length === 0}
                onClick={() => void handleSelectAllActive()}>
                <Check className="mr-1.5 size-3.5" />
                {allActiveSelected ? 'Hammasini bekor qilish' : 'Hammasini belgilash'}
              </Button>
            </div>
            <ul className="space-y-2">
            {activeSpecialistList.map((consultation) => {
              const ref: SelectedServiceResultRef = {
                kind: 'specialist',
                consultationId: consultation.id,
              };
              const selected = isServiceResultSelected(draftSelected, ref);
              return (
                <li
                  key={consultation.id}
                  className={
                    selected ?
                      'flex items-start gap-2 rounded-xl border border-violet-300 bg-violet-50/90 p-3 shadow-sm'
                    : 'flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3'
                  }>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleToggle(ref)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <span
                      className={
                        selected ?
                          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white'
                        : 'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white'
                      }>
                      {selected ? <Check className="size-3.5" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                        <Stethoscope className="size-3.5 shrink-0 text-violet-700" />
                        {consultation.specialistLabel || activeTab.label}
                      </span>
                      <span className="mt-1 block whitespace-pre-wrap text-sm text-slate-800">
                        {consultation.consultationText}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {consultation.consultationDate ||
                          formatEnteredAt(consultation.updatedAt || consultation.createdAt)}
                        {consultation.createdByName ? ` · ${consultation.createdByName}` : ''}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-lg border-violet-200 text-violet-800"
                      disabled={exporting}
                      title="Chop etish"
                      onClick={() =>
                        void handlePrint(
                          [specialistItemToPrint(consultation)],
                          consultation.specialistLabel || activeTab.label,
                        )
                      }>
                      <Printer className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-lg border-sky-200 text-sky-800"
                      disabled={exporting}
                      title="Word yuklab olish"
                      onClick={() =>
                        void handleWord(
                          [specialistItemToPrint(consultation)],
                          consultation.specialistLabel || activeTab.label,
                        )
                      }>
                      <FileDown className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
            </ul>
          </div>
        }
      </div>

      <div className="rounded-2xl border border-emerald-200/60 bg-linear-to-br from-emerald-50/40 to-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-800">
            <FlaskConical className="size-5" />
            <h3 className="font-semibold">Tahlil natijalari</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800"
              disabled={exporting || selectedPrintItems.length === 0}
              onClick={() =>
                void handlePrint(selectedPrintItems, 'Tahlil natijalari')
              }>
              <Printer className="mr-1.5 size-4" />
              Chop etish
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl border-emerald-200 text-emerald-800"
              disabled={exporting || selectedPrintItems.length === 0}
              onClick={() =>
                void handleWord(selectedPrintItems, 'Tahlil natijalari')
              }>
              <FileDown className="mr-1.5 size-4" />
              Word
            </Button>
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-500">Tanlangan tibbiy xizmat natijalari</p>
        {selectedItems.length === 0 ?
          <p className="text-sm text-slate-500">
            Yuqoridan turni tanlab, natijalarni belgilang — ular shu yerda chiqadi.
          </p>
        : <ul className="space-y-3">
            {selectedItems.map((item) =>
              item.kind === 'lab' ?
                <li
                  key={selectedServiceResultKey(item.ref)}
                  className="flex items-start gap-2 rounded-xl border border-emerald-200/80 bg-white p-3 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.order.label}</p>
                    {item.order.categoryTitle ?
                      <p className="text-xs text-slate-500">{item.order.categoryTitle}</p>
                    : null}
                    <div className="mt-2 rounded-lg bg-emerald-50/80 px-3 py-2">
                      <p className="text-sm font-semibold text-emerald-900">{item.value}</p>
                      {item.entry?.enteredAt ?
                        <p className="mt-1 text-xs text-slate-500">
                          {formatEnteredAt(item.entry.enteredAt)}
                          {item.entry.enteredByName ? ` · ${item.entry.enteredByName}` : ''}
                        </p>
                      : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-lg"
                      disabled={exporting}
                      title="Chop etish"
                      onClick={() =>
                        void handlePrint(
                          [labItemToPrint(item)],
                          item.order.label || 'Laboratoriya natijasi',
                        )
                      }>
                      <Printer className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-lg"
                      disabled={exporting}
                      title="Word yuklab olish"
                      onClick={() =>
                        void handleWord(
                          [labItemToPrint(item)],
                          item.order.label || 'Laboratoriya natijasi',
                        )
                      }>
                      <FileDown className="size-3.5" />
                    </Button>
                  </div>
                </li>
              : <li
                  key={selectedServiceResultKey(item.ref)}
                  className="flex items-start gap-2 rounded-xl border border-violet-200/80 bg-white p-3 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                      <Stethoscope className="size-3.5 text-violet-700" />
                      {item.consultation.specialistLabel || 'Mutaxassis'}
                    </p>
                    <div className="mt-2 rounded-lg bg-violet-50/80 px-3 py-2">
                      <p className="whitespace-pre-wrap text-sm text-slate-800">
                        {item.consultation.consultationText}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.consultation.consultationDate ||
                          formatEnteredAt(
                            item.consultation.updatedAt || item.consultation.createdAt,
                          )}
                        {item.consultation.createdByName ?
                          ` · ${item.consultation.createdByName}`
                        : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-lg"
                      disabled={exporting}
                      title="Chop etish"
                      onClick={() =>
                        void handlePrint(
                          [specialistItemToPrint(item.consultation)],
                          item.consultation.specialistLabel || 'Mutaxassis xulosasi',
                        )
                      }>
                      <Printer className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 rounded-lg"
                      disabled={exporting}
                      title="Word yuklab olish"
                      onClick={() =>
                        void handleWord(
                          [specialistItemToPrint(item.consultation)],
                          item.consultation.specialistLabel || 'Mutaxassis xulosasi',
                        )
                      }>
                      <FileDown className="size-3.5" />
                    </Button>
                  </div>
                </li>,
            )}
          </ul>
        }
      </div>
    </section>
  );
}
