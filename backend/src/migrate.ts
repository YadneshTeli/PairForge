import path from 'path';
import migrate from 'node-pg-migrate';
import { config } from './config';

export async function runMigrations(databaseUrl = config.databaseUrl): Promise<void> {
  await migrate({
    databaseUrl,
    dir: path.resolve(process.cwd(), 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: () => undefined,
    checkOrder: true,
  });
}
