"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, Search, UserRound, X } from "lucide-react";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { PhoneInput } from "@/components/kassa/ui/phone-input";
import { Badge } from "@/components/kassa/ui/badge";
import { Button } from "@/components/kassa/ui/button";
import { formatUzPhoneDisplay } from "@/lib/kassa/phone";

export type SelectedKassaPatient = {
  garmonikPatientId: string;
  kassaPatientId: string | null;
  cardNumber: string;
  fullName: string;
  phone: string;
};

type SearchHit = SelectedKassaPatient & {
  diseaseType?: string;
};

type Props = {
  patientName: string;
  patientPhone: string;
  selectedPatient: SelectedKassaPatient | null;
  onPatientNameChange: (value: string) => void;
  onPatientPhoneChange: (value: string) => void;
  onSelectPatient: (patient: SelectedKassaPatient | null) => void;
};

export function PatientLookupField({
  patientName,
  patientPhone,
  selectedPatient,
  onPatientNameChange,
  onPatientPhoneChange,
  onSelectPatient,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchError, setSearchError] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setHits([]);
      setSearchError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const res = await fetch(
          `/api/kassa/patients/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok) {
          setHits([]);
          setSearchError(data.error || "Qidiruv xatosi");
          return;
        }
        setHits(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setHits([]);
        setSearchError("Server bilan aloqa yo'q");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickPatient(hit: SearchHit) {
    onSelectPatient({
      garmonikPatientId: hit.garmonikPatientId,
      kassaPatientId: hit.kassaPatientId,
      cardNumber: hit.cardNumber,
      fullName: hit.fullName,
      phone: hit.phone,
    });
    onPatientNameChange(hit.fullName);
    onPatientPhoneChange(hit.phone ? formatUzPhoneDisplay(hit.phone) : "");
    setSearchQuery("");
    setHits([]);
    setOpen(false);
  }

  function clearSelection() {
    onSelectPatient(null);
    onPatientNameChange("");
    onPatientPhoneChange("");
    setSearchQuery("");
    setHits([]);
  }

  return (
    <div ref={rootRef} className="space-y-4 sm:col-span-2">
      <div className="space-y-2">
        <Label htmlFor="patient-search">Karta / telefon / ism bo&apos;yicha qidirish</Label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="patient-search"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="KB-2026-00001 yoki +998..."
            autoComplete="off"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        {searchError ? <p className="text-sm text-destructive">{searchError}</p> : null}
        {open && hits.length > 0 ? (
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {hits.map((hit) => (
              <button
                key={hit.garmonikPatientId}
                type="button"
                className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-violet-50"
                onClick={() => pickPatient(hit)}
              >
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{hit.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {hit.cardNumber}
                    {hit.phone ? ` · ${hit.phone}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : null}
        {open && !searching && searchQuery.trim().length >= 2 && hits.length === 0 && !searchError ? (
          <p className="text-sm text-muted-foreground">Bemor topilmadi</p>
        ) : null}
      </div>

      {selectedPatient ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserRound className="h-5 w-5 shrink-0 text-violet-600" />
            <div className="min-w-0">
              <p className="truncate font-medium text-violet-900">{selectedPatient.fullName}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-violet-200 text-violet-700">
                  {selectedPatient.cardNumber}
                </Badge>
                <span className="text-xs text-violet-700">Klinika kartasi bog&apos;langan</span>
              </div>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Ism familiya *</Label>
          <Input
            value={patientName}
            onChange={(e) => {
              onSelectPatient(null);
              onPatientNameChange(e.target.value);
            }}
            placeholder="Masalan: Aliyev Sardor"
          />
        </div>
        <div className="space-y-2">
          <Label>Telefon</Label>
          <PhoneInput
            value={patientPhone}
            onChange={(value) => {
              onSelectPatient(null);
              onPatientPhoneChange(value);
            }}
          />
        </div>
      </div>
    </div>
  );
}
