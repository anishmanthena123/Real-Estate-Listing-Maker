import { randomBytes, randomUUID } from 'node:crypto';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import sharp from 'sharp';
import { db } from '../src/server/db';
import { PropertyService } from '../src/server/service';
import { MockAIProvider } from '../src/server/ai/provider';
import type { AIProvider } from '../src/server/ai/provider';
import type { PhotoStorage } from '../src/server/storage';
import { digest, currentUser, authenticate } from '../src/server/auth';
import { GET, POST, PATCH, DELETE } from '../src/app/api/[...path]/route';
import { GET as getPhoto } from '../src/app/api/photos/[id]/route';
import { input, options } from './fixtures';
const userIds: string[] = [];
let a: string;
let b: string;
let propertyId: string;
let photoId: string;
let token: string;
const imageStore = new Map<string, Buffer>();
const storage: PhotoStorage = {
  async put(data) {
    const key = `${randomUUID()}.jpg`;
    imageStore.set(key, data);
    return key;
  },
  async read(key) {
    const image = imageStore.get(key);
    if (!image) throw new Error('missing');
    return image;
  },
  async remove(key) {
    imageStore.delete(key);
  },
};
let provider: AIProvider;
let service: PropertyService;
async function image() {
  const bytes = await sharp({
    create: { width: 3, height: 3, channels: 3, background: '#fff' },
  })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(bytes)], 'property.jpg', {
    type: 'image/jpeg',
  });
}
function request(
  path: string,
  method = 'GET',
  body?: unknown,
  session = token,
  origin = 'http://localhost:3000',
) {
  return new Request(`http://localhost:3000/api/${path}`, {
    method,
    headers: {
      Cookie: `listly_session=${session}`,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function route(
  path: string,
  method = 'GET',
  body?: unknown,
  session = token,
  origin?: string,
) {
  const handlers: Record<string, typeof GET> = { GET, POST, PATCH, DELETE };
  return handlers[method](request(path, method, body, session, origin), {
    params: Promise.resolve({ path: path.split('/') }),
  });
}
beforeAll(async () => {
  if (
    !process.env.TEST_DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test') ||
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL
  )
    throw new Error(
      'Set TEST_DATABASE_URL to a dedicated database ending in _test.',
    );
  process.env.APP_ORIGIN = 'http://localhost:3000';
  process.env.MOCK_AI = 'true';
  await db.$connect();
});
beforeEach(async () => {
  a = (
    await db.user.create({
      data: {
        email: `${randomUUID()}@integration.test`,
        passwordHash: 'not-used-for-login',
      },
    })
  ).id;
  b = (
    await db.user.create({
      data: {
        email: `${randomUUID()}@integration.test`,
        passwordHash: 'not-used-for-login',
      },
    })
  ).id;
  userIds.push(a, b);
  provider = new MockAIProvider();
  service = new PropertyService(
    db,
    () => provider,
    () => storage,
  );
  propertyId = (await service.create(b, input)).id;
  photoId = (await service.upload(b, propertyId, await image())).id;
  token = randomBytes(32).toString('hex');
  await db.session.create({
    data: {
      id: digest(token),
      userId: a,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.rateLimit.deleteMany({
    where: {
      OR: userIds.flatMap((id) => [
        { key: `generate:${id}` },
        { key: `analyze:${id}` },
        { key: `upload:${id}` },
      ]),
    },
  });
  await db.$disconnect();
});
describe('ownership enforced at the service boundary', () => {
  it('A cannot view B property', async () => {
    await expect(service.get(a, propertyId)).rejects.toMatchObject({
      status: 404,
    });
  });
  it('A cannot edit B property', async () => {
    await expect(
      service.update(a, propertyId, { ...input, price: 1 }),
    ).rejects.toMatchObject({ status: 404 });
    expect((await service.get(b, propertyId)).price.toString()).toBe('450000');
  });
  it('A cannot delete B property', async () => {
    await expect(service.remove(a, propertyId)).rejects.toMatchObject({
      status: 404,
    });
    expect(await service.get(b, propertyId)).toBeTruthy();
  });
  it('A cannot generate for B property and provider is never called', async () => {
    const spy = vi.spyOn(provider, 'generate');
    await expect(
      service.generate(a, propertyId, options),
    ).rejects.toMatchObject({ status: 404 });
    expect(spy).not.toHaveBeenCalled();
  });
  it('A cannot read B photo', async () => {
    await expect(service.photo(a, photoId)).rejects.toMatchObject({
      status: 404,
    });
  });
  it('A cannot upload to B property', async () => {
    await expect(
      service.upload(a, propertyId, await image()),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('A cannot analyze B photo', async () => {
    await expect(service.analyze(a, propertyId, photoId)).rejects.toMatchObject(
      { status: 404 },
    );
  });
  it('A cannot delete B photo', async () => {
    await expect(
      service.removePhoto(a, propertyId, photoId),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('A cannot verify B feature', async () => {
    await service.analyze(b, propertyId, photoId);
    const feature = (await service.get(b, propertyId)).features[0];
    await expect(
      service.reviewFeature(a, propertyId, feature.id, { status: 'VERIFIED' }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('A cannot edit or review B generation', async () => {
    const gen = await service.generate(b, propertyId, options);
    await expect(
      service.saveGeneration(a, propertyId, gen.id, {
        text: '3 bedrooms.',
        status: 'READY',
        acknowledgeReview: true,
        revision: 1,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('A cannot submit feedback for B generation', async () => {
    const gen = await service.generate(b, propertyId, options);
    await expect(
      service.feedback(a, propertyId, gen.id, { rating: 1 }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('lists and dashboard counts contain only the owner data', async () => {
    expect(await service.list(a)).toEqual([]);
    expect((await service.dashboard(a)).properties).toBe(0);
    expect((await service.dashboard(b)).properties).toBe(1);
  });
  it('ignores a forged userId on create and update', async () => {
    const own = await service.create(a, { ...input, userId: b });
    expect(own.userId).toBe(a);
    await service.update(a, own.id, { ...input, userId: b });
    expect((await service.get(a, own.id)).userId).toBe(a);
  });
  it('fails malformed property IDs safely', async () => {
    await expect(service.get(a, 'not-an-id')).rejects.toMatchObject({
      status: 400,
    });
  });
});
describe('verification and generation invariants with real PostgreSQL', () => {
  it('every photo detection begins PENDING', async () => {
    await service.analyze(b, propertyId, photoId);
    const features = (await service.get(b, propertyId)).features;
    expect(features.length).toBe(2);
    expect(features.every((f) => f.status === 'PENDING')).toBe(true);
  });
  it('CRITICAL: no pending or rejected detection reaches the provider, verified features do', async () => {
    await service.analyze(b, propertyId, photoId);
    const [island, windows] = (await service.get(b, propertyId)).features;
    await service.reviewFeature(b, propertyId, windows.id, {
      status: 'REJECTED',
    });
    const spy = vi.spyOn(provider, 'generate');
    await service.generate(b, propertyId, options);
    expect(spy.mock.calls[0][0].verifiedFeatures).toEqual([]);
    expect(JSON.stringify(spy.mock.calls[0][0])).not.toContain(
      'kitchen island',
    );
    expect(JSON.stringify(spy.mock.calls[0][0])).not.toContain('large windows');
    expect(spy.mock.calls[0][0].property.address).toBe(input.address);
    await service.reviewFeature(b, propertyId, island.id, {
      status: 'VERIFIED',
    });
    await service.generate(b, propertyId, options);
    expect(spy.mock.calls[1][0].verifiedFeatures).toEqual([island.label]);
    expect(JSON.stringify(spy.mock.calls[1][0])).not.toContain(input.notes);
  });
  it('rejects repeated photo analysis without resetting decisions', async () => {
    await service.analyze(b, propertyId, photoId);
    const f = (await service.get(b, propertyId)).features[0];
    await service.reviewFeature(b, propertyId, f.id, { status: 'VERIFIED' });
    await expect(service.analyze(b, propertyId, photoId)).rejects.toMatchObject(
      { status: 409 },
    );
    expect(
      (await service.get(b, propertyId)).features.find(
        (feature) => feature.id === f.id,
      )?.status,
    ).toBe('VERIFIED');
  });
  it('persists history, provider metadata, evidence snapshot and claims', async () => {
    const gen = await service.generate(b, propertyId, options);
    expect(gen.status).toBe('NEEDS_REVIEW');
    expect(gen.claims.length).toBeGreaterThan(0);
    expect(gen.provider).toBe('mock');
    expect(gen.contextSnapshot).toMatchObject({ verifiedFeatures: [] });
    expect((await service.get(b, propertyId)).generations[0].id).toBe(gen.id);
  });
  it('does not save failed generations', async () => {
    vi.spyOn(provider, 'generate').mockRejectedValue(
      new Error('provider failed'),
    );
    await expect(service.generate(b, propertyId, options)).rejects.toThrow();
    expect((await service.get(b, propertyId)).generations).toHaveLength(0);
  });
  it('rejects a generation whose evidence changed during provider execution', async () => {
    vi.spyOn(provider, 'generate').mockImplementation(async () => {
      await service.update(b, propertyId, { ...input, bedrooms: 4 });
      return '3 bedrooms.';
    });
    await expect(
      service.generate(b, propertyId, options),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('requires explicit human acknowledgement for READY', async () => {
    const gen = await service.generate(b, propertyId, options);
    await expect(
      service.saveGeneration(b, propertyId, gen.id, {
        text: gen.text,
        status: 'READY',
        revision: 1,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('blocks unsupported claims even if a browser requests READY', async () => {
    const gen = await service.generate(b, propertyId, options);
    await expect(
      service.saveGeneration(b, propertyId, gen.id, {
        text: 'Features pool.',
        status: 'READY',
        acknowledgeReview: true,
        revision: 1,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('allows a fully supported, explicitly reviewed draft to become READY', async () => {
    const gen = await service.generate(b, propertyId, options);
    const saved = await service.saveGeneration(b, propertyId, gen.id, {
      text: gen.text,
      status: 'READY',
      acknowledgeReview: true,
      revision: 1,
    });
    expect(saved.status).toBe('READY');
    expect(saved.reviewedAt).toBeInstanceOf(Date);
  });
  it('edits rerun claim validation and preserve original text', async () => {
    const gen = await service.generate(b, propertyId, options);
    const edited = await service.saveGeneration(b, propertyId, gen.id, {
      text: 'Safe neighborhood.',
      status: 'NEEDS_REVIEW',
      revision: 1,
    });
    expect(edited.claims[0].status).toBe('POTENTIALLY_MISLEADING');
    expect(edited.originalText).toBe(gen.text);
    expect(edited.revision).toBe(2);
  });
  it('detects concurrent editor revisions', async () => {
    const gen = await service.generate(b, propertyId, options);
    const update = { text: gen.text, status: 'DRAFT', revision: 1 };
    await service.saveGeneration(b, propertyId, gen.id, update);
    await expect(
      service.saveGeneration(b, propertyId, gen.id, update),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('property edits invalidate ready content', async () => {
    const gen = await service.generate(b, propertyId, options);
    await service.saveGeneration(b, propertyId, gen.id, {
      text: gen.text,
      status: 'READY',
      acknowledgeReview: true,
      revision: 1,
    });
    await service.update(b, propertyId, { ...input, price: 500000 });
    expect((await service.get(b, propertyId)).generations[0].status).toBe(
      'NEEDS_REVIEW',
    );
  });
  it('rejecting previously verified evidence invalidates content and flags its claim on save', async () => {
    await service.analyze(b, propertyId, photoId);
    const feature = (await service.get(b, propertyId)).features[0];
    await service.reviewFeature(b, propertyId, feature.id, {
      status: 'VERIFIED',
    });
    const gen = await service.generate(b, propertyId, options);
    await service.reviewFeature(b, propertyId, feature.id, {
      status: 'REJECTED',
    });
    const saved = await service.saveGeneration(b, propertyId, gen.id, {
      text: gen.text,
      status: 'NEEDS_REVIEW',
      revision: 1,
    });
    expect(
      saved.claims.some(
        (c) => c.text.includes(feature.label) && c.status === 'UNVERIFIED',
      ),
    ).toBe(true);
  });
  it('stores feedback against the generation revision', async () => {
    const gen = await service.generate(b, propertyId, options);
    const feedback = await service.feedback(b, propertyId, gen.id, {
      rating: -1,
      comment: 'Needs a better opening',
    });
    expect(feedback.generationRevision).toBe(1);
    expect(feedback.comment).toBe('Needs a better opening');
  });
  it('database constraints reject negative property values outside the API', async () => {
    await expect(
      db.property.update({ where: { id: propertyId }, data: { price: -1 } }),
    ).rejects.toThrow();
  });
  it('deleting a property cascades its history and removes private storage objects', async () => {
    const photo = await db.propertyPhoto.findUniqueOrThrow({
      where: { id: photoId },
    });
    await service.generate(b, propertyId, options);
    await service.remove(b, propertyId);
    expect(await db.generation.count({ where: { propertyId } })).toBe(0);
    expect(imageStore.has(photo.storageKey)).toBe(false);
  });
  it('does not persist photo metadata when storage upload fails', async () => {
    const brokenStorage: PhotoStorage = {
      ...storage,
      async put() {
        throw new Error('storage offline');
      },
    };
    const broken = new PropertyService(
      db,
      () => provider,
      () => brokenStorage,
    );
    await expect(broken.upload(b, propertyId, await image())).rejects.toThrow(
      'storage offline',
    );
    expect((await service.get(b, propertyId)).photos).toHaveLength(1);
  });
});
describe('HTTP boundary and sessions', () => {
  it.each(['GET', 'PATCH', 'DELETE'])(
    'rejects cross-user %s over HTTP',
    async (method) => {
      const response = await route(
        `properties/${propertyId}`,
        method,
        method === 'PATCH' ? { ...input, userId: b } : undefined,
      );
      expect(response.status).toBe(404);
    },
  );
  it('rejects cross-user generation over HTTP even with forged identity', async () => {
    expect(
      (
        await route(`properties/${propertyId}/generations`, 'POST', {
          ...options,
          userId: b,
        })
      ).status,
    ).toBe(404);
  });
  it('rejects unauthorized photo access over HTTP', async () => {
    const response = await getPhoto(request(`photos/${photoId}`), {
      params: Promise.resolve({ id: photoId }),
    });
    expect(response.status).toBe(404);
  });
  it('never returns server environment secrets from account or property endpoints', async () => {
    const before = process.env.AI_API_KEY;
    process.env.AI_API_KEY = 'secret-never-in-client';
    try {
      const own = await service.create(a, input);
      for (const path of ['me', `properties/${own.id}`]) {
        const text = await (await route(path)).text();
        expect(text).not.toContain('secret-never-in-client');
        expect(text).not.toContain('DATABASE_URL');
        expect(text).not.toContain('passwordHash');
        expect(text).not.toContain('storageKey');
      }
    } finally {
      if (before === undefined) delete process.env.AI_API_KEY;
      else process.env.AI_API_KEY = before;
    }
  });
  it('rejects unauthenticated and expired sessions', async () => {
    expect(
      (await route('properties', 'GET', undefined, 'forged-token')).status,
    ).toBe(401);
    await db.session.update({
      where: { id: digest(token) },
      data: { expiresAt: new Date(0) },
    });
    await expect(currentUser(request('me'))).rejects.toMatchObject({
      status: 401,
    });
  });
  it('rejects CSRF requests', async () => {
    expect(
      (await route('properties', 'POST', input, token, 'https://evil.example'))
        .status,
    ).toBe(403);
  });
  it('returns 400 for malformed IDs without database error details', async () => {
    const response = await route('properties/not-an-id');
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('Prisma');
  });
  it('returns a controlled validation error for missing fields', async () => {
    expect((await route('properties', 'POST', { address: '' })).status).toBe(
      400,
    );
  });
  it('ignores a forged browser userId during actual HTTP creation', async () => {
    const response = await route('properties', 'POST', { ...input, userId: b });
    expect(response.status).toBe(201);
    const saved = await response.json();
    expect(
      (await db.property.findUniqueOrThrow({ where: { id: saved.id } })).userId,
    ).toBe(a);
  });
  it('logout revokes the server-side session and clears the cookie', async () => {
    const response = await route('auth/logout', 'POST');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect((await route('me')).status).toBe(401);
  });
  it('registers and authenticates a real account without storing plaintext passwords', async () => {
    const email = `${randomUUID()}@integration.test`;
    const password = 'correct-long-test-password';
    const createdToken = await authenticate({ email, password }, true);
    const user = await currentUser(
      request('me', 'GET', undefined, createdToken),
    );
    userIds.push(user.id);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .passwordHash,
    ).not.toContain(password);
    const login = await authenticate({ email, password }, false);
    expect(login).not.toBe(createdToken);
    await expect(
      authenticate({ email, password: 'wrong-long-password' }, false),
    ).rejects.toMatchObject({ status: 401 });
  });
});
