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
import { fetchClinicResource, saveClinicResource } from "@/lib/clinic-data/client";
import { type ClinicRoom } from "@/lib/clinic-rooms/types";
import { Armchair, Minus, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const OCCUPIED_FROM = "from-rose-500";
const OCCUPIED_TO = "to-violet-600";
const FREE_BG = "bg-emerald-100";
const FREE_RING = "ring-emerald-400/50";

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

function RoomOccupancyVisual({
  capacity,
  occupied,
  animateKey,
}: {
  capacity: number;
  occupied: number;
  animateKey: string;
}) {
  const free = Math.max(0, capacity - occupied);
  const pct =
    capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0;

  const showDiscrete = capacity <= 20;
  const slots = showDiscrete ? capacity : 20;
  const occupiedVisual = showDiscrete
    ? occupied
    : Math.round((occupied / capacity) * slots);

  return (
    <div className="space-y-3">
      <div
        className="relative h-3 overflow-hidden rounded-full bg-emerald-100/90 ring-1 ring-emerald-200/60"
        key={`bar-${animateKey}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-linear-to-r ${OCCUPIED_FROM} ${OCCUPIED_TO} shadow-sm transition-[width] duration-700 ease-out motion-reduce:transition-none`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {showDiscrete ?
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: capacity }, (_, i) => {
            const isOccupied = i < occupied;
            return (
              <span
                key={`${animateKey}-slot-${i}`}
                className={`size-3.5 rounded-md motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-reduce:animate-none ${
                  isOccupied ?
                    `bg-linear-to-br ${OCCUPIED_FROM} ${OCCUPIED_TO} shadow-sm shadow-rose-500/20`
                  : `${FREE_BG} ring-2 ring-inset ${FREE_RING}`
                }`}
                style={{
                  animationDelay: `${Math.min(i, 24) * 35}ms`,
                  animationDuration: "380ms",
                  animationFillMode: "backwards",
                }}
                title={isOccupied ? "Band o‘rin" : "Bosh o‘rin"}
              />
            );
          })}
        </div>
      : <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: slots }, (_, i) => {
            const isOccupied = i < occupiedVisual;
            return (
              <span
                key={`${animateKey}-mini-${i}`}
                className={`size-2.5 rounded-sm motion-safe:animate-in motion-safe:zoom-in motion-safe:fade-in motion-reduce:animate-none ${
                  isOccupied ?
                    `bg-linear-to-br ${OCCUPIED_FROM} ${OCCUPIED_TO}`
                  : `${FREE_BG} ring-1 ${FREE_RING}`
                }`}
                style={{
                  animationDelay: `${Math.min(i, 24) * 25}ms`,
                  animationDuration: "320ms",
                  animationFillMode: "backwards",
                }}
              />
            );
          })}
          <span className="self-center text-[10px] text-slate-400">
            ({capacity} o‘rin — qisqacha ko‘rinish)
          </span>
        </div>
      }

      <div className="flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
          <span
            className={`inline-block size-2.5 rounded-sm bg-linear-to-br ${OCCUPIED_FROM} ${OCCUPIED_TO}`}
          />
          Band: {occupied}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
          <span
            className={`inline-block size-2.5 rounded-sm ${FREE_BG} ring-2 ring-emerald-400/50`}
          />
          Bosh: {free}
        </span>
      </div>
    </div>
  );
}

export default function RoomsOccupancyPanel() {
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const skipFirstPersist = useRef(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomFormState>(emptyForm());
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const next = await fetchClinicResource<ClinicRoom[]>("rooms");
          startTransition(() => {
            if (cancelled) return;
            setRooms(Array.isArray(next) ? next : []);
            setHydrated(true);
          });
        } catch {
          startTransition(() => {
            if (cancelled) return;
            setRooms([]);
            setHydrated(true);
          });
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
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

  function bumpOccupied(id: string, delta: number) {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = clampOccupied(r.capacity, r.occupied + delta);
        return { ...r, occupied: next };
      }),
    );
  }

  function setOccupiedDirect(id: string, value: string) {
    const n = parseInt(value, 10);
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          occupied: Number.isFinite(n) ? clampOccupied(r.capacity, n) : r.occupied,
        };
      }),
    );
  }

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
      setRooms((prev) =>
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
      setRooms((prev) => [...prev, payload]);
      toast.success("Xona qo‘shildi");
    }

    setDialogOpen(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
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

                <div className="mt-4">
                  <RoomOccupancyVisual
                    capacity={room.capacity}
                    occupied={room.occupied}
                    animateKey={`${room.id}-${room.occupied}`}
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
                  <div className="grid flex-1 gap-1.5">
                    <Label
                      htmlFor={`occ-${room.id}`}
                      className="text-xs text-slate-500">
                      Bemorlar soni
                    </Label>
                    <Input
                      id={`occ-${room.id}`}
                      type="number"
                      min={0}
                      max={room.capacity}
                      value={room.occupied}
                      onChange={(e) =>
                        setOccupiedDirect(room.id, e.target.value)
                      }
                      className="h-9 max-w-[120px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={room.occupied <= 0}
                      onClick={() => bumpOccupied(room.id, -1)}>
                      <Minus className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={room.occupied >= room.capacity}
                      onClick={() => bumpOccupied(room.id, 1)}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                <p className="mt-3 text-center text-xs text-slate-400">
                  Bosh joylar:{" "}
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {free}
                  </span>
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
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
              />
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
