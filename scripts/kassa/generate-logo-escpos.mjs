import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logoPath = path.join(root, "public", "garmonik-logo-user.png");
const outPath = path.join(root, "public", "garmonik-logo-escpos.bin");

const GS = 0x1d;

function packRasterBitmap(pixels, width, height) {
  const bytesPerRow = Math.ceil(width / 8);
  const raster = Buffer.alloc(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = pixels[y * width + x];
      if (value >= 128) continue;
      const byteIndex = y * bytesPerRow + Math.floor(x / 8);
      raster[byteIndex] |= 1 << (7 - (x % 8));
    }
  }

  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  return Buffer.concat([
    Buffer.from([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
    raster,
  ]);
}

function toPrintBitmap(rgba, width, height) {
  const mono = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const a = rgba[offset + 3];

    if (a < 40) {
      mono[i] = 255;
      continue;
    }

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance < 24) {
      mono[i] = 255;
      continue;
    }

    mono[i] = luminance < 170 ? 0 : 255;
  }
  return mono;
}

const { data, info } = await sharp(logoPath)
  .resize({
    width: 220,
    height: 90,
    fit: "inside",
    background: { r: 255, g: 255, b: 255 },
  })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const mono = toPrintBitmap(data, info.width, info.height);
const raster = packRasterBitmap(mono, info.width, info.height);
fs.writeFileSync(outPath, raster);
console.log(`Saved ${outPath} (${raster.length} bytes, ${info.width}x${info.height})`);
