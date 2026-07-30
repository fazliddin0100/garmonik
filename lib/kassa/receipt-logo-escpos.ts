import fs from "fs";
import path from "path";

const LF = 0x0a;

let cachedLogoRaster: Buffer | null | undefined;

function resolvePrebuiltLogoPath() {
  return path.join(process.cwd(), "public", "garmonik-logo-escpos.bin");
}

export async function getReceiptLogoEscPos() {
  if (cachedLogoRaster !== undefined) {
    return cachedLogoRaster;
  }

  const prebuiltPath = resolvePrebuiltLogoPath();
  if (fs.existsSync(prebuiltPath)) {
    cachedLogoRaster = fs.readFileSync(prebuiltPath);
    return cachedLogoRaster;
  }

  cachedLogoRaster = null;
  return null;
}

export function appendLogoToEscPos(chunks: Buffer[], logoRaster: Buffer | null) {
  if (!logoRaster) return;
  chunks.push(Buffer.from([0x1b, 0x61, 0x01]));
  chunks.push(logoRaster);
  chunks.push(Buffer.from([LF, LF]));
}
