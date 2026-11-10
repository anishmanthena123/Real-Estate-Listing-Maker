import { AppError } from './errors';
export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(
    JSON.stringify(data, (key, value) =>
      ['storageKey', 'passwordHash', 'userId'].includes(key)
        ? undefined
        : value,
    ),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...headers,
      },
    },
  );
}
export function failure(error: unknown) {
  if (error instanceof AppError)
    return json(
      { error: error.message },
      error.status,
      error.status === 429 ? { 'Retry-After': '60' } : {},
    );
  const requestId = crypto.randomUUID();
  // Never log raw request bodies, provider responses, credentials or database connection strings.
  console.error(
    `Request ${requestId} failed`,
    error instanceof Error ? error.name : 'UnknownError',
  );
  return json(
    { error: 'An unexpected server error occurred. Please retry.', requestId },
    500,
  );
}
export async function boundedBody(
  request: Pick<Request, 'headers' | 'body'>,
  max: number,
): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length') ?? 0) > max)
    throw new AppError(413, 'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'Request body is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new AppError(413, 'Request is too large.');
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer;
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new AppError(415, 'Expected application/json.');
  const body = await boundedBody(request, 32 * 1024);
  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new AppError(400, 'Invalid JSON body.');
  }
}
