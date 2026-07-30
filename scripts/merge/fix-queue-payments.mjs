/**
 * Kassa cheki bor, lekin navbatda hali "To'lanmagan" qolgan bemorlarni tuzatish.
 *   npm run merge:fix-queue-payments
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { PrismaClient } from "../../node_modules/.prisma/kassa-client/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
process.chdir(root);

config({ path: ".env.local" });
config({ path: ".env" });

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL topilmadi");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: dbUrl });
const prisma = new PrismaClient();

async function main() {
  const clinic = await pool.query(
    `select id from public.clinics order by created_at asc limit 1`,
  );
  const clinicId = clinic.rows[0]?.id;
  if (!clinicId) throw new Error("Klinika topilmadi");

  const queueRes = await pool.query(
    `select payload from public.clinic_json_resources
     where clinic_id = $1 and key = 'queue' limit 1`,
    [clinicId],
  );
  const payload = queueRes.rows[0]?.payload;
  if (!Array.isArray(payload)) {
    console.log("Navbat bo'sh");
    return;
  }

  let fixed = 0;
  const updated = [];

  for (const row of payload) {
    if (!row || typeof row !== "object" || !row.patientId) {
      updated.push(row);
      continue;
    }

    const status = row.status ?? "waiting_payment";
    if (status !== "waiting_payment") {
      updated.push(row);
      continue;
    }

    const kassaPatient = await prisma.patient.findFirst({
      where: { garmonikPatientId: String(row.patientId) },
      select: { id: true },
    });

    if (!kassaPatient) {
      updated.push(row);
      continue;
    }

    const paidInvoice = await prisma.invoice.findFirst({
      where: {
        patientId: kassaPatient.id,
        status: { in: ["PAID", "PARTIALLY_PAID"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!paidInvoice) {
      updated.push(row);
      continue;
    }

    updated.push({ ...row, status: "ready_for_doctor" });
    fixed++;
    console.log(`[OK] ${row.fullName ?? row.patientId} → To'langan`);
  }

  await pool.query(
    `insert into public.clinic_json_resources (clinic_id, key, payload, updated_at)
     values ($1, 'queue', $2::jsonb, now())
     on conflict (clinic_id, key)
     do update set payload = excluded.payload, updated_at = now()`,
    [clinicId, JSON.stringify(updated)],
  );

  console.log(`\nTuzatildi: ${fixed} ta bemor`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
