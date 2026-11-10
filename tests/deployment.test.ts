import { afterEach, describe, expect, it, vi } from 'vitest';
import { productionConfig } from '../scripts/production-config';
import { GET } from '../src/app/api/health/route';
const mocks = vi.hoisted(() => ({ query: vi.fn(), access: vi.fn() }));
vi.mock('../src/server/db', () => ({ db: { $queryRaw: mocks.query } }));
vi.mock('node:fs/promises', () => ({ access: mocks.access }));
const base = {
  DATABASE_URL: 'postgresql://localhost/listly',
  RENDER_EXTERNAL_URL: 'https://listly-test.onrender.com',
  AI_API_KEY: 'test-only',
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe('production hosting configuration', () => {
  it('uses the assigned Render URL for same-origin cookies and CSRF', () => {
    expect(productionConfig(base)).toMatchObject({
      APP_ORIGIN: base.RENDER_EXTERNAL_URL,
      MOCK_AI: 'false',
      NODE_ENV: 'production',
      ALLOW_LOCAL_HTTP: 'false',
    });
  });
  it('prefers an explicitly configured custom domain', () => {
    expect(
      productionConfig({ ...base, APP_ORIGIN: 'https://listly.example' })
        .APP_ORIGIN,
    ).toBe('https://listly.example');
  });
  it('refuses to launch live AI without a key', () => {
    expect(() => productionConfig({ ...base, AI_API_KEY: '' })).toThrow(
      'Set AI_API_KEY',
    );
  });
  it('allows explicit mock mode for a deployment smoke test', () => {
    expect(
      productionConfig({ ...base, MOCK_AI: 'true', AI_API_KEY: '' }).MOCK_AI,
    ).toBe('true');
  });
  it.each([
    'http://example.com',
    'https://example.com/path',
    'https://user:password@example.com',
    'https://example.com?token=test',
  ])('rejects unsafe origins: %s', (APP_ORIGIN) => {
    expect(() => productionConfig({ ...base, APP_ORIGIN })).toThrow(
      'HTTPS origin',
    );
  });
  it('rejects missing origin configuration', () => {
    expect(() =>
      productionConfig({ ...base, RENDER_EXTERNAL_URL: '' }),
    ).toThrow('Set APP_ORIGIN');
  });
  it.each(['0', '70000', '-1', '3000junk'])(
    'rejects invalid listener port %s',
    (PORT) => {
      expect(() => productionConfig({ ...base, PORT })).toThrow('PORT');
    },
  );
  it('keeps the host-assigned port', () => {
    expect(productionConfig({ ...base, PORT: '12345' }).PORT).toBe('12345');
  });
  it('does not leak malformed origin secrets in validation errors', () => {
    expect(() =>
      productionConfig({ ...base, APP_ORIGIN: 'secret-invalid-input' }),
    ).not.toThrow('secret-invalid-input');
  });
});
describe('public readiness response', () => {
  function env() {
    vi.stubEnv('DATABASE_URL', base.DATABASE_URL);
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    vi.stubEnv('MOCK_AI', 'true');
    vi.stubEnv('STORAGE_DIR', '.data/photos');
  }
  it('checks database and writable storage without returning configuration', async () => {
    env();
    mocks.query.mockResolvedValue([{ '?column?': 1 }]);
    mocks.access.mockResolvedValue(undefined);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(mocks.query).toHaveBeenCalledOnce();
    expect(mocks.access).toHaveBeenCalledOnce();
  });
  it('reports database failure without exposing connection details', async () => {
    env();
    mocks.query.mockRejectedValue(new Error('private-database-password'));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private-database-password');
  });
  it('reports unavailable persistent storage', async () => {
    env();
    mocks.query.mockResolvedValue([]);
    mocks.access.mockRejectedValue(new Error('not writable'));
    expect((await GET()).status).toBe(503);
  });
  it('fails readiness for live AI without credentials', async () => {
    env();
    vi.stubEnv('MOCK_AI', 'false');
    vi.stubEnv('AI_API_KEY', '');
    expect((await GET()).status).toBe(503);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});

describe('lookup readiness', () => {
  it('does not report healthy when configured lookup lacks its credential', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    vi.stubEnv('MOCK_AI', 'true');
    vi.stubEnv('PROPERTY_LOOKUP_PROVIDER', 'attom');
    vi.stubEnv('ATTOM_API_KEY', '');
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
