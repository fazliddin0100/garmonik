export type ReceiptPrinterConfig = {
  enabled: boolean;
  serverPrintEnabled: boolean;
  host: string;
  port: number;
  width: number;
  agentUrl: string;
  printerName: string;
};

function parseBool(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value.trim() === "") return defaultValue;
  return value.trim().toLowerCase() === "true";
}

export function getReceiptPrinterConfig(): ReceiptPrinterConfig {
  const enabledRaw = process.env.RECEIPT_PRINTER_ENABLED?.trim().toLowerCase();
  const host = process.env.RECEIPT_PRINTER_HOST?.trim() || "127.0.0.1";
  const isLocalHost = host === "127.0.0.1" || host === "localhost" || host === "::1";

  return {
    enabled: enabledRaw !== "false",
    // Serverda USB printer bo'lmaganda TCP orqali chop etishni o'chirish
    serverPrintEnabled: parseBool(
      process.env.RECEIPT_PRINT_SERVER_ENABLED,
      !isLocalHost
    ),
    host,
    port: parseInt(process.env.RECEIPT_PRINTER_PORT || "9100", 10),
    width: parseInt(process.env.RECEIPT_PRINTER_WIDTH || "48", 10),
    agentUrl: process.env.NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL?.trim() || "http://127.0.0.1:17888",
    printerName: process.env.RECEIPT_PRINTER_NAME?.trim() || "",
  };
}

export function getClientPrintConfig() {
  const serverEnabled = process.env.NEXT_PUBLIC_RECEIPT_PRINT_SERVER_ENABLED?.trim().toLowerCase();
  return {
    agentUrl:
      process.env.NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL?.trim() || "http://127.0.0.1:17888",
    serverPrintEnabled: serverEnabled === "true",
  };
}
