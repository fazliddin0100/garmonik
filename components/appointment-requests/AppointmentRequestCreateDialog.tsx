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
import { Textarea } from '@/components/ui/textarea';
import { UzPhoneInput } from '@/components/ui/uz-phone-input';
import { isValidUzPhoneE164 } from '@/lib/phone/uz-phone';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export type AppointmentRequestCreatePayload = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  diseaseType: string;
  preferredTime?: string;
};

type AppointmentRequestCreateDialogProps = {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AppointmentRequestCreatePayload) => void | Promise<void>;
};

export default function AppointmentRequestCreateDialog({
  open,
  saving,
  onOpenChange,
  onSubmit,
}: AppointmentRequestCreateDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [diseaseType, setDiseaseType] = useState('');

  useEffect(() => {
    if (!open) return;
    setFirstName('');
    setLastName('');
    setPhone('');
    setAddress('');
    setDiseaseType('');
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Ism va familiyani kiriting');
      return;
    }
    if (!isValidUzPhoneE164(phone)) {
      toast.error('Telefon raqamini to‘liq kiriting');
      return;
    }
    if (!address.trim()) {
      toast.error('Yashash manzilini kiriting');
      return;
    }
    if (!diseaseType.trim()) {
      toast.error('Murojaat sababini kiriting');
      return;
    }

    await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone,
      address: address.trim(),
      diseaseType: diseaseType.trim(),
      preferredTime: 'Klinikada',
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi bemor qo‘shish</DialogTitle>
          <DialogDescription>
            Klinikaga o‘zi kelgan bemorni onlayn navbatga qo‘shing. Keyin
            «Qabul qilindi» orqali asosiy navbatga o‘tkazing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="walkin-firstName">Ism *</Label>
              <Input
                id="walkin-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ali"
                autoComplete="given-name"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="walkin-lastName">Familiya *</Label>
              <Input
                id="walkin-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Valiyev"
                autoComplete="family-name"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkin-phone">Telefon raqami *</Label>
            <UzPhoneInput
              id="walkin-phone"
              value={phone}
              onChange={setPhone}
              className="max-w-none"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkin-address">Yashash manzili *</Label>
            <Input
              id="walkin-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Toshkent, Chilonzor..."
              autoComplete="street-address"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkin-diseaseType">
              Murojaat sababi / kasallik turi *
            </Label>
            <Textarea
              id="walkin-diseaseType"
              value={diseaseType}
              onChange={(e) => setDiseaseType(e.target.value)}
              placeholder="Masalan: gormon tekshiruvi..."
              rows={3}
              className="resize-none"
              disabled={saving}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Navbatga qo‘shish'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
