import type { InpatientAdmission } from '@/lib/inpatient/types';
import {
  STAGE_EPICRISIS_FIELD_LABELS,
  STAGE_EPICRISIS_TEXT_FIELDS,
  formatStageEpicrisisTitle,
  getPatientStageEpicrisisRecords,
  type PatientStageEpicrisis,
} from '@/lib/patients/stage-epicrisis';
import {
  formatSpecialistConsultationSavedAt,
  getPatientSpecialistConsultations,
} from '@/lib/patients/specialist-consultation';
import type {
  ClinicalPrintDocumentInput,
  ClinicalPrintResultItem,
} from '@/lib/patients/print-clinical-document';
import type { PatientRow } from '@/lib/patients/types';

export const ALL_EPICRISES_DOCUMENT_TITLE = 'Kasallik tarixi — uyga kuzatish uchun ko‘chirma';

function formatIsoDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function stageEpicrisisToItem(record: PatientStageEpicrisis): ClinicalPrintResultItem {
  const fields: Array<{ label: string; value: string }> = [];
  if (record.receptionDoctorName.trim()) {
    fields.push({
      label: STAGE_EPICRISIS_FIELD_LABELS.receptionDoctor,
      value: record.receptionDoctorName.trim(),
    });
  }
  for (const { key, label } of STAGE_EPICRISIS_TEXT_FIELDS) {
    const value = record[key]?.trim();
    if (value) fields.push({ label, value });
  }

  return {
    kind: 'text',
    title: `Bosqichli epikriz — ${formatStageEpicrisisTitle(record)}`,
    subtitle: record.receptionDoctorName || undefined,
    body: fields.length === 0 ? 'Ma’lumot kiritilmagan.' : '',
    fields,
    meta: formatIsoDate(record.updatedAt),
  };
}

/** Faqat klinik kunlik ko‘riklar — palata, chiqish sanasi, yotqizish eslatmasi chiqarilmaydi */
function inpatientToItems(admission: InpatientAdmission): ClinicalPrintResultItem[] {
  const rounds = [...admission.dailyRounds].sort((a, b) => {
    const da = `${a.date}T${a.time || '00:00'}`;
    const db = `${b.date}T${b.time || '00:00'}`;
    return new Date(db).getTime() - new Date(da).getTime();
  });

  return rounds
    .map((round) => {
      const vitals = [
        round.vitals?.bp ? `QB: ${round.vitals.bp}` : null,
        round.vitals?.pulse ? `Puls: ${round.vitals.pulse}` : null,
        round.vitals?.temp ? `T: ${round.vitals.temp}` : null,
        round.vitals?.spo2 ? `SpO₂: ${round.vitals.spo2}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const fields: Array<{ label: string; value: string }> = [];
      if (vitals) fields.push({ label: 'Vital ko‘rsatkichlar', value: vitals });
      if (round.note?.trim()) fields.push({ label: 'Kuzatuv yozuvi', value: round.note.trim() });
      if (round.recordedByName?.trim()) {
        fields.push({ label: 'Kim yozgan', value: round.recordedByName.trim() });
      }

      if (fields.length === 0) return null;

      return {
        kind: 'text' as const,
        title: `Statsionar ko‘rik — ${round.date}${round.time ? ` · ${round.time}` : ''}`,
        body: '',
        fields,
        meta: round.recordedByName,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export type AllEpicrisesDocumentSource = {
  patient: PatientRow;
  inpatient?: InpatientAdmission | null;
};

export function countAllEpicrisesSources(source: AllEpicrisesDocumentSource): {
  stage: number;
  inpatient: number;
  specialist: number;
  total: number;
} {
  const stage = getPatientStageEpicrisisRecords(source.patient).length;
  const inpatient = source.inpatient?.dailyRounds?.length ?? 0;
  const specialist = getPatientSpecialistConsultations(source.patient).filter((c) =>
    c.consultationText.trim(),
  ).length;
  return { stage, inpatient, specialist, total: stage + inpatient + specialist };
}

/** Uyga kuzatish uchun yagona kasallik tarixi blankasi */
export function buildAllEpicrisesDocumentInput(
  source: AllEpicrisesDocumentSource,
): ClinicalPrintDocumentInput {
  const { patient, inpatient } = source;
  const items: ClinicalPrintResultItem[] = [];

  const stageRecords = getPatientStageEpicrisisRecords(patient);
  for (const record of stageRecords) {
    items.push(stageEpicrisisToItem(record));
  }

  if (inpatient) {
    items.push(...inpatientToItems(inpatient));
  }

  const consultations = getPatientSpecialistConsultations(patient).filter((c) =>
    c.consultationText.trim(),
  );
  for (const consultation of consultations) {
    items.push({
      kind: 'specialist',
      title: consultation.specialistLabel || 'Mutaxassis',
      subtitle: consultation.consultationDate
        ? `Konsultatsiya sanasi: ${consultation.consultationDate}`
        : undefined,
      body: consultation.consultationText,
      meta: [
        formatSpecialistConsultationSavedAt(consultation.updatedAt),
        consultation.createdByName,
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  if (items.length === 0) {
    items.push({
      kind: 'text',
      title: 'Ma’lumot yo‘q',
      body: 'Hali bosqichli epikriz, statsionar tekshiruv yoki tor mutaxassis natijasi kiritilmagan.',
    });
  }

  return {
    patientName: patient.fullName,
    patientId: patient.id,
    diseaseType: patient.diseaseType,
    documentTitle: ALL_EPICRISES_DOCUMENT_TITLE,
    labConclusion: patient.labConclusion?.text,
    items,
  };
}
