"use client";

import { useEffect, useState } from "react";
import { Cable, PlusCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { PaymentSettingsPanel } from "@/components/kassa/views/payment-settings-panel";
import { ADDON_SERVICE_NAME } from "@/lib/kassa/custom-service";
import { cn, formatServicePrice, toNumber } from "@/lib/kassa/utils";

type Service = {
  id: string;
  name: string;
  price: { toString(): string };
  isActive: boolean;
  category?: { name: string } | null;
};

type ServicesTab = "services" | "payments";

const TABS: { id: ServicesTab; label: string; icon: typeof PlusCircle }[] = [
  { id: "services", label: "Yangi xizmat qo'shish", icon: PlusCircle },
  { id: "payments", label: "To'lov terminali integratsiyasi", icon: Cable },
];

export function ServicesView() {
  const [tab, setTab] = useState<ServicesTab>("services");
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  function load() {
    fetch("/api/kassa/services")
      .then((r) => r.json())
      .then((data: Service[]) => {
        if (Array.isArray(data)) {
          setServices(data.filter((s) => s.name !== ADDON_SERVICE_NAME));
        }
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/kassa/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: parseFloat(price) || 0 }),
    });
    setName("");
    setPrice("");
    load();
  }

  async function saveService(id: string) {
    await fetch("/api/kassa/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: editName,
        price: parseFloat(editPrice) || 0,
      }),
    });
    setEditId(null);
    load();
  }

  return (
    <div>
      <PageHeader
        icon={Settings2}
        title="Xizmatlar boshqaruvi"
        description="Xizmatlar, narxlar va to'lov terminali IP sozlamalari"
        accent="violet"
      />

      <div className="animate-fade-in mb-8 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-sm">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 sm:flex-none sm:min-w-[200px]",
                active
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
                  : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "services" && (
        <div className="animate-fade-up grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden border-violet-100">
            <CardHeader className="border-b border-violet-50 bg-gradient-to-r from-violet-50/80 to-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <CardTitle>Yangi xizmat qo&apos;shish</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={addService} className="space-y-4">
                <div className="space-y-2">
                  <Label>Xizmat nomi</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Narx (UZS)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0 = kelishilgan narx"
                  />
                  <p className="text-xs text-muted-foreground">
                    Narx belgilanmagan bo&apos;lsa 0 qoldiring (--- ko&apos;rinadi)
                  </p>
                </div>
                <Button type="submit">Qo&apos;shish</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Xizmatlar ro&apos;yxati</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {services.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    {editId === s.id ? (
                      <div className="flex w-full flex-wrap items-end gap-2">
                        <div className="min-w-[180px] flex-1 space-y-1">
                          <Label className="text-xs">Nomi</Label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="w-36 space-y-1">
                          <Label className="text-xs">Narx</Label>
                          <Input
                            type="number"
                            min={0}
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                          />
                        </div>
                        <Button size="sm" onClick={() => saveService(s.id)}>
                          Saqlash
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                          Bekor
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          {s.category && (
                            <p className="text-xs text-muted-foreground">{s.category.name}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditId(s.id);
                            setEditName(s.name);
                            setEditPrice(String(toNumber(s.price)));
                          }}
                        >
                          {formatServicePrice(s.price)}
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "payments" && (
        <div className="animate-fade-up">
          <PaymentSettingsPanel />
        </div>
      )}
    </div>
  );
}
