export const CLINIC_SETTINGS_STORAGE_KEY = 'garmonik-clinic-settings-v1';

export type SettingsLocale = 'uz' | 'ru' | 'uz-Cyrl';

export type ClinicSettings = {
  clinicName: string;
  legalName: string;
  inn: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  timezone: string;
  locale: SettingsLocale;
  workDayOpen: string;
  workDayClose: string;
  workSaturdayOpen: string;
  workSaturdayClose: string;
  saturdayEnabled: boolean;
  slotMinutes: 10 | 15 | 20 | 30;
  maxAppointmentsPerDay: number;
  defaultServiceCurrency: 'UZS';
  invoicePrefix: string;
  invoiceLegalFooter: string;
  smsReminder: boolean;
  smsReminderHoursBefore: number;
  emailDailyDigest: boolean;
  internalPushAlerts: boolean;
  patientConsentOnRegister: boolean;
  retentionMonths: number;
  apiReadEnabled: boolean;
  webhookUrl: string;
  sessionTimeoutMinutes: number;
  twoFactorEnforced: boolean;
  auditLogEnabled: boolean;
  showPricesWithVat: boolean;
};

export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  clinicName: 'Gormonik Plus',
  legalName: '“GORMONIK PLUS” MCHJ',
  inn: '',
  phone: '+998 91 000 00 00',
  email: 'info@gormonik.uz',
  address: "Buxoro viloyati, Buxoro shahri",
  website: 'https://gormonik.uz',
  timezone: 'Asia/Tashkent',
  locale: 'uz',
  workDayOpen: '08:00',
  workDayClose: '20:00',
  workSaturdayOpen: '09:00',
  workSaturdayClose: '14:00',
  saturdayEnabled: true,
  slotMinutes: 10,
  maxAppointmentsPerDay: 120,
  defaultServiceCurrency: 'UZS',
  invoicePrefix: 'GM-',
  invoiceLegalFooter:
    'Tibbiy xizmatlar O‘zbekiston Respublikasi qonun hujjatlariga muvofiq ko‘rsatiladi. To‘lov naqd yoki plastik karta orqali.',
  smsReminder: true,
  smsReminderHoursBefore: 2,
  emailDailyDigest: false,
  internalPushAlerts: true,
  patientConsentOnRegister: true,
  retentionMonths: 60,
  apiReadEnabled: false,
  webhookUrl: '',
  sessionTimeoutMinutes: 45,
  twoFactorEnforced: false,
  auditLogEnabled: true,
  showPricesWithVat: false,
};

export function parseClinicSettings(raw: string | null): ClinicSettings {
  if (!raw) return { ...DEFAULT_CLINIC_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<ClinicSettings>;
    return { ...DEFAULT_CLINIC_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_CLINIC_SETTINGS };
  }
}
