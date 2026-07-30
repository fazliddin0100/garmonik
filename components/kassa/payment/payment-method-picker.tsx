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
  gradient: string;
  iconShadow: string;
  ring: string;
  selectedBorder: string;
  hoverBorder: string;
  labelColor: string;
};

const PLATFORM_META: Record<string, PlatformMeta> = {
  CASH: {
    icon: Banknote,
    gradient: "from-emerald-500 to-teal-600",
    iconShadow: "shadow-emerald-500/40",
    ring: "ring-emerald-500/40",
    selectedBorder: "border-emerald-400 bg-emerald-50/30",
    hoverBorder: "hover:border-emerald-200",
    labelColor: "text-emerald-800",
  },
  HUMO: {
    icon: CreditCard,
    gradient: "from-blue-600 to-indigo-700",
    iconShadow: "shadow-blue-500/40",
    ring: "ring-blue-500/40",
    selectedBorder: "border-blue-400 bg-blue-50/30",
    hoverBorder: "hover:border-blue-200",
    labelColor: "text-blue-800",
  },
  VISA: {
    icon: CreditCard,
    gradient: "from-indigo-600 to-violet-700",
    iconShadow: "shadow-indigo-500/40",
    ring: "ring-indigo-500/40",
    selectedBorder: "border-indigo-400 bg-indigo-50/30",
    hoverBorder: "hover:border-indigo-200",
    labelColor: "text-indigo-800",
  },
  UZCARD: {
    icon: IdCard,
    gradient: "from-sky-500 to-blue-600",
    iconShadow: "shadow-sky-500/40",
    ring: "ring-sky-500/40",
    selectedBorder: "border-sky-400 bg-sky-50/30",
    hoverBorder: "hover:border-sky-200",
    labelColor: "text-sky-800",
  },
  TERMINAL: {
    icon: Wallet,
    gradient: "from-slate-600 to-slate-800",
    iconShadow: "shadow-slate-500/40",
    ring: "ring-slate-500/40",
    selectedBorder: "border-slate-400 bg-slate-50/30",
    hoverBorder: "hover:border-slate-300",
    labelColor: "text-slate-800",
  },
  CLICK: {
    icon: Smartphone,
    gradient: "from-cyan-500 to-blue-600",
    iconShadow: "shadow-cyan-500/40",
    ring: "ring-cyan-500/40",
    selectedBorder: "border-cyan-400 bg-cyan-50/30",
    hoverBorder: "hover:border-cyan-200",
    labelColor: "text-cyan-900",
  },
  PAYME: {
    icon: QrCode,
    gradient: "from-teal-500 to-emerald-600",
    iconShadow: "shadow-teal-500/40",
    ring: "ring-teal-500/40",
    selectedBorder: "border-teal-400 bg-teal-50/30",
    hoverBorder: "hover:border-teal-200",
    labelColor: "text-teal-900",
  },
  CUSTOM: {
    icon: Wallet,
    gradient: "from-orange-500 to-amber-600",
    iconShadow: "shadow-orange-500/40",
    ring: "ring-orange-500/40",
    selectedBorder: "border-orange-400 bg-orange-50/30",
    hoverBorder: "hover:border-orange-200",
    labelColor: "text-orange-900",
  },
};

const DEFAULT_META: PlatformMeta = {
  icon: CreditCard,
  gradient: "from-slate-500 to-slate-700",
  iconShadow: "shadow-slate-500/30",
  ring: "ring-slate-500/30",
  selectedBorder: "border-slate-400 bg-slate-50/30",
  hoverBorder: "hover:border-slate-300",
  labelColor: "text-slate-800",
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
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {types.map((pt, i) => {
        const meta = PLATFORM_META[pt.platform] ?? DEFAULT_META;
        const Icon = meta.icon;
        const selected = value === pt.id;
        const pendingIp = needsGatewaySetup(pt);

        return (
          <button
            key={pt.id}
            type="button"
            onClick={() => onChange(pt.id)}
            title={
              pendingIp
                ? "IP hali kiritilmagan — to'lov turi qayd etiladi"
                : undefined
            }
            className={cn(
              "animate-fade-up group relative flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-3.5 text-center transition-all duration-300",
              selected &&
                cn("scale-[1.02] shadow-lg ring-2 ring-offset-2", meta.selectedBorder, meta.ring),
              !selected &&
                cn(
                  "border-slate-100 bg-white/70 opacity-90 hover:-translate-y-0.5 hover:bg-white hover:opacity-100 hover:shadow-md",
                  meta.hoverBorder
                )
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {selected && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                <Check className="h-3 w-3 text-emerald-600" />
              </span>
            )}

            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white transition-all duration-300",
                meta.gradient,
                meta.iconShadow,
                selected
                  ? "scale-110 shadow-lg animate-[payment-icon-pulse_2s_ease-in-out_infinite]"
                  : "shadow-md group-hover:scale-105 group-hover:shadow-lg"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-transform duration-300",
                  selected && "drop-shadow-sm",
                  !selected && "group-hover:scale-110"
                )}
              />
            </div>

            <span
              className={cn(
                "max-w-full truncate px-1 text-xs font-semibold leading-tight",
                selected && meta.labelColor,
                !selected && "text-slate-600 group-hover:text-slate-900"
              )}
            >
              {pt.name}
            </span>

            {pendingIp && (
              <span className="text-[10px] text-amber-600">IP keyin</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
