import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import type { ClinicPortalSession } from '@/lib/auth/session-guards';
import {
  deletePatient,
  insertPatient,
  isMissingColumnError,
  listPatientCardNumbers,
  listPatientsByClinic,
  updatePatient,
} from '@/lib/db/patients';
import { findActiveDoctorInClinic } from '@/lib/db/portal-profiles';
import { ensureKassaPatientForGarmonik } from '@/lib/kassa/patient-bridge';
import {
  JSHSHIR_VALIDATION_MESSAGE,
  normalizeJshshir,
} from '@/lib/patients/jshshir';
import { birthIsoFromAge } from '@/lib/patients/birth-display';
import { NextRequest, NextResponse } from 'next/server';

type Session = Awaited<ReturnType<typeof getVerifiedSessionFromRequest>>;

function canViewPatients(session: Session): session is ClinicPortalSession {
  if (!session || session.kind === 'kassa') return false;
  return true;
}

function canManagePatients(session: Session): session is ClinicPortalSession {
  if (!session || session.kind === 'kassa') return false;
  if (session.kind === 'staff') return session.role === 'kabinet';
  return session.routeGroup === 'office' || session.routeGroup === 'superadmin';
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeNamePart(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function computeFullName(first: string, last: string, father: string): string {
  return [last, first, father].filter(Boolean).join(' ').trim();
}

function nextCardNumber(existing: string[]): string {
  const prefix = `KB-${new Date().getFullYear()}-`;
  const max = existing.reduce((acc, cur) => {
    if (!cur.startsWith(prefix)) return acc;
    const n = Number.parseInt(cur.slice(prefix.length), 10);
    if (!Number.isFinite(n)) return acc;
    return Math.max(acc, n);
  }, 0);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!canViewPatients(session)) {
    return NextResponse.json({ error: 'Ruxsat yoq' }, { status: 403 });
  }

  try {
    const data = await listPatientsByClinic(session.clinicId);
    return NextResponse.json({ items: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'O‘qib bo‘lmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!canManagePatients(session)) {
    return NextResponse.json({ error: 'Ruxsat yoq' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const firstName = normalizeNamePart(body.firstName);
  const lastName = normalizeNamePart(body.lastName);
  const fatherName = normalizeNamePart(body.fatherName);
  const address = normalizeNamePart(body.address);
  const phone = normalizeNamePart(body.phone);
  const diseaseType = normalizeNamePart(body.diseaseType);
  const jshshir = normalizeJshshir(body.jshshir);
  const gender = normalizeNamePart(body.gender);
  const birthDate =
    typeof body.birthDate === 'string' && body.birthDate.trim() ? body.birthDate.trim() : null;
  const ageRaw = typeof body.age === 'number' ? body.age : Number.parseInt(String(body.age ?? ''), 10);
  const age = Number.isFinite(ageRaw) && ageRaw > 0 ? Math.floor(ageRaw) : null;
  const resolvedBirthDate =
    birthDate ?? (age != null ? birthIsoFromAge(age) : null);
  const referredDoctorUserId =
    typeof body.referredDoctorUserId === 'string' && body.referredDoctorUserId.trim()
      ? body.referredDoctorUserId.trim()
      : null;

  if (!firstName || !lastName || !phone) {
    return NextResponse.json(
      { error: 'Ism, familiya va telefon majburiy' },
      { status: 400 },
    );
  }
  if (
    typeof body.jshshir === 'string' &&
    body.jshshir.trim() &&
    !jshshir
  ) {
    return NextResponse.json({ error: JSHSHIR_VALIDATION_MESSAGE }, { status: 400 });
  }

  if (referredDoctorUserId) {
    const doctorRow = await findActiveDoctorInClinic(
      session.clinicId,
      referredDoctorUserId,
    );
    if (!doctorRow) {
      return NextResponse.json({ error: 'Shifokor topilmadi' }, { status: 400 });
    }
  }

  const cardRows = await listPatientCardNumbers(session.clinicId);
  const cardNumber = nextCardNumber(cardRows);

  const payload = {
    clinic_id: session.clinicId,
    card_number: cardNumber,
    first_name: firstName,
    last_name: lastName,
    father_name: fatherName,
    full_name: computeFullName(firstName, lastName, fatherName),
    address,
    phone,
    jshshir: jshshir ?? '',
    disease_type: diseaseType,
    gender: gender || null,
    birth_date: resolvedBirthDate,
    age,
    referred_doctor_user_id: referredDoctorUserId,
    created_by_user_id: session.id,
    updated_at: nowIso(),
  };

  try {
    let data = await insertPatient(payload);
    try {
      await ensureKassaPatientForGarmonik({
        id: String(data.id),
        full_name: String(data.full_name),
        phone: String(data.phone ?? ''),
        birth_date: data.birth_date ? String(data.birth_date) : null,
      });
    } catch (syncError) {
      console.error('kassa patient sync failed:', syncError);
    }
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    if (
      isMissingColumnError(error, 'referred_doctor_user_id') ||
      isMissingColumnError(error, 'jshshir')
    ) {
      const {
        referred_doctor_user_id: _ignoredReferredDoctor,
        jshshir: _ignoredJshshir,
        ...fallback
      } = payload;
      try {
        const data = await insertPatient(fallback);
        const item = { ...data } as Record<string, unknown>;
        if (referredDoctorUserId) item.referred_doctor_user_id = referredDoctorUserId;
        if (jshshir) item.jshshir = jshshir;
        try {
          await ensureKassaPatientForGarmonik({
            id: String(data.id),
            full_name: String(data.full_name),
            phone: String(data.phone ?? ''),
            birth_date: data.birth_date ? String(data.birth_date) : null,
          });
        } catch (syncError) {
          console.error('kassa patient sync failed:', syncError);
        }
        return NextResponse.json({ item }, { status: 201 });
      } catch (fallbackError) {
        const message =
          fallbackError instanceof Error ? fallbackError.message : 'Saqlanmadi';
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
    const message = error instanceof Error ? error.message : 'Saqlanmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!canManagePatients(session)) {
    return NextResponse.json({ error: 'Ruxsat yoq' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'ID topilmadi' }, { status: 400 });
  }

  const firstName = normalizeNamePart(body.firstName);
  const lastName = normalizeNamePart(body.lastName);
  const fatherName = normalizeNamePart(body.fatherName);
  const address = normalizeNamePart(body.address);
  const phone = normalizeNamePart(body.phone);
  const diseaseType = normalizeNamePart(body.diseaseType);
  const jshshir = normalizeJshshir(body.jshshir);
  const gender = normalizeNamePart(body.gender);
  const birthDate =
    typeof body.birthDate === 'string' && body.birthDate.trim() ? body.birthDate.trim() : null;
  const ageRaw = typeof body.age === 'number' ? body.age : Number.parseInt(String(body.age ?? ''), 10);
  const age = Number.isFinite(ageRaw) && ageRaw > 0 ? Math.floor(ageRaw) : null;
  const resolvedBirthDate =
    birthDate ?? (age != null ? birthIsoFromAge(age) : null);
  const referredDoctorUserId =
    typeof body.referredDoctorUserId === 'string' && body.referredDoctorUserId.trim()
      ? body.referredDoctorUserId.trim()
      : null;

  if (!firstName || !lastName || !phone) {
    return NextResponse.json(
      { error: 'Ism, familiya va telefon majburiy' },
      { status: 400 },
    );
  }
  if (
    typeof body.jshshir === 'string' &&
    body.jshshir.trim() &&
    !jshshir
  ) {
    return NextResponse.json({ error: JSHSHIR_VALIDATION_MESSAGE }, { status: 400 });
  }

  if (referredDoctorUserId) {
    const doctorRow = await findActiveDoctorInClinic(
      session.clinicId,
      referredDoctorUserId,
    );
    if (!doctorRow) {
      return NextResponse.json({ error: 'Shifokor topilmadi' }, { status: 400 });
    }
  }

  const patch = {
    first_name: firstName,
    last_name: lastName,
    father_name: fatherName,
    full_name: computeFullName(firstName, lastName, fatherName),
    address,
    phone,
    jshshir: jshshir ?? '',
    disease_type: diseaseType,
    gender: gender || null,
    birth_date: resolvedBirthDate,
    age,
    referred_doctor_user_id: referredDoctorUserId,
    updated_at: nowIso(),
  };

  try {
    const data = await updatePatient(session.clinicId, id, patch);
    try {
      await ensureKassaPatientForGarmonik({
        id: String(data.id),
        full_name: String(data.full_name),
        phone: String(data.phone ?? ''),
        birth_date: data.birth_date ? String(data.birth_date) : null,
      });
    } catch (syncError) {
      console.error('kassa patient sync failed:', syncError);
    }
    return NextResponse.json({ item: data });
  } catch (error) {
    if (
      isMissingColumnError(error, 'referred_doctor_user_id') ||
      isMissingColumnError(error, 'jshshir')
    ) {
      const {
        referred_doctor_user_id: _ignoredReferredDoctor,
        jshshir: _ignoredJshshir,
        ...fallback
      } = patch;
      try {
        const data = await updatePatient(session.clinicId, id, fallback);
        const item = { ...data } as Record<string, unknown>;
        if (referredDoctorUserId) item.referred_doctor_user_id = referredDoctorUserId;
        if (jshshir) item.jshshir = jshshir;
        return NextResponse.json({ item });
      } catch (fallbackError) {
        const message =
          fallbackError instanceof Error ? fallbackError.message : 'Yangilanmadi';
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
    const message = error instanceof Error ? error.message : 'Yangilanmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!canManagePatients(session)) {
    return NextResponse.json({ error: 'Ruxsat yoq' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'ID topilmadi' }, { status: 400 });
  }

  try {
    await deletePatient(session.clinicId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'O‘chirib bo‘lmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
