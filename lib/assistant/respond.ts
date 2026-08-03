import { searchPatientsForKassa, listPatientsByClinicAndCreator } from '@/lib/db/patients';
import { answerFromClinicData, isDataQuestion } from '@/lib/assistant/answer-from-data';
import type { AssistantCapability } from '@/lib/assistant/capabilities';
import {
  ASSISTANT_FAQ,
  type NavTarget,
} from '@/lib/assistant/knowledge';
import { hasPersonPageIntent, parsePersonPageIntent } from '@/lib/assistant/person-intent';
import { resolvePersonPageReply } from '@/lib/assistant/person-page-resolver';
import {
  findBestNavTarget,
  isPageOpenRequest,
  scoreNavTarget,
  wantsNavigation,
} from '@/lib/assistant/navigation';
import {
  buildAssistantUserContext,
  canUseClinicWidePatients,
  deniedDataReply,
  hasCapability,
  isAssistantFullAccess,
  PERMISSION_DENIED_MESSAGE,
  type AssistantUserContext,
} from '@/lib/assistant/user-context';
import type { VerifiedSession } from '@/lib/auth/session-jwt';
import type { AssistantAction, AssistantPatientHit, AssistantReply } from '@/lib/assistant/types';

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function roleBasedSuggestions(ctx: AssistantUserContext): string[] {
  if (isAssistantFullAccess(ctx)) {
    return [
      'Hozir nechta bemor davolanmoqda?',
      'Bugungi tushum qancha?',
      'Navbatda nechta bemor bor?',
      'Bemorlar sahifasini och',
    ];
  }
  const items = [
    hasCapability(ctx, 'permissions_view') ? 'Mening huquqlarim nima?' : null,
    hasCapability(ctx, 'own_activity') ? 'Bugun men nima qildim?' : null,
    hasCapability(ctx, 'kassa_own_today') ? 'Bugungi tushumim qancha?' : null,
    hasCapability(ctx, 'queue_scope') || hasCapability(ctx, 'queue_all') ?
      'Navbatda nechta bemor bor?'
    : null,
    hasCapability(ctx, 'inpatients') ? 'Hozir nechta bemor davolanmoqda?' : null,
    hasCapability(ctx, 'patients_all') ? 'Bemorlar sahifasini och' : null,
  ].filter(Boolean) as string[];
  return items.length > 0 ? items.slice(0, 4) : ['Mening huquqlarim nima?'];
}

function navRequiredCapability(target: NavTarget): AssistantCapability | null {
  if (target.kind === 'portal_section') {
    if (target.section === 'settings') return 'settings_admin';
    if (target.section === 'patients') return 'patients_all';
    if (target.section === 'appointments') return 'appointments_all';
    if (target.section === 'users' || target.section === 'services') return 'staff_directory';
  }
  if (target.kind === 'href') {
    if (target.href.includes('kassa-admin')) return 'kassa_clinic_today';
    if (target.href === '/kassa') return 'kassa_own_today';
    if (target.href.includes('sozlamalar') || target.href.includes('settings')) {
      return 'settings_admin';
    }
  }
  if (target.kind === 'dashboard_view' && target.view === 'reports') {
    return 'kassa_clinic_today';
  }
  return null;
}

function canAccessNavTarget(ctx: AssistantUserContext, target: NavTarget): boolean {
  if (isAssistantFullAccess(ctx)) return true;
  const required = navRequiredCapability(target);
  if (!required) return true;
  if (hasCapability(ctx, required)) return true;
  if (required === 'patients_all' && hasCapability(ctx, 'patients_own')) return true;
  if (required === 'appointments_all' && hasCapability(ctx, 'queue_scope')) return true;
  if (required === 'kassa_clinic_today' && hasCapability(ctx, 'kassa_own_today')) {
    return target.kind === 'href' && target.href === '/kassa';
  }
  return false;
}

function wantsPatientSearch(text: string): boolean {
  if (isDataQuestion(text)) return false;
  if (isPageOpenRequest(text)) return false;
  return (
    /(?:bemor|patient|kartochka|karta raqam|telefon|qidir|top)/i.test(text) ||
    /KB-\d/i.test(text) ||
    /\d{9,}/.test(text)
  );
}

