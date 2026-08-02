import {
  adminRoleLabelToJwtRouteGroup,
  type AdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import type { StaffRole } from '@/lib/staff-portal/types';
import { NARROW_SPECIALISTS } from '@/lib/patients/specialist-consultation';
import { specialistRoleKeyFromId, isSpecialistRoleKey } from '@/lib/patients/specialist-staff';

export type KadrlarRoleGroup = 'clinical' | 'office';

export type KadrlarRoleOption = {
  key: string;
  label: string;
  group: KadrlarRoleGroup;
  accountKind: 'staff' | 'admin';
  staffRole?: StaffRole;
  roleLabel?: string;
  adminRouteGroup?: AdminJwtRouteGroup;
};

/** Kadrlar panelida «Yangi xodim» uchun rollar (super admin bundan tashqari) */
const BASE_KADRLAR_ROLE_OPTIONS: KadrlarRoleOption[] = [
  { key: 'shifokor', label: 'Shifokor', group: 'clinical', accountKind: 'staff', staffRole: 'shifokor' },
  { key: 'laboratory', label: 'Laboratoriya', group: 'clinical', accountKind: 'staff', staffRole: 'laboratory' },
  { key: 'nurse', label: 'Hamshira', group: 'clinical', accountKind: 'staff', staffRole: 'nurse' },
  { key: 'head_nurse', label: 'Bosh hamshira', group: 'clinical', accountKind: 'staff', staffRole: 'head_nurse' },
  { key: 'kabinet', label: 'Kabinet', group: 'clinical', accountKind: 'staff', staffRole: 'kabinet' },
  {
    key: 'farmatsevt',
    label: 'Farmatsevt',
    group: 'clinical',
    accountKind: 'staff',
    staffRole: 'farmatsevt',
  },
  {
    key: 'oshpaz',
    label: 'Oshpaz',
    group: 'clinical',
    accountKind: 'staff',
    staffRole: 'oshpaz',
  },
  {
    key: 'finance',
    label: 'Buxgalter / moliya',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Buxgalter / moliya',
    adminRouteGroup: 'finance',
  },
  {
    key: 'hr',
    label: 'Kadrlar bo‘limi',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Kadrlar bo‘limi',
    adminRouteGroup: 'hr',
  },
  {
    key: 'marketing',
    label: 'Marketing / PR',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Marketing / PR',
    adminRouteGroup: 'marketing',
  },
  {
    key: 'reception',
    label: 'Registrator / qabul',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Registrator / qabul',
    adminRouteGroup: 'reception',
  },
  {
    key: 'it',
    label: 'IT / texnik yordam',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'IT / texnik yordam',
    adminRouteGroup: 'it',
  },
  {
    key: 'supply',
    label: "Ta'minot va xarid",
    group: 'office',
    accountKind: 'admin',
    roleLabel: "Ta'minot va xarid",
    adminRouteGroup: 'supply',
  },
  {
    key: 'kassir',
    label: 'Kassir',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Kassir',
    adminRouteGroup: 'kassa',
  },
  {
    key: 'director',
    label: 'Klinika direktori',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Klinika direktori',
    adminRouteGroup: 'admin_only',
  },
  {
    key: 'chief_doctor',
    label: 'Bosh shifokor',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Bosh shifokor',
    adminRouteGroup: 'clinical',
  },
  {
    key: 'lab_manager',
    label: 'Laboratoriya menejeri',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Laboratoriya menejeri',
    adminRouteGroup: 'laboratory',
  },
  {
    key: 'lab_results',
    label: 'Laboratoriya (natijalar)',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Laboratoriya (natijalar)',
    adminRouteGroup: 'laboratory',
  },
  {
    key: 'lawyer',
    label: 'Yurist',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Yurist',
    adminRouteGroup: 'no_portal',
  },
  {
    key: 'facilities',
    label: "Xo‘jalik bo‘limi",
    group: 'office',
    accountKind: 'admin',
    roleLabel: "Xo‘jalik bo‘limi",
    /** Oshxona kabineti (mahulot qoldig‘i + Ta’minot buyurtmasi) */
    adminRouteGroup: 'kitchen',
  },
  {
    key: 'security',
    label: 'Xavfsizlik xizmati',
    group: 'office',
    accountKind: 'admin',
    roleLabel: 'Xavfsizlik xizmati',
    adminRouteGroup: 'no_portal',
  },
];

const SPECIALIST_KADRLAR_ROLE_OPTIONS: KadrlarRoleOption[] = NARROW_SPECIALISTS.map((item) => ({
  key: specialistRoleKeyFromId(item.id),
  label: item.label,
  group: 'clinical' as const,
  accountKind: 'staff' as const,
  staffRole: 'specialist' as StaffRole,
}));

export const KADRLAR_ROLE_OPTIONS: KadrlarRoleOption[] = [
  ...BASE_KADRLAR_ROLE_OPTIONS,
  ...SPECIALIST_KADRLAR_ROLE_OPTIONS,
];

const BY_KEY = new Map(KADRLAR_ROLE_OPTIONS.map((o) => [o.key, o]));

export const KADRLAR_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  KADRLAR_ROLE_OPTIONS.map((o) => [o.key, o.label]),
);

