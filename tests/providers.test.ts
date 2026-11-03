import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getProvider,
  MockAIProvider,
  OpenAIProvider,
} from '../src/server/ai/provider';
import { validateClaims } from '../src/server/ai/claims';
import { getEnv } from '../src/server/env';
import { context, options } from './fixtures';
const env = () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/listly');
  vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('providers and safe failure handling', () => {
  it('selects a working mock without an API key', async () => {
    env();
    vi.stubEnv('MOCK_AI', 'true');
    vi.stubEnv('AI_API_KEY', '');
    const p = getProvider();
    const text = await p.generate(context, options);
    expect(text).toContain('123 Oak Street');
    expect(text).toContain('kitchen island');
    expect(
      validateClaims(text, context).every((c) => c.status === 'SUPPORTED'),
    ).toBe(true);
  });
  it('rejects missing live API credentials with an actionable error', () => {
    env();
    vi.stubEnv('MOCK_AI', 'false');
    vi.stubEnv('AI_API_KEY', '');
    expect(() => getProvider()).toThrow('not configured');
  });
  it('rejects unencrypted provider endpoints', () => {
    env();
    vi.stubEnv('MOCK_AI', 'false');
    vi.stubEnv('AI_API_KEY', 'test');
    vi.stubEnv('AI_BASE_URL', 'http://example.com/v1');
    expect(() => getProvider()).toThrow('HTTPS');
  });
  it('supports all six content types without extra facts', async () => {
    const p = new MockAIProvider();
    for (const contentType of [
      'MLS',
      'LISTING',
      'INSTAGRAM',
      'FACEBOOK',
      'EMAIL',
      'BLURB',
    ] as const) {
      const text = await p.generate(context, { ...options, contentType });
      expect(
        validateClaims(text, context).every((c) => c.status === 'SUPPORTED'),
      ).toBe(true);
    }
  });
  it('mock length changes evidence volume', async () => {
    const p = new MockAIProvider();
    expect(
      (await p.generate(context, { ...options, length: 'Long' })).length,
    ).toBeGreaterThan(
      (await p.generate(context, { ...options, length: 'Short' })).length,
    );
  });
  it('handles a provider HTTP error without returning its secret response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('secret provider details', { status: 500 }),
        ),
    );
    await expect(
      new OpenAIProvider('model', 'https://example.com', 'secret-key').generate(
        context,
        options,
      ),
    ).rejects.toThrow('AI provider unavailable');
  });
  it('handles timeouts and transport errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network secret')),
    );
    await expect(
      new OpenAIProvider('model', 'https://example.com', 'test').generate(
        context,
        options,
      ),
    ).rejects.toThrow('AI provider unavailable');
  });
  it('rejects a malformed provider response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ choices: [] })),
    );
    await expect(
      new OpenAIProvider('model', 'https://example.com', 'test').generate(
        context,
        options,
      ),
    ).rejects.toThrow('invalid response');
  });
  it('rejects invalid photo analysis labels', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          choices: [
            { message: { content: '{"features":["safe neighborhood"]}' } },
          ],
        }),
      ),
    );
    await expect(
      new OpenAIProvider('model', 'https://example.com', 'test').analyze(
        Buffer.from('image'),
        'image/jpeg',
      ),
    ).rejects.toThrow('invalid suggestions');
  });
  it('sends the projected evidence and selected style to the compatible provider', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ choices: [{ message: { content: '3 bedrooms.' } }] }),
      );
    vi.stubGlobal('fetch', fetcher);
    await new OpenAIProvider(
      'model',
      'https://example.com/v1',
      'test',
    ).generate(context, { ...options, style: 'Luxury' });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(JSON.parse(body.messages[1].content)).toEqual({
      options: { ...options, style: 'Luxury' },
      evidence: context,
    });
    expect(fetcher.mock.calls[0][1].redirect).toBe('error');
  });
  it('validates server configuration without exposing values', () => {
    env();
    vi.stubEnv('DATABASE_URL', 'bad-secret-value');
    expect(() => getEnv()).toThrow('Invalid server environment');
    expect(() => getEnv()).not.toThrow('bad-secret-value');
  });
});
