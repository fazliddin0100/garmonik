"use client";

import { Check, Minus, Plus, Search, X } from "lucide-react";
import { CustomServiceForm } from "@/components/kassa/payment/custom-service-form";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { cn, formatMoney, formatServicePrice, toNumber } from "@/lib/kassa/utils";

type Service = {
  id: string;
  name: string;
  price: { toString(): string };
  category?: { name: string } | null;
};

type CartItem = {
  cartKey: string;
  serviceId?: string;
  name: string;
  price: number;
  quantity: number;
  isCustom: boolean;
};

export function ServicePickerGrid({
  serviceSearch,
  onSearchChange,
  groupedServices,
  selectableServices,
  cart,
  isInCart,
  onToggle,
  onToggleAll,
  onUpdateQty,
  onAddCustom,
  loading = false,
  error = "",
  totalCount = 0,
  onRetry,
}: {
  serviceSearch: string;
  onSearchChange: (value: string) => void;
  groupedServices: [string, Service[]][];
  selectableServices: Service[];
  cart: CartItem[];
  isInCart: (id: string) => boolean;
  onToggle: (service: Service) => void;
  onToggleAll: () => void;
  onUpdateQty: (cartKey: string, qty: number) => void;
  onAddCustom: (item: { name: string; price: number; quantity: number }) => void;
  loading?: boolean;
  error?: string;
  totalCount?: number;
  onRetry?: () => void;
}) {
  const allSelected =
    selectableServices.length > 0 &&
    selectableServices.every((s) => isInCart(s.id));

  const flatRows = groupedServices.flatMap(([category, items]) =>
    items.map((service) => ({ category, service })),
  );

  return (
    <div className="space-y-4">
      <CustomServiceForm onAdd={onAddCustom} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={serviceSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Xizmat qidirish..."
            className="bg-white pl-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-xl"
          onClick={onToggleAll}
          disabled={selectableServices.length === 0}
        >
          {allSelected ? "Hammasini olib tashlash" : "Hammasini tanlash"}
        </Button>
        {cart.length > 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            {cart.length} ta tanlangan
          </span>
        )}
      </div>

      <div className="max-h-[min(520px,60vh)] overflow-auto rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-10 animate-shimmer" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            {onRetry && (
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                Qayta yuklash
              </Button>
            )}
          </div>
        ) : flatRows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {serviceSearch.trim()
                ? "Qidiruv bo'yicha xizmat topilmadi"
                : totalCount === 0
                  ? "Bazada faol xizmat yo'q. Admin panelidan xizmat qo'shing yoki seed ishga tushiring."
                  : "Xizmat topilmadi"}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2.5" aria-label="Tanlash" />
                <th className="px-3 py-2.5">Turkum</th>
                <th className="px-3 py-2.5">Xizmat</th>
                <th className="px-3 py-2.5 text-right">Narx</th>
                <th className="w-28 px-3 py-2.5 text-center">Miqdor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flatRows.map(({ category, service }) => {
                const price = toNumber(service.price);
                const disabled = price <= 0;
                const selected = isInCart(service.id);
                const cartItem = cart.find(
                  (c) => c.serviceId === service.id && !c.isCustom,
                );
                const qty = cartItem?.quantity ?? 0;

                return (
                  <tr
                    key={service.id}
                    className={cn(
                      "transition-colors",
                      disabled && "opacity-45",
                      selected ? "bg-emerald-50/80" : "hover:bg-violet-50/40",
                      !disabled && "cursor-pointer",
                    )}
                    onClick={() => {
                      if (!disabled) onToggle(service);
                    }}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border",
                          selected
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 bg-white text-transparent",
                          disabled && "border-slate-200 bg-slate-50",
                        )}
                        aria-hidden
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-violet-700">
                      {category}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {service.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-violet-700">
                      {formatServicePrice(price)}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {selected && qty > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                            onClick={() => onUpdateQty(service.id, qty - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-bold text-emerald-800">
                            {qty}
                          </span>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                            onClick={() => onUpdateQty(service.id, qty + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="block text-center text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {cart.length > 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Tanlangan xizmatlar
          </p>
          <ul className="space-y-1.5">
            {cart.map((item) => (
              <li
                key={item.cartKey}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 flex-1 text-slate-700">
                  {item.isCustom && (
                    <span className="mr-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      Qo&apos;shimcha
                    </span>
                  )}
                  {item.name}
                  {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {item.isCustom && (
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.cartKey, 0)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Olib tashlash"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="font-semibold text-emerald-800">
                    {formatMoney(item.price * item.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
