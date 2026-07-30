"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileDown, Printer, Receipt, Search } from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { Badge } from "@/components/kassa/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/kassa/ui/select";
import { downloadReceiptPdf } from "@/lib/kassa/export-receipt-pdf";
import { printThermalReceipt } from "@/lib/kassa/print-receipt-client";
import { PrintAgentBanner } from "@/components/kassa/print/print-agent-banner";
import { getClinicName } from "@/lib/kassa/receipt-branding";
import { ReceiptView, type ReceiptInvoice } from "@/components/kassa/receipt/receipt-view";
import { getLocalDateString } from "@/lib/kassa/date";
import { KASSA_PAYMENT_COMPLETED } from "@/lib/kassa/kassa-events";
import { formatDate, formatMoney, toNumber } from "@/lib/kassa/utils";

type Invoice = {
  id: string;
  invoiceNumber: number;
  createdAt: string;
  status?: string;
  total: { toString(): string };
  amountPaid?: { toString(): string };
  patient: { fullName: string };
  paymentType: { name: string };
  cashier?: { fullName: string };
};

type PeriodFilter = "day" | "month" | "year" | "all";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "day", label: "Kun" },
  { value: "month", label: "Oy" },
  { value: "year", label: "Yil" },
  { value: "all", label: "Barchasi" },
];

function currentYear() {
  return new Date().getFullYear();
}

function currentMonth() {
  return getLocalDateString().slice(0, 7);
}

