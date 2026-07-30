/**
 * Mavjud public.patients → kassa.patients bog'lash
 *   npm run merge:phase-5-sync-patients
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
  const { rows } = await pool.query(
    `select id, full_name, phone, birth_date
     from public.patients
     order by created_at asc`,
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const garmonikId = String(row.id);
    const fullName = String(row.full_name ?? "").trim();
    if (!fullName) {
      skipped++;
      continue;
    }

    const phone = row.phone ? String(row.phone).trim() : null;
    const birthDate = row.birth_date ? new Date(row.birth_date) : null;

    const existing = await prisma.patient.findFirst({
      where: { garmonikPatientId: garmonikId },
    });

    if (existing) {
      const needsUpdate =
        existing.fullName !== fullName ||
        (existing.phone ?? "") !== (phone ?? "") ||
        (birthDate?.toISOString() ?? null) !== (existing.birthDate?.toISOString() ?? null);

      if (needsUpdate) {
        await prisma.patient.update({
          where: { id: existing.id },
          data: { fullName, phone, birthDate },
        });
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    await prisma.patient.create({
      data: {
        fullName,
        phone,
        birthDate,
        garmonikPatientId: garmonikId,
      },
    });
    created++;
  }

  console.log(`Jami klinika bemorlari: ${rows.length}`);
  console.log(`Yangi kassa bog'lanishlari: ${created}`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`O'zgarmagan / o'tkazilgan: ${skipped}`);
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
