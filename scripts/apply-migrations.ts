/** Portable SQL-only fallback when native Prisma Migrate is unavailable.
 * Uses Prisma's migration ledger, checks committed checksums, and applies each
 * migration atomically under a PostgreSQL advisory lock. No resets or seed data.
 */
import 'dotenv/config';
import { Client } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(174362901)');
    await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL,
      finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL,
      logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )`);
    const root = resolve('prisma/migrations');
    const entries = (await readdir(root, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    for (const name of entries) {
      const sql = await readFile(resolve(root, name, 'migration.sql'), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = await client.query<{
        checksum: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
      }>(
        'SELECT checksum, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = $1 AND rolled_back_at IS NULL',
        [name],
      );
      if (previous.rows.length) {
        if (
          previous.rows.length !== 1 ||
          previous.rows[0].checksum !== checksum ||
          !previous.rows[0].finished_at
        )
          throw new Error(
            `Migration history requires operator review: ${name}`,
          );
        console.log(`Already applied: ${name}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count) VALUES ($1, $2, $3, now(), 1)',
          [randomUUID(), checksum, name],
        );
        await client.query('COMMIT');
        console.log(`Applied: ${name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(174362901)');
    await client.end();
  }
}
main().catch(() => {
  console.error(
    'Migration failed. Check database connectivity, SQL, and migration history. No credentials are logged.',
  );
  process.exitCode = 1;
});
