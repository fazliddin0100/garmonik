import {
  adminHomePathForRouteGroup,
  type AdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import type { VerifiedSession } from '@/lib/auth/session-jwt';
import { STAFF_ROLE_LABELS, type StaffRole } from '@/lib/staff-portal/types';
import type { AssistantCapability } from '@/lib/assistant/capabilities';
import type { QueryIntent } from '@/lib/assistant/query-intents';
import { INTENT_REQUIRED } from '@/lib/assistant/query-intents';

export type { AssistantCapability } from '@/lib/assistant/capabilities';
export type { QueryIntent } from '@/lib/assistant/query-intents';

export type AssistantUserContext = {
  sessionKind: VerifiedSession['kind'];
  userId: string;
  clinicId: string;
  login: string;
  displayName: string;
  roleKey: string;
  roleLabelUz: string;
  routeGroup?: AdminJwtRouteGroup;
  staffRole?: string;
  kassaRole?: 'ADMIN' | 'CASHIER';
  capabilities: Set<AssistantCapability>;
  permissionLines: string[];
  homePath: string;
};

export const PERMISSION_DENIED_MESSAGE =
  "Bunday vazifalar sizga tegishli emas. O'zingiz qilgan ishlardan savol bering.";

const CAP_LABELS: Record<AssistantCapability, string> = {
  clinic_overview: 'Klinika umumiy ko\'rinishi',
  patients_all: 'Barcha bemorlar kartotekasi',
  patients_own: 'O\'z bemorlaringiz',
  inpatients: 'Statsionar (palata) ma\'lumotlari',
  queue_all: 'Butun navbat',
  queue_scope: 'Sizga tegishli navbat',
  kassa_clinic_today: 'Bugungi kassa tushumi (butun klinika)',
  kassa_own_today: 'Bugungi o\'z cheklaringiz / to\'lovlaringiz',
  appointments_all: 'Navbat va onlayn arizalar',
  staff_directory: 'Xodimlar va katalog',
  settings_admin: 'Sozlamalar va export/import',
  own_activity: 'O\'z harakatlar tarixingiz',
  permissions_view: 'Huquqlar ro\'yxati',
};

function caps(...items: AssistantCapability[]): Set<AssistantCapability> {
  return new Set(items);
}

const ALL_ASSISTANT_CAPABILITIES: AssistantCapability[] = [
  'clinic_overview',
  'patients_all',
  'patients_own',
  'inpatients',
  'queue_all',
  'queue_scope',
  'kassa_clinic_today',
  'kassa_own_today',
  'appointments_all',
  'staff_directory',
  'settings_admin',
  'own_activity',
  'permissions_view',
];

function allCaps(): Set<AssistantCapability> {
  return caps(...ALL_ASSISTANT_CAPABILITIES);
}

function adminCaps(rg: AdminJwtRouteGroup): Set<AssistantCapability> {
  if (rg === 'admin_only') {
    return allCaps();
  }
  if (rg === 'superadmin') {
    return caps(
      'clinic_overview',
      'permissions_view',
      'own_activity',
      'settings_admin',
      'staff_directory',
    );
  }
  if (rg === 'finance') {
    return caps(
      'kassa_clinic_today',
      'kassa_own_today',
      'appointments_all',
      'staff_directory',
      'own_activity',
      'permissions_view',
      'clinic_overview',
    );
  }
  if (rg === 'reception' || rg === 'office') {
    return caps(
      'patients_all',
      'queue_all',
      'appointments_all',
      'own_activity',
      'permissions_view',
      'patients_own',
    );
  }
  if (rg === 'hr') {
    return caps('staff_directory', 'own_activity', 'permissions_view');
  }
  if (rg === 'it') {
    return caps('settings_admin', 'permissions_view', 'own_activity');
  }
  if (rg === 'clinical' || rg === 'specialist') {
    return caps('queue_scope', 'patients_own', 'own_activity', 'permissions_view');
  }
  if (rg === 'laboratory') {
    return caps('queue_scope', 'patients_own', 'own_activity', 'permissions_view');
  }
  if (rg === 'nursing' || rg === 'head_nursing') {
    return caps(
      'inpatients',
      'queue_all',
      'queue_scope',
      'patients_own',
      'own_activity',
      'permissions_view',
    );
  }
  if (rg === 'kassa') {
    return caps('kassa_own_today', 'own_activity', 'permissions_view');
  }
  if (rg === 'pharmacy' || rg === 'kitchen' || rg === 'supply') {
    return caps('own_activity', 'permissions_view', 'queue_scope');
  }
  return caps('own_activity', 'permissions_view');
}

function staffCaps(role: string): Set<AssistantCapability> {
  const r = role as StaffRole;
  if (r === 'kabinet') {
    return caps(
      'patients_all',
      'queue_all',
      'appointments_all',
      'own_activity',
      'permissions_view',
    );
  }
  if (r === 'head_nurse') {
    return caps(
      'inpatients',
      'queue_all',
      'patients_own',
      'own_activity',
      'permissions_view',
    );
  }
  if (r === 'shifokor' || r === 'doctor' || r === 'specialist') {
    return caps('queue_scope', 'patients_own', 'own_activity', 'permissions_view');
  }
  if (r === 'laboratory') {
    return caps('queue_scope', 'patients_own', 'own_activity', 'permissions_view');
  }
  if (r === 'nurse') {
    return caps('queue_scope', 'patients_own', 'own_activity', 'permissions_view');
  }
  if (r === 'farmatsevt' || r === 'oshpaz') {
    return caps('own_activity', 'permissions_view', 'queue_scope');
  }
  return caps('own_activity', 'permissions_view');
}

function kassaCaps(role: 'ADMIN' | 'CASHIER'): Set<AssistantCapability> {
  if (role === 'ADMIN') {
    return caps(
      'kassa_clinic_today',
      'kassa_own_today',
      'own_activity',
      'permissions_view',
      'staff_directory',
    );
  }
  return caps('kassa_own_today', 'own_activity', 'permissions_view');
}

function roleLabelForSession(session: VerifiedSession): string {
  if (session.kind === 'admin') {
    return session.roleLabel?.trim() || session.routeGroup;
  }
  if (session.kind === 'staff') {
    return STAFF_ROLE_LABELS[session.role as StaffRole] ?? session.role;
  }
  return session.role === 'ADMIN' ? 'Kassa administratori' : 'Kassir';
}

export function buildAssistantUserContext(
  session: VerifiedSession,
  clinicId: string,
): AssistantUserContext {
  let capabilities: Set<AssistantCapability>;
  let homePath = '/dashboard';
  let roleKey = 'user';

  if (session.kind === 'admin') {
    capabilities = adminCaps(session.routeGroup);
    homePath = adminHomePathForRouteGroup(session.routeGroup);
    roleKey = session.routeGroup;
  } else if (session.kind === 'staff') {
    capabilities = staffCaps(session.role);
    roleKey = session.role;
    homePath =
      session.role === 'kabinet' ? '/kabinet'
      : session.role === 'laboratory' ? '/labaratoriya'
      : session.role === 'head_nurse' ? '/bosh-hamshira'
      : session.role === 'farmatsevt' ? '/farmatsevt'
      : session.role === 'oshpaz' ? '/oshxona'
      : session.role === 'specialist' ? '/mutaxassis'
      : '/doctor';
  } else {
    capabilities = kassaCaps(session.role);
    roleKey = session.role;
    homePath = session.role === 'ADMIN' ? '/kassa-admin' : '/kassa';
  }

  const permissionLines = [...capabilities].map((c) => CAP_LABELS[c]);

  return {
    sessionKind: session.kind,
    userId: session.id,
    clinicId,
    login: session.login,
    displayName:
      session.kind === 'staff' ? session.fullName
      : session.kind === 'kassa' ? session.fullName
      : session.displayName,
    roleKey,
    roleLabelUz: roleLabelForSession(session),
    routeGroup: session.kind === 'admin' ? session.routeGroup : undefined,
    staffRole: session.kind === 'staff' ? session.role : undefined,
    kassaRole: session.kind === 'kassa' ? session.role : undefined,
    capabilities,
    permissionLines,
    homePath,
  };
}

export function isAssistantFullAccess(ctx: AssistantUserContext): boolean {
  return ctx.sessionKind === 'admin' && ctx.routeGroup === 'admin_only';
}

export function hasCapability(
  ctx: AssistantUserContext,
  cap: AssistantCapability,
): boolean {
  if (isAssistantFullAccess(ctx)) return true;
  return ctx.capabilities.has(cap);
}

export function canAccessDataIntent(
  ctx: AssistantUserContext,
  intent: QueryIntent,
): boolean {
  if (isAssistantFullAccess(ctx)) return true;
  const required = INTENT_REQUIRED[intent];
  return required.some((cap) => ctx.capabilities.has(cap));
}

export function deniedDataReply(ctx: AssistantUserContext): {
  message: string;
  suggestions: string[];
} {
  const allowed = [
    hasCapability(ctx, 'own_activity') ? 'Bugun men nima qildim?' : null,
    hasCapability(ctx, 'kassa_own_today') ? 'Bugun nechta chek qildim?' : null,
    hasCapability(ctx, 'permissions_view') ? 'Mening huquqlarim nima?' : null,
    hasCapability(ctx, 'queue_scope') ? 'Mening navbatimda nechta bemor bor?' : null,
  ].filter(Boolean) as string[];

  return {
    message: [
      PERMISSION_DENIED_MESSAGE,
      '',
      'Siz so\'ray oladigan mavzular:',
      ...(allowed.length > 0 ?
        allowed.map((s) => `• ${s}`)
      : ['• Faqat o\'z ishingiz bo\'yicha savollar']),
    ].join('\n'),
    suggestions: allowed.length > 0 ? allowed : ['Mening huquqlarim nima?'],
  };
}

export function permissionsReply(ctx: AssistantUserContext): {
  message: string;
  suggestions: string[];
} {
  if (isAssistantFullAccess(ctx)) {
    return {
      message: [
        `**${ctx.displayName}** — ${ctx.roleLabelUz}`,
        `Login: \`${ctx.login}\``,
        '',
        '**Siz to\'liq administrator sifatida** klinika bo\'yicha barcha ma\'lumotlar, statistika, bemorlar, navbat, kassa va sozlamalar haqida savol bera olasiz.',
      ].join('\n'),
      suggestions: [
        'Hozir nechta bemor davolanmoqda?',
        'Bugungi tushum qancha?',
        'Navbatda nechta bemor bor?',
        'Bemorlar sahifasini och',
      ],
    };
  }

  return {
    message: [
      `**${ctx.displayName}** — ${ctx.roleLabelUz}`,
      `Login: \`${ctx.login}\``,
      '',
      '**Sizning huquqlaringiz:**',
      ...ctx.permissionLines.map((l) => `• ${l}`),
      '',
      'Savollar faqat shu doira va **o\'zingiz bajargan ishlar** bo\'yicha javoblanadi.',
    ].join('\n'),
    suggestions: [
      'Bugun men nima qildim?',
      hasCapability(ctx, 'kassa_own_today') ? 'Bugungi cheklarim' : 'Mening navbatim',
    ].filter(Boolean) as string[],
  };
}

export function canUseClinicWideKassa(ctx: AssistantUserContext): boolean {
  return hasCapability(ctx, 'kassa_clinic_today');
}

export function canUseClinicWidePatients(ctx: AssistantUserContext): boolean {
  return hasCapability(ctx, 'patients_all');
}

export function canUseInpatients(ctx: AssistantUserContext): boolean {
  return hasCapability(ctx, 'inpatients');
}

export function canUseFullQueue(ctx: AssistantUserContext): boolean {
  return hasCapability(ctx, 'queue_all');
}
