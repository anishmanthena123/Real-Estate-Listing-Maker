/** Hosting configuration is validated before migrations or the HTTP listener. */
export function productionConfig(
  env: Record<string, string | undefined>,
): NodeJS.ProcessEnv {
  let origin: URL;
  try {
    origin = new URL(env.APP_ORIGIN || env.RENDER_EXTERNAL_URL || '');
  } catch {
    throw new Error(
      'Set APP_ORIGIN to your HTTPS website URL, or use Render automatic URL configuration.',
    );
  }
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new Error(
      'Production origin must be an HTTPS origin without credentials, path, query, or fragment.',
    );
  }
  if (!env.DATABASE_URL?.startsWith('postgresql://'))
    throw new Error('A PostgreSQL DATABASE_URL is required.');
  const mock = env.MOCK_AI ?? 'false';
  if (!['true', 'false'].includes(mock))
    throw new Error('MOCK_AI must be true or false.');
  if (mock === 'false' && !env.AI_API_KEY?.trim())
    throw new Error(
      'Set AI_API_KEY securely in your hosting environment before enabling live AI.',
    );
  const port = env.PORT ?? '10000';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error('PORT must be between 1 and 65535.');
  let base: URL;
  try {
    base = new URL(env.AI_BASE_URL || 'https://api.openai.com/v1');
  } catch {
    throw new Error('AI_BASE_URL must be a valid HTTPS endpoint.');
  }
  if (base.protocol !== 'https:' || base.username || base.password)
    throw new Error('AI_BASE_URL must use HTTPS without embedded credentials.');
  return {
    ...env,
    NODE_ENV: 'production',
    APP_ORIGIN: origin.origin,
    MOCK_AI: mock,
    PORT: port,
    ALLOW_LOCAL_HTTP: 'false',
    STORAGE_DIR: env.STORAGE_DIR || '.data/photos',
  };
}