function extractPatientQuery(text: string): string | null {
  const card = text.match(/KB-[\d-]+/i)?.[0];
  if (card) return card;

  const phone = text.replace(/\D/g, '');
  if (phone.length >= 9) return phone;

  const patterns = [
    /(?:bemor|qidir|top|kartochka|patient)[\s:,-]+(.+)/i,
    /(?:ism|familiya)[\s:,-]+(.+)/i,
    /["«](.+?)["»]/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    const q = m?.[1]?.trim();
    if (q && q.length >= 2) {
      return q
        .replace(/\b(?:och|kir|sahifa|qayerda|qayer|ber|menga|iltimos)\b/gi, '')
        .trim();
    }
  }

  if (wantsPatientSearch(text) && text.split(/\s+/).length >= 2) {
    const cleaned = text
      .replace(
        /^(?:bemor|qidir|top|kartochka|patient|menga|iltimos|ber|och|kir)\s+/i,
        '',
      )
      .trim();
    if (cleaned.length >= 2) return cleaned;
  }

  return null;
}

function targetToAction(target: NavTarget): AssistantAction {
  switch (target.kind) {
    case 'href':
      return { type: 'navigate', href: target.href, label: target.label };
    case 'dashboard_view':
      return { type: 'dashboard_view', view: target.view, label: target.label };
    case 'portal_section':
      return { type: 'portal_section', section: target.section, label: target.label };
    case 'users_view':
      return { type: 'users_view', view: target.view, label: target.label };
  }
}

function buildNavigationReply(
  ctx: AssistantUserContext,
  text: string,
): AssistantReply | null {
  if (hasPersonPageIntent(text)) return null;

  const target = findBestNavTarget(text);
  if (!target) return null;

  const score = scoreNavTarget(target, text);
  const pageOpen = isPageOpenRequest(text);
  const navVerb = wantsNavigation(text);

  if (!pageOpen && !navVerb && score < 4) return null;

  if (!canAccessNavTarget(ctx, target)) {
    return deniedDataReply(ctx);
  }

  const action = targetToAction(target);
  const help = 'help' in target ? target.help : undefined;
  const openInNewTab = isAssistantFullAccess(ctx);

  if (pageOpen || navVerb || score >= 6) {
    return {
      message: help ?
        `**${target.label}** sahifasini ${openInNewTab ? 'yangi oynada ' : ''}ochaman.\n\n${help}`
      : `**${target.label}** sahifasini ${openInNewTab ? 'yangi oynada ' : ''}ochaman.`,
      actions: [action],
      openInNewTab,
    };
  }

  return {
    message: `Sizga **${target.label}** kerak bo\'lishi mumkin. Ochaymi?`,
    actions: [action],
    suggestions: [`${target.label} ni och`],
    openInNewTab,
  };
}

function matchFaq(text: string): string | null {
  for (const item of ASSISTANT_FAQ) {
    if (item.patterns.some((p) => p.test(text))) return item.answer;
  }
  return null;
}

function filterOwnPatients(
  rows: Awaited<ReturnType<typeof listPatientsByClinicAndCreator>>,
  query: string,
): AssistantPatientHit[] {
  const q = query.toLowerCase();
  const digits = query.replace(/\D/g, '');
  return rows
    .filter((r) => {
      const name = String(r.full_name ?? '').toLowerCase();
      const card = String(r.card_number ?? '').toLowerCase();
      if (card.includes(q) || name.includes(q)) return true;
      if (digits.length >= 9) {
        return String(r.phone ?? '').replace(/\D/g, '').includes(digits);
      }
      return false;
    })
    .slice(0, 6)
    .map((r) => ({
      id: String(r.id),
      fullName: String(r.full_name ?? ''),
      cardNumber: String(r.card_number ?? ''),
      phone: '',
    }));
}

async function searchPatients(
  ctx: AssistantUserContext,
  query: string,
): Promise<AssistantPatientHit[]> {
  if (!canUseClinicWidePatients(ctx)) {
    if (!hasCapability(ctx, 'patients_own')) {
      return [];
    }
    const own = await listPatientsByClinicAndCreator(ctx.clinicId, ctx.userId);
    return filterOwnPatients(own, query);
  }
  const rows = await searchPatientsForKassa(ctx.clinicId, query, 6);
  return rows.map((r) => ({
    id: String(r.id),
    fullName: String(r.full_name ?? ''),
    cardNumber: String(r.card_number ?? ''),
    phone: String(r.phone ?? ''),
  }));
}

