import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { getEnv } from '../env';
import { AppError } from '../errors';
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export interface PhotoStorage {
  put(data: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
export class LocalPhotoStorage implements PhotoStorage {
  constructor(private root = resolve(getEnv().STORAGE_DIR)) {}
  private path(key: string) {
    if (!/^[a-f0-9-]{36}\.jpg$/.test(key))
      throw new AppError(400, 'Invalid storage key.');
    return join(this.root, key);
  }
  async put(data: Buffer) {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const key = `${randomUUID()}.jpg`;
    await writeFile(this.path(key), data, { flag: 'wx', mode: 0o600 });
    return key;
  }
  async read(key: string) {
    return readFile(this.path(key));
  }
  async remove(key: string) {
    try {
      await unlink(this.path(key));
    } catch (e) {
      if (!(e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT'))
        throw e;
    }
  }
}
export async function validatePhoto(file: File): Promise<Buffer> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new AppError(400, 'Upload JPEG, PNG, or WebP images.');
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES)
    throw new AppError(
      400,
      'Each photo must be nonempty and no larger than 8 MB.',
    );
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, {
      limitInputPixels: 40_000_000,
      animated: false,
    });
    const metadata = await image.metadata();
    const mime = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    if (
      !(metadata.format && metadata.format in mime) ||
      mime[metadata.format as keyof typeof mime] !== file.type ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error('Not a supported static image');
    // Decode, resize and re-encode: strip EXIF/location metadata, reject malformed images and normalize the stored format.
    return await image
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new AppError(
      400,
      'Image content is invalid, too large in dimensions, or does not match its MIME type.',
    );
  }
}
