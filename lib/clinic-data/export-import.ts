export const EXPORT_FORMAT = 'garmonik-module-export' as const;
export const EXPORT_VERSION = 1;

export interface ModuleExportFile<T = unknown> {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  module: string;
  exportedAt: string;
  recordCount: number | null;
  data: T;
}

export function buildExportFile<T>(
  moduleId: string,
  data: T,
): ModuleExportFile<T> {
  const recordCount =
    Array.isArray(data) ? data.length
    : data && typeof data === 'object' ? Object.keys(data as object).length
    : null;

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    module: moduleId,
    exportedAt: new Date().toISOString(),
    recordCount,
    data,
  };
}

export function downloadJsonFile(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportFilename(moduleId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `garmonik-${moduleId}-${date}.json`;
}

export function parseImportPayload(
  raw: unknown,
  expectedModule: string,
): unknown {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (obj.format === EXPORT_FORMAT && obj.module && obj.module !== expectedModule) {
      throw new Error(
        `Noto'g'ri modul: faylda "${String(obj.module)}", kutilgan "${expectedModule}"`,
      );
    }
    if ('data' in obj) return obj.data;
  }
  return raw;
}

export function describePayload(data: unknown): string {
  if (Array.isArray(data)) return `${data.length} ta yozuv`;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.invoices)) {
      const items = Array.isArray(obj.items) ? obj.items.length : 0;
      const payments = Array.isArray(obj.payments) ? obj.payments.length : 0;
      return `${obj.invoices.length} chek, ${items} qator, ${payments} to'lov`;
    }
    if (Array.isArray(obj.expenses)) {
      const payments = Array.isArray(obj.payments) ? obj.payments.length : 0;
      return `${obj.expenses.length} xarajat, ${payments} to'lov`;
    }
    const keys = Object.keys(obj).length;
    return keys > 0 ? `${keys} ta maydon` : 'bo\'sh obyekt';
  }
  return 'ma\'lumot';
}
