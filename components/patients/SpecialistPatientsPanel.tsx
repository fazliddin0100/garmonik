'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import { loadMergedClinicalPatients } from '@/lib/patients/merge-clinical-patients';
import {
  findNarrowSpecialist,
  formatSpecialistConsultationSavedAt,
  getSpecialistConsultationForPatient,
  getSpecialistReferralForPatient,
  isSpecialistPortalPatient,
  upsertSpecialistConsultation,
  type PatientSpecialistConsultationInput,
} from '@/lib/patients/specialist-consultation';
import type { PatientRow } from '@/lib/patients/types';
import { defaultExaminationDate } from '@/lib/patients/admission-examination';
import { ArrowLeft, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SpecialistPatientsPanelProps = {
  focusPatientId?: string;
};

export default function SpecialistPatientsPanel({ focusPatientId }: SpecialistPatientsPanelProps) {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [actorName, setActorName] = useState('');
  const [actorLogin, setActorLogin] = useState('');
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [specialistLabel, setSpecialistLabel] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftDate, setDraftDate] = useState(defaultExaminationDate());

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [mergedPatients, meRes] = await Promise.all([
          loadMergedClinicalPatients(),
          fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' }),
        ]);

        let sid: string | null = null;
        let label = '';
        let name = '';
        let login = '';

        if (meRes.ok) {
          const me = (await meRes.json()) as {
            fullName?: string;
            login?: string;
            narrowSpecialistId?: string;
          };
          sid = me.narrowSpecialistId ?? null;
          name = me.fullName ?? '';
          login = me.login ?? '';
          label = sid ? (findNarrowSpecialist(sid)?.label ?? '') : '';
        }

        if (cancelled) return;
        setRows(mergedPatients);
        setSpecialistId(sid);
        setSpecialistLabel(label);
        setActorName(name);
        setActorLogin(login);
        setHydrated(true);
      } catch {
        if (!cancelled) {
          setRows([]);
          setHydrated(true);
        }
      }
    }

    void loadData();
    const id = setInterval(() => void loadData(), 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const assignedRows = useMemo(() => {
    if (!specialistId) return [];
    return rows.filter((patient) => isSpecialistPortalPatient(patient, specialistId));
  }, [rows, specialistId]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assignedRows;
    return assignedRows.filter((r) =>
      [r.id, r.fullName, r.diseaseType, r.contact].join(' ').toLowerCase().includes(q),
    );
  }, [assignedRows, searchQuery]);

  const selectedPatient = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    if (!hydrated || !focusPatientId || !specialistId) return;
    const row = assignedRows.find((r) => r.id === focusPatientId);
    if (row) setSelectedId(focusPatientId);
  }, [hydrated, focusPatientId, assignedRows, specialistId]);

  useEffect(() => {
    if (!selectedPatient || !specialistId) return;
    const existing = getSpecialistConsultationForPatient(selectedPatient, specialistId);
    setDraftText(existing?.consultationText ?? '');
    setDraftDate(existing?.consultationDate ?? defaultExaminationDate());
  }, [selectedPatient, specialistId]);

  const persistPatient = useCallback(async (updated: PatientRow) => {
    const next = rows.map((r) => (r.id === updated.id ? updated : r));
    setRows(next);
    const all = await fetchClinicResource<PatientRow[]>('patients').catch(() => next);
    const merged = Array.isArray(all) ?
      all.map((r) => (r.id === updated.id ? updated : r))
    : next;
    if (!merged.some((r) => r.id === updated.id)) merged.push(updated);
    await saveClinicResource('patients', merged);
  }, [rows]);

  async function handleSave() {
    if (!selectedPatient || !specialistId || !specialistLabel || !draftText.trim()) return;
    setSaving(true);
    try {
      const existing = getSpecialistConsultationForPatient(selectedPatient, specialistId);
      const input: PatientSpecialistConsultationInput = {
        id: existing?.id,
        specialistId,
        specialistLabel,
        consultationText: draftText,
        consultationDate: draftDate,
      };
      const updated = upsertSpecialistConsultation(selectedPatient, input, {
        name: actorName,
        login: actorLogin,
      });
      await persistPatient(updated);
      toast.success('Konsultatsiya natijasi saqlandi');
      setSelectedId(null);
    } catch {
      toast.error('Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated) {
    return <p className="text-sm text-slate-500">Yuklanmoqda…</p>;
  }

  if (!specialistId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900">
        Mutaxassislik turi aniqlanmadi. Kadrlar bo&apos;limida xodim uchun to&apos;g&apos;ri tor
        mutaxassis roli tanlanganligini tekshiring.
      </div>
    );
  }

  if (selectedPatient) {
    const referral = getSpecialistReferralForPatient(selectedPatient, specialistId);

    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => setSelectedId(null)}>
          <ArrowLeft className="mr-1 size-4" />
          Ro&apos;yxatga qaytish
        </Button>

        <section className="rounded-2xl border border-violet-200/70 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{selectedPatient.fullName}</h2>
          <p className="text-sm text-slate-500">
            ID: <span className="font-mono">{selectedPatient.id}</span>
            {selectedPatient.diseaseType ? ` · ${selectedPatient.diseaseType}` : ''}
          </p>
          {referral?.referralNote ?
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                Shifokor eslatmasi
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-amber-950">
                {referral.referralNote}
              </p>
              {referral.referredByName ?
                <p className="mt-2 text-xs text-amber-700">{referral.referredByName}</p>
              : null}
            </div>
          : null}

          <div className="mt-5 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="specialist-consult-date">Konsultatsiya sanasi</Label>
              <Input
                id="specialist-consult-date"
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="rounded-xl bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="specialist-result">
                {specialistLabel} — xulosa va ko&apos;rsatmalar
              </Label>
              <Textarea
                id="specialist-result"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={10}
                placeholder="Tekshiruv natijasi, tashxis va tavsiyalar..."
                className="rounded-xl bg-white text-sm"
              />
            </div>
          </div>

          <Button
            type="button"
            className="mt-5 rounded-xl bg-violet-600 hover:bg-violet-700"
            disabled={saving || !draftText.trim()}
            onClick={() => void handleSave()}>
            {saving ? 'Saqlanmoqda…' : 'Natijani saqlash'}
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{specialistLabel}</h2>
        <p className="text-sm text-slate-500">
          Shifokor yo&apos;naltirgan bemorlar — tekshiruv natijasini kiriting
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Bemor qidirish..."
          className="rounded-xl pl-9"
        />
      </div>

      {filtered.length === 0 ?
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Hozircha sizga yo&apos;naltirilgan bemor yo&apos;q.
        </p>
      : <ul className="space-y-2">
          {filtered.map((patient) => {
            const referral = getSpecialistReferralForPatient(patient, specialistId);
            return (
              <li key={patient.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-violet-200 hover:bg-violet-50/40"
                  onClick={() => setSelectedId(patient.id)}>
                  <p className="font-medium text-slate-900">{patient.fullName}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {patient.diseaseType || '—'}
                    {referral?.referredAt ?
                      ` · ${formatSpecialistConsultationSavedAt(referral.referredAt)}`
                    : ''}
                  </p>
                  {referral?.referralNote ?
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{referral.referralNote}</p>
                  : null}
                </button>
              </li>
            );
          })}
        </ul>
      }
    </div>
  );
}
