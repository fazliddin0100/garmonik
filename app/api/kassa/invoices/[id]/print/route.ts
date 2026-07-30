import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/kassa/auth";
import { buildReceiptEscPos } from "@/lib/kassa/receipt-escpos";
import { getInvoiceForReceipt } from "@/lib/kassa/invoice-receipt";
import { getReceiptPrinterConfig } from "@/lib/kassa/receipt-print-config";
import { sendEscPosToNetworkPrinter } from "@/lib/kassa/receipt-printer";
import { getClinicName } from "@/lib/kassa/receipt-branding";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await getInvoiceForReceipt(id);
  if (!invoice) {
    return NextResponse.json({ error: "Chek topilmadi" }, { status: 404 });
  }

  const config = getReceiptPrinterConfig();
  const buffer = await buildReceiptEscPos(invoice, {
    width: config.width,
    clinicName: getClinicName(),
  });

  return NextResponse.json({
    data: buffer.toString("base64"),
    bytes: buffer.length,
    width: config.width,
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await getInvoiceForReceipt(id);
  if (!invoice) {
    return NextResponse.json({ error: "Chek topilmadi" }, { status: 404 });
  }

  const config = getReceiptPrinterConfig();
  if (!config.enabled) {
    return NextResponse.json(
      {
        error: "Termal printer o'chirilgan (RECEIPT_PRINTER_ENABLED=false).",
      },
      { status: 503 }
    );
  }

  if (!config.serverPrintEnabled) {
    return NextResponse.json(
      {
        error:
          "Server orqali chop etish o'chirilgan. Printer ulangan kompyuterda print agent ishga tushiring (kassa-print-agent.bat).",
      },
      { status: 503 }
    );
  }

  try {
    const buffer = await buildReceiptEscPos(invoice, {
      width: config.width,
      clinicName: getClinicName(),
    });
    const result = await sendEscPosToNetworkPrinter(buffer, {
      host: config.host,
      port: config.port,
      printerName: config.printerName,
    });

    return NextResponse.json({
      success: true,
      message: "Chek printerga yuborildi",
      printer: result.target,
      mode: result.mode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Printerga yuborib bo'lmadi";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
