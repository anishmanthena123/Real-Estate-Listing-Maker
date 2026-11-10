import { spawn, spawnSync } from 'node:child_process';
import { mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { productionConfig } from './production-config';
async function start() {
  const env = productionConfig(process.env);
  await mkdir(env.STORAGE_DIR!, { recursive: true, mode: 0o700 });
  await access(env.STORAGE_DIR!, constants.W_OK);
  // Persistent-disk hosts may not support a separate pre-deploy command.
  // Run committed, checksummed migrations before accepting any HTTP requests.
  const migration = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/apply-migrations.ts'],
    { env, stdio: 'inherit' },
  );
  if (migration.error || migration.status !== 0)
    throw new Error(
      'Database migration failed; the application was not started.',
    );
  const child = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'start',
      '--hostname',
      '0.0.0.0',
      '--port',
      env.PORT!,
    ],
    { env, stdio: 'inherit' },
  );
  for (const signal of ['SIGTERM', 'SIGINT'] as const)
    process.on(signal, () => child.kill(signal));
  child.on('error', () => {
    console.error('Unable to start the application process.');
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
}
start().catch((error) => {
  // Only our fixed validation messages are surfaced; filesystem/driver errors can contain private paths.
  console.error(
    'Production startup failed. Check HTTPS origin, AI key, database, and writable persistent storage.',
  );
  if (
    error instanceof Error &&
    [
      'Set ',
      'Production origin',
      'A PostgreSQL',
      'MOCK_AI',
      'PORT ',
      'AI_BASE_URL',
      'PROPERTY_LOOKUP_PROVIDER',
      'Database migration',
    ].some((prefix) => error.message.startsWith(prefix))
  )
    console.error(error.message);
  process.exitCode = 1;
});
