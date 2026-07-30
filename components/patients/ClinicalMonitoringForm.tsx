'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createDiagnosisHistoryEntry,
  createMedicationChangeHistoryEntry,
  createNoteHistoryEntry,
  createVitalHistoryEntry,
  MEDICATION_CHANGE_LABELS,
  VITAL_SIGN_LABELS,
  type ClinicalHistoryEntry,
  type MedicationChangeType,
  type VitalSignType,
} from '@/lib/patients/clinical-history';
import { useState } from 'react';

type MonitorKind = 'diagnosis' | 'vital_sign' | 'medication_change' | 'note';

type Props = {
  disabled?: boolean;
  actorName?: string;
  actorLogin?: string;
  onAdd: (entry: ClinicalHistoryEntry) => void | Promise<void>;
};

export default function ClinicalMonitoringForm({
  disabled = false,
  actorName = '',
  actorLogin = '',
  onAdd,
}: Props) {
  const [kind, setKind] = useState<MonitorKind>('vital_sign');
  const [text, setText] = useState('');
  const [vitalType, setVitalType] = useState<VitalSignType>('blood_pressure');
  const [vitalValue, setVitalValue] = useState('');
  const [vitalUnit, setVitalUnit] = useState('mmHg');
  const [medName, setMedName] = useState('');
  const [medChange, setMedChange] = useState<MedicationChangeType>('adjusted');
  const [medDosage, setMedDosage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function resetFields(nextKind: MonitorKind) {
    setKind(nextKind);
    setText('');
    setVitalValue('');
    setVitalUnit(nextKind === 'vital_sign' && vitalType === 'blood_pressure' ? 'mmHg' : '');
    setMedName('');
    setMedDosage('');
  }

  async function handleSubmit() {
    const actor = { name: actorName, login: actorLogin };
    let entry: ClinicalHistoryEntry | null = null;

    if (kind === 'diagnosis') {
      if (!text.trim()) return;
      entry = createDiagnosisHistoryEntry(text, actor);
    } else if (kind === 'note') {
      if (!text.trim()) return;
      entry = createNoteHistoryEntry(text, actor);
    } else if (kind === 'vital_sign') {
      if (!vitalValue.trim()) return;
      entry = createVitalHistoryEntry(vitalType, vitalValue, vitalUnit, actor);
    } else if (kind === 'medication_change') {
      if (!medName.trim()) return;
      entry = createMedicationChangeHistoryEntry(
        medName,
        medChange,
        medDosage,
        text.trim() || undefined,
        actor,
      );
    }

    if (!entry) return;
    setSubmitting(true);
    try {
      await onAdd(entry);
      setText('');
      setVitalValue('');
      setMedName('');
      setMedDosage('');
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: { id: MonitorKind; label: string }[] = [
    { id: 'vital_sign', label: 'Kuzatuv' },
    { id: 'diagnosis', label: 'Tashxis' },
    { id: 'medication_change', label: 'Dori o‘zgarishi' },
    { id: 'note', label: 'Eslatma' },
  ];

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/20 p-4">
      <p className="mb-3 text-sm font-medium text-violet-900">Yangi yozuv qo‘shish</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={kind === tab.id ? 'default' : 'outline'}
            className={kind === tab.id ? 'bg-violet-600 hover:bg-violet-700' : ''}
            disabled={disabled || submitting}
            onClick={() => resetFields(tab.id)}>
            {tab.label}
          </Button>
        ))}
      </div>

      {kind === 'vital_sign' ?
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5 sm:col-span-1">
            <Label className="text-xs">Ko‘rsatkich</Label>
            <select
              value={vitalType}
              onChange={(e) => {
                const next = e.target.value as VitalSignType;
                setVitalType(next);
                if (next === 'blood_pressure') setVitalUnit('mmHg');
                else if (next === 'pulse') setVitalUnit('ur/daq');
                else if (next === 'temperature') setVitalUnit('°C');
                else if (next === 'weight') setVitalUnit('kg');
                else if (next === 'glucose') setVitalUnit('mmol/L');
                else setVitalUnit('');
              }}
              className="h-9 rounded-lg border border-input bg-white px-2 text-sm">
              {(Object.keys(VITAL_SIGN_LABELS) as VitalSignType[]).map((key) => (
                <option key={key} value={key}>
                  {VITAL_SIGN_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Qiymat</Label>
            <Input
              value={vitalValue}
              onChange={(e) => setVitalValue(e.target.value)}
              placeholder={vitalType === 'blood_pressure' ? '120/80' : 'Qiymat'}
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Birlik</Label>
            <Input
              value={vitalUnit}
              onChange={(e) => setVitalUnit(e.target.value)}
              placeholder="mmHg"
              className="h-9"
            />
          </div>
        </div>
      : null}

      {kind === 'medication_change' ?
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label className="text-xs">Dori nomi</Label>
            <Input
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="Masalan: Metformin"
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">O‘zgarish turi</Label>
            <select
              value={medChange}
              onChange={(e) => setMedChange(e.target.value as MedicationChangeType)}
              className="h-9 rounded-lg border border-input bg-white px-2 text-sm">
              {(Object.keys(MEDICATION_CHANGE_LABELS) as MedicationChangeType[]).map((key) => (
                <option key={key} value={key}>
                  {MEDICATION_CHANGE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Doza / rejim</Label>
            <Input
              value={medDosage}
              onChange={(e) => setMedDosage(e.target.value)}
              placeholder="500 mg, kuniga 2 marta"
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label className="text-xs">Izoh (ixtiyoriy)</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
      : null}

      {(kind === 'diagnosis' || kind === 'note') ?
        <div className="grid gap-1.5">
          <Label className="text-xs">{kind === 'diagnosis' ? 'Tashxis matni' : 'Eslatma'}</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={
              kind === 'diagnosis' ?
                'Masalan: DM 2 turi, kompensatsiya yomonlashgan'
              : 'Kuzatuv bo‘yicha eslatma'
            }
            className="text-sm"
          />
        </div>
      : null}

      <Button
        type="button"
        size="sm"
        className="mt-4 bg-violet-600 hover:bg-violet-700"
        disabled={disabled || submitting}
        onClick={() => void handleSubmit()}>
        {submitting ? 'Saqlanmoqda…' : 'Tarixga saqlash'}
      </Button>
    </div>
  );
}
