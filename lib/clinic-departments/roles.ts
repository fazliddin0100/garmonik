import {
  adminHomePathForRouteGroup,
  type AdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import {
  getKadrlarRole,
  getKadrlarRoleLabel,
  isKadrlarRoleKey,
  KADRLAR_ROLE_OPTIONS,
  normalizeKadrlarRoleKey,
  type KadrlarRoleOption,
} from '@/lib/kadrlar/roles';
import { isSpecialistRoleKey } from '@/lib/patients/specialist-staff';
import { staffHomePath } from '@/lib/staff-portal/staff-home';
import type { DepartmentGroup } from '@/lib/clinic-departments/types';

/** Bo‘limga biriktiriladigan rollar (mutaxassis alohida oqim) */
export const DEPARTMENT_ROLE_OPTIONS: KadrlarRoleOption[] =
  KADRLAR_ROLE_OPTIONS.filter((o) => !isSpecialistRoleKey(o.key));

/** Select guruhlari — Farmatsevt alohida «Dorixona»da */
export type DepartmentRoleSectionId =
  | 'clinical'
  | 'pharmacy'
  | 'kitchen'
  | 'office';

export const DEPARTMENT_ROLE_SECTIONS: {
  id: DepartmentRoleSectionId;
  label: string;
  roleKeys: readonly string[];
}[] = [
  {
    id: 'clinical',
    label: 'Tibbiy',
    roleKeys: [
      'shifokor',
      'laboratory',
      'nurse',
      'head_nurse',
      'kabinet',
      'chief_doctor',
      'lab_manager',
      'lab_results',
    ],
  },
  {
    id: 'pharmacy',
    label: 'Dorixona',
    roleKeys: ['farmatsevt'],
  },
  {
    id: 'kitchen',
    label: 'Oshxona',
    roleKeys: ['oshpaz', 'facilities'],
  },
  {
    id: 'office',
    label: "Ma'muriy",
    roleKeys: [
      'reception',
      'kassir',
      'finance',
      'hr',
      'marketing',
      'it',
      'supply',
      'lawyer',
      'security',
      'director',
    ],
  },
];

export function departmentRolesForSection(
  sectionId: DepartmentRoleSectionId,
): KadrlarRoleOption[] {
  const section = DEPARTMENT_ROLE_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return [];
  const byKey = new Map(DEPARTMENT_ROLE_OPTIONS.map((o) => [o.key, o]));
  return section.roleKeys
    .map((key) => byKey.get(key))
    .filter((o): o is KadrlarRoleOption => Boolean(o));
}

export function isDepartmentRoleKey(roleKey: string): boolean {
  const key = normalizeKadrlarRoleKey(roleKey);
  if (!key || isSpecialistRoleKey(key)) return false;
  return isKadrlarRoleKey(key);
}

export function departmentRoleLabel(roleKey: string | null | undefined): string {
  if (!roleKey?.trim()) return 'Rol tanlanmagan';
  return getKadrlarRoleLabel(roleKey);
}

export function departmentHomePath(roleKey: string): string | null {
  const opt = getKadrlarRole(roleKey);
  if (!opt) return null;
  if (opt.accountKind === 'staff' && opt.staffRole) {
    return staffHomePath(opt.staffRole);
  }
  const rg = (opt.adminRouteGroup ?? 'admin_only') as AdminJwtRouteGroup;
  return adminHomePathForRouteGroup(rg);
}

/** Eski JSON yozuvlarini to‘ldirish */
export function normalizeDepartmentGroup(
  raw: unknown,
): DepartmentGroup | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id.trim()) return null;
  if (typeof row.title !== 'string') return null;

  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  const items = itemsRaw
    .map((it) => {
      if (!it || typeof it !== 'object') return null;
      const item = it as Record<string, unknown>;
      if (typeof item.id !== 'string' || typeof item.title !== 'string') {
        return null;
      }
      return {
        id: item.id,
        title: item.title,
        note: typeof item.note === 'string' ? item.note : '',
      };
    })
    .filter((it): it is DepartmentGroup['items'][number] => it !== null);

  const roleKey =
    typeof row.roleKey === 'string' ? normalizeKadrlarRoleKey(row.roleKey) : '';

  return {
    id: row.id.trim(),
    title: row.title.trim(),
    description:
      typeof row.description === 'string' ? row.description.trim() : '',
    roleKey: isDepartmentRoleKey(roleKey) ? roleKey : '',
    items,
  };
}

export function normalizeDepartmentGroups(raw: unknown): DepartmentGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeDepartmentGroup)
    .filter((g): g is DepartmentGroup => g !== null);
}

export function findDepartmentById(
  groups: DepartmentGroup[],
  id: string | null | undefined,
): DepartmentGroup | null {
  if (!id?.trim()) return null;
  return groups.find((g) => g.id === id.trim()) ?? null;
}

/** department maydoni: dep-grp-… yoki eski matn */
export function resolveDepartmentDisplay(
  groups: DepartmentGroup[],
  department: string | null | undefined,
): { title: string; roleLabel: string | null; group: DepartmentGroup | null } {
  const raw = typeof department === 'string' ? department.trim() : '';
  if (!raw) {
    return { title: '', roleLabel: null, group: null };
  }
  const group = findDepartmentById(groups, raw);
  if (group) {
    return {
      title: group.title,
      roleLabel: group.roleKey ? departmentRoleLabel(group.roleKey) : null,
      group,
    };
  }
  return { title: raw, roleLabel: null, group: null };
}

export function roleMatchesDepartment(
  roleKey: string,
  department: DepartmentGroup | null,
): boolean {
  if (!department) return true;
  if (!department.roleKey) return false;
  return (
    normalizeKadrlarRoleKey(roleKey) ===
    normalizeKadrlarRoleKey(department.roleKey)
  );
}

/** director / to‘liq admin uchun bo‘lim ixtiyoriy */
export function departmentRequiredForRole(roleKey: string): boolean {
  const opt = getKadrlarRole(roleKey);
  if (!opt) return true;
  if (isSpecialistRoleKey(roleKey)) return false;
  if (opt.key === 'director' || opt.adminRouteGroup === 'admin_only') {
    return false;
  }
  return true;
}
