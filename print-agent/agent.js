const net = require("net");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const agentDir = __dirname;

const READY_STATUSES = new Set(["Normal", "Printing", "WarmingUp", "Processing", "Busy", "IOActive"]);
const BLOCKED_STATUSES = new Set([
  "Error",
  "Offline",
  "PaperOut",
  "PaperJam",
  "NotAvailable",
  "DoorOpen",
  "Paused",
  "PendingDeletion",
  "UserIntervention",
]);

function envTrim(name, fallback) {
  const value = process.env[name];
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function parseBool(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function loadConfig() {
  const defaults = {
    PRINTER_NAME: envTrim("RECEIPT_PRINTER_NAME", ""),
    AGENT_PORT: envTrim("RECEIPT_PRINT_AGENT_PORT", "17888"),
    USE_TCP: envTrim("RECEIPT_USE_TCP", "0"),
    TCP_HOST: envTrim("RECEIPT_PRINTER_HOST", "127.0.0.1"),
    TCP_PORT: envTrim("RECEIPT_PRINTER_PORT", "9100"),
    TCP_FALLBACK: envTrim("RECEIPT_TCP_FALLBACK", "0"),
  };

  const configPath = path.join(agentDir, "config.txt");
  if (!fs.existsSync(configPath)) return normalizeConfig(defaults);

  const text = fs.readFileSync(configPath, "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.charAt(0) === "#") continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (Object.prototype.hasOwnProperty.call(defaults, key)) {
      defaults[key] = value;
    }
  }

  return normalizeConfig(defaults);
}

function normalizeConfig(raw) {
  return {
    PRINTER_NAME: raw.PRINTER_NAME.trim(),
    AGENT_PORT: parseInt(raw.AGENT_PORT, 10) || 17888,
    USE_TCP: parseBool(raw.USE_TCP),
    TCP_HOST: raw.TCP_HOST.trim() || "127.0.0.1",
    TCP_PORT: parseInt(raw.TCP_PORT, 10) || 9100,
    TCP_FALLBACK: parseBool(raw.TCP_FALLBACK),
  };
}

let config = loadConfig();
const pidFile = path.join(agentDir, "agent.pid");

function reloadConfig() {
  config = loadConfig();
  return config;
}

function isLocalTcpHost(host) {
  const value = (host || "").trim().toLowerCase();
  return !value || value === "127.0.0.1" || value === "localhost" || value === "::1";
}

function tcpTargetLabel(cfg) {
  return cfg.TCP_HOST + ":" + cfg.TCP_PORT;
}

function readRequestBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on("data", function (chunk) {
      chunks.push(chunk);
    });
    req.on("end", function () {
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

function writePidFile() {
  try {
    fs.writeFileSync(pidFile, String(process.pid), "utf8");
  } catch (e) {
    // ignore
  }
}

function removePidFile() {
  try {
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
  } catch (e) {
    // ignore
  }
}

process.on("exit", removePidFile);
process.on("SIGINT", function () {
  removePidFile();
  process.exit(0);
});
process.on("SIGTERM", function () {
  removePidFile();
  process.exit(0);
});

function appendAgentLog(message) {
  try {
    const line = new Date().toISOString() + " " + message + "\n";
    fs.appendFileSync(path.join(agentDir, "agent.log"), line, "utf8");
  } catch (e) {
    // ignore
  }
}

function runPowerShellJson(command) {
  return execFileAsync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { timeout: 15000, maxBuffer: 4 * 1024 * 1024 }
  )
    .then(function (result) {
      const text = (result.stdout || "").trim();
      if (!text) return null;
      return JSON.parse(text);
    })
    .catch(function (error) {
      appendAgentLog("PowerShell xatolik: " + (error && error.message ? error.message : error));
      return null;
    });
}

function queryWindowsPrinter(name) {
  const escaped = name.replace(/'/g, "''");
  const command =
    "$p = Get-Printer -Name '" +
    escaped +
    "' -ErrorAction SilentlyContinue; " +
    "if (-not $p) { @{ exists = $false } | ConvertTo-Json -Compress; exit }; " +
    "@{ exists = $true; name = $p.Name; status = [string]$p.PrinterStatus; jobCount = [int]$p.JobCount } | ConvertTo-Json -Compress";

  return runPowerShellJson(command).then(function (payload) {
    if (!payload || !payload.exists) {
      return { exists: false, name: name, status: "NotFound", jobCount: 0, ready: false };
    }
    const status = String(payload.status || "Unknown");
    return {
      exists: true,
      name: String(payload.name || name),
      status: status,
      jobCount: Number(payload.jobCount) || 0,
      ready: READY_STATUSES.has(status),
    };
  });
}

function detectWindowsPrinterName(preferredName) {
  if (process.platform !== "win32") {
    return Promise.resolve(null);
  }

  const preferred = (preferredName || "").replace(/'/g, "''");
  const command =
    "$exclude = '(copy|копия|OneNote|PDF|Fax|XPS|Microsoft|Send to|Wondershare|FineReader|Canon|EPSON)'; " +
    "$preferred = '" +
    preferred +
    "'; " +
    "$all = Get-Printer | Where-Object { $_.Name -notmatch $exclude }; " +
    "$candidates = $all | Where-Object { $_.Name -match 'XP|XPrinter|Xprinter|POS|E200|Receipt|Chek|80C|80' }; " +
    "if (-not $candidates) { $candidates = $all }; " +
    "$best = $candidates | Sort-Object @{ Expression = { " +
    "  $score = 0; " +
    "  if ($preferred -and $_.Name -eq $preferred) { $score += 200 }; " +
    "  if ($preferred -and $_.Name -like ('*' + $preferred + '*')) { $score += 80 }; " +
    "  if ($_.Name -eq 'Xprinter XP-80' -or $_.Name -eq 'XPrinter XP-80') { $score += 150 }; " +
    "  if ($_.Name -match 'Xprinter XP-80') { $score += 90 }; " +
    "  if ($_.Name -eq 'XP-80C' -or $_.Name -eq 'POS-80C') { $score += 70 }; " +
    "  if ($_.Name -match '^XP-80') { $score += 50 }; " +
    "  if ($_.Name -match 'XP|XPrinter|Xprinter') { $score += 40 }; " +
    "  if ($_.Name -match '\\(copy|копия') { $score -= 200 }; " +
    "  switch ([string]$_.PrinterStatus) { " +
    "    'Normal' { $score += 60 }; " +
    "    'Printing' { $score += 40 }; " +
    "    'Error' { $score -= 40 }; " +
    "    'Offline' { $score -= 80 }; " +
    "    default { $score += 0 }; " +
    "  }; " +
    "  -$score " +
    "} } | Select-Object -First 1; " +
    "if (-not $best) { '{}' } else { @{ name = $best.Name; status = [string]$best.PrinterStatus; jobCount = [int]$best.JobCount } | ConvertTo-Json -Compress }";

  return runPowerShellJson(command).then(function (payload) {
    if (!payload || !payload.name) return null;
    const status = String(payload.status || "Unknown");
    return {
      exists: true,
      name: String(payload.name),
      status: status,
      jobCount: Number(payload.jobCount) || 0,
      ready: READY_STATUSES.has(status),
    };
  });
}

function resolveWindowsPrinter(cfg) {
  if (cfg.PRINTER_NAME) {
    return queryWindowsPrinter(cfg.PRINTER_NAME).then(function (info) {
      if (info.exists) return info;
      return detectWindowsPrinterName(cfg.PRINTER_NAME).then(function (detected) {
        if (detected && detected.name) {
          appendAgentLog(
            "PRINTER_NAME='" +
              cfg.PRINTER_NAME +
              "' topilmadi, avtomatik: " +
              detected.name
          );
          return detected;
        }
        throw new Error(
          "config.txt dagi PRINTER_NAME topilmadi: '" +
            cfg.PRINTER_NAME +
            "'. Windows nomi boshqacha bo'lishi mumkin (masalan Xprinter XP-80). PowerShell: Get-Printer | Format-Table Name, PrinterStatus"
        );
      });
    });
  }
  return detectWindowsPrinterName("").then(function (info) {
    if (info && info.name) return info;
    throw new Error(
      "Chek printeri topilmadi. config.txt ga PRINTER_NAME=Xprinter XP-80 yozing (Get-Printer bilan tekshiring)."
    );
  });
}

function printerWarning(info) {
  if (!info || !info.exists) {
    return "Printer topilmadi. config.txt → PRINTER_NAME ni tekshiring.";
  }
  if (info.ready) return null;
  if (BLOCKED_STATUSES.has(info.status)) {
    return (
      "Printer '" +
      info.name +
      "' holati: " +
      info.status +
      ". Navbatni tozalang, USB/qog'ozni tekshiring, Windows test page sinab ko'ring."
    );
  }
  return "Printer holati: " + info.status + ". Chop etish ishlamasligi mumkin.";
}

function sendToNetworkPrinter(data, cfg) {
  const host = cfg.TCP_HOST;
  const port = cfg.TCP_PORT;

  return new Promise(function (resolve, reject) {
    const socket = new net.Socket();
    socket.setTimeout(8000);
    socket.once("timeout", function () {
      socket.destroy();
      reject(new Error("Printer javob bermadi (TCP timeout " + tcpTargetLabel(cfg) + ")"));
    });
    socket.once("error", reject);
    socket.connect(port, host, function () {
      socket.write(data, function (error) {
        socket.end();
        if (error) reject(error);
        else resolve();
      });
    });
  });
}

function sendToWindowsPrinter(data, printerName) {
  const tmpFile = path.join(os.tmpdir(), "garmonik-receipt-" + Date.now() + ".bin");
  const scriptPath = path.join(agentDir, "windows-raw-print.ps1");

  fs.writeFileSync(tmpFile, data);

  return execFileAsync(
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
    { timeout: 20000, maxBuffer: 10 * 1024 * 1024 }
  )
    .then(function () {
      appendAgentLog("Chop etildi (Windows): " + printerName + " (" + data.length + " bayt)");
    })
    .catch(function (error) {
      const msg = error && error.message ? error.message : "PowerShell xatolik";
      appendAgentLog("Printer xatolik (" + printerName + "): " + msg);
      throw new Error("Printerga yozib bo'lmadi: " + printerName + ". " + msg);
    })
    .finally(function () {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch (e) {
        // ignore
      }
    });
}

function canUseTcp(cfg) {
  return !isLocalTcpHost(cfg.TCP_HOST);
}

function dispatchPrint(data, cfg) {
  if (cfg.USE_TCP && canUseTcp(cfg)) {
    return sendToNetworkPrinter(data, cfg).then(function () {
      return { mode: "tcp", target: tcpTargetLabel(cfg) };
    });
  }

  if (process.platform === "win32") {
    return resolveWindowsPrinter(cfg).then(function (info) {
      if (!info.ready) {
        const warning = printerWarning(info);
        if (cfg.TCP_FALLBACK && canUseTcp(cfg)) {
          appendAgentLog("Windows printer tayyor emas, TCP fallback: " + tcpTargetLabel(cfg));
          return sendToNetworkPrinter(data, cfg).then(function () {
            return { mode: "tcp-fallback", target: tcpTargetLabel(cfg), warning: warning };
          });
        }
        throw new Error(warning || "Printer tayyor emas.");
      }

      return sendToWindowsPrinter(data, info.name)
        .then(function () {
          return { mode: "windows", target: info.name };
        })
        .catch(function (error) {
          if (cfg.TCP_FALLBACK && canUseTcp(cfg)) {
            appendAgentLog("Windows chop etish xato, TCP fallback: " + error.message);
            return sendToNetworkPrinter(data, cfg).then(function () {
              return { mode: "tcp-fallback", target: tcpTargetLabel(cfg) };
            });
          }
          throw error;
        });
    });
  }

  if (!canUseTcp(cfg)) {
    throw new Error("TCP printer sozlanmagan. config.txt → TCP_HOST=printer IP");
  }

  return sendToNetworkPrinter(data, cfg).then(function () {
    return { mode: "tcp", target: tcpTargetLabel(cfg) };
  });
}

function buildHealthPayload(cfg, printerInfo) {
  const warning = printerInfo ? printerWarning(printerInfo) : null;
  const printMode =
    cfg.USE_TCP && canUseTcp(cfg) ? "tcp"
    : process.platform === "win32" ? "windows"
    : "tcp";

  return {
    ok: true,
    platform: process.platform,
    agentPort: cfg.AGENT_PORT,
    configuredPrinter: cfg.PRINTER_NAME || null,
    printerName: printerInfo ? printerInfo.name : cfg.PRINTER_NAME || null,
    printerStatus: printerInfo ? printerInfo.status : null,
    printerReady: printerInfo ? !!printerInfo.ready : null,
    printerJobCount: printerInfo ? printerInfo.jobCount : null,
    printMode: printMode,
    tcpTarget: tcpTargetLabel(cfg),
    tcpFallback: cfg.TCP_FALLBACK && canUseTcp(cfg),
    warning: warning,
  };
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

function parsePrintPayload(req, raw) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();

  if (contentType.indexOf("application/x-www-form-urlencoded") !== -1) {
    const text = raw.toString("utf8");
    const params = new URLSearchParams(text);
    return params.get("data");
  }

  if (contentType.indexOf("application/json") !== -1 || raw.length > 0) {
    try {
      const body = JSON.parse(raw.toString("utf8"));
      return body && body.data ? body.data : null;
    } catch (e) {
      return null;
    }
  }

  return null;
}

const server = http.createServer(function (req, res) {
  setCorsHeaders(res);
  const cfg = reloadConfig();

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    const finish = function (printerInfo) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildHealthPayload(cfg, printerInfo)));
    };

    if (process.platform === "win32" && !(cfg.USE_TCP && canUseTcp(cfg))) {
      resolveWindowsPrinter(cfg)
        .then(finish)
        .catch(function (error) {
          finish(null);
          appendAgentLog("Health printer tekshiruvi: " + error.message);
        });
      return;
    }

    finish(null);
    return;
  }

  if (req.method !== "POST" || req.url !== "/print") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  readRequestBody(req)
    .then(function (raw) {
      const dataBase64 = parsePrintPayload(req, raw);
      if (!dataBase64) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "data (base64) kerak" }));
        return null;
      }

      let buffer;
      try {
        buffer = Buffer.from(dataBase64, "base64");
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Base64 noto'g'ri" }));
        return null;
      }

      if (!buffer.length) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Chek ma'lumoti bo'sh" }));
        return null;
      }

      return dispatchPrint(buffer, cfg).then(function (result) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Chek chop etildi (" + result.target + ")",
            mode: result.mode,
            target: result.target,
            warning: result.warning || null,
          })
        );
      });
    })
    .catch(function (error) {
      const message = error && error.message ? error.message : "Chop etish xatolik";
      appendAgentLog("Print xatolik: " + message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    });
});

