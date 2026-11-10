import 'server-only';
import { z } from 'zod';
const schema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://'),
  APP_ORIGIN: z.url().transform((v) => new URL(v).origin),
  MOCK_AI: z.enum(['true', 'false']).default('true'),
  AI_BASE_URL: z.url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_API_KEY: z.string().optional(),
  PROPERTY_LOOKUP_PROVIDER: z.enum(['disabled', 'attom']).default('disabled'),
  ATTOM_API_KEY: z.string().optional(),
  STORAGE_DIR: z.string().min(1).default('.data/photos'),
});
export function getEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      'Invalid server environment. Check DATABASE_URL and APP_ORIGIN against .env.example.',
    );
  if (
    process.env.NODE_ENV === 'production' &&
    !result.data.APP_ORIGIN.startsWith('https://') &&
    process.env.ALLOW_LOCAL_HTTP !== 'true'
  )
    throw new Error(
      'Production APP_ORIGIN must use HTTPS. ALLOW_LOCAL_HTTP=true is for local smoke tests only.',
    );
  return result.data;
}
