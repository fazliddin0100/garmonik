"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileDown,
  Printer,
  Stethoscope,
  UserRound,
  Wallet,
} from "lucide-react";
import { downloadReceiptPdf } from "@/lib/kassa/export-receipt-pdf";
import { ADDON_SERVICE_NAME } from "@/lib/kassa/custom-service";
import { notifyPaymentCompleted } from "@/lib/kassa/kassa-events";
import { printThermalReceipt } from "@/lib/kassa/print-receipt-client";
import { PrintAgentBanner } from "@/components/kassa/print/print-agent-banner";
import { getClinicName } from "@/lib/kassa/receipt-branding";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { Badge } from "@/components/kassa/ui/badge";
import { formatMoney, toNumber } from "@/lib/kassa/utils";
import { formatUzPhoneDisplayFull, resolveUzPhoneE164 } from "@/lib/kassa/phone";
import { ReceiptView, type ReceiptInvoice } from "@/components/kassa/receipt/receipt-view";
import { PaymentMethodPicker } from "@/components/kassa/payment/payment-method-picker";
import {
  PaymentQueuePanel,
  type PaymentQueueItem,
} from "@/components/kassa/payment/payment-queue-panel";
import {
  ManualPaymentEntryPanel,
  type ManualPaymentEntry,
} from "@/components/kassa/payment/manual-payment-entry-panel";
import type { SelectedKassaPatient } from "@/components/kassa/payment/patient-lookup-field";
import { ServicePickerGrid } from "@/components/kassa/payment/service-picker-grid";

type Service = {
  id: string;
  name: string;
  price: { toString(): string };
  category?: { name: string } | null;
};

type PaymentType = {
  id: string;
  name: string;
  platform: string;
  requiresGateway?: boolean;
  gatewayConfigured?: boolean;
};

type CartItem = {
  cartKey: string;
  serviceId?: string;
  name: string;
  price: number;
  quantity: number;
  isCustom: boolean;
};

