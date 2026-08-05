"use client";

import {
  CreditCard,
  HandCoins,
  LayoutGrid,
  Stethoscope,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatDate, cn, formatMoney } from "@/lib/kassa/utils";

export type ReportCategoryId =
  | "overview"
  | "income"
  | "expense"
  | "debt"
  | "payments"
  | "services";

type CategoryDef = {
  id: ReportCategoryId;
  label: string;
  description: string;
  icon: typeof TrendingUp;
  accent: string;
  ring: string;
  bg: string;
  iconBg: string;
};

export const REPORT_CATEGORIES: CategoryDef[] = [
  {
    id: "overview",
    label: "Umumiy",
    description: "Kirim, chiqim va foyda",
    icon: LayoutGrid,
    accent: "text-violet-700",
    ring: "ring-violet-400",
    bg: "from-violet-50 to-white border-violet-200",
    iconBg: "bg-violet-100 text-violet-700",
  },
  {
    id: "income",
    label: "Kirim",
    description: "Tushum va to'lovlar",
    icon: TrendingUp,
    accent: "text-emerald-700",
    ring: "ring-emerald-400",
    bg: "from-emerald-50 to-white border-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "expense",
    label: "Chiqim",
    description: "Xarajatlar",
    icon: TrendingDown,
    accent: "text-orange-700",
    ring: "ring-orange-400",
    bg: "from-orange-50 to-white border-orange-200",
    iconBg: "bg-orange-100 text-orange-700",
  },
  {
    id: "debt",
    label: "Qarzdorlik",
    description: "Bemor qarzdorligi",
    icon: HandCoins,
    accent: "text-rose-700",
    ring: "ring-rose-400",
    bg: "from-rose-50 to-white border-rose-200",
    iconBg: "bg-rose-100 text-rose-700",
  },
  {
    id: "payments",
    label: "To'lov turlari",
    description: "Har bir usul alohida",
    icon: CreditCard,
    accent: "text-blue-700",
    ring: "ring-blue-400",
    bg: "from-blue-50 to-white border-blue-200",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    id: "services",
    label: "Xizmatlar",
    description: "Top xizmatlar va qaytarish",
    icon: Stethoscope,
    accent: "text-indigo-700",
    ring: "ring-indigo-400",
    bg: "from-indigo-50 to-white border-indigo-200",
    iconBg: "bg-indigo-100 text-indigo-700",
  },
];

type ReportCategoryPickerProps = {
  active: ReportCategoryId;
  onChange: (id: ReportCategoryId) => void;
  summaries: Record<ReportCategoryId, string>;
};

