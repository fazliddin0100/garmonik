import type { PrimaryExamTextFieldKey } from '@/lib/patients/primary-examination';

export type ExaminationFieldTemplate = {
  id: string;
  fieldKey: PrimaryExamTextFieldKey;
  title: string;
  body: string;
  createdAt: string;
};

const STORAGE_KEY = 'garmonik-primary-exam-field-templates-v1';

function readAll(): ExaminationFieldTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeTemplate)
      .filter((x): x is ExaminationFieldTemplate => x !== null);
  } catch {
    return [];
  }
}

function writeAll(items: ExaminationFieldTemplate[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function normalizeTemplate(raw: unknown): ExaminationFieldTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  const fieldKey = typeof r.fieldKey === 'string' ? r.fieldKey.trim() : '';
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  const body = typeof r.body === 'string' ? r.body.trim() : '';
  const createdAt = typeof r.createdAt === 'string' ? r.createdAt.trim() : '';
  if (!id || !fieldKey || !body || !createdAt) return null;
  return { id, fieldKey: fieldKey as PrimaryExamTextFieldKey, title: title || 'Shablon', body, createdAt };
}

export function getExaminationFieldTemplates(
  fieldKey: PrimaryExamTextFieldKey,
): ExaminationFieldTemplate[] {
  return readAll()
    .filter((item) => item.fieldKey === fieldKey)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveExaminationFieldTemplate(input: {
  fieldKey: PrimaryExamTextFieldKey;
  title: string;
  body: string;
}): ExaminationFieldTemplate {
  const body = input.body.trim();
  if (!body) {
    throw new Error('Shablon matni bo\'sh bo\'lmasligi kerak');
  }
  const next: ExaminationFieldTemplate = {
    id: crypto.randomUUID(),
    fieldKey: input.fieldKey,
    title: input.title.trim() || body.slice(0, 48),
    body,
    createdAt: new Date().toISOString(),
  };
  writeAll([next, ...readAll()]);
  return next;
}

export function deleteExaminationFieldTemplate(id: string): void {
  writeAll(readAll().filter((item) => item.id !== id));
}

export function updateExaminationFieldTemplate(
  id: string,
  patch: { title?: string; body?: string },
): ExaminationFieldTemplate | null {
  const items = readAll();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const current = items[index];
  const next: ExaminationFieldTemplate = {
    ...current,
    title: patch.title !== undefined ? patch.title.trim() || current.title : current.title,
    body: patch.body !== undefined ? patch.body.trim() : current.body,
  };
  if (!next.body.trim()) return null;
  items[index] = next;
  writeAll(items);
  return next;
}
