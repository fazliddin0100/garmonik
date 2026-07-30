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
import type { HeadNurseData } from '@/components/head-nurse/useHeadNurseData';
import {
  assessAdmissionReadiness,
  type AdmissionReadiness,
} from '@/lib/inpatient/admission-eligibility';
import { getRoomPaymentFromRequest } from '@/lib/inpatient/room-payment-status';
import type { InpatientAdmission } from '@/lib/inpatient/types';
import {
  addDaysToIsoDate,
  bedLabelForIndex,
  getFreeBedIndices,
  getOccupiedBedIndices,
} from '@/lib/inpatient/room-beds';
import { formatAdmissionDate, todayDateIso } from '@/lib/inpatient/utils';
import type { InpatientRoomPayment } from '@/lib/kassa/inpatient-room-payment';
import type { ClinicRoom } from '@/lib/clinic-rooms/types';
import type { PatientRow } from '@/lib/patients/types';
import {
  AlertCircle,
  BedDouble,
  CheckCircle2,
  FlaskConical,
  Wallet,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type RoomPaymentMap = Record<string, InpatientRoomPayment>;

function ReadinessBadges({ readiness }: { readiness: AdmissionReadiness }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          readiness.lab.allResultsReady ?
            'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
        }`}>
        <FlaskConical className="size-3" />
        Tahlil: {readiness.lab.resultCount}/{readiness.lab.orderCount || '—'}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          readiness.roomPayment.paid ?
            'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
          : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
        }`}>
        <Wallet className="size-3" />
        {readiness.roomPayment.paid ?
          readiness.roomPayment.label
        : 'Xona to‘lovi yo‘q'}
      </span>
      {readiness.roomPayment.paid && readiness.roomPayment.balanceDue > 0 ?
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
          Qarzdor — qolgan summa kassada
        </span>
      : null}
      {readiness.ready ?
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          <CheckCircle2 className="size-3" />
          Joylashtirishga tayyor
        </span>
      : null}
    </div>
  );
}

function RoomPickerCard({
  room,
  admissions,
  selected,
  onSelect,
}: {
  room: ClinicRoom;
  admissions: InpatientAdmission[];
  selected: boolean;
  onSelect: () => void;
}) {
  const freeBeds = getFreeBedIndices(room, admissions);
  const free = freeBeds.length;
  const pct =
    room.capacity > 0 ?
      Math.min(100, Math.round(((room.capacity - free) / room.capacity) * 100))
    : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected ?
          'border-rose-400 bg-rose-50 ring-2 ring-rose-300'
        : 'border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/40'
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{room.name}</p>
          <p className="text-xs text-slate-500">{room.kind}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">
            {room.capacity} o‘rinli · {free} ta bo‘sh
          </p>
        </div>
        <Users className="size-4 shrink-0 text-slate-400" />
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-linear-to-r from-rose-500 to-violet-600 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}

