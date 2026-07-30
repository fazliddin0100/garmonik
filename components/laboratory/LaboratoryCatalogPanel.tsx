'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import LaboratoryCatalogEditor from '@/components/queue/LaboratoryCatalogEditor';
import { filterLabCatalog } from '@/lib/laboratory/catalog-filter';
import { loadLabCatalog, saveLabCatalog } from '@/lib/laboratory/catalog-storage';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import { FlaskConical, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type LaboratoryCatalogPanelProps = {
  /** Bo‘sh bo‘lsa — standart sarlavha */
  title?: string;
  /** Scroll qismi balandligi */
  scrollHeightClass?: string;
};

export default function LaboratoryCatalogPanel({
  title = 'Laboratoriya tahlillari (turkumlar bo‘yicha)',
  scrollHeightClass = 'h-[320px]',
}: LaboratoryCatalogPanelProps) {
  const [labCatalog, setLabCatalog] = useState<LabCategory[]>([]);
  const [labSearch, setLabSearch] = useState('');
  const [catalogEditorOpen, setCatalogEditorOpen] = useState(false);

  useEffect(() => {
    void loadLabCatalog()
      .then((c) => setLabCatalog(c))
      .catch(() => {
        setLabCatalog([]);
        toast.error('Katalogni yuklab bo‘lmadi');
      });
  }, []);

  const filteredCatalog = useMemo(
    () => filterLabCatalog(labCatalog, labSearch),
    [labCatalog, labSearch],
  );

  return (
    <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-violet-600" />
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 bg-white"
          onClick={() => setCatalogEditorOpen(true)}>
          <Pencil className="size-3.5" />
          Katalogni tahrirlash
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Turkumni ochib ichidagi tahlillar, me&apos;yor va birliklarni ko&apos;ring. Tahrirlash barcha kabinetlar
        uchun umumiy (serverda saqlanadi).
      </p>
      <Input
        value={labSearch}
        onChange={(e) => setLabSearch(e.target.value)}
        placeholder="Turkum yoki tahlil bo‘yicha qidirish…"
        className="mt-3 bg-white"
        autoComplete="off"
      />
      <ScrollArea className={`mt-3 rounded-xl border border-slate-200 bg-white pr-2 ${scrollHeightClass}`}>
        <div className="p-2">
          {filteredCatalog.length === 0 ?
            <p className="py-8 text-center text-sm text-slate-500">Mos keladigan turkum topilmadi.</p>
          : (
            <Accordion
              type="multiple"
              className="w-full"
              defaultValue={filteredCatalog.slice(0, 5).map((c) => c.id)}>
              {filteredCatalog.map((cat) => (
                <AccordionItem key={cat.id} value={cat.id} className="border-slate-200/80">
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    <span className="min-w-0 flex-1 pr-2 text-left font-medium text-slate-800">
                      {cat.title}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        ({cat.items.length} tahlil)
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 border-t border-slate-100 pt-2 text-sm">
                      {cat.items.map((it) => (
                        <li
                          key={`${cat.id}-${it.id}`}
                          className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                          <p className="font-medium text-slate-800">{it.name}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            {it.norm ? <>Me&apos;yor: {it.norm}</> : null}
                            {it.norm && it.unit ? ' · ' : null}
                            {it.unit ? <>Birlik: {it.unit}</> : null}
                            {it.code ?
                              <>
                                {' '}
                                · Kod: {it.code}
                              </>
                            : null}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>

      <LaboratoryCatalogEditor
        open={catalogEditorOpen}
        onOpenChange={setCatalogEditorOpen}
        catalog={labCatalog}
        onSave={(next) => {
          void (async () => {
            try {
              await saveLabCatalog(next);
              setLabCatalog(next);
              toast.success('Katalog yangilandi.');
            } catch {
              toast.error('Katalogni saqlab bo‘lmadi');
            }
          })();
        }}
      />
    </div>
  );
}
