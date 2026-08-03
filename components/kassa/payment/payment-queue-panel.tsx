"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Clock3, Loader2, Stethoscope, UserRound } from "lucide-react";
import { Badge } from "@/components/kassa/ui/badge";
import { Button } from "@/components/kassa/ui/button";
import { cn } from "@/lib/kassa/utils";
import { formatUzPhoneDisplayFull } from "@/lib/kassa/phone";
import type { SelectedKassaPatient } from "@/components/kassa/payment/patient-lookup-field";

export type PaymentQueueItem = {
  queueId: string;
  position: number;
  arrivalTime: string;
  fullName: string;
  cardNumber: string;
  phone: string;
  diseaseType: string;
  referredDoctorName?: string;
  garmonikPatientId: string;
  kassaPatientId: string;
  paymentLabel: string;
  paymentKind?: "initial" | "post_doctor" | "inpatient_room";
  postPaymentItems?: { key: string; name: string; price: number; groupLabel?: string }[];
  postPaymentTotal?: number;
};

/** Navbat va qo'lda kiritish ustunlari bir xil balandlikda */
export const KASSA_QUEUE_COLUMN_CLASS =
  "flex h-[min(420px,52vh)] min-h-[280px] flex-col";

const QUEUE_SCROLL_CLASS = cn(
  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1",
  "[scrollbar-width:thin]",
  "[scrollbar-color:rgb(139_92_246/0.55)_rgb(241_245_249)]",
  "[&::-webkit-scrollbar]:w-2.5",
  "[&::-webkit-scrollbar-track]:my-1 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100/90",
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-slate-100 [&::-webkit-scrollbar-thumb]:bg-violet-300",
  "hover:[&::-webkit-scrollbar-thumb]:bg-violet-400",
);

type Props = {
  selectedQueueId: string | null;
  onSelect: (item: PaymentQueueItem, patient: SelectedKassaPatient) => void;
  onClear: () => void;
};

function QueueShell({
  title,
  children,
  onRefresh,
  showRefresh = true,
}: {
  title?: ReactNode;
  children: ReactNode;
  onRefresh?: () => void;
  showRefresh?: boolean;
}) {
  return (
    <div className={KASSA_QUEUE_COLUMN_CLASS}>
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        {title ?? (
          <p className="text-sm font-medium text-slate-700">To&apos;lov navbati</p>
        )}
        {showRefresh && onRefresh ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
            Yangilash
          </Button>
        ) : null}
      </div>
      <div className={QUEUE_SCROLL_CLASS}>{children}</div>
    </div>
  );
}

export function PaymentQueuePanel({ selectedQueueId, onSelect, onClear }: Props) {
  const [items, setItems] = useState<PaymentQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/kassa/payment-queue", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Navbat yuklanmadi");
        setItems([]);
        return;
      }
      setError("");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Server bilan aloqa yo'q");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
    const id = setInterval(() => void loadQueue(), 12_000);
    return () => clearInterval(id);
  }, [loadQueue]);

  function pick(item: PaymentQueueItem) {
    onSelect(item, {
      garmonikPatientId: item.garmonikPatientId,
      kassaPatientId: item.kassaPatientId,
      cardNumber: item.cardNumber,
      fullName: item.fullName,
      phone: item.phone,
    });
  }

  if (loading) {
    return (
      <QueueShell showRefresh={false}>
        <div className="flex h-full min-h-[12rem] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          To&apos;lov navbati yuklanmoqda...
        </div>
      </QueueShell>
    );
  }

  if (error) {
    return (
      <QueueShell onRefresh={() => void loadQueue()}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
          {error}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => void loadQueue()}
          >
            Qayta
          </Button>
        </div>
      </QueueShell>
    );
  }

  if (items.length === 0) {
    return (
      <QueueShell onRefresh={() => void loadQueue()}>
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <p className="font-medium text-slate-700">To&apos;lov navbati bo&apos;sh</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Kabinet va shifokor buyurtmalari shu yerda paydo bo&apos;ladi. O&apos;ng tomondan
            qo&apos;lda kiritishingiz ham mumkin.
          </p>
        </div>
      </QueueShell>
    );
  }

  return (
    <QueueShell
      onRefresh={() => void loadQueue()}
      title={
        <p className="text-sm font-medium text-slate-700">
          To&apos;lov navbati{" "}
          <span className="text-muted-foreground">({items.length})</span>
        </p>
      }
    >
      <div className="space-y-2 pb-1">
        {items.map((item) => {
          const active = selectedQueueId === item.queueId;
          return (
            <button
              key={item.queueId}
              type="button"
              onClick={() => pick(item)}
              className={cn(
                "w-full rounded-2xl border p-3.5 text-left transition-all sm:p-4",
                active
                  ? "border-emerald-300 bg-emerald-50 shadow-sm ring-2 ring-emerald-200"
                  : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold sm:h-10 sm:w-10",
                      active ? "bg-emerald-600 text-white" : "bg-violet-100 text-violet-700",
                    )}
                  >
                    {item.position}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{item.fullName}</p>
                      <Badge variant="outline" className="border-violet-200 text-violet-700">
                        {item.cardNumber}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.paymentLabel}</p>
                    {item.paymentKind === "inpatient_room" ? (
                      <p className="mt-1 text-xs font-medium text-rose-700">
                        Stacionar bo&apos;lim — 2/3/4 kishilik xonadan birini tanlang
                      </p>
                    ) : null}
                    {item.paymentKind === "post_doctor" &&
                    typeof item.postPaymentTotal === "number" &&
                    item.postPaymentTotal > 0 ? (
                      <p className="mt-1 text-sm font-semibold text-orange-800">
                        Jami: {item.postPaymentTotal.toLocaleString("uz-UZ")} so&apos;m
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        Keldi: {item.arrivalTime}
                      </span>
                      {item.referredDoctorName ? (
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="h-3.5 w-3.5" />
                          {item.referredDoctorName}
                        </span>
                      ) : null}
                      {item.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3.5 w-3.5" />
                          {formatUzPhoneDisplayFull(item.phone)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {active ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear();
                    }}
                  >
                    Bekor
                  </Button>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </QueueShell>
  );
}
