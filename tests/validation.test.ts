import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { parse, propertySchema, validId } from '../src/server/validation';
import {
  validatePhoto,
  MAX_PHOTO_BYTES,
  LocalPhotoStorage,
} from '../src/server/storage';
import { input } from './fixtures';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
describe('property validation', () => {
  it('accepts legitimate structured property data', () => {
    expect(parse(propertySchema, input).bedrooms).toBe(3);
  });
  it.each(['price', 'bedrooms', 'bathrooms', 'squareFeet', 'lotSize'])(
    'rejects negative %s',
    (field) => {
      expect(() => parse(propertySchema, { ...input, [field]: -1 })).toThrow();
    },
  );
  it.each(['address', 'city', 'state', 'zipCode'])(
    'rejects blank %s',
    (field) => {
      expect(() =>
        parse(propertySchema, { ...input, [field]: '   ' }),
      ).toThrow();
    },
  );
  it('rejects missing required fields', () => {
    expect(() => parse(propertySchema, {})).toThrow();
  });
  it('rejects non-finite prices', () => {
    expect(() =>
      parse(propertySchema, { ...input, price: Infinity }),
    ).toThrow();
  });
  it('rejects fractional bedroom counts', () => {
    expect(() => parse(propertySchema, { ...input, bedrooms: 2.5 })).toThrow();
  });
  it('rejects invalid property types', () => {
    expect(() =>
      parse(propertySchema, { ...input, propertyType: 'Castle' }),
    ).toThrow();
  });
  it('strips a forged owner from input', () => {
    expect(
      parse(propertySchema, { ...input, userId: 'forged' }),
    ).not.toHaveProperty('userId');
  });
  it.each(['../../etc/passwd', 'not-an-id', "'; DROP TABLE users; --", ''])(
    'handles malformed id: %s',
    (id) => {
      expect(() => validId(id)).toThrow();
    },
  );
});
describe('private photo handling', () => {
  it('rejects unsupported MIME types', async () => {
    await expect(
      validatePhoto(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('JPEG');
  });
  it('rejects oversized photos before processing', async () => {
    await expect(
      validatePhoto(
        new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], 'a.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).rejects.toThrow('8 MB');
  });
  it('rejects empty files', async () => {
    await expect(
      validatePhoto(new File([], 'a.jpg', { type: 'image/jpeg' })),
    ).rejects.toThrow('nonempty');
  });
  it('rejects spoofed MIME types', async () => {
    await expect(
      validatePhoto(
        new File(['not an image'], 'a.jpg', { type: 'image/jpeg' }),
      ),
    ).rejects.toThrow('invalid');
  });
  it('rejects a valid image mislabeled with another allowed MIME', async () => {
    const bytes = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    await expect(
      validatePhoto(
        new File([new Uint8Array(bytes)], 'a.jpg', { type: 'image/jpeg' }),
      ),
    ).rejects.toThrow('MIME');
  });
  it('normalizes a real image to JPEG and strips metadata', async () => {
    const bytes = await sharp({
      create: { width: 3, height: 2, channels: 3, background: '#fff' },
    })
      .withMetadata()
      .png()
      .toBuffer();
    const result = await validatePhoto(
      new File([new Uint8Array(bytes)], 'a.png', { type: 'image/png' }),
    );
    const meta = await sharp(result).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.exif).toBeUndefined();
  });
  it('stores, reads and removes private images through the abstraction', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'listly-storage-'));
    try {
      const storage = new LocalPhotoStorage(dir);
      const key = await storage.put(Buffer.from('test'));
      expect((await storage.read(key)).toString()).toBe('test');
      await storage.remove(key);
      await expect(storage.read(key)).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('prevents storage path traversal', async () => {
    const storage = new LocalPhotoStorage('/tmp/listly-test');
    await expect(storage.read('../../etc/passwd')).rejects.toThrow(
      'Invalid storage key',
    );
  });
});