/** Eski yozuvlar: `doctor` → `shifokor` */
const LEGACY_ROLE_ALIASES: Record<string, string> = {
  doctor: 'shifokor',
};

export function normalizeKadrlarRoleKey(role: string): string {
  const t = role.trim();
  return LEGACY_ROLE_ALIASES[t] ?? t;
}

export function isKadrlarRoleKey(role: string): boolean {
  return BY_KEY.has(normalizeKadrlarRoleKey(role));
}

export function getKadrlarRole(role: string): KadrlarRoleOption | null {
  return BY_KEY.get(normalizeKadrlarRoleKey(role)) ?? null;
}

export function getKadrlarRoleLabel(role: string): string {
  const key = normalizeKadrlarRoleKey(role);
  return KADRLAR_ROLE_LABELS[key] ?? role;
}

/** Kadrlar orqali yaratilgan office adminlar (o‘chirish/ro‘yxat uchun) */
export const KADRLAR_MANAGED_ADMIN_ROUTE_GROUPS: readonly AdminJwtRouteGroup[] = [
  'finance',
  'hr',
  'marketing',
  'reception',
  'it',
  'supply',
  'kassa',
  'admin_only',
  'clinical',
  'laboratory',
  'nursing',
  'office',
  'kitchen',
  'pharmacy',
  'no_portal',
] as const;

export function isKadrlarManagedAdminRouteGroup(rg: string | null | undefined): boolean {
  if (!rg || rg === 'superadmin') return false;
  return (KADRLAR_MANAGED_ADMIN_ROUTE_GROUPS as readonly string[]).includes(rg);
}

function foldKadrlarRoleLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u0027\u0060\u00B4\u2018\u2019\u201B\u2032\u02B9\u02BB\u02BC]/g, '')
    .replace(/\s+/g, ' ');
}

export function kadrlarRoleKeyFromAdminProfile(input: {
  role_label?: string | null;
  admin_route_group?: string | null;
}): string {
  const label = input.role_label?.trim() || '';
  const folded = foldKadrlarRoleLabel(label);
  const rg = input.admin_route_group || '';
  if (label.includes('moliya') || rg === 'finance') return 'finance';
  if (label.includes('Kadrlar') || rg === 'hr') return 'hr';
  if (label.includes('Marketing') || rg === 'marketing') return 'marketing';
  if (label.includes('Registrator') || rg === 'reception') return 'reception';
  if (label.includes('IT') || rg === 'it') return 'it';
  if (folded.includes('taminot') || folded.includes('xarid') || rg === 'supply') {
    return 'supply';
  }
  if (folded.includes('kassir') || folded.includes('kassa') || rg === 'kassa') {
    return 'kassir';
  }
  if (label.includes('Bosh shifokor') || rg === 'clinical') return 'chief_doctor';
  if (label.includes('Laboratoriya menejeri')) return 'lab_manager';
  if (label.includes('Laboratoriya (natijalar)') || rg === 'laboratory') {
    return label.includes('natijalar') ? 'lab_results' : 'lab_manager';
  }
  if (label.includes('Yurist')) return 'lawyer';
  if (folded.includes('xojalik') || rg === 'kitchen') return 'facilities';
  if (folded.includes('xavfsizlik')) return 'security';
  if (folded.includes('farmatsevt')) return 'farmatsevt';
  if (folded.includes('oshpaz')) return 'oshpaz';
  if (label.includes('direktor') || rg === 'admin_only') return 'director';
  return 'director';
}

export function resolveKadrlarRole(roleKey: string, login: string): {
  accountKind: 'staff' | 'admin';
  staffRole: StaffRole | null;
  roleLabel: string | null;
  adminRouteGroup: AdminJwtRouteGroup | null;
} {
  const opt = getKadrlarRole(roleKey);
  if (!opt) {
    return {
      accountKind: 'staff',
      staffRole: null,
      roleLabel: null,
      adminRouteGroup: null,
    };
  }
  if (opt.accountKind === 'staff' && opt.staffRole) {
    return {
      accountKind: 'staff',
      staffRole: opt.staffRole,
      roleLabel: null,
      adminRouteGroup: null,
    };
  }
  if (isSpecialistRoleKey(roleKey)) {
    return {
      accountKind: 'staff',
      staffRole: 'specialist',
      roleLabel: null,
      adminRouteGroup: null,
    };
  }
  const roleLabel = opt.roleLabel ?? opt.label;
  const adminRouteGroup =
    opt.adminRouteGroup ?? adminRoleLabelToJwtRouteGroup(roleLabel, login);
  return {
    accountKind: 'admin',
    staffRole: null,
    roleLabel,
    adminRouteGroup,
  };
}
