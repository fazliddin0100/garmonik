'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PatientLabConclusion } from '@/lib/patients/lab-conclusion';
import { FileText, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

type DoctorLabConclusionFormProps = {
  conclusion?: PatientLabConclusion;
  /** Me’yorlar asosida avtomatik yig‘ilgan draft */
  suggestedDraft?: string;
  saving?: boolean;
  disabled?: boolean;
  onSave: (text: string) => void | Promise<void>;
};

function formatUpdatedAt(iso?: string): string {
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

export default function DoctorLabConclusionForm({
  conclusion,
  suggestedDraft = '',
  saving = false,
  disabled = false,
  onSave,
}: DoctorLabConclusionFormProps) {
  const savedText = conclusion?.text ?? '';
  const [text, setText] = useState(savedText || suggestedDraft);
  const [touched, setTouched] = useState(false);

  // Saqlangan xulosa ustun; bo‘lmasa avtomatik draft
  useEffect(() => {
    if (savedText) {
      setText(savedText);
      setTouched(false);
      return;
    }
    if (!touched) {
      setText(suggestedDraft);
    }
  }, [savedText, conclusion?.updatedAt, suggestedDraft, touched]);

  const dirty = text.trim() !== savedText.trim();
  const canApplySuggestion =
    !!suggestedDraft.trim() && text.trim() !== suggestedDraft.trim();

  return (
    <section className="rounded-2xl border border-amber-200/70 bg-linear-to-br from-amber-50/50 to-white p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-900">
          <FileText className="size-5" />
          <h3 className="font-semibold">Laboratoriya xulosasi</h3>
        </div>
        {suggestedDraft.trim() ?
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl border-amber-200 text-amber-900"
            disabled={disabled || saving || !canApplySuggestion}
            onClick={() => {
              setText(suggestedDraft);
              setTouched(true);
            }}>
            <Sparkles className="mr-1.5 size-3.5" />
            Avtomatik xulosani qo‘yish
          </Button>
        : null}
      </div>
      <p className="mb-3 text-sm text-slate-600">
        Tizim natijalarni klinik me’yorlar bilan solishtirib qisqa xulosa tayyorlaydi. Kerak
        bo‘lsa tahrirlang va saqlang — keyin kasallik tarixidan ko‘chirma uchun ishlatiladi.
      </p>

      {!savedText && suggestedDraft.trim() ?
        <p className="mb-2 rounded-lg bg-amber-100/70 px-3 py-2 text-xs text-amber-900">
          Quyida avtomatik draft joylangan. Ma’qul bo‘lsa «Xulosani saqlash»ni bosing; aks holda
          o‘zgartiring.
        </p>
      : null}

      <div className="grid gap-1.5">
        <Label htmlFor="doctor-lab-conclusion">Xulosa matni</Label>
        <Textarea
          id="doctor-lab-conclusion"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setTouched(true);
          }}
          rows={8}
          disabled={disabled || saving}
          placeholder="Natijalar kiritilgach avtomatik xulosa shu yerga chiqadi…"
          className="rounded-xl font-mono text-sm leading-relaxed"
        />
      </div>

      {conclusion?.updatedAt ?
        <p className="mt-2 text-xs text-slate-500">
          Oxirgi saqlangan: {formatUpdatedAt(conclusion.updatedAt)}
          {conclusion.updatedByName ? ` · ${conclusion.updatedByName}` : ''}
        </p>
      : null}

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          className="rounded-xl bg-amber-700 hover:bg-amber-800"
          disabled={disabled || saving || !text.trim() || (!dirty && !!savedText)}
          onClick={() => void onSave(text)}>
          {saving ? 'Saqlanmoqda…' : 'Xulosani saqlash'}
        </Button>
      </div>
    </section>
  );
}
