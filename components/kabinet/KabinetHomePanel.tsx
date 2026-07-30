'use client';

import KabinetReportsPanel from '@/components/reports/KabinetReportsPanel';

export default function KabinetHomePanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Bemorlar bo‘yicha hisobot</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ro‘yxatga olish, navbat va kasallik turi bo‘yicha to‘liq statistika.
        </p>
      </div>
      <KabinetReportsPanel />
    </div>
  );
}
