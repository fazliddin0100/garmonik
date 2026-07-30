"use client";

/** Har bir kassir kompyuteridagi mahalliy agent (127.0.0.1 = shu kompyuter) */
export const LOCAL_PRINT_AGENT_URL = "http://127.0.0.1:17888";

type PrintResult = {
  ok: boolean;
  method: "agent";
  message?: string;
  warning?: string;
};

export type PrintAgentHealth = {
  online: boolean;
  agentUrl: string;
  printerName?: string | null;
  printerReady?: boolean | null;
  printerStatus?: string | null;
  warning?: string | null;
};

export function getPrintAgentUrl() {
  return process.env.NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL?.trim() || LOCAL_PRINT_AGENT_URL;
}

async function checkAgentHealth(agentUrl: string): Promise<Omit<PrintAgentHealth, "agentUrl">> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${agentUrl}/health`, {
      signal: controller.signal,
      mode: "cors",
    });
    if (!res.ok) return { online: false };
    const data = await res.json().catch(() => ({}));
    return {
      online: data.ok === true,
      printerName: typeof data.printerName === "string" ? data.printerName : null,
      printerReady:
        typeof data.printerReady === "boolean" ? data.printerReady : null,
      printerStatus:
        typeof data.printerStatus === "string" ? data.printerStatus : null,
      warning: typeof data.warning === "string" ? data.warning : null,
    };
  } catch {
    return { online: false };
  } finally {
    clearTimeout(timer);
  }
}

function getFetchBlockedMessage(agentUrl: string) {
  const isHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";

  if (isHttps) {
    return (
      `Brauzer HTTPS saytdan mahalliy agentga (${agentUrl}) ulanishni blokladi. ` +
      `Yechim: saytni HTTP orqali oching (masalan http://192.168.x.x) yoki ` +
      `print-agent papkasini yangilab install-autostart.bat ni qayta ishga tushiring. ` +
      `Agent log: print-agent/agent.log`
    );
  }

  return (
    `Print agentga ulanib bo'lmadi (${agentUrl}). ` +
    `install-autostart.bat ishga tushiring yoki status-agent.bat bilan tekshiring.`
  );
}

async function sendToLocalAgent(base64: string) {
  const agentUrl = getPrintAgentUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const body = "data=" + encodeURIComponent(base64);
    const res = await fetch(`${agentUrl}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      signal: controller.signal,
      mode: "cors",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (payload.error as string) ||
          `Print agent xatolik (HTTP ${res.status}). agent.log ni tekshiring.`
      );
    }
    return payload as {
      success?: boolean;
      message?: string;
      warning?: string | null;
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Print agent javob bermadi (timeout). ${getFetchBlockedMessage(agentUrl)}`
      );
    }
    if (
      error instanceof TypeError ||
      (error instanceof Error &&
        (error.message.includes("fetch") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError")))
    ) {
      throw new Error(getFetchBlockedMessage(agentUrl));
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function printThermalReceipt(invoiceId: string): Promise<PrintResult> {
  const escposRes = await fetch(`/api/kassa/invoices/${invoiceId}/print`);
  const escposPayload = await escposRes.json().catch(() => ({}));

  if (!escposRes.ok || !escposPayload.data) {
    throw new Error(escposPayload.error || "Chek ma'lumotlari olinmadi");
  }

  const agentResult = await sendToLocalAgent(escposPayload.data as string);
  return {
    ok: true,
    method: "agent",
    message: agentResult.message || "Chek printerga yuborildi",
    warning: agentResult.warning || undefined,
  };
}

export async function printThermalReceiptWithFeedback(invoiceId: string) {
  const result = await printThermalReceipt(invoiceId);
  if (!result.ok && result.message) {
    throw new Error(result.message);
  }
  return result;
}

export async function checkPrintAgentStatus(): Promise<PrintAgentHealth> {
  const agentUrl = getPrintAgentUrl();
  const health = await checkAgentHealth(agentUrl);
  return { ...health, agentUrl };
}
