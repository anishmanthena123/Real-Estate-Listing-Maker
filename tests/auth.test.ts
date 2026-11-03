import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  checkOrigin,
  sessionCookie,
  digest,
  cookieValue,
} from '../src/server/auth';
afterEach(() => vi.unstubAllEnvs());
describe('authentication primitives and CSRF', () => {
  it('salts password hashes and verifies the password', async () => {
    const a = await hashPassword('a-long-test-password');
    const b = await hashPassword('a-long-test-password');
    expect(a).not.toBe(b);
    expect(a).not.toContain('a-long-test-password');
    expect(await verifyPassword('a-long-test-password', a)).toBe(true);
    expect(await verifyPassword('wrong', a)).toBe(false);
  });
  it('stores only a deterministic token digest', () => {
    expect(digest('token')).toHaveLength(64);
    expect(digest('token')).not.toBe('token');
  });
  it('uses HttpOnly and SameSite session cookies', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
    vi.stubEnv('APP_ORIGIN', 'https://listly.example');
    expect(sessionCookie('test')).toContain('HttpOnly; SameSite=Lax');
    expect(sessionCookie('test')).toContain('Secure');
  });
  it('clears the cookie on logout', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    expect(sessionCookie('', true)).toContain('Max-Age=0');
  });
  it.each([null, 'https://evil.example'])(
    'rejects missing or hostile origins: %s',
    (origin) => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
      vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
      expect(() =>
        checkOrigin(
          new Request('http://localhost:3000', {
            headers: origin ? { Origin: origin } : {},
          }),
        ),
      ).toThrow('origin');
    },
  );
  it('rejects a cross-site fetch even with a matching origin', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    expect(() =>
      checkOrigin(
        new Request('http://localhost:3000', {
          headers: {
            Origin: 'http://localhost:3000',
            'Sec-Fetch-Site': 'cross-site',
          },
        }),
      ),
    ).toThrow('Cross-site');
  });
  it('allows a matching same-origin request', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    expect(() =>
      checkOrigin(
        new Request('http://localhost:3000', {
          headers: {
            Origin: 'http://localhost:3000',
            'Sec-Fetch-Site': 'same-origin',
          },
        }),
      ),
    ).not.toThrow();
  });
  it('extracts only the named session cookie', () => {
    expect(
      cookieValue(
        new Request('http://localhost', {
          headers: { Cookie: 'other=x; listly_session=abc; test=y' },
        }),
      ),
    ).toBe('abc');
  });
});
