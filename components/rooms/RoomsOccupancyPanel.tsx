"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchClinicResource, saveClinicResource } from "@/lib/clinic-data/client";
import { type ClinicRoom } from "@/lib/clinic-rooms/types";
import { Armchair, Minus, Plus, Users } from "lucide-react";
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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-200/60 bg-linear-to-br from-violet-50/90 to-indigo-50/80 p-5 shadow-md backdrop-blur">
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
                · band {totalStats.occ} · bosh {totalStats.cap - totalStats.occ}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
                  <p className="text-xs text-slate-500">{room.kind}</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <Users className="size-4 text-violet-500" />
                  <span className="font-semibold tabular-nums">
                    {room.occupied}/{room.capacity}
                  </span>
                  <span className="text-slate-400">bemor</span>
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
                    Bemorlar soni (demo)
                  </Label>
                  <Input
                    id={`occ-${room.id}`}
                    type="number"
                    min={0}
                    max={room.capacity}
                    value={room.occupied}
                    onChange={(e) => setOccupiedDirect(room.id, e.target.value)}
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

      <p className="text-center text-xs text-slate-400">
        Qizil–binafsha gradient — band o‘rin; yashil fon — bosh o‘rin. Sonlarni
        o‘zgartirsangiz, chiziqlar va katakchalar yangilanadi.
      </p>
    </div>
  );
}
