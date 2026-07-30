param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$FilePath
)

$ErrorActionPreference = "Stop"

function Get-Win32ErrorText {
  param([int]$Code)
  if ($Code -le 0) { return "noma'lum" }
  try {
    return ([ComponentModel.Win32Exception]::new($Code)).Message
  } catch {
    return "kod $Code"
  }
}

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "Fayl topilmadi: $FilePath"
}

$printer = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if (-not $printer) {
  throw "Printer topilmadi: '$PrinterName'. PowerShell: Get-Printer | Format-Table Name, PrinterStatus"
}

$status = $printer.PrinterStatus.ToString()
$blocked = @(
  "Error", "Offline", "PaperOut", "PaperJam", "NotAvailable",
  "DoorOpen", "Paused", "PendingDeletion", "UserIntervention"
)
if ($blocked -contains $status) {
  throw (
    "Printer tayyor emas: '$PrinterName' holati = $status. " +
    "Navbatni tozalang (Cancel All Documents), USB/qog'ozni tekshiring, printerni o'chirib-yoqing."
  )
}

$bytes = [System.IO.File]::ReadAllBytes($FilePath)
if ($bytes.Length -eq 0) {
  throw "Chek fayli bo'sh: $FilePath"
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDatatype;
  }

  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO di);

  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

  public static string SendBytes(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
      return "OpenPrinter: " + Marshal.GetLastWin32Error();
    }

    try {
      var di = new DOCINFO {
        pDocName = "Garmonik Chek",
        pOutputFile = null,
        pDatatype = "RAW"
      };

      if (!StartDocPrinter(hPrinter, 1, ref di)) {
        return "StartDocPrinter: " + Marshal.GetLastWin32Error();
      }

      try {
        if (!StartPagePrinter(hPrinter)) {
          return "StartPagePrinter: " + Marshal.GetLastWin32Error();
        }

        int written;
        if (!WritePrinter(hPrinter, bytes, bytes.Length, out written)) {
          return "WritePrinter: " + Marshal.GetLastWin32Error();
        }

        if (written -ne bytes.Length) {
          return "WritePrinter: faqat " + written + " / " + bytes.Length + " bayt yozildi";
        }

        EndPagePrinter(hPrinter);
        return null;
      } finally {
        EndDocPrinter(hPrinter);
      }
    } finally {
      ClosePrinter(hPrinter);
    }
  }
}
"@

$errCode = [RawPrinterHelper]::SendBytes($PrinterName, $bytes)
if ($null -ne $errCode) {
  $detail = Get-Win32ErrorText -Code ([int]($errCode -replace '\D+', ''))
  throw "Printerga yozib bo'lmadi: $PrinterName ($errCode — $detail)"
}

Write-Output "OK"