server.on("error", function (err) {
  if (err && err.code === "EADDRINUSE") {
    process.exit(0);
  }
  throw err;
});

server.listen(config.AGENT_PORT, "127.0.0.1", function () {
  writePidFile();
  const cfg = reloadConfig();
  console.log("========================================");
  console.log(" GARMONIK KASSA - Chek chop etish agenti");
  console.log("========================================");
  console.log(" Agent: http://127.0.0.1:" + cfg.AGENT_PORT);
  console.log(" Papka: " + agentDir);
  if (cfg.USE_TCP && canUseTcp(cfg)) {
    console.log(" Rejim: TCP " + tcpTargetLabel(cfg));
  } else if (process.platform === "win32") {
    console.log(
      cfg.PRINTER_NAME
        ? " Printer: " + cfg.PRINTER_NAME + " (config.txt)"
        : " Printer: avtomatik (copy/копия nusxalar o'tkaziladi)"
    );
  } else {
    console.log(" TCP: " + tcpTargetLabel(cfg));
  }
  if (cfg.TCP_FALLBACK && canUseTcp(cfg)) {
    console.log(" TCP fallback: yoqilgan");
  }
  console.log(" Fon rejim: start-background.bat yoki install-autostart.bat");
  console.log(" Node.js: " + process.version);
  console.log("========================================");

  if (process.platform === "win32") {
    resolveWindowsPrinter(cfg)
      .then(function (info) {
        const warning = printerWarning(info);
        if (warning) {
          console.log(" OGohlantirish: " + warning);
          appendAgentLog("Startup: " + warning);
        } else {
          appendAgentLog("Startup: printer tayyor — " + info.name);
        }
      })
      .catch(function (error) {
        console.log(" OGohlantirish: " + error.message);
        appendAgentLog("Startup: " + error.message);
      });
  }
});
