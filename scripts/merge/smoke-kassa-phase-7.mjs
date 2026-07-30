/**
 * Bosqich 7: login faqat garmonik_session beradi, kassa_session yo'q
 *   node scripts/merge/smoke-kassa-phase-7.mjs
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
  const jar = new Map();
  for (const line of headers.getSetCookie?.() ?? []) {
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

let failed = 0;
function check(label, cond, detail = "") {
  const ok = Boolean(cond);
  console.log(
    ok
      ? `[OK] ${label}${detail ? `: ${detail}` : ""}`
      : `[FAIL] ${label}${detail ? `: ${detail}` : ""}`,
  );
  if (!ok) failed++;
}

async function detectDevServerBase() {
  for (const base of CANDIDATE_BASES) {
    try {
      const res = await fetchTimed(`${base}/kassa/login`, {}, 4000);
      if (res.ok || res.status === 307 || res.status === 308) return base;
    } catch {
      /* next */
    }
  }
  throw new Error("Dev server topilmadi (3000/3001)");
}

async function main() {
  const base = await detectDevServerBase();
  console.log(`Base: ${base}`);

  const jar = new Map();
  const { res: loginRes, jar: jar1 } = await fetchWithCookies(
    `${base}/api/kassa/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: "kassir1",
        password: "kassir123",
      }),
    },
    jar,
  );

  check("login 200", loginRes.status === 200, String(loginRes.status));
  check("garmonik_session bor", jar1.has("garmonik_session"), [...jar1.keys()].join(", "));
  check("kassa_session yo'q", !jar1.has("kassa_session"), [...jar1.keys()].join(", "));

  const { res: meRes } = await fetchWithCookies(
    `${base}/api/auth/me`,
    { cache: "no-store" },
    jar1,
  );
  const me = await meRes.json().catch(() => ({}));
  check("auth/me kassa kind", me?.kind === "kassa", JSON.stringify(me));

  const { res: kassaRes } = await fetchWithCookies(
    `${base}/kassa`,
    { redirect: "manual" },
    jar1,
  );
  check(
    "kassa sahifa ochiladi",
    kassaRes.status === 200 || kassaRes.status === 307,
    String(kassaRes.status),
  );

  if (failed > 0) process.exit(1);
  console.log("\nBosqich 7 smoke OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
