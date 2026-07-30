import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatMoney } from "./utils";
import { PLATFORM_LABELS } from "@/components/kassa/reports/report-utils";

type ReportPayload = {
  period: string;
  start: string;
  end: string;
  revenue: {
    grandTotal: number;
    transactionCount: number;
    averagePayment: number;
    byPlatform: Record<string, { total: number; count: number }>;
    topServices: Array<{ name: string; count: number; total: number }>;
    customServices?: Array<{ name: string; count: number; total: number }>;
    refundedServices?: Array<{ name: string; count: number; total: number }>;
  };
  profit?: number;
  expenses?: {
    total: number;
    categoryBreakdown?: Array<{ name: string; amount: number }>;
  };
};

const PERIOD_TITLES: Record<string, string> = {
  day: "Kunlik",
  month: "Oylik",
  half_year: "Yarim yillik",
  year: "Yillik",
};

export function exportReportExcel(data: ReportPayload, clinicName: string) {
  const title = `${clinicName} — ${PERIOD_TITLES[data.period] || data.period} hisobot`;
  const platforms = Object.entries(data.revenue.byPlatform).filter(([, v]) => v.count > 0);
  const expenseTotal = data.expenses?.total ?? 0;
  const profit = data.profit ?? data.revenue.grandTotal - expenseTotal;

  const summary = [
    ["Ko'rsatkich", "Qiymat"],
    ["Kirim (tushum)", data.revenue.grandTotal],
    ["Chiqim (xarajat)", expenseTotal],
    ["Sof foyda / zarar", profit],
    ["Tranzaksiyalar", data.revenue.transactionCount],
    ["O'rtacha to'lov", data.revenue.averagePayment],
  ];

  const incomeRows = [
    ["To'lov turi", "Summa", "Soni"],
    ...platforms.map(([p, v]) => [PLATFORM_LABELS[p] || p, v.total, v.count]),
  ];

  const expenseRows = [
    ["Kategoriya", "Summa"],
    ...(data.expenses?.categoryBreakdown?.map((c) => [c.name, c.amount]) ?? []),
  ];

  const topRows = [
    ["#", "Xizmat", "Miqdor", "Summa"],
    ...data.revenue.topServices.map((s, i) => [i + 1, s.name, s.count, s.total]),
  ];

  const refundRows = [
    ["Xizmat", "Qaytarishlar", "Summa"],
    ...(data.revenue.refundedServices?.map((s) => [s.name, s.count, s.total]) ?? []),
  ];

  const customRows = [
    ["Xizmat", "Miqdor", "Summa"],
    ...(data.revenue.customServices?.map((s) => [s.name, s.count, s.total]) ?? []),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[title], [], ...summary]), "Umumiy");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(incomeRows), "Kirim");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expenseRows), "Chiqim");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(topRows), "Top xizmatlar");
  if (refundRows.length > 1) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(refundRows), "Qaytarilgan pullar");
  }
  if (customRows.length > 1) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(customRows), "Qo'shimcha xizmatlar");
  }
  XLSX.writeFile(wb, `hisobot-${data.period}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportReportPdf(data: ReportPayload, clinicName: string) {
  const doc = new jsPDF();
  const title = `${clinicName} — ${PERIOD_TITLES[data.period] || data.period} hisobot`;
  const expenseTotal = data.expenses?.total ?? 0;
  const profit = data.profit ?? data.revenue.grandTotal - expenseTotal;

  doc.setFontSize(14);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(
    `Davr: ${new Date(data.start).toLocaleDateString("uz-UZ")} — ${new Date(data.end).toLocaleDateString("uz-UZ")}`,
    14,
    26
  );

  autoTable(doc, {
    startY: 32,
    head: [["Ko'rsatkich", "Qiymat"]],
    body: [
      ["Kirim (tushum)", formatMoney(data.revenue.grandTotal)],
      ["Chiqim (xarajat)", formatMoney(expenseTotal)],
      ["Sof foyda / zarar", formatMoney(profit)],
      ["Tranzaksiyalar", String(data.revenue.transactionCount)],
      ["O'rtacha to'lov", formatMoney(data.revenue.averagePayment)],
    ],
  });

  const platforms = Object.entries(data.revenue.byPlatform).filter(([, v]) => v.count > 0);
  if (platforms.length > 0) {
    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["Kirim — to'lov turi", "Summa", "Soni"]],
      body: platforms.map(([p, v]) => [
        PLATFORM_LABELS[p] || p,
        formatMoney(v.total),
        String(v.count),
      ]),
    });
  }

  if (data.expenses?.categoryBreakdown?.length) {
    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["Chiqim — kategoriya", "Summa"]],
      body: data.expenses.categoryBreakdown.map((c) => [c.name, formatMoney(c.amount)]),
    });
  }

  if (data.revenue.customServices?.length) {
    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["Qo'shimcha xizmat", "Miqdor", "Summa"]],
      body: data.revenue.customServices.map((s) => [
        s.name,
        String(s.count),
        formatMoney(s.total),
      ]),
    });
  }

  if (data.revenue.topServices.length > 0) {
    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["#", "Xizmat (kirim)", "Summa"]],
      body: data.revenue.topServices.map((s, i) => [
        String(i + 1),
        s.name,
        formatMoney(s.total),
      ]),
    });
  }

  if (data.revenue.refundedServices?.length) {
    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["Xizmat", "Qaytarilgan summa"]],
      body: data.revenue.refundedServices.map((s) => [s.name, formatMoney(s.total)]),
    });
  }

  doc.save(`hisobot-${data.period}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
