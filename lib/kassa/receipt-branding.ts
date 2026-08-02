import { toNumber } from "./utils";

export const CLINIC_LOGO_PATH = "/garmonik-logo-user.png";

export const CLINIC_NAME_DEFAULT = "";

export const CLINIC_ADDRESS = "";

export function getClinicName(): string {
  const name = process.env.NEXT_PUBLIC_CLINIC_NAME || CLINIC_NAME_DEFAULT;
  return name.replace(/Garmonik/gi, "Gormonik");
}

export function getReceiptQrValue(invoice: {
  invoiceNumber: number;
  total: number | { toString(): string };
  createdAt: string;
  patientName?: string;
}) {
  return JSON.stringify({
    klinika: getClinicName(),
    manzil: CLINIC_ADDRESS,
    chek: invoice.invoiceNumber,
    summa: toNumber(invoice.total),
    sana: invoice.createdAt,
    bemor: invoice.patientName || "",
  });
}
