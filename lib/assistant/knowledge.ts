import type { DashboardViewId } from '@/lib/dashboard/views';
import type { PortalMainSectionId } from '@/lib/portal/sections';
import type { UsersViewId } from '@/lib/users/views';

export type NavTarget =
  | { kind: 'href'; href: string; label: string; keywords: string[]; help?: string }
  | {
      kind: 'dashboard_view';
      view: DashboardViewId;
      label: string;
      keywords: string[];
      help?: string;
    }
  | {
      kind: 'portal_section';
      section: PortalMainSectionId;
      label: string;
      keywords: string[];
      help?: string;
    }
  | {
      kind: 'users_view';
      view: UsersViewId;
      label: string;
      keywords: string[];
      help?: string;
    };

export const ASSISTANT_NAV_TARGETS: NavTarget[] = [
  {
    kind: 'href',
    href: '/dashboard',
    label: 'Dashboard',
    keywords: ['dashboard', 'bosh sahifa', 'asosiy', 'boshqaruv'],
    help: 'Umumiy statistika va klinika boshqaruvi.',
  },
  {
    kind: 'portal_section',
    section: 'patients',
    label: 'Bemorlar',
    keywords: [
      'bemorlar',
      'bemorlar sahifasi',
      'bemorlar sahifasini',
      'kartoteka',
      'karta',
      'patients',
    ],
    help: 'Bemorlar ro\'yxati va klinik kartalar.',
  },
  {
    kind: 'portal_section',
    section: 'appointments',
    label: 'Navbat',
    keywords: ['navbat', 'qabul', 'uchrashuv', 'appointment', 'instagram ariza'],
    help: 'Jonli navbat va onlayn arizalar.',
  },
  {
    kind: 'portal_section',
    section: 'services',
    label: 'Xizmatlar',
    keywords: ['xizmatlar', 'narxlar', 'katalog', 'xizmat'],
    help: 'Tibbiy xizmatlar va narxlar katalogi.',
  },
  {
    kind: 'portal_section',
    section: 'settings',
    label: 'Sozlamalar',
    keywords: ['sozlamalar', 'setting', 'export', 'import', 'yuklab', 'modul', 'ma\'lumot'],
    help: 'Klinika sozlamalari va ma\'lumotlarni export/import.',
  },
  {
    kind: 'dashboard_view',
    view: 'reports',
    label: 'Hisobotlar',
    keywords: ['hisobot', 'report', 'moliya', 'statistika'],
    help: 'Moliyaviy va operatsion hisobotlar.',
  },
  {
    kind: 'dashboard_view',
    view: 'departments',
    label: 'Bo\'limlar',
    keywords: ['bo\'lim', 'departament'],
  },
  {
    kind: 'dashboard_view',
    view: 'rooms',
    label: 'Xonalar',
    keywords: ['xona', 'palata', 'kabinet xona'],
  },
  {
    kind: 'dashboard_view',
    view: 'products',
    label: 'Mahsulotlar',
    keywords: ['mahsulot', 'dori', 'farmatsiya'],
  },
  {
    kind: 'href',
    href: '/kassa',
    label: 'Kassa',
    keywords: ['kassa', 'chek', 'kassir', 'to\'lov'],
    help: 'Kassir ish joyi — chek chop etish va to\'lov.',
  },
  {
    kind: 'href',
    href: '/kassa-admin',
    label: 'Kassa admin',
    keywords: ['kassa admin', 'buxgalter', 'xarajat kassa'],
    help: 'Kassa boshqaruvi, xizmatlar va xarajatlar.',
  },
  {
    kind: 'href',
    href: '/doctor',
    label: 'Shifokor kabineti',
    keywords: ['shifokor', 'doctor', 'doktor'],
  },
  {
    kind: 'href',
    href: '/labaratoriya',
    label: 'Laboratoriya',
    keywords: ['laborator', 'lab', 'tahlil'],
  },
  {
    kind: 'href',
    href: '/hamshiralar',
    label: 'Hamshiralar',
    keywords: ['hamshira', 'hamshiralar'],
  },
  {
    kind: 'href',
    href: '/kabinet',
    label: 'Qabul kabineti',
    keywords: ['kabinet', 'qabul xodim', 'reception'],
  },
  {
    kind: 'href',
    href: '/kadrlar',
    label: 'Kadrlar',
    keywords: ['kadrlar', 'hr', 'xodimlar bo\'limi'],
  },
  {
    kind: 'portal_section',
    section: 'users',
    label: 'Xodimlar',
    keywords: ['xodimlar', 'administrator', 'foydalanuvchi'],
  },
  {
    kind: 'users_view',
    view: 'doctors',
    label: 'Shifokorlar ro\'yxati',
    keywords: ['shifokorlar ro\'yxat', 'shifokorlar admin'],
  },
  {
    kind: 'href',
    href: '/ariza',
    label: 'Onlayn ariza',
    keywords: ['ariza', 'instagram forma'],
  },
  {
    kind: 'href',
    href: '/security-center',
    label: 'Xavfsizlik markazi',
    keywords: ['xavfsizlik', 'security', 'super admin'],
  },
];

export const ASSISTANT_FAQ: { patterns: RegExp[]; answer: string }[] = [
  {
    patterns: [/parol|login|kirish/i],
    answer:
      'Kirish: /auth/login sahifasi. Admin: login `admin`, parol o\'rnatish vaqtida berilgan. Kassa: /kassa/login. Parolni admin «Kadrlar» yoki «Xodimlar» bo\'limidan o\'zgartiradi.',
  },
  {
    patterns: [/export|import|yuklab|zaxira|backup/i],
    answer:
      'Ma\'lumotlarni export/import: Sozlamalar → Ma\'lumotlar tabi. Klinika va kassa modullari alohida JSON fayl sifatida yuklab olinadi.',
  },
  {
    patterns: [/kassa.*qanday|chek.*qanday/i],
    answer:
      'Kassa: /kassa/login dan kiring. Bemor tanlang, xizmatlar qo\'shing, to\'lov qiling. Cheklar «Cheklar» bo\'limida saqlanadi.',
  },
  {
    patterns: [/navbat.*qanday|qabul.*qanday/i],
    answer:
      'Navbat: /appointments — admin yoki qabul xodimi. Kabinet xodimi: /kabinet/navbat. Onlayn ariza: /ariza (login shart emas).',
  },
];

export const ASSISTANT_SUGGESTIONS = [
  'Hozir nechta bemor davolanmoqda?',
  'Bugungi tushum qancha?',
  'Navbatda nechta bemor bor?',
  'Klinika holati (umumiy)',
  'Bemor qidir: Aliyev',
];
