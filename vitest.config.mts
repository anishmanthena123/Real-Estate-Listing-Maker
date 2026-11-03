import 'dotenv/config';
if (process.env.TEST_DATABASE_URL)
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      'server-only': new URL('./tests/server-only-stub.ts', import.meta.url)
        .pathname,
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
