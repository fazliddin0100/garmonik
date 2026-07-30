'use client';

import { Button } from '@/components/ui/button';
import HeadNurseMedicationPanel from '@/components/head-nurse/HeadNurseMedicationPanel';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { HeadNurseData } from '@/components/head-nurse/useHeadNurseData';
import type { PatientRow } from '@/lib/patients/types';
import { formatAdmissionDate, todayDateIso } from '@/lib/inpatient/utils';
import type { InpatientFollowUpEntry } from '@/lib/inpatient/types';
import { ArrowLeft, Phone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function HomeMonitoringPanel({ data }: { data: HeadNurseData }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [followNote, setFollowNote] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => data.monitoringAdmissions.find((a) => a.id === selectedId) ?? null,
    [data.monitoringAdmissions, selectedId],
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

  async function addFollowUp() {
    if (!selected || !followNote.trim()) {
      toast.error('Kuzatuv yozuvini kiriting');
      return;
    }
    setSaving(true);
    try {
      const entry: InpatientFollowUpEntry = {
        id: crypto.randomUUID(),
        date: todayDateIso(),
        note: followNote.trim(),
        recordedByName: data.actorName || undefined,
      };
      const nextAdmissions = data.admissions.map((a) =>
        a.id === selected.id ?
          { ...a, homeFollowUps: [entry, ...a.homeFollowUps] }
        : a,
      );
      await data.persistAll(data.patients, nextAdmissions, data.rooms);
      toast.success('Kuzatuv yozuvi saqlandi');
      setFollowNote('');
    } catch {
      toast.error('Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  }

  async function completeMonitoring() {
    if (!selected) return;
    setSaving(true);
    try {
      const nextAdmissions = data.admissions.map((a) =>
        a.id === selected.id ? { ...a, status: 'discharged' as const } : a,
      );
      await data.persistAll(data.patients, nextAdmissions, data.rooms);
      toast.success('Kuzatuv yakunlandi');
      setSelectedId(null);
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
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedId(null)}>
          <ArrowLeft className="mr-1 size-4" />
          Ro‘yxatga qaytish
        </Button>

        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{selected.patientName}</h2>
          {selected.contact ?
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
              <Phone className="size-4" />
              {selected.contact}
            </p>
          : null}
          {selected.dischargeAt ?
            <p className="mt-1 text-xs text-slate-500">
              Chiqarilgan: {formatAdmissionDate(selected.dischargeAt)}
            </p>
          : null}
          {selected.homeMonitoringPlan ?
            <div className="mt-4 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900">
              <p className="font-medium">Kuzatuv rejasi</p>
              <p className="mt-1 whitespace-pre-wrap">{selected.homeMonitoringPlan}</p>
            </div>
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

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <Label>Yangi kuzatuv yozuvi</Label>
          <Textarea
            className="mt-2"
            value={followNote}
            onChange={(e) => setFollowNote(e.target.value)}
            rows={3}
            placeholder="Telefon qo‘ng‘irog‘i, holati, shikoyatlar, tavsiyalar..."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-violet-600 hover:bg-violet-700"
              disabled={saving}
              onClick={() => void addFollowUp()}>
              Saqlash
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void completeMonitoring()}>
              Kuzatuvni yakunlash
            </Button>
          </div>
        </div>

        {selected.homeFollowUps.length > 0 ?
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-500">Kuzatuv tarixi</h3>
            {selected.homeFollowUps.map((f) => (
              <div key={f.id} className="rounded-xl border bg-slate-50 px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">
                  {f.date}
                  {f.recordedByName ? ` · ${f.recordedByName}` : ''}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{f.note}</p>
              </div>
            ))}
          </div>
        : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Statsionardan chiqarilgan bemorlarni uyidan kuzatish — telefon qo‘ng‘iroqlari va holat
        yozuvlari.
      </p>

      {data.monitoringAdmissions.length === 0 ?
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-500">
          Uy kuzatuvidagi bemor yo‘q
        </div>
      : <div className="grid gap-3 sm:grid-cols-2">
          {data.monitoringAdmissions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              className="rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-violet-200">
              <p className="font-semibold text-slate-900">{a.patientName}</p>
              <p className="text-sm text-violet-700">
                Kuzatuv yozuvlari: {a.homeFollowUps.length}
              </p>
              {a.contact ?
                <p className="mt-1 text-xs text-slate-500">{a.contact}</p>
              : null}
            </button>
          ))}
        </div>
      }
    </div>
  );
}