export async function assistantRespond(input: {
  message: string;
  clinicId: string;
  session: VerifiedSession;
}): Promise<AssistantReply> {
  const ctx = buildAssistantUserContext(input.session, input.clinicId);
  const text = normalize(input.message);
  const suggestions = roleBasedSuggestions(ctx);

  if (!text) {
    return {
      message: isAssistantFullAccess(ctx) ?
        'Savolingizni yozing — klinika statistikasi, bemor qidirish, sahifa ochish yoki tizim bo\'yicha yordam bera olaman.'
      : `Savolingizni yozing. Siz **${ctx.roleLabelUz}** sifatida faqat o\'zingizga tegishli ma\'lumotlardan javob olasiz.`,
      suggestions,
    };
  }

  if (/^(salom|assalom|hello|hi|yordam|help)\b/.test(text)) {
    if (isAssistantFullAccess(ctx)) {
      return {
        message: [
          `Assalomu alaykum, **${ctx.displayName}**!`,
          'Men Garmonik yordamchisiman. Klinika bo\'yicha **barcha** ma\'lumotlardan javob beraman: bemorlar, statsionar, navbat, kassa, hisobotlar.',
          'Savol bering yoki sahifa ochishni so\'rang.',
        ].join('\n'),
        suggestions,
      };
    }
    return {
      message: [
        `Assalomu alaykum, **${ctx.displayName}**!`,
        `Siz **${ctx.roleLabelUz}** sifatida kirdingiz.`,
        '',
        'Men faqat sizning huquqlaringiz va o\'zingiz qilgan ishlaringiz bo\'yicha javob beraman.',
        '«Mening huquqlarim nima?» deb so\'rashingiz mumkin.',
      ].join('\n'),
      suggestions,
    };
  }

  try {
    const dataAnswer = await answerFromClinicData({
      message: input.message,
      clinicId: input.clinicId,
      user: ctx,
    });
    if (dataAnswer) return dataAnswer;
  } catch (e) {
    console.error('assistant data query:', e);
  }

  const personIntent = parsePersonPageIntent(text);
  if (personIntent) {
    try {
      const personReply = await resolvePersonPageReply(ctx, personIntent);
      if (personReply) return personReply;
    } catch (e) {
      console.error('assistant person page:', e);
    }
  }

  const navReply = buildNavigationReply(ctx, text);
  if (navReply) return navReply;

  if (wantsPatientSearch(text)) {
    if (!canUseClinicWidePatients(ctx) && !hasCapability(ctx, 'patients_own')) {
      const denied = deniedDataReply(ctx);
      return { message: denied.message, suggestions: denied.suggestions };
    }

    const query = extractPatientQuery(input.message);
    if (query && query.length >= 2) {
      try {
        const hits = await searchPatients(ctx, query);
        if (hits.length === 0) {
          const scopeHint =
            canUseClinicWidePatients(ctx) ? '' : ' (faqat siz ro\'yxatdan o\'tkazgan bemorlar)';
          return {
            message: `«${query}» bo\'yicha bemor topilmadi${scopeHint}. Ism yoki karta raqamini aniqroq yozing.`,
            suggestions,
          };
        }
        if (hits.length === 1) {
          const p = hits[0]!;
          return {
            message: `Topildi: **${p.fullName}** (${p.cardNumber}). Bemor kartasini ochaymi?`,
            actions: [
              {
                type: 'navigate',
                href: `/patients?patient=${encodeURIComponent(p.id)}`,
                label: `${p.fullName} — ochish`,
              },
            ],
          };
        }
        return {
          message: `«${query}» bo\'yicha ${hits.length} ta bemor topildi. Keraklisini tanlang:`,
          actions: hits.map((p) => ({
            type: 'navigate' as const,
            href: `/patients?patient=${encodeURIComponent(p.id)}`,
            label: `${p.fullName} (${p.cardNumber})`,
          })),
        };
      } catch {
        return { message: 'Bemor qidiruvda xatolik. Keyinroq qayta urinib ko\'ring.' };
      }
    }
  }

  const faq = matchFaq(text);
  if (faq) {
    return { message: faq, suggestions };
  }

  if (/nima|qanday|nega|kim|qayerda\s/i.test(text)) {
    if (isAssistantFullAccess(ctx)) {
      return {
        message:
          'Quyidagi bo\'limlar mavjud: bemorlar, navbat, xizmatlar, kassa, hisobotlar, sozlamalar. Aniqroq yozing, masalan: «Kassa sahifasini och» yoki «Bugungi tushum qancha?»',
        suggestions,
      };
    }
    return {
      message: [
        `Siz **${ctx.roleLabelUz}** sifatida quyidagilardan savol bering:`,
        ...ctx.permissionLines.slice(0, 6).map((l) => `• ${l}`),
        '',
        'Masalan: «Mening huquqlarim nima?» yoki «Bugun men nima qildim?»',
      ].join('\n'),
      suggestions,
    };
  }

  if (isAssistantFullAccess(ctx)) {
    return {
      message:
        'Tushunmadim. Sahifa nomini yozing (masalan: «Sozlamalar», «Kassa») yoki «Bemor qidir: ism familiya» deb so\'rang.',
      suggestions,
    };
  }

  return {
    message: [
      PERMISSION_DENIED_MESSAGE,
      '',
      'Sahifa ochish, o\'z ishingiz yoki huquqlaringiz haqida aniqroq yozing.',
    ].join('\n'),
    suggestions,
  };
}
