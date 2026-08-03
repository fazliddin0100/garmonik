"use client";

import { PenLine, UserRound } from "lucide-react";
import { KASSA_QUEUE_COLUMN_CLASS } from "@/components/kassa/payment/payment-queue-panel";
import { Button } from "@/components/kassa/ui/button";import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { PhoneInput } from "@/components/kassa/ui/phone-input";
import type { SelectedKassaPatient } from "@/components/kassa/payment/patient-lookup-field";

export type ManualPaymentEntry = {
  fullName: string;
  phone: string;
  note: string;
  patient: SelectedKassaPatient | null;
};

type Props = {
  active: boolean;
  value: ManualPaymentEntry;
  onChange: (value: ManualPaymentEntry) => void;
  onActivate: () => void;
  onClear: () => void;
};

export function ManualPaymentEntryPanel({
  active,
  value,
  onChange,
  onActivate,
  onClear,
}: Props) {
  const canActivate = value.fullName.trim().length >= 2;

  return (
    <div
      className={`${KASSA_QUEUE_COLUMN_CLASS} rounded-2xl border p-4 transition-all ${
        active
          ? "border-amber-300 bg-amber-50/80 shadow-sm ring-2 ring-amber-200"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              active ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700"
            }`}
          >
            <PenLine className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Qo&apos;lda kiritish</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Navbatda bo&apos;lmagan bemorni kassir o&apos;zi yozib to&apos;lovga kiritadi
            </p>
          </div>
        </div>
        {active ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Bekor
          </Button>
        ) : null}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgb(245_158_11/0.45)_rgb(254_243_199)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-amber-100/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-300 hover:[&::-webkit-scrollbar-thumb]:bg-amber-400">
        <div className="space-y-2">
          <Label htmlFor="manual-patient-name">Ism familiya *</Label>
          <Input
            id="manual-patient-name"
            value={value.fullName}
            onChange={(e) =>
              onChange({
                ...value,
                fullName: e.target.value,
                patient: null,
              })
            }
            placeholder="Masalan: Aliyev Sardor"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-patient-phone">Telefon</Label>
          <PhoneInput
            id="manual-patient-phone"
            value={value.phone}
            onChange={(phone) =>
              onChange({
                ...value,
                phone,
                patient: null,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-patient-note">Izoh</Label>
          <Input
            id="manual-patient-note"
            value={value.note}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
            placeholder="Masalan: qo'shimcha xizmat, yo'naltirish"
          />
        </div>

        {!active ? (
          <Button
            type="button"
            className="w-full"
            variant="secondary"
            disabled={!canActivate}
            onClick={onActivate}
          >
            <UserRound className="mr-2 h-4 w-4" />
            To&apos;lovga kiritish
          </Button>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-xs text-amber-900">
            Tanlandi — xizmatlarni tanlang va o&apos;ng tomondan to&apos;lovni tasdiqlang
          </p>
        )}
      </div>
    </div>
  );
}
