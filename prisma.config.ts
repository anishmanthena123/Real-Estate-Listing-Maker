import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
// Runtime uses the stable JS driver adapter. The optional JS migration engine is
// useful in restricted development environments; production uses classic Migrate.
const base = {
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
};
export default process.env.PRISMA_JS_MIGRATIONS === 'true'
  ? defineConfig({
      ...base,
      experimental: { adapter: true },
      engine: 'js',
      adapter: async () =>
        new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    })
  : defineConfig(base);
