import {

  formatInpatientList,

  formatMoneyUz,

  loadClinicSnapshot,

  type ClinicSnapshot,

} from '@/lib/assistant/clinic-snapshot';

import type { AssistantAction, AssistantReply } from '@/lib/assistant/types';

import {

  canAccessDataIntent,

  canUseClinicWideKassa,

  canUseClinicWidePatients,

  canUseFullQueue,

  canUseInpatients,

  deniedDataReply,

  hasCapability,

  permissionsReply,

  type AssistantUserContext,

} from '@/lib/assistant/user-context';

import {

  formatUserActivityReply,

  loadUserActivitySummary,

} from '@/lib/assistant/user-activity';

import { listPatientsByClinicAndCreator } from '@/lib/db/patients';

import { getDayRangeForDate } from '@/lib/kassa/date';

import { getRevenueReport } from '@/lib/kassa/reports';

import { readClinicQueueRows } from '@/lib/queue/clinic-queue-store';

import { isVisibleToDoctor, isWaitingPayment } from '@/lib/queue/types';

import { resolveKassaUserId } from '@/lib/assistant/user-activity';



export type { QueryIntent } from '@/lib/assistant/query-intents';
import type { QueryIntent } from '@/lib/assistant/query-intents';



function normalize(text: string): string {

  return text.trim().toLowerCase().replace(/\s+/g, ' ');

}



