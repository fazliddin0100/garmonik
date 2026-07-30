/**
 * Bosqich 5 smoke: bemor qidiruv API
 *   node scripts/merge/smoke-kassa-phase-5.mjs
 */
const TIMEOUT_MS = 12_000;
const CANDIDATE_BASES = [
  process.env.KASSA_SMOKE_BASE,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
].filter(Boolean);

async function fetchTimed(url, opts = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal, redirect: opts.redirect ?? "follow" });
  } finally {
    clearTimeout(timer);
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
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

let failed = 0;
function check(label, cond, detail = "") {
  const ok = Boolean(cond);
  console.log(ok ? `[OK] ${label}${detail ? `: ${detail}` : ""}` : `[FAIL] ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failed++;
}

async function detectBase() {
  if (process.env.KASSA_SMOKE_BASE) return process.env.KASSA_SMOKE_BASE;
  for (const base of CANDIDATE_BASES) {
    try {
      const res = await fetchTimed(`${base}/kassa/login`, { redirect: "manual" }, 3000);
      if ([200, 302, 307].includes(res.status)) return base;
    } catch { /* next */ }
  }
  return null;
}

async function main() {
  const base = await detectBase();
  if (!base) {
    console.error("[FAIL] Dev server topilmadi. npm run dev");
    process.exit(1);
  }

  console.log(`=== Bosqich 5 smoke (${base}) ===\n`);

  const jar = new Map();
  const { res: loginRes, jar: session } = await fetchWithCookies(
    `${base}/api/kassa/auth/login`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: "kassir1", password: "kassir123" }),
    },
    jar,
  );
  check("login", loginRes.ok, String(loginRes.status));

  const { res: emptyRes } = await fetchWithCookies(`${base}/api/kassa/patients/search?q=a`, {}, session);
  const empty = await emptyRes.json();
  check("short query returns empty array", emptyRes.ok && Array.isArray(empty) && empty.length === 0);

  const { res: searchRes } = await fetchWithCookies(
    `${base}/api/kassa/patients/search?q=KB-`,
    {},
    session,
  );
  const hits = await searchRes.json();
  check("KB- search", searchRes.ok && Array.isArray(hits), `${hits?.length ?? 0} natija`);

  if (Array.isArray(hits) && hits.length > 0) {
    const first = hits[0];
    check("hit has cardNumber", typeof first.cardNumber === "string" && first.cardNumber.startsWith("KB-"));
    check("hit has garmonikPatientId", typeof first.garmonikPatientId === "string");
    check("hit has kassaPatientId after sync", typeof first.kassaPatientId === "string", first.kassaPatientId);
  } else {
    console.log("[INFO] Klinikada KB- kartalar yo'q. npm run merge:phase-5-sync-patients yoki kabinetda karta oching.");
  }

  console.log("");
  if (failed === 0) {
    console.log("Bosqich 5 smoke TAYYOR.");
    process.exit(0);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