export function ReportCategoryPicker({
  active,
  onChange,
  summaries,
}: ReportCategoryPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">
        Hisobot kategoriyasi — kartochkaga bosing
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {REPORT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = active === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={cn(
                "flex flex-col items-start rounded-xl border bg-gradient-to-br p-3 text-left transition-all",
                cat.bg,
                isActive
                  ? cn("shadow-md ring-2 ring-offset-2", cat.ring)
                  : "hover:shadow-sm hover:brightness-[0.98]"
              )}
            >
              <span
                className={cn(
                  "mb-2 flex h-9 w-9 items-center justify-center rounded-lg",
                  cat.iconBg
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className={cn("text-sm font-semibold leading-tight", cat.accent)}>
                {cat.label}
              </span>
              <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                {cat.description}
              </span>
              <span className={cn("mt-2 text-xs font-bold", cat.accent)}>
                {summaries[cat.id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PaymentMethodCards({
  revenueByPlatform,
  expenseByPlatform,
  platformLabels,
  incomePayments = [],
}: {
  revenueByPlatform: Record<string, { total: number; count: number }>;
  expenseByPlatform: Record<string, { total: number; count: number }>;
  platformLabels: Record<string, string>;
  incomePayments?: Array<{
    id: string;
    patientName: string;
    amount: number;
    paymentMethod: string;
    platform: string;
    paidAt: string;
    invoiceNumber: number;
    servicesSummary: string;
  }>;
}) {
  const platforms = Array.from(
    new Set([...Object.keys(revenueByPlatform), ...Object.keys(expenseByPlatform)])
  ).filter((p) => {
    const inc = revenueByPlatform[p];
    const exp = expenseByPlatform[p];
    return (inc?.count ?? 0) > 0 || (exp?.count ?? 0) > 0;
  });

  if (platforms.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Tanlangan davrda to&apos;lov ma&apos;lumoti yo&apos;q
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {platforms.map((platform) => {
        const income = revenueByPlatform[platform];
        const expense = expenseByPlatform[platform];
        const label = platformLabels[platform] || platform;
        const net = (income?.total ?? 0) - (expense?.total ?? 0);
        const platformPayers = incomePayments.filter((p) => p.platform === platform);

        return (
          <div
            key={platform}
            className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-blue-900">{label}</p>
                <p className="text-xs text-muted-foreground">
                  Sof:{" "}
                  <span className={net >= 0 ? "text-emerald-700" : "text-rose-700"}>
                    {formatMoney(net)}
                  </span>
                </p>
              </div>
            </div>
            <div className="space-y-2 rounded-lg border bg-white p-3 text-sm">
              {income && income.count > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Kirim</span>
                  <span className="font-semibold text-emerald-700">
                    {formatMoney(income.total)}{" "}
                    <span className="text-xs font-normal">({income.count} ta)</span>
                  </span>
                </div>
              )}
              {expense && expense.count > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Chiqim</span>
                  <span className="font-semibold text-orange-700">
                    {formatMoney(expense.total)}{" "}
                    <span className="text-xs font-normal">({expense.count} ta)</span>
                  </span>
                </div>
              )}
              {!income?.count && !expense?.count && (
                <p className="text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
              )}
            </div>
            {platformPayers.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
                <table className="w-full min-w-[480px] text-xs">
                  <thead className="border-b bg-blue-50/50 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Bemor</th>
                      <th className="px-2 py-2 font-medium">Nima uchun</th>
                      <th className="px-2 py-2 text-right font-medium">Summa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {platformPayers.map((p) => (
                      <tr key={p.id}>
                        <td className="px-2 py-2">
                          <p className="font-medium text-slate-800">{p.patientName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            #{p.invoiceNumber} · {formatDate(p.paidAt)}
                          </p>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">{p.servicesSummary || "—"}</td>
                        <td className="px-2 py-2 text-right font-semibold text-emerald-700">
                          {formatMoney(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type IncomePaymentItem = {
  id: string;
  patientName: string;
  amount: number;
  paymentMethod: string;
  platform: string;
  paidAt: string;
  invoiceNumber: number;
  servicesSummary: string;
};

export function IncomePaymentsTable({
  payments,
  title = "Kimlar nimaga to'lagan",
}: {
  payments: IncomePaymentItem[];
  title?: string;
}) {
  if (payments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Tanlangan davrda kirim to&apos;lovi yo&apos;q
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-emerald-900">{title}</p>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-emerald-50/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Bemor (ism familiya)</th>
              <th className="p-3 font-medium">Nima uchun to&apos;lagan</th>
              <th className="p-3 font-medium">To&apos;lov usuli</th>
              <th className="p-3 font-medium">Sana</th>
              <th className="p-3 text-right font-medium">Summa</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-emerald-50/30">
                <td className="p-3">
                  <p className="font-medium text-slate-900">{p.patientName}</p>
                  <p className="text-xs text-muted-foreground">Chek #{p.invoiceNumber}</p>
                </td>
                <td className="p-3 text-muted-foreground">{p.servicesSummary || "—"}</td>
                <td className="p-3">{p.paymentMethod}</td>
                <td className="p-3 text-muted-foreground">{formatDate(p.paidAt)}</td>
                <td className="p-3 text-right font-semibold text-emerald-700">
                  {formatMoney(p.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
