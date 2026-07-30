"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";

export function CustomServiceForm({
  onAdd,
}: {
  onAdd: (item: { name: string; price: number; quantity: number }) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = name.trim();
    const parsedPrice = parseFloat(price);
    const parsedQty = parseInt(quantity, 10) || 1;

    if (trimmed.length < 2) {
      setError("Xizmat nomini kiriting");
      return;
    }
    if (!parsedPrice || parsedPrice <= 0) {
      setError("Narx 0 dan katta bo'lishi kerak");
      return;
    }
    if (parsedQty < 1) {
      setError("Miqdor kamida 1");
      return;
    }

    onAdd({ name: trimmed, price: parsedPrice, quantity: parsedQty });
    setName("");
    setPrice("");
    setQuantity("1");
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
          <PlusCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">Qo&apos;shimcha xizmat</p>
          <p className="text-xs text-amber-700/80">Ro&apos;yxatda yo&apos;q xizmat — nom va narxni kiriting</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Xizmat nomi *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Qo'shimcha konsultatsiya"
            className="bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Narx (UZS) *</Label>
          <Input
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="150000"
            className="bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Miqdor</Label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="bg-white"
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-4">
          <Button type="submit" variant="outline" className="w-full border-amber-300 bg-white hover:bg-amber-50">
            <PlusCircle className="mr-2 h-4 w-4" />
            Savatga qo&apos;shish
          </Button>
        </div>
      </form>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
