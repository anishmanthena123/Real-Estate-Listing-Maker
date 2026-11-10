import { z } from 'zod';
import {
  getLookupProvider,
  parseLookupAddress,
} from '@/server/lookup/provider';
import { parse } from '@/server/validation';
import {
  authenticate,
  checkOrigin,
  cookieValue,
  currentUser,
  digest,
  rateLimit,
  sessionCookie,
} from '@/server/auth';
import { db } from '@/server/db';
import { getEnv } from '@/server/env';
import { AppError } from '@/server/errors';
import { boundedBody, failure, json, readJson } from '@/server/http';
import { properties } from '@/server/service';
export const runtime = 'nodejs';
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const [root, id, action, resourceId] = path;
    const method = request.method;
    if (method !== 'GET') checkOrigin(request);
    if (
      root === 'auth' &&
      path.length === 2 &&
      ['login', 'register'].includes(id) &&
      method === 'POST'
    ) {
      await rateLimit('auth:global', 120, 60000);
      const token = await authenticate(
        await readJson(request),
        id === 'register',
      );
      const previous = cookieValue(request);
      if (previous)
        await db.session.deleteMany({ where: { id: digest(previous) } });
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) });
    }
    const user = await currentUser(request);
    if (
      root === 'auth' &&
      id === 'logout' &&
      path.length === 2 &&
      method === 'POST'
    ) {
      const token = cookieValue(request);
      if (token) await db.session.deleteMany({ where: { id: digest(token) } });
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', true) });
    }
    if (root === 'property-lookup' && path.length === 1 && method === 'POST') {
      const { address } = parse(
        z.object({ address: z.string().trim().min(5).max(300) }),
        await readJson(request),
      );
      parseLookupAddress(address);
      await rateLimit(`lookup:${user.id}`, 20, 3600000);
      return json(await getLookupProvider().lookup(address));
    }
    if (path.length === 1 && root === 'me' && method === 'GET')
      return json({ user, mockAI: getEnv().MOCK_AI === 'true' });
    if (path.length === 1 && root === 'dashboard' && method === 'GET')
      return json(await properties.dashboard(user.id));
    if (root !== 'properties' || path.length > 4)
      throw new AppError(404, 'Route not found.');
    if (path.length === 1) {
      if (method === 'GET') return json(await properties.list(user.id));
      if (method === 'POST')
        return json(
          await properties.create(user.id, await readJson(request)),
          201,
        );
    }
    if (path.length === 2) {
      if (method === 'GET') return json(await properties.get(user.id, id));
      if (method === 'PATCH')
        return json(
          await properties.update(user.id, id, await readJson(request)),
        );
      if (method === 'DELETE') {
        await properties.remove(user.id, id);
        return json({ ok: true });
      }
    }
    if (action === 'photos') {
      if (path.length === 3 && method === 'POST') {
        // Authenticate and authorize before reading potentially expensive upload data.
        await properties.get(user.id, id);
        await rateLimit(`upload:${user.id}`, 60, 3600000);
        if (
          !request.headers
            .get('content-type')
            ?.startsWith('multipart/form-data;')
        )
          throw new AppError(415, 'Expected a multipart photo upload.');
        const bytes = await boundedBody(request, 9 * 1024 * 1024);
        let form: FormData;
        try {
          form = await new Response(bytes as BodyInit, {
            headers: { 'Content-Type': request.headers.get('content-type')! },
          }).formData();
        } catch {
          throw new AppError(400, 'Malformed photo upload.');
        }
        const file = form.get('photo');
        if (!(file instanceof File))
          throw new AppError(400, 'A photo file is required.');
        return json(await properties.upload(user.id, id, file), 201);
      }
      if (path.length === 4 && method === 'DELETE') {
        await properties.removePhoto(user.id, id, resourceId);
        return json({ ok: true });
      }
    }
    if (action === 'analyze' && path.length === 4 && method === 'POST')
      return json(await properties.analyze(user.id, id, resourceId));
    if (action === 'features' && path.length === 4 && method === 'PATCH')
      return json(
        await properties.reviewFeature(
          user.id,
          id,
          resourceId,
          await readJson(request),
        ),
      );
    if (action === 'generations') {
      if (path.length === 3 && method === 'POST')
        return json(
          await properties.generate(user.id, id, await readJson(request)),
          201,
        );
      if (path.length === 4 && method === 'PATCH')
        return json(
          await properties.saveGeneration(
            user.id,
            id,
            resourceId,
            await readJson(request),
          ),
        );
    }
    if (action === 'feedback' && path.length === 4 && method === 'POST')
      return json(
        await properties.feedback(
          user.id,
          id,
          resourceId,
          await readJson(request),
        ),
        201,
      );
    throw new AppError(404, 'Route not found.');
  } catch (error) {
    return failure(error);
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
