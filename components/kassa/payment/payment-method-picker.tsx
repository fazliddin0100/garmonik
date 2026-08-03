"use client";

import {
  Banknote,
  Check,
  CreditCard,
  IdCard,
  QrCode,
  Smartphone,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/kassa/utils";

type PaymentType = {
  id: string;
  name: string;
  platform: string;
  requiresGateway?: boolean;
  gatewayConfigured?: boolean;
};

type PlatformMeta = {
  icon: typeof Banknote;
  rowBg: string;
  iconBg: string;
  labelColor: string;
};

const PLATFORM_META: Record<string, PlatformMeta> = {
  CASH: {
    icon: Banknote,
    rowBg: "bg-emerald-50/80",
    iconBg: "bg-emerald-500 text-white",
    labelColor: "text-emerald-800",
  },
  HUMO: {
    icon: CreditCard,
    rowBg: "bg-blue-50/80",
    iconBg: "bg-blue-600 text-white",
    labelColor: "text-blue-800",
  },
  VISA: {
    icon: CreditCard,
    rowBg: "bg-indigo-50/80",
    iconBg: "bg-indigo-600 text-white",
    labelColor: "text-indigo-800",
  },
  UZCARD: {
    icon: IdCard,
    rowBg: "bg-sky-50/80",
    iconBg: "bg-sky-500 text-white",
    labelColor: "text-sky-800",
  },
  TERMINAL: {
    icon: Wallet,
    rowBg: "bg-slate-50/80",
    iconBg: "bg-slate-600 text-white",
    labelColor: "text-slate-800",
  },
  CLICK: {
    icon: Smartphone,
    rowBg: "bg-cyan-50/80",
    iconBg: "bg-cyan-500 text-white",
    labelColor: "text-cyan-900",
  },
  PAYME: {
    icon: QrCode,
    rowBg: "bg-teal-50/80",
    iconBg: "bg-teal-500 text-white",
    labelColor: "text-teal-900",
  },
  CUSTOM: {
    icon: Wallet,
    rowBg: "bg-orange-50/80",
    iconBg: "bg-orange-500 text-white",
    labelColor: "text-orange-900",
  },
};

const DEFAULT_META: PlatformMeta = {
  icon: CreditCard,
  rowBg: "bg-slate-50/80",
  iconBg: "bg-slate-500 text-white",
  labelColor: "text-slate-800",
};

const PLATFORM_LABEL: Record<string, string> = {
  CASH: "Naqt",
  HUMO: "Humo",
  VISA: "Visa",
  UZCARD: "UzCard",
  TERMINAL: "Terminal",
  CLICK: "Click",
  PAYME: "Payme",
  CUSTOM: "Boshqa",
};

function needsGatewaySetup(type: PaymentType): boolean {
  return Boolean(type.requiresGateway && type.gatewayConfigured === false);
}

export function PaymentMethodPicker({
  types,
  value,
  onChange,
}: {
  types: PaymentType[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (types.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-muted-foreground">
        To&apos;lov turlari topilmadi
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-9 px-2 py-2" aria-label="Tanlash" />
            <th className="w-9 px-1 py-2" aria-label="Tur" />
            <th className="px-2 py-2">To&apos;lov turi</th>
            <th className="hidden px-2 py-2 sm:table-cell">Platforma</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {types.map((pt) => {
            const meta = PLATFORM_META[pt.platform] ?? DEFAULT_META;
            const Icon = meta.icon;
            const selected = value === pt.id;
            const pendingIp = needsGatewaySetup(pt);

            return (
              <tr
                key={pt.id}
                role="button"
                tabIndex={0}
                onClick={() => onChange(pt.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(pt.id);
                  }
                }}
                title={
                  pendingIp
                    ? "IP hali kiritilmagan — to'lov turi qayd etiladi"
                    : undefined
                }
                className={cn(
                  "cursor-pointer transition-colors hover:bg-violet-50/50",
                  selected ? meta.rowBg : "bg-white",
                )}
              >
                <td className="px-2 py-2">
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      selected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                </td>
                <td className="px-1 py-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md",
                      meta.iconBg,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </td>
                <td className="px-2 py-2">
                  <span
                    className={cn(
                      "font-medium leading-tight",
                      selected ? meta.labelColor : "text-slate-800",
                    )}
                  >
                    {pt.name}
                  </span>
                  {pendingIp ? (
                    <span className="mt-0.5 block text-[10px] text-amber-600">
                      IP keyin ulanadi
                    </span>
                  ) : null}
                </td>
                <td className="hidden px-2 py-2 text-xs text-slate-500 sm:table-cell">
                  {PLATFORM_LABEL[pt.platform] ?? pt.platform}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
