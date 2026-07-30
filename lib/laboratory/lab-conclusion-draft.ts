import type { LabInterpretationSummary, LabResultInterpretation } from '@/lib/laboratory/interpret-results';

function statusLabelUz(status: LabResultInterpretation['status']): string {
  switch (status) {
    case 'high':
      return 'me’yordan yuqori';
    case 'low':
      return 'me’yordan past';
    case 'abnormal':
      return 'me’yordan chetga chiqqan / patologik';
    case 'normal':
      return 'me’yor doirasida';
    default:
      return 'avtomatik baholanmadi';
  }
}

function shortLine(item: LabResultInterpretation): string {
  const unit = item.unit && item.unit !== '—' ? ` ${item.unit}` : '';
  const norm = item.norm && item.norm !== '—' ? ` (me’yor: ${item.norm})` : '';
  const deviation = item.deviation ? ` · ${item.deviation}` : '';
  return `${item.label} — ${item.value}${unit}${norm}: ${statusLabelUz(item.status)}${deviation}. ${item.advice}`;
}

/**
 * Shifokor «Laboratoriya xulosasi» inputiga qo‘yiladigan qisqa draft.
 * Me’yorlar va klinik qoidalar asosida yig‘iladi; shifokor tahrirlashi mumkin.
 */
export function buildLabConclusionDraft(summary: LabInterpretationSummary): string {
  if (summary.items.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push(
    'Laboratoriya natijalari bo‘yicha avtomatik xulosa (klinik me’yorlar / xalqaro amaliyot asosida):',
  );
  lines.push('');

  const focus =
    summary.abnormalItems.length > 0 ?
      summary.abnormalItems
    : summary.items.filter((i) => i.status !== 'unknown').slice(0, 8);

  if (focus.length === 0) {
    lines.push(summary.overview);
  } else {
    focus.forEach((item, index) => {
      lines.push(`${index + 1}. ${shortLine(item)}`);
    });
  }

  lines.push('');
  lines.push(`Umumiy baho: ${summary.overview}`);

  if (summary.clinicalHints.length > 0) {
    lines.push('');
    lines.push('Qo‘shimcha klinik tavsiyalar:');
    for (const hint of summary.clinicalHints) {
      lines.push(`• ${hint}`);
    }
  }

  lines.push('');
  lines.push(
    'Eslatma: Bu avtomatik yordamchi xulosa. Yakuniy tashxis, davolash va qo‘shimcha tekshiruvlar (shu jumladan UZI) shifokor tomonidan belgilanadi.',
  );

  return lines.join('\n');
}
