/**
 * Bosqich 4: kassa API smoke test (dev server ishlab turishi kerak)
 *   node scripts/merge/smoke-kassa-phase-4.mjs
 *
 * Dev server: npm run dev  (odatda http://localhost:3000)
 */
const TIMEOUT_MS = 12_000;
const CANDIDATE_BASES = [
  process.env.KASSA_SMOKE_BASE,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
].filter(Boolean);

function parseSetCookie(headers) {
  const raw = headers.getSetCookie?.() ?? [];
  const jar = new Map();
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchTimed(url, opts = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: controller.signal,
      redirect: opts.redirect ?? "follow",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timeout (${timeoutMs / 1000}s): ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithCookies(url, opts = {}, jar = new Map()) {
  const headers = { ...(opts.headers || {}) };
  const c = cookieHeader(jar);
  if (c) headers.cookie = c;
  const res = await fetchTimed(url, { ...opts, headers });
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return { res, jar };
}

function ok(label, cond, detail = "") {
  console.log(
    cond
      ? `[OK] ${label}${detail ? `: ${detail}` : ""}`
      : `[FAIL] ${label}${detail ? `: ${detail}` : ""}`,
  );
  return cond;
}

let failed = 0;
function check(label, cond, detail) {
  if (!ok(label, cond, detail)) failed++;
}

async function detectDevServerBase() {
  if (process.env.KASSA_SMOKE_BASE) {
    return process.env.KASSA_SMOKE_BASE;
  }

  for (const candidate of CANDIDATE_BASES) {
    try {
      const res = await fetchTimed(`${candidate}/kassa/login`, { redirect: "manual" }, 3000);
      if (res.status === 200 || res.status === 307 || res.status === 302) {
        return candidate;
      }
    } catch {
      /* keyingi port */
    }
  }
  return null;
}

async function main() {
  const base = await detectDevServerBase();

  if (!base) {
    console.log("=== Kassa smoke test ===\n");
    console.error("[FAIL] Dev server topilmadi.");
    console.error("");
    console.error("Avval boshqa terminalda ishga tushiring:");
    console.error("  npm run dev");
    console.error("");
    console.error("Keyin qayta urinib ko'ring:");
    console.error("  npm run merge:smoke-kassa");
    console.error("");
    console.error("Yoki portni qo'lda bering:");
    console.error('  $env:KASSA_SMOKE_BASE="http://localhost:3001"; npm run merge:smoke-kassa');
    process.exit(1);
  }

  console.log(`=== Kassa smoke test (${base}) ===\n`);

  const { res: unauth } = await fetchWithCookies(`${base}/kassa`, { redirect: "manual" });
  check(
    "/kassa redirect when unauth",
    unauth.status === 307 || unauth.status === 302,
    String(unauth.status),
  );

  const jar = new Map();
  const { res: loginRes, jar: jar1 } = await fetchWithCookies(
    `${base}/api/kassa/auth/login`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: "kassir1", password: "kassir123" }),
    },
    jar,
  );
  const loginData = await loginRes.json();
  check(
    "cashier login",
    loginRes.ok && loginData.role === "CASHIER",
    loginData.error || loginData.role,
  );
  check("garmonik_session cookie", jar1.has("garmonik_session"), [...jar1.keys()].join(", "));

  const { res: svcRes } = await fetchWithCookies(`${base}/api/kassa/services`, {}, jar1);
  const services = await svcRes.json();
  check(
    "GET /api/kassa/services",
    svcRes.ok && Array.isArray(services),
    `${services?.length ?? 0} xizmat`,
  );

  const { res: ptRes } = await fetchWithCookies(`${base}/api/kassa/payment-types`, {}, jar1);
  const pts = await ptRes.json();
  check(
    "GET /api/kassa/payment-types",
    ptRes.ok && Array.isArray(pts),
    `${pts?.length ?? 0} tur`,
  );

  const { res: repRes } = await fetchWithCookies(
    `${base}/api/kassa/reports?period=day`,
    {},
    jar1,
  );
  check("GET /api/kassa/reports", repRes.ok, String(repRes.status));

  const { res: kassaPage } = await fetchWithCookies(`${base}/kassa`, {}, jar1);
  check("GET /kassa page", kassaPage.ok, String(kassaPage.status));

  const { res: adminBlock } = await fetchWithCookies(
    `${base}/kassa-admin`,
    { redirect: "manual" },
    jar1,
  );
  check(
    "cashier blocked from /kassa-admin",
    adminBlock.status === 307 || adminBlock.status === 302,
    String(adminBlock.status),
  );

  const adminJar = new Map();
  const { res: adminLogin, jar: jar2 } = await fetchWithCookies(
    `${base}/api/kassa/auth/login`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: "admin@klinika", password: "admin123" }),
    },
    adminJar,
  );
  const adminData = await adminLogin.json();
  check("admin login", adminLogin.ok && adminData.role === "ADMIN");

  const { res: adminPage } = await fetchWithCookies(`${base}/kassa-admin`, {}, jar2);
  check("GET /kassa-admin", adminPage.ok, String(adminPage.status));

  const { res: statsRes } = await fetchWithCookies(`${base}/api/kassa/admin/stats`, {}, jar2);
  check("GET /api/kassa/admin/stats", statsRes.ok, String(statsRes.status));

  const { res: meRes } = await fetchWithCookies(`${base}/api/auth/me`, {}, jar2);
  const me = await meRes.json();
  check("/api/auth/me returns kassa kind", me.kind === "kassa", me.kind);

  if (Array.isArray(services) && services.length > 0 && Array.isArray(pts) && pts.length > 0) {
    const service = services[0];
    const pt = pts.find((p) => !p.requiresGateway) ?? pts[0];
    const price = Number(service.price?.toString?.() ?? service.price ?? 0);
    const { res: invRes } = await fetchWithCookies(
      `${base}/api/kassa/invoices`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientName: "Smoke Test Bemor",
          paymentTypeId: pt.id,
          discount: 0,
          amountPaid: price,
          isPartialPayment: false,
          items: [{ type: "catalog", serviceId: service.id, quantity: 1 }],
        }),
      },
      jar1,
    );
    const inv = await invRes.json();
    check("POST /api/kassa/invoices (to'lov)", invRes.ok && inv.id, inv.error || inv.id);

    if (inv.id) {
      const { res: printRes } = await fetchWithCookies(
        `${base}/api/kassa/invoices/${inv.id}/print`,
        {},
        jar1,
      );
      const printData = await printRes.json();
      check(
        "GET /api/kassa/invoices/:id/print",
        printRes.ok && printData.data,
        printData.error || "ok",
      );
    }
  }

  console.log("");
  if (failed === 0) {
    console.log("Bosqich 4 smoke test TAYYOR.");
    process.exit(0);
  }
  console.log(`${failed} ta tekshiruv muvaffaqiyatsiz.`);
  process.exit(1);
}

main().catch((e) => {
  console.error("");
  console.error("[FAIL]", e instanceof Error ? e.message : e);
  console.error("");
  console.error("Dev server ishlayotganini tekshiring: npm run dev");
  process.exit(1);
});
