import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | string | { toString(): string }) {
  const n = typeof amount === "number" ? amount : parseFloat(amount.toString());
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatServicePrice(amount: number | string | { toString(): string }) {
  const n = typeof amount === "number" ? amount : parseFloat(amount.toString());
  if (!n || n <= 0) return "---";
  return formatMoney(n);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function toNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : parseFloat(value.toString());
}

/** API javobini xavfsiz o'qish (HTML/xato sahifa bo'lsa JSON.parse yiqilmaydi) */
export async function parseApiJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(`Server xatosi (${res.status})`);
    }
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      !res.ok
        ? `Server xatosi (${res.status}). Dev serverni qayta ishga tushiring.`
        : "Server javobi noto'g'ri formatda"
    );
  }
}
