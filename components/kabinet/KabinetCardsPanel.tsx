'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UzPhoneInput } from '@/components/ui/uz-phone-input';
import { useStaffPortalViewOptional } from '@/components/staff/StaffPortalViewContext';
import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import { loadLabCatalog } from '@/lib/laboratory/catalog-storage';
import { upsertClinicPatientFromKabinetIntake } from '@/lib/patients/kabinet-intake';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import { formatPatientAgeDisplay } from '@/lib/patients/birth-display';
import PatientDoctorOrderSummary, {
  hasPatientDoctorOrder,
} from '@/components/patients/PatientDoctorOrderSummary';
import PatientClinicalHistoryPanel from '@/components/patients/PatientClinicalHistoryPanel';
import { getPatientClinicalHistory } from '@/lib/patients/clinical-history';
import type { PatientRow } from '@/lib/patients/types';
import type { ServicePriceRow } from '@/lib/services/pricing-data';
import {
  formatUzPhoneDisplay,
  isValidUzPhoneE164,
} from '@/lib/phone/uz-phone';
import type { QueueRow } from '@/lib/queue/types';
import { ClipboardPlus, Phone, Search, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type IntakeForm = {
  firstName: string;
  lastName: string;
  fatherName: string;
  gender: string;
  address: string;
  contact: string;
  diseaseType: string;
  age: string;
  referredDoctorUserId: string;
};

type PatientCard = {
  id: string;
  card_number: string;
  first_name: string;
  last_name: string;
  father_name: string;
  full_name: string;
  address: string;
  phone: string;
  disease_type: string;
  gender?: string | null;
  age: number | null;
  referred_doctor_user_id?: string | null;
  created_at: string;
};

type DoctorOption = {
  id: string;
  fullName: string;
  department: string;
};

type PatientTableRow = {
  id: string;
  fullName: string;
  gender: string;
  age: string;
  phone: string;
  address: string;
  diseaseType: string;
  cardNumber: string;
};

function patientRowToCard(row: PatientRow): PatientCard {
  const nameParts = row.fullName.trim().split(/\s+/).filter(Boolean);
  return {
    id: row.id,
    card_number: row.cardNumber ?? row.id,
    first_name: nameParts[1] ?? '',
    last_name: nameParts[0] ?? '',
    father_name: nameParts.slice(2).join(' '),
    full_name: row.fullName,
    address: row.address,
    phone: row.contact,
    disease_type: row.diseaseType,
    gender: row.gender || null,
    age: row.age ?? null,
    referred_doctor_user_id: row.referredDoctorUserId ?? null,
    created_at: '',
  };
}

function patientCardToTableRow(card: PatientCard): PatientTableRow {
  return {
    id: card.id,
    fullName: card.full_name,
    gender: card.gender?.trim() || '—',
    age: formatPatientAgeDisplay(card.age),
    phone: card.phone,
    address: card.address?.trim() || '—',
    diseaseType: card.disease_type?.trim() || '—',
    cardNumber: card.card_number,
  };
}

function patientRowToTableRow(row: PatientRow): PatientTableRow {
  return {
    id: row.id,
    fullName: row.fullName,
    gender: row.gender?.trim() || '—',
    age: formatPatientAgeDisplay(row.age, row.birthDate),
    phone: row.contact?.trim() || '',
    address: row.address?.trim() || '—',
    diseaseType: row.diseaseType?.trim() || '—',
    cardNumber: row.cardNumber ?? row.id,
  };
}

const emptyForm: IntakeForm = {
  firstName: '',
  lastName: '',
  fatherName: '',
  gender: '',
  address: '',
  contact: '',
  diseaseType: '',
  age: '',
  referredDoctorUserId: '',
};

async function enqueuePatientToQueue(
  patient: PatientCard,
  doctor: DoctorOption | null,
): Promise<void> {
  const existing = await fetchClinicResource<QueueRow[]>('queue').catch(() => []);
  const queueRows = Array.isArray(existing) ? existing : [];
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const referredDoctorUserId =
    patient.referred_doctor_user_id ?? doctor?.id ?? undefined;

  const queueRow: QueueRow = {
    id: `Q-${now.getTime()}`,
    patientId: patient.id,
    arrivalTime: `${hh}:${mm}`,
    fullName: patient.full_name,
    diseaseType: patient.disease_type || 'Umumiy ko‘rik',
    referredDoctorUserId,
    referredDoctorName: doctor?.fullName,
    createdAt: now.toISOString(),
    status: 'waiting_payment',
  };

  const withoutSame = queueRows.filter((r) => r.patientId !== patient.id);
  await saveClinicResource('queue', [queueRow, ...withoutSame]);
}

export default function KabinetCardsPanel() {
  const portalNav = useStaffPortalViewOptional();
  const [form, setForm] = useState<IntakeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<PatientCard[]>([]);
  const [clinicPatients, setClinicPatients] = useState<PatientRow[]>([]);
  const [tableQuery, setTableQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<PatientCard | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [clinicalById, setClinicalById] = useState<Record<string, PatientRow>>({});
  const [labCatalog, setLabCatalog] = useState<Awaited<ReturnType<typeof loadLabCatalog>>>([]);
  const [priceRows, setPriceRows] = useState<ServicePriceRow[]>([]);
  const [clinicalLoading, setClinicalLoading] = useState(false);

  const fullName = useMemo(
    () =>
      [form.lastName.trim(), form.firstName.trim(), form.fatherName.trim()]
        .filter(Boolean)
        .join(' '),
    [form.fatherName, form.firstName, form.lastName],
  );

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === form.referredDoctorUserId) ?? null,
    [doctors, form.referredDoctorUserId],
  );

  const tableRows = useMemo(() => {
    const merged = new Map<string, PatientTableRow>();
    for (const row of clinicPatients) {
      merged.set(row.id, patientRowToTableRow(row));
    }
    for (const card of items) {
      const existing = merged.get(card.id);
      if (existing) {
        merged.set(card.id, {
          ...existing,
          cardNumber: card.card_number || existing.cardNumber,
          phone: card.phone || existing.phone,
          age:
            card.age != null ?
              formatPatientAgeDisplay(card.age)
            : existing.age,
        });
      } else {
        merged.set(card.id, patientCardToTableRow(card));
      }
    }
    return [...merged.values()].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'uz', { numeric: true }),
    );
  }, [clinicPatients, items]);

  const filteredTableRows = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    if (!q) return tableRows;
    return tableRows.filter((row) =>
      [
        row.fullName,
        row.gender,
        row.age,
        row.phone,
        row.address,
        row.diseaseType,
        row.cardNumber,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [tableQuery, tableRows]);

  useEffect(() => {
    void loadPatients();
    void loadDoctors();
    void loadClinicalMeta();
  }, []);

  async function loadClinicalMeta() {
    try {
      const [patientsRaw, pricesRaw, catalog] = await Promise.all([
        fetchClinicResource<PatientRow[]>('patients').catch(() => []),
        fetchClinicResource<ServicePriceRow[]>('service-prices').catch(() => []),
        loadLabCatalog(),
      ]);
      const map: Record<string, PatientRow> = {};
      const list: PatientRow[] = [];
      for (const item of patientsRaw) {
        const row = normalizePatientRow(item);
        if (row) {
          map[row.id] = row;
          list.push(row);
        }
      }
      setClinicalById(map);
      setClinicPatients(list);
      setPriceRows(Array.isArray(pricesRaw) ? pricesRaw : []);
      setLabCatalog(catalog);
    } catch {
      setClinicalById({});
      setClinicPatients([]);
    }
  }

  async function loadDoctors() {
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
      setDoctors(json.items ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Shifokorlar yuklanmadi',
      );
    } finally {
      setDoctorsLoading(false);
    }
  }

  async function loadPatients() {
    setLoading(true);
    try {
      const res = await fetch('/api/patients', {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = (await res.json()) as { items?: PatientCard[]; error?: string };
      if (!res.ok) throw new Error(json.error || 'Bemorlar yuklanmadi');
      setItems(json.items ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bemorlar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }

  async function registerPatient() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Ism va familiyani kiriting');
      return;
    }
    if (!form.fatherName.trim()) {
      toast.error('Otasining ismini kiriting');
      return;
    }
    if (!form.gender.trim()) {
      toast.error('Jinsini tanlang');
      return;
    }
    if (!form.age.trim() || !Number.isFinite(Number.parseInt(form.age, 10))) {
      toast.error('Yoshni kiriting');
      return;
    }
    if (!isValidUzPhoneE164(form.contact)) {
      toast.error('Telefon raqamini to‘liq kiriting');
      return;
    }
    if (!form.referredDoctorUserId) {
      toast.error('Shifokorni tanlang');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          fatherName: form.fatherName,
          gender: form.gender,
          address: form.address,
          phone: form.contact,
          diseaseType: form.diseaseType,
          age: form.age,
          referredDoctorUserId: form.referredDoctorUserId,
        }),
      });
      const json = (await res.json()) as { item?: PatientCard; error?: string };
      if (!res.ok || !json.item) {
        throw new Error(json.error || 'Saqlashda xatolik');
      }

      const item = { ...json.item, gender: json.item.gender ?? form.gender } as PatientCard;
      setItems((prev) => [item, ...prev]);
      setForm(emptyForm);

      if (form.referredDoctorUserId) {
        await upsertClinicPatientFromKabinetIntake(
          {
            id: item.id,
            card_number: item.card_number,
            full_name: item.full_name,
            disease_type: item.disease_type,
            gender: form.gender,
            address: item.address,
            phone: item.phone,
            age: item.age,
          },
          form.referredDoctorUserId,
          selectedDoctor?.fullName,
        );
      }

      await enqueuePatientToQueue(item, selectedDoctor);
      await loadClinicalMeta();

      toast.success(`Bemor ro'yxatga olindi: ${item.card_number}`);
      portalNav?.openView('navbat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }

  function openCardById(patientId: string) {
    const apiCard = items.find((item) => item.id === patientId);
    const clinical = clinicalById[patientId];
    const card =
      apiCard ?? (clinical ? patientRowToCard(clinical) : null);
    if (card) openCard(card);
  }

  function openCard(patient: PatientCard) {
    setActive(patient);
    setEditing(false);
    setClinicalLoading(true);
    void (async () => {
      try {
        const patientsRaw = await fetchClinicResource<PatientRow[]>('patients').catch(() => []);
        const row = patientsRaw
          .map(normalizePatientRow)
          .find((x): x is PatientRow => x !== null && x.id === patient.id);
        if (row) {
          setClinicalById((prev) => ({ ...prev, [patient.id]: row }));
        }
      } finally {
        setClinicalLoading(false);
      }
    })();
  }

  async function saveActiveCard() {
    if (!active) return;

    if (!active.gender?.trim()) {
      toast.error('Jinsini tanlang');
      return;
    }
    if (!isValidUzPhoneE164(active.phone)) {
      toast.error('Telefon raqamini to‘liq kiriting');
      return;
    }

    try {
      const res = await fetch('/api/patients', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: active.id,
          firstName: active.first_name,
          lastName: active.last_name,
          fatherName: active.father_name,
          address: active.address,
          phone: active.phone,
          diseaseType: active.disease_type,
          gender: active.gender,
          age: active.age ?? undefined,
        }),
      });
      const json = (await res.json()) as { item?: PatientCard; error?: string };
      if (!res.ok || !json.item) throw new Error(json.error || 'Yangilashda xatolik');
      setItems((prev) =>
        prev.map((p) => (p.id === json.item!.id ? (json.item as PatientCard) : p)),
      );
      setActive(json.item as PatientCard);
      setEditing(false);
      toast.success('Karta yangilandi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Yangilashda xatolik');
    }
  }

  async function deleteActiveCard() {
    if (!active) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: active.id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "O'chirishda xatolik");
      setItems((prev) => prev.filter((p) => p.id !== active.id));
      setActive(null);
      setDeleteConfirmOpen(false);
      toast.success("Karta o'chirildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "O'chirishda xatolik");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Bemor kartalari</h2>
        <p className="mt-1 text-sm text-slate-500">
          Yangi bemor ro‘yxatga olish, kartalarni ko‘rish va tahrirlash.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl">
          <div className="mb-5 flex items-center gap-2">
            <UserPlus className="size-5 text-violet-600" />
            <h2 className="text-xl font-bold text-slate-900">Bemorni ro'yxatga olish</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Ismi *</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="Ism kiriting"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Familiyasi *</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Familiya kiriting"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Otasining ismi *</Label>
              <Input
                value={form.fatherName}
                onChange={(e) => setForm((p) => ({ ...p, fatherName: e.target.value }))}
                placeholder="Otasining ismi"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Jinsi *</Label>
              <NativeSelect
                className="w-full"
                value={form.gender}
                onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}>
                <NativeSelectOption value="">Tanlang</NativeSelectOption>
                <NativeSelectOption value="Erkak">Erkak</NativeSelectOption>
                <NativeSelectOption value="Ayol">Ayol</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label>Yoshi *</Label>
              <Input
                type="number"
                value={form.age}
                onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                placeholder="Masalan: 34"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Yo‘naltiriladigan shifokor *</Label>
              <NativeSelect
                className="w-full"
                value={form.referredDoctorUserId}
                disabled={doctorsLoading}
                onChange={(e) =>
                  setForm((p) => ({ ...p, referredDoctorUserId: e.target.value }))
                }>
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
            <div className="grid gap-1.5 md:col-span-2">
              <Label>Manzili</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="To'liq manzil"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Telefon raqami *</Label>
              <UzPhoneInput
                value={form.contact}
                onChange={(value) => setForm((p) => ({ ...p, contact: value }))}
                className="max-w-none"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Kasallik turi</Label>
              <Input
                value={form.diseaseType}
                onChange={(e) => setForm((p) => ({ ...p, diseaseType: e.target.value }))}
                placeholder="Masalan: Gipertoniya"
              />
            </div>
          </div>

          <div className="mt-5">
            <Button
              onClick={() => void registerPatient()}
              disabled={saving}
              className="bg-violet-600 text-white hover:bg-violet-700">
              {saving ? 'Saqlanmoqda...' : "Kartaga qo'shish va navbatga"}
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border border-violet-100 bg-linear-to-br from-violet-50 to-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardPlus className="size-5 text-violet-700" />
            <h3 className="text-lg font-semibold text-slate-900">Karta preview</h3>
          </div>
          <div className="space-y-3 rounded-2xl border border-violet-100 bg-white p-4">
            <p className="text-sm text-slate-500">Bemor F.I.SH</p>
            <p className="text-base font-semibold text-slate-900">{fullName || '-'}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Jinsi</p>
                <p className="font-medium text-slate-800">{form.gender || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500">Yoshi</p>
                <p className="font-medium text-slate-800">{form.age || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500">Shifokor</p>
                <p className="font-medium text-slate-800">
                  {selectedDoctor?.fullName || '-'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500">Kasallik turi</p>
                <p className="font-medium text-slate-800">{form.diseaseType || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-slate-500">Manzil</p>
              <p className="font-medium text-slate-800">{form.address || '-'}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2">
              <Phone className="size-4 text-violet-700" />
              <p className="font-medium text-violet-900">
                {form.contact ? formatUzPhoneDisplay(form.contact) : 'Telefon kiritilmagan'}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bemorlar ro&apos;yxati</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {filteredTableRows.length} ta bemor
              {tableQuery.trim() ? ` · jami ${tableRows.length}` : ''}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={tableQuery}
                onChange={(e) => setTableQuery(e.target.value)}
                placeholder="Qidirish: F.I.SH, telefon, manzil..."
                className="rounded-xl border-slate-200 bg-slate-50/80 pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadPatients();
                void loadClinicalMeta();
              }}
              disabled={loading}>
              {loading ? 'Yuklanmoqda...' : 'Yangilash'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-[68vh] overflow-auto rounded-2xl border border-slate-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur">
                <TableRow className="border-slate-200/80 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-600">#</TableHead>
                  <TableHead className="min-w-[220px] text-xs font-semibold text-slate-600">
                    F.I.SH
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Jinsi</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Yosh</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Telefon</TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold text-slate-600">
                    Manzil
                  </TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold text-slate-600">
                    Kasallik turi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filteredTableRows.length === 0 ?
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                      Bemorlar yuklanmoqda...
                    </TableCell>
                  </TableRow>
                : filteredTableRows.length === 0 ?
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                      Hozircha bemor topilmadi. Yangi bemor qo&apos;shing yoki qidiruvni o&apos;zgartiring.
                    </TableCell>
                  </TableRow>
                : filteredTableRows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer border-slate-100 text-sm text-slate-700 transition-colors hover:bg-violet-50/50"
                      onClick={() => openCardById(row.id)}>
                      <TableCell className="text-slate-500">{index + 1}</TableCell>
                      <TableCell className="min-w-[220px] font-medium text-slate-900">
                        {row.fullName}
                      </TableCell>
                      <TableCell>{row.gender}</TableCell>
                      <TableCell>{row.age}</TableCell>
                      <TableCell>
                        {row.phone ?
                          formatUzPhoneDisplay(row.phone)
                        : <span className="text-slate-400">—</span>}
                      </TableCell>
                      <TableCell className="max-w-[240px] whitespace-normal">
                        {row.address}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-normal">
                        {row.diseaseType}
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <Dialog
        open={!!active}
        onOpenChange={(open) => {
          if (!open) {
            setActive(null);
            setEditing(false);
          }
        }}>
        <DialogContent className="flex h-[min(92dvh,920px)] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4 pr-12">
            <DialogTitle className="text-lg">
              {active?.full_name ?? 'Bemor kartasi'}
            </DialogTitle>
            {active ?
              <p className="text-sm font-normal text-violet-700">{active.card_number}</p>
            : null}
          </DialogHeader>
          {active && (
            <div
              className={
                editing ?
                  'min-h-0 flex-1 overflow-y-auto px-5 py-4'
                : 'grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(260px,320px)_1fr]'
              }>
              {editing ?
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label>Ismi</Label>
                      <Input
                        value={active.first_name}
                        onChange={(e) =>
                          setActive((p) => (p ? { ...p, first_name: e.target.value } : p))
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Familiyasi</Label>
                      <Input
                        value={active.last_name}
                        onChange={(e) =>
                          setActive((p) => (p ? { ...p, last_name: e.target.value } : p))
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Otasining ismi</Label>
                      <Input
                        value={active.father_name}
                        onChange={(e) =>
                          setActive((p) => (p ? { ...p, father_name: e.target.value } : p))
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Jinsi</Label>
                      <NativeSelect
                        className="w-full"
                        value={active.gender ?? ''}
                        onChange={(e) =>
                          setActive((p) => (p ? { ...p, gender: e.target.value } : p))
                        }>
                        <NativeSelectOption value="">Tanlang</NativeSelectOption>
                        <NativeSelectOption value="Erkak">Erkak</NativeSelectOption>
                        <NativeSelectOption value="Ayol">Ayol</NativeSelectOption>
                      </NativeSelect>
                    </div>
                    <div className="grid gap-1">
                      <Label>Yoshi</Label>
                      <Input
                        type="number"
                        value={active.age ?? ''}
                        onChange={(e) =>
                          setActive((p) =>
                            p ?
                              {
                                ...p,
                                age:
                                  e.target.value.trim() === '' ?
                                    null
                                  : Number.parseInt(e.target.value, 10) || null,
                              }
                            : p,
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-2">
                      <Label>Manzili</Label>
                      <Input
                        value={active.address}
                        onChange={(e) =>
                          setActive((p) => (p ? { ...p, address: e.target.value } : p))
                        }
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-2">
                      <Label>Telefon</Label>
                      <UzPhoneInput
                        value={active.phone}
                        onChange={(value) =>
                          setActive((p) => (p ? { ...p, phone: value } : p))
                        }
                        className="max-w-none"
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-2">
                      <Label>Kasallik turi</Label>
                      <Input
                        value={active.disease_type}
                        onChange={(e) =>
                          setActive((p) => (p ? { ...p, disease_type: e.target.value } : p))
                        }
                      />
                    </div>
                  </div>
                </div>
              : <>
                  <div className="min-h-0 overflow-y-auto border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
                    <dl className="grid gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          F.I.SH
                        </dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">{active.full_name}</dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-xs text-slate-500">Jinsi</dt>
                          <dd className="font-medium text-slate-800">{active.gender || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Yosh</dt>
                          <dd className="font-medium text-slate-800">
                            {active.age != null ? `${active.age} yosh` : '—'}
                          </dd>
                        </div>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Telefon</dt>
                        <dd className="font-medium text-slate-800">
                          {formatUzPhoneDisplay(active.phone)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Manzil</dt>
                        <dd className="text-slate-800">{active.address || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Kasallik turi</dt>
                        <dd className="text-slate-800">{active.disease_type || '—'}</dd>
                      </div>
                    </dl>
                    {clinicalById[active.id] &&
                    hasPatientDoctorOrder(
                      clinicalById[active.id]?.queueClinicalNote,
                      clinicalById[active.id]?.orderedLaboratoryKeys,
                    ) ?
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <PatientDoctorOrderSummary
                          clinicalNote={clinicalById[active.id]?.queueClinicalNote}
                          orderedKeys={clinicalById[active.id]?.orderedLaboratoryKeys}
                          labCatalog={labCatalog}
                          priceRows={priceRows}
                        />
                      </div>
                    : null}
                  </div>
                  <div className="flex min-h-0 flex-col overflow-hidden p-4">
                    {clinicalLoading ?
                      <p className="text-sm text-slate-500">Tibbiy tarix yuklanmoqda…</p>
                    : clinicalById[active.id] ?
                      <PatientClinicalHistoryPanel
                        patient={clinicalById[active.id]}
                        labCatalog={labCatalog}
                        priceRows={priceRows}
                        dailyFilter
                      />
                    : <p className="text-sm text-slate-500">
                        Shifokor qabulida kiritilgan o‘zgarishlar shu yerda ko‘rinadi.
                      </p>
                    }
                  </div>
                </>
              }
            </div>
          )}
          <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 px-5 py-4 sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}>
              <Trash2 className="mr-2 size-4" />
              O'chirish
            </Button>
            <div className="flex gap-2">
              {editing ?
                <>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Bekor qilish
                  </Button>
                  <Button onClick={() => void saveActiveCard()}>Saqlash</Button>
                </>
              : <Button onClick={() => setEditing(true)}>Tahrirlash</Button>}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kartani o'chirishni tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription>
              {active ?
                `${active.full_name} (${active.card_number}) kartasi butunlay o'chiriladi.`
              : "Ushbu amalni qaytarib bo'lmaydi."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void deleteActiveCard();
              }}>
              {deleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
