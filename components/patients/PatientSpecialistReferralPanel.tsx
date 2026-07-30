'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  formatSpecialistConsultationSavedAt,
  getPatientSpecialistConsultations,
  getPatientSpecialistReferrals,
  getSpecialistConsultationForPatient,
  getSpecialistReferralForPatient,
  NARROW_SPECIALISTS,
  type NarrowSpecialistDef,
} from '@/lib/patients/specialist-consultation';
import type { PatientRow } from '@/lib/patients/types';
import {
  Activity,
  Brain,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Heart,
  Microscope,
  Scan,
  Stethoscope,
  Syringe,
  Utensils,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type PatientSpecialistReferralPanelProps = {
  patient: PatientRow;
  saving?: boolean;
  onRefer: (
    specialistId: string,
    specialistLabel: string,
    referralNote: string,
  ) => void | Promise<void>;
};

const SPECIALIST_ICONS: Partial<
  Record<NarrowSpecialistDef['id'], typeof Stethoscope>
> = {
  uzi: Scan,
  surgeon: Syringe,
  cardiologist: Heart,
  neurologist: Brain,
  ophthalmologist: Eye,
  radiologist: Scan,
  endocrinologist: Activity,
  gastroenterologist: Utensils,
  physiotherapist: Activity,
  dietitian: Utensils,
  anesthesiologist: Syringe,
  psychiatrist: Brain,
};

function SpecialistIcon({ specialistId }: { specialistId: string }) {
  const Icon = SPECIALIST_ICONS[specialistId as NarrowSpecialistDef['id']] ?? Stethoscope;
  return <Icon className="size-5 shrink-0 text-violet-700" />;
}

export default function PatientSpecialistReferralPanel({
  patient,
  saving = false,
  onRefer,
}: PatientSpecialistReferralPanelProps) {
  const referrals = useMemo(() => getPatientSpecialistReferrals(patient), [patient]);
  const consultations = useMemo(() => getPatientSpecialistConsultations(patient), [patient]);
  const [activeSpecialist, setActiveSpecialist] = useState<NarrowSpecialistDef | null>(null);
  const [referralNote, setReferralNote] = useState('');

  const pendingCount = referrals.filter((item) => item.status === 'pending').length;
  const completedCount = consultations.filter((item) => item.consultationText.trim()).length;

  function openReferDialog(specialist: NarrowSpecialistDef) {
    const existing = getSpecialistReferralForPatient(patient, specialist.id);
    setActiveSpecialist(specialist);
    setReferralNote(existing?.referralNote ?? '');
  }

  function closeDialog() {
    setActiveSpecialist(null);
    setReferralNote('');
  }

  async function handleRefer() {
    if (!activeSpecialist) return;
    await onRefer(activeSpecialist.id, activeSpecialist.label, referralNote);
    closeDialog();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-violet-200/70 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="size-5 shrink-0" />
            <h3 className="font-semibold">Tor doiradagi mutaxassislar konsultatsiyasi</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {patient.fullName} · mutaxassisni tanlang — u o&apos;z kabinetida bemor tekshiruvini
            yakunlaydi
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
            {pendingCount > 0 ?
              <span className="text-amber-700">{pendingCount} ta yo&apos;naltirish kutilmoqda</span>
            : null}
            {completedCount > 0 ?
              <span className="text-emerald-700">{completedCount} ta natija keldi</span>
            : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NARROW_SPECIALISTS.map((specialist) => {
            const referral = getSpecialistReferralForPatient(patient, specialist.id);
            const consultation = getSpecialistConsultationForPatient(patient, specialist.id);
            const hasResult = Boolean(consultation?.consultationText.trim());
            const isPending = referral?.status === 'pending';

            return (
              <button
                key={specialist.id}
                type="button"
                className={`rounded-xl border px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/50 ${
                  hasResult ?
                    'border-emerald-200 bg-emerald-50/40'
                  : isPending ?
                    'border-amber-200 bg-amber-50/40'
                  : 'border-slate-200 bg-slate-50/60'
                }`}
                onClick={() => openReferDialog(specialist)}>
                <div className="flex items-start gap-3">
                  <SpecialistIcon specialistId={specialist.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{specialist.label}</p>
                      {hasResult ?
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      : isPending ?
                        <Clock3 className="size-4 text-amber-600" />
                      : null}
                    </div>
                    {hasResult ?
                      <>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                          {consultation!.consultationText}
                        </p>
                        <p className="mt-1.5 text-[10px] text-slate-500">
                          {formatSpecialistConsultationSavedAt(consultation!.updatedAt)}
                        </p>
                      </>
                    : isPending ?
                      <p className="mt-1 text-xs text-amber-700">
                        Yo&apos;naltirildi — mutaxassis natijasini kiritmoqda
                      </p>
                    : <p className="mt-1 text-xs text-slate-400">Yo&apos;naltirish uchun bosing</p>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {completedCount > 0 ?
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <Microscope className="size-5 shrink-0" />
            <h4 className="font-semibold">Mutaxassislar xulosalari</h4>
          </div>
          <div className="space-y-3">
            {consultations
              .filter((item) => item.consultationText.trim())
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">{item.specialistLabel}</p>
                    <span className="text-xs text-slate-500">
                      {item.consultationDate.split('-').reverse().join('.')}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {item.consultationText}
                  </p>
                  {item.createdByName ?
                    <p className="mt-2 text-xs text-slate-500">{item.createdByName}</p>
                  : null}
                </div>
              ))}
          </div>
        </section>
      : null}

      <Dialog open={activeSpecialist != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              {activeSpecialist ?
                <>
                  <SpecialistIcon specialistId={activeSpecialist.id} />
                  {activeSpecialist.label}ga yo&apos;naltirish
                </>
              : null}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-slate-600">
            Bemor: <span className="font-medium text-slate-900">{patient.fullName}</span>
          </p>

          <div className="grid gap-1.5 py-2">
            <Label htmlFor="referral-note">Yo&apos;naltirish sababi (ixtiyoriy)</Label>
            <Textarea
              id="referral-note"
              value={referralNote}
              onChange={(e) => setReferralNote(e.target.value)}
              rows={4}
              placeholder="Mutaxassis uchun qisqa eslatma..."
              className="rounded-xl bg-white text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={saving} onClick={closeDialog}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-violet-600 hover:bg-violet-700"
              disabled={saving}
              onClick={() => void handleRefer()}>
              {saving ? 'Yuborilmoqda…' : 'Yo\'naltirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
