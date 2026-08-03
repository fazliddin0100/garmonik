'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import ClinicDataModulesPanel from '@/components/settings/ClinicDataModulesPanel';
import KassaDataModulesPanel from '@/components/settings/KassaDataModulesPanel';
import { DATA_MODULE_QUICK_GRID, DATA_MODULE_QUICK_LINK } from '@/components/settings/DataModuleCard';
import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import {
  dashboardViewPath,
  persistDashboardInitialView,
  type DashboardViewId,
} from '@/lib/dashboard/views';
import { DEFAULT_CLINIC_SETTINGS, type ClinicSettings } from '@/lib/settings/types';
import {
  Building2,
  CalendarClock,
  Coins,
  Database,
  Link2,
  RotateCcw,
  Save,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ClinicSettingsPanel() {
  const router = useRouter();
  const [canImportModules, setCanImportModules] = useState(false);
  const [settings, setSettings] = useState<ClinicSettings>(() => ({
    ...DEFAULT_CLINIC_SETTINGS,
  }));

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
        const me = (await res.json()) as { kind?: string; routeGroup?: string };
        if (me?.kind === 'admin' && me.routeGroup === 'admin_only') {
          setCanImportModules(true);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchClinicResource<ClinicSettings>('clinic-settings');
        startTransition(() => {
          setSettings({ ...DEFAULT_CLINIC_SETTINGS, ...data });
        });
      } catch {
        startTransition(() => setSettings({ ...DEFAULT_CLINIC_SETTINGS }));
      }
    })();
  }, []);

  const patch = useCallback(<K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const save = useCallback(() => {
    void (async () => {
      try {
        await saveClinicResource('clinic-settings', settings);
        toast.success('Sozlamalar saqlandi', {
          description: 'MongoDB serverida yangilandi.',
        });
      } catch {
        toast.error('Saqlab bo‘lmadi', { description: 'Server yoki tarmoqni tekshiring.' });
      }
    })();
  }, [settings]);

  const resetDefaults = useCallback(() => {
    setSettings({ ...DEFAULT_CLINIC_SETTINGS });
    toast.message('Maydonlar tozalandi', {
      description: 'Saqlash uchun «Saqlash» tugmasini bosing.',
    });
  }, []);

  const tabCard =
    'rounded-2xl border border-white/80 bg-white/85 p-5 shadow-lg shadow-slate-200/40 backdrop-blur md:p-6';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-violet-200/50 bg-linear-to-br from-white via-violet-50/35 to-indigo-50/40 p-6 shadow-xl shadow-violet-200/30 backdrop-blur md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/90">
              Klinika boshqaruvi
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Sozlamalar markazi
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Rejalashtirish, moliyaviy hujjatlar va xavfsizlik — barchasi bitta joyda.
              Qiymatlar MongoDB serverida saqlanadi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-slate-200 bg-white/80"
              onClick={resetDefaults}>
              <RotateCcw className="size-4" />
              Standart
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 shadow-md shadow-violet-500/25"
              onClick={save}>
              <Save className="size-4" />
              Saqlash
            </Button>
          </div>
        </div>
      </section>

      <Tabs defaultValue="general" className="gap-6">
        <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex h-auto min-w-min flex-nowrap gap-1 rounded-2xl border border-white/70 bg-white/70 p-1.5 shadow-inner shadow-slate-200/50">
            <TabsTrigger
              value="general"
              className="rounded-xl px-4 py-2.5 data-[state=active]:bg-linear-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Building2 className="size-4" />
              Umumiy
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="rounded-xl px-4 py-2.5 data-[state=active]:bg-linear-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
              <CalendarClock className="size-4" />
              Ish rejimi
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="rounded-xl px-4 py-2.5 data-[state=active]:bg-linear-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Coins className="size-4" />
              Moliya
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="rounded-xl px-4 py-2.5 data-[state=active]:bg-linear-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Link2 className="size-4" />
              Integratsiya
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-xl px-4 py-2.5 data-[state=active]:bg-linear-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Shield className="size-4" />
              Xavfsizlik
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="rounded-xl px-4 py-2.5 data-[state=active]:bg-linear-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Database className="size-4" />
              Ma&apos;lumotlar
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className={tabCard}>
          <h2 className="text-lg font-semibold text-slate-900">Klinika profili</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hisobotlar, cheklar va tibbiy hujjatlarda chiqadigan asosiy ma&apos;lumotlar.
          </p>
          <Separator className="my-5 bg-slate-200/80" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Klinika nomi (qisqa)</Label>
              <Input
                id="clinicName"
                value={settings.clinicName}
                onChange={(e) => patch('clinicName', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Yuridik nom</Label>
              <Input
                id="legalName"
                value={settings.legalName}
                onChange={(e) => patch('legalName', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inn">STIR / INN</Label>
              <Input
                id="inn"
                value={settings.inn}
                onChange={(e) => patch('inn', e.target.value)}
                placeholder="000000000"
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Aloqa telefoni</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => patch('phone', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Elektron pochta</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => patch('email', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Veb-sayt</Label>
              <Input
                id="website"
                value={settings.website}
                onChange={(e) => patch('website', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Manzil</Label>
              <Textarea
                id="address"
                rows={2}
                value={settings.address}
                onChange={(e) => patch('address', e.target.value)}
                className="min-h-[80px] rounded-xl border-violet-200/80"
              />
            </div>
            <div className="space-y-2">
              <Label>Vaqt zonasi</Label>
              <Select
                value={settings.timezone}
                onValueChange={(v) => patch('timezone', v)}
>
                <SelectTrigger
                  className="rounded-xl border-violet-200/80"
                  aria-label="Vaqt zonasi"
                  title="Vaqt zonasi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Tashkent">Asia/Tashkent (O‘zbekiston)</SelectItem>
                  <SelectItem value="Asia/Samarkand">Asia/Samarqand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interfeys tili</Label>
              <Select
                value={settings.locale}
                onValueChange={(v) => patch('locale', v as ClinicSettings['locale'])}
>
                <SelectTrigger
                  className="rounded-xl border-violet-200/80"
                  aria-label="Interfeys tili"
                  title="Interfeys tili">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uz">O‘zbek (lotin)</SelectItem>
                  <SelectItem value="uz-Cyrl">Ўзбек (кирилл)</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className={tabCard}>
          <h2 className="text-lg font-semibold text-slate-900">Ish vaqti va navbat</h2>
          <p className="mt-1 text-sm text-slate-500">
            <Link href="/appointments" className="font-medium text-violet-600 hover:underline">
              Navbat
            </Link>{' '}
            moduli uchun slot va yuklama chegaralari.
          </p>
          <Separator className="my-5 bg-slate-200/80" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="open">Dush–Juma: ochilish</Label>
              <Input
                id="open"
                type="time"
                value={settings.workDayOpen}
                onChange={(e) => patch('workDayOpen', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="close">Dush–Juma: yopilish</Label>
              <Input
                id="close"
                type="time"
                value={settings.workDayClose}
                onChange={(e) => patch('workDayClose', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-slate-800">Shanba qabuli</p>
                <p className="text-xs text-slate-500">Cheklangan smena</p>
              </div>
              <Switch
                checked={settings.saturdayEnabled}
                onCheckedChange={(c) => patch('saturdayEnabled', c)}
              />
            </div>
            {settings.saturdayEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="satOpen">Shanba: ochilish</Label>
                  <Input
                    id="satOpen"
                    type="time"
                    value={settings.workSaturdayOpen}
                    onChange={(e) => patch('workSaturdayOpen', e.target.value)}
                    className="rounded-xl border-violet-200/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="satClose">Shanba: yopilish</Label>
                  <Input
                    id="satClose"
                    type="time"
                    value={settings.workSaturdayClose}
                    onChange={(e) => patch('workSaturdayClose', e.target.value)}
                    className="rounded-xl border-violet-200/80"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Navbat sloti</Label>
              <Select
                value={String(settings.slotMinutes)}
                onValueChange={(v) => patch('slotMinutes', Number(v) as ClinicSettings['slotMinutes'])}
>
                <SelectTrigger
                  className="rounded-xl border-violet-200/80"
                  aria-label="Navbat sloti"
                  title="Navbat sloti">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 daqiqa</SelectItem>
                  <SelectItem value="15">15 daqiqa</SelectItem>
                  <SelectItem value="20">20 daqiqa</SelectItem>
                  <SelectItem value="30">30 daqiqa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDay">Kuniga maks. qabul</Label>
              <Input
                id="maxDay"
                type="number"
                min={10}
                max={500}
                value={settings.maxAppointmentsPerDay}
                onChange={(e) => patch('maxAppointmentsPerDay', Number.parseInt(e.target.value, 10) || 0)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="finance" className={tabCard}>
          <h2 className="text-lg font-semibold text-slate-900">Moliya va hujjatlar</h2>
          <p className="mt-1 text-sm text-slate-500">
            <Link href="/services" className="font-medium text-violet-600 hover:underline">
              Xizmatlar narxlari
            </Link>{' '}
            va chek / hisob-faktura prefikslari.
          </p>
          <Separator className="my-5 bg-slate-200/80" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Valyuta ko‘rinishi</Label>
              <Select
                value={settings.defaultServiceCurrency}
                onValueChange={(v) => patch('defaultServiceCurrency', v as ClinicSettings['defaultServiceCurrency'])}
>
                <SelectTrigger
                  className="rounded-xl border-violet-200/80"
                  aria-label="Valyuta ko‘rinishi"
                  title="Valyuta ko‘rinishi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UZS">So‘m (UZS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">QQS bilan narx</p>
                <p className="text-xs text-slate-500">Katalogda qo‘shimcha ustun</p>
              </div>
              <Switch
                checked={settings.showPricesWithVat}
                onCheckedChange={(c) => patch('showPricesWithVat', c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invPrefix">Hisob-faktura prefiksi</Label>
              <Input
                id="invPrefix"
                value={settings.invoicePrefix}
                onChange={(e) => patch('invoicePrefix', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="footer">Chek / hujjat pastki matni</Label>
              <Textarea
                id="footer"
                rows={3}
                value={settings.invoiceLegalFooter}
                onChange={(e) => patch('invoiceLegalFooter', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className={tabCard}>
          <h2 className="text-lg font-semibold text-slate-900">Integratsiya</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tashqi tizimlar bilan aloqa (keyinchalik server API orqali yoqiladi).
          </p>
          <Separator className="my-5 bg-slate-200/80" />
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-800">O‘qish API</p>
                <p className="text-xs text-slate-500">Hisobotlar uchun xavfsiz token rejimi</p>
              </div>
              <Switch
                checked={settings.apiReadEnabled}
                onCheckedChange={(c) => patch('apiReadEnabled', c)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook URL</Label>
              <Input
                id="webhook"
                placeholder="https://api.sizning-crm.uz/hooks/gormonik"
                value={settings.webhookUrl}
                onChange={(e) => patch('webhookUrl', e.target.value)}
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <p className="rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
              Hozircha faqat sozlamalar saqlanadi. Chiqish so‘rovlari backend ulanganda faollashadi.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="security" className={tabCard}>
          <h2 className="text-lg font-semibold text-slate-900">Xavfsizlik</h2>
          <p className="mt-1 text-sm text-slate-500">Sessiya, audit va kirish qoidalari.</p>
          <Separator className="my-5 bg-slate-200/80" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sess">Sessiya vaqti (daq.)</Label>
              <Input
                id="sess"
                type="number"
                min={5}
                max={240}
                value={settings.sessionTimeoutMinutes}
                onChange={(e) =>
                  patch('sessionTimeoutMinutes', Number.parseInt(e.target.value, 10) || 45)
                }
                className="rounded-xl border-violet-200/80"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">2FA majburiy</p>
                <p className="text-xs text-slate-500">Administratorlar uchun</p>
              </div>
              <Switch
                checked={settings.twoFactorEnforced}
                onCheckedChange={(c) => patch('twoFactorEnforced', c)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-slate-800">Audit jurnali</p>
                <p className="text-xs text-slate-500">Muhim o‘zgarishlarni qayd etish</p>
              </div>
              <Switch
                checked={settings.auditLogEnabled}
                onCheckedChange={(c) => patch('auditLogEnabled', c)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ret">Tibbiy kartoteka saqlanishi (oy)</Label>
              <Input
                id="ret"
                type="number"
                min={12}
                max={240}
                value={settings.retentionMonths}
                onChange={(e) => patch('retentionMonths', Number.parseInt(e.target.value, 10) || 60)}
                className="max-w-xs rounded-xl border-violet-200/80"
              />
              <p className="text-xs text-slate-500">Huquqiy talablar bo‘yicha shaxsiy ma&apos;lumotlar muddati.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data" className={tabCard}>
          <h2 className="text-lg font-semibold text-slate-900">Ma&apos;lumotlar va modullar</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tezkor havolalar — sozlamalar bilan bog‘langan bo‘limlar.
          </p>
          <Separator className="my-3 bg-slate-200/80" />
          <div className={DATA_MODULE_QUICK_GRID}>
            {(
              [
                { href: '/patients', label: 'Bemorlar', desc: 'Kartoteka va rozilik' },
                { href: '/appointments', label: 'Navbat', desc: 'Slot va yuklama' },
                { href: '/services', label: 'Xizmatlar', desc: 'Narxlar katalogi' },
                {
                  href: '/dashboard',
                  dashboardView: 'reports' as DashboardViewId,
                  label: 'Hisobotlar',
                  desc: 'Moliyaviy ko‘rinish',
                },
                {
                  href: '/dashboard',
                  dashboardView: 'contracts' as DashboardViewId,
                  label: 'Shartnomalar',
                  desc: 'Xarajat manbalari',
                },
                {
                  href: '/dashboard',
                  dashboardView: 'products' as DashboardViewId,
                  label: 'Mahsulotlar',
                  desc: 'Farmatsiya',
                },
                { href: '/users/admins', label: 'Administratorlar', desc: 'Kirish huquqlari' },
                { href: '/settings', label: 'Sozlamalar', desc: 'Joriy sahifa' },
              ] as const
            ).map((l) =>
              'dashboardView' in l ?
                <button
                  key={l.label}
                  type="button"
                  onClick={() => {
                    persistDashboardInitialView(l.dashboardView);
                    router.push(dashboardViewPath(l.dashboardView));
                  }}
                  className={`${DATA_MODULE_QUICK_LINK} text-left`}>
                  <p className="truncate text-xs font-semibold text-slate-800">{l.label}</p>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">{l.desc}</p>
                </button>
              : <Link
                  key={l.href}
                  href={l.href}
                  className={DATA_MODULE_QUICK_LINK}>
                  <p className="truncate text-xs font-semibold text-slate-800">{l.label}</p>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">{l.desc}</p>
                </Link>,
            )}
          </div>
          <Separator className="my-4 bg-slate-200/80" />
          <h3 className="text-sm font-semibold text-slate-900">Ma&apos;lumotlar bazasi modullari</h3>
          <p className="mt-0.5 mb-2 text-xs text-slate-500">
            Har bir modulni alohida JSON fayl sifatida yuklab oling yoki tiklang.
          </p>
          <ClinicDataModulesPanel canImport={canImportModules} />
          <Separator className="my-4 bg-slate-200/80" />
          <h3 className="text-sm font-semibold text-slate-900">Kassa tizimi modullari</h3>
          <p className="mt-0.5 mb-2 text-xs text-slate-500">
            Kassa bazasi — alohida eksport va import.
          </p>
          <KassaDataModulesPanel canImport={canImportModules} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
