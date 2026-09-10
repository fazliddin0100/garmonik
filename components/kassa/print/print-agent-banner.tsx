"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Printer } from "lucide-react";
import { checkPrintAgentStatus } from "@/lib/kassa/print-receipt-client";

export function PrintAgentBanner({
  hideWhenOnline = true,
}: {
  hideWhenOnline?: boolean;
}) {
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof checkPrintAgentStatus>
  > | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await checkPrintAgentStatus());
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (status === null) return null;

  const online = status.online;
  const printerReady = status.printerReady;
  const showReady =
    online && printerReady !== false && hideWhenOnline && !status.warning;

  if (showReady) return null;

  if (online && printerReady !== false && !status.warning) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>
          Printer tayyor
          {status.printerName ? `: ${status.printerName}` : ""}. Chek chop etish ishlaydi.
        </span>
      </div>
    );
  }

  if (online && (printerReady === false || status.warning)) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">
              Agent ishlayapti, lekin printer tayyor emas
              {status.printerName ? `: ${status.printerName}` : ""}
              {status.printerStatus ? ` (${status.printerStatus})` : ""}
            </p>
            <p className="text-xs leading-relaxed text-amber-900">
              {status.warning ||
                "Windows da navbatni tozalang, USB/qog'ozni tekshiring, Print test page sinab ko'ring."}
            </p>
            <p className="text-xs text-amber-800">
              <code className="rounded bg-amber-100 px-1">print-agent/config.txt</code> →{" "}
              <code className="rounded bg-amber-100 px-1">PRINTER_NAME=Xprinter XP-80</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="font-semibold">Chek chop etish agenti ishlamayapti</p>
          <p className="text-xs leading-relaxed text-amber-900">
            Printer ulangan <strong>shu kompyuterda</strong> bir marta{" "}
            <code className="rounded bg-amber-100 px-1">print-agent/install-autostart.bat</code>{" "}
            ni ishga tushiring — keyin kompyuter yoqilganda agent avtomatik fon
            rejimida ishlaydi.
          </p>
          <p className="flex items-center gap-1 text-xs text-amber-800">
            <Printer className="h-3.5 w-3.5" />
            Tekshirish: <code className="rounded bg-amber-100 px-1">status-agent.bat</code> yoki{" "}
            <code className="rounded bg-amber-100 px-1">test-print.bat</code>
          </p>
        </div>
      </div>
    </div>
  );
}
