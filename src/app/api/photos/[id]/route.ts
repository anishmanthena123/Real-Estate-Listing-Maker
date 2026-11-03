import { currentUser } from '@/server/auth';
import { failure } from '@/server/http';
import { properties } from '@/server/service';
export const runtime = 'nodejs';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser(request);
    const { photo, data } = await properties.photo(
      user.id,
      (await context.params).id,
    );
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': photo.mimeType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline; filename="property-photo.jpg"',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
