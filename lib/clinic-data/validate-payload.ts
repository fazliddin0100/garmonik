import type { ClinicResourceKey } from './keys';
import type { ServiceGroupKey } from '@/lib/services/pricing-data';

const SERVICE_PRICE_GROUPS: ReadonlySet<ServiceGroupKey> = new Set([
  'fizioterapiya',
  'kardiologiya',
  'laboratoriya',
  'pullik-xizmat',
  'shifokor-korigi',
  'uzi',
  'boshqa',
]);

const MAX_ARRAY_LEN = 50_000;
const MAX_JSON_BYTES = 4 * 1024 * 1024;

function byteSize(data: unknown): number {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    return JSON.stringify(data).length * 2;
  }
}

function assertArray(data: unknown, key: ClinicResourceKey): unknown[] {
  if (!Array.isArray(data)) {
    throw new Error(`${key}: massiv kutilgan`);
  }
  if (data.length > MAX_ARRAY_LEN) {
    throw new Error(`${key}: juda ko‘p element`);
  }
  return data;
}

function assertObject(data: unknown, key: ClinicResourceKey): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${key}: obyekt kutilgan`);
  }
  return data as Record<string, unknown>;
}

/** OWASP: serverda allowlist va hajm cheklovi */
export function validateClinicResourcePayload(
  key: ClinicResourceKey,
  data: unknown,
): void {
  const size = byteSize(data);
  if (size > MAX_JSON_BYTES) {
    throw new Error('Ma’lumot hajmi ruxsat etilganidan oshib ketdi');
  }

  switch (key) {
    case 'patients': {
      const arr = assertArray(data, key);
      for (const row of arr) {
        const o = assertObject(row, key);
        if (typeof o.id !== 'string' || !o.id.trim()) {
          throw new Error('patients: har bir qatorda id kerak');
        }
      }
      break;
    }
    case 'clinic-settings':
      assertObject(data, key);
      break;
    case 'lab-catalog': {
      const arr = assertArray(data, key);
      for (const cat of arr) {
        const o = assertObject(cat, key);
        if (typeof o.id !== 'string' || typeof o.title !== 'string') {
          throw new Error('lab-catalog: noto‘g‘ri turkum');
        }
        if (!Array.isArray(o.items)) throw new Error('lab-catalog: items massiv bo‘lishi kerak');
      }
      break;
    }
    case 'queue': {
      const arr = assertArray(data, key);
      for (const row of arr) {
        const o = assertObject(row, key);
        if (typeof o.id !== 'string' || !o.id.trim()) {
          throw new Error('queue: har bir qatorda id kerak');
        }
        if (typeof o.patientId !== 'string' || !o.patientId.trim()) {
          throw new Error('queue: patientId kerak');
        }
      }
      break;
    }
    case 'admins': {
      const arr = assertArray(data, key);
      for (const row of arr) {
        const o = assertObject(row, key);
        if (typeof o.id !== 'string' || !o.id.trim()) {
          throw new Error('admins: har bir qatorda id kerak');
        }
        if (typeof o.firstName !== 'string' || !o.firstName.trim()) {
          throw new Error('admins: ism kerak');
        }
        if (typeof o.lastName !== 'string' || !o.lastName.trim()) {
          throw new Error('admins: familiya kerak');
        }
        if (typeof o.fatherName !== 'string' || !o.fatherName.trim()) {
          throw new Error('admins: otasining ismi kerak');
        }
        if (typeof o.age !== 'number' || !Number.isFinite(o.age) || o.age < 1 || o.age > 120) {
          throw new Error('admins: yosh 1–120 orasida son bo‘lishi kerak');
        }
        if (typeof o.username !== 'string' || !o.username.trim()) {
          throw new Error('admins: login (username) kerak');
        }
        if (typeof o.roleName !== 'string' || !o.roleName.trim() || o.roleName.length > 200) {
          throw new Error('admins: rol kerak (200 belgigacha)');
        }
        if (typeof o.phone !== 'string' || !/^\+998\d{9}$/.test(o.phone.trim())) {
          throw new Error("admins: telefon +998XXXXXXXXX formatida bo'lishi kerak");
        }
        if (typeof o.password !== 'string') {
          throw new Error('admins: password maydoni kerak');
        }
        if (typeof o.securityPin !== 'string' || !o.securityPin.trim()) {
          throw new Error('admins: securityPin kerak');
        }
      }
      break;
    }
    case 'service-prices': {
      const arr = assertArray(data, key);
      for (const row of arr) {
        const o = assertObject(row, key);
        if (typeof o.id !== 'string' || !o.id.trim()) {
          throw new Error('service-prices: har bir qatorda id kerak');
        }
        if (typeof o.code !== 'string' || !o.code.trim()) {
          throw new Error('service-prices: har bir qatorda code kerak');
        }
        if (typeof o.group !== 'string' || !SERVICE_PRICE_GROUPS.has(o.group as ServiceGroupKey)) {
          throw new Error('service-prices: noto‘g‘ri group');
        }
        if (typeof o.groupLabel !== 'string' || !o.groupLabel.trim()) {
          throw new Error('service-prices: groupLabel kerak');
        }
        if (typeof o.name !== 'string' || !o.name.trim()) {
          throw new Error('service-prices: name kerak');
        }
        if (typeof o.price !== 'number' || !Number.isFinite(o.price)) {
          throw new Error('service-prices: price son bo‘lishi kerak');
        }
      }
      break;
    }
    case 'kadrlar-employee-profiles': {
      const arr = assertArray(data, key);
      for (const row of arr) {
        const o = assertObject(row, key);
        if (typeof o.employeeId !== 'string' || !o.employeeId.trim()) {
          throw new Error('kadrlar-employee-profiles: employeeId kerak');
        }
        if (typeof o.staffKind !== 'string' || !o.staffKind.trim()) {
          throw new Error('kadrlar-employee-profiles: staffKind kerak');
        }
        if (typeof o.firstName !== 'string') {
          throw new Error('kadrlar-employee-profiles: firstName kerak');
        }
        if (typeof o.lastName !== 'string') {
          throw new Error('kadrlar-employee-profiles: lastName kerak');
        }
        if (
          o.birthYear !== null &&
          o.birthYear !== undefined &&
          (typeof o.birthYear !== 'number' ||
            !Number.isFinite(o.birthYear) ||
            o.birthYear < 1900 ||
            o.birthYear > 2100)
        ) {
          throw new Error('kadrlar-employee-profiles: birthYear noto‘g‘ri');
        }
        if (o.birthDate !== undefined && typeof o.birthDate !== 'string') {
          throw new Error('kadrlar-employee-profiles: birthDate matn bo‘lishi kerak');
        }
        if (typeof o.activityDirection !== 'string') {
          throw new Error('kadrlar-employee-profiles: activityDirection kerak');
        }
        if (o.address !== undefined && typeof o.address !== 'string') {
          throw new Error('kadrlar-employee-profiles: address matn bo‘lishi kerak');
        }
        if (typeof o.objektivkaPath !== 'string') {
          throw new Error('kadrlar-employee-profiles: objektivkaPath kerak');
        }
        if (typeof o.objektivkaFileName !== 'string') {
          throw new Error('kadrlar-employee-profiles: objektivkaFileName kerak');
        }
      }
      break;
    }
    default: {
      assertArray(data, key);
      for (const row of data as unknown[]) {
        assertObject(row, key);
        const o = row as Record<string, unknown>;
        if (typeof o.id !== 'string' || !o.id.trim()) {
          throw new Error(`${key}: har bir qatorda id kerak`);
        }
      }
    }
  }
}
