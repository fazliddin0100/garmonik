import { formatMoney } from '@/lib/kassa/utils';

/** Recharts Tooltip formatter — ValueType undefined bo'lishi mumkin. */
export function chartMoneyFormatter(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return formatMoney(Number.isFinite(n) ? n : 0);
}
