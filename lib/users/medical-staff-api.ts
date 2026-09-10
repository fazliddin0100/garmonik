import type { MedicalStaffKind } from '@/lib/users/core-team-config';
import type { NurseStaffRole } from '@/lib/nurses/types';

export type MedicalStaffPayload = {
  fullName: string;
  specialty: string;
  department: string;
  contact: string;
  login: string;
  password?: string;
  position?: string;
  roleName?: string;
  staffRole?: NurseStaffRole;
  isActive?: boolean;
};

function staffUrl(kind: MedicalStaffKind): string {
  switch (kind) {
    case 'doctor':
      return '/api/doctors/staff';
    case 'nurse':
      return '/api/nurses/staff';
    case 'laboratory':
      return '/api/laboratory/staff';
    case 'reception':
      return '/api/reception/staff';
    case 'pharmacist':
      return '/api/pharmacists/staff';
  }
}

function buildBody(kind: MedicalStaffKind, payload: MedicalStaffPayload) {
  const login = payload.login.trim().toLowerCase();
  const base = {
    fullName: payload.fullName.trim(),
    login,
    password: payload.password?.trim() || undefined,
    isActive: payload.isActive !== false,
  };

  switch (kind) {
    case 'doctor':
      return {
        ...base,
        specialty: payload.specialty.trim(),
        department: payload.department.trim(),
        contact: payload.contact.trim() || undefined,
        position: payload.position?.trim() || undefined,
      };
    case 'nurse':
      return {
        ...base,
        specialty: payload.specialty.trim(),
        department: payload.department.trim(),
        contact: payload.contact.trim(),
        staffRole: payload.staffRole ?? 'nurse',
      };
    case 'laboratory':
      return {
        ...base,
        specialty: payload.specialty.trim(),
        department: payload.department.trim(),
      };
    case 'reception':
      return {
        fullName: payload.fullName.trim(),
        roleName: (payload.roleName || payload.specialty).trim(),
        login,
        password: payload.password?.trim() || undefined,
        email: payload.contact.trim() || undefined,
      };
    case 'pharmacist':
      return {
        ...base,
        specialty: payload.specialty.trim(),
        department: payload.department.trim(),
      };
  }
}

export async function createMedicalStaffAccount(
  kind: MedicalStaffKind,
  payload: MedicalStaffPayload,
): Promise<{ error?: string }> {
  const res = await fetch(staffUrl(kind), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBody(kind, payload)),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { error: data.error || 'Yaratib bo‘lmadi' };
  return {};
}

export async function updateMedicalStaffAccount(
  kind: MedicalStaffKind,
  id: string,
  payload: MedicalStaffPayload,
): Promise<{ error?: string }> {
  const res = await fetch(staffUrl(kind), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...buildBody(kind, payload) }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { error: data.error || 'Yangilab bo‘lmadi' };
  return {};
}

export async function deleteMedicalStaffAccount(
  kind: MedicalStaffKind,
  id: string,
): Promise<{ error?: string }> {
  const res = await fetch(`${staffUrl(kind)}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { error: data.error || 'O‘chirib bo‘lmadi' };
  return {};
}

export type SurgeryVariant = 'surgeon' | 'anesthesiologist' | 'or_nurse';

export function surgeryVariantConfig(variant: SurgeryVariant): {
  kind: MedicalStaffKind;
  specialty: string;
  position?: string;
  staffRole?: NurseStaffRole;
} {
  switch (variant) {
    case 'surgeon':
      return { kind: 'doctor', specialty: 'Jarroh', position: 'Jarroh' };
    case 'anesthesiologist':
      return {
        kind: 'doctor',
        specialty: 'Anesteziolog',
        position: 'Anesteziolog',
      };
    case 'or_nurse':
      return {
        kind: 'nurse',
        specialty: 'Operatsion hamshira',
        staffRole: 'nurse',
      };
  }
}
