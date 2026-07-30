'use client';

import { Button } from '@/components/ui/button';
import PatientPrescriptionDialog from '@/components/patients/PatientPrescriptionDialog';
import {
  appendClinicalHistory,
  createMedicationChangeHistoryEntry,
  createPrescriptionHistoryEntry,
} from '@/lib/patients/clinical-history';
import {
  flattenPatientMedications,
  removeMedicationFromPatient,
} from '@/lib/patients/prescription-edit';
import type { PatientPrescription } from '@/lib/patients/prescriptions';
import { formatPrescriptionDate } from '@/lib/patients/prescriptions';
import type { PatientRow } from '@/lib/patients/types';
import { Pill, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type Props = {
  patient: PatientRow;
  patientName: string;
  actorName: string;
  actorLogin: string;
  saving?: boolean;
  onSavePatient: (patient: PatientRow) => Promise<void>;
};

export default function HeadNurseMedicationPanel({
  patient,
  patientName,
  actorName,
  actorLogin,
  saving = false,
  onSavePatient,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);

  const medications = useMemo(() => flattenPatientMedications(patient), [patient]);
  const busy = saving || localSaving;

  async function removeMedication(rxId: string, productId: string, productName: string) {
    setLocalSaving(true);
    try {
      let updated = removeMedicationFromPatient(patient, rxId, productId);
      updated = appendClinicalHistory(
        updated,
        createMedicationChangeHistoryEntry(
          productName,
          'stopped',
          undefined,
          'Bosh hamshira tomonidan olib tashlandi',
          { name: actorName, login: actorLogin },
        ),
      );
      await onSavePatient(updated);
      toast.success('Dori olib tashlandi');
    } catch {
      toast.error('Saqlab bo‘lmadi');
    } finally {
      setLocalSaving(false);
    }
  }

  async function addPrescription(prescription: PatientPrescription) {
    setLocalSaving(true);
    try {
      const rx: PatientPrescription = {
        ...prescription,
        prescribedByName: actorName || prescription.prescribedByName,
        prescribedByLogin: actorLogin || prescription.prescribedByLogin,
      };
      let updated: PatientRow = {
        ...patient,
        prescriptions: [rx, ...(patient.prescriptions ?? [])],
      };
      updated = appendClinicalHistory(updated, createPrescriptionHistoryEntry(rx));
      await onSavePatient(updated);
      toast.success('Dori qo‘shildi');
      setDialogOpen(false);
    } catch {
      toast.error('Saqlab bo‘lmadi');
    } finally {
      setLocalSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Pill className="size-5 text-rose-600" />
          Dorilar ({medications.length})
        </h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-rose-200 text-rose-800"
          disabled={busy}
          onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Dori qo‘shish
        </Button>
      </div>

      {medications.length === 0 ?
        <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
          Hozircha dori belgilanmagan. «Dori qo‘shish» orqali katalogdan tanlang yoki shifokor
          retseptini kuting.
        </p>
      : <ul className="space-y-2">
          {medications.map((med) => (
            <li
              key={`${med.rxId}-${med.productId}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{med.productName}</p>
                <p className="text-xs text-slate-500">
                  {med.unit}
                  {med.dosage ? ` · ${med.dosage}` : ''}
                  {med.duration ? ` · ${med.duration}` : ''}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {formatPrescriptionDate(med.prescribedAt)}
                  {med.prescribedByName ? ` · ${med.prescribedByName}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50"
                disabled={busy}
                title="Dorini olib tashlash"
                onClick={() => void removeMedication(med.rxId, med.productId, med.productName)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      }

      <PatientPrescriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientName={patientName}
        saving={busy}
        actorName={actorName}
        actorLogin={actorLogin}
        onSave={addPrescription}
      />
    </div>
  );
}
