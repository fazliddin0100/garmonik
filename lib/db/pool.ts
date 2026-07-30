import pg from 'pg';
import { getSslConfigForDatabaseUrl } from './connection';
import { getDatabaseUrl } from './env';

const globalForPg = globalThis as unknown as { pgPool?: pg.Pool };

export function getPool(): pg.Pool {
  if (!globalForPg.pgPool) {
    const connectionString = getDatabaseUrl();
    globalForPg.pgPool = new pg.Pool({
      connectionString,
      ssl: getSslConfigForDatabaseUrl(connectionString),
      max: 10,
    });
  }
  return globalForPg.pgPool;
}

export async function closePool(): Promise<void> {
  if (globalForPg.pgPool) {
    await globalForPg.pgPool.end();
    globalForPg.pgPool = undefined;
  }
}
