import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getExpenseCategoryLabel } from "./expenses";
import { formatMoney } from "./utils";

export type ExpenseExportRow = {
  date: string;
  category: string;
  categoryDetail?: string | null;
  amount: number;
  description?: string | null;
  createdBy: string;
  paymentType?: string;
};

export type ExpenseExportPayload = {
  periodLabel: string;
  total: number;
  categoryBreakdown: Array<{ name: string; amount: number }>;
  expenses: ExpenseExportRow[];
};

export function exportExpensesExcel(data: ExpenseExportPayload, clinicName: string) {
  const title = `${clinicName} — Xarajatlar (${data.periodLabel})`;

  const summary = [
    ["Ko'rsatkich", "Qiymat"],
    ["Jami chiqim", data.total],
    ["Xarajatlar soni", data.expenses.length],
  ];

  const categoryRows = [
    ["Kategoriya", "Summa"],
    ...data.categoryBreakdown.map((c) => [c.name, c.amount]),
  ];

  const detailRows = [
    ["Sana", "Kategoriya", "To'lov turi", "Summa", "Kiritgan", "Izoh"],
    ...data.expenses.map((e) => [
      new Date(e.date).toLocaleDateString("uz-UZ"),
      getExpenseCategoryLabel(e),
      e.paymentType || "—",
      e.amount,
      e.createdBy,
      e.description || "",
    ]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[title], [], ...summary]), "Umumiy");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(categoryRows), "Kategoriyalar");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailRows), "Xarajatlar");
  XLSX.writeFile(
    wb,
    `xarajatlar-${data.periodLabel.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function exportExpensesPdf(data: ExpenseExportPayload, clinicName: string) {
  const doc = new jsPDF();
  const title = `${clinicName} — Xarajatlar`;

  doc.setFontSize(14);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(`Davr: ${data.periodLabel}`, 14, 26);
  doc.text(`Jami chiqim: ${formatMoney(data.total)}`, 14, 32);
  doc.text(`Xarajatlar soni: ${data.expenses.length} ta`, 14, 38);

  if (data.categoryBreakdown.length > 0) {
    autoTable(doc, {
      startY: 44,
      head: [["Kategoriya", "Summa"]],
      body: data.categoryBreakdown.map((c) => [c.name, formatMoney(c.amount)]),
    });
  }

  if (data.expenses.length > 0) {
    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["Sana", "Kategoriya", "To'lov turi", "Summa", "Kiritgan"]],
      body: data.expenses.map((e) => [
        new Date(e.date).toLocaleDateString("uz-UZ"),
        getExpenseCategoryLabel(e),
        e.paymentType || "—",
        formatMoney(e.amount),
        e.createdBy,
      ]),
      styles: { fontSize: 8 },
    });
  }

  doc.save(
    `xarajatlar-${data.periodLabel.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`
  );
}