export function ReceiptsView({ isActive = true }: { isActive?: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReceiptInvoice | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("day");
  const [dayDate, setDayDate] = useState(getLocalDateString());
  const [monthDate, setMonthDate] = useState(currentMonth());
  const [yearDate, setYearDate] = useState(String(currentYear()));
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [printMessage, setPrintMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadList = useCallback(() => {
    if (!isActive) return;

    const params = new URLSearchParams({ limit: "200" });
    if (period === "day") params.set("date", dayDate);
    else if (period === "month") params.set("month", monthDate);
    else if (period === "year") params.set("year", yearDate);
    if (searchQuery) params.set("search", searchQuery);

    setLoading(true);
    fetch(`/api/kassa/invoices?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInvoices(data);
        else setInvoices([]);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [isActive, period, dayDate, monthDate, yearDate, searchQuery]);

  useEffect(() => {
    loadList();
    window.addEventListener(KASSA_PAYMENT_COMPLETED, loadList);
    return () => window.removeEventListener(KASSA_PAYMENT_COMPLETED, loadList);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetch(`/api/kassa/invoices/${selectedId}`)
      .then((r) => r.json())
      .then(setDetail);
  }, [selectedId]);

  const periodLabel = useMemo(() => {
    if (period === "day") {
      return new Date(`${dayDate}T12:00:00`).toLocaleDateString("uz-UZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (period === "month") {
      const [y, m] = monthDate.split("-");
      return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("uz-UZ", {
        month: "long",
        year: "numeric",
      });
    }
    if (period === "year") return `${yearDate} yil`;
    return "Barcha cheklar";
  }, [period, dayDate, monthDate, yearDate]);

  const yearOptions = useMemo(() => {
    const y = currentYear();
    return Array.from({ length: 6 }, (_, i) => String(y - i));
  }, []);

  if (selectedId) {
    if (!detail) {
      return (
        <div className="animate-fade-in space-y-4">
          <div className="h-10 w-40 animate-shimmer rounded-xl" />
          <div className="h-64 animate-shimmer rounded-2xl" />
        </div>
      );
    }

    return (
      <div className="animate-scale-in space-y-6">
        <Button
          variant="outline"
          className="gap-2 rounded-xl border-amber-200 hover:bg-amber-50 hover:text-amber-800"
          onClick={() => setSelectedId(null)}
        >
          <ArrowLeft className="h-4 w-4" />
          Cheklar ro&apos;yxati
        </Button>

        <div className="overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">
                  Chek #{detail.invoiceNumber}
                </p>
                <p className="text-sm text-amber-700">{detail.patient.fullName}</p>
                {detail.status === "REFUNDED" && (
                  <Badge className="mt-2 border-sky-300 bg-sky-100 text-sky-900">
                    Pul qaytarilgan
                  </Badge>
                )}
              </div>
            </div>
            <div className="no-print space-y-2">
              <PrintAgentBanner />
              <div className="flex flex-wrap gap-2">
              <Button
                variant="success"
                size="sm"
                className="rounded-xl"
                disabled={printLoading || !selectedId}
                onClick={async () => {
                  if (!selectedId) return;
                  setPrintLoading(true);
                  setPrintMessage("");
                  try {
                    const result = await printThermalReceipt(selectedId);
                    setPrintMessage(
                      result.warning
                        ? `${result.message || "Chek chop etildi"}. ${result.warning}`
                        : result.message || "Chek chop etildi",
                    );
                  } catch (e) {
                    setPrintMessage(e instanceof Error ? e.message : "Chop etish xatolik");
                  } finally {
                    setPrintLoading(false);
                  }
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                {printLoading ? "Chop etilmoqda..." : "Chop etish"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-amber-200 bg-white/80"
                onClick={() => downloadReceiptPdf(detail, getClinicName())}
              >
                <FileDown className="mr-2 h-4 w-4" />
                PDF
              </Button>
              </div>
              {printMessage ? (
                <p className="text-sm text-amber-800">{printMessage}</p>
              ) : null}
            </div>
          </div>
        </div>

        <ReceiptView invoice={detail} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-amber-100 bg-gradient-to-r from-amber-50/50 to-white">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Cheklarni qidirish</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{periodLabel}</p>
            </div>
            <p className="text-sm font-medium text-amber-800">
              {loading ? "Yuklanmoqda..." : `${invoices.length} ta chek`}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
            <div className="space-y-2">
              <Label>Bemor bo&apos;yicha qidirish</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Ism familiya kiriting..."
                  className="bg-white pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Davr</Label>
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as PeriodFilter)}
              >
                <SelectTrigger className="w-full min-w-[140px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {period === "day" && "Kun"}
                {period === "month" && "Oy"}
                {period === "year" && "Yil"}
                {period === "all" && "Filtr"}
              </Label>
              {period === "day" && (
                <Input
                  type="date"
                  value={dayDate}
                  onChange={(e) => setDayDate(e.target.value)}
                  className="bg-white"
                />
              )}
              {period === "month" && (
                <Input
                  type="month"
                  value={monthDate}
                  onChange={(e) => setMonthDate(e.target.value)}
                  className="bg-white"
                />
              )}
              {period === "year" && (
                <Select value={yearDate} onValueChange={setYearDate}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {period === "all" && (
                <Input
                  disabled
                  value="Barcha davr"
                  className="bg-slate-50 text-muted-foreground"
                />
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {invoices.length === 0 && !loading ? (
        <div className="animate-fade-in rounded-2xl border border-dashed border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Receipt className="h-7 w-7" />
          </div>
          <p className="font-medium text-slate-700">Cheklar topilmadi</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Boshqa kun, oy, yil yoki bemor nomini sinab ko&apos;ring
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {invoices.map((inv, i) => (
            <Card
              key={inv.id}
              className="animate-fade-up group relative cursor-pointer overflow-hidden border-amber-100/80 transition-all hover:border-amber-200 hover:shadow-lg"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              onClick={() => setSelectedId(inv.id)}
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-orange-500 opacity-0 transition-opacity group-hover:opacity-100" />
              <CardHeader className="flex flex-row items-center justify-between py-4 pl-6">
                <div>
                  <CardTitle className="text-base group-hover:text-amber-900">
                    Chek #{inv.invoiceNumber} — {inv.patient.fullName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(inv.createdAt)} · {inv.paymentType.name}
                    {inv.cashier ? ` · ${inv.cashier.fullName}` : ""}
                  </p>
                  {inv.status === "REFUNDED" && (
                    <Badge className="mt-2 border-sky-200 bg-sky-50 text-sky-800">
                      Pul qaytarilgan
                    </Badge>
                  )}
                  {inv.status === "CANCELLED" && (
                    <Badge className="mt-2 border-slate-200 bg-slate-50 text-slate-700">
                      Bekor qilingan
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-700">
                    {formatMoney(toNumber(inv.total))}
                  </p>
                  <span className="text-sm font-semibold text-amber-600 transition-transform group-hover:translate-x-0.5">
                    Ko&apos;rish →
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
