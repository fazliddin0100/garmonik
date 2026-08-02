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
  /** Ma'muriy bo‘limdagi qo‘shimcha rol turlari (sarlavhalar) */
  adminSupportRoleTitles: string[];
};

/** Bo‘sh shablon — barcha qiymatlar admin tomonidan kiritiladi */
export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  clinicName: '',
  legalName: '',
  inn: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  timezone: 'Asia/Tashkent',
  locale: 'uz',
  workDayOpen: '',
  workDayClose: '',
  workSaturdayOpen: '',
  workSaturdayClose: '',
  saturdayEnabled: false,
  slotMinutes: 15,
  maxAppointmentsPerDay: 0,
  defaultServiceCurrency: 'UZS',
  invoicePrefix: '',
  invoiceLegalFooter: '',
  smsReminder: false,
  smsReminderHoursBefore: 0,
  emailDailyDigest: false,
  internalPushAlerts: false,
  patientConsentOnRegister: false,
  retentionMonths: 0,
  apiReadEnabled: false,
  webhookUrl: '',
  sessionTimeoutMinutes: 45,
  twoFactorEnforced: false,
  auditLogEnabled: false,
  showPricesWithVat: false,
  adminSupportRoleTitles: [],
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
