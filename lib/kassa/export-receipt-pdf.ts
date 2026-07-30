import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatMoney, toNumber } from "./utils";
import { getInvoiceItemLabel } from "./custom-service";
import { CLINIC_LOGO_PATH, CLINIC_ADDRESS, getClinicName, getReceiptQrValue } from "./receipt-branding";
import { createBrandedQrDataUrl } from "./receipt-qr";
import type { ReceiptInvoice } from "@/components/kassa/receipt/receipt-view";

async function loadImageDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadReceiptPdf(
  invoice: ReceiptInvoice,
  clinicName?: string
) {
  const name = clinicName || getClinicName();
  const doc = new jsPDF({ unit: "mm", format: [80, 250] });
  const pageWidth = 80;
  const centerX = pageWidth / 2;
  let y = 6;

  const logoData = await loadImageDataUrl(CLINIC_LOGO_PATH);
  if (logoData) {
    doc.addImage(logoData, "PNG", 20, y, 40, 16);
    y += 18;
  }

  doc.setFontSize(11);
  doc.text(name, centerX, y, { align: "center" });
  y += 4;
  doc.setFontSize(7);
  doc.text(CLINIC_ADDRESS, centerX, y, { align: "center", maxWidth: 72 });
  y += 6;
  doc.setFontSize(9);
  doc.text("Kvitansiya / Chek", centerX, y, { align: "center" });
  y += 8;

  const meta = [
    ["Chek №", String(invoice.invoiceNumber)],
    ["Sana", formatDate(invoice.createdAt)],
    ["Kassir", invoice.cashier.fullName],
    ["Bemor", invoice.patient.fullName],
  ];
  if (invoice.patient.phone) meta.push(["Tel", invoice.patient.phone]);
  if (invoice.referralNote) meta.push(["Yo'nalish", invoice.referralNote]);

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 0.5 },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 50 } },
    body: meta,
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    head: [["Xizmat", "Summa"]],
    styles: { fontSize: 7 },
    body: invoice.items.map((item) => [
      `${getInvoiceItemLabel(item)} (${item.quantity}x)`,
      formatMoney(toNumber(item.subtotal)),
    ]),
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  const totals = [
    ["Jami", formatMoney(toNumber(invoice.subtotal))],
    ...(toNumber(invoice.discount) > 0
      ? [["Chegirma", `-${formatMoney(toNumber(invoice.discount))}`]]
      : []),
    ["TO'LOV", formatMoney(toNumber(invoice.total))],
    ["To'lov turi", invoice.paymentType.name],
    ["Berildi", formatMoney(toNumber(invoice.amountPaid))],
    ...(toNumber(invoice.changeAmount) > 0
      ? [["Qaytim", formatMoney(toNumber(invoice.changeAmount))]]
      : []),
  ];

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 8, fontStyle: "bold" },
    body: totals,
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Rahmat! Sog'ligingiz uchun!", centerX, y, { align: "center" });
  y += 6;

  const qrValue = getReceiptQrValue({
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.total,
    createdAt: invoice.createdAt,
    patientName: invoice.patient.fullName,
  });
  const qrData = await createBrandedQrDataUrl(qrValue, {
    label: `Chek #${invoice.invoiceNumber}`,
  });
  if (qrData) {
    doc.addImage(qrData, "PNG", 12, y, 56, 58);
  }

  doc.save(`chek-${invoice.invoiceNumber}.pdf`);
}
