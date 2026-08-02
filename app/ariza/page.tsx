'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { UzPhoneInput } from '@/components/ui/uz-phone-input';
import { isValidUzPhoneE164 } from '@/lib/phone/uz-phone';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

type ClinicInfo = {
  name: string;
  logoPath: string;
};

type SubmitResult = {
  queueNumber: string;
  message: string;
};

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatPreferredDateLabel(date: Date): string {
  const weekday = new Intl.DateTimeFormat('uz-UZ', { weekday: 'long' }).format(
    date,
  );
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${weekday}, ${day}.${month}.${year}`;
}

function formatPreferredDateValue(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function ArizaPage() {
  const [clinic, setClinic] = useState<ClinicInfo>({
    name: '',
    logoPath: '',
  });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [diseaseType, setDiseaseType] = useState('');
  const [preferredDate, setPreferredDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);
  const todayStart = useMemo(() => startOfToday(), []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/public/clinic-info', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as ClinicInfo;
        if (json.name) setClinic(json);
      } catch {
        /* default branding */
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Ism va familiyani kiriting');
      return;
    }
    if (!isValidUzPhoneE164(phone)) {
      setError('Telefon raqamini to‘liq kiriting');
      return;
    }
    if (!address.trim()) {
      setError('Yashash manzilini kiriting');
      return;
    }
    if (!diseaseType.trim()) {
      setError('Murojaat sababini kiriting');
      return;
    }

    const preferredTime =
      preferredDate ? formatPreferredDateValue(preferredDate) : undefined;

    setSaving(true);
    try {
      const res = await fetch('/api/public/appointment-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone,
          address: address.trim(),
          diseaseType: diseaseType.trim(),
          preferredTime: preferredTime.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        queueNumber?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || 'Yuborib bo‘lmadi');
      }
      setResult({
        queueNumber: json.queueNumber ?? '',
        message: json.message ?? 'Arizangiz qabul qilindi',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          {clinic.logoPath ?
            <div className="relative mb-3 size-16 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-violet-100">
              <Image
                src={clinic.logoPath}
                alt={clinic.name || 'Klinika'}
                fill
                className="object-contain p-2"
                sizes="64px"
                priority
              />
            </div>
          : null}
          {clinic.name ?
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {clinic.name}
            </h1>
          : null}
          <p className="mt-1 text-sm text-slate-600">
            Qabulga onlayn ariza
          </p>
        </div>

        {result ?
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              ✓
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Ariza qabul qilindi
            </h2>
            <p className="mt-2 text-sm text-slate-600">{result.message}</p>
            {result.queueNumber ?
              <p className="mt-4 rounded-xl bg-violet-50 px-4 py-3 font-mono text-lg font-bold text-violet-800">
                {result.queueNumber}
              </p>
            : null}
            <p className="mt-3 text-xs text-slate-500">
              Qabul bo‘limi tez orada siz bilan bog‘lanadi.
            </p>
          </div>
        : <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Ism *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ali"
                  autoComplete="given-name"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Familiya *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Valiyev"
                  autoComplete="family-name"
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon raqami *</Label>
              <UzPhoneInput
                id="phone"
                value={phone}
                onChange={setPhone}
                className="max-w-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Yashash manzili *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Toshkent, Chilonzor..."
                autoComplete="street-address"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="diseaseType">Murojaat sababi / kasallik turi *</Label>
              <Textarea
                id="diseaseType"
                value={diseaseType}
                onChange={(e) => setDiseaseType(e.target.value)}
                placeholder="Masalan: gormon tekshiruvi, tireoid muammosi..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Qulay sana (ixtiyoriy)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-11 w-full justify-start font-normal',
                      !preferredDate && 'text-slate-500',
                    )}>
                    <CalendarDays className="mr-2 size-4 shrink-0 opacity-60" />
                    <span className="truncate text-left">
                      {preferredDate ?
                        formatPreferredDateLabel(preferredDate)
                      : 'Sanani tanlang'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={preferredDate}
                    onSelect={setPreferredDate}
                    disabled={{ before: todayStart }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-slate-500">
                Ixtiyoriy. Qulay sanani tanlang yoki bo‘sh qoldiring.
              </p>
            </div>

            {error ?
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            : null}

            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full bg-violet-700 hover:bg-violet-800">
              {saving ? 'Yuborilmoqda...' : 'Yuborish'}
            </Button>

            <p className="text-center text-xs text-slate-500">
              Ma&apos;lumotlaringiz faqat qabul bo‘limi ko‘radi.
            </p>
          </form>
        }
      </div>
    </div>
  );
}