export function isDataQuestion(text: string): boolean {

  const t = normalize(text);

  if (isPermissionsQuestion(t) || isOwnActivityQuestion(t)) return true;

  return (

    /(?:nechta|qancha|soni|statistika|hisobot|jami|hozir|bugun|davolan|tushum|daromad|navbat|statsionar|palata|chek|ariza|bemorlar)/i.test(

      t,

    ) &&

    /(?:nechta|qancha|soni|hozir|bugun|jami|statistika|hisobot|qanday|ko'p|kam)/i.test(t)

  );

}



function isPermissionsQuestion(text: string): boolean {

  return (

    /(?:huquq|imkon|ruxsat|rol|vazifa)/i.test(text) &&

    /(?:mening|men |menga|nima|qanday|kim)/i.test(text)

  );

}



function isOwnActivityQuestion(text: string): boolean {

  return (

    /(?:men nima qildim|mening ish|bugun men|o'zim qildim|men qancha|mening chek|men qabul|men ro'yxat|men yaratdim|o'z harakat)/i.test(

      text,

    ) ||

    (/bugun/i.test(text) && /(?:men|mening|o'z)/i.test(text) && /(?:qildim|ish|chek|to'lov)/i.test(text))

  );

}



function scoreIntent(text: string, patterns: RegExp[]): number {

  let s = 0;

  for (const p of patterns) {

    if (p.test(text)) s += 3;

  }

  return s;

}



function detectIntent(text: string): QueryIntent | null {

  if (isPermissionsQuestion(text)) return 'my_permissions';

  if (isOwnActivityQuestion(text)) return 'own_activity';



  const scores: { intent: QueryIntent; score: number }[] = [

    {

      intent: 'inpatients_active',

      score: scoreIntent(text, [

        /davolan|statsionar|yotqiz|palatada|statsionarda/i,

        /hozir.*bemor|bemor.*hozir/i,

      ]),

    },

    {

      intent: 'inpatients_discharged',

      score: scoreIntent(text, [/chiqarilgan|chiqib ket|tabiati|yozilgan/i, /statsionar/i]),

    },

    {

      intent: 'patients_total',

      score: scoreIntent(text, [

        /jami.*bemor|kartoteka|nechta bemor|bemorlar soni|ro'yxat/i,

        /bemor.*nechta/i,

      ]),

    },

    {

      intent: 'queue_doctor',

      score: scoreIntent(text, [/shifokor.*navbat|navbat.*shifokor|qabulda/i]),

    },

    {

      intent: 'queue',

      score: scoreIntent(text, [/navbat|kutmoqda|kutayapti|qabul/i]),

    },

    {

      intent: 'kassa_today',

      score: scoreIntent(text, [

        /tushum|daromad|pul|to'lov|kassa|chek|savdo/i,

        /bugun/i,

      ]),

    },

    {

      intent: 'appointments',

      score: scoreIntent(text, [/ariza|instagram|onlayn/i]),

    },

    {

      intent: 'staff_services',

      score: scoreIntent(text, [/shifokor|xodim|xizmat.*nechta|bo'lim/i]),

    },

    {

      intent: 'overview',

      score: scoreIntent(text, [

        /umumiy|qisqacha|xulosa|bugun.*ahvol|nima.*holat|ko'rsat/i,

      ]),

    },

  ];



  scores.sort((a, b) => b.score - a.score);

  const top = scores[0];

  if (!top || top.score < 3) return null;

  return top.intent;

}



async function scopedQueueStats(ctx: AssistantUserContext) {

  const queue = await readClinicQueueRows(ctx.clinicId);

  const scoped =

    canUseFullQueue(ctx) ? queue

    : queue.filter(

        (r) =>

          r.referredDoctorUserId === ctx.userId ||

          (ctx.displayName &&

            r.referredDoctorName?.toLowerCase().includes(ctx.displayName.toLowerCase())),

      );



  return {

    queueTotal: scoped.length,

    queueWaitingPayment: scoped.filter(isWaitingPayment).length,

    queueWithDoctor: scoped.filter((r) => (r.status ?? '') === 'with_doctor').length,

    queueReadyForDoctor: scoped.filter(isVisibleToDoctor).length,

    queueCompleted: scoped.filter((r) => (r.status ?? '') === 'completed').length,

    scoped: !canUseFullQueue(ctx),

  };

}



function replyOverview(s: ClinicSnapshot, ctx: AssistantUserContext): AssistantReply {

  const treating = s.inpatientsActive + s.inpatientsHomeMonitoring;

  const lines = [`**${s.dateLabel}** — sizga ko'rinadigan holat:`, ''];



  if (canUseClinicWidePatients(ctx) || hasCapability(ctx, 'patients_own')) {

    lines.push(`• Kartotekada jami: **${s.patientsTotal}** ta bemor`);

  }

  if (canUseInpatients(ctx)) {

    lines.push(

      `• Hozir statsionarda davolanmoqda: **${treating}** ta (${s.inpatientsActive} palatada, ${s.inpatientsHomeMonitoring} uyda kuzatuv)`,

    );

  }

  if (hasCapability(ctx, 'queue_all') || hasCapability(ctx, 'queue_scope')) {

    lines.push(`• Navbatda: **${s.queueTotal}** ta`);

  }

  if (canUseClinicWideKassa(ctx)) {

    lines.push(

      `• Bugungi kassa tushumi: **${formatMoneyUz(s.kassaTodayRevenue)}** (${s.kassaTodayInvoices} ta chek)`,

    );

  } else if (hasCapability(ctx, 'kassa_own_today')) {

    lines.push(`• Bugungi o'z cheklaringiz: **${s.kassaTodayInvoices}** ta`);

  }

  if (hasCapability(ctx, 'appointments_all')) {

    lines.push(`• Yangi onlayn arizalar: **${s.appointmentRequestsNew}** ta`);

  }



  if (lines.length <= 2) {

    const denied = deniedDataReply(ctx);

    return { message: denied.message, suggestions: denied.suggestions };

  }



  return {

    message: lines.join('\n'),

    actions: [{ type: 'navigate', href: ctx.homePath, label: 'Asosiy sahifa' }],

    suggestions: [

      'Bugun men nima qildim?',

      'Mening huquqlarim nima?',

    ],

  };

}



async function buildReply(

  intent: QueryIntent,

  s: ClinicSnapshot,

  ctx: AssistantUserContext,

): Promise<AssistantReply> {

  switch (intent) {

    case 'my_permissions':

      return permissionsReply(ctx);



    case 'own_activity': {

      const activity = await loadUserActivitySummary(ctx);

      return {

        message: formatUserActivityReply(ctx, activity),

        suggestions: ['Mening huquqlarim nima?', 'Bugungi cheklarim'],

      };

    }



    case 'inpatients_active': {

      const total = s.inpatientsActive + s.inpatientsHomeMonitoring;

      const list = formatInpatientList(s.activeInpatients);

      return {

        message: [

          `Hozir **${total}** ta bemor davolanmoqda:`,

          `• Palatada (statsionar): **${s.inpatientsActive}** ta`,

          `• Uyda kuzatuvda: **${s.inpatientsHomeMonitoring}** ta`,

          list ? `\n${list}` : '',

          `\nMa'lumot: ${s.dateLabel}, tizim bazasidan.`,

        ]

          .filter(Boolean)

          .join('\n'),

        actions: [

          { type: 'navigate', href: '/hamshiralar', label: 'Statsionar (hamshiralar)' },

        ],

      };

    }

    case 'inpatients_discharged':

      return {

        message: `Statsionardan jami **${s.inpatientsDischargedTotal}** ta bemor chiqarilgan (tarixda). Bugun chiqarilgan: **${s.inpatientsDischargedToday}** ta.`,

        actions: [{ type: 'navigate', href: '/hamshiralar', label: 'Statsionar bo\'limi' }],

      };

    case 'patients_total': {

      if (!canUseClinicWidePatients(ctx) && hasCapability(ctx, 'patients_own')) {

        const mine = await listPatientsByClinicAndCreator(ctx.clinicId, ctx.userId);

        return {

          message: `Siz ro'yxatdan o'tkazgan bemorlar: **${mine.length}** ta.`,

          suggestions: ['Bugun men nima qildim?'],

        };

      }

      return {

        message: `Kartotekada jami **${s.patientsTotal}** ta bemor ro'yxatdan o'tgan.`,

        actions: [{ type: 'portal_section', section: 'patients', label: 'Bemorlar sahifasi' }],

      };

    }

    case 'queue':

    case 'queue_doctor': {

      const q = await scopedQueueStats(ctx);

      const prefix = q.scoped ? 'Sizga tegishli navbatda' : 'Navbatda hozir';

      return {

        message: [

          `${prefix} **${q.queueTotal}** ta bemor bor:`,

          `• To'lov kutilmoqda: **${q.queueWaitingPayment}**`,

          `• Shifokor qabulida / tayyor: **${q.queueReadyForDoctor}**`,

          `• Qabul tugallangan: **${q.queueCompleted}**`,

        ].join('\n'),

        actions: [{ type: 'navigate', href: ctx.homePath, label: 'Navbat sahifasi' }],

      };

    }

    case 'kassa_today': {

      if (!canUseClinicWideKassa(ctx) && hasCapability(ctx, 'kassa_own_today')) {

        const cashierId = await resolveKassaUserId(ctx);

        if (!cashierId) {

          return {

            message:

              'Kassa hisobingiz bog\'lanmagan. Faqat o\'z ishingiz bo\'yicha savol bering yoki administratorga murojaat qiling.',

            suggestions: ['Mening huquqlarim nima?'],

          };

        }

        const { start, end } = getDayRangeForDate();

        const rev = await getRevenueReport({ start, end, cashierId });

        return {

          message: [

            `Bugungi **sizning** kassa ko\'rsatkichlaringiz:`,

            `• Tushum: **${formatMoneyUz(rev.grandTotal)}**`,

            `• To'lovlar: **${rev.transactionCount}** ta`,

            `• Cheklar: **${rev.invoices}** ta`,

          ].join('\n'),

          actions: [{ type: 'navigate', href: '/kassa', label: 'Kassa' }],

        };

      }

      return {

        message: [

          `Bugungi kassa (**${s.dateLabel.split(',')[0] ?? 'bugun'}**):`,

          `• Tushum: **${formatMoneyUz(s.kassaTodayRevenue)}**`,

          `• To'lovlar: **${s.kassaTodayPayments}** ta`,

          `• Cheklar (invoice): **${s.kassaTodayInvoices}** ta`,

        ].join('\n'),

        actions: [{ type: 'navigate', href: '/kassa-admin', label: 'Kassa admin' }],

      };

    }

    case 'appointments':

      return {

        message: `Onlayn arizalar: jami **${s.appointmentRequestsTotal}** ta, yangi (ko'rilmagan): **${s.appointmentRequestsNew}** ta.`,

        actions: [{ type: 'portal_section', section: 'appointments', label: 'Navbat va arizalar' }],

      };

    case 'staff_services':

      return {

        message: [

          `Tizimdagi ma'lumotlar:`,

          `• Shifokorlar: **${s.doctorsCount}** ta`,

          `• Bo'limlar: **${s.departmentsCount}** ta`,

          `• Tibbiy xizmatlar: **${s.servicesCount}** ta`,

        ].join('\n'),

        actions: [{ type: 'portal_section', section: 'users', label: 'Xodimlar' }],

      };

    case 'overview':

      return replyOverview(s, ctx);

    default:

      return replyOverview(s, ctx);

  }

}



export async function answerFromClinicData(input: {

  message: string;

  clinicId: string;

  user: AssistantUserContext;

}): Promise<AssistantReply | null> {

  const text = normalize(input.message);

  const ctx = input.user;



  if (isPermissionsQuestion(text)) {

    if (!canAccessDataIntent(ctx, 'my_permissions')) {

      const denied = deniedDataReply(ctx);

      return { message: denied.message, suggestions: denied.suggestions };

    }

    return permissionsReply(ctx);

  }



  if (isOwnActivityQuestion(text)) {

    if (!canAccessDataIntent(ctx, 'own_activity')) {

      const denied = deniedDataReply(ctx);

      return { message: denied.message, suggestions: denied.suggestions };

    }

    const activity = await loadUserActivitySummary(ctx);

    return {

      message: formatUserActivityReply(ctx, activity),

      suggestions: ['Mening huquqlarim nima?'],

    };

  }



  if (!isDataQuestion(text)) return null;



  const intent = detectIntent(text);

  if (!intent) {

    if (/nechta|qancha|soni|statistika|hisobot|jami|hozir|bugun/i.test(text)) {

      if (!canAccessDataIntent(ctx, 'overview')) {

        const denied = deniedDataReply(ctx);

        return { message: denied.message, suggestions: denied.suggestions };

      }

      const s = await loadClinicSnapshot(input.clinicId);

      return replyOverview(s, ctx);

    }

    return null;

  }



  if (!canAccessDataIntent(ctx, intent)) {

    const denied = deniedDataReply(ctx);

    return { message: denied.message, suggestions: denied.suggestions };

  }



  const snapshot = await loadClinicSnapshot(input.clinicId);



  if (intent === 'kassa_today' && hasCapability(ctx, 'kassa_own_today') && !canUseClinicWideKassa(ctx)) {

    return buildReply(intent, snapshot, ctx);

  }



  if (

    (intent === 'queue' || intent === 'queue_doctor') &&

    hasCapability(ctx, 'queue_scope') &&

    !canUseFullQueue(ctx)

  ) {

    return buildReply(intent, snapshot, ctx);

  }



  return buildReply(intent, snapshot, ctx);

}


