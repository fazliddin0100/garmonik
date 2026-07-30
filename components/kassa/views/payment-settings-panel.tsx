"use client";

import { useEffect, useState } from "react";
import {
  Cable,
  CheckCircle2,
  Loader2,
  Plus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { Badge } from "@/components/kassa/ui/badge";
import { cn } from "@/lib/kassa/utils";

type PaymentTypeConfig = {
  id: string;
  name: string;
  platform: string;
  gatewayHost: string;
  gatewayPort: number;
  gatewayPath: string;
  gatewayConfigured: boolean;
  requiresGateway: boolean;
};

const PLATFORM_LABELS: Record<string, string> = {
  HUMO: "Humo terminal",
  VISA: "Visa terminal",
  UZCARD: "UzCard terminal",
  CLICK: "Click",
  PAYME: "Payme",
  CUSTOM: "Qo'shimcha",
  TERMINAL: "Terminal",
};

export function PaymentSettingsPanel() {
  const [types, setTypes] = useState<PaymentTypeConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<PaymentTypeConfig>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { online: boolean; message?: string; error?: string }>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [customName, setCustomName] = useState("");
  const [customHost, setCustomHost] = useState("");
  const [customPort, setCustomPort] = useState("8080");
  const [adding, setAdding] = useState(false);

  function load() {
    fetch("/api/kassa/payment-types")
      .then((r) => r.json())
      .then((data: PaymentTypeConfig[]) => {
        setTypes(data);
        const initial: Record<string, Partial<PaymentTypeConfig>> = {};
        for (const t of data) {
          initial[t.id] = {
            gatewayHost: t.gatewayHost || "",
            gatewayPort: t.gatewayPort,
            gatewayPath: t.gatewayPath,
          };
        }
        setDrafts(initial);
      });
  }

  useEffect(() => {
    load();
  }, []);

  function updateDraft(id: string, field: keyof PaymentTypeConfig, value: string | number) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function saveType(id: string) {
    setError("");
    setSuccess("");
    setSavingId(id);
    const draft = drafts[id];
    const res = await fetch("/api/kassa/payment-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        gatewayHost: draft?.gatewayHost ?? "",
        gatewayPort: draft?.gatewayPort ?? 8080,
        gatewayPath: draft?.gatewayPath ?? "/api/kassa/payment",
      }),
    });
    setSavingId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Saqlashda xatolik");
      return;
    }
    setSuccess("To'lov sozlamalari saqlandi");
    load();
  }

  async function testConnection(id: string) {
    setTestingId(id);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const draft = drafts[id];
    const res = await fetch("/api/kassa/payment-types", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        gatewayHost: draft?.gatewayHost,
        gatewayPort: draft?.gatewayPort,
      }),
    });
    const data = await res.json();
    setTestingId(null);
    setTestResults((prev) => ({ ...prev, [id]: data }));
  }

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAdding(true);
    const res = await fetch("/api/kassa/payment-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customName,
        gatewayHost: customHost,
        gatewayPort: parseInt(customPort, 10) || 8080,
      }),
    });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Qo'shishda xatolik");
      return;
    }
    setCustomName("");
    setCustomHost("");
    setCustomPort("8080");
    setSuccess("Yangi to'lov usuli qo'shildi");
    load();
  }

  const gatewayTypes = types.filter((t) => t.requiresGateway);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-violet-100">
        <CardHeader className="border-b border-violet-50 bg-gradient-to-r from-violet-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
              <Cable className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>To&apos;lov terminali integratsiyasi</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ish kuni boshida terminal IP manzillarini kiriting — kassirda tugmalar faollashadi
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {error && (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{success}</p>
          )}

          <div className="space-y-4">
            {gatewayTypes.map((type) => {
              const draft = drafts[type.id];
              const test = testResults[type.id];
              const configured = Boolean(draft?.gatewayHost?.trim());

              return (
                <div
                  key={type.id}
                  className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    configured ? "border-emerald-100 bg-emerald-50/20" : "border-slate-200 bg-slate-50/30"
                  )}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{type.name}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {PLATFORM_LABELS[type.platform] || type.platform}
                      </Badge>
                      {configured ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Faol
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          IP kutilmoqda
                        </Badge>
                      )}
                    </div>
                    {test && (
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs font-medium",
                          test.online ? "text-emerald-600" : "text-destructive"
                        )}
                      >
                        {test.online ? (
                          <Wifi className="h-3.5 w-3.5" />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5" />
                        )}
                        {test.online ? test.message : test.error}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-xs">IP manzil *</Label>
                      <Input
                        placeholder="192.168.1.100"
                        value={draft?.gatewayHost ?? ""}
                        onChange={(e) => updateDraft(type.id, "gatewayHost", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Port</Label>
                      <Input
                        type="number"
                        min={1}
                        value={draft?.gatewayPort ?? 8080}
                        onChange={(e) =>
                          updateDraft(type.id, "gatewayPort", parseInt(e.target.value, 10) || 8080)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">API yo&apos;li</Label>
                      <Input
                        value={draft?.gatewayPath ?? "/api/kassa/payment"}
                        onChange={(e) => updateDraft(type.id, "gatewayPath", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveType(type.id)}
                      disabled={savingId === type.id}
                    >
                      {savingId === type.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Saqlash
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testConnection(type.id)}
                      disabled={testingId === type.id || !configured}
                    >
                      {testingId === type.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wifi className="mr-2 h-4 w-4" />
                      )}
                      Ulanishni tekshirish
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Terminal API: POST /api/payment — body: amount, currency, method, reference. Health: GET
            /api/health
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-teal-100">
        <CardHeader className="border-b border-teal-50 bg-gradient-to-r from-teal-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <Plus className="h-5 w-5" />
            </div>
            <CardTitle>Qo&apos;shimcha to&apos;lov usuli</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={addCustom} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nomi *</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Masalan: Apelsin"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IP manzil *</Label>
              <Input
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value)}
                placeholder="192.168.1.50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Port</Label>
              <Input
                type="number"
                value={customPort}
                onChange={(e) => setCustomPort(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={adding}>
                {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Qo&apos;shish
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
