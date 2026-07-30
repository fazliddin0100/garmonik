import {
  getKadrlarRoleLabel,
  isKadrlarManagedAdminRouteGroup,
  isKadrlarRoleKey,
  kadrlarRoleKeyFromAdminProfile,
  normalizeKadrlarRoleKey,
  resolveKadrlarRole,
} from '@/lib/kadrlar/roles';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import {
  createPortalAuthUser,
  deletePortalAuthUser,
} from '@/lib/auth/portal-session';
import {
  insertPortalProfile,
  listKadrlarAdminProfileRows,
  listKadrlarManagedProfileUserIds,
  listStaffProfileRows,
  type PortalProfileRow,
} from '@/lib/db/portal-profiles';
import { staffAuthEmail } from '@/lib/staff-portal/auth-email';
import {
  encodeSpecialistDepartment,
  narrowSpecialistIdFromRoleKey,
  parseNarrowSpecialistIdFromDepartment,
  specialistRoleKeyFromId,
} from '@/lib/patients/specialist-staff';
import { ensureStaffPortalSeed } from '@/lib/staff-portal/db-staff';
import type { StaffAccount } from '@/lib/staff-portal/types';

/** Demo parollar — `initial-data` dagi bcrypt bilan mos */
const DEMO_STAFF_PASSWORDS: Record<string, string> = {
  doctor: 'doctor123',
  laborant: 'lab123',
  hamshira: 'hamshira123',
  boshhamshira: 'hamshira123',
  kabinet: 'kabinet123',
};

export type KadrlarEmployeeInput = StaffAccount & {
  /** Yangi yoki yangilangan parol */
  plainPassword?: string;
};

function rowToAccount(r: PortalProfileRow): StaffAccount {
  let role =
    r.account_kind === 'staff' ?
      normalizeKadrlarRoleKey(r.staff_role || 'shifokor')
    : kadrlarRoleKeyFromAdminProfile({
        role_label: r.role_label,
        admin_route_group: r.admin_route_group,
      });

  if (r.account_kind === 'staff' && r.staff_role === 'specialist') {
    const specialistId = parseNarrowSpecialistIdFromDepartment(r.department);
    if (specialistId) {
      role = specialistRoleKeyFromId(specialistId);
    }
  }

  return {
    id: r.legacy_external_id || r.user_id,
    login: (r.staff_login || r.auth_email).toLowerCase(),
    passwordHash: '',
    fullName: r.display_name,
    role,
    department: r.department ?? '',
    isActive: r.is_active,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

function plainPasswordForAccount(a: KadrlarEmployeeInput): string {
  const plain = a.plainPassword?.trim();
  if (plain && plain.length >= 6) return plain;
  return DEMO_STAFF_PASSWORDS[a.login.trim().toLowerCase()] ?? 'changeme123';
}

async function deleteKadrlarManagedProfiles() {
  const profiles = await listKadrlarManagedProfileUserIds();

  for (const r of profiles) {
    if (r.account_kind === 'staff') {
      await deletePortalAuthUser(r.user_id);
      continue;
    }
    if (r.account_kind !== 'admin') continue;
    if (!r.legacy_external_id) continue;
    if (!isKadrlarManagedAdminRouteGroup(r.admin_route_group)) continue;
    await deletePortalAuthUser(r.user_id);
  }
}

export async function listKadrlarEmployees(): Promise<StaffAccount[]> {
  await ensureStaffPortalSeed();

  const staffRows = await listStaffProfileRows();
  const adminRows = await listKadrlarAdminProfileRows();

  const admins = adminRows.filter((r) =>
    isKadrlarManagedAdminRouteGroup(r.admin_route_group),
  );

  const merged = [...staffRows, ...admins].map((r) => rowToAccount(r));
  return merged.sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));
}

export async function replaceKadrlarEmployees(
  accounts: KadrlarEmployeeInput[],
): Promise<void> {
  await deleteKadrlarManagedProfiles();

  const clinicId = await getDefaultClinicId();

  for (const a of accounts) {
    const roleKey = normalizeKadrlarRoleKey(a.role);
    if (!isKadrlarRoleKey(roleKey)) continue;

    const login = a.login.trim().toLowerCase();
    const resolved = resolveKadrlarRole(roleKey, login);
    const specialistId = narrowSpecialistIdFromRoleKey(roleKey);
    const department =
      specialistId ?
        encodeSpecialistDepartment(specialistId)
      : (a.department ?? '');
    const email = staffAuthEmail(login);
    const password = plainPasswordForAccount(a);

    try {
      const created = await createPortalAuthUser({ email, password });

      if (resolved.accountKind === 'staff' && resolved.staffRole) {
        await insertPortalProfile({
          user_id: created.id,
          clinic_id: clinicId,
          account_kind: 'staff',
          auth_email: email,
          admin_route_group: null,
          staff_role: resolved.staffRole,
          display_name: a.fullName,
          role_label: getKadrlarRoleLabel(roleKey),
          staff_login: login,
          legacy_external_id: a.id,
          department,
          is_active: a.isActive,
        });
        continue;
      }

      await insertPortalProfile({
        user_id: created.id,
        clinic_id: clinicId,
        account_kind: 'admin',
        auth_email: email,
        admin_route_group: resolved.adminRouteGroup,
        staff_role: null,
        display_name: a.fullName,
        role_label: resolved.roleLabel,
        staff_login: login,
        legacy_external_id: a.id,
        department: a.department ?? '',
        is_active: a.isActive,
      });
    } catch (error) {
      console.error('kadrlar user', login, error);
    }
  }
}

/** Eski API nomlari */
export const listStaffPortalAccounts = listKadrlarEmployees;
export const replaceStaffPortalAccounts = replaceKadrlarEmployees;
