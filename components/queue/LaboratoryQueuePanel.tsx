'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock3, FlaskConical, Loader2, Stethoscope } from 'lucide-react';
import { useEffect, useState } from 'react';

type LaboratoryQueueItem = {
  queueId: string;
  patientId: string;
  arrivalTime: string;
  fullName: string;
  cardNumber: string;
  diseaseType: string;
  referredDoctorName?: string;
  orderCount: number;
  orderTotal: number;
  orderSummary: string;
};

type Props = {
  onOpenPatient?: (patientId: string) => void;
};

export default function LaboratoryQueuePanel({ onOpenPatient }: Props) {
  const [items, setItems] = useState<LaboratoryQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await fetch('/api/laboratory/queue', {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = (await res.json()) as { items?: LaboratoryQueueItem[] };
      setItems(res.ok && Array.isArray(json.items) ? json.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
    const id = setInterval(() => void loadQueue(), 12_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" />
        Laboratoriya navbati yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">To&apos;langan bemorlar</h3>
          <p className="text-sm text-slate-500">
            Shifokor buyurtmasi va kassa to&apos;lovi qilingan bemorlar
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadQueue()}>
          Yangilash
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <FlaskConical className="mx-auto mb-2 size-8 text-slate-400" />
          <p className="font-medium text-slate-700">Hozircha navbat bo&apos;sh</p>
          <p className="mt-1 text-sm text-slate-500">
            Shifokor xizmat belgilab, kassada to&apos;lov qilingandan keyin bemor shu yerda ko&apos;rinadi
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bemor</TableHead>
                <TableHead>Buyurtma</TableHead>
                <TableHead>Shifokor</TableHead>
                <TableHead>Kelish</TableHead>
                <TableHead className="text-right">Summa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.queueId}
                  className={onOpenPatient ? 'cursor-pointer hover:bg-indigo-50/50' : undefined}
                  onClick={() => onOpenPatient?.(item.patientId)}
                >
                  <TableCell>
                    <div className="font-medium text-slate-900">{item.fullName}</div>
                    <div className="text-xs text-slate-500">{item.cardNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs text-sm text-slate-700">{item.orderSummary}</div>
                    <div className="text-xs text-slate-500">{item.orderCount} ta</div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <Stethoscope className="size-3.5" />
                      {item.referredDoctorName || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <Clock3 className="size-3.5" />
                      {item.arrivalTime}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900">
                    {item.orderTotal > 0 ?
                      `${item.orderTotal.toLocaleString('uz-UZ')} so'm`
                    : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
