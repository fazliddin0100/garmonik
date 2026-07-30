"use client";

import { Check, Minus, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { cn, formatMoney, formatServicePrice, toNumber } from "@/lib/kassa/utils";

type Service = {
  id: string;
  name: string;
  price: { toString(): string };
  category?: { name: string } | null;
};

import { CustomServiceForm } from "@/components/kassa/payment/custom-service-form";

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

      <div className="max-h-[min(520px,60vh)] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 animate-shimmer rounded-2xl" />
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
        ) : groupedServices.length === 0 ? (
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
          <div className="space-y-5">
            {groupedServices.map(([category, items]) => (
              <div key={category}>
                <p className="mb-3 sticky top-0 z-10 rounded-lg bg-slate-50/95 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-600 backdrop-blur-sm">
                  {category}
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-3">
                  {items.map((service) => {
                    const price = toNumber(service.price);
                    const disabled = price <= 0;
                    const selected = isInCart(service.id);
                    const cartItem = cart.find(
                      (c) => c.serviceId === service.id && !c.isCustom
                    );
                    const qty = cartItem?.quantity ?? 0;

                    return (
                      <div
                        key={service.id}
                        className={cn(
                          "group relative flex min-h-[108px] flex-col rounded-2xl border-2 bg-white p-3 text-left shadow-sm transition-all duration-200",
                          disabled && "cursor-not-allowed opacity-45",
                          !disabled && !selected && "border-slate-100 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md",
                          selected &&
                            "border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50/80 shadow-md ring-2 ring-emerald-400/30"
                        )}
                      >
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && onToggle(service)}
                          className="flex flex-1 flex-col text-left"
                        >
                          {selected && (
                            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                          )}

                          <span
                            className={cn(
                              "line-clamp-3 pr-6 text-sm font-semibold leading-snug",
                              selected ? "text-emerald-900" : "text-slate-800"
                            )}
                          >
                            {service.name}
                          </span>

                          <span
                            className={cn(
                              "mt-auto pt-2 text-base font-bold",
                              selected ? "text-emerald-700" : "text-violet-600"
                            )}
                          >
                            {formatServicePrice(price)}
                          </span>
                        </button>

                        {selected && qty > 0 && (
                          <div
                            className="mt-2 flex items-center justify-between gap-1 rounded-xl border border-emerald-200 bg-white/90 p-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
                              onClick={() => onUpdateQty(service.id, qty - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-bold text-emerald-800">
                              {qty}
                            </span>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white transition-colors hover:bg-emerald-600"
                              onClick={() => onUpdateQty(service.id, qty + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
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
