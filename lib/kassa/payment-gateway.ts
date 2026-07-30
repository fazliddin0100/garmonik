import type { PaymentPlatform } from ".prisma/kassa-client";

export const GATEWAY_PLATFORMS: PaymentPlatform[] = [
  "HUMO",
  "VISA",
  "UZCARD",
  "TERMINAL",
  "CLICK",
  "PAYME",
  "CUSTOM",
];

export function requiresPaymentGateway(platform: PaymentPlatform): boolean {
  return platform !== "CASH";
}

export function isGatewayConfigured(type: {
  platform: PaymentPlatform;
  gatewayHost: string | null;
}): boolean {
  if (!requiresPaymentGateway(type.platform)) return true;
  return Boolean(type.gatewayHost?.trim());
}

export type GatewayPaymentRequest = {
  host: string;
  port: number;
  path: string;
  platform: PaymentPlatform;
  amount: number;
  reference: string;
  description?: string;
};

export type GatewayPaymentResult = {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
};

export type GatewayHealthResult = {
  online: boolean;
  message?: string;
  error?: string;
};

function buildGatewayUrl(host: string, port: number, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `http://${host.trim()}:${port}${normalizedPath}`;
}

function buildHealthUrl(host: string, port: number): string {
  return `http://${host.trim()}:${port}/api/health`;
}

export async function checkGatewayHealth(
  host: string,
  port: number,
  timeoutMs = 5000
): Promise<GatewayHealthResult> {
  if (!host.trim()) {
    return { online: false, error: "IP manzil kiritilmagan" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(buildHealthUrl(host, port), {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.ok) {
      return { online: true, message: "Terminal onlayn" };
    }

    return { online: false, error: `Terminal javob bermadi (${res.status})` };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Aloqa yo'q";
    return { online: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function processGatewayPayment(
  request: GatewayPaymentRequest,
  timeoutMs = 120000
): Promise<GatewayPaymentResult> {
  if (!request.host.trim()) {
    return { success: false, error: "To'lov terminali IP manzili sozlanmagan" };
  }

  if (process.env.PAYMENT_GATEWAY_MOCK === "true") {
    await new Promise((r) => setTimeout(r, 800));
    return {
      success: true,
      transactionId: `MOCK-${Date.now()}`,
      message: "Test rejimida to'lov tasdiqlandi",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(buildGatewayUrl(request.host, request.port, request.path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        amount: request.amount,
        currency: "UZS",
        method: request.platform,
        reference: request.reference,
        description: request.description,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      transactionId?: string;
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      return {
        success: false,
        error: data.error || data.message || `Terminal xatosi (${res.status})`,
      };
    }

    if (data.success === false) {
      return {
        success: false,
        error: data.error || data.message || "To'lov rad etildi",
      };
    }

    return {
      success: true,
      transactionId: data.transactionId || `TX-${Date.now()}`,
      message: data.message || "To'lov muvaffaqiyatli",
    };
  } catch (e) {
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "Terminal javob bermadi (vaqt tugadi)"
        : e instanceof Error
          ? e.message
          : "Terminal bilan aloqa yo'q";
    return { success: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
