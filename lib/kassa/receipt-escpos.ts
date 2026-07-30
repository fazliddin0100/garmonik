import { getInvoiceItemLabel } from "./custom-service";
import { appendLogoToEscPos, getReceiptLogoEscPos } from "./receipt-logo-escpos";
import { CLINIC_ADDRESS, getClinicName } from "./receipt-branding";
import { formatDate, formatMoney, toNumber } from "./utils";

export type ReceiptPrintInvoice = {
  invoiceNumber: number;
  createdAt: string | Date;
  subtotal: number | { toString(): string };
  discount: number | { toString(): string };
  total: number | { toString(): string };
  amountPaid: number | { toString(): string };
  changeAmount: number | { toString(): string };
  balanceDue?: number | { toString(): string } | null;
  referralNote?: string | null;
  patient: { fullName: string; phone?: string | null };
  cashier: { fullName: string };
  paymentType: { name: string };
  items: Array<{
    quantity: number;
    unitPrice: number | { toString(): string };
    subtotal: number | { toString(): string };
    customLabel?: string | null;
    service: { name: string };
  }>;
  payments?: Array<{
    amount: number | { toString(): string };
    createdAt: string | Date;
    paymentType: { name: string };
  }>;
};

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function normalizeText(text: string) {
  return text
    .replace(/'/g, "'")
    .replace(/`/g, "'")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\x09\x0a\x0d\x20-\x7E\u0400-\u04FF]/g, " ")
    .trim();
}

function padLine(text: string, width: number, align: "left" | "center" | "right" = "left") {
  const value = normalizeText(text);
  if (value.length >= width) return value.slice(0, width);
  const pad = width - value.length;
  if (align === "center") {
    const left = Math.floor(pad / 2);
    return `${" ".repeat(left)}${value}${" ".repeat(pad - left)}`;
  }
  if (align === "right") return `${" ".repeat(pad)}${value}`;
  return `${value}${" ".repeat(pad)}`;
}

function row(label: string, value: string, width: number) {
  const left = normalizeText(label);
  const right = normalizeText(value);
  const space = Math.max(1, width - left.length - right.length);
  return `${left}${" ".repeat(space)}${right}`.slice(0, width);
}

function separator(width: number, char = "-") {
  return char.repeat(width);
}

function wrapText(text: string, width: number) {
  const words = normalizeText(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > width ? word.slice(0, width) : word;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function feedDots(chunks: Buffer[], dots: number) {
  let remaining = Math.max(0, Math.round(dots));
  while (remaining > 0) {
    const step = Math.min(remaining, 255);
    chunks.push(Buffer.from([ESC, 0x4a, step]));
    remaining -= step;
  }
}

function getThermalQrValue(invoice: ReceiptPrintInvoice) {
  const createdAt =
    typeof invoice.createdAt === "string"
      ? invoice.createdAt
      : invoice.createdAt.toISOString();
  return `CHK${invoice.invoiceNumber};${toNumber(invoice.total)};${createdAt.slice(0, 10)}`;
}

function appendQrCode(data: string, moduleSize = 4) {
  const size = Math.min(16, Math.max(1, moduleSize));
  const payload = Buffer.from(data, "utf8");
  const storeLen = payload.length + 3;
  const pL = storeLen & 0xff;
  const pH = (storeLen >> 8) & 0xff;

  return Buffer.concat([
    Buffer.from([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]),
    Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]),
    Buffer.from([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
    payload,
    Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
  ]);
}

export async function buildReceiptEscPos(
  invoice: ReceiptPrintInvoice,
  options?: { width?: number; clinicName?: string }
) {
  const width = options?.width ?? 48;
  const clinicName = options?.clinicName || getClinicName();
  const logoRaster = await getReceiptLogoEscPos();
  const chunks: Buffer[] = [];

  const pushText = (text: string) => {
    chunks.push(Buffer.from(`${text}\n`, "utf8"));
  };

  const align = (mode: 0 | 1 | 2) => {
    chunks.push(Buffer.from([ESC, 0x61, mode]));
  };

  const bold = (on: boolean) => {
    chunks.push(Buffer.from([ESC, 0x45, on ? 1 : 0]));
  };

  chunks.push(Buffer.from([ESC, 0x40]));
  chunks.push(Buffer.from([ESC, 0x74, 0x10]));

  appendLogoToEscPos(chunks, logoRaster);

  align(1);
  bold(true);
  pushText(padLine(clinicName.toUpperCase(), width, "center"));
  bold(false);
  for (const line of wrapText(CLINIC_ADDRESS, width)) {
    pushText(padLine(line, width, "center"));
  }
  pushText(padLine("Kvitansiya / Chek", width, "center"));
  align(0);
  pushText(separator(width));

  pushText(row("Chek №", String(invoice.invoiceNumber), width));
  pushText(row("Sana", formatDate(invoice.createdAt), width));
  pushText(row("Kassir", invoice.cashier.fullName, width));
  pushText(row("Bemor", invoice.patient.fullName, width));
  if (invoice.patient.phone) pushText(row("Tel", invoice.patient.phone, width));
  if (invoice.referralNote) {
    for (const line of wrapText(`Yo'nalish: ${invoice.referralNote}`, width)) {
      pushText(line);
    }
  }

  pushText(separator(width));
  bold(true);
  pushText("Xizmatlar:");
  bold(false);

  for (const item of invoice.items) {
    for (const line of wrapText(getInvoiceItemLabel(item), width)) {
      pushText(line);
    }
    pushText(
      row(
        `${item.quantity} x ${formatMoney(toNumber(item.unitPrice))}`,
        formatMoney(toNumber(item.subtotal)),
        width
      )
    );
  }

  pushText(separator(width));
  pushText(row("Jami", formatMoney(toNumber(invoice.subtotal)), width));
  if (toNumber(invoice.discount) > 0) {
    pushText(row("Chegirma", `-${formatMoney(toNumber(invoice.discount))}`, width));
  }
  bold(true);
  pushText(row("TO'LOV", formatMoney(toNumber(invoice.total)), width));
  bold(false);
  pushText(row("To'lov turi", invoice.paymentType.name, width));
  pushText(row("Berildi", formatMoney(toNumber(invoice.amountPaid)), width));
  if (toNumber(invoice.balanceDue ?? 0) > 0) {
    bold(true);
    pushText(row("QARZ (qoldiq)", formatMoney(toNumber(invoice.balanceDue!)), width));
    bold(false);
  }
  if (toNumber(invoice.changeAmount) > 0) {
    pushText(row("Qaytim", formatMoney(toNumber(invoice.changeAmount)), width));
  }

  align(1);
  pushText("");
  pushText("Rahmat! Sog'ligingiz uchun!");
  pushText("");

  align(1);
  const qrValue = getThermalQrValue(invoice);
  chunks.push(appendQrCode(qrValue, 5));
  chunks.push(Buffer.from([ESC, 0x64, 6]));
  pushText(`Chek #${invoice.invoiceNumber}`);
  feedDots(chunks, 255);
  chunks.push(Buffer.from([GS, 0x56, 0x00]));

  return Buffer.concat(chunks);
}
