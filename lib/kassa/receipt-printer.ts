import net from "net";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getReceiptPrinterConfig } from "./receipt-print-config";

const execFileAsync = promisify(execFile);

function sendEscPosViaTcp(
  data: Buffer,
  host: string,
  port: number,
  timeoutMs: number
) {
  return new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => finish(new Error("Printer javob bermadi (timeout)")));
    socket.once("error", (error) => finish(error));
    socket.connect(port, host, () => {
      socket.write(data, (error) => {
        if (error) {
          finish(error);
          return;
        }
        socket.end();
        finish();
      });
    });
  });
}

async function detectWindowsPrinterName() {
  try {
    const { stdout } = await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "$exclude = '(copy|копия|OneNote|PDF|Fax|XPS|Microsoft|Send to|Wondershare|FineReader|Canon|EPSON)'; " +
          "Get-Printer | Where-Object { $_.Name -notmatch $exclude -and $_.Name -match 'XP|XPrinter|Xprinter|POS|E200|Receipt|Chek|80C|80' } " +
          "| Sort-Object @{ Expression = { " +
          "  $s = 0; if ($_.Name -match 'Xprinter XP-80') { $s += 150 }; if ($_.Name -eq 'XP-80C') { $s += 70 }; if ($_.Name -match '^XP-80') { $s += 50 }; " +
          "  if ([string]$_.PrinterStatus -eq 'Normal') { $s += 60 }; if ([string]$_.PrinterStatus -eq 'Error') { $s -= 40 }; -$s " +
          "} } | Select-Object -First 1 -ExpandProperty Name",
      ],
      { timeout: 10000 }
    );
    return stdout.trim();
  } catch {
    return "";
  }
}

async function sendEscPosViaWindowsPrinter(data: Buffer, printerName: string) {
  const tmpFile = path.join(os.tmpdir(), `garmonik-receipt-${Date.now()}.bin`);
  const scriptPath = path.join(process.cwd(), "scripts", "windows-raw-print.ps1");

  try {
    fs.writeFileSync(tmpFile, data);
    await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-PrinterName",
        printerName,
        "-FilePath",
        tmpFile,
      ],
      { timeout: 15000 }
    );
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }
  }
}

export async function sendEscPosToNetworkPrinter(
  data: Buffer,
  config?: { host?: string; port?: number; timeoutMs?: number; printerName?: string }
) {
  const defaults = getReceiptPrinterConfig();
  const host = config?.host || defaults.host;
  const port = config?.port || defaults.port;
  const timeoutMs = config?.timeoutMs ?? 8000;
  const printerName = config?.printerName || defaults.printerName;

  if (process.platform === "win32") {
    const name = printerName || (await detectWindowsPrinterName());
    if (name) {
      await sendEscPosViaWindowsPrinter(data, name);
      return { mode: "windows" as const, target: name };
    }
  }

  if (!host.trim()) {
    throw new Error("Printer IP manzili sozlanmagan");
  }

  await sendEscPosViaTcp(data, host, port, timeoutMs);
  return { mode: "tcp" as const, target: `${host}:${port}` };
}
