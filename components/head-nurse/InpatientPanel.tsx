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
import { useHeadNurseView } from '@/components/head-nurse/HeadNurseViewContext';
import HeadNurseMedicationPanel from '@/components/head-nurse/HeadNurseMedicationPanel';
import type { HeadNurseData } from '@/components/head-nurse/useHeadNurseData';
import type { PatientRow } from '@/lib/patients/types';
import { formatAdmissionDate, nowTimeHm, todayDateIso } from '@/lib/inpatient/utils';
import type { InpatientAdmission, InpatientRoundEntry } from '@/lib/inpatient/types';
import { ArrowLeft, ClipboardPlus, Home, Stethoscope } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function InpatientPanel({ data }: { data: HeadNurseData }) {
  const { focusAdmissionId } = useHeadNurseView();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeNote, setDischargeNote] = useState('');
  const [monitoringPlan, setMonitoringPlan] = useState('');
  const [saving, setSaving] = useState(false);

  const [roundNote, setRoundNote] = useState('');
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [temp, setTemp] = useState('');
  const [spo2, setSpo2] = useState('');

  useEffect(() => {
    if (focusAdmissionId) setSelectedId(focusAdmissionId);
  }, [focusAdmissionId]);

  const selected = useMemo(
    () => data.activeAdmissions.find((a) => a.id === selectedId) ?? null,
    [data.activeAdmissions, selectedId],
  );

  const patient = useMemo(
    () => (selected ? data.patients.find((p) => p.id === selected.patientId) ?? null : null),
    [data.patients, selected],
  );

  async function savePatientUpdate(updatedPatient: PatientRow) {
    const nextPatients = data.patients.map((p) =>
      p.id === updatedPatient.id ? updatedPatient : p,
    );
    await data.persistAll(nextPatients, data.admissions, data.rooms);
  }

  async function saveRound() {
    if (!selected) return;
    if (!roundNote.trim() && !bp && !pulse && !temp && !spo2) {
      toast.error('Ko‘riq yozuvi yoki ko‘rsatkich kiriting');
      return;
    }
    setSaving(true);
    try {
      const entry: InpatientRoundEntry = {
        id: crypto.randomUUID(),
        date: todayDateIso(),
        time: nowTimeHm(),
        vitals: {
          bp: bp.trim() || undefined,
          pulse: pulse.trim() || undefined,
          temp: temp.trim() || undefined,
          spo2: spo2.trim() || undefined,
        },
        note: roundNote.trim() || 'Kunlik ko‘riq',
        recordedByName: data.actorName || undefined,
        recordedByLogin: data.actorLogin || undefined,
      };
      const nextAdmissions = data.admissions.map((a) =>
        a.id === selected.id ?
          { ...a, dailyRounds: [entry, ...a.dailyRounds] }
        : a,
      );
      await data.persistAll(data.patients, nextAdmissions, data.rooms);
      toast.success('Kunlik ko‘riq saqlandi');
      setRoundNote('');
      setBp('');
      setPulse('');
      setTemp('');
      setSpo2('');
    } catch {
      toast.error('Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  }

  async function dischargeToHomeMonitoring() {
    if (!selected) return;
    setSaving(true);
    try {
      const nextAdmissions = data.admissions.map((a) =>
        a.id === selected.id ?
          {
            ...a,
            status: 'home_monitoring' as const,
            dischargeAt: new Date().toISOString(),
            dischargeNote: dischargeNote.trim() || undefined,
            homeMonitoringPlan: monitoringPlan.trim() || undefined,
          }
        : a,
      );
      await data.persistAll(data.patients, nextAdmissions, data.rooms);
      toast.success('Bemor uyga kuzatuvga o‘tkazildi');
      setDischargeOpen(false);
      setSelectedId(null);
      setDischargeNote('');
      setMonitoringPlan('');
    } catch {
      toast.error('Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  }

  if (data.loading) {
    return <p className="text-sm text-slate-500">Yuklanmoqda…</p>;
  }

  if (selected) {
    const labCount = patient?.laboratoryResults?.filter((r) => r.value.trim()).length ?? 0;
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => setSelectedId(null)}>
          <ArrowLeft className="mr-1 size-4" />
          Ro‘yxatga qaytish
        </Button>

        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{selected.patientName}</h2>
              <p className="text-sm text-slate-500">
                {selected.roomName}
                {selected.bedLabel ? ` · ${selected.bedLabel}` : ''} ·{' '}
                {formatAdmissionDate(selected.admittedAt)}
              </p>
              {selected.plannedStayUntil ?
                <p className="text-sm text-rose-700">
                  Rejalashtirilgan chiqish:{' '}
                  {new Date(`${selected.plannedStayUntil}T12:00:00`).toLocaleDateString('uz-UZ')}
                </p>
              : null}
              {selected.diseaseType ?
                <p className="mt-1 text-sm text-slate-600">{selected.diseaseType}</p>
              : null}
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-violet-200 text-violet-800"
              onClick={() => setDischargeOpen(true)}>
              <Home className="mr-1.5 size-4" />
              Uyga kuzatuv
            </Button>
          </div>

          {patient?.queueClinicalNote ?
            <div className="mt-4 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900">
              <span className="font-medium">Shifokor eslatmasi: </span>
              {patient.queueClinicalNote}
            </div>
          : null}

          {labCount > 0 ?
            <p className="mt-3 text-sm text-emerald-700">
              <Stethoscope className="mr-1 inline size-4" />
              {labCount} ta tahlil natijasi mavjud
            </p>
          : null}
        </div>

        {patient ?
          <HeadNurseMedicationPanel
            patient={patient}
            patientName={selected.patientName}
            actorName={data.actorName}
            actorLogin={data.actorLogin}
            saving={saving}
            onSavePatient={savePatientUpdate}
          />
        : null}

        <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <ClipboardPlus className="size-5 text-rose-600" />
            Kunlik ko‘riq — yangi yozuv
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1.5">
              <Label>Bosim (mm sim.ust.)</Label>
              <Input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" />
            </div>
            <div className="grid gap-1.5">
              <Label>Puls</Label>
              <Input value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="72" />
            </div>
            <div className="grid gap-1.5">
              <Label>Harorat °C</Label>
              <Input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="36.6" />
            </div>
            <div className="grid gap-1.5">
              <Label>SpO₂ %</Label>
              <Input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="98" />
            </div>
          </div>
          <div className="mt-3 grid gap-1.5">
            <Label>Ko‘riq va kuzatuv</Label>
            <Textarea
              value={roundNote}
              onChange={(e) => setRoundNote(e.target.value)}
              rows={3}
              placeholder="Holati, shikoyatlar, berilgan dori-darmonlar..."
            />
          </div>
          <Button
            type="button"
            className="mt-3 bg-rose-600 hover:bg-rose-700"
            disabled={saving}
            onClick={() => void saveRound()}>
            {saving ? 'Saqlanmoqda…' : 'Ko‘riqni saqlash'}
          </Button>
        </div>

        {selected.dailyRounds.length > 0 ?
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Oldingi ko‘riqlar
            </h3>
            {selected.dailyRounds.map((round) => (
              <div
                key={round.id}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">
                  {round.date} · {round.time}
                  {round.recordedByName ? ` · ${round.recordedByName}` : ''}
                </p>
                {round.vitals && (round.vitals.bp || round.vitals.pulse || round.vitals.temp) ?
                  <p className="mt-1 text-slate-600">
                    {[
                      round.vitals.bp && `BP ${round.vitals.bp}`,
                      round.vitals.pulse && `Puls ${round.vitals.pulse}`,
                      round.vitals.temp && `T ${round.vitals.temp}°C`,
                      round.vitals.spo2 && `SpO₂ ${round.vitals.spo2}%`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                : null}
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{round.note}</p>
              </div>
            ))}
          </div>
        : null}

        <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Uyga kuzatuvga o‘tkazish</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label>Chiqarish eslatmasi</Label>
                <Textarea
                  value={dischargeNote}
                  onChange={(e) => setDischargeNote(e.target.value)}
                  rows={2}
                  placeholder="Statsionardan chiqarish holati..."
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Uyda kuzatuv rejasi</Label>
                <Textarea
                  value={monitoringPlan}
                  onChange={(e) => setMonitoringPlan(e.target.value)}
                  rows={3}
                  placeholder="Dori-darmon, qayta ko‘rik vaqti, qo‘ng‘iroq jadvali..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDischargeOpen(false)}>
                Bekor qilish
              </Button>
              <Button
                type="button"
                className="bg-violet-600 hover:bg-violet-700"
                disabled={saving}
                onClick={() => void dischargeToHomeMonitoring()}>
                Uyga kuzatuv
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Statsionardagi bemorlar — kunlik ko‘riq, vital ko‘rsatkichlar va kuzatuv yozuvlari.
      </p>

      {data.activeAdmissions.length === 0 ?
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-500">
          Hozircha statsionarda bemor yo‘q
        </div>
      : <div className="grid gap-3 sm:grid-cols-2">
          {data.activeAdmissions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              className="rounded-2xl border border-white/70 bg-white p-4 text-left shadow-sm transition hover:border-rose-200 hover:shadow-md">
              <p className="font-semibold text-slate-900">{a.patientName}</p>
              <p className="text-sm text-rose-700">{a.roomName}</p>
              <p className="mt-1 text-xs text-slate-500">
                Ko‘riqlar: {a.dailyRounds.length} · {formatAdmissionDate(a.admittedAt)}
              </p>
            </button>
          ))}
        </div>
      }
    </div>
  );
}
