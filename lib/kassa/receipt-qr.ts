import QRCode from "qrcode";

export async function createBrandedQrDataUrl(
  value: string,
  options?: { label?: string }
): Promise<string | null> {
  if (typeof document === "undefined") return null;

  const label = options?.label ?? "";

  try {
    const qrSize = 220;
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, value, {
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    const padding = 16;
    const labelHeight = 22;
    const finalSize = qrSize + padding * 2;
    const canvas = document.createElement("canvas");
    canvas.width = finalSize;
    canvas.height = finalSize + labelHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(6, 6, finalSize - 12, finalSize - 12);

    ctx.drawImage(qrCanvas, padding, padding);

    if (label) {
      ctx.fillStyle = "#000000";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, finalSize / 2, finalSize + labelHeight / 2);
    }

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
