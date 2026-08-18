"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RoomBedGrid from "@/components/rooms/RoomBedGrid";
import { fetchClinicResource, saveClinicResource } from "@/lib/clinic-data/client";
import { type ClinicRoom } from "@/lib/clinic-rooms/types";
import { enrichAdmissionsWithPatientGender } from "@/lib/inpatient/gender";
import {
  normalizeInpatientAdmission,
  type InpatientAdmission,
} from "@/lib/inpatient/types";
import { syncRoomsWithAdmissions } from "@/lib/inpatient/utils";
import { normalizePatientRow } from "@/lib/patients/normalize-patient-row";
import type { PatientRow } from "@/lib/patients/types";
import { Armchair, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type RoomFormState = {
  name: string;
  kind: string;
  capacity: string;
};

function emptyForm(): RoomFormState {
  return { name: "", kind: "", capacity: "1" };
}

function nextRoomId(rooms: ClinicRoom[]): string {
  const nums = rooms
    .map((r) => Number.parseInt(r.id.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return String(max + 1);
}

function clampOccupied(capacity: number, occupied: number) {
  return Math.max(0, Math.min(capacity, Math.round(occupied)));
}

export default function RoomsOccupancyPanel() {
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [admissions, setAdmissions] = useState<InpatientAdmission[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const shouldPersistRooms = useRef(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomFormState>(emptyForm());
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [roomsRaw, admissionsRaw, patientsRaw] = await Promise.all([
        fetchClinicResource<ClinicRoom[]>("rooms"),
        fetchClinicResource<InpatientAdmission[]>("inpatient-admissions"),
        fetchClinicResource<PatientRow[]>("patients").catch(() => []),
      ]);
      const normalizedRooms = Array.isArray(roomsRaw) ? roomsRaw : [];
      const normalizedAdmissions = (Array.isArray(admissionsRaw) ? admissionsRaw : [])
        .map(normalizeInpatientAdmission)
        .filter((x): x is InpatientAdmission => x !== null);
      const normalizedPatients = (Array.isArray(patientsRaw) ? patientsRaw : [])
        .map(normalizePatientRow)
        .filter((x): x is PatientRow => x !== null);
      const enrichedAdmissions = enrichAdmissionsWithPatientGender(
        normalizedAdmissions,
        normalizedPatients,
      );
      setAdmissions(enrichedAdmissions);
      setRooms(syncRoomsWithAdmissions(normalizedRooms, enrichedAdmissions));
      setHydrated(true);
    } catch {
      setRooms([]);
      setAdmissions([]);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        await reload();
        if (cancelled) return;
      })();
    });
    const id = setInterval(() => {
      void reload();
    }, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [reload]);

  useEffect(() => {
    if (!hydrated || !shouldPersistRooms.current) return;
    shouldPersistRooms.current = false;
    void (async () => {
      try {
        await saveClinicResource("rooms", rooms);
      } catch {
        toast.error("Xonalarni saqlab bo‘lmadi");
      }
    })();
  }, [rooms, hydrated]);

  const totalStats = useMemo(() => {
    return rooms.reduce(
      (a, r) => ({
        cap: a.cap + r.capacity,
        occ: a.occ + r.occupied,
      }),
      { cap: 0, occ: 0 },
    );
  }, [rooms]);

  const deleteTarget = useMemo(
    () => rooms.find((r) => r.id === deleteId) ?? null,
    [rooms, deleteId],
  );

  function openCreate() {
    setEditingId(null);
    setFormError("");
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(room: ClinicRoom) {
    setEditingId(room.id);
    setFormError("");
    setForm({
      name: room.name,
      kind: room.kind,
      capacity: String(room.capacity),
    });
    setDialogOpen(true);
  }

  function saveRoom() {
    const name = form.name.trim();
    const kind = form.kind.trim();
    const capacity = parseInt(form.capacity, 10);

    if (!name) {
      setFormError("Xona nomi majburiy.");
      return;
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      setFormError("Sig‘im kamida 1 bo‘lishi kerak.");
      return;
    }

    if (editingId) {
      shouldPersistRooms.current = true;
      setRooms((prev) =>
        syncRoomsWithAdmissions(
          prev.map((r) => {
            if (r.id !== editingId) return r;
            return {
              ...r,
              name,
              kind,
              capacity,
              occupied: clampOccupied(capacity, r.occupied),
            };
          }),
          admissions,
        ),
      );
      toast.success("Xona yangilandi");
    } else {
      const payload: ClinicRoom = {
        id: nextRoomId(rooms),
        name,
        kind,
        capacity,
        occupied: 0,
      };
      shouldPersistRooms.current = true;
      setRooms((prev) => [...prev, payload]);
      toast.success("Xona qo‘shildi");
    }

    setDialogOpen(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    shouldPersistRooms.current = true;
    setRooms((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
    toast.success("Xona o‘chirildi");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-200/60 bg-linear-to-br from-violet-50/90 to-indigo-50/80 p-5 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/80 text-violet-600 shadow-sm">
              <Armchair className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-violet-600/80">
                Klinika bo‘yicha
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                Jami o‘rinlar: {totalStats.cap}{" "}
                <span className="text-base font-semibold text-slate-500">
                  · band {totalStats.occ} · bosh{" "}
                  {totalStats.cap - totalStats.occ}
                </span>
              </p>
            </div>
          </div>
          <Button type="button" className="gap-2" onClick={openCreate}>
            <Plus className="size-4" />
            Yangi xona
          </Button>
        </div>
      </div>

      {rooms.length === 0 ?
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-14 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-800">
            Hali xona qo‘shilmagan
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Statsionar palatalar va o‘rinlarni bu yerda yarating.
          </p>
          <Button type="button" className="mt-5 gap-2" onClick={openCreate}>
            <Plus className="size-4" />
            Yangi xona
          </Button>
        </div>
      : <div className="grid gap-4 lg:grid-cols-2">
          {rooms.map((room) => {
            const free = Math.max(0, room.capacity - room.occupied);
            const pct =
              room.capacity > 0 ?
                Math.min(100, Math.round((room.occupied / room.capacity) * 100))
              : 0;

            return (
              <article
                key={room.id}
                className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur transition-shadow duration-300 hover:shadow-xl">
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      {room.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {room.kind || "Turi belgilanmagan"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <Users className="size-4 text-violet-500" />
                      <span className="font-semibold tabular-nums">
                        {room.occupied}/{room.capacity}
                      </span>
                      <span className="text-slate-400">bemor</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9"
                      onClick={() => openEdit(room)}
                      aria-label="Tahrirlash">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 text-rose-600 hover:text-rose-700"
                      onClick={() => setDeleteId(room.id)}
                      aria-label="O‘chirish">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="relative h-2 overflow-hidden rounded-full bg-emerald-100/90 ring-1 ring-emerald-200/60">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-rose-500 to-violet-600 shadow-sm transition-[width] duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <RoomBedGrid
                    room={room}
                    admissions={admissions}
                    mode="view"
                    size="sm"
                  />

                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                      <span className="inline-block size-2.5 rounded-sm bg-emerald-200 ring-2 ring-emerald-400/50" />
                      Bo‘sh: {free}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                      <span className="inline-block size-2.5 rounded-sm bg-linear-to-br from-rose-500 to-violet-600" />
                      Band: {room.occupied}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-center text-xs text-slate-400">
                  Karavotlar yotqizilgan bemorlar bo‘yicha avtomatik yangilanadi
                </p>
              </article>
            );
          })}
        </div>
      }

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Xonani tahrirlash" : "Yangi xona"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="room-name">Nomi</Label>
              <Input
                id="room-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Masalan: 1-palata"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="room-kind">Turi / bo‘lim</Label>
              <Input
                id="room-kind"
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value }))
                }
                placeholder="Masalan: Comfort palata · Statsionar"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="room-capacity">Sig‘im (o‘rinlar)</Label>
              <Input
                id="room-capacity"
                type="number"
                min={1}
                max={4}
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
              />
              <p className="text-xs text-slate-500">
                Har bir o‘rin alohida karavot ko‘rinishida ko‘rsatiladi (masalan 4
                o‘rinli xona — 4 ta karavot).
              </p>
            </div>
            {formError ?
              <p className="text-sm text-rose-600">{formError}</p>
            : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="button" onClick={saveRoom}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xonani o‘chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ?
                `«${deleteTarget.name}» o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.`
              : "Xona o‘chiriladi."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={confirmDelete}>
              O‘chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
