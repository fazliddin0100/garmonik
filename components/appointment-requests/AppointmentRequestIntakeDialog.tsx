'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { UzPhoneInput } from '@/components/ui/uz-phone-input';
import { isValidUzPhoneE164 } from '@/lib/phone/uz-phone';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export type IntakeDialogRequest = {
  id: string;
  queue_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  disease_type: string;
};

type DoctorOption = {
  id: string;
  fullName: string;
  department: string;
};

export type IntakeDialogSubmitPayload = {
  firstName: string;
  lastName: string;
  fatherName: string;
  gender: string;
  age: string;
  address: string;
  phone: string;
  diseaseType: string;
  referredDoctorUserId: string;
};

type AppointmentRequestIntakeDialogProps = {
  request: IntakeDialogRequest | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: IntakeDialogSubmitPayload) => void | Promise<void>;
};

export default function AppointmentRequestIntakeDialog({
  request,
  open,
  saving,
  onOpenChange,
  onSubmit,
}: AppointmentRequestIntakeDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [diseaseType, setDiseaseType] = useState('');
  const [referredDoctorUserId, setReferredDoctorUserId] = useState('');
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  useEffect(() => {
    if (!open || !request) return;
    setFirstName(request.first_name);
    setLastName(request.last_name);
    setFatherName('');
    setGender('');
    setAge('');
    setAddress(request.address);
    setPhone(request.phone);
    setDiseaseType(request.disease_type);
    setReferredDoctorUserId('');
  }, [open, request]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setDoctorsLoading(true);
      try {
        const res = await fetch('/api/kabinet/doctors', {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = (await res.json()) as {
          items?: DoctorOption[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || 'Shifokorlar yuklanmadi');
        if (!cancelled) setDoctors(json.items ?? []);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : 'Shifokorlar yuklanmadi',
          );
        }
      } finally {
        if (!cancelled) setDoctorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const previewName = useMemo(
    () =>
      [lastName.trim(), firstName.trim(), fatherName.trim()]
        .filter(Boolean)
        .join(' '),
    [fatherName, firstName, lastName],
  );

  function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Ism va familiyani kiriting');
      return;
    }
    if (!fatherName.trim()) {
      toast.error('Otasining ismini kiriting');
      return;
    }
    if (!gender.trim()) {
      toast.error('Jinsini tanlang');
      return;
    }
    if (!age.trim() || !Number.isFinite(Number.parseInt(age, 10))) {
      toast.error('Yoshni kiriting');
      return;
    }
    if (!isValidUzPhoneE164(phone)) {
      toast.error('Telefon raqamini to‘liq kiriting');
      return;
    }
    if (!referredDoctorUserId) {
      toast.error('Shifokorni tanlang');
      return;
    }

    void onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fatherName: fatherName.trim(),
      gender: gender.trim(),
      age: age.trim(),
      address: address.trim(),
      phone,
      diseaseType: diseaseType.trim(),
      referredDoctorUserId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bemor kartasini to‘ldirish</DialogTitle>
          <DialogDescription>
            {request ?
              `Onlayn ariza ${request.queue_number}. Ma’lumotlarni tekshiring va qabul qiling.`
            : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="intake-first-name">Ism *</Label>
            <Input
              id="intake-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intake-last-name">Familiya *</Label>
            <Input
              id="intake-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="intake-father-name">Otasining ismi *</Label>
            <Input
              id="intake-father-name"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intake-gender">Jinsi *</Label>
            <NativeSelect
              id="intake-gender"
              className="w-full"
              value={gender}
              onChange={(e) => setGender(e.target.value)}>
              <NativeSelectOption value="">Tanlang</NativeSelectOption>
              <NativeSelectOption value="Erkak">Erkak</NativeSelectOption>
              <NativeSelectOption value="Ayol">Ayol</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intake-age">Yoshi *</Label>
            <Input
              id="intake-age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Masalan: 34"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="intake-address">Manzil</Label>
            <Input
              id="intake-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="intake-phone">Telefon *</Label>
            <UzPhoneInput
              id="intake-phone"
              value={phone}
              onChange={setPhone}
              className="max-w-none"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="intake-disease">Kasallik turi / sabab</Label>
            <Input
              id="intake-disease"
              value={diseaseType}
              onChange={(e) => setDiseaseType(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="intake-doctor">Yo‘naltiriladigan shifokor *</Label>
            <NativeSelect
              id="intake-doctor"
              className="w-full"
              value={referredDoctorUserId}
              disabled={doctorsLoading}
              onChange={(e) => setReferredDoctorUserId(e.target.value)}>
              <NativeSelectOption value="">
                {doctorsLoading ? 'Yuklanmoqda...' : 'Shifokorni tanlang'}
              </NativeSelectOption>
              {doctors.map((doctor) => (
                <NativeSelectOption key={doctor.id} value={doctor.id}>
                  {doctor.department ?
                    `${doctor.fullName} — ${doctor.department}`
                  : doctor.fullName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-sm text-slate-700">
          <span className="text-slate-500">Karta: </span>
          <span className="font-medium text-slate-900">
            {previewName || '—'}
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            type="button"
            disabled={saving}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleSubmit}>
            {saving ? 'Saqlanmoqda...' : 'Qabul qilish va navbatga qo‘shish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
