import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  listPatientsByClinic,
  type PatientRow,
} from '@/lib/db/patients';
import { withTransaction } from '@/lib/db/query';
import { logSecurityEvent } from '@/lib/server/security-log';
import { NextRequest, NextResponse } from 'next/server';

function canManageRegistry(session: Awaited<ReturnType<typeof getAdminSessionFromRequest>>) {
  if (!session) return false;
  return session.routeGroup === 'admin_only';
}

const IMPORTABLE_FIELDS = [
  'id',
  'card_number',
  'first_name',
  'last_name',
  'father_name',
  'full_name',
  'address',
  'phone',
  'disease_type',
  'jshshir',
  'gender',
  'birth_date',
  'age',
  'referred_doctor_user_id',
  'created_by_user_id',
  'created_at',
  'updated_at',
] as const;

function pickPatientFields(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of IMPORTABLE_FIELDS) {
    if (key in raw) out[key] = raw[key];
  }
  return out;
}

function normalizeItem(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  if (!id) return null;
  return pickPatientFields(o);
}

/** Bemorlar kartotekasi — bulk eksport/import (faqat admin_only) */
export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 });
  }

  try {
    const items = await listPatientsByClinic(session.clinicId);
    return NextResponse.json({ items });
  } catch (e) {
    console.error('patients-registry GET:', e);
    return NextResponse.json({ error: 'O\'qib bo\'lmadi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!canManageRegistry(session)) {
    return NextResponse.json({ error: 'Faqat klinika direktori import qila oladi' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON noto\'g\'ri' }, { status: 400 });
  }

  const list =
    body && typeof body === 'object' && !Array.isArray(body) && Array.isArray((body as { items?: unknown }).items) ?
      (body as { items: unknown[] }).items
    : Array.isArray(body) ? body
    : null;

  if (!list) {
    return NextResponse.json({ error: 'Massiv yoki { items: [] } kutilgan' }, { status: 400 });
  }

  if (list.length > 50_000) {
    return NextResponse.json({ error: 'Juda ko\'p yozuv (max 50000)' }, { status: 400 });
  }

  const clinicId = session!.clinicId;
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  try {
    await withTransaction(async (client) => {
      for (const raw of list) {
        const fields = normalizeItem(raw);
        if (!fields) {
          skipped++;
          continue;
        }
        const id = fields.id as string;
        const existing = await client.query<PatientRow>(
          `select id from public.patients where clinic_id = $1 and id = $2 limit 1`,
          [clinicId, id],
        );
        const payload = { ...fields, clinic_id: clinicId };
        if (existing.rows[0]) {
          const patch = { ...fields };
          delete patch.id;
          delete patch.clinic_id;
          patch.updated_at = new Date().toISOString();
          const keys = Object.keys(patch);
          if (keys.length === 0) {
            skipped++;
            continue;
          }
          const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
          await client.query(
            `update public.patients set ${sets} where clinic_id = $1 and id = $2`,
            [clinicId, id, ...Object.values(patch)],
          );
          updated++;
        } else {
          const keys = Object.keys(payload);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          await client.query(
            `insert into public.patients (${keys.join(', ')}) values (${placeholders})`,
            Object.values(payload),
          );
          imported++;
        }
      }
    });

    await logSecurityEvent({
      request,
      session,
      eventType: 'clinic_data_write',
      target: '/api/admin/data-modules/patients-registry',
      meta: { imported, updated, skipped, total: list.length },
    });

    return NextResponse.json({ ok: true, imported, updated, skipped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import muvaffaqiyatsiz';
    console.error('patients-registry PUT:', e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
