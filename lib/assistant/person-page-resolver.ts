import type { AssistantAction, AssistantReply } from '@/lib/assistant/types';
import { listDoctorStaffAccounts } from '@/lib/doctors/db-doctors';
import type { DoctorRow } from '@/lib/doctors/types';
import { searchPatientsForKassa } from '@/lib/db/patients';
import {
  isAssistantFullAccess,
  type AssistantUserContext,
} from '@/lib/assistant/user-context';
import type { PersonPageIntent } from '@/lib/assistant/person-intent';

function matchesNameQuery(value: string, query: string): boolean {
  const v = value.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (!v || !q) return false;
  if (v === q || v.includes(q)) return true;
  return v.split(/\s+/).some((part) => part.startsWith(q) || q.startsWith(part));
}

function filterDoctors(rows: DoctorRow[], query: string): DoctorRow[] {
  return rows.filter(
    (row) =>
      matchesNameQuery(row.fullName, query) ||
      matchesNameQuery(row.login, query) ||
      matchesNameQuery(row.username, query),
  );
}

export async function resolvePersonPageReply(
  ctx: AssistantUserContext,
  intent: PersonPageIntent,
): Promise<AssistantReply | null> {
  const openInNewTab = isAssistantFullAccess(ctx);
  const q = intent.nameQuery;

  if (intent.role === 'doctor' || intent.role === 'staff' || intent.role === 'user') {
    const doctors = await listDoctorStaffAccounts();
    const hits = filterDoctors(doctors, q);

    if (hits.length === 1) {
      const d = hits[0]!;
      const action: AssistantAction = {
        type: 'users_view',
        view: 'doctors',
        label: `${d.fullName} — Shifokorlar`,
      };
      return {
        message: [
          `**${d.fullName}** (${d.login || d.username || 'login yo\'q'}) — shifokor profili.`,
          `Shifokorlar bo'limini ${openInNewTab ? 'yangi oynada ' : ''}ochaman.`,
          d.specialty ? `Mutaxassislik: ${d.specialty}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        actions: [action],
        openInNewTab,
      };
    }

    if (hits.length > 1) {
      return {
        message: `«${q}» bo'yicha ${hits.length} ta shifokor topildi. Keraklisini tanlang:`,
        actions: hits.slice(0, 6).map((d) => ({
          type: 'users_view' as const,
          view: 'doctors' as const,
          label: `${d.fullName} (${d.login})`,
        })),
        openInNewTab,
      };
    }

    if (intent.role === 'doctor') {
      return {
        message: `«${q}» ismli shifokor topilmadi. Shifokorlar ro'yxatini ochaymi?`,
        actions: [
          {
            type: 'users_view',
            view: 'doctors',
            label: 'Shifokorlar ro\'yxati',
          },
        ],
        openInNewTab,
        suggestions: ['Shifokorlar ro\'yxatini och'],
      };
    }
  }

  if (intent.role === 'patient') {
    const rows = await searchPatientsForKassa(ctx.clinicId, q, 6);
    if (rows.length === 1) {
      const p = rows[0]!;
      return {
        message: `**${p.full_name}** bemor kartasini ${openInNewTab ? 'yangi oynada ' : ''}ochaman.`,
        actions: [
          {
            type: 'navigate',
            href: `/patients?patient=${encodeURIComponent(String(p.id))}`,
            label: `${p.full_name} — ochish`,
          },
        ],
        openInNewTab,
      };
    }
    if (rows.length > 1) {
      return {
        message: `«${q}» bo'yicha ${rows.length} ta bemor topildi:`,
        actions: rows.map((p) => ({
          type: 'navigate' as const,
          href: `/patients?patient=${encodeURIComponent(String(p.id))}`,
          label: `${p.full_name} (${p.card_number})`,
        })),
        openInNewTab,
      };
    }
    return {
      message: `«${q}» ismli bemor topilmadi.`,
      suggestions: ['Bemor qidir: ism familiya'],
    };
  }

  return null;
}
