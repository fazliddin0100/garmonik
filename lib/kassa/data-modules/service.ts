import { prisma } from '@/lib/kassa/prisma';
import {
  KASSA_MODULE_IDS,
  type KassaModuleId,
} from '@/lib/kassa/data-modules/catalog';

function asArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  return [];
}

function asBundle(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Obyekt kutilgan');
  }
  return raw as Record<string, unknown>;
}

async function resetInvoiceNumberSequence(
  tx: Pick<typeof prisma, '$executeRawUnsafe'>,
): Promise<void> {
  await tx.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('kassa.invoices', 'invoice_number'),
      GREATEST(COALESCE((SELECT MAX(invoice_number) FROM kassa.invoices), 0), 1)
    )
  `);
}

export async function exportKassaModule(moduleId: KassaModuleId): Promise<unknown> {
  switch (moduleId) {
    case 'kassa-users':
      return prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    case 'kassa-clinic-settings':
      return prisma.clinicSettings.findMany();
    case 'kassa-payment-types':
      return prisma.paymentType.findMany({ orderBy: { sortOrder: 'asc' } });
    case 'kassa-service-categories':
      return prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
    case 'kassa-services':
      return prisma.service.findMany({ orderBy: { name: 'asc' } });
    case 'kassa-service-price-history':
      return prisma.servicePriceHistory.findMany({ orderBy: { createdAt: 'asc' } });
    case 'kassa-patients':
      return prisma.patient.findMany({ orderBy: { createdAt: 'asc' } });
    case 'kassa-invoices':
      return {
        invoices: await prisma.invoice.findMany({ orderBy: { createdAt: 'asc' } }),
        items: await prisma.invoiceItem.findMany(),
        payments: await prisma.invoicePayment.findMany({ orderBy: { createdAt: 'asc' } }),
      };
    case 'kassa-expenses':
      return {
        expenses: await prisma.expense.findMany({ orderBy: { createdAt: 'asc' } }),
        payments: await prisma.expensePayment.findMany({ orderBy: { createdAt: 'asc' } }),
      };
    case 'kassa-audit-logs':
      return prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } });
    default: {
      const _exhaustive: never = moduleId;
      return _exhaustive;
    }
  }
}

export async function importKassaModule(
  moduleId: KassaModuleId,
  raw: unknown,
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    const upsertRows = async <T extends { upsert: (args: never) => Promise<unknown> }>(
      model: T,
      rows: Array<Record<string, unknown>>,
    ) => {
      for (const row of rows) {
        const id = String(row.id ?? '');
        if (!id) {
          skipped++;
          continue;
        }
        await model.upsert({
          where: { id },
          create: row,
          update: row,
        } as never);
        imported++;
      }
    };

    switch (moduleId) {
      case 'kassa-users':
        await upsertRows(tx.user, asArray(raw) as Array<Record<string, unknown>>);
        break;
      case 'kassa-clinic-settings': {
        for (const row of asArray(raw) as Array<Record<string, unknown>>) {
          const id = String(row.id ?? 'default');
          await tx.clinicSettings.upsert({
            where: { id },
            create: { ...row, id } as never,
            update: row as never,
          });
          imported++;
        }
        break;
      }
      case 'kassa-payment-types':
        await upsertRows(tx.paymentType, asArray(raw) as Array<Record<string, unknown>>);
        break;
      case 'kassa-service-categories':
        await upsertRows(tx.serviceCategory, asArray(raw) as Array<Record<string, unknown>>);
        break;
      case 'kassa-services':
        await upsertRows(tx.service, asArray(raw) as Array<Record<string, unknown>>);
        break;
      case 'kassa-service-price-history':
        await upsertRows(tx.servicePriceHistory, asArray(raw) as Array<Record<string, unknown>>);
        break;
      case 'kassa-patients':
        await upsertRows(tx.patient, asArray(raw) as Array<Record<string, unknown>>);
        break;
      case 'kassa-invoices': {
        const bundle = asBundle(raw);
        await upsertRows(tx.invoice, asArray(bundle.invoices) as Array<Record<string, unknown>>);
        await upsertRows(tx.invoiceItem, asArray(bundle.items) as Array<Record<string, unknown>>);
        await upsertRows(
          tx.invoicePayment,
          asArray(bundle.payments) as Array<Record<string, unknown>>,
        );
        await resetInvoiceNumberSequence(tx);
        break;
      }
      case 'kassa-expenses': {
        const bundle = asBundle(raw);
        await upsertRows(tx.expense, asArray(bundle.expenses) as Array<Record<string, unknown>>);
        await upsertRows(
          tx.expensePayment,
          asArray(bundle.payments) as Array<Record<string, unknown>>,
        );
        break;
      }
      case 'kassa-audit-logs':
        await upsertRows(tx.auditLog, asArray(raw) as Array<Record<string, unknown>>);
        break;
      default: {
        const _exhaustive: never = moduleId;
        void _exhaustive;
      }
    }
  }, { timeout: 120_000 });

  return { imported, skipped };
}

export async function exportAllKassaModules(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const id of KASSA_MODULE_IDS) {
    out[id] = await exportKassaModule(id);
  }
  return out;
}