function BedSlotPicker({
  room,
  admissions,
  selectedIndex,
  onSelect,
}: {
  room: ClinicRoom;
  admissions: InpatientAdmission[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const occupied = getOccupiedBedIndices(room.id, admissions, room.capacity);

  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: room.capacity }, (_, i) => {
        const isTaken = occupied.has(i);
        const isSelected = selectedIndex === i;
        return (
          <button
            key={i}
            type="button"
            disabled={isTaken}
            onClick={() => onSelect(i)}
            title={isTaken ? 'Band' : bedLabelForIndex(i)}
            className={`flex size-10 items-center justify-center rounded-lg text-xs font-semibold transition ${
              isTaken ?
                'cursor-not-allowed bg-linear-to-br from-rose-500 to-violet-600 text-white opacity-80'
              : isSelected ?
                'bg-rose-600 text-white ring-2 ring-rose-400'
              : 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300 hover:bg-emerald-200'
            }`}>
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

export default function PendingAdmissionsPanel({
  data,
  roomPayments,
  paymentsLoading,
}: {
  data: HeadNurseData;
  roomPayments: RoomPaymentMap;
  paymentsLoading: boolean;
}) {
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [roomId, setRoomId] = useState('');
  const [bedIndex, setBedIndex] = useState<number | null>(null);
  const [stayDays, setStayDays] = useState('3');
  const [saving, setSaving] = useState(false);

  const selectedReadiness = useMemo(() => {
    if (!selectedPatient) return null;
    const payment =
      getRoomPaymentFromRequest(selectedPatient) ??
      roomPayments[selectedPatient.id] ??
      null;
    return assessAdmissionReadiness(selectedPatient, payment);
  }, [selectedPatient, roomPayments]);

  const matchingRooms = useMemo(() => {
    if (!selectedReadiness?.roomPayment.roomCapacity) return [];
    const cap = selectedReadiness.roomPayment.roomCapacity;
    return data.rooms
      .filter((r) => r.capacity === cap && getFreeBedIndices(r, data.admissions).length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'uz'));
  }, [data.rooms, data.admissions, selectedReadiness]);

  const selectedRoom = useMemo(
    () => data.rooms.find((r) => r.id === roomId) ?? null,
    [data.rooms, roomId],
  );

  useEffect(() => {
    setRoomId('');
    setBedIndex(null);
  }, [selectedPatient?.id]);

  useEffect(() => {
    setBedIndex(null);
  }, [roomId]);

  async function confirmAdmission() {
    if (!selectedPatient || !selectedReadiness?.ready) return;
    if (!roomId || bedIndex === null) {
      toast.error('Palata va karavot tanlang');
      return;
    }
    const days = Number.parseInt(stayDays, 10);
    if (!Number.isFinite(days) || days < 1) {
      toast.error('Yotish muddati kamida 1 kun bo‘lishi kerak');
      return;
    }

    const room = data.rooms.find((r) => r.id === roomId);
    if (!room) return;

    const freeBeds = getFreeBedIndices(room, data.admissions);
    if (!freeBeds.includes(bedIndex)) {
      toast.error('Tanlangan karavot band');
      return;
    }

    const alreadyAdmitted = data.admissions.some(
      (a) => a.patientId === selectedPatient.id && a.status === 'admitted',
    );
    if (alreadyAdmitted) {
      toast.error('Bemor allaqachon statsionarda');
      return;
    }

    setSaving(true);
    try {
      const plannedStayUntil = addDaysToIsoDate(todayDateIso(), days);
      const payment =
        getRoomPaymentFromRequest(selectedPatient) ??
        roomPayments[selectedPatient.id];

      const admission: InpatientAdmission = {
        id: crypto.randomUUID(),
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        cardNumber: selectedPatient.cardNumber,
        diseaseType: selectedPatient.diseaseType,
        contact: selectedPatient.contact,
        admittedAt: new Date().toISOString(),
        admittedByName: data.actorName || undefined,
        admittedByLogin: data.actorLogin || undefined,
        roomId: room.id,
        roomName: room.name,
        bedIndex,
        bedLabel: bedLabelForIndex(bedIndex),
        paidRoomCapacity: payment?.roomCapacity,
        plannedStayUntil,
        attendingDoctorName: selectedPatient.inpatientAdmissionRequest?.requestedByName,
        admissionNote: selectedPatient.inpatientAdmissionRequest?.note || undefined,
        status: 'admitted',
        dailyRounds: [],
        homeFollowUps: [],
      };

      const nextPatients = data.patients.map((p) =>
        p.id === selectedPatient.id ?
          { ...p, inpatientAdmissionRequest: undefined }
        : p,
      );
      const nextAdmissions = [admission, ...data.admissions];

      await data.persistAll(nextPatients, nextAdmissions, data.rooms);
      toast.success(
        `${selectedPatient.fullName} ${room.name}, ${bedLabelForIndex(bedIndex)} ga joylashtirildi`,
      );
      setSelectedPatient(null);
      setRoomId('');
      setBedIndex(null);
      setStayDays('3');
    } catch {
      toast.error('Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  }

  if (data.loading) {
    return <p className="text-sm text-slate-500">Yuklanmoqda…</p>;
  }

  const plannedUntilPreview =
    Number.parseInt(stayDays, 10) > 0 ?
      addDaysToIsoDate(todayDateIso(), Number.parseInt(stayDays, 10))
    : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Kassada statsionar xona to‘lovi qilingan bemorlar. Mos palataga joylashtiring — palatalar
        ro‘yxati boshqaruv panelidagi «Jami o‘rinlar» bilan bir xil.
      </p>

      {paymentsLoading ?
        <p className="text-xs text-slate-500">Kassa to‘lovlari tekshirilmoqda…</p>
      : null}

      {data.pendingPatients.length === 0 ?
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
          <BedDouble className="mx-auto mb-2 size-8 text-slate-400" />
          <p className="font-medium text-slate-700">Joylashtirish navbati bo‘sh</p>
          <p className="mt-1 text-sm text-slate-500">
            Shifokor «Klinikaga yotqizish» bosgach bemor avval kassada xona to‘lovini qiladi, keyin
            bu yerda ko‘rinadi
          </p>
        </div>
      : <div className="grid gap-3">
          {data.pendingPatients.map((patient) => {
            const req = patient.inpatientAdmissionRequest!;
            const readiness = assessAdmissionReadiness(
              patient,
              getRoomPaymentFromRequest(patient) ?? roomPayments[patient.id] ?? null,
            );
            return (
              <article
                key={patient.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm ${
                  readiness.ready ?
                    'border-white/70 bg-white'
                  : 'border-amber-100 bg-amber-50/30'
                }`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{patient.fullName}</p>
                  <p className="text-sm text-slate-500">
                    {patient.diseaseType || 'Kasallik turi ko‘rsatilmagan'}
                    {patient.cardNumber ? ` · ${patient.cardNumber}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    So‘rov: {formatAdmissionDate(req.requestedAt)}
                    {req.requestedByName ? ` · ${req.requestedByName}` : ''}
                  </p>
                  {req.note ?
                    <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-sm text-amber-900">
                      {req.note}
                    </p>
                  : null}
                  <ReadinessBadges readiness={readiness} />
                </div>
                <Button
                  type="button"
                  className="bg-rose-600 hover:bg-rose-700"
                  disabled={!readiness.ready}
                  onClick={() => {
                    setSelectedPatient(patient);
                  }}>
                  <BedDouble className="mr-1.5 size-4" />
                  Joylashtirish
                </Button>
              </article>
            );
          })}
        </div>
      }

      <Dialog
        open={!!selectedPatient}
        onOpenChange={(o) => {
          if (!o) setSelectedPatient(null);
        }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Palataga joylashtirish</DialogTitle>
          </DialogHeader>
          {selectedPatient && selectedReadiness ?
            <div className="grid gap-4 py-2">
              <div>
                <p className="font-medium text-slate-900">{selectedPatient.fullName}</p>
                <ReadinessBadges readiness={selectedReadiness} />
              </div>

              {!selectedReadiness.ready ?
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Bemor hali joylashtirishga tayyor emas. Tahlil natijalari va kassadagi xona
                    to‘lovi to‘liq bo‘lishi kerak.
                  </p>
                </div>
              : <>
                  <div className="grid gap-2">
                    <Label>
                      To‘langan turga mos palatalar (
                      {selectedReadiness.roomPayment.roomCapacity} o‘rinli)
                    </Label>
                    {matchingRooms.length === 0 ?
                      <p className="text-sm text-amber-800">
                        Mos bo‘sh palata topilmadi. Boshqaruv panelida xonalar bandligini
                        tekshiring.
                      </p>
                    : <div className="grid gap-2">
                        {matchingRooms.map((room) => (
                          <RoomPickerCard
                            key={room.id}
                            room={room}
                            admissions={data.admissions}
                            selected={roomId === room.id}
                            onSelect={() => setRoomId(room.id)}
                          />
                        ))}
                      </div>
                    }
                  </div>

                  {selectedRoom ?
                    <div className="grid gap-2">
                      <Label>{selectedRoom.name} — bo‘sh karavot</Label>
                      <BedSlotPicker
                        room={selectedRoom}
                        admissions={data.admissions}
                        selectedIndex={bedIndex}
                        onSelect={setBedIndex}
                      />
                      {bedIndex !== null ?
                        <p className="text-xs text-slate-600">
                          Tanlangan: {bedLabelForIndex(bedIndex)}
                        </p>
                      : null}
                    </div>
                  : null}

                  <div className="grid gap-1.5">
                    <Label htmlFor="stay-days">Xonada qolish muddati (kun)</Label>
                    <Input
                      id="stay-days"
                      type="number"
                      min={1}
                      max={365}
                      value={stayDays}
                      onChange={(e) => setStayDays(e.target.value)}
                    />
                    {plannedUntilPreview ?
                      <p className="text-xs text-slate-500">
                        Rejalashtirilgan chiqish:{' '}
                        {new Date(`${plannedUntilPreview}T12:00:00`).toLocaleDateString('uz-UZ')}
                      </p>
                    : null}
                  </div>

                  {selectedPatient.inpatientAdmissionRequest?.note ?
                    <div className="grid gap-1.5">
                      <Label>Shifokor eslatmasi</Label>
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                        {selectedPatient.inpatientAdmissionRequest.note}
                      </p>
                    </div>
                  : null}
                </>
              }
            </div>
          : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedPatient(null)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={
                saving ||
                !selectedReadiness?.ready ||
                !roomId ||
                bedIndex === null ||
                matchingRooms.length === 0
              }
              onClick={() => void confirmAdmission()}>
              {saving ? 'Saqlanmoqda…' : 'Yotqizish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