export function PaymentForm({ allowDiscount = false }: { allowDiscount?: boolean }) {
  const [services, setServices] = useState<Service[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [manualEntry, setManualEntry] = useState<ManualPaymentEntry>({
    fullName: "",
    phone: "",
    note: "",
    patient: null,
  });
  const [selectedPatient, setSelectedPatient] = useState<SelectedKassaPatient | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [manualEntryActive, setManualEntryActive] = useState(false);
  const [selectedPaymentLabel, setSelectedPaymentLabel] = useState("");
  const [referralNote, setReferralNote] = useState("");
  const [paymentTypeId, setPaymentTypeId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastInvoice, setLastInvoice] = useState<ReceiptInvoice | null>(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [printMessage, setPrintMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setServicesLoading(true);
      setServicesError("");

      try {
        const [svcRes, ptRes] = await Promise.all([
          fetch("/api/kassa/services"),
          fetch("/api/kassa/payment-types"),
        ]);

        const svc = await svcRes.json();
        const pt = await ptRes.json();

        if (cancelled) return;

        if (!svcRes.ok) {
          setServices([]);
          setServicesError(svc.error || "Xizmatlar yuklanmadi");
          return;
        }

        if (!Array.isArray(svc)) {
          setServices([]);
          setServicesError("Xizmatlar ro'yxati noto'g'ri formatda keldi");
          return;
        }

        setServices(svc.filter((s: Service) => s.name !== ADDON_SERVICE_NAME));

        if (Array.isArray(pt)) {
          setPaymentTypes(pt);
          const defaultType =
            pt.find((p: PaymentType) => p.platform === "CASH") || pt[0];
          if (defaultType) setPaymentTypeId(defaultType.id);
        }
      } catch {
        if (!cancelled) {
          setServices([]);
          setServicesError("Server bilan aloqa yo'q. Sahifani yangilang.");
        }
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPayment = paymentTypes.find((p) => p.id === paymentTypeId);
  const isCash = selectedPayment?.platform === "CASH";
  const gatewayPending =
    selectedPayment?.requiresGateway && selectedPayment?.gatewayConfigured === false;

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - discount);
  const paidNow = parseFloat(amountPaid || "0");
  const change =
    isCash && !isPartialPayment ? Math.max(0, paidNow - total) : 0;
  const balanceDue = isPartialPayment ? Math.max(0, total - paidNow) : 0;

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category?.name.toLowerCase().includes(q)
    );
  }, [services, serviceSearch]);

  const groupedServices = useMemo(() => {
    const groups = new Map<string, Service[]>();
    for (const service of filteredServices) {
      const key = service.category?.name || "Boshqa";
      const list = groups.get(key) || [];
      list.push(service);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [filteredServices]);

  const selectableServices = useMemo(
    () => filteredServices.filter((s) => toNumber(s.price) > 0),
    [filteredServices]
  );

  function isInCart(serviceId: string) {
    return cart.some((item) => item.serviceId === serviceId && !item.isCustom);
  }

  function addCustomService(item: { name: string; price: number; quantity: number }) {
    setError("");
    setCart((prev) => [
      ...prev,
      {
        cartKey: `custom-${crypto.randomUUID()}`,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isCustom: true,
      },
    ]);
  }

  function toggleService(service: Service) {
    const price = toNumber(service.price);
    if (price <= 0) return;

    setError("");
    setCart((prev) => {
      const exists = prev.find((item) => item.serviceId === service.id && !item.isCustom);
      if (exists) {
        return prev.filter((item) => !(item.serviceId === service.id && !item.isCustom));
      }
      return [
        ...prev,
        {
          cartKey: service.id,
          serviceId: service.id,
          name: service.name,
          price,
          quantity: 1,
          isCustom: false,
        },
      ];
    });
  }

  function toggleAllServices() {
    setError("");
    const allSelected =
      selectableServices.length > 0 &&
      selectableServices.every((service) => isInCart(service.id));

    if (allSelected) {
      const visibleIds = new Set(selectableServices.map((s) => s.id));
      setCart((prev) => prev.filter((item) => !visibleIds.has(item.serviceId || "")));
      return;
    }

    setCart((prev) => {
      const next = [...prev];
      for (const service of selectableServices) {
        if (next.some((item) => item.serviceId === service.id && !item.isCustom)) continue;
        next.push({
          cartKey: service.id,
          serviceId: service.id,
          name: service.name,
          price: toNumber(service.price),
          quantity: 1,
          isCustom: false,
        });
      }
      return next;
    });
  }

  function updateQty(cartKey: string, qty: number) {
    if (qty < 1) {
      setCart((c) => c.filter((i) => i.cartKey !== cartKey));
      return;
    }
    setCart((c) => c.map((i) => (i.cartKey === cartKey ? { ...i, quantity: qty } : i)));
  }

  function clearManualEntry() {
    setManualEntryActive(false);
    setManualEntry({ fullName: "", phone: "", note: "", patient: null });
    if (!selectedQueueId) {
      setSelectedPatient(null);
      setPatientName("");
      setPatientPhone("");
      setReferralNote("");
    }
  }

  function clearQueueSelection() {
    setSelectedQueueId(null);
    setSelectedPatient(null);
    setSelectedPaymentLabel("");
    setPatientName("");
    setPatientPhone("");
    if (!manualEntryActive) {
      setReferralNote("");
    }
    setCart([]);
  }

  function activateManualEntry() {
    const name = manualEntry.fullName.trim();
    if (name.length < 2) return;

    setManualEntryActive(true);
    setSelectedQueueId(null);
    setSelectedPaymentLabel("Qo'lda kiritilgan");
    setPatientName(name);
    setPatientPhone(manualEntry.phone);
    setReferralNote(manualEntry.note.trim());
    setSelectedPatient(
      manualEntry.patient ?? {
        garmonikPatientId: "",
        kassaPatientId: null,
        cardNumber: "Qo'lda",
        fullName: name,
        phone: manualEntry.phone,
      },
    );
    setError("");
    setCart([]);
  }

  function handleQueueSelect(item: PaymentQueueItem, patient: SelectedKassaPatient) {
    setManualEntryActive(false);
    setManualEntry({ fullName: "", phone: "", note: "", patient: null });
    setSelectedQueueId(item.queueId);
    setSelectedPatient(patient);
    setSelectedPaymentLabel(item.paymentLabel);
    setPatientName(item.fullName);
    setPatientPhone(resolveUzPhoneE164(item.phone) ?? "");
    setReferralNote(item.referredDoctorName ?? "");
    setError("");

    if (
      item.paymentKind === "post_doctor" &&
      Array.isArray(item.postPaymentItems) &&
      item.postPaymentItems.some((line) => line.price > 0)
    ) {
      setCart(
        item.postPaymentItems
          .filter((line) => line.price > 0)
          .map((line, index) => ({
            cartKey: `post-${index}-${line.key}`,
            name: line.name,
            price: line.price,
            quantity: 1,
            isCustom: true,
          })),
      );
      return;
    }

    if (item.paymentKind === "inpatient_room") {
      setCart([]);
      setServiceSearch("xona");
      setReferralNote(
        item.referredDoctorName ?
          `Yotqizish — ${item.referredDoctorName}`
        : "Statsionar yotqizish",
      );
      return;
    }

    const consult = services.find((s) => s.name === "Terapevt konsultatsiya");
    if (consult && toNumber(consult.price) > 0) {
      setCart([
        {
          cartKey: consult.id,
          serviceId: consult.id,
          name: consult.name,
          price: toNumber(consult.price),
          quantity: 1,
          isCustom: false,
        },
      ]);
    } else {
      setCart([]);
    }
  }

  async function submitPayment() {
    setError("");
    const activeName =
      manualEntryActive ? manualEntry.fullName.trim() : patientName.trim();

    if (!selectedQueueId && !manualEntryActive) {
      setError("Navbatdan bemorni tanlang yoki qo'lda kiriting");
      return;
    }
    if (!activeName) {
      setError("Bemor ismini kiriting");
      return;
    }

    const phoneE164 = resolveUzPhoneE164(
      selectedPatient?.phone,
      manualEntryActive ? manualEntry.phone : patientPhone,
    );
    const hasPhoneHint = Boolean(
      selectedPatient?.phone?.trim() ||
        (manualEntryActive ? manualEntry.phone.trim() : patientPhone.trim()),
    );
    if (hasPhoneHint && !phoneE164) {
      setError("Telefon raqamini to'liq kiriting: +998 (XX) XXX-XX-XX");
      return;
    }
    if (cart.length === 0) {
      setError("Kamida bitta xizmat tanlang");
      return;
    }
    if (!paymentTypeId) {
      setError("To'lov turini tanlang");
      return;
    }
    if (isPartialPayment) {
      if (paidNow < 0 || paidNow >= total) {
        setError("Qisman to'lov uchun 0 yoki undan katta, lekin jami summadan kichik summa kiriting");
        return;
      }
    } else if (paidNow > 0 && paidNow < total) {
      setError(
        isCash
          ? "Naqt pul yetarli emas yoki «Qisman to'lov» rejimini yoqing"
          : "Kiritilgan summa jami summadan kam",
      );
      return;
    }

    const paidAmount = isPartialPayment ? paidNow : paidNow || total;

    setLoading(true);
    try {
      const res = await fetch("/api/kassa/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: activeName,
          patientPhone: phoneE164,
          kassaPatientId: selectedPatient?.kassaPatientId ?? undefined,
          garmonikPatientId:
            selectedPatient?.garmonikPatientId?.trim() ?
              selectedPatient.garmonikPatientId
            : undefined,
          referralNote: referralNote || undefined,
          paymentTypeId,
          discount: allowDiscount ? discount : 0,
          amountPaid: paidAmount,
          isPartialPayment,
          items: cart.map((c) =>
            c.isCustom
              ? {
                  type: "custom",
                  customName: c.name,
                  customPrice: c.price,
                  quantity: c.quantity,
                }
              : {
                  type: "catalog",
                  serviceId: c.serviceId!,
                  quantity: c.quantity,
                }
          ),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }

      setLastInvoice(data);
      notifyPaymentCompleted();
      setPatientName("");
      setPatientPhone("");
      setSelectedPatient(null);
      setSelectedQueueId(null);
      setManualEntryActive(false);
      setManualEntry({ fullName: "", phone: "", note: "", patient: null });
      setSelectedPaymentLabel("");
      setReferralNote("");
      setCart([]);
      setAmountPaid("");
      setDiscount(0);
      setIsPartialPayment(false);
    } catch {
      setError("Server xatosi");
    } finally {
      setLoading(false);
    }
  }

  if (lastInvoice) {
    return (
      <div className="animate-scale-in space-y-6">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800">
              {toNumber(lastInvoice.balanceDue ?? 0) > 0
                ? "Qisman to'lov qabul qilindi"
                : "To'lov muvaffaqiyatli qabul qilindi"}
            </p>
            <p className="text-sm text-emerald-600">
              {toNumber(lastInvoice.balanceDue ?? 0) > 0
                ? `Qolgan qarz: ${formatMoney(lastInvoice.balanceDue!)}`
                : "Chekni chop eting yoki PDF sifatida saqlang"}
            </p>
          </div>
        </div>
        <div className="no-print space-y-2">
          <PrintAgentBanner />
          <div className="flex flex-wrap gap-2">
          <Button
            disabled={printLoading || !lastInvoice.id}
            onClick={async () => {
              if (!lastInvoice.id) return;
              setPrintLoading(true);
              setPrintMessage("");
              try {
                const result = await printThermalReceipt(lastInvoice.id);
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
            {printLoading ? "Chop etilmoqda..." : "Chek chop etish (80mm)"}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadReceiptPdf(lastInvoice, getClinicName())
            }
          >
            <FileDown className="mr-2 h-4 w-4" />
            PDF yuklab olish
          </Button>
          <Button variant="outline" onClick={() => setLastInvoice(null)}>
            Yangi to&apos;lov
          </Button>
          </div>
          {printMessage ? (
            <p className="text-sm text-emerald-700">{printMessage}</p>
          ) : null}
        </div>
        <ReceiptView invoice={lastInvoice} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="overflow-hidden border-sky-100">
          <CardHeader className="border-b border-sky-50 bg-gradient-to-r from-sky-50/80 to-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <UserRound className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">To&apos;lov navbati</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
            <PaymentQueuePanel
              selectedQueueId={selectedQueueId}
              onSelect={handleQueueSelect}
              onClear={clearQueueSelection}
            />
            <ManualPaymentEntryPanel
              active={manualEntryActive}
              value={manualEntry}
              onChange={(next) => {
                setManualEntry(next);
                if (manualEntryActive) {
                  setPatientName(next.fullName);
                  setPatientPhone(next.phone);
                  setReferralNote(next.note.trim());
                  setSelectedPatient(
                    next.patient ?? {
                      garmonikPatientId: "",
                      kassaPatientId: null,
                      cardNumber: "Qo'lda",
                      fullName: next.fullName.trim(),
                      phone: next.phone,
                    },
                  );
                }
              }}
              onActivate={activateManualEntry}
              onClear={clearManualEntry}
            />
            {selectedPatient ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 lg:col-span-2">
                <p className="text-sm font-medium text-emerald-900">Tanlangan bemor</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {manualEntryActive ? manualEntry.fullName.trim() : selectedPatient.fullName}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-emerald-300 text-emerald-800">
                    {manualEntryActive ? "Qo'lda" : selectedPatient.cardNumber}
                  </Badge>
                  {selectedPaymentLabel ? (
                    <Badge className="bg-emerald-600 text-white">{selectedPaymentLabel}</Badge>
                  ) : null}
                  {(manualEntryActive ? manualEntry.phone : selectedPatient.phone) ? (
                    <Badge variant="outline" className="border-slate-200 text-slate-700">
                      {formatUzPhoneDisplayFull(
                        manualEntryActive ? manualEntry.phone : selectedPatient.phone,
                      )}
                    </Badge>
                  ) : null}
                </div>
              </div>
            ) : null}
            {referralNote ? (
              <div className="space-y-1 lg:col-span-2">
                <Label>Yo&apos;naltirilgan shifokor</Label>
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {referralNote}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-violet-100">
          <CardHeader className="border-b border-violet-50 bg-gradient-to-r from-violet-50/80 to-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Xizmatlar</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Qatorni bosing — tanlash; miqdorni o&apos;zgartirish mumkin
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ServicePickerGrid
              serviceSearch={serviceSearch}
              onSearchChange={setServiceSearch}
              groupedServices={groupedServices}
              selectableServices={selectableServices}
              cart={cart}
              isInCart={isInCart}
              onToggle={toggleService}
              onToggleAll={toggleAllServices}
              onUpdateQty={updateQty}
              onAddCustom={addCustomService}
              loading={servicesLoading}
              error={servicesError}
              totalCount={services.length}
              onRetry={() => window.location.reload()}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="sticky top-4 overflow-hidden border-emerald-200 shadow-glow-emerald">
          <CardHeader className="border-b border-emerald-100 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Wallet className="h-5 w-5" />
              </div>
              <CardTitle className="text-white">To&apos;lov</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length > 0 ? (
              <ul className="space-y-2 rounded-lg border bg-white p-3 text-sm">
                {cart.map((item) => (
                  <li key={item.cartKey} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {item.isCustom && (
                        <span className="mr-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">
                          +
                        </span>
                      )}
                      {item.name}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </span>
                    <span className="font-medium">
                      {formatMoney(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Xizmat tanlanmagan</p>
            )}

            <div className="flex justify-between text-lg">
              <span>Jami</span>
              <span className="font-bold text-primary">{formatMoney(subtotal)}</span>
            </div>

            {allowDiscount && (
              <div className="space-y-2">
                <Label>Chegirma (admin)</Label>
                <Input
                  type="number"
                  min={0}
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            {discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Chegirmadan keyin</span>
                <span className="font-semibold">{formatMoney(total)}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                To&apos;lov turi
              </Label>
              {gatewayPending && selectedPayment && (
                <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  {selectedPayment.name}: terminal IP hali kiritilmagan — to&apos;lov turi
                  qayd etiladi, terminal keyin ulanganida avtomatik ishlaydi
                </p>
              )}
              <PaymentMethodPicker
                types={paymentTypes}
                value={paymentTypeId}
                onChange={setPaymentTypeId}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
              <input
                type="checkbox"
                checked={isPartialPayment}
                onChange={(e) => {
                  setIsPartialPayment(e.target.checked);
                  setAmountPaid("");
                }}
                className="h-4 w-4 rounded border-amber-300"
              />
              <div>
                <p className="text-sm font-medium text-amber-900">Qisman to&apos;lov (qarz)</p>
                <p className="text-xs text-amber-700">
                  Bemor hozir to&apos;liq to&apos;lay olmasa, qolganini qarz sifatida saqlash. 0 so&apos;m ham mumkin.
                </p>
              </div>
            </label>

            <div className="space-y-2">
              <Label>
                {isPartialPayment ? "Hozir to'lanadigan summa" : "Bemor bergan summa"}
              </Label>
              <Input
                type="number"
                min={0}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={
                  isPartialPayment ? "0 yoki masalan: 300000" : String(total || 0)
                }
              />
            </div>
            {change > 0 && (
              <Badge variant="success" className="w-full justify-center py-2">
                Qaytim: {formatMoney(change)}
              </Badge>
            )}
            {isPartialPayment && balanceDue >= 0 && total > 0 && (
              <Badge variant="outline" className="w-full justify-center border-rose-200 py-2 text-rose-700">
                Qolgan qarz: {formatMoney(balanceDue)}
              </Badge>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              variant="success"
              className="w-full"
              size="lg"
              disabled={loading || cart.length === 0}
              onClick={submitPayment}
            >
              {loading
                ? selectedPayment?.requiresGateway && !gatewayPending
                  ? "Terminal orqali to'lov..."
                  : "Saqlanmoqda..."
                : "To'lovni tasdiqlash"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
