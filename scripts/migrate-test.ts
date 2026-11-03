import 'dotenv/config';
import { spawnSync } from 'node:child_process';
const url = process.env.TEST_DATABASE_URL;
let valid = false;
try {
  valid = Boolean(url && new URL(url).pathname.endsWith('_test'));
} catch {
  /* Do not print malformed connection strings. */
}
if (!valid) {
  console.error(
    'TEST_DATABASE_URL must name a dedicated disposable database ending in _test.',
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', 'scripts/apply-migrations.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url! },
  },
);
if (result.error) console.error('Unable to start test migration runner.');
process.exit(result.status ?? 1);
