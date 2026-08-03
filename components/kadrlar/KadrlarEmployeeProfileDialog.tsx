'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { KadrlarDepartmentUser } from '@/lib/kadrlar/department-users';
import { ExternalLink, Loader2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: KadrlarDepartmentUser | null;
  onSaved: () => void;
};

export default function KadrlarEmployeeProfileDialog({
  open,
  onOpenChange,
  employee,
  onSaved,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [activityDirection, setActivityDirection] = useState('');
  const [address, setAddress] = useState('');
  const [objektivkaPath, setObjektivkaPath] = useState('');
  const [objektivkaFileName, setObjektivkaFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open || !employee) return;
    setFirstName(employee.firstName);
    setLastName(employee.lastName);
    setBirthDate(employee.birthDate || '');
    setActivityDirection(employee.activityDirection);
    setAddress(employee.address);
    setObjektivkaPath(employee.objektivkaPath);
    setObjektivkaFileName(employee.objektivkaFileName);
  }, [open, employee]);

  async function handleSave() {
    if (!employee) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Ism va familiya kiritilishi shart');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/kadrlar/employee-profiles', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          staffKind: employee.staffKind,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: birthDate.trim(),
          activityDirection: activityDirection.trim(),
          address: address.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; profile?: { birthDate?: string } };
      if (!res.ok) {
        toast.error(data.error || 'Saqlashda xatolik');
        return;
      }
      if (data.profile?.birthDate) {
        setBirthDate(data.profile.birthDate);
      }
      toast.success('Ma’lumotlar saqlandi');
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Tarmoq xatoligi');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    if (!employee) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('employeeId', employee.id);
      formData.set('staffKind', employee.staffKind);

      const res = await fetch('/api/kadrlar/objektivka', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = (await res.json()) as {
        error?: string;
        objektivkaPath?: string;
        objektivkaFileName?: string;
      };
      if (!res.ok) {
        toast.error(data.error || 'Yuklashda xatolik');
        return;
      }
      setObjektivkaPath(data.objektivkaPath || '');
      setObjektivkaFileName(data.objektivkaFileName || file.name);
      toast.success('Obyektivka yuklandi');
      onSaved();
    } catch {
      toast.error('Tarmoq xatoligi');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Xodim ma’lumotlari</DialogTitle>
        </DialogHeader>

        {employee ?
          <div className="space-y-4 py-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kadrlar-first-name">Ism</Label>
                <Input
                  id="kadrlar-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ism"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kadrlar-last-name">Familiya</Label>
                <Input
                  id="kadrlar-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Familiya"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kadrlar-birth-date">Tug‘ilgan sana</Label>
              <Input
                id="kadrlar-birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kadrlar-address">Manzil</Label>
              <Textarea
                id="kadrlar-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Yashash manzili"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kadrlar-activity">Ish faoliyati yo‘nalishi</Label>
              <Textarea
                id="kadrlar-activity"
                value={activityDirection}
                onChange={(e) => setActivityDirection(e.target.value)}
                placeholder="Lavozim, mutaxassislik yoki faoliyat yo‘nalishi"
                rows={3}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-medium text-slate-800">Obyektivka</p>
              {objektivkaPath ?
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-600">
                    {objektivkaFileName || 'Yuklangan fayl'}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <a href={objektivkaPath} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 size-3.5" />
                      Ochish
                    </a>
                  </Button>
                </div>
              : <p className="mt-1 text-xs text-slate-500">
                  Hali obyektivka yuklanmagan
                </p>
              }

              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}>
                {uploading ?
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Yuklanmoqda…
                  </>
                : <>
                    <Upload className="mr-1.5 size-3.5" />
                    Obyektivka yuklash
                  </>
                }
              </Button>
            </div>
          </div>
        : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || uploading}>
            Bekor qilish
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || uploading}>
            {saving ?
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Saqlanmoqda…
              </>
            : 'Saqlash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
