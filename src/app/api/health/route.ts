import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { db } from '@/server/db';
import { getEnv } from '@/server/env';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const env = getEnv();
    if (env.MOCK_AI === 'false' && !env.AI_API_KEY?.trim())
      throw new Error('Missing AI configuration');
    await db.$queryRaw`SELECT 1`;
    await access(env.STORAGE_DIR, constants.W_OK);
    return Response.json(
      { status: 'ok' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
