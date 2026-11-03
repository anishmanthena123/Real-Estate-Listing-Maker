import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db';
import { AppError } from './errors';
import { getEnv } from './env';
import { credentialsSchema, parse } from './validation';
const scrypt = promisify(scryptCallback);
export const COOKIE = 'listly_session';
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const cutoff = new Date(Date.now() - windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN NOW() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  if (rows[0].count > limit)
    throw new AppError(429, 'Too many requests. Please try again later.');
}
export async function authenticate(input: unknown, register: boolean) {
  const { email, password } = parse(credentialsSchema, input);
  await rateLimit(`auth:${digest(email)}`, 15, 15 * 60_000);
  // scrypt is performed for both unknown and existing users to reduce timing differences.
  const user = await db.user.findUnique({ where: { email } });
  if (register) {
    const passwordHash = await hashPassword(password);
    if (user)
      throw new AppError(
        400,
        'Unable to create account with these credentials.',
      );
    try {
      const created = await db.user.create({ data: { email, passwordHash } });
      return createSession(created.id);
    } catch (e) {
      if (typeof e === 'object' && e && 'code' in e && e.code === 'P2002')
        throw new AppError(
          400,
          'Unable to create account with these credentials.',
        );
      throw e;
    }
  }
  const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
  const matches = await verifyPassword(password, user?.passwordHash ?? dummy);
  if (!user || !matches) throw new AppError(401, 'Invalid email or password.');
  return createSession(user.id);
}
async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  await db.session.create({
    data: {
      id: digest(token),
      userId,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return token;
}
export function cookieValue(request: Request) {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
}
export async function currentUser(request: Request) {
  const token = cookieValue(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new AppError(401, 'Please sign in.');
  const session = await db.session.findUnique({
    where: { id: digest(token) },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!session || session.expiresAt <= new Date())
    throw new AppError(401, 'Please sign in.');
  return session.user;
}
export function checkOrigin(request: Request) {
  if (request.headers.get('origin') !== getEnv().APP_ORIGIN)
    throw new AppError(403, 'Request origin is not allowed.');
  const site = request.headers.get('sec-fetch-site');
  if (site && !['same-origin', 'none'].includes(site))
    throw new AppError(403, 'Cross-site request rejected.');
}
export function sessionCookie(token: string, clear = false) {
  const secure = getEnv().APP_ORIGIN.startsWith('https://');
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear ? 0 : 604800}${secure ? '; Secure' : ''}`;
}
